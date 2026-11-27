import { Connection, PublicKey } from "@solana/web3.js";
import { cardPda, fetchCard, cardStateName, formatMultiplier } from "../app/lib/program";

const ER = "https://devnet-as.magicblock.app/";
const BASE = "https://rpc.magicblock.app/devnet";
const OURS = new PublicKey("CwvfeJmKV5cEJwrUU3M12C3d97vf7MyUoT6BnSCJNqCP");
const VRF = "Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz";
const OWNER = new PublicKey("2QrwExUdu93o8mSdfEh6kvbNLTbN1UnVRrfyjQsDSUPE");

const TIERS = [
  { bps: 0, ppm: 6_200_000 }, { bps: 10_000, ppm: 3_000_000 },
  { bps: 20_000, ppm: 500_000 }, { bps: 50_000, ppm: 200_000 },
  { bps: 100_000, ppm: 90_000 }, { bps: 1_000_000, ppm: 9_900 },
  { bps: 10_000_000, ppm: 100 },
];

async function main() {
  // ---- (1) find the SUCCESSFUL VRF callback tx on the ER ----
  console.log("=== (1) The oracle callback tx (post-fix) ===");
  const er = new Connection(ER, "confirmed");
  const sigs = await er.getSignaturesForAddress(OURS, { limit: 30 });
  for (const s of sigs) {
    const tx: any = await er.getTransaction(s.signature, { maxSupportedTransactionVersion: 1 });
    const logs: string[] = tx?.meta?.logMessages ?? [];
    if (!logs.some(l => l.includes("Instruction: VrfCallback"))) continue;
    if (tx.meta?.err) continue;
    const keys = tx.transaction.message.accountKeys.map((k: any) => (k.pubkey ?? k).toString());
    console.log("tx:", s.signature);
    console.log("signer (oracle):", keys[0]);
    console.log("calls VRF program:", keys.includes(VRF));
    console.log("--- logs ---");
    logs.forEach(l => console.log("  ", l));
    break;
  }

  // ---- (2) recompute card #4's win from on-chain randomness ----
  console.log("\n=== (2) Recompute card #4 outcome from stored randomness ===");
  const base = new Connection(BASE, "confirmed");
  const card4 = cardPda(OWNER, 4);
  const c = await fetchCard(base, card4);
  if (!c) throw new Error("card #4 not found");
  const rnd = Buffer.from(c.randomness);
  const roll = rnd.readUInt32LE(0) % 10_000_000;
  let acc = 0, hit = TIERS[0];
  for (const t of TIERS) { acc += t.ppm; if (roll < acc) { hit = t; break; } }
  console.log("card #4 state:", cardStateName(c));
  console.log("on-chain randomness:", rnd.toString("hex").slice(0, 24) + "…");
  console.log("recomputed roll:", roll.toLocaleString(), "/ 10,000,000");
  console.log("roll lands in band:", formatMultiplier(hit.bps));
  console.log("stored multiplier:  ", formatMultiplier(c.multiplierBps));
  console.log("MATCH:", hit.bps === c.multiplierBps ? "✅ outcome = f(VRF randomness, public table)" : "❌ MISMATCH");
}
main().catch(e => { console.error(e.message); process.exit(1); });
