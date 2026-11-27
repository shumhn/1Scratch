import { BN } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import { HOUSE, PrizeAsset, USDC_MINT, USDC_TREASURY } from "./consts";
import { getProgram } from "./program";

export interface SaleQuote {
  asset: PrizeAsset;
  amount: bigint;
  expectedUsdc: bigint;
  minUsdcOut: bigint;
  priceUpdatedAt: number;
}

/** Preview the funded devnet dealer quote with the same integer math as Rust. */
export async function getSaleQuote(
  connection: Connection,
  owner: PublicKey,
  asset: PrizeAsset
): Promise<SaleQuote> {
  const program = getProgram(connection);
  const [house, priceAccount, balance, treasury] = await Promise.all([
    program.account.house.fetch(HOUSE) as Promise<any>,
    program.account.asset.fetch(asset.assetPda) as Promise<any>,
    connection.getTokenAccountBalance(getAssociatedTokenAddressSync(asset.mint, owner)),
    connection.getTokenAccountBalance(USDC_TREASURY),
  ]);
  const amount = BigInt(balance.value.amount);
  if (amount === 0n) throw new Error("No tokens to sell");
  const updatedAt = Number(priceAccount.priceUpdatedAt.toString());
  const age = Math.floor(Date.now() / 1000) - updatedAt;
  if (!priceAccount.active || age < 0 || age > Number(house.maxPriceAgeSecs.toString()))
    throw new Error("Reference price is stale; wait for the keeper");
  const priceE8 = BigInt(priceAccount.priceUsdE8.toString());
  if (priceE8 === 0n) throw new Error("No reference price is available");
  const scale = 10n ** BigInt(balance.value.decimals + 2);
  const expectedUsdc = amount * priceE8 / scale;
  if (expectedUsdc === 0n) throw new Error("Balance is too small to sell");
  if (BigInt(treasury.value.amount) < expectedUsdc)
    throw new Error("Demo treasury needs more devnet USDC before this sale");
  const minUsdcOut = expectedUsdc * 99n / 100n || 1n;
  return { asset, amount, expectedUsdc, minUsdcOut, priceUpdatedAt: updatedAt };
}

/** The wallet signs a base-layer transfer of mock asset for mock USDC. */
export async function sellAsset(
  connection: Connection,
  wallet: any,
  quote: SaleQuote
): Promise<string> {
  const owner = wallet.publicKey as PublicKey;
  if (!owner) throw new Error("Connect your wallet");
  const asset = quote.asset;
  return getProgram(connection, wallet).methods
    .sellAsset(new BN(quote.amount.toString()), new BN(quote.minUsdcOut.toString()))
    .accountsPartial({
      house: HOUSE,
      asset: asset.assetPda,
      assetMint: asset.mint,
      vault: asset.vault,
      ownerAssetAta: getAssociatedTokenAddressSync(asset.mint, owner),
      usdcMint: USDC_MINT,
      usdcTreasury: USDC_TREASURY,
      ownerUsdcAta: getAssociatedTokenAddressSync(USDC_MINT, owner),
      owner,
    })
    .rpc();
}
