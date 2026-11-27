"use client";

import { useEffect, useState } from "react";
import { useConnection, useWallet } from "./Providers";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { ASSETS, PrizeAsset } from "@/lib/consts";
import { useAssetPrices } from "./AssetGrid";
import { fmtAmount, fmtPrice, fmtUSD, relativeTime } from "@/lib/format";
import { getSaleQuote, SaleQuote, sellAsset } from "@/lib/sell";
import { ArrowUpRight, Wallet } from "lucide-react";
import ConnectButton from "./ConnectButton";
import { StockIdentity, STOCK_NAMES } from "./StockIdentity";

interface Holding {
  asset: PrizeAsset;
  symbol: string;
  kind: string;
  amount: number;
  valueUsd: number;
}

export default function Portfolio({ refreshKey }: { refreshKey: number }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey } = wallet;
  const prices = useAssetPrices();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [localRefresh, setLocalRefresh] = useState(0);
  const [saleQuote, setSaleQuote] = useState<SaleQuote | null>(null);
  const [saleBusy, setSaleBusy] = useState(false);
  const [saleMessage, setSaleMessage] = useState<string | null>(null);
  useEffect(() => {
    setHoldings([]);
    setLoaded(false);
    setSaleQuote(null);
    setSaleMessage(null);
  }, [publicKey?.toBase58()]);

  useEffect(() => {
    if (!publicKey) {
      setHoldings([]);
      setLoaded(false);
      return;
    }
    let stop = false;
    (async () => {
      const rows: Holding[] = [];
      for (const a of ASSETS) {
        try {
          const ata = getAssociatedTokenAddressSync(a.mint, publicKey);
          const acc = await connection.getTokenAccountBalance(ata);
          const amount = acc.value.uiAmount ?? 0;
          if (amount > 0) {
            const price = prices[a.symbol]?.priceUsd ?? 0;
            rows.push({
              asset: a,
              symbol: a.symbol,
              kind: a.kind,
              amount,
              valueUsd: amount * price,
            });
          }
        } catch {
          /* no ATA yet */
        }
      }
      rows.sort((x, y) => y.valueUsd - x.valueUsd);
      if (!stop) {
        setHoldings(rows);
        setLoaded(true);
      }
    })();
    return () => {
      stop = true;
    };
  }, [connection, publicKey, prices, refreshKey, localRefresh]);

  const previewSale = async (asset: PrizeAsset) => {
    if (!publicKey) return;
    setSaleMessage(null);
    try {
      setSaleQuote(await getSaleQuote(connection, publicKey, asset));
    } catch (e: any) {
      setSaleMessage(e.message ?? "Could not quote sale");
    }
  };

  const confirmSale = async () => {
    if (!saleQuote) return;
    setSaleBusy(true);
    setSaleMessage(null);
    try {
      await sellAsset(connection, wallet, saleQuote);
      setSaleQuote(null);
      setSaleMessage("Sold for devnet USDC. Your balances are updating.");
      setLocalRefresh((n) => n + 1);
    } catch (e: any) {
      setSaleMessage(e.message?.slice(0, 160) ?? "Sale failed");
    } finally {
      setSaleBusy(false);
    }
  };

  const total = holdings.reduce((s, h) => s + h.valueUsd, 0);

  return (
    <section id="portfolio" className="portfolio-section">
      <div className="portfolio-heading">
        <div>
          <p className="eyebrow mb-2">FROM A LITTLE LUCK TO YOUR WALLET</p>
          <h2>Your holdings.</h2>
          <p>Hold your winnings, or sell to the devnet treasury.</p>
        </div>
        <div className="portfolio-total tnum">
          <span>REFERENCE VALUE</span>
          {loaded ? fmtUSD(total) : "—"}
        </div>
      </div>
      {!publicKey ? (
        <div className="surface portfolio-empty">
          <Wallet size={28} strokeWidth={1.2} />
          <h3>Your wins belong here.</h3>
          <p>
            Connect your wallet to see your devnet stock tokens and their
            reference value.
          </p>
          <ConnectButton />
        </div>
      ) : !loaded ? (
        <div className="surface p-6" aria-label="Loading portfolio">
          <div className="skeleton h-12 w-full" />
          <div className="skeleton mt-3 h-12 w-full" />
        </div>
      ) : holdings.length === 0 ? (
        <div className="surface portfolio-empty">
          <Wallet size={28} strokeWidth={1.2} />
          <h3>Your first holding starts with a match.</h3>
          <p>Claim a winning card and your tokens will appear here.</p>
          <a href="#scratch" className="button-secondary">
            Choose a scratcher <ArrowUpRight size={16} />
          </a>
        </div>
      ) : (
        <div className="surface overflow-x-auto">
          <table className="portfolio-table">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Asset</th>
                <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">
                  Price
                </th>
                <th className="px-4 py-2.5 text-right font-medium">Value</th>
                <th className="px-4 py-2.5 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => (
                <tr
                  key={h.symbol}
                  className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/40"
                >
                  <td>
                    <div className="flex items-center gap-3">
                      <StockIdentity symbol={h.symbol} />
                      <span>
                        <strong className="font-medium">
                          {STOCK_NAMES[h.symbol] ?? h.symbol}
                        </strong>
                        <small className="mt-1 block text-muted-foreground">
                          {h.symbol}
                        </small>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono tnum">
                    {fmtAmount(h.amount)}
                  </td>
                  <td className="hidden px-4 py-3 text-right font-mono text-muted-foreground tnum sm:table-cell">
                    {fmtPrice(prices[h.symbol]?.priceUsd ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-primary tnum">
                    {fmtUSD(h.valueUsd)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => previewSale(h.asset)}
                      disabled={saleBusy}
                      className="button-secondary text-xs"
                    >
                      Sell all
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {saleQuote && (
        <div className="mt-3 rounded-lg border border-primary/40 bg-card p-4 text-sm">
          <p className="font-semibold">Sell all {saleQuote.asset.symbol}?</p>
          <p className="mt-1 text-muted-foreground">
            Quote: {fmtUSD(Number(saleQuote.expectedUsdc) / 1e6)} devnet USDC ·
            minimum: {fmtUSD(Number(saleQuote.minUsdcOut) / 1e6)} · price
            updated {relativeTime(saleQuote.priceUpdatedAt)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            This is a devnet demo treasury sale, not a stock-market sale.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={confirmSale}
              disabled={saleBusy}
              className="button-primary"
            >
              {saleBusy ? "Selling…" : "Confirm sell"}
            </button>
            <button
              onClick={() => setSaleQuote(null)}
              disabled={saleBusy}
              className="button-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {saleMessage && (
        <p className="mt-2 text-xs text-muted-foreground">{saleMessage}</p>
      )}
    </section>
  );
}
