"use client";

import { useCallback, useEffect, useState } from "react";
import { HOUSE } from "./consts";
import { getProgram } from "./program";
import { useConnection } from "@/components/Providers";

export interface PrizeTier {
  multiplierBps: number;
  weightPpm: number;
}

export function useHouse() {
  const { connection } = useConnection();
  const [tiers, setTiers] = useState<PrizeTier[]>([]);
  const [cardPrice, setCardPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const house: any =
        await getProgram(connection).account.house.fetch(HOUSE);
      setTiers(
        house.tiers.slice(0, house.tierCount).map((t: PrizeTier) => ({
          multiplierBps: t.multiplierBps,
          weightPpm: t.weightPpm,
        })),
      );
      setCardPrice(house.cardPriceUsdc.toNumber() / 1e6);
    } catch {
      setError("Prize odds could not be loaded from devnet.");
    } finally {
      setLoading(false);
    }
  }, [connection]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const total = tiers.reduce((n, tier) => n + tier.weightPpm, 0);
  const winChance = total
    ? (tiers
        .filter((t) => t.multiplierBps > 0)
        .reduce((n, t) => n + t.weightPpm, 0) /
        total) *
      100
    : null;
  const maxMultiplier = tiers.length
    ? Math.max(...tiers.map((t) => t.multiplierBps)) / 10_000
    : null;
  return {
    tiers,
    cardPrice,
    winChance,
    maxMultiplier,
    loading,
    error,
    refresh,
  };
}
