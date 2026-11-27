//! Stock Scratchers — VRF scratch cards that pay prizes in tokenized stocks
//! and other Solana assets.
//!
//! Flow:
//!   1. `buy_card`       (base)  — pay USDC, card is created sealed
//!   2. `delegate_card`  (base)  — card PDA is delegated to the Ephemeral Rollup
//!   3. `scratch`        (ER)    — fires a VRF request (ephemeral queue = no fee)
//!   4. `vrf_callback`   (ER)    — oracle fulfills; multiplier + prize recorded
//!   5. `settle_card`    (ER)    — commit + undelegate back to base layer
//!   6. `claim_payout`   (base)  — prize valued at keeper price, paid in the
//!                                 asset's SPL tokens from the house vault
//!
//! Design notes:
//! - The prize table and paid price are snapshotted into the card at buy time:
//!   the VRF callback runs on the ER and cannot read the base-layer House.
//! - The callback only records the outcome (no token CPIs) so it stays small
//!   and reliable; all settlement happens in `claim_payout` on base layer.

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{transfer, Mint, Token, TokenAccount, Transfer},
};
use ephemeral_rollups_sdk::anchor::{commit, delegate, ephemeral, vrf, vrf_callback};
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::MagicIntentBundleBuilder;
use ephemeral_rollups_sdk::vrf::{
    self,
    consts::{program_identity_pubkey, scoped_vrf_identity_const},
    instructions::{create_request_randomness_ix_const, RequestRandomnessParams},
    types::SerializableAccountMeta,
};

pub mod errors;
pub mod state;

use errors::ScratcherError;
use state::*;

declare_id!("CwvfeJmKV5cEJwrUU3M12C3d97vf7MyUoT6BnSCJNqCP");

/// Scoped VRF requester identity for this program (SDK 0.18 const pattern).
const PROGRAM_IDENTITY: Pubkey = program_identity_pubkey(&crate::ID);

/// Scoped VRF identity that signs our callbacks. MUST be derived at compile
/// time: the #[vrf_callback] macro's own injected field derives it at runtime
/// via const_crypto (pure-Rust SHA-512/ed25519), which exceeds the oracle's
/// ~270k CU callback budget on live validators (observed on devnet 2026-11-27:
/// "consumed 269420 of 269420 compute units"). Declaring the field ourselves
/// with this const address both skips macro injection and costs ~0 CU.
const SCOPED_VRF_IDENTITY: Pubkey = Pubkey::new_from_array(scoped_vrf_identity_const(&crate::ID).0);

#[ephemeral]
#[program]
pub mod scratchers {
    use super::*;

    // ------------------------------------------------------------------
    // Admin
    // ------------------------------------------------------------------

    /// One-time house setup: authority, keeper, card price, prize table.
    pub fn initialize_house(
        ctx: Context<InitializeHouse>,
        keeper: Pubkey,
        card_price_usdc: u64,
        tiers: Vec<Tier>,
        max_price_age_secs: i64,
    ) -> Result<()> {
        require!(card_price_usdc > 0, ScratcherError::InvalidCardPrice);
        require!(max_price_age_secs > 0, ScratcherError::InvalidPriceAge);
        require!(
            ctx.accounts.usdc_mint.decimals as u32 == USDC_DECIMALS,
            ScratcherError::InvalidUsdcDecimals
        );
        require!(!tiers.is_empty(), ScratcherError::EmptyPrizeTable);
        require!(tiers.len() <= MAX_TIERS, ScratcherError::TooManyTiers);
        let total: u64 = tiers.iter().map(|t| t.weight_ppm as u64).sum();
        require!(
            total == TOTAL_PPM as u64,
            ScratcherError::WeightsMustSumToTotal
        );

        let house = &mut ctx.accounts.house;
        house.authority = ctx.accounts.authority.key();
        house.keeper = keeper;
        house.usdc_mint = ctx.accounts.usdc_mint.key();
        house.usdc_treasury = ctx.accounts.usdc_treasury.key();
        house.card_price_usdc = card_price_usdc;
        house.tiers = [Tier {
            multiplier_bps: 0,
            weight_ppm: 0,
        }; MAX_TIERS];
        house.tiers[..tiers.len()].copy_from_slice(&tiers);
        house.tier_count = tiers.len() as u8;
        house.card_nonce = 0;
        house.max_price_age_secs = max_price_age_secs;
        house.active = true;
        house.bump = ctx.bumps.house;
        Ok(())
    }

    /// Register a prize asset + its house inventory vault.
    pub fn add_asset(ctx: Context<AddAsset>, symbol: [u8; 8], kind: AssetKind) -> Result<()> {
        let asset = &mut ctx.accounts.asset;
        asset.mint = ctx.accounts.mint.key();
        asset.vault = ctx.accounts.vault.key();
        asset.symbol = symbol;
        asset.kind = kind;
        asset.price_usd_e8 = 0;
        asset.price_updated_at = 0;
        asset.active = true;
        asset.bump = ctx.bumps.asset;
        Ok(())
    }

    /// Keeper price push (base layer). Claims read this.
    pub fn set_price(ctx: Context<SetPrice>, price_usd_e8: u64) -> Result<()> {
        require!(price_usd_e8 > 0, ScratcherError::InvalidPrice);
        let asset = &mut ctx.accounts.asset;
        asset.price_usd_e8 = price_usd_e8;
        asset.price_updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    // ------------------------------------------------------------------
    // Player flow
    // ------------------------------------------------------------------

    /// Buy a sealed card with USDC. Snapshots the prize table + price paid.
    pub fn buy_card(ctx: Context<BuyCard>) -> Result<()> {
        let house = &ctx.accounts.house;
        require!(house.active, ScratcherError::HouseInactive);

        // Pay the house.
        transfer(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.owner_ata.to_account_info(),
                    to: ctx.accounts.usdc_treasury.to_account_info(),
                    authority: ctx.accounts.owner.to_account_info(),
                },
            ),
            house.card_price_usdc,
        )?;

        let card = &mut ctx.accounts.card;
        card.owner = ctx.accounts.owner.key();
        card.id = house.card_nonce;
        card.asset = ctx.accounts.asset.mint;
        card.state = CardState::Sealed;
        card.multiplier_bps = 0;
        card.prize_usd_e6 = 0;
        card.randomness = [0u8; 32];
        card.created_at = Clock::get()?.unix_timestamp;
        card.bump = ctx.bumps.card;
        // Snapshot: the ER callback cannot read House on the base layer.
        card.card_price_usdc = house.card_price_usdc;
        card.tiers = house.tiers;
        card.tier_count = house.tier_count;

        ctx.accounts.house.card_nonce = house
            .card_nonce
            .checked_add(1)
            .ok_or(ScratcherError::MathOverflow)?;
        Ok(())
    }

    /// Delegate the card PDA to the Ephemeral Rollup (base layer).
    pub fn delegate_card(ctx: Context<DelegateCard>, card_id: u64) -> Result<()> {
        let owner_key = ctx.accounts.owner.key();
        let id_bytes = card_id.to_le_bytes();
        ctx.accounts.delegate_card(
            &ctx.accounts.owner,
            &[CARD_SEED, owner_key.as_ref(), &id_bytes],
            DelegateConfig::default(),
        )?;
        Ok(())
    }

    /// Scratch the card on the ER: fire a VRF request against the
    /// (fee-exempt) delegated oracle queue.
    ///
    /// A pending request may be retried after a timeout. The pending seed and
    /// timestamp use the randomness field until the callback replaces it with
    /// the actual VRF result. A superseded callback cannot resolve the card.
    pub fn scratch(ctx: Context<Scratch>, _card_id: u64, client_seed: u8) -> Result<()> {
        let card = &mut ctx.accounts.card;
        require!(
            card.state == CardState::Sealed || card.state == CardState::RandomnessRequested,
            ScratcherError::CardNotSealed
        );
        card.prepare_request(Clock::get()?.unix_timestamp, client_seed)?;

        let params = RequestRandomnessParams {
            payer: ctx.accounts.owner.key(),
            oracle_queue: ctx.accounts.oracle_queue.key(),
            callback_program_id: crate::ID,
            callback_discriminator: instruction::VrfCallback::DISCRIMINATOR.to_vec(),
            caller_seed: [client_seed; 32],
            accounts_metas: Some(vec![SerializableAccountMeta {
                pubkey: card.key(),
                is_signer: false,
                is_writable: true,
            }]),
            callback_args: Some(vec![client_seed]),
            ..Default::default()
        };
        let ix = create_request_randomness_ix_const(params, PROGRAM_IDENTITY);
        ctx.accounts
            .invoke_signed_vrf(&ctx.accounts.owner.to_account_info(), &ix)?;
        Ok(())
    }

    /// VRF oracle fulfillment (ER). First fulfillment wins; duplicate or late
    /// callbacks are no-ops so a card can never resolve twice.
    pub fn vrf_callback(
        ctx: Context<VrfCallbackCtx>,
        randomness: [u8; 32],
        client_seed: u8,
    ) -> Result<()> {
        let card = &mut ctx.accounts.card;
        if !card.accepts_callback(client_seed) {
            return Ok(());
        }

        // Walk the snapshotted prize table with a uniform ppm roll.
        let total = card.total_weight();
        let roll = u32::from_le_bytes(randomness[0..4].try_into().unwrap()) % total;
        let mut acc: u32 = 0;
        let mut picked = card.tiers[0];
        for tier in card.tiers[..card.tier_count as usize].iter() {
            acc = acc.saturating_add(tier.weight_ppm);
            if roll < acc {
                picked = *tier;
                break;
            }
        }

        card.multiplier_bps = picked.multiplier_bps;
        let prize = (card.card_price_usdc as u128)
            .checked_mul(picked.multiplier_bps as u128)
            .ok_or(ScratcherError::MathOverflow)?
            .checked_div(MULTIPLIER_BASE_BPS as u128)
            .ok_or(ScratcherError::MathOverflow)?;
        card.prize_usd_e6 = u64::try_from(prize).map_err(|_| ScratcherError::MathOverflow)?;
        card.randomness = randomness;
        card.state = CardState::Revealed;
        Ok(())
    }

    /// Commit the revealed card and undelegate it back to base (ER).
    pub fn settle_card(ctx: Context<SettleCard>, _card_id: u64) -> Result<()> {
        require!(
            ctx.accounts.card.state == CardState::Revealed,
            ScratcherError::CardNotRevealed
        );
        MagicIntentBundleBuilder::new(
            ctx.accounts.owner.to_account_info(),
            ctx.accounts.magic_context.to_account_info(),
            ctx.accounts.magic_program.to_account_info(),
        )
        .commit_and_undelegate(&[ctx.accounts.card.to_account_info()])
        .build_and_invoke()?;
        Ok(())
    }

    /// Claim the prize on base layer, valued at the keeper's latest price.
    /// Blank cards (prize 0) just close out — no transfer.
    pub fn claim_payout(ctx: Context<ClaimPayout>, _card_id: u64) -> Result<()> {
        let house = &ctx.accounts.house;
        let card = &mut ctx.accounts.card;
        require!(
            card.state == CardState::Revealed,
            ScratcherError::CardNotRevealed
        );

        if card.prize_usd_e6 > 0 {
            let now = Clock::get()?.unix_timestamp;
            require!(
                ctx.accounts
                    .asset
                    .price_fresh(now, house.max_price_age_secs),
                ScratcherError::StalePrice
            );

            // token_amount = prize_usd_e6 * 10^(mint_decimals + 2) / price_usd_e8
            // (both USD quantities share their exponent offset via +2 = 8 - 6)
            let decimals = ctx.accounts.asset_mint.decimals as u32;
            let scale = 10u128
                .checked_pow(decimals + PRICE_DECIMALS - USDC_DECIMALS)
                .ok_or(ScratcherError::MathOverflow)?;
            let amount = (card.prize_usd_e6 as u128)
                .checked_mul(scale)
                .ok_or(ScratcherError::MathOverflow)?
                .checked_div(ctx.accounts.asset.price_usd_e8 as u128)
                .ok_or(ScratcherError::MathOverflow)?;
            let amount = u64::try_from(amount).map_err(|_| ScratcherError::MathOverflow)?;
            require!(amount > 0, ScratcherError::MathOverflow);

            let bump = house.bump;
            let signer_seeds: &[&[&[u8]]] = &[&[HOUSE_SEED, &[bump]]];
            transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.key(),
                    Transfer {
                        from: ctx.accounts.vault.to_account_info(),
                        to: ctx.accounts.owner_ata.to_account_info(),
                        authority: ctx.accounts.house.to_account_info(),
                    },
                    signer_seeds,
                ),
                amount,
            )?;
        }

        card.state = CardState::Claimed;
        Ok(())
    }

    /// Devnet dealer redemption: return mock asset tokens to the house and
    /// receive mock USDC from its funded treasury at the current keeper price.
    /// This is a treasury quote, not a DEX trade or a redeemable stock sale.
    pub fn sell_asset(ctx: Context<SellAsset>, amount: u64, min_usdc_out: u64) -> Result<()> {
        let house = &ctx.accounts.house;
        let asset = &ctx.accounts.asset;
        require!(
            asset.price_fresh(Clock::get()?.unix_timestamp, house.max_price_age_secs),
            ScratcherError::StalePrice
        );
        let out = quote_sale_usdc(amount, ctx.accounts.asset_mint.decimals, asset.price_usd_e8)?;
        require!(
            out > 0 && out >= min_usdc_out,
            ScratcherError::SellSlippageExceeded
        );

        transfer(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.owner_asset_ata.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.owner.to_account_info(),
                },
            ),
            amount,
        )?;

        let signer_seeds: &[&[&[u8]]] = &[&[HOUSE_SEED, &[house.bump]]];
        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.usdc_treasury.to_account_info(),
                    to: ctx.accounts.owner_usdc_ata.to_account_info(),
                    authority: ctx.accounts.house.to_account_info(),
                },
                signer_seeds,
            ),
            out,
        )?;
        Ok(())
    }
}

// ----------------------------------------------------------------------
// Account contexts
// ----------------------------------------------------------------------

#[derive(Accounts)]
pub struct InitializeHouse<'info> {
    #[account(init, payer = authority, space = House::LEN, seeds = [HOUSE_SEED], bump)]
    pub house: Account<'info, House>,
    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = usdc_mint,
        associated_token::authority = house,
    )]
    pub usdc_treasury: Account<'info, TokenAccount>,
    pub usdc_mint: Account<'info, Mint>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct AddAsset<'info> {
    #[account(seeds = [HOUSE_SEED], bump = house.bump, has_one = authority)]
    pub house: Account<'info, House>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(init, payer = authority, space = Asset::LEN, seeds = [ASSET_SEED, mint.key().as_ref()], bump)]
    pub asset: Account<'info, Asset>,
    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = mint,
        associated_token::authority = house,
    )]
    pub vault: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct SetPrice<'info> {
    #[account(
        seeds = [HOUSE_SEED],
        bump = house.bump,
        constraint = house.keeper == keeper.key() @ ScratcherError::NotKeeper
    )]
    pub house: Account<'info, House>,
    pub keeper: Signer<'info>,
    #[account(mut, seeds = [ASSET_SEED, asset.mint.as_ref()], bump = asset.bump)]
    pub asset: Account<'info, Asset>,
}

#[derive(Accounts)]
pub struct BuyCard<'info> {
    #[account(mut, seeds = [HOUSE_SEED], bump = house.bump)]
    pub house: Account<'info, House>,
    #[account(
        seeds = [ASSET_SEED, asset.mint.as_ref()],
        bump = asset.bump,
        constraint = asset.active @ ScratcherError::AssetInactive
    )]
    pub asset: Account<'info, Asset>,
    #[account(
        init,
        payer = owner,
        space = Card::LEN,
        seeds = [CARD_SEED, owner.key().as_ref(), &house.card_nonce.to_le_bytes()],
        bump,
    )]
    pub card: Account<'info, Card>,
    #[account(
        mut,
        constraint = owner_ata.mint == house.usdc_mint,
        constraint = owner_ata.owner == owner.key(),
    )]
    pub owner_ata: Account<'info, TokenAccount>,
    #[account(mut, constraint = usdc_treasury.key() == house.usdc_treasury)]
    pub usdc_treasury: Account<'info, TokenAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[delegate]
#[derive(Accounts)]
#[instruction(card_id: u64)]
pub struct DelegateCard<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    /// CHECK: card PDA to delegate (must stay unchecked — see SDK #288)
    #[account(mut, del, seeds = [CARD_SEED, owner.key().as_ref(), &card_id.to_le_bytes()], bump)]
    pub card: UncheckedAccount<'info>,
}

#[vrf]
#[derive(Accounts)]
#[instruction(card_id: u64)]
pub struct Scratch<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [CARD_SEED, owner.key().as_ref(), &card_id.to_le_bytes()],
        bump = card.bump,
        constraint = card.owner == owner.key(),
    )]
    pub card: Account<'info, Card>,
    /// CHECK: VRF oracle queue — the delegated queue when running on the ER,
    /// the base queue on Solana, and the localnet test queues.
    #[account(
        mut,
        constraint =
            oracle_queue.key() == vrf::consts::DEFAULT_EPHEMERAL_QUEUE
            || oracle_queue.key() == vrf::consts::DEFAULT_EPHEMERAL_TEST_QUEUE
            || oracle_queue.key() == vrf::consts::DEFAULT_QUEUE
            || oracle_queue.key() == vrf::consts::DEFAULT_TEST_QUEUE
            @ ScratcherError::InvalidOracleQueue
    )]
    pub oracle_queue: UncheckedAccount<'info>,
}

#[vrf_callback]
#[derive(Accounts)]
pub struct VrfCallbackCtx<'info> {
    /// Scoped VRF identity signer — see SCOPED_VRF_IDENTITY note above.
    /// (Declared manually so the macro does not inject the runtime-derivation variant.)
    #[account(address = SCOPED_VRF_IDENTITY)]
    pub vrf_program_identity: Signer<'info>,
    #[account(mut)]
    pub card: Account<'info, Card>,
}

#[commit]
#[derive(Accounts)]
#[instruction(card_id: u64)]
pub struct SettleCard<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [CARD_SEED, owner.key().as_ref(), &card_id.to_le_bytes()],
        bump = card.bump,
        constraint = card.owner == owner.key(),
    )]
    pub card: Account<'info, Card>,
}

#[derive(Accounts)]
#[instruction(card_id: u64)]
pub struct ClaimPayout<'info> {
    #[account(seeds = [HOUSE_SEED], bump = house.bump)]
    pub house: Account<'info, House>,
    #[account(
        mut,
        seeds = [CARD_SEED, owner.key().as_ref(), &card_id.to_le_bytes()],
        bump = card.bump,
        constraint = card.owner == owner.key(),
    )]
    pub card: Account<'info, Card>,
    #[account(
        seeds = [ASSET_SEED, asset.mint.as_ref()],
        bump = asset.bump,
        constraint = asset.mint == card.asset,
    )]
    pub asset: Account<'info, Asset>,
    #[account(mut, constraint = vault.key() == asset.vault)]
    pub vault: Account<'info, TokenAccount>,
    #[account(constraint = asset_mint.key() == asset.mint)]
    pub asset_mint: Account<'info, Mint>,
    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = asset_mint,
        associated_token::authority = owner,
    )]
    pub owner_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct SellAsset<'info> {
    #[account(seeds = [HOUSE_SEED], bump = house.bump)]
    pub house: Box<Account<'info, House>>,
    #[account(
        seeds = [ASSET_SEED, asset.mint.as_ref()],
        bump = asset.bump,
        constraint = asset.mint == asset_mint.key(),
    )]
    pub asset: Box<Account<'info, Asset>>,
    pub asset_mint: Box<Account<'info, Mint>>,
    #[account(mut, constraint = vault.key() == asset.vault,
        constraint = vault.mint == asset.mint,
        constraint = vault.owner == house.key())]
    pub vault: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = owner_asset_ata.mint == asset.mint,
        constraint = owner_asset_ata.owner == owner.key())]
    pub owner_asset_ata: Box<Account<'info, TokenAccount>>,
    #[account(constraint = usdc_mint.key() == house.usdc_mint)]
    pub usdc_mint: Box<Account<'info, Mint>>,
    #[account(mut, constraint = usdc_treasury.key() == house.usdc_treasury,
        constraint = usdc_treasury.mint == house.usdc_mint,
        constraint = usdc_treasury.owner == house.key())]
    pub usdc_treasury: Box<Account<'info, TokenAccount>>,
    #[account(init_if_needed, payer = owner,
        associated_token::mint = usdc_mint,
        associated_token::authority = owner)]
    pub owner_usdc_ata: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}
