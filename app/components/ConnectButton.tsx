"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "./Providers";
import { detectWallets } from "@/lib/wallet";

export default function ConnectButton() {
  const { publicKey, walletName, connecting, connect, disconnect } =
    useWallet();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  const connectWallet = async (name?: string) => {
    setError(null);
    try {
      await connect(name);
      setOpen(false);
    } catch {
      setError("Connection not completed. Try again.");
    }
  };

  if (publicKey) {
    const short = `${publicKey.toBase58().slice(0, 4)}…${publicKey
      .toBase58()
      .slice(-4)}`;
    return (
      <div className="relative" ref={root}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="button-secondary connect-button"
          aria-expanded={open}
        >
          {short} ▾
        </button>
        {open && (
          <div className="absolute right-0 z-40 mt-2 w-44 rounded-md border border-border bg-popover p-1 text-sm shadow-xl">
            <div className="px-3 py-1.5 text-xs text-muted-foreground">
              {walletName}
            </div>
            <button
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
              className="min-h-10 w-full rounded px-3 py-1.5 text-left hover:bg-muted"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  const wallets = typeof window !== "undefined" ? detectWallets() : [];

  return (
    <div className="relative" ref={root}>
      <button
        onClick={() =>
          wallets.length > 1 ? setOpen((o) => !o) : connectWallet()
        }
        disabled={connecting}
        className="button-primary connect-button"
      >
        {connecting ? "Connecting…" : "Connect wallet"}
      </button>
      {open && wallets.length > 1 && (
        <div className="absolute right-0 z-40 mt-2 w-44 rounded-md border border-border bg-popover p-1 text-sm shadow-xl">
          {wallets.map((w) => (
            <button
              key={w.name}
              onClick={() => {
                connectWallet(w.name);
              }}
              className="min-h-10 w-full rounded px-3 py-1.5 text-left hover:bg-muted"
            >
              {w.icon} {w.name}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p
          className="absolute right-0 top-full mt-2 w-60 rounded-lg border border-border bg-card p-3 text-xs text-red-400"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
