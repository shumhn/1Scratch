"use client";

import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { HOUSE } from "@/lib/consts";
import { fmtUSD } from "@/lib/format";
import { useHouse } from "@/lib/house";

export default function PrizeTable() {
  const { tiers, cardPrice, loading, error, refresh } = useHouse();
  const total = tiers.reduce((sum, tier) => sum + tier.weightPpm, 0);
  return (
    <section id="odds" className="section-block scroll-mt-28">
      <div className="section-heading">
        <div>
          <p className="eyebrow">THE ODDS, OUT IN THE OPEN</p>
          <h2>Every possibility. Before you play.</h2>
        </div>
        <a
          className="text-link"
          href={`https://explorer.solana.com/address/${HOUSE}?cluster=devnet`}
          target="_blank"
          rel="noreferrer"
        >
          On-chain table <ArrowUpRight size={15} />
        </a>
      </div>
      <div className="surface odds-panel">
        <div className="odds-intro">
          <ShieldCheck size={20} className="text-primary" aria-hidden="true" />
          <p>
            MagicBlock VRF draws each result from this prize table.
            <span>Your card saves these odds when you buy.</span>
          </p>
        </div>
        {loading && !tiers.length ? (
          <div className="odds-grid" aria-label="Loading prize table">
            {Array.from({ length: 7 }, (_, i) => (
              <div className="odds-cell" key={i}>
                <div className="skeleton h-8 w-16" />
                <div className="skeleton mt-4 h-3 w-20" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="inline-error" role="alert">
            {error}
            <button onClick={refresh}>Try again</button>
          </div>
        ) : (
          <div className="odds-grid">
            {tiers.map((tier, i) => {
              const multiplier = tier.multiplierBps / 10_000;
              const chance = total ? (tier.weightPpm / total) * 100 : 0;
              return (
                <div
                  key={i}
                  className={`odds-cell ${multiplier >= 1000 ? "odds-jackpot" : ""}`}
                >
                  <span className="odds-label">
                    {multiplier === 0
                      ? "NO MATCH"
                      : multiplier === 1
                        ? "MONEY BACK"
                        : multiplier >= 1000
                          ? "THE JACKPOT"
                          : "MATCH THREE"}
                  </span>
                  <p className="odds-multiplier">
                    {multiplier.toLocaleString()}
                    <span>×</span>
                  </p>
                  <p className="odds-value">
                    {cardPrice == null ? "—" : fmtUSD(cardPrice * multiplier)}{" "}
                    in tokens
                  </p>
                  <div className="odds-track" aria-hidden="true">
                    <span style={{ width: `${Math.max(2, chance)}%` }} />
                  </div>
                  <p className="odds-chance">
                    {chance.toLocaleString(undefined, {
                      maximumFractionDigits: 3,
                    })}
                    % <span>chance</span>
                  </p>
                </div>
              );
            })}
          </div>
        )}
        <div className="odds-footnote">
          1× pays your entry value in devnet stock tokens. The token amount is
          calculated at the reference price when you claim.
        </div>
      </div>
    </section>
  );
}
