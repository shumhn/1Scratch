"use client";

import { useCallback, useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { DecodedCard, formatMultiplier, getErConnection } from "@/lib/program";
import {
  BaseTrace,
  CardReceipt,
  ErTrace,
  findBaseTrace,
  findErTrace,
  verifyCardOutcome,
} from "@/lib/verification";
import { shortAddr } from "@/lib/format";
import { useConnection } from "./Providers";

function erExplorerUrl(signature: string, endpoint?: string): string | null {
  if (!endpoint) return null;
  try {
    const rpc = new URL(endpoint);
    if (rpc.protocol !== "https:" || !rpc.hostname.endsWith(".magicblock.app"))
      return null;
    return `https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=${encodeURIComponent(rpc.toString())}`;
  } catch {
    return null;
  }
}

function SignatureRow({
  label,
  signature,
  base = false,
  erEndpoint,
}: {
  label: string;
  signature?: string;
  base?: boolean;
  erEndpoint?: string;
}) {
  if (!signature) return null;
  const url = base
    ? `https://explorer.solana.com/tx/${signature}?cluster=devnet`
    : erExplorerUrl(signature, erEndpoint);
  return (
    <div className="flex items-center justify-between gap-2 py-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2 font-mono">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline"
          >
            {shortAddr(signature)}
          </a>
        ) : (
          <span title={signature}>{shortAddr(signature)}</span>
        )}
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(signature)}
          className="min-h-10 px-2 text-primary hover:underline"
          aria-label={`Copy ${label} signature`}
        >
          Copy
        </button>
      </span>
    </div>
  );
}

export default function VerificationReceipt({
  card,
  outcome,
  receipt,
  onEndpoint,
}: {
  card: PublicKey;
  outcome: DecodedCard | null;
  receipt: CardReceipt;
  onEndpoint: (endpoint: string) => void;
}) {
  const { connection } = useConnection();
  const [trace, setTrace] = useState<ErTrace>({});
  const [baseTrace, setBaseTrace] = useState<BaseTrace>({});
  const [loading, setLoading] = useState(false);
  const [traceError, setTraceError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const computed = outcome ? verifyCardOutcome(outcome) : null;

  useEffect(() => {
    if (receipt.erEndpoint) return;
    let cancelled = false;
    getErConnection(card)
      .then((er) => {
        if (!cancelled) onEndpoint(er.rpcEndpoint);
      })
      .catch(() => {
        // The router stops exposing a route after settlement. Existing devnet
        // cards in this deployment used the Asia ER, whose history remains readable.
        if (!cancelled && outcome)
          onEndpoint("https://devnet-as.magicblock.app/");
      });
    return () => {
      cancelled = true;
    };
  }, [card, receipt.erEndpoint, onEndpoint, outcome]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setTraceError(null);
    try {
      const [baseResult, erResult] = await Promise.allSettled([
        findBaseTrace(connection, card),
        receipt.erEndpoint
          ? findErTrace(receipt.erEndpoint, card)
          : Promise.resolve({}),
      ]);
      if (baseResult.status === "fulfilled") setBaseTrace(baseResult.value);
      if (erResult.status === "fulfilled") setTrace(erResult.value);
      const errors = [baseResult, erResult].filter(
        (r) => r.status === "rejected",
      );
      if (errors.length)
        setTraceError(
          "Some transaction history could not be read. Try refresh.",
        );
    } catch (e: any) {
      setTraceError(e.message ?? "Could not read transaction history");
    } finally {
      setLoading(false);
    }
  }, [card, connection, receipt.erEndpoint]);

  useEffect(() => {
    if (!outcome) return;
    refresh();
  }, [outcome, receipt.erEndpoint, refresh]);

  return (
    <div className="mt-4 rounded-md border border-border bg-background/60 p-3 text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-10 w-full items-center justify-between font-medium text-muted-foreground"
      >
        <span>Verify this card · MagicBlock VRF</span>
        <span>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          <p className="text-muted-foreground">
            Card <span className="font-mono">{shortAddr(card.toBase58())}</span>{" "}
            · devnet
          </p>
          <p className="text-muted-foreground">
            Base transactions run on Solana; scratch and VRF callback run on
            MagicBlock ER.
          </p>
          {receipt.erEndpoint && (
            <p className="break-all text-muted-foreground">
              ER RPC: {receipt.erEndpoint}
            </p>
          )}
          <div className="border-t border-border pt-2">
            <SignatureRow
              label="Buy + delegate · Solana"
              signature={baseTrace.buySignature ?? receipt.buySignature}
              base
            />
            <SignatureRow
              label="Scratch request · ER"
              signature={trace.scratchSignature ?? receipt.scratchSignature}
              erEndpoint={receipt.erEndpoint}
            />
            <SignatureRow
              label="VRF callback · ER"
              signature={trace.callbackSignature ?? receipt.callbackSignature}
              erEndpoint={receipt.erEndpoint}
            />
            <SignatureRow
              label="Settle · ER"
              signature={
                trace.settlementSignature ?? receipt.settlementSignature
              }
              erEndpoint={receipt.erEndpoint}
            />
            <SignatureRow
              label="Claim · Solana"
              signature={baseTrace.claimSignature ?? receipt.claimSignature}
              base
            />
          </div>
          {outcome && computed && (
            <div className="border-t border-border pt-2">
              <p
                className={computed.matches ? "text-green-400" : "text-red-400"}
              >
                {computed.matches
                  ? "✓ Result matches card randomness + saved prize table"
                  : "✕ Result does not match saved prize table"}
              </p>
              <p className="mt-1 text-muted-foreground">
                Roll {computed.roll.toLocaleString()} /{" "}
                {computed.total.toLocaleString()} →{" "}
                {formatMultiplier(computed.expectedMultiplierBps)} · $
                {(Number(computed.expectedPrizeUsdE6) / 1e6).toLocaleString()}
              </p>
              <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">
                Randomness:{" "}
                {outcome.randomness
                  .map((n) => n.toString(16).padStart(2, "0"))
                  .join("")}
              </p>
            </div>
          )}
          <div className="border-t border-border pt-2 text-muted-foreground">
            {trace.callbackSignature
              ? "✓ Successful VrfCallback transaction found in ER history."
              : loading
                ? "Checking ER transaction history…"
                : "VRF callback transaction not found yet in this ER history."}
            {traceError && <p className="mt-1 text-amber-400">{traceError}</p>}
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="mt-2 text-primary underline disabled:opacity-40"
            >
              Refresh transaction evidence
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            The calculation checks stored randomness against the on-chain card
            table. The callback transaction shows the program accepted a VRF
            response; this view does not independently verify the oracle&apos;s
            cryptographic proof. ER links use this card&apos;s MagicBlock RPC as
            the Explorer custom URL.
          </p>
        </div>
      )}
    </div>
  );
}
