/**
 * Devnet player faucet — server-side only (the faucet key never reaches the
 * browser). POST { address } → 0.1 devnet SOL (fees + delegation deposits)
 * + 100 mock USDC. Both are required for a fresh wallet to play end-to-end.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

export const runtime = "nodejs";

const USDC_MINT = new PublicKey("QuF6eYfFbrxNk2CSWwKRAePR76eBXtUrNoPT6u4Y815");
const RPC = process.env.BASE_RPC ?? "https://rpc.magicblock.app/devnet";
const SOL_DROP = BigInt(0.1 * LAMPORTS_PER_SOL);
const USDC_DROP = 100n * 10n ** 6n;

export async function POST(req: NextRequest) {
  try {
    if (process.env.NODE_ENV === "production" && process.env.FAUCET_PUBLIC_ENABLED !== "1")
      return NextResponse.json({ error: "devnet faucet disabled" }, { status: 503 });
    const raw = process.env.FAUCET_KEYPAIR;
    if (!raw)
      return NextResponse.json(
        { error: "faucet not configured" },
        { status: 503 }
      );
    const { address } = await req.json();
    const owner = new PublicKey(address);

    const authority = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
    const connection = new Connection(RPC, "confirmed");

    // 0.1 SOL for fees + delegation deposits (skip if already funded).
    let solSig: string | null = null;
    const bal = await connection.getBalance(owner);
    if (bal < 0.02 * LAMPORTS_PER_SOL) {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: authority.publicKey,
          toPubkey: owner,
          lamports: SOL_DROP,
        })
      );
      tx.feePayer = authority.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.sign(authority);
      solSig = await connection.sendRawTransaction(tx.serialize());
    }

    // Avoid minting another batch to a wallet that still has demo funds.
    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      authority,
      USDC_MINT,
      owner
    );
    const usdcSig = ata.amount > 0n ? null : await mintTo(
      connection, authority, USDC_MINT, ata.address, authority, USDC_DROP
    );

    return NextResponse.json({ ok: true, solSig, usdcSig });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message?.slice(0, 120) ?? "faucet error" },
      { status: 500 }
    );
  }
}
