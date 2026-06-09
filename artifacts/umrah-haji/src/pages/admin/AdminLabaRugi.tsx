import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Download, RefreshCw } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = subMonths(new Date(), i);
  return { label: format(d, "MMMM yyyy", { locale: localeId }), value: format(d, "yyyy-MM") };
});

export default function AdminLabaRugi() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState(format(new Date(), "yyyy-MM"));
  const [compareMode, setCompareMode] = useState(false);

  const dateFrom = period + "-01";
  const dateTo = format(endOfMonth(new Date(period + "-01")), "yyyy-MM-dd");

  // Revenue — dari payments lunas
  const { data: payments = [], isLoading: loadPay } = useQuery({
    queryKey: ["pl-payments", dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("amount, payment_date")
        .eq("status", "verified")
        .gte("payment_date", dateFrom)
        .lte("payment_date", dateTo);
      return data || [];
    },
  });

  // HPP — biaya operasional vendor per keberangkatan
  const { data: vendorCosts = [], isLoading: loadVC } = useQuery({
    queryKey: ["pl-vendor-costs", dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("vendor_costs")
        .select("amount, cost_type, created_at")
        .gte("created_at", dateFrom)
        .lte("created_at", dateTo);
      return data || [];
    },
  });

  // Biaya operasional — dari cash_transactions type=out
  const { data: cashOut = [], isLoading: loadCash } = useQuery({
    queryKey: ["pl-cash-out", dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("cash_transactions")
        .select("amount, category, description, transaction_date")
        .eq("type", "out")
        .gte("transaction_date", dateFrom)
        .lte("transaction_date", dateTo);
      return data || [];
    },
  });

  // Pendapatan lain dari cash_transactions type=in
  const { data: cashIn = [], isLoading: loadCashIn } = useQuery({
    queryKey: ["pl-cash-in", dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("cash_transactions")
        .select("amount, category, description, transaction_date")
        .eq("type", "in")
        .gte("transaction_date", dateFrom)
        .lte("transaction_date", dateTo);
      return data || [];
    },
  });

  const isLoading = loadPay || loadVC || loadCash || loadCashIn;

  // Calculate P&L
  const revenue = payments.reduce((s: number, p: any) => s + (p.amount || 0), 0);
  const otherIncome = cashIn.reduce((s: number, c: any) => s + (c.amount || 0), 0);
  const totalRevenue = revenue + otherIncome;

  const hpp = vendorCosts.reduce((s: number, v: any) => s + (v.amount || 0), 0);
  const grossProfit = totalRevenue - hpp;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // Group expenses by category
  const expenseByCategory = cashOut.reduce((acc: Record<string, number>, c: any) => {
    const key = c.category || "other_expense";
    acc[key] = (acc[key] || 0) + (c.amount || 0);
    return acc;
  }, {});
  const totalExpenses = Object.values(expenseByCategory).reduce((s: number, v: any) => s + v, 0);
  const netProfit = grossProfit - totalExpenses;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const CATEGORY_LABELS: Record<string, string> = {
    operational: "Biaya Operasional",
    marketing: "Marketing & Promosi",
    salary: "Gaji & Tunjangan",
    utilities: "Utilitas & Listrik",
    rent: "Sewa Kantor",
    other_expense: "Biaya Lainnya",
  };

  const Row = ({ label, value, indent = false, bold = false, highlight = "" }: any) => (
    <div className={`flex justify-between py-1.5 ${indent ? "pl-6" : ""} ${bold ? "font-bold" : ""} ${highlight}`}>
      <span className="text-sm">{label}</span>
      <span className={`text-sm font-medium tabular-nums ${value < 0 ? "text-red-600" : ""}`}>{fmt(value)}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {netProfit >= 0 ? <TrendingUp className="h-6 w-6 text-green-600" /> : <TrendingDown className="h-6 w-6 text-red-500" />}
            Laporan Laba Rugi
          </h1>
          <p className="text-muted-foreground">Income Statement — pendapatan, HPP, dan beban usaha</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["pl-payments", "pl-vendor-costs", "pl-cash-out", "pl-cash-in"] })}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Pendapatan</p>
            <p className="text-xl font-bold text-blue-700">{fmt(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">HPP + Beban</p>
            <p className="text-xl font-bold text-orange-700">{fmt(hpp + totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card className={netProfit >= 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Laba Bersih</p>
            <p className={`text-xl font-bold ${netProfit >= 0 ? "text-green-700" : "text-red-600"}`}>{fmt(netProfit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Net Margin</p>
            <p className={`text-xl font-bold ${netMargin >= 0 ? "text-green-600" : "text-red-600"}`}>
              {netMargin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* P&L Statement */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Laporan Laba Rugi — {format(new Date(period + "-01"), "MMMM yyyy", { locale: localeId })}
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {isLoading ? (
            <div className="space-y-2 py-4">{Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-6" />)}</div>
          ) : (
            <>
              {/* Pendapatan */}
              <div className="py-3">
                <p className="text-xs font-bold uppercase text-muted-foreground mb-2">A. PENDAPATAN USAHA</p>
                <Row label="Penerimaan dari Booking Jamaah" value={revenue} indent />
                <Row label="Pendapatan Lain-lain (Kas Masuk)" value={otherIncome} indent />
                <Separator className="my-1" />
                <Row label="Total Pendapatan" value={totalRevenue} bold highlight="bg-blue-50/50 rounded px-1" />
              </div>

              {/* HPP */}
              <div className="py-3">
                <p className="text-xs font-bold uppercase text-muted-foreground mb-2">B. HARGA POKOK PENJUALAN (HPP)</p>
                <Row label="Biaya Operasional Perjalanan (Vendor)" value={hpp} indent />
                <Separator className="my-1" />
                <Row label="Total HPP" value={hpp} bold />
                <div className="flex justify-between py-1.5 font-bold">
                  <span className="text-sm">Laba Kotor (Gross Profit)</span>
                  <span className={`text-sm tabular-nums ${grossProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {fmt(grossProfit)} ({grossMargin.toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* Biaya Operasional */}
              <div className="py-3">
                <p className="text-xs font-bold uppercase text-muted-foreground mb-2">C. BEBAN OPERASIONAL</p>
                {Object.entries(expenseByCategory).map(([key, val]: any) => (
                  <Row key={key} label={CATEGORY_LABELS[key] || key} value={val} indent />
                ))}
                {Object.keys(expenseByCategory).length === 0 && (
                  <p className="text-sm text-muted-foreground pl-6 py-1">Tidak ada beban operasional periode ini</p>
                )}
                <Separator className="my-1" />
                <Row label="Total Beban Operasional" value={totalExpenses} bold />
              </div>

              {/* Laba Bersih */}
              <div className="py-3">
                <div className={`flex justify-between py-2 px-3 rounded-lg font-bold text-lg ${netProfit >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                  <span>LABA BERSIH (Net Profit)</span>
                  <span className="tabular-nums">{fmt(netProfit)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 text-right">Net Margin: {netMargin.toFixed(2)}%</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
