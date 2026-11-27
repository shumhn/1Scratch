"use client";

import { ArrowUpRight, ShieldCheck, Sparkle } from "lucide-react";
import { HOUSE } from "@/lib/consts";
import { fmtUSD } from "@/lib/format";
import { useHouse } from "@/lib/house";

export default function PrizeTable() {
  const { tiers, cardPrice, loading, error, refresh } = useHouse();
  const total = tiers.reduce((sum, tier) => sum + tier.weightPpm, 0);
  const highest = tiers.reduce<(typeof tiers)[number] | null>(
    (best, tier) =>
      !best || tier.multiplierBps > best.multiplierBps ? tier : best,
    null,
  );
  const max = highest ? highest.multiplierBps / 10_000 : null;
  const oneIn =
    highest && highest.weightPpm > 0 ? total / highest.weightPpm : null;
  const ratio = (value: number) =>
    value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return (
    <section className="section-block prize-section">
      <div id="odds" className="section-heading scroll-mt-28">
        <div>
          <p className="eyebrow">NO FINE PRINT ON YOUR CHANCES</p>
          <h2>The odds are on the table.</h2>
        </div>
        <a
          className="text-link"
          href={
            "https://explorer.solana.com/address/" + HOUSE + "?cluster=devnet"
          }
          target="_blank"
          rel="noreferrer"
        >
          View on-chain <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </div>
      <div className="prize-showcase">
        <div className="jackpot-poster">
          <div className="jackpot-topline">
            <Sparkle size={19} strokeWidth={1.2} aria-hidden="true" />
            <span>THE RARE ONE</span>
          </div>
          <span className="jackpot-number font-mono tnum">
            {max == null ? "—" : ratio(max)}
            <small>×</small>
          </span>
          <h3>
            A little scratch.
            <br />A big possibility.
          </h3>
          <p>
            {oneIn == null
              ? "Loading on-chain odds…"
              : "1 in " +
                oneIn.toLocaleString("en-US", { maximumFractionDigits: 0 }) +
                " chance per card"}
          </p>
          <div className="jackpot-bottom">
            <span className="status-dot" />
            FROM THE PUBLIC PRIZE TABLE
          </div>
        </div>
        <div className="prize-ledger">
          <div className="prize-ledger-intro">
            <ShieldCheck size={18} aria-hidden="true" />
            <p>
              Every outcome. Out in the open.
              <span>
                MagicBlock VRF draws from the odds saved with your card.
              </span>
            </p>
          </div>
          {error ? (
            <div className="inline-error" role="alert">
              {error}
              <button onClick={refresh}>Try again</button>
            </div>
          ) : loading && !tiers.length ? (
            <div className="prize-loading" aria-label="Loading prize table">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-10 w-full" />
              ))}
            </div>
          ) : (
            <table className="prize-table">
              <caption className="sr-only">
                Public prize tiers, payout values in devnet stock tokens, and
                probability per card
              </caption>
              <thead>
                <tr>
                  <th scope="col">RESULT</th>
                  <th scope="col">TOKEN VALUE</th>
                  <th scope="col">CHANCE</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((tier) => {
                  const multiplier = tier.multiplierBps / 10_000;
                  const chance = total ? (tier.weightPpm / total) * 100 : 0;
                  return (
                    <tr
                      key={tier.multiplierBps}
                      className={multiplier === max ? "is-jackpot" : ""}
                    >
                      <th scope="row">
                        <span className="prize-ratio font-mono tnum">
                          {ratio(multiplier)}
                          <small>×</small>
                        </span>
                        <span className="prize-tier-name">
                          {multiplier === 0
                            ? "No match"
                            : multiplier === 1
                              ? "Money back"
                              : multiplier === max
                                ? "Jackpot"
                                : "Match three"}
                        </span>
                      </th>
                      <td className="font-mono tnum">
                        {cardPrice == null
                          ? "—"
                          : fmtUSD(cardPrice * multiplier, false)}
                      </td>
                      <td className="font-mono tnum">
                        {chance.toLocaleString("en-US", {
                          maximumFractionDigits: 3,
                        })}
                        %
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <p className="prize-footnote">
        1× pays your entry value in devnet stock tokens at the reference price
        when you claim. Transaction costs are separate.
      </p>
    </section>
  );
}
