import { Connection, PublicKey } from "@solana/web3.js";
import { cardPda, fetchCard } from "../app/lib/program";
import { findBaseTrace, findErTrace, verifyCardOutcome } from "../app/lib/verification";

const [ownerArg, idArg, endpoint = "https://devnet-as.magicblock.app/"] = process.argv.slice(2);
if (!ownerArg || !idArg) {
  console.error("Usage: npx tsx scripts/verify_receipt.ts <owner> <card-id> [ER-endpoint]");
  process.exit(2);
}

async function main() {
  const card = cardPda(new PublicKey(ownerArg), Number(idArg));
  const base = new Connection("https://rpc.magicblock.app/devnet", "confirmed");
  const data = await fetchCard(base, card);
  if (!data) throw new Error("Card not found on Solana base layer");
  const result = verifyCardOutcome(data);
  if (!result?.matches) throw new Error("Card prize does not match saved randomness and tiers");
  const trace = await findErTrace(endpoint, card);
  const baseTrace = await findBaseTrace(base, card);
  if (!trace.scratchSignature || !trace.callbackSignature)
    throw new Error("Scratch request or successful VRF callback missing from ER history");
  if (!baseTrace.buySignature || !baseTrace.claimSignature)
    throw new Error("Buy/delegate or claim transaction missing from Solana history");
  console.log(JSON.stringify({
    card: card.toBase58(),
    roll: result.roll,
    multiplierBps: result.expectedMultiplierBps,
    prizeUsdE6: result.expectedPrizeUsdE6,
    mathMatches: result.matches,
    ...baseTrace,
    ...trace,
  }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
