import { Connection, PublicKey } from "@solana/web3.js";
import { ASSETS, BASE_RPC, HOUSE } from "../app/lib/consts";
import { cardPda, fetchCard, cardStateName, getProgram } from "../app/lib/program";

const OWNER = new PublicKey("2QrwExUdu93o8mSdfEh6kvbNLTbN1UnVRrfyjQsDSUPE");

async function main() {
  const base = new Connection(BASE_RPC, "confirmed");
  const program: any = getProgram(base);
  const now = Math.floor(Date.now() / 1000);

  const house = await program.account.house.fetch(HOUSE);
  console.log("HOUSE: cards sold:", house.cardNonce.toString(), "| tiers:", house.tierCount, "| active:", house.active);

  console.log("\nASSETS (price freshness):");
  for (const a of ASSETS) {
    const acc = await program.account.asset.fetch(a.assetPda);
    const age = now - acc.priceUpdatedAt.toNumber();
    console.log(`  ${a.symbol.padEnd(6)} $${(acc.priceUsdE8.toNumber()/1e8).toFixed(6)} | age ${age}s ${age > 3600 ? "⚠️ STALE" : "✅"}`);
  }

  console.log("\nMY CARDS (owner history):");
  for (let id = 0; id < house.cardNonce.toNumber(); id++) {
    const pda = cardPda(OWNER, id);
    const c = await fetchCard(base, pda);
    if (!c) { console.log(`  #${id} — (not on base / delegated)`); continue; }
    console.log(`  #${id} state=${cardStateName(c)} mult=${c.multiplierBps/10000}x prize=$${c.prizeUsdE6.toNumber()/1e6}`);
  }
}
main().catch(e => { console.error(e.message); process.exit(1); });
