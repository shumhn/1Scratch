"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { BASE_RPC } from "@/lib/consts";
import { detectWallets, InjectedWallet } from "@/lib/wallet";

/** One shared base-layer (devnet) connection. */
export const baseConnection = new Connection(BASE_RPC, "confirmed");

export interface WalletCtxValue {
  publicKey: PublicKey | null;
  walletName: string | null;
  connecting: boolean;
  connect: (name?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  /** Adapter-compatible: sign + send (caller confirms). */
  sendTransaction: (
    tx: Transaction,
    connection?: Connection,
  ) => Promise<string>;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  signAllTransactions: (txs: Transaction[]) => Promise<Transaction[]>;
}

const WalletContext = createContext<WalletCtxValue | null>(null);

/** Drop-in replacement for @solana/wallet-adapter-react's useWallet. */
export function useWallet(): WalletCtxValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet outside Providers");
  return ctx;
}

/** Drop-in replacement for the adapter's useConnection. */
export function useConnection() {
  return { connection: baseConnection };
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [injected, setInjected] = useState<InjectedWallet | null>(null);

  const connect = useCallback(async (name?: string) => {
    const wallets = detectWallets();
    if (wallets.length === 0) {
      throw new Error(
        "No wallet detected. Open 1Scratch in a browser with Phantom or Solflare installed.",
      );
    }
    const chosen = name
      ? (wallets.find((w) => w.name === name) ?? wallets[0])
      : wallets[0];
    setConnecting(true);
    try {
      const res = await chosen.provider.connect();
      const pk: PublicKey = res?.publicKey ?? chosen.provider.publicKey;
      setInjected(chosen);
      setPublicKey(pk);
      setWalletName(chosen.name);

      chosen.provider.on?.("accountChanged", (pk: PublicKey | null) => {
        if (pk) setPublicKey(pk);
        else {
          setPublicKey(null);
          setWalletName(null);
          setInjected(null);
        }
      });
      chosen.provider.on?.("disconnect", () => {
        setPublicKey(null);
        setWalletName(null);
        setInjected(null);
      });
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await injected?.provider?.disconnect();
    } catch {}
    setPublicKey(null);
    setWalletName(null);
    setInjected(null);
  }, [injected]);

  // Eager reconnect if the wallet already trusts us.
  useEffect(() => {
    const w = detectWallets()[0];
    w?.provider
      ?.connect?.({ onlyIfTrusted: true })
      .then((res: any) => {
        const pk: PublicKey = res?.publicKey ?? w.provider.publicKey;
        if (pk) {
          setInjected(w);
          setPublicKey(pk);
          setWalletName(w.name);
        }
      })
      .catch(() => {});
  }, []);

  const value = useMemo<WalletCtxValue>(
    () => ({
      publicKey,
      walletName,
      connecting,
      connect,
      disconnect,
      sendTransaction: async (tx, connection = baseConnection) => {
        if (!injected || !publicKey) throw new Error("wallet not connected");
        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = publicKey;
        const signed = await injected.provider.signTransaction(tx);
        return connection.sendRawTransaction(signed.serialize());
      },
      signTransaction: async (tx) => {
        if (!injected) throw new Error("wallet not connected");
        return injected.provider.signTransaction(tx);
      },
      signAllTransactions: async (txs) => {
        if (!injected) throw new Error("wallet not connected");
        return injected.provider.signAllTransactions(txs);
      },
    }),
    [publicKey, walletName, connecting, connect, disconnect, injected],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}
