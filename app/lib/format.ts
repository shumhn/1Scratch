// Number / address formatting. Consistent precision across the app.

const SUBS = ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"];

/** USD price with sensible precision; tiny prices get crypto subscript zeros ($0.0₅2). */
export function fmtPrice(n: number): string {
  if (n <= 0) return "$0";
  if (n >= 1)
    return `$${n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  // count leading zeros after the decimal point
  const s = n.toFixed(20);
  const frac = s.split(".")[1];
  let zeros = 0;
  while (frac[zeros] === "0") zeros++;
  if (zeros < 2) return `$${n.toFixed(6)}`;
  const sig = frac.slice(zeros, zeros + 4).replace(/0+$/, "");
  const sub = String(zeros)
    .split("")
    .map((d) => SUBS[Number(d)])
    .join("");
  return `$0.0${sub}${sig}`;
}

export function fmtUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return fmtPrice(n);
}

/** Token amounts — compact for huge memecoin wins, precise for small ones. */
export function fmtAmount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}k`;
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return n.toLocaleString(undefined, { maximumSignificantDigits: 4 });
}

/** ppm weight → percentage label, e.g. 3_000_000 → "30%", 9_900 → "0.099%". */
export function fmtChance(ppm: number): string {
  const pct = ppm / 100_000;
  return `${pct >= 1 ? pct.toFixed(0) : pct >= 0.1 ? pct.toFixed(1) : pct.toFixed(3)}%`;
}

export function shortAddr(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : addr;
}

export function relativeTime(unixSecs: number): string {
  if (!unixSecs) return "never";
  const diff = Math.floor(Date.now() / 1000) - unixSecs;
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function explorerAccount(addr: string): string {
  return `https://explorer.solana.com/address/${addr}?cluster=devnet`;
}
