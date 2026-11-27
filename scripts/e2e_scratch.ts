/**
 * LIVE E2E on devnet: buy → delegate → VRF scratch (ER) → reveal →
 * settle (commit+undelegate) → claim payout (base).
 *
 * Proves the whole MagicBlock loop against real infrastructure.
 *
 * Run: npx tsx scripts/e2e_scratch.ts [SYMBOL]   (default TSLAx)
 */
import { Connection, Keypair, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { readFileSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  buyAndDelegate,
  scratchOnEr,
  waitForReveal,
  settleAndClaim,
} from "../app/lib/game";
import { ASSETS, BASE_RPC } from "../app/lib/consts";
import { isDelegated, formatMultiplier, fetchCard, cardStateName, getProgram, getErConnection } from "../app/lib/program";

const __dirname = dirname(fileURLToPath(import.meta.url));
const payer = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(
      readFileSync(
        process.env.ANCHOR_WALLET ?? join(homedir(), ".config", "solana", "id.json"),
        "utf8"
      )
    )
  )
);

/** Minimal node-side wallet matching what the game flow expects. */
const wallet = {
  publicKey: payer.publicKey,
  signTransaction: async (tx: Transaction) => {
    tx.sign(payer);
    return tx;
  },
  signAllTransactions: async (txs: Transaction[]) => {
    txs.forEach((t) => t.sign(payer));
    return txs;
  },
  sendTransaction: async (tx: Transaction, connection: Connection) => {
    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.sign(payer);
    return connection.sendRawTransaction(tx.serialize());
  },
};

async function main() {
  const symbol = process.argv[2] ?? "TSLAx";
  const asset = ASSETS.find((a) => a.symbol === symbol);
  if (!asset) throw new Error(`unknown asset ${symbol}`);

  const base = new Connection(BASE_RPC, "confirmed");
  const prizeAta = getAssociatedTokenAddressSync(asset.mint, payer.publicKey);
  const tokenBalance = async () => {
    try { return BigInt((await base.getTokenAccountBalance(prizeAta)).value.amount); }
    catch { return 0n; }
  };
  const before = await tokenBalance();
  console.log(`\n🎰 E2E scratch — ${symbol} card, player ${payer.publicKey.toBase58()}`);

  // 1. buy + delegate (base layer)
  console.log("\n[1/5] buy_card + delegate_card (base layer, 1 tx)…");
  const live = await buyAndDelegate(base, wallet, asset, payer.publicKey);
  console.log("     card:", live.pubkey.toBase58(), "id:", live.id);

  // 2. confirm delegation via the router
  const delegated = await isDelegated(live.pubkey);
  console.log("[2/5] router getDelegationStatus → isDelegated:", delegated);
  if (!delegated) throw new Error("delegation not visible on router");

  // 3. scratch on the ER (VRF request, ephemeral queue = free)
  console.log("[3/5] scratch → VRF request on the Ephemeral Rollup…");
  const scratchSig = await scratchOnEr(wallet, live);
  console.log("     ER tx:", scratchSig.signature.slice(0, 24) + "…");

  // 4. wait for the VRF oracle callback
  console.log("[4/5] awaiting VRF callback…");
  const revealed = await waitForReveal(live);
  const roll = Buffer.from(revealed.randomness).readUInt32LE(0) % 10_000_000;
  const rawCard: any = await getProgram(await getErConnection(live.pubkey)).account.card.fetch(live.pubkey);
  let cumulative = 0;
  const expected = rawCard.tiers.slice(0, rawCard.tierCount).find((tier: any) => {
    cumulative += tier.weightPpm;
    return roll < cumulative;
  });
  if (!expected || expected.multiplierBps !== revealed.multiplierBps)
    throw new Error("On-chain result does not match VRF randomness and prize table");
  const mult = revealed.multiplierBps;
  const prize = revealed.prizeUsdE6.toNumber() / 1e6;
  console.log(
    `     ✅ REVEALED: ${formatMultiplier(mult)}  →  $${prize} of ${symbol}`
  );

  // 5. settle (commit+undelegate) then claim on base
  console.log("[5/5] settle (commit+undelegate) → claim_payout on base…");
  const claimSig = await settleAndClaim(base, wallet, live, (p) =>
    console.log("     phase:", p)
  );
  console.log("     claim tx:", claimSig.claimSignature.slice(0, 24) + "…");
  const claimed = await fetchCard(base, live.pubkey);
  if (!claimed || cardStateName(claimed) !== "claimed")
    throw new Error("Card was not marked claimed on base layer");
  const delta = (await tokenBalance()) - before;
  if (prize > 0 && delta <= 0n)
    throw new Error("Winning card did not increase the player's token balance");
  if (prize === 0 && delta !== 0n)
    throw new Error("Blank card unexpectedly changed the player's token balance");
  console.log(`     verified roll ${roll}, token delta ${delta} base units, card claimed`);

  console.log("\n🏆 E2E COMPLETE — MagicBlock ER + VRF full loop verified on devnet.\n");
}

main().catch((e) => {
  console.error("\n❌ E2E failed:", e.message ?? e);
  process.exit(1);
});
