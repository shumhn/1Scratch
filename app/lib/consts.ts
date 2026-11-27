import { PublicKey } from "@solana/web3.js";

/** Program + cluster wiring (devnet). */
export const PROGRAM_ID = new PublicKey(
  "CwvfeJmKV5cEJwrUU3M12C3d97vf7MyUoT6BnSCJNqCP"
);
export const BASE_RPC =
  process.env.NEXT_PUBLIC_BASE_RPC ?? "https://rpc.magicblock.app/devnet";
export const ROUTER = "https://devnet-router.magicblock.app/";

/** MagicBlock VRF queue that lives inside the ER (fee-exempt). */
export const EPHEMERAL_QUEUE = new PublicKey(
  "5hBR571xnXppuCPveTrctfTU7tJLSN94nq7kv7FRK5Tc"
);

/** Deployed game state (from config/devnet.json). */
export const HOUSE = new PublicKey("6ueXccthuD73jY93851FVTztKBPAyv8UxwTzit9UKNc9");
export const USDC_MINT = new PublicKey("QuF6eYfFbrxNk2CSWwKRAePR76eBXtUrNoPT6u4Y815");
export const USDC_TREASURY = new PublicKey(
  "Erf25DD2sxut2UXZ4WVVL2Yagj27Rt9YdPpDFuTN1qu"
);

export interface PrizeAsset {
  symbol: string;
  kind: "stock" | "coin";
  decimals: number;
  mint: PublicKey;
  assetPda: PublicKey;
  vault: PublicKey;
}

export const ASSETS: PrizeAsset[] = [
  {
    symbol: "AAPLx",
    kind: "stock",
    decimals: 8,
    mint: new PublicKey("7SQ7AoEA8tYfPJE1CPQkUQ2DeQFan5eth92vjnKswdBd"),
    assetPda: new PublicKey("9C9fUjJfxFgT3Ntgne5TDFzhHUdztnVzNew8DJgKwzMM"),
    vault: new PublicKey("CCDtguHYRnibPKQQ33aoH1nkDUA1tmR7fNyNdtKZtHwa"),
  },
  {
    symbol: "TSLAx",
    kind: "stock",
    decimals: 8,
    mint: new PublicKey("ByDtiKrxCV71LpK695aSG5Fyq3gkXmj3e2am3jnfXUvi"),
    assetPda: new PublicKey("CGvH38ooDdH1AT39hQN5udfarVSA5tExmTKcHgsMzB1M"),
    vault: new PublicKey("68W5VxLxkgQuvCq1GfzHEWvrkVwjMaf36m63girqqiDU"),
  },
  {
    symbol: "CRCLx",
    kind: "stock",
    decimals: 8,
    mint: new PublicKey("HNJyDuqo1PQet7NEoFHdDrjscfrtJ6EVeNsCKGcxR3At"),
    assetPda: new PublicKey("8SFepr5nrmnMtMPQaLdWwKD7GHrzCMqrQSMG9ueeLN53"),
    vault: new PublicKey("BYWKzFTVt5C1dbZggbFm6DamgN5Q2rdSgvsYwYrZnGFC"),
  },
  {
    symbol: "SOL",
    kind: "coin",
    decimals: 9,
    mint: new PublicKey("5S3G2KP9DvHKNKqfMGxLUmesw7CPKsqpHK8VyhEjTWbT"),
    assetPda: new PublicKey("6iANUdNfD1k2G2siACLAu4N23wowFi4Vvnnrx3o7hMaP"),
    vault: new PublicKey("BZgsGGQTQwPavrKNaiEdhNGcjLv6ZS3GCAT8cee6otS6"),
  },
  {
    symbol: "BONK",
    kind: "coin",
    decimals: 5,
    mint: new PublicKey("BakvKJYezSWXn9kw5eZvoeZmEzGqtVsEfMwbgCiMDLZC"),
    assetPda: new PublicKey("48WCvgmovTxVq8Nj1CXjNtMvxJvSV9XfqjVTd1tCr9fM"),
    vault: new PublicKey("3y3XSwiFHhfmHYzDoGDFPrkoJsHjAZWBm4HjxZQVnXnf"),
  },
  {
    symbol: "WIF",
    kind: "coin",
    decimals: 6,
    mint: new PublicKey("Dw4XQ4WzfYL96b6W7xxsVkuGhpqUMLLoD4VzVhNvSner"),
    assetPda: new PublicKey("6aMGDasyprTr2FxbmRiWVSEK8SHhGgzuif9amsHt8irx"),
    vault: new PublicKey("3pnSfhXkjKEt3Jw4bZtLPJmN6SR1Wr1uz5HQTHHtQa4H"),
  },
  {
    symbol: "JUP",
    kind: "coin",
    decimals: 6,
    mint: new PublicKey("8aWEN66JixixwxEC3gwAKo6m5WfrL4Rhhs7vw1HFrG6F"),
    assetPda: new PublicKey("FR9F9iRc4dVj3hYbGKpbLjLRMkpcZNqJLE3afsLRtnZX"),
    vault: new PublicKey("BTuU17dFdgF7gKh5XZkJtHVRRQVLENk848wkn6xRxSkU"),
  },
];

export const CARD_PRICE_USDC = 1; // display only; on-chain value is the truth
