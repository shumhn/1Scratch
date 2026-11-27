import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import { PROGRAM_ID, ROUTER } from "./consts";
import idlJson from "./idl.json";
import { Scratchers } from "./scratchers";

const idl = idlJson as unknown as Scratchers;

/** Read-only wallet shim for fetching accounts without a connected wallet. */
const DUMMY_WALLET = {
  publicKey: Keypair.generate().publicKey,
  signTransaction: async (tx: any) => tx,
  signAllTransactions: async (txs: any[]) => txs,
};

export function getProgram(
  connection: Connection,
  wallet?: any
): Program<Scratchers> {
  const provider = new AnchorProvider(
    connection,
    (wallet ?? DUMMY_WALLET) as any,
    { commitment: "confirmed" }
  );
  return new Program(idl, provider);
}

export const housePda = () =>
  PublicKey.findProgramAddressSync([Buffer.from("house")], PROGRAM_ID)[0];

export const cardPda = (owner: PublicKey, id: number | BN) =>
  PublicKey.findProgramAddressSync(
    [
      Buffer.from("card"),
      owner.toBuffer(),
      new BN(id).toArrayLike(Buffer, "le", 8),
    ],
    PROGRAM_ID
  )[0];

interface DelegationStatus {
  isDelegated: boolean;
  fqdn?: string;
}

/** Router errors must be surfaced; they are not proof of undelegation. */
export async function getDelegationStatus(account: PublicKey): Promise<DelegationStatus> {
  const resp = await fetch(ROUTER, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getDelegationStatus",
      params: [account.toBase58()],
    }),
  });
  if (!resp.ok) throw new Error(`MagicBlock router returned HTTP ${resp.status}`);
  const json: any = await resp.json();
  if (json.error || typeof json?.result?.isDelegated !== "boolean")
    throw new Error(json.error?.message ?? "Invalid MagicBlock router response");
  return json.result;
}

/** Ask the MagicBlock router which ER hosts a delegated account. */
export async function getErConnection(account: PublicKey): Promise<Connection> {
  const status = await getDelegationStatus(account);
  const fqdn = status.isDelegated ? status.fqdn : undefined;
  if (!fqdn) throw new Error("No ER route — is the card delegated?");
  // Router returns a full URL ("https://devnet-as.magicblock.app/") — don't double-prefix.
  const url = fqdn.startsWith("http") ? fqdn : `https://${fqdn}`;
  return new Connection(url, "confirmed");
}

/** True while the router still reports the account delegated. */
export async function isDelegated(account: PublicKey): Promise<boolean> {
  return (await getDelegationStatus(account)).isDelegated;
}

export type CardState =
  | "sealed"
  | "randomnessRequested"
  | "revealed"
  | "claimed";

export interface DecodedCard {
  owner: PublicKey;
  id: BN;
  asset: PublicKey;
  state: Record<string, unknown>;
  multiplierBps: number;
  prizeUsdE6: BN;
  randomness: number[];
  cardPriceUsdc: BN;
  tiers: { multiplierBps: number; weightPpm: number }[];
  tierCount: number;
}

export function cardStateName(card: DecodedCard): CardState {
  return Object.keys(card.state)[0] as CardState;
}

export async function fetchCard(
  connection: Connection,
  card: PublicKey
): Promise<DecodedCard | null> {
  const info = await connection.getAccountInfo(card);
  if (!info) return null;
  const program = getProgram(connection);
  // BorshAccountsCoder keys layouts camelCase ("card"), even though the
  // Anchor 1.x IDL names the type "Card".
  return program.coder.accounts.decode("card", info.data) as DecodedCard;
}

export function formatMultiplier(bps: number): string {
  const x = bps / 10_000;
  return x >= 100 ? `${x.toLocaleString()}x` : `${x}x`;
}
