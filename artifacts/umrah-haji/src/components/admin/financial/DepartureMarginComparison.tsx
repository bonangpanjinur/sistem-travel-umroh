/**
 * DepartureMarginComparison — Side-by-side margin comparison for all departures
 * in a package. Fetches HPP totals in one bulk query, then computes margin per
 * room tier for each departure.
 *
 * Placed inside PackageFinancialSection as a "Perbandingan Margin" tab.
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  ArrowUpDown,
  AlertTriangle,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DepartureForComparison {
  id: string;
  departure_date: string | null;
  return_date: string | null;
  status: string;
  quota: number;
  price_quad: number | null;
  price_triple: number | null;
  price_double: number | null;
  price_single: number | null;
  bookings?: { booking_status: string; total_pax: number }[];
}

interface Props {
  departures: DepartureForComparison[];
}

type SortKey = "date" | "margin" | "hpp";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtShortDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

function fmtRp(n: number) {
  if (n >= 1_000_000_000)
    return `${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000)
    return `${(n / 1_000).toFixed(0)}rb`;
  return `${n}`;
}

function fmtRpFull(n: number) {
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

const STATUS_COLOR: Record<string, string> = {
  open: "bg-emerald-100 text-emerald-700",
  full: "bg-orange-100 text-orange-700",
  closed: "bg-slate-100 text-slate-600",
  departed: "bg-blue-100 text-blue-700",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  full: "Full",
  closed: "Closed",
  departed: "Berangkat",
};

// ── MarginCell — one cell for a single tier of a single departure ──────────────

interface MarginCellProps {
  price: number | null;
  hppPerPax: number;
  targetMargin: number;
  loading: boolean;
}

function MarginCell({ price, hppPerPax, targetMargin, loading }: MarginCellProps) {
  if (loading) return <Skeleton className="h-5 w-14 mx-auto" />;
  if (!price || price === 0)
    return <span className="text-muted-foreground/50 text-xs">—</span>;
  if (hppPerPax === 0)
    return (
      <span className="text-muted-foreground text-xs">no HPP</span>
    );

  const grossMargin = price - hppPerPax;
  const marginPct = (grossMargin / price) * 100;
  const meetsTarget = marginPct >= targetMargin;
  const closeToTarget = !meetsTarget && marginPct >= targetMargin - 5;

  const color = meetsTarget
    ? "text-emerald-600"
    : closeToTarget
    ? "text-amber-600"
    : "text-red-600";

  const Icon = meetsTarget
    ? TrendingUp
    : closeToTarget
    ? Minus
    : TrendingDown;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center justify-center gap-0.5 cursor-default", color)}>
            <Icon className="h-3 w-3" />
            <span className="text-xs font-semibold tabular-nums">
              {marginPct.toFixed(1)}%
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="space-y-0.5">
            <p>Harga jual: {fmtRpFull(price)}</p>
            <p>HPP/pax: {fmtRpFull(hppPerPax)}</p>
            <p>Laba kotor: {fmtRpFull(grossMargin)}</p>
            <p className="font-semibold">Margin: {marginPct.toFixed(1)}%</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DepartureMarginComparison({ departures }: Props) {
  const [targetMargin, setTargetMargin] = useState(20);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(true);

  const depIds = departures.map((d) => d.id);

  // Bulk HPP fetch — one query for all departures
  const { data: hppRows, isLoading: hppLoading } = useQuery<
    { departure_id: string; total_cost_idr: number }[]
  >({
    queryKey: ["hpp-bulk", depIds.join(",")],
    queryFn: async () => {
      if (depIds.length === 0) return [];
      const db = supabase as any;
      const { data, error } = await db
        .from("departure_cost_items")
        .select("departure_id, total_cost_idr")
        .in("departure_id", depIds);
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data || [];
    },
    enabled: depIds.length > 0,
    staleTime: 60_000,
  });

  // HPP totals by departure_id
  const hppByDep = useMemo(() => {
    const m: Record<string, number> = {};
    if (!hppRows) return m;
    for (const row of hppRows) {
      m[row.departure_id] =
        (m[row.departure_id] || 0) + (Number(row.total_cost_idr) || 0);
    }
    return m;
  }, [hppRows]);

  // Enrich departures with computed data
  const rows = useMemo(() => {
    return departures.map((dep) => {
      const paxCount =
        dep.bookings
          ?.filter((b) =>
            ["confirmed", "completed"].includes(b.booking_status)
          )
          .reduce((s, b) => s + (b.total_pax || 0), 0) ?? 0;

      const totalHPP = hppByDep[dep.id] ?? null; // null = not yet loaded or no items
      const hppPerPax =
        totalHPP != null && paxCount > 0
          ? totalHPP / paxCount
          : null;

      const tiers = [
        { key: "quad",   label: "Quad",   price: dep.price_quad },
        { key: "triple", label: "Triple", price: dep.price_triple },
        { key: "double", label: "Double", price: dep.price_double },
        { key: "single", label: "Single", price: dep.price_single },
      ] as const;

      // Best margin across tiers (for ranking)
      let bestMargin = -Infinity;
      let bestTier: string | null = null;

      if (hppPerPax != null) {
        for (const t of tiers) {
          if (!t.price || t.price === 0) continue;
          const m = ((t.price - hppPerPax) / t.price) * 100;
          if (m > bestMargin) {
            bestMargin = m;
            bestTier = t.label;
          }
        }
      }

      return {
        dep,
        paxCount,
        totalHPP,
        hppPerPax,
        tiers,
        bestMargin: bestMargin === -Infinity ? null : bestMargin,
        bestTier,
        hasHPP: totalHPP != null && totalHPP > 0,
        hasPrices: tiers.some((t) => t.price && t.price > 0),
      };
    });
  }, [departures, hppByDep]);

  // Sort rows
  const sortedRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      if (sortKey === "date") {
        const da = a.dep.departure_date ?? "";
        const db = b.dep.departure_date ?? "";
        return sortAsc ? da.localeCompare(db) : db.localeCompare(da);
      }
      if (sortKey === "margin") {
        const ma = a.bestMargin ?? -Infinity;
        const mb = b.bestMargin ?? -Infinity;
        return sortAsc ? ma - mb : mb - ma;
      }
      if (sortKey === "hpp") {
        const ha = a.hppPerPax ?? -1;
        const hb = b.hppPerPax ?? -1;
        return sortAsc ? ha - hb : hb - ha;
      }
      return 0;
    });
    return sorted;
  }, [rows, sortKey, sortAsc]);

  // Find the overall best departure (highest best margin)
  const bestDepId = useMemo(() => {
    let best: string | null = null;
    let bestM = -Infinity;
    for (const r of rows) {
      if (r.bestMargin != null && r.bestMargin > bestM) {
        bestM = r.bestMargin;
        best = r.dep.id;
      }
    }
    return best;
  }, [rows]);

  // Average margin per tier across all departures (where data exists)
  const avgMargins = useMemo(() => {
    const tks = ["quad", "triple", "double", "single"] as const;
    const result: Record<string, number | null> = {};
    for (const tk of tks) {
      const vals: number[] = [];
      for (const r of rows) {
        const price = r.dep[`price_${tk}` as keyof typeof r.dep] as number | null;
        if (!price || price === 0 || r.hppPerPax == null) continue;
        vals.push(((price - r.hppPerPax) / price) * 100);
      }
      result[tk] = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
    }
    return result;
  }, [rows]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "date");
    }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k)
      return <ArrowUpDown className="h-3 w-3 opacity-40 ml-0.5 inline" />;
    return (
      <span className="ml-0.5 text-primary">
        {sortAsc ? "↑" : "↓"}
      </span>
    );
  }

  if (departures.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p>Belum ada keberangkatan untuk dibandingkan.</p>
      </div>
    );
  }

  const tierKeys = ["quad", "triple", "double", "single"] as const;
  const tierLabels = { quad: "Quad", triple: "Triple", double: "Double", single: "Single" };

  // Check which tiers have any price set across all departures
  const activeTiers = tierKeys.filter((tk) =>
    departures.some((d) => {
      const p = d[`price_${tk}` as keyof DepartureForComparison] as number | null;
      return p && p > 0;
    })
  );

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Target Margin</span>
          <div className="relative">
            <Input
              type="number"
              min={0}
              max={99}
              step={1}
              value={targetMargin}
              onChange={(e) =>
                setTargetMargin(
                  Math.min(99, Math.max(0, Number(e.target.value)))
                )
              }
              className="h-7 w-16 text-xs text-center pr-5"
            />
            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
              %
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-emerald-500" />≥{targetMargin}%
          </span>
          <span className="flex items-center gap-1">
            <Minus className="h-3 w-3 text-amber-500" />{targetMargin - 5}–{targetMargin}%
          </span>
          <span className="flex items-center gap-1">
            <TrendingDown className="h-3 w-3 text-red-500" />&lt;{targetMargin - 5}%
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left px-3 py-2.5 font-semibold text-xs text-muted-foreground w-6">#</th>
              <th className="text-left px-3 py-2.5 font-semibold text-xs text-muted-foreground">
                <button
                  onClick={() => toggleSort("date")}
                  className="flex items-center gap-0.5 hover:text-foreground transition-colors"
                >
                  Keberangkatan <SortIcon k="date" />
                </button>
              </th>
              <th className="text-center px-2 py-2.5 font-semibold text-xs text-muted-foreground">Status</th>
              <th className="text-center px-2 py-2.5 font-semibold text-xs text-muted-foreground">Jamaah</th>
              <th className="text-right px-3 py-2.5 font-semibold text-xs text-muted-foreground">
                <button
                  onClick={() => toggleSort("hpp")}
                  className="flex items-center gap-0.5 ml-auto hover:text-foreground transition-colors"
                >
                  HPP/Pax <SortIcon k="hpp" />
                </button>
              </th>
              {activeTiers.map((tk) => (
                <th
                  key={tk}
                  className="text-center px-2 py-2.5 font-semibold text-xs text-muted-foreground"
                >
                  {tierLabels[tk]}
                </th>
              ))}
              <th className="text-center px-2 py-2.5 font-semibold text-xs text-muted-foreground">
                <button
                  onClick={() => toggleSort("margin")}
                  className="flex items-center gap-0.5 hover:text-foreground transition-colors"
                >
                  Best <SortIcon k="margin" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedRows.map((row, idx) => {
              const isFirst = row.dep.id === bestDepId;
              return (
                <tr
                  key={row.dep.id}
                  className={cn(
                    "transition-colors hover:bg-muted/30",
                    isFirst && "bg-emerald-50/60"
                  )}
                >
                  {/* Rank */}
                  <td className="px-3 py-2.5 text-center">
                    {isFirst ? (
                      <Trophy className="h-3.5 w-3.5 text-amber-500 inline" />
                    ) : (
                      <span className="text-xs text-muted-foreground">{idx + 1}</span>
                    )}
                  </td>

                  {/* Departure date */}
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-xs whitespace-nowrap">
                        {fmtShortDate(row.dep.departure_date)}
                      </span>
                      {row.dep.return_date && (
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          s/d {fmtShortDate(row.dep.return_date)}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-2 py-2.5 text-center">
                    <span
                      className={cn(
                        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
                        STATUS_COLOR[row.dep.status] ?? "bg-slate-100 text-slate-600"
                      )}
                    >
                      {STATUS_LABEL[row.dep.status] ?? row.dep.status}
                    </span>
                  </td>

                  {/* Jamaah */}
                  <td className="px-2 py-2.5 text-center">
                    <div className="text-xs">
                      <span className="font-semibold">{row.paxCount}</span>
                      <span className="text-muted-foreground">/{row.dep.quota}</span>
                    </div>
                  </td>

                  {/* HPP per pax */}
                  <td className="px-3 py-2.5 text-right">
                    {hppLoading ? (
                      <Skeleton className="h-4 w-16 ml-auto" />
                    ) : row.hppPerPax == null ? (
                      <span className="text-[11px] text-muted-foreground">
                        {row.paxCount === 0 ? "0 pax" : "no HPP"}
                      </span>
                    ) : (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs font-semibold cursor-default">
                              {fmtRp(row.hppPerPax)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <p>Total HPP: {fmtRpFull(row.totalHPP ?? 0)}</p>
                            <p>Dibagi {row.paxCount} jamaah</p>
                            <p className="font-semibold">
                              HPP/pax: {fmtRpFull(row.hppPerPax)}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </td>

                  {/* Margin per tier */}
                  {activeTiers.map((tk) => (
                    <td key={tk} className="px-2 py-2.5 text-center">
                      <MarginCell
                        price={
                          row.dep[
                            `price_${tk}` as keyof DepartureForComparison
                          ] as number | null
                        }
                        hppPerPax={row.hppPerPax ?? 0}
                        targetMargin={targetMargin}
                        loading={hppLoading}
                      />
                    </td>
                  ))}

                  {/* Best tier + margin */}
                  <td className="px-2 py-2.5 text-center">
                    {hppLoading ? (
                      <Skeleton className="h-4 w-12 mx-auto" />
                    ) : row.bestMargin != null && row.bestTier ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span
                          className={cn(
                            "text-xs font-bold",
                            row.bestMargin >= targetMargin
                              ? "text-emerald-600"
                              : row.bestMargin >= targetMargin - 5
                              ? "text-amber-600"
                              : "text-red-600"
                          )}
                        >
                          {row.bestMargin.toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {row.bestTier}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Average footer row */}
          {activeTiers.length > 0 && (
            <tfoot>
              <tr className="border-t bg-muted/30">
                <td colSpan={5} className="px-3 py-2 text-right text-[11px] font-semibold text-muted-foreground">
                  Rata-rata margin:
                </td>
                {activeTiers.map((tk) => {
                  const avg = avgMargins[tk];
                  return (
                    <td key={tk} className="px-2 py-2 text-center">
                      {avg != null ? (
                        <span
                          className={cn(
                            "text-xs font-bold",
                            avg >= targetMargin
                              ? "text-emerald-600"
                              : avg >= targetMargin - 5
                              ? "text-amber-600"
                              : "text-red-600"
                          )}
                        >
                          {avg.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  );
                })}
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Caption */}
      <p className="text-[11px] text-muted-foreground">
        <Trophy className="h-3 w-3 text-amber-500 inline mr-0.5" /> = keberangkatan dengan margin terbaik.
        Margin dihitung dari HPP per pax (total HPP ÷ jumlah jamaah confirmed/completed).
        Klik header kolom untuk mengurutkan.
      </p>
    </div>
  );
}
