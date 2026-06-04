/**
 * useMarginAlert — Reactive margin-below-target alert hook.
 *
 * Watches the "departure-cost-items" React Query cache for the given departure.
 * After any HPP mutation (add, edit, delete, bulk import, template apply) that
 * changes the total HPP, computes margins for each price tier and fires a sonner
 * toast (success / warning / error) accordingly.
 *
 * Does NOT fire on first mount — only when the cached total actually changes.
 *
 * Usage:
 *   useMarginAlert({
 *     departureId, paxCount,
 *     priceQuad, priceTriple, priceDouble, priceSingle,
 *   });
 */

import { useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MarginAlertOptions {
  departureId: string;
  paxCount: number;
  priceQuad?: number;
  priceTriple?: number;
  priceDouble?: number;
  priceSingle?: number;
  /** Target gross-margin %. Default 20. */
  targetPct?: number;
  /** Skip the hook entirely. Default true when departureId is set. */
  enabled?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rp(n: number) {
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMarginAlert({
  departureId,
  paxCount,
  priceQuad = 0,
  priceTriple = 0,
  priceDouble = 0,
  priceSingle = 0,
  targetPct = 20,
  enabled = true,
}: MarginAlertOptions) {
  // Share the same query key as DepartureCostItemsCard so mutations there
  // invalidate this watcher automatically at zero extra cost.
  const { data: items } = useQuery<{ total_cost_idr: number }[]>({
    queryKey: ["departure-cost-items", departureId],
    queryFn: async () => {
      const db = supabase as any;
      const { data, error } = await db
        .from("departure_cost_items")
        .select("total_cost_idr")
        .eq("departure_id", departureId)
        .order("category");
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data || [];
    },
    enabled: enabled && !!departureId,
    // Deliberately no staleTime override — inherits the default so it doesn't
    // cause extra network requests beyond what DepartureCostItemsCard already makes.
  });

  // Track the first-render baseline so we only alert after actual mutations.
  const isFirstLoad = useRef(true);
  const prevTotal = useRef<number | null>(null);

  // Always keep latest config in a ref to avoid stale-closure issues in the effect.
  const configRef = useRef({
    paxCount,
    priceQuad,
    priceTriple,
    priceDouble,
    priceSingle,
    targetPct,
  });
  configRef.current = { paxCount, priceQuad, priceTriple, priceDouble, priceSingle, targetPct };

  useEffect(() => {
    if (!items) return;

    const total = items.reduce(
      (s, i) => s + (Number(i.total_cost_idr) || 0),
      0
    );

    // First load — store baseline, do not alert.
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      prevTotal.current = total;
      return;
    }

    // No change in total HPP — nothing to alert.
    if (prevTotal.current === total) return;
    prevTotal.current = total;

    const { paxCount, priceQuad, priceTriple, priceDouble, priceSingle, targetPct } =
      configRef.current;

    const tiers = [
      { label: "Quad",   price: priceQuad },
      { label: "Triple", price: priceTriple },
      { label: "Double", price: priceDouble },
      { label: "Single", price: priceSingle },
    ].filter((t) => t.price > 0);

    // ── No selling prices configured ──────────────────────────────────────────
    if (tiers.length === 0) {
      toast.info("HPP diperbarui", {
        description: "Belum ada harga jual — buka tab Riwayat Harga untuk cek margin.",
        duration: 4000,
      });
      return;
    }

    // ── No pax yet ────────────────────────────────────────────────────────────
    if (paxCount === 0) {
      toast.info("HPP diperbarui", {
        description: `Total HPP: ${rp(total)}. HPP/pax belum bisa dihitung (0 jamaah).`,
        duration: 4000,
      });
      return;
    }

    // ── Compute margins ───────────────────────────────────────────────────────
    const hppPerPax = total / paxCount;

    const results = tiers.map((t) => {
      const marginPct = ((t.price - hppPerPax) / t.price) * 100;
      const suggestedMin =
        targetPct < 100 ? hppPerPax / (1 - targetPct / 100) : 0;
      return { ...t, marginPct, meetsTarget: marginPct >= targetPct, suggestedMin };
    });

    const bad = results.filter((r) => !r.meetsTarget);
    const ok  = results.filter((r) => r.meetsTarget);
    const hppStr = rp(hppPerPax);

    // ── All tiers meet target ─────────────────────────────────────────────────
    if (bad.length === 0) {
      toast.success(`HPP diperbarui — margin aman ✓`, {
        description: `HPP/pax: ${hppStr}  ·  ${results
          .map((r) => `${r.label}: ${r.marginPct.toFixed(1)}%`)
          .join(" · ")}`,
        duration: 5000,
      });
      return;
    }

    // ── All tiers below target ────────────────────────────────────────────────
    if (ok.length === 0) {
      const worst = bad.reduce((a, b) => (a.marginPct < b.marginPct ? a : b));
      toast.error(`Semua tier di bawah target margin ${targetPct}%`, {
        description:
          `HPP/pax: ${hppStr}  ·  ` +
          bad.map((r) => `${r.label}: ${r.marginPct.toFixed(1)}%`).join(" · ") +
          `  ·  Harga min. ${worst.label}: ${rp(worst.suggestedMin)}`,
        duration: 8000,
      });
      return;
    }

    // ── Mixed: some below, some OK ────────────────────────────────────────────
    toast.warning(`${bad.length} tier di bawah target margin ${targetPct}%`, {
      description:
        `HPP/pax: ${hppStr}  ·  ` +
        `Perlu perhatian: ${bad.map((r) => `${r.label} ${r.marginPct.toFixed(1)}%`).join(", ")}  ·  ` +
        `Aman: ${ok.map((r) => r.label).join(", ")}`,
      duration: 7000,
    });
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps
  // ^ Intentionally only deps on `items`. Prices/paxCount are read from configRef.current
  //   to avoid false alerts when parent re-renders with same data.
}
