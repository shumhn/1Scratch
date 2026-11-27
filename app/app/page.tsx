"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import TicketArtwork from "@/components/TicketArtwork";
import PrizeTable from "@/components/PrizeTable";
import { useAssetPrices } from "@/components/AssetGrid";
import { StockIdentity, STOCK_NAMES } from "@/components/StockIdentity";
import { useHouse } from "@/lib/house";
import { fmtPrice, fmtUSD } from "@/lib/format";

/*
 * LANDING STORYBOARD
 *   0ms  Header, headline and primary CTA stay visible and interactive.
 *  80ms  Product illustration settles into its display.
 * 180ms  Secondary product annotation fades in.
 * Remaining sections stay visible; no scroll-triggered reading delays.
 */
const TIMING = { illustration: 80, annotation: 180 };

export default function Home() {
  const prices = useAssetPrices();
  const { cardPrice, winChance, maxMultiplier } = useHouse();
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("replay") || url.searchParams.has("replayOwner")) {
      url.searchParams.delete("replay");
      url.searchParams.delete("replayOwner");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStage(2);
      return;
    }
    const first = setTimeout(() => setStage(1), TIMING.illustration);
    const second = setTimeout(() => setStage(2), TIMING.annotation);
    return () => {
      clearTimeout(first);
      clearTimeout(second);
    };
  }, []);
  return (
    <div className="studio-home" data-stage={stage}>
      <section className="studio-hero">
        <div className="studio-hero-light" aria-hidden="true" />
        <div className="page-container studio-hero-inner">
          <div className="studio-hero-top">
            <span>THE STOCK SCRATCHER</span>
            <span>
              BUILT ON SOLANA <span className="status-dot" />
            </span>
          </div>
          <div className="studio-hero-layout">
            <div className="studio-hero-copy">
              <p className="studio-kicker">
                <span className="kicker-line" />A LITTLE LUCK. A NEW HOLDING.
              </p>
              <h1>
                Scratch your
                <br />
                <span>next stock.</span>
                <span className="hero-period" aria-hidden="true">
                  ↗
                </span>
              </h1>
              <p className="studio-lede">
                Three matching tickers. One winning moment.
                <br />
                Win devnet stock tokens. Yours to hold or sell.
              </p>
              <div className="studio-actions">
                <Link href="/play" className="studio-cta">
                  <span>Play a stock scratcher</span>
                  <span className="cta-arrow">
                    <ArrowUpRight size={22} aria-hidden="true" />
                  </span>
                </Link>
                <a href="#how-it-works" className="studio-secondary">
                  How it works <ArrowRight size={15} aria-hidden="true" />
                </a>
              </div>
              <div className="hero-entry-note">
                <span className="font-mono tnum">
                  {cardPrice == null ? "—" : fmtUSD(cardPrice)}
                </span>
                <span>per card · devnet USDC</span>
                <span className="hero-note-divider" />
                <ShieldCheck size={14} aria-hidden="true" />
                <span>MagicBlock VRF</span>
              </div>
            </div>
            <div className="studio-hero-art">
              <TicketArtwork />
              <span className="hero-art-index">01 — THE STOCK EDITION</span>
            </div>
          </div>
          <div className="studio-hero-bottom">
            <span>
              <ShieldCheck size={14} aria-hidden="true" />
              PUBLIC ODDS. VERIFIABLE RESULTS.
            </span>
            <a href="#stocks">
              MEET YOUR NEXT TICKER <ArrowDown size={15} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <section
        className="ticker-section page-container"
        id="stocks"
        aria-label="Available stock scratchers"
      >
        <div className="ticker-section-intro">
          <span className="eyebrow">PICK YOUR POSSIBILITY</span>
          <p>
            The ticker is your choice. <br />
            The luck is on-chain.
          </p>
        </div>
        <div className="ticker-list">
          {Object.keys(STOCK_NAMES).map((symbol, index) => (
            <Link
              className="ticker-card"
              key={symbol}
              href={"/play?ticker=" + symbol}
            >
              <div className="ticker-card-top">
                <StockIdentity symbol={symbol} />
                <span className="ticker-ordinal">0{index + 1}</span>
              </div>
              <div className="ticker-card-name">
                <strong>{STOCK_NAMES[symbol]}</strong>
                <span>{symbol}</span>
              </div>
              <div className="ticker-card-bottom">
                <span
                  className="ticker-price font-mono tnum"
                  aria-label={
                    prices[symbol]
                      ? prices[symbol].priceUsd.toLocaleString("en-US", {
                          maximumFractionDigits: 12,
                        }) + " US dollars reference price"
                      : "Loading reference price"
                  }
                >
                  {prices[symbol] ? (
                    fmtPrice(prices[symbol].priceUsd)
                  ) : (
                    <span className="skeleton inline-block h-4 w-20" />
                  )}
                  <small>REFERENCE PRICE</small>
                </span>
                <span className="ticker-open">
                  <ArrowUpRight size={19} aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="page-container">
        <section className="ownership-section">
          <div id="how-it-works" className="ownership-copy scroll-mt-28">
            <p className="eyebrow">FROM SCRATCH TO STOCK</p>
            <h2>
              Three matches.
              <br />
              <span>A new holding.</span>
            </h2>
            <p>
              The reveal is just the beginning. A winning card puts devnet stock
              tokens in your wallet.
            </p>
            <div
              className="ownership-match"
              aria-label="Illustrative winning pattern: three AAPLx tickers"
            >
              {[0, 1, 2].map((i) => (
                <span key={i}>
                  <StockIdentity symbol="AAPLx" />
                  <strong>AAPLx</strong>
                </span>
              ))}
              <span className="match-check">
                <Check size={19} aria-hidden="true" />
              </span>
            </div>
            <small>EXAMPLE WINNING PATTERN</small>
          </div>
          <div className="ownership-steps">
            <div className="ownership-step">
              <span>01</span>
              <div>
                <h3>Pick a stock. Scratch the foil.</h3>
                <p>
                  Choose your ticker, buy a card, and reveal three symbols.
                  Every ticker has the same entry price and odds.
                </p>
              </div>
            </div>
            <div className="ownership-step">
              <span>02</span>
              <div>
                <h3>Match three. Meet your prize.</h3>
                <p>
                  MagicBlock VRF draws from the public prize table. Winning
                  cards reveal three matching tickers.
                </p>
              </div>
            </div>
            <div className="ownership-step">
              <span>03</span>
              <div>
                <h3>Claim it. Keep it. Or sell it.</h3>
                <p>
                  Your prize becomes wallet-held devnet tokens. Even a
                  money-back win has a reference value that can move after you
                  claim.
                </p>
                <Link href="/play#portfolio" className="text-link">
                  Explore your portfolio{" "}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section
          className="studio-stats"
          aria-label="On-chain game information"
        >
          <div>
            <span>CARD ENTRY</span>
            <strong className="font-mono tnum">
              {cardPrice == null ? "—" : fmtUSD(cardPrice)}
            </strong>
            <p>Paid in devnet USDC</p>
          </div>
          <div>
            <span>MATCH-THREE CHANCE</span>
            <strong className="font-mono tnum">
              {winChance == null
                ? "—"
                : winChance.toLocaleString("en-US", {
                    maximumFractionDigits: 2,
                  }) + "%"}
            </strong>
            <p>Includes money-back wins</p>
          </div>
          <div>
            <span>THE HIGHEST TIER</span>
            <strong className="font-mono tnum">
              {maxMultiplier == null
                ? "—"
                : maxMultiplier.toLocaleString("en-US") + "×"}
            </strong>
            <p>A rare possibility, on every card</p>
          </div>
          <Link href="/play" className="stats-link">
            <span>
              YOUR NEXT
              <br />
              STOCK STARTS HERE
            </span>
            <ArrowUpRight size={26} aria-hidden="true" />
          </Link>
        </section>

        <PrizeTable />

        <section className="trust-strip">
          <ShieldCheck size={22} strokeWidth={1.3} aria-hidden="true" />
          <div>
            <h3>Luck you can look into.</h3>
            <p>
              MagicBlock VRF draws the prize. Ephemeral Rollups run the scratch.
              Solana records your token payout.
            </p>
          </div>
          <a
            className="text-link"
            href="https://github.com/shumhn/1Scratch/blob/main/docs/INTEGRATION.md"
            target="_blank"
            rel="noreferrer"
          >
            Follow the transactions{" "}
            <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </section>

        <section className="studio-closing">
          <span className="eyebrow">ONE CARD. A NEW POSSIBILITY.</span>
          <h2>
            A little luck
            <br />
            looks good on you.
          </h2>
          <Link href="/play" className="studio-cta">
            <span>Find your next stock</span>
            <span className="cta-arrow">
              <ArrowUpRight size={22} aria-hidden="true" />
            </span>
          </Link>
          <p>Devnet edition · Tokens are not company shares.</p>
        </section>
      </div>
    </div>
  );
}
