"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Connection,
  PublicKey,
  SendTransactionError,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
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
    onStage?: (stage: "wallet" | "submitting") => void,
  ) => Promise<{ signature: string; blockhash: string; lastValidBlockHeight: number }>;
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
      sendTransaction: async (tx, connection = baseConnection, onStage) => {
        if (!injected || !publicKey) throw new Error("wallet not connected");
        const { context, value: { blockhash, lastValidBlockHeight } } =
          await connection.getLatestBlockhashAndContext("confirmed");
        tx.recentBlockhash = blockhash;
        tx.feePayer = publicKey;
        onStage?.("wallet");
        const signed = await injected.provider.signTransaction(tx);
        onStage?.("submitting");
        try {
          const raw = signed.serialize();
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              const signature = await connection.sendRawTransaction(raw, {
                preflightCommitment: "confirmed",
                minContextSlot: context.slot,
                maxRetries: 3,
              });
              return { signature, blockhash, lastValidBlockHeight };
            } catch (error) {
              const message = error instanceof SendTransactionError
                ? error.transactionError.message
                : error instanceof Error ? error.message : "";
              if (
                attempt === 2 ||
                !/blockhash not found|minimum context slot|node is behind/i.test(message)
              ) throw error;
              // Retry the same signed bytes: this cannot create a second card.
              await new Promise((resolve) => setTimeout(resolve, 450));
            }
          }
          throw new Error("Could not submit card transaction. Try again.");
        } catch (error) {
          if (!(error instanceof SendTransactionError)) throw error;
          const logs: string[] = [
            ...((await error.getLogs(connection).catch(() => [])) ?? []),
          ];
          let simulationError: unknown;
          if (!logs.length) {
            try {
              const transaction = VersionedTransaction.deserialize(signed.serialize());
              const simulation = await connection.simulateTransaction(transaction, {
                commitment: "confirmed",
                replaceRecentBlockhash: true,
                sigVerify: false,
              });
              simulationError = simulation.value.err;
              logs.push(...(simulation.value.logs ?? []));
            } catch {
              // The original RPC error is still useful if diagnostics are unavailable.
            }
          }
          const programError = logs.find((line) =>
            /Error Code:|Error:|custom program error|insufficient funds/i.test(line),
          );
          const technicalDetail = programError ??
            (simulationError ? JSON.stringify(simulationError) : error.transactionError.message);
          const detail = /InsufficientFundsForFee|insufficient funds|attempt to debit an account/i.test(technicalDetail)
            ? "Not enough devnet SOL for the network fee and delegation deposit. Add devnet SOL, then try again."
            : simulationError === null && !logs.length
              ? "RPC preflight failed, but a fresh simulation passed. This looks temporary; try again."
              : technicalDetail;
          throw new Error(`Card transaction failed: ${detail}`);
        }
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
