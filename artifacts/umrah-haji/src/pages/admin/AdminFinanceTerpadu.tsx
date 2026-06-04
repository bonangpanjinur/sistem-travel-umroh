import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import {
  TrendingUp, TrendingDown, DollarSign, CreditCard, Wallet,
  BarChart3, ArrowUpRight, ArrowDownRight, Target, AlertTriangle,
  ArrowRight, Layers, Info, RefreshCw
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
  "bg-primary",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-purple-500",
  "bg-orange-400",
  "bg-teal-500",
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
      {payload.map((p: any) => (
        p.value !== null && p.value !== undefined ? (
          <p key={p.dataKey} style={{ color: p.color }} className="flex justify-between gap-4">
            <span>{p.name}</span>
            <span className="font-semibold">{formatCurrency(p.value)}</span>
          </p>
        ) : null
      ))}
    </div>
  );
};

function StatSkeleton() {
  return <Skeleton className="h-8 w-36 mt-1" />;
}

export default function AdminFinanceTerpadu() {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const isDemo = false;

  const yearNum = parseInt(year);
  const now = new Date();
  const yearStart = `${yearNum}-01-01`;
  const yearEnd = `${yearNum}-12-31`;

  const currentMonthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const currentMonthEnd = format(endOfMonth(now), "yyyy-MM-dd");
  const prevMonthStart = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
  const prevMonthEnd = format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd");

  const { data: rawData, isLoading, refetch } = useQuery({
    queryKey: ["finance-terpadu-real", year],
    queryFn: async () => {
      const [
        paymentsRes,
        prevPaymentsRes,
        cashTxRes,
        outstandingRes,
        vendorCostsRes,
        prevCashTxRes,
      ] = await Promise.all([
        supabase
          .from("payments")
          .select("amount, verified_at, created_at")
          .eq("status", "paid")
          .gte("verified_at", `${yearStart}T00:00:00.000Z`)
          .lte("verified_at", `${yearEnd}T23:59:59.999Z`),

        supabase
          .from("payments")
          .select("amount, verified_at")
          .eq("status", "paid")
          .gte("verified_at", `${prevMonthStart}T00:00:00.000Z`)
          .lte("verified_at", `${prevMonthEnd}T23:59:59.999Z`),

        supabase
          .from("cash_transactions")
          .select("amount, transaction_type, category, transaction_date")
          .gte("transaction_date", yearStart)
          .lte("transaction_date", yearEnd),

        supabase
          .from("bookings")
          .select("remaining_amount, created_at, payment_deadline, booking_status")
          .gt("remaining_amount", 0)
          .not("booking_status", "eq", "cancelled")
          .not("booking_status", "eq", "refunded"),

        supabase
          .from("vendor_costs")
          .select("amount, paid_amount, cost_type, status, created_at")
          .gte("created_at", `${yearStart}T00:00:00.000Z`)
          .lte("created_at", `${yearEnd}T23:59:59.999Z`),

        supabase
          .from("cash_transactions")
          .select("amount, transaction_type")
          .eq("transaction_type", "expense")
          .gte("transaction_date", prevMonthStart)
          .lte("transaction_date", prevMonthEnd),
      ]);

      return {
        payments: paymentsRes.data ?? [],
        prevPayments: prevPaymentsRes.data ?? [],
        cashTx: cashTxRes.data ?? [],
        outstanding: outstandingRes.data ?? [],
        vendorCosts: vendorCostsRes.data ?? [],
        prevCashTx: prevCashTxRes.data ?? [],
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const computed = useMemo(() => {
    if (!rawData) return null;
    const { payments, prevPayments, cashTx, outstanding, vendorCosts, prevCashTx } = rawData;

    const totalRevenue = payments.reduce((s, p) => s + (p.amount ?? 0), 0);
    const prevRevenue = prevPayments.reduce((s, p) => s + (p.amount ?? 0), 0);

    const expenseCashTx = cashTx.filter(t => t.transaction_type === "expense");
    const incomeCashTx = cashTx.filter(t => t.transaction_type === "income");

    const totalOperationalExpenses = expenseCashTx.reduce((s, t) => s + (t.amount ?? 0), 0);
    const totalVendorCosts = vendorCosts.reduce((s, v) => s + (v.amount ?? 0), 0);
    const totalExpenses = totalOperationalExpenses + totalVendorCosts;

    const prevExpenses = prevCashTx.reduce((s, t) => s + (t.amount ?? 0), 0);
    const prevProfit = prevRevenue - prevExpenses;

    const netProfit = totalRevenue - totalExpenses;
    const totalOutstanding = outstanding.reduce((s, b) => s + (b.remaining_amount ?? 0), 0);

    const allIncome = cashTx.filter(t => t.transaction_type === "income").reduce((s, t) => s + (t.amount ?? 0), 0);
    const allExpensesCash = expenseCashTx.reduce((s, t) => s + (t.amount ?? 0), 0);
    const cashBalance = allIncome - allExpensesCash;

    const monthlyData = MONTHS_LABEL.map((month, i) => {
      const monthStr = String(i + 1).padStart(2, "0");
      const isPastOrCurrent = i <= now.getMonth() || yearNum < now.getFullYear();
      const isFuture = yearNum === now.getFullYear() && i > now.getMonth();

      const monthPayments = payments.filter(p => {
        const d = p.verified_at || p.created_at;
        return d && d.startsWith(`${yearNum}-${monthStr}`);
      });
      const monthRevenue = monthPayments.reduce((s, p) => s + (p.amount ?? 0), 0);

      const monthExpCash = expenseCashTx.filter(t => t.transaction_date?.startsWith(`${yearNum}-${monthStr}`));
      const monthVendor = vendorCosts.filter(v => v.created_at?.startsWith(`${yearNum}-${monthStr}`));
      const monthExpense = monthExpCash.reduce((s, t) => s + (t.amount ?? 0), 0) +
        monthVendor.reduce((s, v) => s + (v.amount ?? 0), 0);

      const pastMonths = MONTHS_LABEL.slice(0, i).map((_, j) => {
        const ms = String(j + 1).padStart(2, "0");
        return payments.filter(p => {
          const d = p.verified_at || p.created_at;
          return d && d.startsWith(`${yearNum}-${ms}`);
        }).reduce((s, p) => s + (p.amount ?? 0), 0);
      }).filter(v => v > 0);
      const avgRevenue = pastMonths.length ? pastMonths.reduce((a, b) => a + b, 0) / pastMonths.length : 0;

      return {
        month,
        pendapatan: isPastOrCurrent && !isFuture ? monthRevenue : null,
        pengeluaran: isPastOrCurrent && !isFuture ? monthExpense : null,
        proyeksi: isFuture && avgRevenue > 0 ? Math.round(avgRevenue * 1.05) : null,
        proyeksi_expense: isFuture && avgRevenue > 0 ? Math.round(avgRevenue * 0.65) : null,
      };
    });

    const totalProyeksi = monthlyData
      .filter(m => m.proyeksi !== null)
      .reduce((s, m) => s + (m.proyeksi || 0), 0);

    const expenseCategoryMap: Record<string, number> = {};
    expenseCashTx.forEach(t => {
      const key = t.category || "other_expense";
      expenseCategoryMap[key] = (expenseCategoryMap[key] ?? 0) + (t.amount ?? 0);
    });
    vendorCosts.forEach(v => {
      const key = v.cost_type || "OTHER";
      expenseCategoryMap[key] = (expenseCategoryMap[key] ?? 0) + (v.amount ?? 0);
    });
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
      { range: "< 30 hari", color: "bg-emerald-500", maxDays: 30 },
      { range: "30–60 hari", color: "bg-amber-500", minDays: 30, maxDays: 60 },
      { range: "61–90 hari", color: "bg-orange-500", minDays: 60, maxDays: 90 },
      { range: "> 90 hari", color: "bg-red-500", minDays: 90 },
    ].map(bucket => {
      const filtered = outstanding.filter(b => {
        const refDate = b.payment_deadline
          ? parseISO(b.payment_deadline)
          : b.created_at ? parseISO(b.created_at) : now;
        const days = differenceInDays(now, refDate);
        if (bucket.minDays === undefined) return days < (bucket.maxDays ?? Infinity);
        if (bucket.maxDays === undefined) return days >= bucket.minDays;
        return days >= bucket.minDays && days < bucket.maxDays;
      });
      return {
        range: bucket.range,
        color: bucket.color,
        amount: filtered.reduce((s, b) => s + (b.remaining_amount ?? 0), 0),
        count: filtered.length,
      };
    });

    return {
      totalRevenue,
      prevRevenue,
      totalExpenses,
      prevExpenses,
      netProfit,
      prevProfit,
      totalOutstanding,
      cashBalance,
      monthlyData,
      totalProyeksi,
      expenseCategories,
      arAging,
    };
  }, [rawData, yearNum, now]);

  const profitMargin = computed && computed.totalRevenue
    ? ((computed.netProfit / computed.totalRevenue) * 100).toFixed(1)
    : "0";

  const currentMonth = format(now, "MMMM yyyy");

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" /> Dashboard Keuangan Terpadu
          </h1>
          <p className="text-muted-foreground text-sm">Ringkasan lengkap P&L, arus kas, proyeksi & piutang — data nyata dari database</p>
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

      {isDemo && (
        <Alert className="border-amber-300 bg-amber-50">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">
            Mode demo — Supabase belum dikonfigurasi. Data akan menampilkan angka nol sampai database terhubung.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Pendapatan",
            value: computed?.totalRevenue ?? 0,
            prev: computed?.prevRevenue ?? 0,
            icon: TrendingUp,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            label: "Total Pengeluaran",
            value: computed?.totalExpenses ?? 0,
            prev: computed?.prevExpenses ?? 0,
            icon: TrendingDown,
            color: "text-red-500",
            bg: "bg-red-50",
          },
          {
            label: "Laba Bersih",
            value: computed?.netProfit ?? 0,
            prev: computed?.prevProfit ?? 0,
            icon: DollarSign,
            color: "text-primary",
            bg: "bg-primary/10",
            suffix: ` (margin ${profitMargin}%)`,
          },
          {
            label: "Saldo Kas",
            value: computed?.cashBalance ?? 0,
            prev: null as number | null,
            icon: Wallet,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
        ].map((s) => (
          <Card key={s.label} className="shadow-sm">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                <div className={`p-1.5 rounded-lg ${s.bg}`}>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
              </div>
              {isLoading ? (
                <StatSkeleton />
              ) : (
                <p className="text-xl font-bold">{formatCurrency(s.value)}</p>
              )}
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

      {/* Tabs */}
      <Tabs defaultValue="cashflow">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="cashflow">Arus Kas</TabsTrigger>
          <TabsTrigger value="comparison">Perbandingan</TabsTrigger>
          <TabsTrigger value="ar">Piutang (AR)</TabsTrigger>
        </TabsList>

        {/* Tab 1: Arus Kas */}
        <TabsContent value="cashflow" className="space-y-4 mt-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Arus Kas Bulanan {year}</CardTitle>
              <CardDescription>
                Pendapatan terverifikasi vs pengeluaran aktual{" "}
                {computed?.totalProyeksi && computed.totalProyeksi > 0
                  ? "+ proyeksi bulan mendatang"
                  : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-80 w-full" />
              ) : (
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
                    <ReferenceLine
                      x={MONTHS_LABEL[now.getMonth()]}
                      stroke="#6366f1"
                      strokeDasharray="4 4"
                      label={{ value: "Sekarang", fontSize: 10, fill: "#6366f1" }}
                    />
                    <Area type="monotone" dataKey="pendapatan" name="Pendapatan" stroke="#10b981" fill="url(#colorPendapatan)" strokeWidth={2} connectNulls />
                    <Area type="monotone" dataKey="pengeluaran" name="Pengeluaran" stroke="#ef4444" fill="url(#colorPengeluaran)" strokeWidth={2} connectNulls />
                    <Area type="monotone" dataKey="proyeksi" name="Proyeksi Pendapatan" stroke="#3b82f6" fill="url(#colorProyeksi)" strokeWidth={2} strokeDasharray="5 5" connectNulls />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Expense Breakdown */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Komposisi Pengeluaran</CardTitle>
              <CardDescription>Dari kas operasional + biaya vendor keberangkatan tahun {year}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : computed && computed.expenseCategories.length > 0 ? (
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
                        <div
                          className={`h-full rounded-full transition-all ${COST_COLORS[idx % COST_COLORS.length]}`}
                          style={{ width: `${e.pct}%`, opacity: 0.7 + e.pct / 200 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Belum ada data pengeluaran untuk tahun {year}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Perbandingan Bulan */}
        <TabsContent value="comparison" className="space-y-4 mt-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Perbandingan Pendapatan Bulanan</CardTitle>
              <CardDescription>Aktual vs proyeksi per bulan dalam setahun</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-80 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={computed?.monthlyData ?? []} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 11 }} width={48} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="pendapatan" name="Aktual" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="proyeksi" name="Proyeksi" fill="#3b82f680" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Month vs Month Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Pendapatan", current: computed?.totalRevenue ?? 0, prev: computed?.prevRevenue ?? 0, icon: TrendingUp },
              { label: "Pengeluaran", current: computed?.totalExpenses ?? 0, prev: computed?.prevExpenses ?? 0, icon: TrendingDown },
              { label: "Laba Bersih", current: computed?.netProfit ?? 0, prev: computed?.prevProfit ?? 0, icon: Target },
            ].map((c) => {
              const diff = c.current - c.prev;
              const up = diff >= 0;
              return (
                <Card key={c.label} className="shadow-sm">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground font-medium mb-2">{c.label}</p>
                    {isLoading ? (
                      <StatSkeleton />
                    ) : (
                      <>
                        <p className="text-lg font-bold mb-1">{formatCurrency(c.current)}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Bulan lalu: {formatCurrency(c.prev)}</span>
                          <span className={up ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"}>
                            {up ? "+" : ""}{formatCurrency(diff)}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${up ? "bg-emerald-500" : "bg-red-400"}`}
                            style={{ width: `${Math.min(100, Math.abs(pct(c.current, c.prev)))}%` }}
                          />
                        </div>
                        <p className="text-xs mt-1 font-semibold">
                          <TrendBadge current={c.current} prev={c.prev} /> dari bulan lalu
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Proyeksi */}
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
                  <Badge variant="outline" className="text-blue-600 border-blue-300">
                    Estimasi berdasarkan tren
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 3: AR Aging */}
        <TabsContent value="ar" className="space-y-4 mt-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-amber-500" /> Aging Piutang (AR)
              </CardTitle>
              <CardDescription>
                Distribusi piutang berdasarkan umur tagihan — {rawData?.outstanding.length ?? 0} booking belum lunas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : computed && computed.totalOutstanding > 0 ? (
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
                        <div
                          className={`h-full rounded-full transition-all ${a.color}`}
                          style={{
                            width: computed.totalOutstanding > 0
                              ? `${(a.amount / computed.totalOutstanding) * 100}%`
                              : "0%"
                          }}
                        />
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
                  <CreditCard className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
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
      </Tabs>
    </div>
  );
}
