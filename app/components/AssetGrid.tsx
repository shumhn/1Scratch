"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Fingerprint, ShieldCheck } from "lucide-react";
import { useConnection, useWallet } from "./Providers";
import { ASSETS } from "@/lib/consts";
import { getProgram } from "@/lib/program";
import { buyAndDelegate, LiveCard } from "@/lib/game";
import { fmtPrice, relativeTime } from "@/lib/format";
import { useHouse } from "@/lib/house";
import TicketArtwork from "./TicketArtwork";
import { StockIdentity, STOCK_NAMES } from "./StockIdentity";

export interface AssetPrice {
  priceUsd: number;
  updatedAt: number;
}

/** Reference prices are displayed after a win in the portfolio. */
export function useAssetPrices() {
  const { connection } = useConnection();
  const [prices, setPrices] = useState<Record<string, AssetPrice>>({});

  useEffect(() => {
    let stop = false;
    const load = async () => {
      const program = getProgram(connection);
      const out: Record<string, AssetPrice> = {};
      await Promise.all(
        ASSETS.map(async (asset) => {
          try {
            const acc: any = await program.account.asset.fetch(asset.assetPda);
            out[asset.symbol] = {
              priceUsd: acc.priceUsdE8.toNumber() / 1e8,
              updatedAt: acc.priceUpdatedAt.toNumber(),
            };
          } catch {}
        }),
      );
      if (!stop) setPrices(out);
    };
    load();
    const timer = setInterval(load, 15_000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [connection]);

  return prices;
}

/** The current contract fixes the target stock at purchase; VRF decides the win. */
export default function AssetGrid({
  onBought,
}: {
  onBought: (card: LiveCard) => void;
}) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const stocks = ASSETS.filter((asset) => asset.kind === "stock");
  const prices = useAssetPrices();
  const { cardPrice, error: houseError, refresh: refreshHouse } = useHouse();
  const [selectedSymbol, setSelectedSymbol] = useState(stocks[0].symbol);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("ticker");
    if (
      requested &&
      ASSETS.some(
        (asset) => asset.kind === "stock" && asset.symbol === requested,
      )
    )
      setSelectedSymbol(requested);
  }, []);
  const chooseStock = (symbol: string) => {
    setSelectedSymbol(symbol);
    const url = new URL(window.location.href);
    url.searchParams.set("ticker", symbol);
    window.history.replaceState(
      {},
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  };

  const buy = async () => {
    if (busy) return;
    if (!wallet.publicKey) {
      try {
        await wallet.connect();
      } catch {
        setError("Wallet connection was not completed. Try again.");
      }
      return;
    }
    const asset = stocks.find((item) => item.symbol === selectedSymbol)!;
    setBusy(true);
    setError(null);
    try {
      onBought(
        await buyAndDelegate(connection, wallet, asset, wallet.publicKey),
      );
    } catch (e: any) {
      setError(
        e.message?.slice(0, 160) ?? "Could not buy your card. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="scratch-desk surface">
      <div className="desk-config">
        <p className="eyebrow">01 / CHOOSE YOUR TICKER</p>
        <h2>What’s your next stock?</h2>
        <p className="config-description">
          Same price. Same odds. Your choice of prize.
        </p>
        <div
          className="stock-options"
          role="group"
          aria-label="Choose your prize ticker"
        >
          {stocks.map((asset) => (
            <button
              key={asset.symbol}
              className={`stock-option ${selectedSymbol === asset.symbol ? "is-selected" : ""}`}
              onClick={() => chooseStock(asset.symbol)}
              aria-pressed={selectedSymbol === asset.symbol}
              disabled={busy}
            >
              <StockIdentity symbol={asset.symbol} />
              <span className="stock-option-name">
                <strong>{STOCK_NAMES[asset.symbol]}</strong>
                <small>{asset.symbol}</small>
              </span>
              <span className="stock-option-price">
                {prices[asset.symbol] ? (
                  fmtPrice(prices[asset.symbol].priceUsd)
                ) : (
                  <span className="skeleton inline-block h-4 w-16" />
                )}
                <small>reference price</small>
              </span>
              <span className="stock-radio">
                {selectedSymbol === asset.symbol && <Check size={12} />}
              </span>
            </button>
          ))}
        </div>
        <div className="purchase-summary">
          <span>One sealed card</span>
          <strong>
            {cardPrice == null ? "—" : `$${cardPrice.toLocaleString()}`}{" "}
            <small>devnet USDC</small>
          </strong>
        </div>
        {houseError && (
          <p role="alert" className="inline-error">
            {houseError}
            <button onClick={refreshHouse}>Retry</button>
          </p>
        )}
        {error && (
          <p role="alert" className="inline-error">
            {error}
          </p>
        )}
        <button
          onClick={buy}
          disabled={
            busy ||
            wallet.connecting ||
            (!!wallet.publicKey && cardPrice == null)
          }
          aria-busy={busy || wallet.connecting}
          className="button-primary buy-button"
        >
          <Fingerprint size={20} />
          {busy
            ? "Confirming your card…"
            : wallet.connecting
              ? "Connecting…"
              : wallet.publicKey
                ? `Buy ${selectedSymbol} scratcher`
                : "Connect wallet to play"}
          <ArrowUpRight size={19} />
        </button>
        <p className="purchase-caption">
          Includes a small devnet SOL delegation deposit.
          <br />
          Your wallet confirms every transaction.
        </p>
      </div>
      <div className="desk-ticket-panel">
        <div className="desk-ticket-label">
          <span>YOUR NEXT CARD</span>
          <span>
            <span className="status-dot" />
            SEALED
          </span>
        </div>
        <TicketArtwork compact symbol={selectedSymbol} />
        <div className="desk-match-rule">
          <div className="match-example">
            {[0, 1, 2].map((i) => (
              <span key={i}>{selectedSymbol}</span>
            ))}
          </div>
          <strong>Three matching tickers. That’s a win.</strong>
          <p>VRF draws the prize. Scratch to reveal it.</p>
        </div>
        <div className="desk-proof">
          <ShieldCheck size={14} />
          <span>MagicBlock VRF · Public prize table</span>
        </div>
      </div>
      <div className="desk-price-note">
        <span className="status-dot" />
        Keeper reference prices
        {prices[selectedSymbol]
          ? ` · updated ${relativeTime(prices[selectedSymbol].updatedAt)}`
          : " · loading from devnet"}
        <span>
          Reference prices value your token payout. Entry cost stays the same.
        </span>
      </div>
    </div>
  );
}
