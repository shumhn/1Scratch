import { Connection, PublicKey } from "@solana/web3.js";
import { DecodedCard } from "./program";
import { PROGRAM_ID } from "./consts";

export interface CardReceipt {
  buySignature?: string;
  erEndpoint?: string;
  scratchSignature?: string;
  callbackSignature?: string;
  settlementSignature?: string;
  claimSignature?: string;
}

export interface ErTrace {
  scratchSignature?: string;
  callbackSignature?: string;
  settlementSignature?: string;
}

export interface BaseTrace {
  buySignature?: string;
  claimSignature?: string;
}

const receiptKey = (card: PublicKey) => `scratchers:receipt:${card.toBase58()}`;

export function readReceipt(card: PublicKey): CardReceipt {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(receiptKey(card)) ?? "{}");
  } catch {
    return {};
  }
}

export function writeReceipt(card: PublicKey, receipt: CardReceipt) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(receiptKey(card), JSON.stringify(receipt));
  } catch {
    // Storage is optional; the card itself remains on-chain.
  }
}

/** Reproduce the program's tier selection from the card's saved VRF bytes. */
export function verifyCardOutcome(card: DecodedCard) {
  const tiers = card.tiers.slice(0, card.tierCount);
  const total = tiers.reduce((sum, tier) => sum + tier.weightPpm, 0);
  if (card.randomness.length !== 32 || !total || tiers.length === 0) return null;
  const raw = (card.randomness[0] | (card.randomness[1] << 8) |
    (card.randomness[2] << 16) | (card.randomness[3] << 24)) >>> 0;
  const roll = raw % total;
  let cumulative = 0;
  const tier = tiers.find((entry) => {
    cumulative += entry.weightPpm;
    return roll < cumulative;
  });
  if (!tier) return null;
  const prize = BigInt(card.cardPriceUsdc.toString()) * BigInt(tier.multiplierBps) / 10_000n;
  return {
    roll,
    total,
    expectedMultiplierBps: tier.multiplierBps,
    expectedPrizeUsdE6: prize.toString(),
    matches: card.multiplierBps === tier.multiplierBps &&
      card.prizeUsdE6.toString() === prize.toString(),
  };
}

/** Read successful game-program instruction logs from the card's MagicBlock ER history. */
export async function findErTrace(endpoint: string, card: PublicKey): Promise<ErTrace> {
  const url = new URL(endpoint);
  if (url.protocol !== "https:" ||
      !(url.hostname === "magicblock.app" || url.hostname.endsWith(".magicblock.app"))) {
    throw new Error("Invalid MagicBlock ER endpoint");
  }
  const er = new Connection(url.toString(), "confirmed");
  const history = await er.getSignaturesForAddress(card, { limit: 40 });
  const trace: ErTrace = {};
  for (const item of history) {
    if (item.err) continue;
    const tx = await er.getTransaction(item.signature, { maxSupportedTransactionVersion: 1 });
    if (!tx || tx.meta?.err) continue;
    const logs = tx.meta?.logMessages ?? [];
    if (!logs.some((line) => line.includes(`Program ${PROGRAM_ID.toBase58()} invoke`))) continue;
    const signature = item.signature;
    if (!trace.scratchSignature && logs.some((line) => line.includes("Instruction: Scratch")))
      trace.scratchSignature = signature;
    if (!trace.callbackSignature && logs.some((line) => line.includes("Instruction: VrfCallback")))
      trace.callbackSignature = signature;
    if (!trace.settlementSignature && logs.some((line) => line.includes("Instruction: SettleCard")))
      trace.settlementSignature = signature;
    if (trace.scratchSignature && trace.callbackSignature && trace.settlementSignature) break;
  }
  return trace;
}

/** Recover the buy/delegate and claim transactions from Solana devnet history. */
export async function findBaseTrace(base: Connection, card: PublicKey): Promise<BaseTrace> {
  const history = await base.getSignaturesForAddress(card, { limit: 40 });
  const trace: BaseTrace = {};
  for (const item of history) {
    if (item.err) continue;
    const tx = await base.getTransaction(item.signature, { maxSupportedTransactionVersion: 1 });
    if (!tx || tx.meta?.err) continue;
    const logs = tx.meta?.logMessages ?? [];
    if (!logs.some((line) => line.includes(`Program ${PROGRAM_ID.toBase58()} invoke`))) continue;
    if (!trace.buySignature &&
        logs.some((line) => line.includes("Instruction: BuyCard")) &&
        logs.some((line) => line.includes("Instruction: DelegateCard")))
      trace.buySignature = item.signature;
    if (!trace.claimSignature && logs.some((line) => line.includes("Instruction: ClaimPayout")))
      trace.claimSignature = item.signature;
    if (trace.buySignature && trace.claimSignature) break;
  }
  return trace;
}
