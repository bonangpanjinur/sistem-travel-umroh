import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  TrendingUp, TrendingDown, DollarSign, Users, RefreshCw,
  ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}Jt`;
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

function fmtFull(n: number) {
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

function PLRow({
  label, value, sub, color = "default", indent = false, bold = false, separator = false,
}: {
  label: string; value: number; sub?: string;
  color?: "default" | "green" | "red" | "orange" | "blue";
  indent?: boolean; bold?: boolean; separator?: boolean;
}) {
  const colorClass = {
    default: "text-foreground",
    green:   "text-green-700",
    red:     "text-red-600",
    orange:  "text-orange-600",
    blue:    "text-blue-700",
  }[color];

  return (
    <div className={cn(
      "flex items-start justify-between py-2",
      separator && "border-t-2 border-dashed mt-1 pt-3",
      indent && "pl-5",
    )}>
      <div>
        <span className={cn("text-sm", bold ? "font-semibold" : "text-muted-foreground", indent && "text-xs")}>{label}</span>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <span className={cn("text-sm font-mono tabular-nums", bold ? "font-bold text-base" : "", colorClass)}>
        {fmtFull(value)}
      </span>
    </div>
  );
}

interface Props {
  departureId: string;
  departureLabel?: string;
  paxCount?: number;
  quota?: number;
}

export function DeparturePLSummaryCard({ departureId, departureLabel, paxCount = 0, quota = 0 }: Props) {
  const queryClient = useQueryClient();

  const { data: summary, isLoading } = useQuery({
    queryKey: ["departure-financial-summary", departureId],
    queryFn: async () => {
      const db = supabase as any;
      const { data, error } = await db
        .from("departure_financial_summary")
        .select("*")
        .eq("departure_id", departureId)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    },
  });

  const recalcMutation = useMutation({
    mutationFn: async () => {
      const db = supabase as any;
      const { error } = await db.rpc("recalculate_departure_financial_summary", {
        p_departure_id: departureId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ringkasan keuangan diperbarui");
      queryClient.invalidateQueries({ queryKey: ["departure-financial-summary", departureId] });
    },
    onError: (e: any) => toast.error(e.message || "Gagal recalculate"),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-48 w-full" /></CardContent>
      </Card>
    );
  }

  // If no summary yet, show a prompt to calculate
  if (!summary) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center space-y-3">
          <DollarSign className="h-10 w-10 mx-auto opacity-30" />
          <p className="text-sm text-muted-foreground">
            Ringkasan keuangan belum dihitung.<br />
            Input HPP dan pengeluaran terlebih dahulu, lalu klik hitung.
          </p>
          <Button onClick={() => recalcMutation.mutate()} disabled={recalcMutation.isPending}>
            {recalcMutation.isPending ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Menghitung...</> : <><RefreshCw className="h-4 w-4 mr-2" /> Hitung Sekarang</>}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const {
    pax_confirmed, revenue_gross, revenue_paid, revenue_outstanding, revenue_refunded,
    hpp_total, expense_total, other_revenue_total,
    gross_profit, net_profit, gross_margin_pct,
  } = summary;

  const isProfit = net_profit >= 0;
  const marginColor = gross_margin_pct >= 20 ? "green" : gross_margin_pct >= 10 ? "orange" : "red";

  return (
    <Card className={cn("border-2", isProfit ? "border-green-200" : "border-red-200")}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-5 w-5 text-primary" />
            Laporan Laba / Rugi
            {departureLabel && <span className="text-sm font-normal text-muted-foreground">— {departureLabel}</span>}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={cn(
              isProfit ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-red-100 text-red-800 hover:bg-red-100",
            )}>
              {isProfit
                ? <><ArrowUpRight className="h-3 w-3 mr-1" /> UNTUNG</>
                : <><ArrowDownRight className="h-3 w-3 mr-1" /> RUGI</>}
            </Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => recalcMutation.mutate()} disabled={recalcMutation.isPending} title="Hitung ulang">
              <RefreshCw className={cn("h-4 w-4", recalcMutation.isPending && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{pax_confirmed}</p>
            <p className="text-[10px] text-muted-foreground">Jamaah Aktif</p>
            {quota > 0 && <p className="text-[10px] text-muted-foreground">dari {quota} kuota</p>}
          </div>
          <div className="rounded-lg bg-blue-50 p-3 text-center">
            <p className="text-lg font-bold text-blue-700">{fmt(revenue_gross)}</p>
            <p className="text-[10px] text-muted-foreground">Pendapatan Bruto</p>
            <p className="text-[10px] text-blue-600">{fmt(revenue_paid)} terbayar</p>
          </div>
          <div className="rounded-lg bg-destructive/10 p-3 text-center">
            <p className="text-lg font-bold text-destructive">{fmt(hpp_total + expense_total)}</p>
            <p className="text-[10px] text-muted-foreground">Total Biaya</p>
            <p className="text-[10px] text-muted-foreground">HPP + Pengeluaran</p>
          </div>
          <div className={cn("rounded-lg p-3 text-center", isProfit ? "bg-green-50" : "bg-red-50")}>
            <p className={cn("text-lg font-bold", isProfit ? "text-green-700" : "text-red-600")}>{fmt(net_profit)}</p>
            <p className="text-[10px] text-muted-foreground">Laba Bersih</p>
            <p className={cn("text-[10px] font-medium", isProfit ? "text-green-600" : "text-red-500")}>
              Margin {gross_margin_pct}%
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* P&L Detail */}
        <div className="rounded-lg border bg-muted/20 p-4 divide-y divide-dashed">
          <PLRow
            label="(+) Pendapatan Bruto" value={revenue_gross} color="blue"
            sub={`${pax_confirmed} jamaah • ${fmtFull(revenue_paid)} terbayar • ${fmtFull(revenue_outstanding)} piutang`}
            bold
          />
          {other_revenue_total > 0 && (
            <PLRow label="(+) Pendapatan Tambahan" value={other_revenue_total} color="green"
              sub="Upgrade, addon, dll." indent />
          )}
          <PLRow label="(-) HPP / Modal" value={-hpp_total} color="red"
            sub="Tiket, hotel, visa, guide, perlengkapan, dll." bold />
          {expense_total > 0 && (
            <PLRow label="(-) Pengeluaran Operasional" value={-expense_total} color="orange"
              sub="Pengeluaran aktual di lapangan" indent />
          )}

          {/* Gross Profit line */}
          <PLRow label="= Laba Kotor" value={gross_profit}
            color={gross_profit >= 0 ? "green" : "red"}
            sub={`Margin: ${gross_margin_pct}%`}
            separator bold
          />

          {/* Net Profit */}
          {expense_total > 0 && (
            <PLRow label="= Laba Bersih" value={net_profit}
              color={net_profit >= 0 ? "green" : "red"}
              bold separator
            />
          )}
        </div>

        {/* Outstanding & Refund info */}
        {(revenue_outstanding > 0 || revenue_refunded > 0) && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {revenue_outstanding > 0 && (
              <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-2 text-center">
                <p className="text-xs font-medium text-yellow-800">Piutang Belum Lunas</p>
                <p className="text-sm font-bold text-yellow-700">{fmtFull(revenue_outstanding)}</p>
              </div>
            )}
            {revenue_refunded > 0 && (
              <div className="rounded-lg bg-gray-50 border p-2 text-center">
                <p className="text-xs font-medium text-muted-foreground">Total Refund</p>
                <p className="text-sm font-bold">{fmtFull(revenue_refunded)}</p>
              </div>
            )}
          </div>
        )}

        {summary.last_calculated_at && (
          <p className="text-[10px] text-muted-foreground mt-3 text-right">
            Dihitung: {new Date(summary.last_calculated_at).toLocaleString("id-ID")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
