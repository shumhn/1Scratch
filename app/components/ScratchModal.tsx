"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConnection, useWallet } from "./Providers";
import {
  GamePhase,
  LiveCard,
  scratchOnEr,
  settleAndClaim,
  waitForReveal,
} from "@/lib/game";
import { DecodedCard, formatMultiplier, cardStateName } from "@/lib/program";
import { ASSETS } from "@/lib/consts";
import { CardReceipt, readReceipt, writeReceipt } from "@/lib/verification";
import VerificationReceipt from "./VerificationReceipt";
import { StockIdentity } from "./StockIdentity";
import { ShieldCheck, X } from "lucide-react";

const FOIL_W = 400;
const FOIL_H = 360;
const REVEAL_PCT = 0.55;
const CARD_CSS_WIDTH = "100%";

function tierStyle(multiplierBps: number) {
  if (multiplierBps >= 1_000_000)
    return { text: "text-prize-jackpot", glow: "win-glow", label: "JACKPOT" };
  if (multiplierBps >= 100_000)
    return { text: "text-prize-big", glow: "win-glow", label: "BIG WIN" };
  if (multiplierBps >= 20_000)
    return { text: "text-prize-nice", glow: "", label: "NICE HIT" };
  if (multiplierBps >= 10_000)
    return { text: "text-prize-back", glow: "", label: "MONEY BACK" };
  return { text: "text-prize-blank", glow: "", label: "NO MATCH" };
}

export default function ScratchModal({
  live,
  onClose,
  onClaimed,
}: {
  live: LiveCard;
  onClose: () => void;
  onClaimed: () => void;
}) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [phase, setPhase] = useState<GamePhase>(() => {
    const state = live.data ? cardStateName(live.data) : "sealed";
    return state === "revealed"
      ? "revealed"
      : state === "claimed"
        ? "claimed"
        : state === "randomnessRequested"
          ? "awaiting_vrf"
          : "ready";
  });
  const [outcome, setOutcome] = useState<DecodedCard | null>(
    live.data && ["revealed", "claimed"].includes(cardStateName(live.data))
      ? live.data
      : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [failedAction, setFailedAction] = useState<"scratch" | "claim" | null>(
    null,
  );
  const [receipt, setReceipt] = useState<CardReceipt>({});
  const receiptRef = useRef<CardReceipt>({});

  const recordReceipt = useCallback(
    (patch: CardReceipt) => {
      const next = { ...receiptRef.current, ...patch };
      receiptRef.current = next;
      setReceipt(next);
      writeReceipt(live.pubkey, next);
    },
    [live.pubkey],
  );
  const recordErEndpoint = useCallback(
    (endpoint: string) => {
      recordReceipt({ erEndpoint: endpoint });
    },
    [recordReceipt],
  );

  useEffect(() => {
    recordReceipt({
      ...readReceipt(live.pubkey),
      ...(live.buySignature ? { buySignature: live.buySignature } : {}),
    });
  }, [live.pubkey, live.buySignature, recordReceipt]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const firedTx = useRef(false);
  const scratchPct = useRef(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  // ---- foil -------------------------------------------------------------
  useEffect(() => {
    const c = canvasRef.current;
    if (
      !c ||
      (phase !== "ready" &&
        !(
          phase === "awaiting_vrf" &&
          live.data &&
          cardStateName(live.data) === "randomnessRequested"
        ))
    )
      return;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, FOIL_W, FOIL_H);
    // Use the same champagne foil material as the sealed-ticket artwork.
    const palette = getComputedStyle(document.documentElement);
    const goldMid = palette.getPropertyValue("--gold-mid").trim();
    const goldLight = palette.getPropertyValue("--gold-light").trim();
    g.addColorStop(0, `hsl(${goldMid})`);
    g.addColorStop(0.45, `hsl(${goldLight})`);
    g.addColorStop(1, `hsl(${goldMid})`);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FOIL_W, FOIL_H);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = -FOIL_H; i < FOIL_W; i += 14) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + FOIL_H, FOIL_H);
      ctx.stroke();
    }
    ctx.fillStyle = "hsl(40 10% 22%)";
    ctx.font = "500 18px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("A LITTLE LUCK IS UNDER HERE.", FOIL_W / 2, FOIL_H / 2 - 8);
    ctx.font = "500 11px Inter, sans-serif";
    ctx.fillStyle = "hsl(40 5% 30%)";
    ctx.fillText(
      "SCRATCH TO REVEAL YOUR THREE TICKERS",
      FOIL_W / 2,
      FOIL_H / 2 + 18,
    );
  }, [phase]);

  useEffect(() => {
    if (
      phase !== "awaiting_vrf" ||
      !live.data ||
      cardStateName(live.data) !== "randomnessRequested"
    )
      return;
    let cancelled = false;
    waitForReveal(live)
      .then((card) => {
        if (cancelled) return;
        setOutcome(card);
        if (scratchPct.current > REVEAL_PCT) setPhase("revealed");
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message ?? "VRF timed out");
        setFailedAction("scratch");
        setPhase("error");
      });
    return () => {
      cancelled = true;
    };
    // Only the initial recovered pending card needs this poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const measure = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const img = ctx.getImageData(0, 0, FOIL_W, FOIL_H).data;
    let clear = 0;
    const total = FOIL_W * FOIL_H;
    for (let i = 3; i < img.length; i += 4 * 16) if (img[i] < 128) clear++;
    scratchPct.current = clear / (total / 16);
    maybeReveal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome]);

  const maybeReveal = useCallback(() => {
    if (
      scratchPct.current > REVEAL_PCT &&
      outcome &&
      phase === "awaiting_vrf"
    ) {
      setPhase("revealed");
    }
  }, [outcome, phase]);

  const pointerPos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * FOIL_W,
      y: ((e.clientY - rect.top) / rect.height) * FOIL_H,
    };
  };

  const erase = (x: number, y: number) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.fill();
  };

  // ---- game actions -------------------------------------------------------
  const startScratch = async () => {
    if (firedTx.current) return;
    firedTx.current = true;
    try {
      setError(null);
      setFailedAction(null);
      setPhase("scratching");
      const scratch = await scratchOnEr(wallet, live);
      recordReceipt({
        scratchSignature: scratch.signature,
        erEndpoint: scratch.endpoint,
      });
      setPhase("awaiting_vrf");
      const revealed = await waitForReveal(live);
      setOutcome(revealed);
      // If the player already cleared the foil while waiting, reveal now.
      if (scratchPct.current > REVEAL_PCT) setPhase("revealed");
    } catch (e: any) {
      firedTx.current = false;
      setError(e.message?.slice(0, 140) ?? "scratch failed");
      setFailedAction("scratch");
      setPhase("error");
    }
  };

  const claim = async () => {
    try {
      setError(null);
      setFailedAction(null);
      const result = await settleAndClaim(connection, wallet, live, setPhase);
      recordReceipt({
        claimSignature: result.claimSignature,
        ...(result.settlementSignature
          ? { settlementSignature: result.settlementSignature }
          : {}),
        ...(result.endpoint ? { erEndpoint: result.endpoint } : {}),
      });
      onClaimed();
    } catch (e: any) {
      setError(e.message?.slice(0, 140) ?? "claim failed");
      setFailedAction("claim");
      setPhase("error");
    }
  };

  // ---- render -------------------------------------------------------------
  const multiplier = outcome?.multiplierBps ?? null;
  const style = multiplier != null ? tierStyle(multiplier) : null;
  const prizeUsd = outcome ? outcome.prizeUsdE6.toNumber() / 1e6 : null;
  const otherSymbols = ASSETS.filter((a) => a.kind === live.asset.kind)
    .map((a) => a.symbol)
    .filter((s) => s !== live.asset.symbol);
  const symbols = outcome?.multiplierBps
    ? [live.asset.symbol, live.asset.symbol, live.asset.symbol]
    : [
        live.asset.symbol,
        otherSymbols[(outcome?.randomness[4] ?? 0) % otherSymbols.length],
        otherSymbols[(outcome?.randomness[5] ?? 1) % otherSymbols.length],
      ];
  const busy =
    phase === "scratching" || phase === "settling" || phase === "claiming";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
      if (event.key === "Tab") {
        const controls = dialogRef.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), a[href], input:not(:disabled), [tabindex='0']",
        );
        if (!controls?.length) return;
        const first = controls[0],
          last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onClose]);

  const revealWithoutScratching = () => {
    scratchPct.current = 1;
    if (outcome && phase === "awaiting_vrf") setPhase("revealed");
    else if (phase === "ready") startScratch();
  };

  return (
    <div className="scratch-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="scratch-title"
        className={`scratch-modal relative box-border w-full max-w-md max-h-[92dvh] overflow-x-hidden overflow-y-auto border border-border transition-shadow ${
          style?.glow ?? ""
        }`}
      >
        {/* header */}
        <div
          className="mb-4 flex items-center justify-between"
          style={{ width: CARD_CSS_WIDTH }}
        >
          <div>
            <p className="eyebrow mb-2">
              {live.asset.symbol} / CARD #{live.id}
            </p>
            <h2 className="scratch-heading" id="scratch-title">
              {phase === "claimed"
                ? outcome && outcome.multiplierBps > 0
                  ? "All yours."
                  : "Card complete."
                : phase === "revealed"
                  ? "The reveal."
                  : "Your little moment."}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            aria-label="Close scratch card"
            className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        <div
          className="scratch-stage mb-5"
          aria-label={`Card status: ${phase}`}
        >
          <span className="is-complete" />
          <span className={outcome ? "is-complete" : ""} />
          <span className={phase === "claimed" ? "is-complete" : ""} />
        </div>
        {/* card face + foil */}
        <p
          className="mb-3 text-sm text-muted-foreground"
          style={{ width: CARD_CSS_WIDTH }}
        >
          {outcome
            ? `Three ${live.asset.symbol} symbols win. Your result is shown below.`
            : `Scratch the foil to reveal three tickers. Three ${live.asset.symbol} symbols win.`}
        </p>
        <div
          className="scratch-card-face relative overflow-hidden"
          style={{ width: CARD_CSS_WIDTH, aspectRatio: "10 / 9" }}
        >
          {/* prize panel under the foil */}
          <div
            className="scratch-result absolute inset-0 flex flex-col items-center justify-center gap-2 p-5 text-center"
            aria-live="polite"
          >
            {outcome ? (
              <>
                <div
                  className="mb-5 grid w-full grid-cols-3 gap-2"
                  aria-label="Scratch card ticker symbols"
                >
                  {symbols.map((symbol, i) => (
                    <span key={i} className="scratch-symbol">
                      <StockIdentity symbol={symbol} />
                      {symbol}
                    </span>
                  ))}
                </div>
                <div className={`text-xs tracking-widest ${style!.text}`}>
                  {style!.label}
                </div>
                {outcome.multiplierBps > 0 ? (
                  <>
                    <div
                      className={`font-display font-num text-5xl font-semibold tnum ${style!.text}`}
                    >
                      {formatMultiplier(outcome.multiplierBps)}
                    </div>
                    <div className="mt-2 max-w-full text-sm text-muted-foreground">
                      You won{" "}
                      <span className="font-num text-foreground">
                        ${prizeUsd?.toLocaleString()}
                      </span>{" "}
                      worth of devnet {live.asset.symbol} tokens.
                      {phase !== "claimed" &&
                        " Claim to send them to your wallet."}
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className={`font-display text-3xl font-semibold ${style!.text}`}
                    >
                      No prize
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      No three {live.asset.symbol} match this time.
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="vrf-pulse font-mono text-sm text-muted-foreground">
                {phase === "scratching" || phase === "awaiting_vrf"
                  ? "VRF ORACLE DECIDING…"
                  : "?"}
              </div>
            )}
          </div>

          {/* the foil itself */}
          {phase !== "revealed" && phase !== "claimed" && (
            <canvas
              ref={canvasRef}
              width={FOIL_W}
              height={FOIL_H}
              className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                drawing.current = true;
                const p = pointerPos(e);
                erase(p.x, p.y);
                startScratch();
              }}
              onPointerMove={(e) => {
                if (!drawing.current) return;
                const p = pointerPos(e);
                erase(p.x, p.y);
                measure();
              }}
              onPointerUp={() => (drawing.current = false)}
              onPointerCancel={() => (drawing.current = false)}
            />
          )}
        </div>

        {/* footer status / actions */}
        <div className="mt-4" style={{ width: CARD_CSS_WIDTH }}>
          {(phase === "ready" || phase === "awaiting_vrf") && (
            <button
              type="button"
              onClick={revealWithoutScratching}
              className="button-secondary mb-3 w-full text-xs"
            >
              Reveal without scratching
            </button>
          )}
          {error && <div className="text-xs text-red-400">{error}</div>}
          {phase === "error" && failedAction && (
            <button
              onClick={failedAction === "claim" ? claim : startScratch}
              className="mt-2 w-full rounded-md border border-primary py-2 text-sm text-primary"
            >
              {failedAction === "claim" ? "Retry claim" : "Retry VRF request"}
            </button>
          )}
          {phase === "awaiting_vrf" && (
            <div className="text-center text-xs text-muted-foreground">
              Waiting for MagicBlock VRF. Keep scratching…
            </div>
          )}
          {phase === "revealed" && (
            <button onClick={claim} className="button-primary w-full">
              {outcome && outcome.prizeUsdE6.toNumber() > 0
                ? "Claim devnet prize"
                : "Finish card"}
            </button>
          )}
          {(phase === "settling" || phase === "claiming") && (
            <div className="text-center text-xs text-muted-foreground">
              {phase === "settling"
                ? "Settling card back to Solana…"
                : "Paying out your prize…"}
            </div>
          )}
          {phase === "claimed" && (
            <>
              <p
                className={`mb-2 text-center text-sm ${outcome && outcome.prizeUsdE6.toNumber() > 0 ? "text-prize-nice" : "text-muted-foreground"}`}
              >
                {outcome && outcome.prizeUsdE6.toNumber() > 0
                  ? `Devnet ${live.asset.symbol} tokens sent to your wallet.`
                  : "Card finished. No tokens were paid out."}
              </p>
              <button onClick={onClose} className="button-primary w-full">
                Done
              </button>
            </>
          )}
          <p className="mt-4 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
            <ShieldCheck size={13} />
            Result drawn from your card’s saved prize table.
          </p>
          <VerificationReceipt
            card={live.pubkey}
            outcome={outcome}
            receipt={receipt}
            onEndpoint={recordErEndpoint}
          />
        </div>
      </div>
    </div>
  );
}
