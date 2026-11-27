import { BN } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  ASSETS,
  EPHEMERAL_QUEUE,
  HOUSE,
  PrizeAsset,
  USDC_MINT,
} from "./consts";
import {
  cardPda,
  cardStateName,
  fetchCard,
  getErConnection,
  getProgram,
  isDelegated,
  DecodedCard,
} from "./program";

export type GamePhase =
  | "buying"
  | "delegating"
  | "ready"
  | "scratching"
  | "awaiting_vrf"
  | "revealed"
  | "settling"
  | "claiming"
  | "claimed"
  | "error";

export interface LiveCard {
  pubkey: PublicKey;
  id: number;
  asset: PrizeAsset;
  data?: DecodedCard;
  buySignature?: string;
}

/** Recover a card from its public id after a reload or wallet reconnect. */
export async function loadCard(
  base: Connection,
  owner: PublicKey,
  id: number
): Promise<LiveCard> {
  if (!Number.isSafeInteger(id) || id < 0) throw new Error("Enter a valid card number");
  const pubkey = cardPda(owner, id);
  const connection = (await isDelegated(pubkey)) ? await getErConnection(pubkey) : base;
  const data = await fetchCard(connection, pubkey);
  if (!data || !data.owner.equals(owner) || data.id.toNumber() !== id)
    throw new Error("Card not found for this wallet");
  const asset = ASSETS.find((a) => a.mint.equals(data.asset));
  if (!asset) throw new Error("Card asset is not in the current registry");
  return { pubkey, id, asset, data };
}

/**
 * Buy a card and delegate it to the ER in ONE transaction.
 * (buy_card inits the PDA earlier in the same tx, so delegation sees it.)
 */
export async function buyAndDelegate(
  base: Connection,
  wallet: any,
  asset: PrizeAsset,
  owner: PublicKey
): Promise<LiveCard> {
  const program = getProgram(base, wallet);
  const house: any = await program.account.house.fetch(HOUSE);
  const cardId = (house.cardNonce as BN).toNumber();
  const card = cardPda(owner, cardId);
  const ownerAta = getAssociatedTokenAddressSync(USDC_MINT, owner);

  const buyIx = await program.methods
    .buyCard()
    .accountsPartial({
      // `house` is auto-resolved from its constant PDA seeds
      asset: asset.assetPda,
      card,
      ownerAta,
      usdcTreasury: house.usdcTreasury,
      owner,
    })
    .instruction();

  const delegateIx = await program.methods
    .delegateCard(new BN(cardId))
    .accountsPartial({ owner, card })
    .instruction();

  const tx = new Transaction().add(buyIx, delegateIx);
  const sig = await wallet.sendTransaction(tx, base);
  await base.confirmTransaction(sig, "confirmed");

  return { pubkey: card, id: cardId, asset, buySignature: sig };
}

/** Fire the VRF scratch on the Ephemeral Rollup hosting this card. */
export async function scratchOnEr(
  wallet: any,
  live: LiveCard
): Promise<{ signature: string; endpoint: string }> {
  const er = await getErConnection(live.pubkey);
  const program = getProgram(er, wallet);
  const current = await fetchCard(er, live.pubkey);
  if (!current) throw new Error("Card is not visible on its Ephemeral Rollup");
  const pending = cardStateName(current) === "randomnessRequested";
  const clientSeed = pending
    ? (current.randomness[8] + 1) % 256
    : Math.floor(Math.random() * 256);
  const sig = await program.methods
    .scratch(new BN(live.id), clientSeed)
    .accountsPartial({
      owner: wallet.publicKey as PublicKey,
      card: live.pubkey,
      oracleQueue: EPHEMERAL_QUEUE,
    })
    .rpc();
  return { signature: sig, endpoint: er.rpcEndpoint };
}

/** Poll the ER until the VRF callback resolves the card (or timeout). */
export async function waitForReveal(
  live: LiveCard,
  timeoutMs = 95_000
): Promise<DecodedCard> {
  const er = await getErConnection(live.pubkey);
  const start = Date.now();
  for (;;) {
    const card = await fetchCard(er, live.pubkey);
    if (card && cardStateName(card) === "revealed") return card;
    if (Date.now() - start > timeoutMs)
      throw new Error("VRF timed out — try again");
    await new Promise((r) => setTimeout(r, 700));
  }
}

/** Commit + undelegate on the ER, wait for base-layer handoff, then claim. */
export async function settleAndClaim(
  base: Connection,
  wallet: any,
  live: LiveCard,
  onPhase: (p: GamePhase) => void
): Promise<{ settlementSignature?: string; claimSignature: string; endpoint?: string }> {
  const owner = wallet.publicKey as PublicKey;
  let settlementSignature: string | undefined;
  let endpoint: string | undefined;
  if (await isDelegated(live.pubkey)) {
    const er = await getErConnection(live.pubkey);
    endpoint = er.rpcEndpoint;
    const erProgram = getProgram(er, wallet);
    onPhase("settling");
    settlementSignature = await erProgram.methods
      .settleCard(new BN(live.id))
      .accountsPartial({ owner, card: live.pubkey })
      .rpc();
  }

  // Wait until the router reports the card back on base.
  const start = Date.now();
  for (;;) {
    if (!(await isDelegated(live.pubkey))) {
      const card = await fetchCard(base, live.pubkey).catch(() => null);
      if (card && cardStateName(card) === "revealed") break;
    }
    if (Date.now() - start > 90_000)
      throw new Error("Settlement timed out — refresh and claim");
    await new Promise((r) => setTimeout(r, 1_000));
  }

  onPhase("claiming");
  const program = getProgram(base, wallet);
  const ownerAta = getAssociatedTokenAddressSync(live.asset.mint, owner);
  const claimSig = await program.methods
    .claimPayout(new BN(live.id))
    .accountsPartial({
      // `house` is auto-resolved from its constant PDA seeds
      card: live.pubkey,
      asset: live.asset.assetPda,
      vault: live.asset.vault,
      assetMint: live.asset.mint,
      ownerAta,
      owner,
    })
    .rpc();
  onPhase("claimed");
  return { settlementSignature, claimSignature: claimSig, endpoint };
}
