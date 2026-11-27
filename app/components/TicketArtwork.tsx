"use client";

import {
  ArrowUpRight,
  Fingerprint,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useId } from "react";
import { StockIdentity } from "./StockIdentity";

/** Product illustration only. A card's result is assigned after purchase by VRF. */
export default function TicketArtwork({
  compact = false,
  symbol = "AAPLx",
}: {
  compact?: boolean;
  symbol?: string;
}) {
  const patternId = "engraving-" + useId().replace(/:/g, "");
  return (
    <div
      className={"edition-scene" + (compact ? " edition-scene-compact" : "")}
      role="img"
      aria-label={
        "Illustration of a sealed " +
        symbol +
        " stock scratcher; no result assigned"
      }
      onPointerMove={(event) => {
        if (
          event.pointerType !== "mouse" ||
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        )
          return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        event.currentTarget.style.setProperty("--tilt-x", -y * 7 + "deg");
        event.currentTarget.style.setProperty("--tilt-y", x * 9 + "deg");
        event.currentTarget.style.setProperty(
          "--foil-light",
          50 + x * 45 + "%",
        );
      }}
      onPointerLeave={(event) => {
        event.currentTarget.style.setProperty("--tilt-x", "0deg");
        event.currentTarget.style.setProperty("--tilt-y", "0deg");
        event.currentTarget.style.setProperty("--foil-light", "50%");
      }}
    >
      <div className="edition-halo" aria-hidden="true" />
      <div className="edition-floor" aria-hidden="true" />
      <div className="edition-stack">
        <div className="edition-card edition-card-back" aria-hidden="true">
          <span>1SCRATCH</span>
        </div>
        <div className="edition-card edition-card-main" aria-hidden="true">
          <svg className="edition-engraving" viewBox="0 0 480 340">
            <defs>
              <pattern
                id={patternId}
                width="80"
                height="80"
                patternUnits="userSpaceOnUse"
              >
                {[14, 23, 32, 39].map((r) => (
                  <circle key={r} cx="40" cy="40" r={r} />
                ))}
              </pattern>
            </defs>
            <path fill={"url(#" + patternId + ")"} d="M0 0h480v340H0z" />
          </svg>
          <div className="edition-topline">
            <span className="edition-wordmark">1scratch</span>
            <span>
              THE STOCK EDITION <ArrowUpRight size={14} />
            </span>
          </div>
          <div className="edition-card-title">
            A little scratch.
            <br />
            <span>A new holding.</span>
          </div>
          <div className="edition-seal">
            <span>MATCH</span>
            <strong>3</strong>
            <span>TO WIN</span>
          </div>
          <div className="edition-foil">
            <span className="edition-foil-label">
              YOUR NEXT POSSIBILITY IS UNDER HERE
            </span>
            <div className="edition-positions">
              {[0, 1, 2].map((i) => (
                <span key={i}>
                  <Fingerprint size={30} strokeWidth={1.1} />
                </span>
              ))}
            </div>
            <div className="edition-foil-footer">
              <span>SCRATCH. MATCH. OWN.</span>
              <LockKeyhole size={11} />
            </div>
          </div>
          <div className="edition-perforation" />
          <div className="edition-bottom">
            <span className="edition-asset">
              <StockIdentity symbol={symbol} />
              <strong>{symbol}</strong>
              <span>DEVNET</span>
            </span>
            <div className="edition-barcode" />
          </div>
        </div>
      </div>
      <span className="edition-annotation">
        <span />
        SEALED TICKET · ILLUSTRATION
      </span>
      {!compact && (
        <div className="edition-proof">
          <ShieldCheck size={16} />
          <span>
            Luck, with a receipt.<small>RANDOMNESS BY MAGICBLOCK</small>
          </span>
        </div>
      )}
    </div>
  );
}
