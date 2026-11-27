import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { readFileSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { ASSETS, BASE_RPC, HOUSE } from "../app/lib/consts";
import { cardPda, fetchCard, cardStateName, formatMultiplier, isDelegated, getProgram } from "../app/lib/program";
import { BN } from "@coral-xyz/anchor";

const __dirname = dirname(fileURLToPath(import.meta.url));
const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(join(homedir(), ".config", "solana", "id.json"), "utf8"))));
const wallet = {
  publicKey: payer.publicKey,
  signTransaction: async (tx: Transaction) => { tx.sign(payer); return tx; },
  signAllTransactions: async (txs: Transaction[]) => { txs.forEach(t => t.sign(payer)); return txs; },
  sendTransaction: async (tx: Transaction, c: Connection) => {
    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = (await c.getLatestBlockhash()).blockhash;
    tx.sign(payer);
    return c.sendRawTransaction(tx.serialize());
  },
};

async function main() {
  const id = Number(process.argv[2]);
  const symbol = process.argv[3] ?? "AAPLx";
  const asset = ASSETS.find(a => a.symbol === symbol)!;
  const base = new Connection(BASE_RPC, "confirmed");
  const card = cardPda(payer.publicKey, id);

  const c = await fetchCard(base, card);
  if (!c) throw new Error("card not found on base");
  console.log(`card #${id}: state=${cardStateName(c)} mult=${formatMultiplier(c.multiplierBps)} prize=$${c.prizeUsdE6.toNumber()/1e6} delegated=${await isDelegated(card)}`);

  const program = getProgram(base, wallet);
  const ownerAta = getAssociatedTokenAddressSync(asset.mint, payer.publicKey);
  const sig = await program.methods.claimPayout(new BN(id)).accountsPartial({
    card, asset: asset.assetPda, vault: asset.vault, assetMint: asset.mint, ownerAta, owner: payer.publicKey,
  }).rpc();
  console.log("✅ claimed:", sig.slice(0, 24) + "…");

  const bal = await base.getTokenAccountBalance(ownerAta).catch(() => null);
  console.log(`${symbol} balance now:`, bal?.value.uiAmountString ?? "0");
}
main().catch(e => { console.error("❌", e.message ?? e); process.exit(1); });
