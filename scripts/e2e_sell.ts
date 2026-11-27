/** Live devnet test of the funded mock dealer redemption. */
import { Connection, Keypair } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { ASSETS, BASE_RPC, USDC_MINT, USDC_TREASURY } from "../app/lib/consts";
import { getSaleQuote, sellAsset } from "../app/lib/sell";

const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(
  process.env.ANCHOR_WALLET ?? join(homedir(), ".config", "solana", "id.json"), "utf8"
))));
const wallet = {
  publicKey: payer.publicKey,
  signTransaction: async (tx: any) => { tx.sign(payer); return tx; },
  signAllTransactions: async (txs: any[]) => { txs.forEach((tx) => tx.sign(payer)); return txs; },
};

async function main() {
  const asset = ASSETS.find((a) => a.symbol === (process.argv[2] ?? "TSLAx"));
  if (!asset) throw new Error("Unknown asset symbol");
  const base = new Connection(BASE_RPC, "confirmed");
  const assetAta = getAssociatedTokenAddressSync(asset.mint, payer.publicKey);
  const usdcAta = getAssociatedTokenAddressSync(USDC_MINT, payer.publicKey);
  const raw = async (address: any) => BigInt((await base.getTokenAccountBalance(address)).value.amount);

  const quote = await getSaleQuote(base, payer.publicKey, asset);
  const [assetBefore, usdcBefore, vaultBefore, treasuryBefore] = await Promise.all([
    raw(assetAta), raw(usdcAta), raw(asset.vault), raw(USDC_TREASURY),
  ]);
  if (assetBefore !== quote.amount) throw new Error("Balance changed before sale");
  console.log(`Selling ${quote.amount} base units of ${asset.symbol}; quote ${quote.expectedUsdc} micro-USDC, min ${quote.minUsdcOut}`);
  const signature = await sellAsset(base, wallet, quote);
  const [assetAfter, usdcAfter, vaultAfter, treasuryAfter] = await Promise.all([
    raw(assetAta), raw(usdcAta), raw(asset.vault), raw(USDC_TREASURY),
  ]);
  const usdcReceived = usdcAfter - usdcBefore;
  if (assetBefore - assetAfter !== quote.amount || vaultAfter - vaultBefore !== quote.amount)
    throw new Error("Mock asset transfer did not balance");
  if (usdcReceived < quote.minUsdcOut || treasuryBefore - treasuryAfter !== usdcReceived)
    throw new Error("Mock USDC payout did not balance");
  console.log(`✅ Sale ${signature}: received ${usdcReceived} micro-USDC; player and treasury balances reconcile`);
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
