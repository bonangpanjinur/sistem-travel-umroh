import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import {
  TrendingUp, TrendingDown, DollarSign, CreditCard, Wallet,
  BarChart3, ArrowUpRight, ArrowDownRight, Target, AlertTriangle,
  ArrowRight, Layers, RefreshCw, Package, Users, Trophy, ThumbsDown,
  Building2, CheckCircle2
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from "recharts";
import {
  format, startOfMonth, endOfMonth, subMonths,
  differenceInDays, parseISO
} from "date-fns";
import { formatCurrency } from "@/lib/format";

const MONTHS_LABEL = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const COST_TYPE_LABELS: Record<string, string> = {
  ACCOMMODATION: "Hotel & Akomodasi",
  FLIGHT: "Tiket Pesawat",
  VISA: "Visa",
  MEALS: "Konsumsi",
  TRANSPORT: "Transportasi",
  OTHER: "Lain-lain",
  operational: "Operasional",
  marketing: "Marketing",
  salary: "Gaji",
  utilities: "Utilitas",
  rent: "Sewa",
  other_expense: "Pengeluaran Lain",
};

const COST_COLORS = [
  "bg-primary", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-purple-500", "bg-orange-400", "bg-teal-500",
];

function pct(current: number, prev: number) {
  if (!prev) return 0;
  return ((current - prev) / prev) * 100;
}

function TrendBadge({ current, prev }: { current: number; prev: number }) {
  const p = pct(current, prev);
  const up = p >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? "text-emerald-600" : "text-red-500"}`}>
      {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      {Math.abs(p).toFixed(1)}%
    </span>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-muted/60 rounded-lg shadow-md p-3 text-sm">
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((p: any) =>
        p.value !== null && p.value !== undefined ? (
          <p key={p.dataKey} style={{ color: p.color }} className="flex justify-between gap-4">
            <span>{p.name}</span>
            <span className="font-semibold">{formatCurrency(p.value)}</span>
          </p>
        ) : null
      )}
    </div>
  );
};

function StatSkeleton() {
  return <Skeleton className="h-8 w-36 mt-1" />;
}

// Margin badge helper
function MarginBadge({ pct }: { pct: number }) {
  if (pct >= 20) return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">{pct.toFixed(1)}%</Badge>;
  if (pct >= 10) return <Badge className="bg-blue-100 text-blue-700 border-blue-300">{pct.toFixed(1)}%</Badge>;
  if (pct >= 0)  return <Badge className="bg-amber-100 text-amber-700 border-amber-300">{pct.toFixed(1)}%</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-300">{pct.toFixed(1)}%</Badge>;
}

export default function AdminFinanceTerpadu() {
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const yearNum = parseInt(year);
  const now = new Date();
  const yearStart = `${yearNum}-01-01`;
  const yearEnd   = `${yearNum}-12-31`;

  const currentMonthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const currentMonthEnd   = format(endOfMonth(now),   "yyyy-MM-dd");
  const prevMonthStart    = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
  const prevMonthEnd      = format(endOfMonth(subMonths(now, 1)),   "yyyy-MM-dd");

  // ── Query 1: Existing financial data ──────────────────────────────────────
  const { data: rawData, isLoading, refetch } = useQuery({
    queryKey: ["finance-terpadu-real", year],
    queryFn: async () => {
      const [
        paymentsRes, prevPaymentsRes, cashTxRes,
        outstandingRes, vendorCostsRes, prevCashTxRes,
      ] = await Promise.all([
        supabase.from("payments").select("amount, verified_at, created_at")
          .eq("status", "paid")
          .gte("verified_at", `${yearStart}T00:00:00.000Z`)
          .lte("verified_at", `${yearEnd}T23:59:59.999Z`),

        supabase.from("payments").select("amount, verified_at")
          .eq("status", "paid")
          .gte("verified_at", `${prevMonthStart}T00:00:00.000Z`)
          .lte("verified_at", `${prevMonthEnd}T23:59:59.999Z`),

        supabase.from("cash_transactions").select("amount, transaction_type, category, transaction_date")
          .gte("transaction_date", yearStart)
          .lte("transaction_date", yearEnd),

        supabase.from("bookings").select("remaining_amount, created_at, payment_deadline, booking_status")
          .gt("remaining_amount", 0)
          .not("booking_status", "eq", "cancelled")
          .not("booking_status", "eq", "refunded"),

        supabase.from("vendor_costs").select("amount, paid_amount, cost_type, status, created_at")
          .gte("created_at", `${yearStart}T00:00:00.000Z`)
          .lte("created_at", `${yearEnd}T23:59:59.999Z`),

        supabase.from("cash_transactions").select("amount, transaction_type")
          .eq("transaction_type", "expense")
          .gte("transaction_date", prevMonthStart)
          .lte("transaction_date", prevMonthEnd),
      ]);
      return {
        payments:     paymentsRes.data     ?? [],
        prevPayments: prevPaymentsRes.data ?? [],
        cashTx:       cashTxRes.data       ?? [],
        outstanding:  outstandingRes.data  ?? [],
        vendorCosts:  vendorCostsRes.data  ?? [],
        prevCashTx:   prevCashTxRes.data   ?? [],
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Query 2: v_financial_summary — HPP Plan vs Realisasi per keberangkatan ─
  const { data: departureSummaries = [], isLoading: loadingDep } = useQuery({
    queryKey: ["finance-terpadu-departures", year],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("v_financial_summary")
        .select("departure_id, departure_date, package_name, booked_count, quota, revenue_plan, revenue_realized, hpp_planned, hpp_realized, vendor_cost_total, gross_margin_plan, gross_margin_realized")
        .gte("departure_date", yearStart)
        .lte("departure_date", yearEnd)
        .order("departure_date", { ascending: true });
      return (data ?? []) as {
        departure_id: string;
        departure_date: string;
        package_name: string;
        booked_count: number;
        quota: number;
        revenue_plan: number;
        revenue_realized: number;
        hpp_planned: number;
        hpp_realized: number;
        vendor_cost_total: number;
        gross_margin_plan: number;
        gross_margin_realized: number;
      }[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Query 3: payroll_records — biaya SDM per bulan ────────────────────────
  const { data: payrollData = [], isLoading: loadingPayroll } = useQuery({
    queryKey: ["finance-terpadu-payroll", year],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("payroll_records")
        .select("period_month, period_year, gross_salary, net_salary, pph21_amount, status, employee_id")
        .eq("period_year", yearNum)
        .in("status", ["paid", "processed"]);
      return (data ?? []) as {
        period_month: number;
        period_year: number;
        gross_salary: number;
        net_salary: number;
        pph21_amount: number;
        status: string;
        employee_id: string;
      }[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Computed: existing ────────────────────────────────────────────────────
  const computed = useMemo(() => {
    if (!rawData) return null;
    const { payments, prevPayments, cashTx, outstanding, vendorCosts, prevCashTx } = rawData;

    const totalRevenue = payments.reduce((s, p) => s + (p.amount ?? 0), 0);
    const prevRevenue  = prevPayments.reduce((s, p) => s + (p.amount ?? 0), 0);

    const expenseCashTx = cashTx.filter(t => t.transaction_type === "expense");
    const totalOperationalExpenses = expenseCashTx.reduce((s, t) => s + (t.amount ?? 0), 0);
    const totalVendorCosts         = vendorCosts.reduce((s, v) => s + (v.amount ?? 0), 0);
    const totalExpenses            = totalOperationalExpenses + totalVendorCosts;
    const prevExpenses             = prevCashTx.reduce((s, t) => s + (t.amount ?? 0), 0);
    const prevProfit               = prevRevenue - prevExpenses;
    const netProfit                = totalRevenue - totalExpenses;
    const totalOutstanding         = outstanding.reduce((s, b) => s + (b.remaining_amount ?? 0), 0);
    const allIncome                = cashTx.filter(t => t.transaction_type === "income").reduce((s, t) => s + (t.amount ?? 0), 0);
    const allExpensesCash          = expenseCashTx.reduce((s, t) => s + (t.amount ?? 0), 0);
    const cashBalance              = allIncome - allExpensesCash;

    const monthlyData = MONTHS_LABEL.map((month, i) => {
      const monthStr        = String(i + 1).padStart(2, "0");
      const isPastOrCurrent = i <= now.getMonth() || yearNum < now.getFullYear();
      const isFuture        = yearNum === now.getFullYear() && i > now.getMonth();

      const monthRevenue = payments
        .filter(p => { const d = p.verified_at || p.created_at; return d && d.startsWith(`${yearNum}-${monthStr}`); })
        .reduce((s, p) => s + (p.amount ?? 0), 0);

      const monthExpense =
        expenseCashTx.filter(t => t.transaction_date?.startsWith(`${yearNum}-${monthStr}`)).reduce((s, t) => s + (t.amount ?? 0), 0) +
        vendorCosts.filter(v => v.created_at?.startsWith(`${yearNum}-${monthStr}`)).reduce((s, v) => s + (v.amount ?? 0), 0);

      const pastRevenues = MONTHS_LABEL.slice(0, i).map((_, j) => {
        const ms = String(j + 1).padStart(2, "0");
        return payments.filter(p => { const d = p.verified_at || p.created_at; return d && d.startsWith(`${yearNum}-${ms}`); }).reduce((s, p) => s + (p.amount ?? 0), 0);
      }).filter(v => v > 0);
      const avgRevenue = pastRevenues.length ? pastRevenues.reduce((a, b) => a + b, 0) / pastRevenues.length : 0;

      return {
        month,
        pendapatan:       isPastOrCurrent && !isFuture ? monthRevenue : null,
        pengeluaran:      isPastOrCurrent && !isFuture ? monthExpense : null,
        proyeksi:         isFuture && avgRevenue > 0 ? Math.round(avgRevenue * 1.05) : null,
        proyeksi_expense: isFuture && avgRevenue > 0 ? Math.round(avgRevenue * 0.65) : null,
      };
    });

    const totalProyeksi = monthlyData.filter(m => m.proyeksi !== null).reduce((s, m) => s + (m.proyeksi || 0), 0);

    const expenseCategoryMap: Record<string, number> = {};
    expenseCashTx.forEach(t => { const k = t.category || "other_expense"; expenseCategoryMap[k] = (expenseCategoryMap[k] ?? 0) + (t.amount ?? 0); });
    vendorCosts.forEach(v => { const k = v.cost_type || "OTHER"; expenseCategoryMap[k] = (expenseCategoryMap[k] ?? 0) + (v.amount ?? 0); });
    const totalExpCat = Object.values(expenseCategoryMap).reduce((a, b) => a + b, 0);
    const expenseCategories = Object.entries(expenseCategoryMap)
      .sort(([, a], [, b]) => b - a)
      .map(([key, amount], idx) => ({
        category: COST_TYPE_LABELS[key] ?? key,
        amount,
        pct: totalExpCat > 0 ? parseFloat(((amount / totalExpCat) * 100).toFixed(1)) : 0,
        color: COST_COLORS[idx % COST_COLORS.length],
      }));

    const arAging = [
      { range: "< 30 hari",   color: "bg-emerald-500", maxDays: 30 },
      { range: "30–60 hari",  color: "bg-amber-500",   minDays: 30,  maxDays: 60 },
      { range: "61–90 hari",  color: "bg-orange-500",  minDays: 60,  maxDays: 90 },
      { range: "> 90 hari",   color: "bg-red-500",     minDays: 90 },
    ].map(bucket => {
      const filtered = outstanding.filter(b => {
        const refDate = b.payment_deadline ? parseISO(b.payment_deadline) : b.created_at ? parseISO(b.created_at) : now;
        const days = differenceInDays(now, refDate);
        if (bucket.minDays === undefined) return days < (bucket.maxDays ?? Infinity);
        if (bucket.maxDays === undefined) return days >= bucket.minDays;
        return days >= bucket.minDays && days < bucket.maxDays;
      });
      return { range: bucket.range, color: bucket.color, amount: filtered.reduce((s, b) => s + (b.remaining_amount ?? 0), 0), count: filtered.length };
    });

    return { totalRevenue, prevRevenue, totalExpenses, prevExpenses, netProfit, prevProfit, totalOutstanding, cashBalance, monthlyData, totalProyeksi, expenseCategories, arAging };
  }, [rawData, yearNum, now]);

  // ── Computed: HPP & departure margin ──────────────────────────────────────
  const hppComputed = useMemo(() => {
    if (!departureSummaries.length) return null;

    const totalHppPlan     = departureSummaries.reduce((s, d) => s + (d.hpp_planned     || 0), 0);
    const totalHppRealized = departureSummaries.reduce((s, d) => s + (d.hpp_realized    || 0), 0);
    const totalRevPlan     = departureSummaries.reduce((s, d) => s + (d.revenue_plan    || 0), 0);
    const totalRevRealized = departureSummaries.reduce((s, d) => s + (d.revenue_realized || 0), 0);
    const totalGMPlan      = departureSummaries.reduce((s, d) => s + (d.gross_margin_plan      || 0), 0);
    const totalGMRealized  = departureSummaries.reduce((s, d) => s + (d.gross_margin_realized  || 0), 0);

    // Net margin pct per departure
    const withMargin = departureSummaries.map(d => ({
      ...d,
      margin_plan_pct:     d.revenue_plan     > 0 ? (d.gross_margin_plan     / d.revenue_plan)     * 100 : 0,
      margin_realized_pct: d.revenue_realized > 0 ? (d.gross_margin_realized / d.revenue_realized) * 100 : 0,
      has_data:            d.revenue_realized > 0 || d.hpp_realized > 0,
    }));

    // Top 5 terbaik (margin realized pct tertinggi, hanya yg ada data)
    const withData = withMargin.filter(d => d.has_data);
    const top5Best  = [...withData].sort((a, b) => b.margin_realized_pct - a.margin_realized_pct).slice(0, 5);
    const top5Worst = [...withData].sort((a, b) => a.margin_realized_pct - b.margin_realized_pct).slice(0, 5);

    // Monthly chart: HPP Plan vs Realisasi
    const hppMonthly = MONTHS_LABEL.map((label, i) => {
      const monthStr = String(i + 1).padStart(2, "0");
      const monthDeps = departureSummaries.filter(d => d.departure_date?.startsWith(`${yearNum}-${monthStr}`));
      return {
        month: label,
        hpp_plan:     monthDeps.reduce((s, d) => s + (d.hpp_planned      || 0), 0),
        hpp_realized: monthDeps.reduce((s, d) => s + (d.hpp_realized     || 0), 0),
        revenue:      monthDeps.reduce((s, d) => s + (d.revenue_realized || 0), 0),
      };
    });

    return {
      totalHppPlan, totalHppRealized, totalRevPlan, totalRevRealized,
      totalGMPlan, totalGMRealized,
      hppVariance: totalHppPlan - totalHppRealized,
      gmPlanPct:     totalRevPlan     > 0 ? (totalGMPlan     / totalRevPlan)     * 100 : 0,
      gmRealizedPct: totalRevRealized > 0 ? (totalGMRealized / totalRevRealized) * 100 : 0,
      top5Best, top5Worst,
      hppMonthly,
      allDepartures: withMargin,
      totalDepartures: departureSummaries.length,
    };
  }, [departureSummaries, yearNum]);

  // ── Computed: Payroll / SDM ────────────────────────────────────────────────
  const payrollComputed = useMemo(() => {
    if (!payrollData.length) return null;

    const totalGross  = payrollData.reduce((s, r) => s + (r.gross_salary  || 0), 0);
    const totalNet    = payrollData.reduce((s, r) => s + (r.net_salary    || 0), 0);
    const totalPph21  = payrollData.reduce((s, r) => s + (r.pph21_amount  || 0), 0);
    const totalDeductions = totalGross - totalNet;
    const uniqueEmps  = new Set(payrollData.map(r => r.employee_id)).size;

    const monthly = MONTHS_LABEL.map((label, i) => {
      const m = i + 1;
      const recs = payrollData.filter(r => r.period_month === m);
      return {
        month:  label,
        gross:  recs.reduce((s, r) => s + (r.gross_salary  || 0), 0),
        net:    recs.reduce((s, r) => s + (r.net_salary    || 0), 0),
        pph21:  recs.reduce((s, r) => s + (r.pph21_amount  || 0), 0),
        count:  new Set(recs.map(r => r.employee_id)).size,
      };
    });

    // Max gross month (for bar height reference)
    const maxMonthlyGross = Math.max(...monthly.map(m => m.gross), 1);

    return { totalGross, totalNet, totalPph21, totalDeductions, uniqueEmps, monthly, maxMonthlyGross };
  }, [payrollData]);

  const profitMargin = computed && computed.totalRevenue
    ? ((computed.netProfit / computed.totalRevenue) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" /> Dashboard Keuangan Terpadu
          </h1>
          <p className="text-muted-foreground text-sm">
            Ringkasan P&L, HPP, biaya SDM, dan margin per keberangkatan — data nyata dari database
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => refetch()} title="Refresh data">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/finance"><BarChart3 className="h-4 w-4 mr-1" /> P&L Detail</Link>
          </Button>
        </div>
      </div>

      {/* ── KPI Row 1: Revenue / Biaya / Laba / Kas ─────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Pendapatan",  value: computed?.totalRevenue  ?? 0, prev: computed?.prevRevenue  ?? 0, icon: TrendingUp,   color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Total Pengeluaran", value: computed?.totalExpenses ?? 0, prev: computed?.prevExpenses ?? 0, icon: TrendingDown,  color: "text-red-500",     bg: "bg-red-50" },
          { label: "Laba Bersih",       value: computed?.netProfit     ?? 0, prev: computed?.prevProfit   ?? 0, icon: DollarSign,   color: "text-primary",     bg: "bg-primary/10", suffix: `margin ${profitMargin}%` },
          { label: "Saldo Kas",         value: computed?.cashBalance   ?? 0, prev: null as number | null,       icon: Wallet,       color: "text-blue-600",    bg: "bg-blue-50" },
        ].map((s) => (
          <Card key={s.label} className="shadow-sm">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                <div className={`p-1.5 rounded-lg ${s.bg}`}>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
              </div>
              {isLoading ? <StatSkeleton /> : <p className="text-xl font-bold">{formatCurrency(s.value)}</p>}
              {s.suffix && <p className="text-xs text-muted-foreground">{s.suffix}</p>}
              {s.prev !== null && s.prev !== undefined && !isLoading && (
                <div className="flex items-center gap-1.5 mt-1">
                  <TrendBadge current={s.value} prev={s.prev} />
                  <span className="text-xs text-muted-foreground">vs bulan lalu</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── KPI Row 2: HPP & SDM (NEW) ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* HPP Plan */}
        <Card className="shadow-sm border-orange-200 bg-orange-50/30">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">HPP Direncanakan</p>
              <div className="p-1.5 rounded-lg bg-orange-100">
                <Package className="h-4 w-4 text-orange-600" />
              </div>
            </div>
            {loadingDep ? <StatSkeleton /> : (
              <p className="text-xl font-bold text-orange-700">{formatCurrency(hppComputed?.totalHppPlan ?? 0)}</p>
            )}
            <p className="text-xs text-muted-foreground">dari departure_cost_items</p>
          </CardContent>
        </Card>

        {/* HPP Realized */}
        <Card className="shadow-sm border-rose-200 bg-rose-50/30">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">HPP Realisasi</p>
              <div className="p-1.5 rounded-lg bg-rose-100">
                <TrendingDown className="h-4 w-4 text-rose-600" />
              </div>
            </div>
            {loadingDep ? <StatSkeleton /> : (
              <p className="text-xl font-bold text-rose-700">{formatCurrency(hppComputed?.totalHppRealized ?? 0)}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {hppComputed && hppComputed.hppVariance !== 0 && (
                <span className={hppComputed.hppVariance > 0 ? "text-emerald-600" : "text-red-600"}>
                  {hppComputed.hppVariance > 0 ? "Hemat" : "Lebih"} {formatCurrency(Math.abs(hppComputed.hppVariance))}
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Gross Margin Realized */}
        <Card className="shadow-sm border-purple-200 bg-purple-50/30">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">Margin Realisasi</p>
              <div className="p-1.5 rounded-lg bg-purple-100">
                <Target className="h-4 w-4 text-purple-600" />
              </div>
            </div>
            {loadingDep ? <StatSkeleton /> : (
              <>
                <p className="text-xl font-bold text-purple-700">{formatCurrency(hppComputed?.totalGMRealized ?? 0)}</p>
                <p className="text-xs font-medium text-purple-600">
                  {hppComputed ? `${hppComputed.gmRealizedPct.toFixed(1)}%` : "—"} dari pendapatan
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Biaya SDM */}
        <Card className="shadow-sm border-blue-200 bg-blue-50/30">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">Biaya SDM (Payroll)</p>
              <div className="p-1.5 rounded-lg bg-blue-100">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            {loadingPayroll ? <StatSkeleton /> : (
              <p className="text-xl font-bold text-blue-700">{formatCurrency(payrollComputed?.totalGross ?? 0)}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {payrollComputed ? `${payrollComputed.uniqueEmps} karyawan · PPh21: ${formatCurrency(payrollComputed.totalPph21)}` : "Belum ada data payroll"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Piutang Alert */}
      {computed && computed.totalOutstanding > 0 && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span>
            Total piutang belum terbayar: <strong>{formatCurrency(computed.totalOutstanding)}</strong>
            {" "}dari {rawData?.outstanding.length ?? 0} booking
          </span>
          <Button size="sm" variant="outline" className="ml-auto text-xs" asChild>
            <Link to="/admin/finance/ar">Kelola AR <ArrowRight className="h-3 w-3 ml-1" /></Link>
          </Button>
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="cashflow">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="cashflow">Arus Kas</TabsTrigger>
          <TabsTrigger value="comparison">Perbandingan</TabsTrigger>
          <TabsTrigger value="ar">Piutang (AR)</TabsTrigger>
          <TabsTrigger value="hpp" className="gap-1">
            <Package className="h-3.5 w-3.5" />HPP &amp; Keberangkatan
          </TabsTrigger>
          <TabsTrigger value="sdm" className="gap-1">
            <Users className="h-3.5 w-3.5" />Biaya SDM
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Arus Kas ─────────────────────────────────────────────────── */}
        <TabsContent value="cashflow" className="space-y-4 mt-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Arus Kas Bulanan {year}</CardTitle>
              <CardDescription>
                Pendapatan terverifikasi vs pengeluaran aktual
                {computed?.totalProyeksi && computed.totalProyeksi > 0 ? " + proyeksi bulan mendatang" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-80 w-full" /> : (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={computed?.monthlyData ?? []} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPendapatan" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorPengeluaran" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorProyeksi" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 11 }} width={48} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <ReferenceLine x={MONTHS_LABEL[now.getMonth()]} stroke="#6366f1" strokeDasharray="4 4" label={{ value: "Sekarang", fontSize: 10, fill: "#6366f1" }} />
                    <Area type="monotone" dataKey="pendapatan"  name="Pendapatan"          stroke="#10b981" fill="url(#colorPendapatan)"  strokeWidth={2} connectNulls />
                    <Area type="monotone" dataKey="pengeluaran" name="Pengeluaran"          stroke="#ef4444" fill="url(#colorPengeluaran)" strokeWidth={2} connectNulls />
                    <Area type="monotone" dataKey="proyeksi"    name="Proyeksi Pendapatan"  stroke="#3b82f6" fill="url(#colorProyeksi)"    strokeWidth={2} strokeDasharray="5 5" connectNulls />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Komposisi Pengeluaran</CardTitle>
              <CardDescription>Dari kas operasional + biaya vendor keberangkatan tahun {year}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
                : computed && computed.expenseCategories.length > 0 ? (
                <div className="space-y-3">
                  {computed.expenseCategories.map((e, idx) => (
                    <div key={e.category}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium">{e.category}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">{e.pct}%</span>
                          <span className="font-semibold w-32 text-right">{formatCurrency(e.amount)}</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${COST_COLORS[idx % COST_COLORS.length]}`} style={{ width: `${e.pct}%`, opacity: 0.7 + e.pct / 200 }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground text-center py-8">Belum ada data pengeluaran untuk tahun {year}</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Perbandingan ─────────────────────────────────────────────── */}
        <TabsContent value="comparison" className="space-y-4 mt-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Perbandingan Pendapatan Bulanan</CardTitle>
              <CardDescription>Aktual vs proyeksi per bulan dalam setahun</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-80 w-full" /> : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={computed?.monthlyData ?? []} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 11 }} width={48} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="pendapatan" name="Aktual"   fill="#10b981" radius={[4,4,0,0]} />
                    <Bar dataKey="proyeksi"   name="Proyeksi" fill="#3b82f680" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Pendapatan", current: computed?.totalRevenue  ?? 0, prev: computed?.prevRevenue  ?? 0, icon: TrendingUp },
              { label: "Pengeluaran",current: computed?.totalExpenses ?? 0, prev: computed?.prevExpenses ?? 0, icon: TrendingDown },
              { label: "Laba Bersih",current: computed?.netProfit     ?? 0, prev: computed?.prevProfit   ?? 0, icon: Target },
            ].map((c) => {
              const diff = c.current - c.prev;
              const up = diff >= 0;
              return (
                <Card key={c.label} className="shadow-sm">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground font-medium mb-2">{c.label}</p>
                    {isLoading ? <StatSkeleton /> : (
                      <>
                        <p className="text-lg font-bold mb-1">{formatCurrency(c.current)}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Bulan lalu: {formatCurrency(c.prev)}</span>
                          <span className={up ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"}>{up ? "+" : ""}{formatCurrency(diff)}</span>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${up ? "bg-emerald-500" : "bg-red-400"}`} style={{ width: `${Math.min(100, Math.abs(pct(c.current, c.prev)))}%` }} />
                        </div>
                        <p className="text-xs mt-1 font-semibold"><TrendBadge current={c.current} prev={c.prev} /> dari bulan lalu</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {computed && computed.totalProyeksi > 0 && (
            <Card className="shadow-sm border-blue-200 bg-blue-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" /> Proyeksi Sisa Tahun {year}
                </CardTitle>
                <CardDescription>Estimasi pendapatan berdasarkan rata-rata bulanan aktual</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-blue-700">{formatCurrency(computed.totalProyeksi)}</p>
                    <p className="text-sm text-muted-foreground">Proyeksi bulan-bulan yang tersisa</p>
                  </div>
                  <Badge variant="outline" className="text-blue-600 border-blue-300">Estimasi berdasarkan tren</Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab: Piutang AR ───────────────────────────────────────────────── */}
        <TabsContent value="ar" className="space-y-4 mt-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-amber-500" /> Aging Piutang (AR)
              </CardTitle>
              <CardDescription>{rawData?.outstanding.length ?? 0} booking belum lunas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {isLoading ? <div className="space-y-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                : computed && computed.totalOutstanding > 0 ? (
                <>
                  {computed.arAging.map((a) => (
                    <div key={a.range}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${a.color}`} />
                          <span className="font-medium">{a.range}</span>
                          <Badge variant="outline" className="text-xs">{a.count} booking</Badge>
                        </div>
                        <span className="font-bold">{formatCurrency(a.amount)}</span>
                      </div>
                      <div className="h-3 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${a.color}`} style={{ width: computed.totalOutstanding > 0 ? `${(a.amount / computed.totalOutstanding) * 100}%` : "0%" }} />
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 border-t flex items-center justify-between">
                    <span className="font-semibold">Total Piutang</span>
                    <span className="font-bold text-lg">{formatCurrency(computed.totalOutstanding)}</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-emerald-700">Tidak ada piutang tertunggak</p>
                  <p className="text-xs text-muted-foreground">Semua booking sudah lunas</p>
                </div>
              )}
              <Button className="w-full" variant="outline" asChild>
                <Link to="/admin/finance/ar">Kelola Detail Piutang <ArrowRight className="h-4 w-4 ml-2" /></Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: HPP & Keberangkatan (NEW) ───────────────────────────────── */}
        <TabsContent value="hpp" className="space-y-4 mt-4">

          {/* Summary HPP */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "HPP Direncanakan",    value: hppComputed?.totalHppPlan     ?? 0, sub: `${hppComputed?.totalDepartures ?? 0} keberangkatan`,       color: "text-orange-700",  bg: "bg-orange-50  border-orange-200" },
              { label: "HPP Realisasi",        value: hppComputed?.totalHppRealized ?? 0, sub: hppComputed?.hppVariance != null ? (hppComputed.hppVariance >= 0 ? `Hemat ${formatCurrency(hppComputed.hppVariance)}` : `Lebih ${formatCurrency(Math.abs(hppComputed.hppVariance))}`) : "—", color: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
              { label: "Gross Margin Plan",    value: hppComputed?.totalGMPlan      ?? 0, sub: `${hppComputed?.gmPlanPct.toFixed(1) ?? 0}% margin rencana`, color: "text-blue-700",   bg: "bg-blue-50    border-blue-200" },
              { label: "Gross Margin Realisasi",value: hppComputed?.totalGMRealized  ?? 0, sub: `${hppComputed?.gmRealizedPct.toFixed(1) ?? 0}% margin aktual`, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
            ].map(s => (
              <Card key={s.label} className={`border ${s.bg}`}>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  {loadingDep ? <Skeleton className="h-7 w-28 mt-1" /> : <p className={`font-bold text-lg ${s.color}`}>{formatCurrency(s.value)}</p>}
                  <p className="text-[11px] text-muted-foreground mt-0.5">{s.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* HPP Monthly Chart */}
          {hppComputed && hppComputed.hppMonthly.some(m => m.hpp_plan > 0 || m.hpp_realized > 0) && (
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">HPP Plan vs Realisasi per Bulan Keberangkatan — {year}</CardTitle>
                <CardDescription>Berdasarkan tanggal keberangkatan, sumber: departure_cost_items (Plan) & departure_expenses (Realisasi)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={hppComputed.hppMonthly} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 11 }} width={52} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="hpp_plan"     name="HPP Rencana"   fill="#f97316" radius={[4,4,0,0]} opacity={0.8} />
                    <Bar dataKey="hpp_realized" name="HPP Realisasi" fill="#ef4444" radius={[4,4,0,0]} opacity={0.8} />
                    <Bar dataKey="revenue"      name="Pendapatan"    fill="#10b981" radius={[4,4,0,0]} opacity={0.7} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Top 5 Terbaik & Terburuk */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top 5 Terbaik */}
            <Card className="shadow-sm border-emerald-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-emerald-600" /> Top 5 Margin Terbaik
                </CardTitle>
                <CardDescription>Keberangkatan dengan gross margin realisasi tertinggi di {year}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loadingDep ? (
                  <div className="space-y-2 p-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : hppComputed && hppComputed.top5Best.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead>#</TableHead>
                        <TableHead>Paket</TableHead>
                        <TableHead className="text-right">Pendapatan</TableHead>
                        <TableHead className="text-right">Margin</TableHead>
                        <TableHead className="text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hppComputed.top5Best.map((d, i) => (
                        <TableRow key={d.departure_id} className="text-sm">
                          <TableCell className="font-bold text-emerald-600 w-8">{i + 1}</TableCell>
                          <TableCell>
                            <p className="font-medium truncate max-w-[130px]">{d.package_name || "—"}</p>
                            <p className="text-[10px] text-muted-foreground">{d.departure_date ? format(parseISO(d.departure_date), "dd MMM yyyy") : "—"} · {d.booked_count} pax</p>
                          </TableCell>
                          <TableCell className="text-right text-xs">{formatCurrency(d.revenue_realized)}</TableCell>
                          <TableCell className="text-right text-xs font-semibold text-emerald-700">{formatCurrency(d.gross_margin_realized)}</TableCell>
                          <TableCell className="text-right"><MarginBadge pct={d.margin_realized_pct} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Belum ada data realisasi keberangkatan</p>
                )}
              </CardContent>
            </Card>

            {/* Top 5 Terburuk */}
            <Card className="shadow-sm border-red-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ThumbsDown className="h-5 w-5 text-red-500" /> Top 5 Margin Terburuk
                </CardTitle>
                <CardDescription>Keberangkatan dengan gross margin realisasi terendah di {year}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loadingDep ? (
                  <div className="space-y-2 p-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : hppComputed && hppComputed.top5Worst.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead>#</TableHead>
                        <TableHead>Paket</TableHead>
                        <TableHead className="text-right">Pendapatan</TableHead>
                        <TableHead className="text-right">Margin</TableHead>
                        <TableHead className="text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hppComputed.top5Worst.map((d, i) => (
                        <TableRow key={d.departure_id} className={`text-sm ${d.gross_margin_realized < 0 ? "bg-red-50/50" : ""}`}>
                          <TableCell className="font-bold text-red-500 w-8">{i + 1}</TableCell>
                          <TableCell>
                            <p className="font-medium truncate max-w-[130px]">{d.package_name || "—"}</p>
                            <p className="text-[10px] text-muted-foreground">{d.departure_date ? format(parseISO(d.departure_date), "dd MMM yyyy") : "—"} · {d.booked_count} pax</p>
                          </TableCell>
                          <TableCell className="text-right text-xs">{formatCurrency(d.revenue_realized)}</TableCell>
                          <TableCell className={`text-right text-xs font-semibold ${d.gross_margin_realized < 0 ? "text-red-600" : "text-amber-700"}`}>{formatCurrency(d.gross_margin_realized)}</TableCell>
                          <TableCell className="text-right"><MarginBadge pct={d.margin_realized_pct} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Belum ada data realisasi keberangkatan</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Semua Keberangkatan */}
          {hppComputed && hppComputed.allDepartures.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-5 w-5" /> Semua Keberangkatan — {year}
                </CardTitle>
                <CardDescription>{hppComputed.totalDepartures} keberangkatan</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead>Tgl Berangkat</TableHead>
                        <TableHead>Paket</TableHead>
                        <TableHead className="text-right">Pax</TableHead>
                        <TableHead className="text-right">Rev. Plan</TableHead>
                        <TableHead className="text-right">Rev. Aktual</TableHead>
                        <TableHead className="text-right">HPP Plan</TableHead>
                        <TableHead className="text-right">HPP Aktual</TableHead>
                        <TableHead className="text-right">Margin Aktual</TableHead>
                        <TableHead className="text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hppComputed.allDepartures.map(d => (
                        <TableRow key={d.departure_id} className={`text-xs ${d.gross_margin_realized < 0 ? "bg-red-50/30" : ""}`}>
                          <TableCell className="font-medium whitespace-nowrap">
                            {d.departure_date ? format(parseISO(d.departure_date), "dd MMM yyyy") : "—"}
                          </TableCell>
                          <TableCell className="truncate max-w-[120px]">{d.package_name || "—"}</TableCell>
                          <TableCell className="text-right">{d.booked_count}/{d.quota}</TableCell>
                          <TableCell className="text-right">{formatCurrency(d.revenue_plan)}</TableCell>
                          <TableCell className="text-right font-medium">{d.revenue_realized > 0 ? formatCurrency(d.revenue_realized) : <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell className="text-right text-orange-700">{d.hpp_planned > 0 ? formatCurrency(d.hpp_planned) : <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell className="text-right text-rose-700">{d.hpp_realized > 0 ? formatCurrency(d.hpp_realized) : <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell className={`text-right font-semibold ${d.gross_margin_realized < 0 ? "text-red-600" : "text-emerald-700"}`}>
                            {d.has_data ? formatCurrency(d.gross_margin_realized) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            {d.has_data ? <MarginBadge pct={d.margin_realized_pct} /> : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {!loadingDep && departureSummaries.length === 0 && (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Belum ada data keberangkatan di tahun {year}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab: Biaya SDM (NEW) ──────────────────────────────────────────── */}
        <TabsContent value="sdm" className="space-y-4 mt-4">

          {/* SDM Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Gaji Bruto",    value: payrollComputed?.totalGross    ?? 0, sub: `${payrollComputed?.uniqueEmps ?? 0} karyawan`,               color: "text-blue-700",   bg: "bg-blue-50    border-blue-200" },
              { label: "Gaji Bersih (Net)",   value: payrollComputed?.totalNet      ?? 0, sub: "Setelah potongan semua komponen",                            color: "text-emerald-700",bg: "bg-emerald-50 border-emerald-200" },
              { label: "Total Potongan",      value: payrollComputed?.totalDeductions ?? 0, sub: "BPJS + Iuran + lain-lain",                                 color: "text-amber-700",  bg: "bg-amber-50   border-amber-200" },
              { label: "PPh 21 Terutang",     value: payrollComputed?.totalPph21    ?? 0, sub: "Pajak penghasilan karyawan",                                 color: "text-orange-700", bg: "bg-orange-50  border-orange-200" },
            ].map(s => (
              <Card key={s.label} className={`border ${s.bg}`}>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  {loadingPayroll ? <Skeleton className="h-7 w-28 mt-1" /> : <p className={`font-bold text-lg ${s.color}`}>{formatCurrency(s.value)}</p>}
                  <p className="text-[11px] text-muted-foreground mt-0.5">{s.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* SDM Monthly Chart */}
          {payrollComputed && payrollComputed.monthly.some(m => m.gross > 0) ? (
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" /> Biaya SDM per Bulan — {year}
                </CardTitle>
                <CardDescription>Gaji bruto, gaji bersih, dan PPh 21 per bulan dari modul payroll</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={payrollComputed.monthly} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 11 }} width={52} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="gross" name="Gaji Bruto" fill="#3b82f6" radius={[4,4,0,0]} opacity={0.8} />
                    <Bar dataKey="net"   name="Gaji Bersih" fill="#10b981" radius={[4,4,0,0]} opacity={0.8} />
                    <Bar dataKey="pph21" name="PPh 21"     fill="#f97316" radius={[4,4,0,0]} opacity={0.9} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : null}

          {/* SDM Monthly Table */}
          {payrollComputed && payrollComputed.monthly.some(m => m.gross > 0) ? (
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Rincian Bulanan Biaya SDM — {year}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bulan</TableHead>
                      <TableHead className="text-right">Karyawan</TableHead>
                      <TableHead className="text-right">Gaji Bruto</TableHead>
                      <TableHead className="text-right">Potongan</TableHead>
                      <TableHead className="text-right">Gaji Bersih</TableHead>
                      <TableHead className="text-right">PPh 21</TableHead>
                      <TableHead className="text-right">% SDM/Total Biaya</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollComputed.monthly.map((m, i) => {
                      const deduction = m.gross - m.net;
                      const pctOfMax  = payrollComputed.maxMonthlyGross > 0 ? (m.gross / payrollComputed.maxMonthlyGross) * 100 : 0;
                      return (
                        <TableRow key={i} className={m.gross === 0 ? "opacity-40" : ""}>
                          <TableCell className="font-medium">{MONTHS_LABEL[i]}</TableCell>
                          <TableCell className="text-right">{m.count > 0 ? m.count : "—"}</TableCell>
                          <TableCell className="text-right font-semibold text-blue-700">{m.gross > 0 ? formatCurrency(m.gross) : "—"}</TableCell>
                          <TableCell className="text-right text-amber-700">{deduction > 0 ? formatCurrency(deduction) : "—"}</TableCell>
                          <TableCell className="text-right text-emerald-700">{m.net > 0 ? formatCurrency(m.net) : "—"}</TableCell>
                          <TableCell className="text-right text-orange-700">{m.pph21 > 0 ? formatCurrency(m.pph21) : "—"}</TableCell>
                          <TableCell className="text-right">
                            {m.gross > 0 ? (
                              <div className="flex items-center justify-end gap-2">
                                <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pctOfMax}%` }} />
                                </div>
                                <span className="text-xs text-muted-foreground">{pctOfMax.toFixed(0)}%</span>
                              </div>
                            ) : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="font-bold bg-gray-50 border-t-2">
                      <TableCell>Total {year}</TableCell>
                      <TableCell className="text-right">{payrollComputed.uniqueEmps} karyawan</TableCell>
                      <TableCell className="text-right text-blue-700">{formatCurrency(payrollComputed.totalGross)}</TableCell>
                      <TableCell className="text-right text-amber-700">{formatCurrency(payrollComputed.totalDeductions)}</TableCell>
                      <TableCell className="text-right text-emerald-700">{formatCurrency(payrollComputed.totalNet)}</TableCell>
                      <TableCell className="text-right text-orange-700">{formatCurrency(payrollComputed.totalPph21)}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : !loadingPayroll ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Belum ada data payroll di tahun {year}</p>
                <p className="text-sm mt-1">Buka Modul Payroll → pilih bulan → klik "Finalize Payroll"</p>
                <Button className="mt-4" variant="outline" size="sm" asChild>
                  <Link to="/admin/payroll">Buka Modul Payroll <ArrowRight className="h-4 w-4 ml-1" /></Link>
                </Button>
              </CardContent>
            </Card>
          ) : <Skeleton className="h-48 w-full" />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
