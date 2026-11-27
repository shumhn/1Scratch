"use client";

import { useEffect, useState } from "react";
import { ArrowRight, RotateCcw, ShieldCheck } from "lucide-react";
import AssetGrid from "@/components/AssetGrid";
import Portfolio from "@/components/Portfolio";
import ScratchModal from "@/components/ScratchModal";
import PrizeTable from "@/components/PrizeTable";
import { useConnection, useWallet } from "@/components/Providers";
import { LiveCard, loadCard } from "@/lib/game";
import { useHouse } from "@/lib/house";
import { fmtUSD } from "@/lib/format";

export default function Play() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { cardPrice, winChance, maxMultiplier } = useHouse();
  const [liveCard, setLiveCard] = useState<LiveCard | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [resumeId, setResumeId] = useState("");
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resuming, setResuming] = useState(false);
  useEffect(() => {
    setLiveCard(null);
  }, [publicKey?.toBase58()]);
  return (
    <div className="page-container play-page">
      <div className="play-heading">
        <div>
          <p className="eyebrow">THE SCRATCH DESK</p>
          <h1>Find your next stock.</h1>
          <p>Choose a ticker. Reveal three symbols. Claim what’s yours.</p>
        </div>
        <span className="network-status">
          <span className="status-dot" />
          SOLANA DEVNET
        </span>
      </div>
      <div className="desk-metrics">
        <div>
          <span>Card entry</span>
          <strong>
            {cardPrice == null ? "—" : fmtUSD(cardPrice)}{" "}
            <small>devnet USDC</small>
          </strong>
        </div>
        <div>
          <span>Match-three chance</span>
          <strong>
            {winChance == null ? "—" : `${winChance.toLocaleString()}%`}
          </strong>
        </div>
        <div>
          <span>Maximum multiplier</span>
          <strong>
            {maxMultiplier == null ? "—" : `${maxMultiplier.toLocaleString()}×`}
          </strong>
        </div>
        <a href="#odds">
          <ShieldCheck size={22} />
          <span>
            Public odds.
            <br />
            <strong>Verifiable results.</strong>
          </span>
          <ArrowRight size={18} />
        </a>
      </div>
      <section id="scratch" className="scroll-mt-28">
        <div className="desk-workflow" aria-label="How to play">
          <span className="is-current">
            <b>01</b>Select your ticker
          </span>
          <span>
            <b>02</b>Scratch your card
          </span>
          <span>
            <b>03</b>Claim your tokens
          </span>
        </div>
        <AssetGrid onBought={setLiveCard} />
      </section>
      <details className="resume-panel">
        <summary>
          <RotateCcw size={14} />
          Already have a card? Resume it here.
        </summary>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!publicKey) return;
            setResumeError(null);
            setResuming(true);
            try {
              setLiveCard(
                await loadCard(connection, publicKey, Number(resumeId)),
              );
            } catch (error: any) {
              setResumeError(error.message ?? "Could not load card");
            } finally {
              setResuming(false);
            }
          }}
        >
          <label htmlFor="resume-card">Card number</label>
          <input
            id="resume-card"
            type="number"
            inputMode="numeric"
            min="0"
            required
            value={resumeId}
            onChange={(e) => setResumeId(e.target.value)}
            placeholder="e.g. 15"
          />
          <button
            className="button-secondary"
            disabled={!publicKey || resuming}
          >
            {resuming ? "Opening…" : "Open card"}
            <ArrowRight size={15} />
          </button>
          {!publicKey && <span>Connect the wallet that bought this card.</span>}
          {resumeError && (
            <p className="text-red-400" role="alert">
              {resumeError}
            </p>
          )}
        </form>
      </details>
      <Portfolio refreshKey={refreshKey} />
      <PrizeTable />
      {liveCard && (
        <ScratchModal
          key={liveCard.pubkey.toBase58()}
          live={liveCard}
          onClose={() => setLiveCard(null)}
          onClaimed={() => setRefreshKey((n) => n + 1)}
        />
      )}
    </div>
  );
}
