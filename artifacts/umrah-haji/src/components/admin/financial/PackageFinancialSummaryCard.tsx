import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  RefreshCw, TrendingUp, TrendingDown, DollarSign,
  ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface DepartureRef {
  id: string;
  departure_date: string | null;
  return_date: string | null;
  status: string;
}

interface Props {
  departures: DepartureRef[];
  packageName?: string;
}

interface FinancialSummaryRow {
  departure_id: string;
  hpp_total: number;
  revenue_gross: number;
  gross_profit: number;
  net_profit: number;
  gross_margin_pct: number;
  expense_total: number;
  other_revenue_total: number;
  pax_confirmed: number;
  quota: number;
  last_calculated_at: string | null;
}

function fmt(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1)}M`;
  if (abs >= 1_000_000) return `${sign}Rp ${(abs / 1_000_000).toFixed(1)}Jt`;
  return `${sign}Rp ${Math.round(abs).toLocaleString("id-ID")}`;
}

function fmtFull(n: number) {
  const sign = n < 0 ? "-" : "";
  return `${sign}Rp ${Math.round(Math.abs(n)).toLocaleString("id-ID")}`;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_COLORS: Record<string, string> = {
  open:     "bg-green-100 text-green-800",
  closed:   "bg-gray-100 text-gray-700",
  full:     "bg-orange-100 text-orange-800",
  departed: "bg-blue-100 text-blue-800",
  completed:"bg-purple-100 text-purple-800",
};

function KpiBox({
  label, value, sub, color = "default", icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: "green" | "red" | "blue" | "orange" | "default";
  icon?: React.ReactNode;
}) {
  const bgMap = {
    green:   "bg-green-50 dark:bg-green-950/20",
    red:     "bg-red-50 dark:bg-red-950/20",
    blue:    "bg-blue-50 dark:bg-blue-950/20",
    orange:  "bg-orange-50 dark:bg-orange-950/20",
    default: "bg-muted/40",
  };
  const textMap = {
    green:   "text-green-700 dark:text-green-400",
    red:     "text-red-600 dark:text-red-400",
    blue:    "text-blue-700 dark:text-blue-400",
    orange:  "text-orange-600 dark:text-orange-400",
    default: "text-foreground",
  };
  return (
    <div className={cn("rounded-xl p-3 flex flex-col gap-0.5", bgMap[color])}>
      {icon && <div className="mb-1 opacity-70">{icon}</div>}
      <p className={cn("text-lg font-bold leading-tight tabular-nums", textMap[color])}>{value}</p>
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      {sub && <p className={cn("text-[10px]", textMap[color])}>{sub}</p>}
    </div>
  );
}

export function PackageFinancialSummaryCard({ departures, packageName }: Props) {
  const queryClient = useQueryClient();
  const [showBreakdown, setShowBreakdown] = useState(false);

  const departureIds = departures.map(d => d.id);

  const { data: rows, isLoading } = useQuery<FinancialSummaryRow[]>({
    queryKey: ["pkg-financial-summary", ...departureIds],
    queryFn: async () => {
      if (!departureIds.length) return [];
      const db = supabase as any;
      const { data, error } = await db
        .from("departure_financial_summary")
        .select("*")
        .in("departure_id", departureIds);
      if (error) throw error;
      return (data || []) as FinancialSummaryRow[];
    },
    enabled: departureIds.length > 0,
  });

  const recalcAll = useMutation({
    mutationFn: async () => {
      const db = supabase as any;
      const results = await Promise.allSettled(
        departureIds.map(id =>
          db.rpc("recalculate_departure_financial_summary", { p_departure_id: id })
        )
      );
      const failed = results.filter(r => r.status === "rejected").length;
      if (failed > 0) throw new Error(`${failed} keberangkatan gagal dihitung`);
    },
    onSuccess: () => {
      toast.success("Semua ringkasan keuangan berhasil diperbarui");
      queryClient.invalidateQueries({ queryKey: ["pkg-financial-summary"] });
      queryClient.invalidateQueries({ queryKey: ["departure-financial-summary"] });
    },
    onError: (e: any) => toast.error(e.message || "Gagal recalculate"),
  });

  const recalcOne = useMutation({
    mutationFn: async (departureId: string) => {
      const db = supabase as any;
      const { error } = await db.rpc("recalculate_departure_financial_summary", {
        p_departure_id: departureId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ringkasan keberangkatan diperbarui");
      queryClient.invalidateQueries({ queryKey: ["pkg-financial-summary"] });
      queryClient.invalidateQueries({ queryKey: ["departure-financial-summary"] });
    },
    onError: (e: any) => toast.error(e.message || "Gagal recalculate"),
  });

  if (departures.length === 0) return null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const noData = !rows || rows.length === 0;

  const totalHpp         = rows?.reduce((s, r) => s + (r.hpp_total        || 0), 0) ?? 0;
  const totalRevenue     = rows?.reduce((s, r) => s + (r.revenue_gross     || 0), 0) ?? 0;
  const totalGrossProfit = rows?.reduce((s, r) => s + (r.gross_profit      || 0), 0) ?? 0;
  const totalNetProfit   = rows?.reduce((s, r) => s + (r.net_profit        || 0), 0) ?? 0;
  const totalExpense     = rows?.reduce((s, r) => s + (r.expense_total     || 0), 0) ?? 0;
  const totalOtherRev    = rows?.reduce((s, r) => s + (r.other_revenue_total || 0), 0) ?? 0;
  const totalPax         = rows?.reduce((s, r) => s + (r.pax_confirmed     || 0), 0) ?? 0;

  const weightedMargin = totalRevenue > 0
    ? Math.round(((totalRevenue - totalHpp) / totalRevenue) * 100 * 10) / 10
    : 0;

  const isProfit   = totalNetProfit >= 0;
  const marginGood = weightedMargin >= 20;
  const marginOk   = weightedMargin >= 10;
  const marginColor = marginGood ? "green" : marginOk ? "orange" : "red";

  const calculatedCount = rows?.length ?? 0;
  const uncalculated    = departureIds.length - calculatedCount;

  const lastCalc = rows && rows.length > 0
    ? rows.reduce((latest, r) => {
        if (!r.last_calculated_at) return latest;
        if (!latest) return r.last_calculated_at;
        return r.last_calculated_at > latest ? r.last_calculated_at : latest;
      }, null as string | null)
    : null;

  return (
    <Card className={cn(
      "border-2 transition-colors",
      noData ? "border-dashed" : isProfit ? "border-green-200 dark:border-green-800" : "border-red-200 dark:border-red-800"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <BarChart3 className="h-5 w-5 text-primary shrink-0" />
            <div>
              <CardTitle className="text-base leading-tight">
                Ringkasan Keuangan Paket
              </CardTitle>
              {packageName && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{packageName}</p>
              )}
            </div>
            {!noData && (
              <Badge className={cn(
                "ml-1 text-[10px]",
                isProfit ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              )}>
                {isProfit
                  ? <><ArrowUpRight className="h-2.5 w-2.5 mr-0.5" />UNTUNG</>
                  : <><ArrowDownRight className="h-2.5 w-2.5 mr-0.5" />RUGI</>}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {uncalculated > 0 && (
              <Badge variant="secondary" className="text-[10px] text-amber-700 bg-amber-100">
                {uncalculated} belum dihitung
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => recalcAll.mutate()}
              disabled={recalcAll.isPending}
              className="h-8 text-xs"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", recalcAll.isPending && "animate-spin")} />
              {recalcAll.isPending ? "Menghitung..." : "Recalculate All"}
            </Button>
          </div>
        </div>

        <div className="text-[11px] text-muted-foreground flex gap-3 flex-wrap mt-1">
          <span>{departureIds.length} keberangkatan · {calculatedCount} sudah dihitung · {totalPax} jamaah aktif</span>
          {lastCalc && <span>· Terakhir: {new Date(lastCalc).toLocaleString("id-ID")}</span>}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {noData ? (
          <div className="py-8 text-center space-y-3">
            <DollarSign className="h-10 w-10 mx-auto opacity-30" />
            <p className="text-sm text-muted-foreground">
              Ringkasan keuangan belum dihitung.<br />
              Input HPP dan pengeluaran di bawah, lalu klik <strong>Recalculate All</strong>.
            </p>
          </div>
        ) : (
          <>
            {/* KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiBox
                label="Total HPP / Modal"
                value={fmt(totalHpp)}
                sub={totalExpense > 0 ? `+${fmt(totalExpense)} opex` : undefined}
                color="red"
                icon={<TrendingDown className="h-3.5 w-3.5 text-red-500" />}
              />
              <KpiBox
                label="Pendapatan Bruto"
                value={fmt(totalRevenue)}
                sub={totalOtherRev > 0 ? `+${fmt(totalOtherRev)} tambahan` : undefined}
                color="blue"
                icon={<DollarSign className="h-3.5 w-3.5 text-blue-500" />}
              />
              <KpiBox
                label="Laba Kotor"
                value={fmt(totalGrossProfit)}
                sub={`Gross margin ${weightedMargin}%`}
                color={totalGrossProfit >= 0 ? "green" : "red"}
                icon={<TrendingUp className="h-3.5 w-3.5" />}
              />
              <KpiBox
                label="Laba Bersih"
                value={fmt(totalNetProfit)}
                sub={`Margin bersih ${weightedMargin}%`}
                color={totalNetProfit >= 0 ? "green" : "red"}
                icon={totalNetProfit >= 0
                  ? <ArrowUpRight className="h-3.5 w-3.5 text-green-600" />
                  : <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />}
              />
            </div>

            {/* Summary bar */}
            <div className="rounded-lg bg-muted/40 px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
              <span className="text-muted-foreground text-xs">Total Biaya:</span>
              <span className="font-semibold text-red-600">{fmtFull(totalHpp + totalExpense)}</span>
              <span className="hidden sm:block w-px h-4 bg-border" />
              <span className="text-muted-foreground text-xs">Total Pendapatan:</span>
              <span className="font-semibold text-blue-700">{fmtFull(totalRevenue + totalOtherRev)}</span>
              <span className="hidden sm:block w-px h-4 bg-border" />
              <span className="text-muted-foreground text-xs">Net Margin:</span>
              <span className={cn("font-bold", marginGood ? "text-green-700" : marginOk ? "text-orange-600" : "text-red-600")}>
                {weightedMargin}%
              </span>
            </div>

            {/* Per-departure breakdown toggle */}
            <button
              onClick={() => setShowBreakdown(v => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              {showBreakdown ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {showBreakdown ? "Sembunyikan" : "Lihat"} rincian per keberangkatan
              <span className="text-[10px] bg-muted rounded px-1 py-0.5 ml-auto">{calculatedCount} keberangkatan</span>
            </button>

            {showBreakdown && (
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Keberangkatan</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Status</th>
                      <th className="text-right px-3 py-2 font-semibold text-muted-foreground">HPP</th>
                      <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Pendapatan</th>
                      <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Laba Kotor</th>
                      <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Laba Bersih</th>
                      <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Margin</th>
                      <th className="text-right px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {departures.map(dep => {
                      const row = rows?.find(r => r.departure_id === dep.id);
                      const depLabel = formatDate(dep.departure_date);
                      const statusCls = STATUS_COLORS[dep.status] || STATUS_COLORS.closed;
                      if (!row) {
                        return (
                          <tr key={dep.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-3 py-2 font-medium">{depLabel}</td>
                            <td className="px-3 py-2">
                              <span className={cn("text-[10px] rounded-full px-1.5 py-0.5 font-medium", statusCls)}>
                                {dep.status}
                              </span>
                            </td>
                            <td colSpan={4} className="px-3 py-2 text-center text-muted-foreground italic">
                              Belum dihitung
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">—</td>
                            <td className="px-2 py-2 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] px-2"
                                onClick={() => recalcOne.mutate(dep.id)}
                                disabled={recalcOne.isPending}
                              >
                                <RefreshCw className={cn("h-3 w-3 mr-1", recalcOne.isPending && "animate-spin")} />
                                Hitung
                              </Button>
                            </td>
                          </tr>
                        );
                      }
                      const gp = row.gross_profit;
                      const np = row.net_profit;
                      const mp = row.gross_margin_pct;
                      return (
                        <tr key={dep.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2 font-medium">{depLabel}</td>
                          <td className="px-3 py-2">
                            <span className={cn("text-[10px] rounded-full px-1.5 py-0.5 font-medium", statusCls)}>
                              {dep.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-red-600">{fmt(row.hpp_total)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-blue-700">{fmt(row.revenue_gross)}</td>
                          <td className={cn("px-3 py-2 text-right tabular-nums font-medium", gp >= 0 ? "text-green-700" : "text-red-600")}>
                            {fmt(gp)}
                          </td>
                          <td className={cn("px-3 py-2 text-right tabular-nums font-medium", np >= 0 ? "text-green-700" : "text-red-600")}>
                            {fmt(np)}
                          </td>
                          <td className={cn("px-3 py-2 text-right font-bold", mp >= 20 ? "text-green-700" : mp >= 10 ? "text-orange-600" : "text-red-600")}>
                            {mp}%
                          </td>
                          <td className="px-2 py-2 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] px-2"
                              onClick={() => recalcOne.mutate(dep.id)}
                              disabled={recalcOne.isPending}
                              title="Hitung ulang keberangkatan ini"
                            >
                              <RefreshCw className={cn("h-3 w-3", recalcOne.isPending && "animate-spin")} />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {rows && rows.length > 1 && (
                    <tfoot>
                      <tr className="bg-muted/50 font-semibold border-t-2">
                        <td className="px-3 py-2" colSpan={2}>Total</td>
                        <td className="px-3 py-2 text-right tabular-nums text-red-600">{fmt(totalHpp)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-blue-700">{fmt(totalRevenue)}</td>
                        <td className={cn("px-3 py-2 text-right tabular-nums", totalGrossProfit >= 0 ? "text-green-700" : "text-red-600")}>
                          {fmt(totalGrossProfit)}
                        </td>
                        <td className={cn("px-3 py-2 text-right tabular-nums", totalNetProfit >= 0 ? "text-green-700" : "text-red-600")}>
                          {fmt(totalNetProfit)}
                        </td>
                        <td className={cn("px-3 py-2 text-right font-bold", marginGood ? "text-green-700" : marginOk ? "text-orange-600" : "text-red-600")}>
                          {weightedMargin}%
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
