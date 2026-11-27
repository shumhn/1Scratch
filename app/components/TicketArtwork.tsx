"use client";

import { ArrowUpRight, Fingerprint } from "lucide-react";
import { useId } from "react";
import { StockIdentity } from "./StockIdentity";

/** Decorative product illustration; never a playable or preselected result. */
export default function TicketArtwork({
  compact = false,
  symbol = "AAPLx",
}: {
  compact?: boolean;
  symbol?: string;
}) {
  const sealId = useId().replace(/:/g, "");
  return (
    <div
      className={`ticket-scene ${compact ? "ticket-scene-compact" : ""}`}
      aria-label="Illustration of a sealed 1Scratch ticket"
      onPointerMove={(event) => {
        if (
          event.pointerType !== "mouse" ||
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        )
          return;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        event.currentTarget.style.setProperty(
          "--ticket-tilt-x",
          `${-y * 5}deg`,
        );
        event.currentTarget.style.setProperty("--ticket-tilt-y", `${x * 7}deg`);
        event.currentTarget.style.setProperty(
          "--ticket-light",
          `${50 + x * 30}%`,
        );
      }}
      onPointerLeave={(event) => {
        event.currentTarget.style.setProperty("--ticket-tilt-x", "0deg");
        event.currentTarget.style.setProperty("--ticket-tilt-y", "0deg");
        event.currentTarget.style.setProperty("--ticket-light", "50%");
      }}
    >
      <div className="ticket-orbit ticket-orbit-one" aria-hidden="true" />
      <div className="ticket-orbit ticket-orbit-two" aria-hidden="true" />
      <div className="ticket-shadow" aria-hidden="true" />
      <div className="art-ticket art-ticket-back" aria-hidden="true" />
      <div className="art-ticket">
        <svg
          className="ticket-security-pattern"
          viewBox="0 0 328 406"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id={sealId}
              width="56"
              height="56"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="28" cy="28" r="27" />
              <circle cx="28" cy="28" r="20" />
              <circle cx="28" cy="28" r="13" />
            </pattern>
          </defs>
          <path fill={`url(#${sealId})`} d="M0 0h328v406H0z" />
        </svg>
        <div className="ticket-topline">
          <span>1SCRATCH / STOCK EDITION</span>
          <ArrowUpRight size={18} />
        </div>
        <div className="ticket-headline">
          <span>A little luck.</span>
          <br />A piece of
          <br />
          the market.
        </div>
        <div className="ticket-foil">
          <div className="foil-positions">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <Fingerprint size={30} strokeWidth={1} />
              </div>
            ))}
          </div>
          <span>SCRATCH. MATCH. OWN.</span>
        </div>
        <div className="ticket-perforation" />
        <div className="ticket-bottom">
          <div className="flex items-center gap-2">
            <StockIdentity symbol={symbol} />
            <span>
              {symbol}
              <small>DEVNET EDITION</small>
            </span>
          </div>
          <span className="ticket-stamp">
            SEALED
            <br />
            <strong>VRF</strong>
          </span>
        </div>
        <span className="ticket-serial">ILLUSTRATION / NO RESULT ASSIGNED</span>
        <div className="ticket-barcode" aria-hidden="true" />
      </div>
      {!compact && (
        <>
          <div className="ticket-floating-tag">
            <span className="status-dot" />
            Powered by MagicBlock VRF
          </div>
          <div className="ticket-edge-label">
            1SCRATCH / THE DEVNET EDITION
          </div>
        </>
      )}
    </div>
  );
}
