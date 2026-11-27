"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Fingerprint,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useEffect } from "react";
import TicketArtwork from "@/components/TicketArtwork";
import PrizeTable from "@/components/PrizeTable";
import { useAssetPrices } from "@/components/AssetGrid";
import { StockIdentity, STOCK_NAMES } from "@/components/StockIdentity";
import { useHouse } from "@/lib/house";
import { fmtPrice } from "@/lib/format";

export default function Home() {
  const prices = useAssetPrices();
  const { cardPrice, winChance, maxMultiplier } = useHouse();
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("replay") || url.searchParams.has("replayOwner")) {
      url.searchParams.delete("replay");
      url.searchParams.delete("replayOwner");
      window.history.replaceState(
        {},
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    }
  }, []);
  return (
    <>
      <section className="landing-hero">
        <div className="hero-grid page-container">
          <div className="hero-copy">
            <p className="eyebrow flex items-center gap-2">
              <span className="status-dot" />
              THE MARKET. WITH A LITTLE LUCK.
            </p>
            <h1>
              A little scratch.
              <br />A stock of
              <br />
              <span>your own.</span>
            </h1>
            <p className="hero-description">
              Three matching tickers. One winning moment.
              <br className="hidden sm:block" /> Scratch for a piece of Apple,
              Tesla, or Circle.
            </p>
            <div className="hero-actions">
              <Link href="/play" className="button-primary hero-cta">
                Play a scratcher{" "}
                <span>
                  <ArrowUpRight size={21} />
                </span>
              </Link>
              <a className="text-link" href="#how-it-works">
                How it works <ArrowRight size={16} />
              </a>
            </div>
            <p className="hero-caption">
              <ShieldCheck size={14} aria-hidden="true" />
              MagicBlock VRF <span>·</span> Public odds <span>·</span> Devnet
              edition
            </p>
          </div>
          <TicketArtwork />
        </div>
        <div className="hero-bottom page-container">
          <p>
            NOT ANOTHER SPIN.
            <br />
            <span>A PIECE OF SOMETHING.</span>
          </p>
          <a href="#stocks" className="text-link">
            Explore the tickers <span>↓</span>
          </a>
        </div>
      </section>
      <div className="market-ribbon" id="stocks">
        <div className="page-container ribbon-inner">
          <span className="ribbon-label">
            YOUR NEXT
            <br />
            WIN COULD BE
          </span>
          {Object.keys(STOCK_NAMES).map((symbol) => (
            <Link
              className="ribbon-stock"
              key={symbol}
              href={`/play?ticker=${symbol}`}
              aria-label={`Play for ${STOCK_NAMES[symbol]} ${symbol}`}
            >
              <StockIdentity symbol={symbol} />
              <div>
                <span>
                  {STOCK_NAMES[symbol]} <small>{symbol}</small>
                </span>
                <p>
                  {prices[symbol] ? (
                    fmtPrice(prices[symbol].priceUsd)
                  ) : (
                    <span className="skeleton inline-block h-4 w-16" />
                  )}
                  <small>reference price</small>
                </p>
              </div>
              <ArrowUpRight
                className="ribbon-stock-arrow"
                size={16}
                aria-hidden="true"
              />
            </Link>
          ))}
          <Link
            href="/play"
            className="ribbon-link"
            aria-label="Play a stock scratcher"
          >
            <ArrowUpRight size={22} />
          </Link>
        </div>
      </div>
      <div className="page-container">
        <section className="landing-metrics" aria-label="Game information">
          <div>
            <span>ONE CARD</span>
            <strong>
              {cardPrice == null ? "—" : `$${cardPrice.toLocaleString()}`}
            </strong>
            <p>Entry in devnet USDC</p>
          </div>
          <div>
            <span>MATCH THREE</span>
            <strong>
              {winChance == null ? "—" : `${winChance.toLocaleString()}%`}
            </strong>
            <p>Chance of a winning card</p>
          </div>
          <div>
            <span>MAKE IT A BIG ONE</span>
            <strong>
              {maxMultiplier == null
                ? "—"
                : `${maxMultiplier.toLocaleString()}×`}
            </strong>
            <p>Highest prize in the table</p>
          </div>
        </section>
        <section id="how-it-works" className="section-block scroll-mt-28">
          <div className="section-heading">
            <div>
              <p className="eyebrow">FROM SCRATCH TO STOCK</p>
              <h2>
                A familiar game.
                <br />A different kind of prize.
              </h2>
            </div>
            <p className="section-description">
              The thrill lasts a moment.
              <br />
              The tokens are yours to hold.
            </p>
          </div>
          <div className="how-grid">
            <div className="how-item">
              <span className="step-number">01</span>
              <Fingerprint size={27} aria-hidden="true" />
              <h3>Pick. Scratch. Reveal.</h3>
              <p>
                Choose your ticker and buy a card. Scratch away the foil to
                reveal three symbols.
              </p>
              <div className="rule-tickers" aria-hidden="true">
                {Object.keys(STOCK_NAMES).map((symbol) => (
                  <span key={symbol}>
                    <StockIdentity symbol={symbol} />
                    {symbol}
                  </span>
                ))}
              </div>
            </div>
            <div className="how-item">
              <span className="step-number">02</span>
              <ShieldCheck size={27} aria-hidden="true" />
              <h3>Three of a kind wins.</h3>
              <p>
                MagicBlock VRF draws from the public prize table. Winning cards
                reveal three matching tickers.
              </p>
              <div className="rule-match" aria-label="Example winning pattern">
                <span>AAPLx</span>
                <span>AAPLx</span>
                <span>AAPLx</span>
                <ShieldCheck size={18} />
              </div>
            </div>
            <div className="how-item">
              <span className="step-number">03</span>
              <Wallet size={27} aria-hidden="true" />
              <h3>Your win. Your wallet.</h3>
              <p>
                Claim devnet stock tokens. Hold as their reference value moves,
                or sell to the demo treasury.
              </p>
              <Link className="rule-portfolio-link" href="/play#portfolio">
                Your win belongs in your wallet <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>
        </section>
        <PrizeTable />
        <section className="closing-cta">
          <p className="eyebrow">THREE SYMBOLS. A NEW POSSIBILITY.</p>
          <h2>
            Your next stock
            <br />
            starts with a scratch.
          </h2>
          <Link className="button-primary" href="/play">
            Let’s play <ArrowUpRight size={19} />
          </Link>
          <span>Devnet tokens. No company shares.</span>
        </section>
      </div>
    </>
  );
}
