use crate::errors::ScratcherError;
use anchor_lang::prelude::*;

pub const HOUSE_SEED: &[u8] = b"house";
pub const ASSET_SEED: &[u8] = b"asset";
pub const CARD_SEED: &[u8] = b"card";

/// Prize-table weights are parts-per-million; they must sum to this.
pub const TOTAL_PPM: u32 = 10_000_000;
/// multiplier_bps basis: 10_000 = 1x ("money back"). 1_000x = 10_000_000.
pub const MULTIPLIER_BASE_BPS: u32 = 10_000;
pub const MAX_TIERS: usize = 8;
/// USD prices are stored with 8 decimals (Pyth convention).
pub const PRICE_DECIMALS: u32 = 8;
/// Card prices / prizes are USDC-denominated with 6 decimals.
pub const USDC_DECIMALS: u32 = 6;
pub const VRF_RETRY_SECS: i64 = 90;

/// Mock dealer quote, in USDC base units, rounded down. Both the app and the
/// on-chain sell instruction use this integer formula.
pub fn quote_sale_usdc(amount: u64, mint_decimals: u8, price_usd_e8: u64) -> Result<u64> {
    require!(amount > 0, ScratcherError::InvalidSellAmount);
    require!(price_usd_e8 > 0, ScratcherError::InvalidPrice);
    let exponent = mint_decimals as u32 + PRICE_DECIMALS - USDC_DECIMALS;
    let scale = 10u128
        .checked_pow(exponent)
        .ok_or(ScratcherError::MathOverflow)?;
    let out = (amount as u128)
        .checked_mul(price_usd_e8 as u128)
        .ok_or(ScratcherError::MathOverflow)?
        .checked_div(scale)
        .ok_or(ScratcherError::MathOverflow)?;
    u64::try_from(out).map_err(|_| error!(ScratcherError::MathOverflow))
}

#[derive(Clone, Copy, AnchorSerialize, AnchorDeserialize, PartialEq, Eq)]
pub struct Tier {
    /// Prize multiplier in bps of `MULTIPLIER_BASE_BPS`. 0 = blank card.
    pub multiplier_bps: u32,
    /// Weight in ppm; all tiers in a table sum to TOTAL_PPM.
    pub weight_ppm: u32,
}

#[derive(Clone, Copy, AnchorSerialize, AnchorDeserialize, PartialEq, Eq)]
pub enum AssetKind {
    Stock,
    Coin,
    Collectible,
}

#[derive(Clone, Copy, AnchorSerialize, AnchorDeserialize, PartialEq, Eq, Debug)]
pub enum CardState {
    /// Bought on base layer, not yet scratched.
    Sealed,
    /// VRF request fired on the ER, waiting for the oracle callback.
    RandomnessRequested,
    /// Callback landed; multiplier + prize are final. Ready to settle & claim.
    Revealed,
    /// Prize paid out. Terminal.
    Claimed,
}

/// Global game configuration + treasury pointer. One per deployment.
#[account]
pub struct House {
    pub authority: Pubkey,
    /// Keeper wallet allowed to push price updates.
    pub keeper: Pubkey,
    pub usdc_mint: Pubkey,
    /// ATA of this PDA for `usdc_mint`; card payments land here.
    pub usdc_treasury: Pubkey,
    /// Card price in USDC e6 (1 USDC = 1_000_000).
    pub card_price_usdc: u64,
    pub tiers: [Tier; MAX_TIERS],
    pub tier_count: u8,
    /// Monotonic card id counter.
    pub card_nonce: u64,
    /// Reject claims whose price is older than this (seconds).
    pub max_price_age_secs: i64,
    pub active: bool,
    pub bump: u8,
}

impl House {
    pub const LEN: usize = 8  // discriminator
        + 32                  // authority
        + 32                  // keeper
        + 32                  // usdc_mint
        + 32                  // usdc_treasury
        + 8                   // card_price_usdc
        + (4 + 4) * MAX_TIERS // tiers
        + 1                   // tier_count
        + 8                   // card_nonce
        + 8                   // max_price_age_secs
        + 1                   // active
        + 1; // bump

    pub fn total_weight(&self) -> u32 {
        self.tiers[..self.tier_count as usize]
            .iter()
            .map(|t| t.weight_ppm)
            .sum()
    }
}

/// A prize asset the house pays out (xStock mock, memecoin mock, …).
/// The keeper writes `price_usd_e8` on the BASE layer; claims read it there.
#[account]
pub struct Asset {
    pub mint: Pubkey,
    /// ATA of the house PDA holding the prize inventory.
    pub vault: Pubkey,
    pub symbol: [u8; 8],
    pub kind: AssetKind,
    /// Latest keeper-written USD price, 8 decimals.
    pub price_usd_e8: u64,
    pub price_updated_at: i64,
    pub active: bool,
    pub bump: u8,
}

impl Asset {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 1 + 1 + 8 + 8 + 1 + 1;

    pub fn price_fresh(&self, now: i64, max_age: i64) -> bool {
        self.active
            && self.price_usd_e8 > 0
            && max_age > 0
            && now
                .checked_sub(self.price_updated_at)
                .is_some_and(|age| age >= 0 && age <= max_age)
    }
}

/// One scratch card. Delegated to the ER for the scratch, committed back,
/// settled on base. Small on purpose (well under the 10,240-byte commit cap).
///
/// `card_price_usdc` + `tiers` are snapshotted from House at buy time because
/// the VRF callback runs on the ER, where the base-layer House is unreadable.
#[account]
pub struct Card {
    pub owner: Pubkey,
    pub id: u64,
    /// Prize asset chosen at buy time. (Mystery pool = V2.)
    pub asset: Pubkey,
    pub state: CardState,
    /// Set when the VRF callback lands.
    pub multiplier_bps: u32,
    /// Final USD value of the prize, e6. 0 = blank.
    pub prize_usd_e6: u64,
    /// Pending: request timestamp in bytes 0..8 and seed in byte 8.
    /// Revealed: the VRF result (audit trail).
    pub randomness: [u8; 32],
    pub created_at: i64,
    pub bump: u8,
    // --- buy-time snapshot of House config ---
    pub card_price_usdc: u64,
    pub tiers: [Tier; MAX_TIERS],
    pub tier_count: u8,
}

impl Card {
    pub const LEN: usize = 8 + 32 + 8 + 32 + 1 + 4 + 8 + 32 + 8 + 1 + 8 + (4 + 4) * MAX_TIERS + 1;

    pub fn total_weight(&self) -> u32 {
        self.tiers[..self.tier_count as usize]
            .iter()
            .map(|t| t.weight_ppm)
            .sum()
    }

    pub fn prepare_request(&mut self, now: i64, seed: u8) -> Result<()> {
        if self.state == CardState::RandomnessRequested {
            let requested_at = i64::from_le_bytes(self.randomness[..8].try_into().unwrap());
            require!(
                now.saturating_sub(requested_at) >= VRF_RETRY_SECS,
                ScratcherError::RetryTooSoon
            );
            require!(
                seed != self.randomness[8],
                ScratcherError::RetrySeedUnchanged
            );
        }
        self.randomness[..8].copy_from_slice(&now.to_le_bytes());
        self.randomness[8] = seed;
        self.state = CardState::RandomnessRequested;
        Ok(())
    }

    pub fn accepts_callback(&self, seed: u8) -> bool {
        self.state == CardState::RandomnessRequested
            && (self.randomness[..9] == [0; 9] || self.randomness[8] == seed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn price_fresh_rejects_future_expired_and_zero_prices() {
        let mut asset = Asset {
            mint: Pubkey::default(),
            vault: Pubkey::default(),
            symbol: [0; 8],
            kind: AssetKind::Stock,
            price_usd_e8: 100_000_000,
            price_updated_at: 1_000,
            active: true,
            bump: 0,
        };
        assert!(asset.price_fresh(1_060, 60));
        assert!(!asset.price_fresh(1_061, 60));
        assert!(!asset.price_fresh(999, 60));
        assert!(!asset.price_fresh(1_000, 0));
        asset.price_usd_e8 = 0;
        assert!(!asset.price_fresh(1_000, 60));
    }

    #[test]
    fn retry_rejects_early_and_superseded_callbacks() {
        let mut card = Card {
            owner: Pubkey::default(),
            id: 0,
            asset: Pubkey::default(),
            state: CardState::Sealed,
            multiplier_bps: 0,
            prize_usd_e6: 0,
            randomness: [0; 32],
            created_at: 0,
            bump: 0,
            card_price_usdc: 1_000_000,
            tiers: [Tier {
                multiplier_bps: 0,
                weight_ppm: 0,
            }; MAX_TIERS],
            tier_count: 0,
        };
        card.prepare_request(1_000, 7).unwrap();
        assert!(card.accepts_callback(7));
        assert!(card.prepare_request(1_089, 8).is_err());
        assert!(card.prepare_request(1_090, 7).is_err());
        card.prepare_request(1_090, 8).unwrap();
        assert!(!card.accepts_callback(7));
        assert!(card.accepts_callback(8));
        card.state = CardState::Revealed;
        assert!(!card.accepts_callback(8));

        // Cards pending from the prior devnet program stored no request metadata.
        card.state = CardState::RandomnessRequested;
        card.randomness = [0; 32];
        assert!(card.accepts_callback(7));
    }

    #[test]
    fn sale_quote_tracks_price_and_rejects_overflow() {
        let one_stock = 100_000_000u64;
        assert_eq!(
            quote_sale_usdc(one_stock, 8, 30_000_000_000).unwrap(),
            300_000_000
        );
        assert_eq!(
            quote_sale_usdc(one_stock, 8, 60_000_000_000).unwrap(),
            600_000_000
        );
        assert!(quote_sale_usdc(0, 8, 30_000_000_000).is_err());
        assert!(quote_sale_usdc(u64::MAX, 0, u64::MAX).is_err());
    }
}
