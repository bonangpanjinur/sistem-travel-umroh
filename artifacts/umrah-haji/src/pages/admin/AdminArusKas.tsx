import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { format, subMonths, endOfMonth } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = subMonths(new Date(), i);
  return { label: format(d, "MMMM yyyy", { locale: localeId }), value: format(d, "yyyy-MM") };
});

const Row = ({ label, value, indent = false, bold = false }: any) => (
  <div className={`flex justify-between py-1.5 ${indent ? "pl-6" : ""} ${bold ? "font-bold border-t mt-1 pt-2" : ""}`}>
    <span className={`${bold ? "text-sm" : "text-sm text-muted-foreground"}`}>{label}</span>
    <span className={`text-sm tabular-nums font-medium ${value < 0 ? "text-red-600" : value > 0 ? "text-green-600" : ""}`}>{fmt(value)}</span>
  </div>
);

export default function AdminArusKas() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState(format(new Date(), "yyyy-MM"));

  const dateFrom = period + "-01";
  const dateTo = format(endOfMonth(new Date(period + "-01")), "yyyy-MM-dd");

  // Penerimaan dari booking (payments verified)
  const { data: bookingIn = 0, isLoading: l1 } = useQuery({
    queryKey: ["cf-booking-in", dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase.from("payments").select("amount").eq("status", "verified").gte("payment_date", dateFrom).lte("payment_date", dateTo);
      return (data || []).reduce((s: number, p: any) => s + (p.amount || 0), 0);
    },
  });

  // Pembayaran ke vendor (vendor_costs yang dibayar)
  const { data: vendorOut = 0, isLoading: l2 } = useQuery({
    queryKey: ["cf-vendor-out", dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await (supabase as any).from("vendor_costs").select("paid_amount").eq("status", "paid").gte("paid_at", dateFrom).lte("paid_at", dateTo);
      return (data || []).reduce((s: number, v: any) => s + (v.paid_amount || 0), 0);
    },
  });

  // Kas masuk lainnya
  const { data: cashIn = 0, isLoading: l3 } = useQuery({
    queryKey: ["cf-cash-in", dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await (supabase as any).from("cash_transactions").select("amount").eq("type", "in").gte("transaction_date", dateFrom).lte("transaction_date", dateTo);
      return (data || []).reduce((s: number, c: any) => s + (c.amount || 0), 0);
    },
  });

  // Kas keluar (biaya operasional)
  const { data: cashOutData = [], isLoading: l4 } = useQuery({
    queryKey: ["cf-cash-out", dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await (supabase as any).from("cash_transactions").select("amount, category").eq("type", "out").gte("transaction_date", dateFrom).lte("transaction_date", dateTo);
      return data || [];
    },
  });

  // Pengeluaran lapangan keberangkatan (departure_expenses — realisasi biaya perjalanan)
  const { data: depExpOut = 0, isLoading: l6 } = useQuery({
    queryKey: ["cf-dep-expenses", dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("departure_expenses")
        .select("amount_idr")
        .gte("expense_date", dateFrom)
        .lte("expense_date", dateTo);
      return ((data || []) as any[]).reduce((s, e) => s + (e.amount_idr || 0), 0);
    },
  });

  // 6-month trend for chart
  const { data: trendData = [], isLoading: l5 } = useQuery({
    queryKey: ["cf-trend"],
    queryFn: async () => {
      const results = await Promise.all(
        Array.from({ length: 6 }, (_, i) => {
          const d = subMonths(new Date(), 5 - i);
          const from = format(d, "yyyy-MM") + "-01";
          const to = format(endOfMonth(d), "yyyy-MM-dd");
          return Promise.all([
            supabase.from("payments").select("amount").eq("status", "verified").gte("payment_date", from).lte("payment_date", to),
            (supabase as any).from("cash_transactions").select("amount").eq("type", "out").gte("transaction_date", from).lte("transaction_date", to),
          ]).then(([inData, outData]) => ({
            bulan: format(d, "MMM", { locale: localeId }),
            "Kas Masuk": ((inData.data || []) as any[]).reduce((s, r) => s + r.amount, 0) / 1e6,
            "Kas Keluar": ((outData.data || []) as any[]).reduce((s, r) => s + r.amount, 0) / 1e6,
          }));
        })
      );
      return results;
    },
  });

  const isLoading = l1 || l2 || l3 || l4 || l6;

  const totalCashOut = cashOutData.reduce((s: number, c: any) => s + (c.amount || 0), 0);
  const salary = cashOutData.filter((c: any) => c.category === "salary").reduce((s: number, c: any) => s + c.amount, 0);
  const operational = cashOutData.filter((c: any) => c.category === "operational").reduce((s: number, c: any) => s + c.amount, 0);
  const otherOut = totalCashOut - salary - operational;

  const operasionalNet = bookingIn + cashIn - vendorOut - totalCashOut - (depExpOut as number);
  const investasiNet = 0;
  const pendanaanNet = 0;
  const netCF = operasionalNet + investasiNet + pendanaanNet;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6" /> Laporan Arus Kas</h1>
          <p className="text-muted-foreground">Cash Flow Statement — operasional, investasi, pendanaan</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Kas Masuk</p>
            <p className="text-xl font-bold text-green-700">{fmt(bookingIn + cashIn)}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Kas Keluar</p>
            <p className="text-xl font-bold text-red-600">{fmt(vendorOut + totalCashOut)}</p>
          </CardContent>
        </Card>
        <Card className={netCF >= 0 ? "border-blue-200 bg-blue-50" : "border-orange-200 bg-orange-50"}>
          <CardContent className="p-4">
            <div className="flex items-center gap-1">
              {netCF >= 0 ? <TrendingUp className="h-4 w-4 text-blue-600" /> : <TrendingDown className="h-4 w-4 text-orange-600" />}
              <p className="text-xs text-muted-foreground">Net Cash Flow</p>
            </div>
            <p className={`text-xl font-bold ${netCF >= 0 ? "text-blue-700" : "text-orange-700"}`}>{fmt(netCF)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Arus Operasional</p>
            <p className={`text-xl font-bold ${operasionalNet >= 0 ? "text-green-700" : "text-red-600"}`}>{fmt(operasionalNet)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Flow Statement */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Laporan Arus Kas — {format(new Date(period + "-01"), "MMMM yyyy", { locale: localeId })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-6" />)}</div>
            ) : (
              <>
                <p className="text-xs font-bold uppercase text-muted-foreground mb-1">I. ARUS KAS OPERASIONAL</p>
                <Row label="Penerimaan dari Jamaah (booking)" value={bookingIn} indent />
                <Row label="Pendapatan Kas Lainnya" value={cashIn} indent />
                <Row label="Pembayaran ke Vendor" value={-vendorOut} indent />
                {(depExpOut as number) > 0 && (
                  <Row label="Pengeluaran Keberangkatan (Lapangan)" value={-(depExpOut as number)} indent />
                )}
                <Row label="Biaya Gaji & Upah" value={-salary} indent />
                <Row label="Biaya Operasional Kantor" value={-operational} indent />
                <Row label="Biaya Lainnya" value={-otherOut} indent />
                <Row label="Net Arus Kas Operasional" value={operasionalNet} bold />

                <div className="mt-4">
                  <p className="text-xs font-bold uppercase text-muted-foreground mb-1">II. ARUS KAS INVESTASI</p>
                  <Row label="Pembelian Aset Tetap" value={0} indent />
                  <Row label="Net Arus Kas Investasi" value={investasiNet} bold />
                </div>

                <div className="mt-4">
                  <p className="text-xs font-bold uppercase text-muted-foreground mb-1">III. ARUS KAS PENDANAAN</p>
                  <Row label="Setoran Modal" value={0} indent />
                  <Row label="Cicilan Hutang" value={0} indent />
                  <Row label="Net Arus Kas Pendanaan" value={pendanaanNet} bold />
                </div>

                <Separator className="my-3" />
                <div className={`flex justify-between py-2 px-3 rounded-lg font-bold ${netCF >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                  <span>NET CASH FLOW</span>
                  <span className="tabular-nums">{fmt(netCF)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Chart 6 bulan */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tren 6 Bulan (Juta Rp)</CardTitle>
          </CardHeader>
          <CardContent>
            {l5 ? (
              <Skeleton className="h-52" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="bulan" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => `Rp ${v.toFixed(1)}jt`} />
                  <Legend iconSize={10} />
                  <Bar dataKey="Kas Masuk" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Kas Keluar" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
