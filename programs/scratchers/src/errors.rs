use anchor_lang::prelude::*;

#[error_code]
pub enum ScratcherError {
    #[msg("Prize table weights must sum to 10_000_000 ppm")]
    WeightsMustSumToTotal,
    #[msg("Too many prize tiers (max 8)")]
    TooManyTiers,
    #[msg("Prize table must have at least one tier")]
    EmptyPrizeTable,
    #[msg("House is paused")]
    HouseInactive,
    #[msg("Asset is not active")]
    AssetInactive,
    #[msg("Card is not sealed")]
    CardNotSealed,
    #[msg("Card is not waiting on randomness")]
    CardNotRequested,
    #[msg("Card is not revealed yet")]
    CardNotRevealed,
    #[msg("Asset price is stale — keeper update required")]
    StalePrice,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Only the house keeper can push prices")]
    NotKeeper,
    #[msg("Invalid oracle queue for this runtime")]
    InvalidOracleQueue,
    #[msg("Card price must be greater than zero")]
    InvalidCardPrice,
    #[msg("Price must be greater than zero")]
    InvalidPrice,
    #[msg("Maximum price age must be greater than zero")]
    InvalidPriceAge,
    #[msg("Wait before retrying the VRF request")]
    RetryTooSoon,
    #[msg("Use a new seed for the retried VRF request")]
    RetrySeedUnchanged,
    #[msg("Sell amount must be greater than zero")]
    InvalidSellAmount,
    #[msg("Sale quote is below the requested minimum")]
    SellSlippageExceeded,
    #[msg("House payment mint must have six decimals")]
    InvalidUsdcDecimals,
}
