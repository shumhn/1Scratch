/** Simulate an unfavorable dealer quote. This must fail before any transfer. */
import { BN } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Connection, Keypair } from "@solana/web3.js";
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { ASSETS, BASE_RPC, HOUSE, USDC_MINT, USDC_TREASURY } from "../app/lib/consts";
import { getProgram } from "../app/lib/program";

async function main() {
  const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(
    process.env.ANCHOR_WALLET ?? join(homedir(), ".config", "solana", "id.json"), "utf8"
  ))));
  const wallet = {
    publicKey: payer.publicKey,
    signTransaction: async (tx: any) => { tx.sign(payer); return tx; },
    signAllTransactions: async (txs: any[]) => { txs.forEach((tx) => tx.sign(payer)); return txs; },
  };
  const asset = ASSETS.find((a) => a.symbol === "TSLAx")!;
  const program = getProgram(new Connection(BASE_RPC, "confirmed"), wallet);
  try {
    await program.methods.sellAsset(new BN(1), new BN(1_000_000)).accountsPartial({
      house: HOUSE, asset: asset.assetPda, assetMint: asset.mint, vault: asset.vault,
      ownerAssetAta: getAssociatedTokenAddressSync(asset.mint, payer.publicKey),
      usdcMint: USDC_MINT, usdcTreasury: USDC_TREASURY,
      ownerUsdcAta: getAssociatedTokenAddressSync(USDC_MINT, payer.publicKey),
      owner: payer.publicKey,
    }).simulate();
  } catch (e: any) {
    const message = `${e.message ?? ""} ${JSON.stringify(e.simulationResponse ?? {})} ${JSON.stringify(e.logs ?? [])}`;
    if (message.includes("SellSlippageExceeded") || message.includes("Sale quote is below")) {
      console.log("✅ Devnet simulation rejected a sale below the user's minimum");
      return;
    }
    console.error("unexpected simulation error:", JSON.stringify(e.simulationResponse ?? e));
    throw e;
  }
  throw new Error("Sale unexpectedly succeeded below the user's minimum");
}

main().catch((e) => { console.error("sell guard test failed:", String(e), e.logs ?? []); process.exit(1); });
