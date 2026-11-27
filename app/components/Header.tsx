"use client";

import { useCallback, useEffect, useState } from "react";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { useConnection, useWallet } from "./Providers";
import ConnectButton from "./ConnectButton";
import { USDC_MINT } from "@/lib/consts";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Plus } from "lucide-react";
import BrandMark from "./BrandMark";

export default function Header() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const isPlay = usePathname().startsWith("/play");
  const [usdc, setUsdc] = useState<number | null>(null);
  const [faucetBusy, setFaucetBusy] = useState(false);
  const [faucetMsg, setFaucetMsg] = useState<string | null>(null);
  const [faucetError, setFaucetError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) return setUsdc(null);
    let stop = false;
    const load = async () => {
      try {
        const ata = getAssociatedTokenAddressSync(USDC_MINT, publicKey);
        const b = await connection.getTokenAccountBalance(ata);
        if (!stop) setUsdc(b.value.uiAmount ?? 0);
      } catch {
        if (!stop) setUsdc(0);
      }
    };
    load();
    const t = setInterval(load, 10_000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [connection, publicKey, faucetMsg]);

  const faucet = useCallback(async () => {
    if (!publicKey) return;
    setFaucetBusy(true);
    setFaucetError(null);
    try {
      const r = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: publicKey.toBase58() }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "faucet failed");
      setFaucetMsg(`+100 @ ${Date.now()}`);
    } catch (e: any) {
      setFaucetError(e.message ?? "Funds could not be added. Try again.");
    } finally {
      setFaucetBusy(false);
    }
  }, [publicKey]);

  return (
    <header className="site-header">
      <div className="page-container header-inner">
        <Link href="/" aria-label="1Scratch home">
          <BrandMark />
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          <Link href="/play" className={isPlay ? "nav-active" : ""}>
            Play
          </Link>
          <Link href={isPlay ? "/play#portfolio" : "/#how-it-works"}>
            {isPlay ? "Portfolio" : "How it works"}
          </Link>
          <Link href={isPlay ? "/play#odds" : "/#odds"}>Prize odds</Link>
        </nav>
        <div className="header-actions">
          {publicKey && (
            <>
              <span className="wallet-balance" title="Devnet USDC balance">
                {usdc == null ? "—" : `${usdc.toLocaleString()} USDC`}
              </span>
              <button
                onClick={faucet}
                disabled={faucetBusy}
                className="funds-button"
                title="0.1 devnet SOL + 100 devnet USDC (everything needed to play)"
              >
                <Plus size={14} />
                {faucetBusy ? "Adding…" : "Funds"}
              </button>
            </>
          )}
          {isPlay ? (
            <ConnectButton />
          ) : (
            <Link href="/play" className="button-primary header-play">
              Let’s play <ArrowUpRight size={17} />
            </Link>
          )}
        </div>
      </div>
      {faucetError && (
        <div className="page-container pb-3 text-sm text-red-400" role="alert">
          {faucetError}
        </div>
      )}
    </header>
  );
}
