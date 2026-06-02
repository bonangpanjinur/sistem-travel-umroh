/**
 * DepartureMarginCalculator — Profit-margin dashboard for a single departure.
 *
 * Shows HPP per pax (from departure_cost_items) vs. selling price per room type,
 * auto-computes gross margin and suggests a minimum price based on target margin %.
 *
 * Placed in the "Riwayat Harga" tab (TabsContent value="harga") in
 * AdminDepartureDetail, receiving price tiers and pax count as props.
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, Target, Package, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRp(n: number) {
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

function pct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface RoomTier {
  key: string;
  label: string;
  emoji: string;
  price: number;
}

interface Props {
  departureId: string;
  paxCount: number;
  priceQuad: number;
  priceTriple: number;
  priceDouble: number;
  priceSingle: number;
}

// ── MarginRow — one row per room type ─────────────────────────────────────────

interface MarginRowProps {
  tier: RoomTier;
  hppPerPax: number;
  targetMarginPct: number;
}

function MarginRow({ tier, hppPerPax, targetMarginPct }: MarginRowProps) {
  const sellPrice = tier.price;
  const grossMargin = sellPrice - hppPerPax;
  const marginPct = sellPrice > 0 ? (grossMargin / sellPrice) * 100 : 0;
  const suggestedMin = targetMarginPct < 100 && hppPerPax > 0
    ? hppPerPax / (1 - targetMarginPct / 100)
    : 0;
  const meetsTarget = marginPct >= targetMarginPct;
  const closeToTarget = !meetsTarget && marginPct >= targetMarginPct - 5;

  if (sellPrice === 0) return null;

  const statusColor = meetsTarget
    ? "text-emerald-600 bg-emerald-50 border-emerald-200"
    : closeToTarget
    ? "text-amber-600 bg-amber-50 border-amber-200"
    : "text-red-600 bg-red-50 border-red-200";

  const StatusIcon = meetsTarget ? TrendingUp : closeToTarget ? Minus : TrendingDown;

  return (
    <div className={cn("rounded-lg border p-4 transition-all", statusColor)}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base">{tier.emoji}</span>
            <span className="font-semibold text-sm">{tier.label}</span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5 py-0 border",
                meetsTarget
                  ? "border-emerald-400 text-emerald-700"
                  : closeToTarget
                  ? "border-amber-400 text-amber-700"
                  : "border-red-400 text-red-700"
              )}
            >
              <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
              {meetsTarget ? "Sesuai target" : closeToTarget ? "Hampir target" : "Di bawah target"}
            </Badge>
          </div>
          <p className="text-xs mt-1 opacity-70">
            Harga jual: <strong className="opacity-100">{fmtRp(sellPrice)}</strong>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold tracking-tight">{pct(marginPct)}</p>
          <p className="text-[11px] opacity-70">Gross Margin</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="flex justify-between">
          <span className="opacity-70">HPP per pax</span>
          <span className="font-medium">{fmtRp(hppPerPax)}</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-70">Laba kotor</span>
          <span className={cn("font-medium", grossMargin < 0 ? "text-red-700" : "")}>
            {fmtRp(grossMargin)}
          </span>
        </div>
        {!meetsTarget && suggestedMin > 0 && (
          <div className="col-span-2 flex justify-between mt-1 border-t border-current/20 pt-1">
            <span className="opacity-70">Harga min. (target {targetMarginPct}%)</span>
            <span className="font-semibold">{fmtRp(suggestedMin)}</span>
          </div>
        )}
      </div>

      {/* Margin bar */}
      <div className="mt-3 h-1.5 rounded-full bg-current/20 overflow-hidden">
        <div
          className="h-full rounded-full bg-current transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, marginPct))}%` }}
        />
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DepartureMarginCalculator({
  departureId,
  paxCount,
  priceQuad,
  priceTriple,
  priceDouble,
  priceSingle,
}: Props) {
  const [targetMargin, setTargetMargin] = useState(20);

  // Fetch HPP from departure_cost_items
  const { data: items, isLoading } = useQuery({
    queryKey: ["departure-cost-items", departureId],
    queryFn: async () => {
      const db = supabase as any;
      const { data, error } = await db
        .from("departure_cost_items")
        .select("total_cost_idr, unit, quantity")
        .eq("departure_id", departureId);
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data || [];
    },
    enabled: !!departureId,
  });

  const totalHPP = useMemo(
    () => (items || []).reduce((s: number, i: any) => s + (Number(i.total_cost_idr) || 0), 0),
    [items]
  );

  const hppPerPax = paxCount > 0 ? totalHPP / paxCount : 0;

  const tiers: RoomTier[] = [
    { key: "quad",   label: "Quad (4 orang)",   emoji: "👥", price: priceQuad },
    { key: "triple", label: "Triple (3 orang)",  emoji: "👤", price: priceTriple },
    { key: "double", label: "Double (2 orang)",  emoji: "🛏", price: priceDouble },
    { key: "single", label: "Single (1 orang)",  emoji: "🌟", price: priceSingle },
  ].filter(t => t.price > 0);

  const hasItems = items && items.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" />
              Kalkulator Margin Keuntungan
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Perbandingan HPP per pax vs. harga jual per tipe kamar
            </p>
          </div>

          {/* Target margin input */}
          <div className="flex items-center gap-2 shrink-0">
            <Label className="text-xs font-semibold whitespace-nowrap">Target Margin</Label>
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={99}
                step={1}
                value={targetMargin}
                onChange={e => setTargetMargin(Math.min(99, Math.max(0, Number(e.target.value))))}
                className="h-8 w-20 text-sm text-center pr-6"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* HPP summary bar */}
        <div className="rounded-lg bg-destructive/5 border border-destructive/20 px-4 py-3">
          {isLoading ? (
            <div className="flex gap-4">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-8 w-32" />
            </div>
          ) : hasItems ? (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-destructive" />
                <div>
                  <p className="text-xs text-muted-foreground">Total HPP ({items?.length} item)</p>
                  <p className="font-bold text-destructive">{fmtRp(totalHPP)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  HPP per pax {paxCount > 0 ? `(÷ ${paxCount} jamaah)` : ""}
                </p>
                <p className="font-bold text-destructive text-lg">
                  {paxCount > 0 ? fmtRp(hppPerPax) : "—"}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <p>
                Belum ada item HPP. Tambahkan item di kartu{" "}
                <strong>HPP / Modal per Seat</strong> terlebih dahulu.
              </p>
            </div>
          )}
        </div>

        {/* Per room type grid */}
        {!hasItems || tiers.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground text-sm border rounded-lg border-dashed">
            {tiers.length === 0
              ? "Belum ada harga jual yang diset. Tambahkan harga di atas."
              : "Tambahkan item HPP untuk melihat kalkulasi margin."}
          </div>
        ) : paxCount === 0 ? (
          <div className="py-6 text-center text-muted-foreground text-sm border rounded-lg border-dashed">
            <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-amber-500" />
            HPP per pax tidak dapat dihitung — jumlah jamaah saat ini 0.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {tiers.map(tier => (
              <MarginRow
                key={tier.key}
                tier={tier}
                hppPerPax={hppPerPax}
                targetMarginPct={targetMargin}
              />
            ))}
          </div>
        )}

        {/* Legend */}
        {hasItems && tiers.length > 0 && paxCount > 0 && (
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" /> Margin ≥ {targetMargin}% = sesuai target
            </span>
            <span className="flex items-center gap-1">
              <Minus className="h-3 w-3 text-amber-500" /> {targetMargin - 5}–{targetMargin}% = hampir target
            </span>
            <span className="flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-red-500" /> &lt; {targetMargin - 5}% = di bawah target
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
