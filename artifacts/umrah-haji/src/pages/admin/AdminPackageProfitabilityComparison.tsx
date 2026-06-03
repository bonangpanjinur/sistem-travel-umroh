/**
 * AdminPackageProfitabilityComparison — P2
 *
 * Perbandingan profitabilitas lintas paket dalam satu tabel:
 * harga jual, HPP, margin per tier, occupancy, dan revenue per keberangkatan.
 * Admin bisa langsung melihat dan membandingkan profitabilitas antar paket.
 */

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase = supabaseRaw as any;

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ChevronDown,
  ChevronRight,
  Trophy,
  ArrowUpDown,
  Target,
  RefreshCw,
  BarChart3,
  Users,
  DollarSign,
  PackageOpen,
  AlertTriangle,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RawBooking {
  booking_status: string;
  total_pax: number;
  total_price: number;
  paid_amount: number;
}

interface RawDeparture {
  id: string;
  departure_date: string | null;
  return_date: string | null;
  status: string;
  quota: number;
  price_quad: number | null;
  price_triple: number | null;
  price_double: number | null;
  price_single: number | null;
  bookings: RawBooking[];
}

interface RawPackage {
  id: string;
  name: string;
  type: string;
  departures: RawDeparture[];
}

interface HPPRow {
  departure_id: string;
  total_cost_idr: number;
}

const TIER_KEYS = ["quad", "triple", "double", "single"] as const;
type TierKey = (typeof TIER_KEYS)[number];
const TIER_LABELS: Record<TierKey, string> = {
  quad: "Quad",
  triple: "Triple",
  double: "Double",
  single: "Single",
};

type SortKey = "name" | "occupancy" | "margin" | "revenue" | "hpp";
type SortDir = "asc" | "desc";

// ── Formatters ─────────────────────────────────────────────────────────────────

function fmtRp(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}rb`;
  return `${Math.round(n)}`;
}

function fmtPct(n: number | null): string {
  if (n == null) return "—";
  return `${n.toFixed(1)}%`;
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

// ── Margin color helper ────────────────────────────────────────────────────────

function marginColor(m: number | null, target: number): string {
  if (m == null) return "text-muted-foreground";
  if (m >= target) return "text-emerald-600";
  if (m >= target - 5) return "text-amber-600";
  return "text-red-600";
}

function marginIcon(m: number | null, target: number) {
  if (m == null) return <Minus className="h-3 w-3 opacity-40" />;
  if (m >= target) return <TrendingUp className="h-3 w-3 text-emerald-500" />;
  if (m >= target - 5) return <Minus className="h-3 w-3 text-amber-500" />;
  return <TrendingDown className="h-3 w-3 text-red-500" />;
}

// ── Per-departure computed row ─────────────────────────────────────────────────

interface DepartureRow {
  dep: RawDeparture;
  paxConfirmed: number;
  occupancyPct: number | null;
  revenueGross: number;
  revenuePaid: number;
  totalHPP: number | null;
  hppPerPax: number | null;
  margins: Partial<Record<TierKey, number | null>>;
  bestMargin: number | null;
  bestTier: TierKey | null;
}

function buildDepartureRow(dep: RawDeparture, totalHPP: number | null): DepartureRow {
  const paxConfirmed = dep.bookings
    .filter((b) => ["confirmed", "completed"].includes(b.booking_status))
    .reduce((s, b) => s + (b.total_pax || 0), 0);

  const occupancyPct =
    dep.quota > 0 ? (paxConfirmed / dep.quota) * 100 : null;

  const revenueGross = dep.bookings
    .filter((b) => ["confirmed", "completed"].includes(b.booking_status))
    .reduce((s, b) => s + (Number(b.total_price) || 0), 0);

  const revenuePaid = dep.bookings
    .filter((b) => ["confirmed", "completed"].includes(b.booking_status))
    .reduce((s, b) => s + (Number(b.paid_amount) || 0), 0);

  const hppPerPax =
    totalHPP != null && paxConfirmed > 0 ? totalHPP / paxConfirmed : null;

  const margins: Partial<Record<TierKey, number | null>> = {};
  let bestMargin: number | null = null;
  let bestTier: TierKey | null = null;

  for (const tk of TIER_KEYS) {
    const price = Number(dep[`price_${tk}` as keyof RawDeparture]) || 0;
    if (!price || hppPerPax == null) {
      margins[tk] = null;
      continue;
    }
    const m = ((price - hppPerPax) / price) * 100;
    margins[tk] = m;
    if (bestMargin == null || m > bestMargin) {
      bestMargin = m;
      bestTier = tk;
    }
  }

  return {
    dep,
    paxConfirmed,
    occupancyPct,
    revenueGross,
    revenuePaid,
    totalHPP,
    hppPerPax,
    margins,
    bestMargin,
    bestTier,
  };
}

// ── Per-package summary ────────────────────────────────────────────────────────

interface PackageSummary {
  pkg: RawPackage;
  depRows: DepartureRow[];
  avgOccupancy: number | null;
  avgMargin: number | null;
  avgHppPerPax: number | null;
  totalRevenueGross: number;
  totalRevenuePaid: number;
  totalPax: number;
  totalQuota: number;
  priceRanges: Partial<Record<TierKey, { min: number; max: number }>>;
  bestDepMargin: number | null;
  activeTiers: TierKey[];
}

function buildPackageSummary(
  pkg: RawPackage,
  hppByDep: Record<string, number>,
): PackageSummary {
  const depRows = pkg.departures.map((dep) =>
    buildDepartureRow(dep, hppByDep[dep.id] ?? null),
  );

  // Average occupancy across departures that have quota > 0
  const occVals = depRows
    .map((r) => r.occupancyPct)
    .filter((v): v is number => v != null);
  const avgOccupancy =
    occVals.length > 0 ? occVals.reduce((s, v) => s + v, 0) / occVals.length : null;

  // Average best margin across departures that have HPP
  const marginVals = depRows
    .map((r) => r.bestMargin)
    .filter((v): v is number => v != null);
  const avgMargin =
    marginVals.length > 0
      ? marginVals.reduce((s, v) => s + v, 0) / marginVals.length
      : null;

  const hppVals = depRows
    .map((r) => r.hppPerPax)
    .filter((v): v is number => v != null);
  const avgHppPerPax =
    hppVals.length > 0 ? hppVals.reduce((s, v) => s + v, 0) / hppVals.length : null;

  const totalRevenueGross = depRows.reduce((s, r) => s + r.revenueGross, 0);
  const totalRevenuePaid = depRows.reduce((s, r) => s + r.revenuePaid, 0);
  const totalPax = depRows.reduce((s, r) => s + r.paxConfirmed, 0);
  const totalQuota = pkg.departures.reduce((s, d) => s + (d.quota || 0), 0);

  // Price ranges per tier across all departures
  const priceRanges: Partial<Record<TierKey, { min: number; max: number }>> = {};
  for (const tk of TIER_KEYS) {
    const prices = pkg.departures
      .map((d) => Number(d[`price_${tk}` as keyof RawDeparture]) || 0)
      .filter((p) => p > 0);
    if (prices.length > 0) {
      priceRanges[tk] = { min: Math.min(...prices), max: Math.max(...prices) };
    }
  }

  const activeTiers = TIER_KEYS.filter((tk) => priceRanges[tk]);

  const bestDepMargin =
    marginVals.length > 0 ? Math.max(...marginVals) : null;

  return {
    pkg,
    depRows,
    avgOccupancy,
    avgMargin,
    avgHppPerPax,
    totalRevenueGross,
    totalRevenuePaid,
    totalPax,
    totalQuota,
    priceRanges,
    bestDepMargin,
    activeTiers,
  };
}

// ── Sub-component: Departure expanded row ─────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  open:     "bg-emerald-100 text-emerald-700",
  full:     "bg-orange-100 text-orange-700",
  closed:   "bg-slate-100 text-slate-500",
  departed: "bg-blue-100 text-blue-700",
};
const STATUS_LABEL: Record<string, string> = {
  open: "Open", full: "Full", closed: "Closed", departed: "Berangkat",
};

function DepartureExpandedRow({
  row,
  targetMargin,
  colSpan,
}: {
  row: DepartureRow;
  targetMargin: number;
  colSpan: number;
}) {
  return (
    <tr className="bg-muted/10 border-b border-muted/30">
      <td colSpan={colSpan} className="px-0 py-0">
        <div className="pl-10 pr-3 py-2">
          <div className="overflow-x-auto rounded border border-muted/40 bg-background">
            <table className="w-full text-xs min-w-[640px]">
              <thead>
                <tr className="bg-muted/30 border-b">
                  <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">Tanggal</th>
                  <th className="text-center px-2 py-1.5 font-semibold text-muted-foreground">Status</th>
                  <th className="text-center px-2 py-1.5 font-semibold text-muted-foreground">Jamaah/Kuota</th>
                  <th className="text-center px-2 py-1.5 font-semibold text-muted-foreground">Occupancy</th>
                  <th className="text-right px-2 py-1.5 font-semibold text-muted-foreground">HPP/Pax</th>
                  {TIER_KEYS.filter((tk) => row.dep[`price_${tk}` as keyof RawDeparture]).map((tk) => (
                    <th key={tk} className="text-center px-2 py-1.5 font-semibold text-muted-foreground">
                      {TIER_LABELS[tk]}
                    </th>
                  ))}
                  <th className="text-right px-3 py-1.5 font-semibold text-muted-foreground">Revenue</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  {/* Date */}
                  <td className="px-3 py-2">
                    <div className="font-medium">{fmtDate(row.dep.departure_date)}</div>
                    {row.dep.return_date && (
                      <div className="text-muted-foreground">s/d {fmtDate(row.dep.return_date)}</div>
                    )}
                  </td>
                  {/* Status */}
                  <td className="px-2 py-2 text-center">
                    <span className={cn(
                      "inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium",
                      STATUS_STYLE[row.dep.status] ?? "bg-slate-100 text-slate-500"
                    )}>
                      {STATUS_LABEL[row.dep.status] ?? row.dep.status}
                    </span>
                  </td>
                  {/* Jamaah/Kuota */}
                  <td className="px-2 py-2 text-center">
                    <span className="font-semibold">{row.paxConfirmed}</span>
                    <span className="text-muted-foreground">/{row.dep.quota}</span>
                  </td>
                  {/* Occupancy */}
                  <td className="px-2 py-2 text-center">
                    {row.occupancyPct != null ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={cn("font-bold", marginColor(row.occupancyPct >= 80 ? 100 : row.occupancyPct >= 60 ? 80 : 0, 80))}>
                          {row.occupancyPct.toFixed(0)}%
                        </span>
                        <div className="w-14 h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              row.occupancyPct >= 80
                                ? "bg-emerald-500"
                                : row.occupancyPct >= 50
                                ? "bg-amber-500"
                                : "bg-red-400",
                            )}
                            style={{ width: `${Math.min(100, row.occupancyPct)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  {/* HPP/Pax */}
                  <td className="px-2 py-2 text-right">
                    {row.hppPerPax != null ? (
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-semibold cursor-default">{fmtRp(row.hppPerPax)}</span>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            <p>Total HPP: {formatCurrency(row.totalHPP ?? 0)}</p>
                            <p>Dibagi {row.paxConfirmed} jamaah</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-muted-foreground text-[10px]">
                        {row.paxConfirmed === 0 ? "0 pax" : "no HPP"}
                      </span>
                    )}
                  </td>
                  {/* Margin per tier */}
                  {TIER_KEYS.filter((tk) => row.dep[`price_${tk}` as keyof RawDeparture]).map((tk) => {
                    const price = Number(row.dep[`price_${tk}` as keyof RawDeparture]) || 0;
                    const m = row.margins[tk];
                    return (
                      <td key={tk} className="px-2 py-2 text-center">
                        {m != null ? (
                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className={cn("flex flex-col items-center cursor-default", marginColor(m, targetMargin))}>
                                  <div className="flex items-center gap-0.5">
                                    {marginIcon(m, targetMargin)}
                                    <span className="font-bold tabular-nums">{m.toFixed(1)}%</span>
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">{fmtRp(price)}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">
                                <p>Harga: {formatCurrency(price)}</p>
                                <p>HPP/pax: {formatCurrency(row.hppPerPax ?? 0)}</p>
                                <p>Laba kotor: {formatCurrency(price - (row.hppPerPax ?? 0))}</p>
                                <p className="font-bold">Margin: {m.toFixed(1)}%</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    );
                  })}
                  {/* Revenue */}
                  <td className="px-3 py-2 text-right">
                    <div className="font-semibold">{fmtRp(row.revenueGross)}</div>
                    {row.revenueGross > 0 && (
                      <div className="text-[10px] text-muted-foreground">
                        Terbayar {row.revenueGross > 0 ? ((row.revenuePaid / row.revenueGross) * 100).toFixed(0) : 0}%
                      </div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminPackageProfitabilityComparison() {
  const [targetMargin, setTargetMargin] = useState(20);
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQ, setSearchQ] = useState("");

  // ── Data fetching ──────────────────────────────────────────────────────────

  const { data: packages, isLoading: pkgLoading, refetch } = useQuery<RawPackage[]>({
    queryKey: ["pkg-profit-comparison"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select(`
          id, name, type,
          departures(
            id, departure_date, return_date, status, quota,
            price_quad, price_triple, price_double, price_single,
            bookings(booking_status, total_pax, total_price, paid_amount)
          )
        `)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as RawPackage[];
    },
    staleTime: 60_000,
  });

  const allDepIds = useMemo(
    () => (packages ?? []).flatMap((p) => p.departures.map((d) => d.id)),
    [packages],
  );

  const { data: hppRows, isLoading: hppLoading } = useQuery<HPPRow[]>({
    queryKey: ["hpp-bulk-all", allDepIds.join(",")],
    queryFn: async () => {
      if (allDepIds.length === 0) return [];
      const { data, error } = await supabase
        .from("departure_cost_items")
        .select("departure_id, total_cost_idr")
        .in("departure_id", allDepIds);
      if (error?.code === "42P01") return [];
      if (error) throw error;
      return (data ?? []) as HPPRow[];
    },
    enabled: allDepIds.length > 0,
    staleTime: 60_000,
  });

  const hppByDep = useMemo(() => {
    const m: Record<string, number> = {};
    for (const row of hppRows ?? []) {
      m[row.departure_id] =
        (m[row.departure_id] || 0) + (Number(row.total_cost_idr) || 0);
    }
    return m;
  }, [hppRows]);

  // ── Build summaries ────────────────────────────────────────────────────────

  const summaries = useMemo(() => {
    if (!packages) return [];
    return packages.map((pkg) => buildPackageSummary(pkg, hppByDep));
  }, [packages, hppByDep]);

  // ── Filter & sort ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = summaries;
    if (typeFilter !== "all") {
      list = list.filter((s) => s.pkg.type === typeFilter);
    }
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      list = list.filter((s) => s.pkg.name.toLowerCase().includes(q));
    }
    return list;
  }, [summaries, typeFilter, searchQ]);

  const sorted = useMemo(() => {
    const s = [...filtered].sort((a, b) => {
      let av: number, bv: number;
      switch (sortKey) {
        case "name":
          return sortDir === "asc"
            ? a.pkg.name.localeCompare(b.pkg.name)
            : b.pkg.name.localeCompare(a.pkg.name);
        case "occupancy":
          av = a.avgOccupancy ?? -1;
          bv = b.avgOccupancy ?? -1;
          break;
        case "margin":
          av = a.avgMargin ?? -999;
          bv = b.avgMargin ?? -999;
          break;
        case "revenue":
          av = a.totalRevenueGross;
          bv = b.totalRevenueGross;
          break;
        case "hpp":
          av = a.avgHppPerPax ?? -1;
          bv = b.avgHppPerPax ?? -1;
          break;
        default:
          return 0;
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return s;
  }, [filtered, sortKey, sortDir]);

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("desc");
      }
    },
    [sortKey],
  );

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedIds(new Set(sorted.map((s) => s.pkg.id)));
  }, [sorted]);

  const collapseAll = useCallback(() => setExpandedIds(new Set()), []);

  // ── Summary KPI cards ──────────────────────────────────────────────────────

  const kpi = useMemo(() => {
    const totalRevenue = summaries.reduce((s, r) => s + r.totalRevenueGross, 0);
    const totalPaid = summaries.reduce((s, r) => s + r.totalRevenuePaid, 0);
    const allMargins = summaries
      .map((s) => s.avgMargin)
      .filter((v): v is number => v != null);
    const avgMarginAll =
      allMargins.length > 0
        ? allMargins.reduce((s, v) => s + v, 0) / allMargins.length
        : null;
    const totalPax = summaries.reduce((s, r) => s + r.totalPax, 0);
    const totalQuota = summaries.reduce((s, r) => s + r.totalQuota, 0);
    const globalOccupancy = totalQuota > 0 ? (totalPax / totalQuota) * 100 : null;
    const pkgsAboveTarget = summaries.filter(
      (s) => s.avgMargin != null && s.avgMargin >= targetMargin,
    ).length;

    return { totalRevenue, totalPaid, avgMarginAll, globalOccupancy, pkgsAboveTarget };
  }, [summaries, targetMargin]);

  const isLoading = pkgLoading || hppLoading;

  // ── Sort icon helper ───────────────────────────────────────────────────────

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k)
      return <ArrowUpDown className="h-3 w-3 opacity-30 ml-0.5 inline-block" />;
    return (
      <span className="ml-0.5 text-primary font-bold">
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    );
  }

  // ── Unique types for filter ────────────────────────────────────────────────

  const packageTypes = useMemo(() => {
    const types = new Set((packages ?? []).map((p) => p.type).filter(Boolean));
    return Array.from(types).sort();
  }, [packages]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const TABLE_COLS = 9; // approximate col count for colSpan in expanded rows

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Perbandingan Profitabilitas Paket
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            HPP, margin, harga jual, dan occupancy per keberangkatan — semua paket dalam satu tampilan.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          className="gap-1.5"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Muat Ulang
        </Button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="py-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Revenue</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-28 mt-1" />
            ) : (
              <div>
                <p className="text-2xl font-extrabold tabular-nums">{fmtRp(kpi.totalRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Terbayar {kpi.totalRevenue > 0 ? ((kpi.totalPaid / kpi.totalRevenue) * 100).toFixed(0) : 0}%
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rata-rata Margin</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-20 mt-1" />
            ) : (
              <p className={cn("text-2xl font-extrabold tabular-nums", marginColor(kpi.avgMarginAll, targetMargin))}>
                {fmtPct(kpi.avgMarginAll)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Occupancy Global</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-20 mt-1" />
            ) : (
              <p className={cn("text-2xl font-extrabold tabular-nums",
                kpi.globalOccupancy == null ? "text-muted-foreground"
                  : kpi.globalOccupancy >= 70 ? "text-emerald-600"
                  : kpi.globalOccupancy >= 50 ? "text-amber-600"
                  : "text-red-600"
              )}>
                {fmtPct(kpi.globalOccupancy)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Di Atas Target</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-16 mt-1" />
            ) : (
              <div>
                <p className="text-2xl font-extrabold tabular-nums text-emerald-600">
                  {kpi.pkgsAboveTarget}
                  <span className="text-sm font-normal text-muted-foreground ml-1">paket</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Target margin {targetMargin}%</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <Input
          placeholder="Cari nama paket..."
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          className="h-8 w-48 text-sm"
        />

        {/* Type filter */}
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tipe</SelectItem>
            {packageTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Target margin */}
        <div className="flex items-center gap-1.5">
          <Target className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Target</span>
          <div className="relative">
            <Input
              type="number"
              min={0}
              max={99}
              step={1}
              value={targetMargin}
              onChange={(e) =>
                setTargetMargin(Math.min(99, Math.max(0, Number(e.target.value))))
              }
              className="h-8 w-16 text-center text-sm pr-5"
            />
            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
          </div>
        </div>

        {/* Expand/collapse */}
        <div className="flex items-center gap-1.5 ml-auto">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={expandAll}>
            Buka Semua
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={collapseAll}>
            Tutup Semua
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          <span>≥{targetMargin}% (target)</span>
        </div>
        <div className="flex items-center gap-1">
          <Minus className="h-3.5 w-3.5 text-amber-500" />
          <span>{targetMargin - 5}–{targetMargin}% (mendekati)</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingDown className="h-3.5 w-3.5 text-red-500" />
          <span>&lt;{targetMargin - 5}% (di bawah target)</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto rounded-xl border shadow-sm">
        <table className="w-full text-sm min-w-[860px]">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="w-8 px-3 py-3" />
              <th className="text-left px-3 py-3 font-semibold text-xs text-muted-foreground">
                <button
                  onClick={() => toggleSort("name")}
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  Paket <SortIcon k="name" />
                </button>
              </th>
              <th className="text-center px-2 py-3 font-semibold text-xs text-muted-foreground">Tipe</th>
              <th className="text-center px-2 py-3 font-semibold text-xs text-muted-foreground">Dep.</th>
              <th className="text-center px-3 py-3 font-semibold text-xs text-muted-foreground">
                Harga Jual
                <div className="font-normal text-[10px] opacity-60">(quad–single)</div>
              </th>
              <th className="text-right px-3 py-3 font-semibold text-xs text-muted-foreground">
                <button
                  onClick={() => toggleSort("hpp")}
                  className="flex items-center gap-0.5 ml-auto hover:text-foreground transition-colors"
                >
                  HPP/Pax <SortIcon k="hpp" />
                </button>
              </th>
              <th className="text-center px-3 py-3 font-semibold text-xs text-muted-foreground">
                <button
                  onClick={() => toggleSort("occupancy")}
                  className="flex items-center gap-0.5 mx-auto hover:text-foreground transition-colors"
                >
                  Occupancy <SortIcon k="occupancy" />
                </button>
              </th>
              <th className="text-center px-3 py-3 font-semibold text-xs text-muted-foreground">
                <button
                  onClick={() => toggleSort("margin")}
                  className="flex items-center gap-0.5 mx-auto hover:text-foreground transition-colors"
                >
                  Margin Rata-rata <SortIcon k="margin" />
                </button>
              </th>
              <th className="text-right px-3 py-3 font-semibold text-xs text-muted-foreground">
                <button
                  onClick={() => toggleSort("revenue")}
                  className="flex items-center gap-0.5 ml-auto hover:text-foreground transition-colors"
                >
                  Revenue <SortIcon k="revenue" />
                </button>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td colSpan={TABLE_COLS} className="px-3 py-3">
                      <Skeleton className="h-10 w-full" />
                    </td>
                  </tr>
                ))
              : sorted.length === 0
              ? (
                  <tr>
                    <td colSpan={TABLE_COLS} className="py-20 text-center text-muted-foreground">
                      <PackageOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p className="font-medium">Tidak ada paket yang cocok</p>
                      <p className="text-sm mt-1">Coba ubah filter atau keyword pencarian.</p>
                    </td>
                  </tr>
                )
              : sorted.map((summary, rank) => {
                  const isExpanded = expandedIds.has(summary.pkg.id);
                  const isBest =
                    rank === 0 &&
                    sortKey === "margin" &&
                    summary.avgMargin != null;

                  return (
                    <>
                      {/* Package summary row */}
                      <tr
                        key={summary.pkg.id}
                        className={cn(
                          "transition-colors hover:bg-muted/30 cursor-pointer",
                          isExpanded && "bg-muted/20",
                          isBest && "bg-emerald-50/50",
                        )}
                        onClick={() => toggleExpand(summary.pkg.id)}
                      >
                        {/* Expand toggle */}
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center gap-1">
                            {isBest && <Trophy className="h-3.5 w-3.5 text-amber-500" />}
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </td>

                        {/* Name */}
                        <td className="px-3 py-3">
                          <div>
                            <span className="font-semibold leading-tight">{summary.pkg.name}</span>
                            {summary.pkg.departures.length === 0 && (
                              <Badge variant="outline" className="ml-2 text-[10px] py-0">
                                Belum ada dep.
                              </Badge>
                            )}
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-2 py-3 text-center">
                          <span className="inline-flex rounded px-2 py-0.5 bg-primary/10 text-primary text-[11px] font-medium capitalize">
                            {summary.pkg.type || "—"}
                          </span>
                        </td>

                        {/* Departures count */}
                        <td className="px-2 py-3 text-center">
                          <span className="font-semibold">{summary.pkg.departures.length}</span>
                        </td>

                        {/* Harga jual — range per tier */}
                        <td className="px-3 py-3 text-center">
                          {summary.activeTiers.length === 0 ? (
                            <span className="text-muted-foreground text-xs">—</span>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              {summary.activeTiers.map((tk) => {
                                const range = summary.priceRanges[tk]!;
                                return (
                                  <div key={tk} className="flex items-center justify-center gap-1 text-xs">
                                    <span className="text-muted-foreground w-10 text-right">{TIER_LABELS[tk]}:</span>
                                    <span className="font-medium tabular-nums">
                                      {range.min === range.max
                                        ? fmtRp(range.min)
                                        : `${fmtRp(range.min)}–${fmtRp(range.max)}`}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>

                        {/* HPP/Pax avg */}
                        <td className="px-3 py-3 text-right">
                          {hppLoading ? (
                            <Skeleton className="h-4 w-16 ml-auto" />
                          ) : summary.avgHppPerPax != null ? (
                            <TooltipProvider delayDuration={150}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="font-semibold tabular-nums cursor-default">
                                    {fmtRp(summary.avgHppPerPax)}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs">
                                  <p>Rata-rata HPP per pax dari {summary.depRows.filter((r) => r.hppPerPax != null).length} keberangkatan</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-muted-foreground text-xs">no HPP</span>
                          )}
                        </td>

                        {/* Occupancy */}
                        <td className="px-3 py-3 text-center">
                          {summary.avgOccupancy != null ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className={cn(
                                "font-bold tabular-nums text-sm",
                                summary.avgOccupancy >= 70
                                  ? "text-emerald-600"
                                  : summary.avgOccupancy >= 50
                                  ? "text-amber-600"
                                  : "text-red-600",
                              )}>
                                {summary.avgOccupancy.toFixed(0)}%
                              </span>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Users className="h-3 w-3" />
                                {summary.totalPax}/{summary.totalQuota}
                              </div>
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full",
                                    summary.avgOccupancy >= 70
                                      ? "bg-emerald-500"
                                      : summary.avgOccupancy >= 50
                                      ? "bg-amber-500"
                                      : "bg-red-400",
                                  )}
                                  style={{ width: `${Math.min(100, summary.avgOccupancy)}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>

                        {/* Avg Margin */}
                        <td className="px-3 py-3 text-center">
                          {hppLoading ? (
                            <Skeleton className="h-5 w-14 mx-auto" />
                          ) : summary.avgMargin != null ? (
                            <TooltipProvider delayDuration={150}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className={cn("flex flex-col items-center gap-0.5 cursor-default", marginColor(summary.avgMargin, targetMargin))}>
                                    <div className="flex items-center gap-1">
                                      {marginIcon(summary.avgMargin, targetMargin)}
                                      <span className="font-bold text-base tabular-nums">
                                        {summary.avgMargin.toFixed(1)}%
                                      </span>
                                    </div>
                                    {summary.bestDepMargin != null && summary.bestDepMargin !== summary.avgMargin && (
                                      <span className="text-[10px] text-muted-foreground">
                                        terbaik {summary.bestDepMargin.toFixed(1)}%
                                      </span>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs">
                                  <p>Margin rata-rata: {summary.avgMargin.toFixed(1)}%</p>
                                  {summary.bestDepMargin != null && (
                                    <p>Margin terbaik (1 dep): {summary.bestDepMargin.toFixed(1)}%</p>
                                  )}
                                  <p className="text-muted-foreground mt-1">Klik baris untuk lihat detail per keberangkatan</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              no HPP
                            </div>
                          )}
                        </td>

                        {/* Revenue */}
                        <td className="px-3 py-3 text-right">
                          <div>
                            <div className="font-semibold tabular-nums">
                              {summary.totalRevenueGross > 0
                                ? fmtRp(summary.totalRevenueGross)
                                : <span className="text-muted-foreground">—</span>}
                            </div>
                            {summary.totalRevenueGross > 0 && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                Terbayar {((summary.totalRevenuePaid / summary.totalRevenueGross) * 100).toFixed(0)}%
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded departure rows */}
                      {isExpanded &&
                        summary.depRows.map((depRow) => (
                          <DepartureExpandedRow
                            key={depRow.dep.id}
                            row={depRow}
                            targetMargin={targetMargin}
                            colSpan={TABLE_COLS}
                          />
                        ))}
                    </>
                  );
                })}
          </tbody>

          {/* Footer — totals row */}
          {!isLoading && sorted.length > 0 && (
            <tfoot>
              <tr className="border-t-2 bg-muted/40">
                <td />
                <td colSpan={3} className="px-3 py-2.5 text-xs font-bold text-muted-foreground">
                  Total ({sorted.length} paket, {sorted.reduce((s, r) => s + r.pkg.departures.length, 0)} keberangkatan)
                </td>
                <td />
                <td className="px-3 py-2.5 text-right text-xs font-bold">
                  {sorted.some((s) => s.avgHppPerPax != null) ? (
                    <span className="text-muted-foreground">
                      rata²: {fmtRp(
                        sorted
                          .filter((s) => s.avgHppPerPax != null)
                          .reduce((s, r) => s + r.avgHppPerPax!, 0) /
                        sorted.filter((s) => s.avgHppPerPax != null).length
                      )}
                    </span>
                  ) : "—"}
                </td>
                <td className="px-3 py-2.5 text-center text-xs font-bold">
                  <span className={cn(marginColor(kpi.globalOccupancy, 70))}>
                    {fmtPct(kpi.globalOccupancy)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center text-xs font-bold">
                  <span className={cn(marginColor(kpi.avgMarginAll, targetMargin))}>
                    {fmtPct(kpi.avgMarginAll)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right text-xs font-bold">
                  {fmtRp(kpi.totalRevenue)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Caption */}
      <p className="text-[11px] text-muted-foreground">
        Klik baris paket untuk melihat rincian per keberangkatan. HPP/pax = total HPP ÷ jumlah jamaah confirmed.
        Margin = (Harga − HPP/pax) / Harga × 100. Occupancy = jamaah confirmed / kuota.
        Data diperbarui setiap 1 menit.
      </p>
    </div>
  );
}
