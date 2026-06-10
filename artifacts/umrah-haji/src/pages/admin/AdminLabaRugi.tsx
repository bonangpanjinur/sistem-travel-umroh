import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Download, RefreshCw, Info } from "lucide-react";
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

  // HPP — biaya vendor (AP) per keberangkatan
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

  // HPP Realisasi — dari departure_expenses (biaya lapangan aktual)
  const { data: depExpenses = [], isLoading: loadDepExp } = useQuery({
    queryKey: ["pl-departure-expenses", dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("departure_expenses")
        .select("amount_idr, category, expense_date")
        .gte("expense_date", dateFrom)
        .lte("expense_date", dateTo);
      return data || [];
    },
  });

  // Biaya SDM — dari payroll_records (penggajian terproses)
  const [periodYear2, periodMonth2] = period.split("-").map(Number);
  const { data: payrollData = [], isLoading: loadPayroll } = useQuery({
    queryKey: ["pl-payroll", periodYear2, periodMonth2],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("payroll_records")
        .select("net_salary, gross_salary, period_month, period_year, status")
        .eq("period_year", periodYear2)
        .eq("period_month", periodMonth2)
        .eq("status", "paid");
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

  const isLoading = loadPay || loadVC || loadCash || loadCashIn || loadDepExp || loadPayroll;

  // Calculate P&L
  const revenue = payments.reduce((s: number, p: any) => s + (p.amount || 0), 0);
  const otherIncome = cashIn.reduce((s: number, c: any) => s + (c.amount || 0), 0);
  const totalRevenue = revenue + otherIncome;

  // HPP Vendor (AP terdaftar ke vendor)
  const hppVendor = vendorCosts.reduce((s: number, v: any) => s + (v.amount || 0), 0);

  // HPP Realisasi Lapangan (dari departure_expenses)
  const hppLapangan = depExpenses.reduce((s: number, e: any) => s + (e.amount_idr || 0), 0);

  // Group departure_expenses by category
  const depExpByCategory = depExpenses.reduce((acc: Record<string, number>, e: any) => {
    const key = e.category || "other";
    acc[key] = (acc[key] || 0) + (e.amount_idr || 0);
    return acc;
  }, {});

  const totalHPP = hppVendor + hppLapangan;
  const grossProfit = totalRevenue - totalHPP;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // Payroll data (dari modul payroll)
  const payrollTotal = payrollData.reduce((s: number, r: any) => s + (r.net_salary || 0), 0);
  const hasPayrollData = payrollData.length > 0;

  // Group cash_out by category — exclude 'salary' jika payroll data tersedia
  const expenseByCategory = cashOut.reduce((acc: Record<string, number>, c: any) => {
    const key = c.category || "other_expense";
    // Jika ada data payroll, skip entri 'salary' dari cash_transactions (hindari double count)
    if (hasPayrollData && key === "salary") return acc;
    acc[key] = (acc[key] || 0) + (c.amount || 0);
    return acc;
  }, {});

  const totalCashExpenses = Object.values(expenseByCategory).reduce((s: number, v: any) => s + v, 0);
  // Biaya gaji: dari payroll jika ada, fallback ke cash_transactions.salary
  const salaryCashOnly = hasPayrollData ? 0 : cashOut
    .filter((c: any) => c.category === "salary")
    .reduce((s: number, c: any) => s + (c.amount || 0), 0);
  const totalGajiBeban = hasPayrollData ? payrollTotal : salaryCashOnly;
  const totalExpenses = totalCashExpenses + (hasPayrollData ? payrollTotal : 0);
  const netProfit = grossProfit - totalExpenses;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const CATEGORY_LABELS: Record<string, string> = {
    operational: "Biaya Operasional Kantor",
    marketing: "Marketing & Promosi",
    salary: "Gaji & Tunjangan",
    utilities: "Utilitas & Listrik",
    rent: "Sewa Kantor",
    other_expense: "Biaya Lainnya",
  };

  const DEP_EXP_LABELS: Record<string, string> = {
    airline_ticket: "Tiket Penerbangan",
    hotel: "Akomodasi Hotel",
    transport: "Transportasi",
    visa_fee: "Biaya Visa",
    guide: "Pemandu / Muthawif",
    meals: "Konsumsi / Katering",
    tips: "Tips & Gratifikasi",
    souvenir: "Souvenir Jamaah",
    printing: "Cetak & ATK",
    refund: "Refund Jamaah",
    medical: "Kesehatan / Medis",
    operational: "Operasional Lapangan",
    other: "Biaya Lainnya",
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
            <p className="text-xl font-bold text-orange-700">{fmt(totalHPP + totalExpenses)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Vendor + Lapangan + Overhead</p>
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
                <p className="text-xs text-muted-foreground pl-1 mb-1.5">B.1 — Biaya Vendor (AP Terdaftar)</p>
                <Row label="Biaya Operasional Perjalanan (Vendor)" value={hppVendor} indent />
                {hppLapangan > 0 && (
                  <>
                    <p className="text-xs text-muted-foreground pl-1 mt-2 mb-1.5">B.2 — Realisasi Biaya Lapangan</p>
                    {Object.entries(depExpByCategory).map(([key, val]: any) => (
                      <Row key={key} label={DEP_EXP_LABELS[key] || key} value={val} indent />
                    ))}
                  </>
                )}
                <Separator className="my-1" />
                <Row label="Total HPP (Vendor + Lapangan)" value={totalHPP} bold />
                <div className="flex justify-between py-1.5 font-bold">
                  <span className="text-sm">Laba Kotor (Gross Profit)</span>
                  <span className={`text-sm tabular-nums ${grossProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {fmt(grossProfit)} ({grossMargin.toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* Biaya Operasional */}
              <div className="py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase text-muted-foreground">C. BEBAN OPERASIONAL</p>
                  {hasPayrollData && (
                    <Badge variant="outline" className="text-xs text-green-700 border-green-300">
                      <Info className="h-3 w-3 mr-1" />
                      Gaji dari Modul Payroll
                    </Badge>
                  )}
                </div>
                {/* Gaji dari payroll jika ada, atau dari cash_transactions */}
                {(totalGajiBeban > 0) && (
                  <Row
                    label={hasPayrollData ? "Gaji Karyawan (Modul Payroll — Net)" : "Gaji & Tunjangan"}
                    value={totalGajiBeban}
                    indent
                  />
                )}
                {Object.entries(expenseByCategory).map(([key, val]: any) => (
                  <Row key={key} label={CATEGORY_LABELS[key] || key} value={val} indent />
                ))}
                {(Object.keys(expenseByCategory).length === 0 && !hasPayrollData) && (
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
