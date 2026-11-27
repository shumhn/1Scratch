import { PublicKey, Transaction } from "@solana/web3.js";

/** Injected browser wallets (Phantom, Solflare) — no adapter dependency. */
export interface InjectedWallet {
  name: string;
  icon?: string;
  provider: any;
}

export function detectWallets(): InjectedWallet[] {
  if (typeof window === "undefined") return [];
  const w = window as any;
  const out: InjectedWallet[] = [];
  if (w.solana?.isPhantom)
    out.push({ name: "Phantom", icon: "👻", provider: w.solana });
  if (w.solflare?.isSolflare)
    out.push({ name: "Solflare", icon: "🔆", provider: w.solflare });
  // Generic fallback if neither flag matched but something is injected
  if (out.length === 0 && w.solana?.connect)
    out.push({ name: "Wallet", icon: "👛", provider: w.solana });
  return out;
}
