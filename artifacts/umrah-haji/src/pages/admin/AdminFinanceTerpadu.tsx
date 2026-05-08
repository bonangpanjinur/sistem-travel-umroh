import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  TrendingUp, TrendingDown, DollarSign, CreditCard, Wallet,
  BarChart3, ArrowUpRight, ArrowDownRight, Target, AlertTriangle,
  ArrowRight, Layers
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from "recharts";
import { formatCurrency } from "@/lib/format";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function generateMonthlyData(year: number) {
  const now = new Date();
  return MONTHS.map((month, i) => {
    const isPast = i < now.getMonth();
    const isCurrent = i === now.getMonth();
    const isFuture = i > now.getMonth();
    const base = 180_000_000 + Math.sin(i * 0.8) * 40_000_000 + i * 5_000_000;
    const expense = base * 0.62 + Math.random() * 10_000_000;
    return {
      month,
      pendapatan: isPast || isCurrent ? Math.round(base + Math.random() * 20_000_000) : null,
      pengeluaran: isPast || isCurrent ? Math.round(expense) : null,
      proyeksi: isFuture || isCurrent ? Math.round(base * 1.08 + i * 2_000_000) : null,
      proyeksi_expense: isFuture || isCurrent ? Math.round(expense * 1.05) : null,
    };
  });
}

const DEMO_SUMMARY = {
  total_revenue: 2_340_000_000,
  total_expenses: 1_420_000_000,
  net_profit: 920_000_000,
  total_outstanding: 385_000_000,
  prev_revenue: 2_080_000_000,
  prev_expenses: 1_290_000_000,
  prev_profit: 790_000_000,
  cash_balance: 542_000_000,
};

const EXPENSE_CATEGORIES = [
  { category: "Biaya Paket", amount: 680_000_000, pct: 47.9 },
  { category: "Hotel & Akomodasi", amount: 320_000_000, pct: 22.5 },
  { category: "Transportasi", amount: 180_000_000, pct: 12.7 },
  { category: "Operasional", amount: 140_000_000, pct: 9.9 },
  { category: "Marketing", amount: 65_000_000, pct: 4.6 },
  { category: "Lain-lain", amount: 35_000_000, pct: 2.4 },
];

const AR_AGING = [
  { range: "< 30 hari", amount: 145_000_000, count: 23, color: "bg-emerald-500" },
  { range: "30–60 hari", amount: 112_000_000, count: 18, color: "bg-amber-500" },
  { range: "61–90 hari", amount: 78_000_000, count: 12, color: "bg-orange-500" },
  { range: "> 90 hari", amount: 50_000_000, count: 7, color: "bg-red-500" },
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
        <p key={p.dataKey} style={{ color: p.color }} className="flex justify-between gap-4">
          <span>{p.name}</span>
          <span className="font-semibold">{formatCurrency(p.value)}</span>
        </p>
      ))}
    </div>
  );
};

export default function AdminFinanceTerpadu() {
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const { data: summary = DEMO_SUMMARY } = useQuery({
    queryKey: ["finance-terpadu-summary", year],
    queryFn: async () => {
      const { data } = await supabase.from("financial_summary").select("*").maybeSingle();
      return data || DEMO_SUMMARY;
    },
  });

  const monthlyData = useMemo(() => generateMonthlyData(parseInt(year)), [year]);

  const totalProyeksi = monthlyData
    .filter((m) => m.proyeksi !== null)
    .reduce((s, m) => s + (m.proyeksi || 0), 0);

  const profitMargin = summary.total_revenue
    ? ((summary.net_profit / summary.total_revenue) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" /> Dashboard Keuangan Terpadu
          </h1>
          <p className="text-muted-foreground text-sm">Ringkasan lengkap P&L, arus kas, proyeksi & piutang</p>
        </div>
        <div className="flex items-center gap-3">
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Pendapatan", value: summary.total_revenue,
            prev: summary.prev_revenue, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50",
          },
          {
            label: "Total Pengeluaran", value: summary.total_expenses,
            prev: summary.prev_expenses, icon: TrendingDown, color: "text-red-500", bg: "bg-red-50",
          },
          {
            label: "Laba Bersih", value: summary.net_profit,
            prev: summary.prev_profit, icon: DollarSign, color: "text-primary", bg: "bg-primary/10",
            suffix: ` (margin ${profitMargin}%)`,
          },
          {
            label: "Saldo Kas", value: summary.cash_balance,
            prev: null, icon: Wallet, color: "text-blue-600", bg: "bg-blue-50",
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
              <p className="text-xl font-bold">{formatCurrency(s.value)}</p>
              {s.suffix && <p className="text-xs text-muted-foreground">{s.suffix}</p>}
              {s.prev !== null && s.prev !== undefined && (
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
      {summary.total_outstanding > 0 && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span>
            Total piutang belum terbayar: <strong>{formatCurrency(summary.total_outstanding)}</strong>
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
              <CardDescription>Pendapatan vs Pengeluaran aktual + proyeksi 3 bulan ke depan</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
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
                  <ReferenceLine x={MONTHS[new Date().getMonth()]} stroke="#6366f1" strokeDasharray="4 4" label={{ value: "Sekarang", fontSize: 10, fill: "#6366f1" }} />
                  <Area type="monotone" dataKey="pendapatan" name="Pendapatan" stroke="#10b981" fill="url(#colorPendapatan)" strokeWidth={2} connectNulls />
                  <Area type="monotone" dataKey="pengeluaran" name="Pengeluaran" stroke="#ef4444" fill="url(#colorPengeluaran)" strokeWidth={2} connectNulls />
                  <Area type="monotone" dataKey="proyeksi" name="Proyeksi Pendapatan" stroke="#3b82f6" fill="url(#colorProyeksi)" strokeWidth={2} strokeDasharray="5 5" connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Expense Breakdown */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Komposisi Pengeluaran</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {EXPENSE_CATEGORIES.map((e) => (
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
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${e.pct}%`, opacity: 0.5 + e.pct / 100 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
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
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 11 }} width={48} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="pendapatan" name="Aktual" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="proyeksi" name="Proyeksi" fill="#3b82f680" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Month vs Month Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Pendapatan", current: summary.total_revenue, prev: summary.prev_revenue, icon: TrendingUp, color: "emerald" },
              { label: "Pengeluaran", current: summary.total_expenses, prev: summary.prev_expenses, icon: TrendingDown, color: "red" },
              { label: "Laba Bersih", current: summary.net_profit, prev: summary.prev_profit, icon: Target, color: "primary" },
            ].map((c) => {
              const diff = c.current - c.prev;
              const up = diff >= 0;
              return (
                <Card key={c.label} className="shadow-sm">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground font-medium mb-2">{c.label}</p>
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
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Proyeksi 3 Bulan */}
          <Card className="shadow-sm border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" /> Proyeksi 3 Bulan ke Depan
              </CardTitle>
              <CardDescription>Estimasi pendapatan berdasarkan tren historis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalProyeksi)}</p>
                  <p className="text-sm text-muted-foreground">Total proyeksi 3 bulan ke depan</p>
                </div>
                <Badge variant="outline" className="text-blue-600 border-blue-300">
                  Estimasi berdasarkan tren
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: AR Aging */}
        <TabsContent value="ar" className="space-y-4 mt-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-amber-500" /> Aging Piutang (AR)
              </CardTitle>
              <CardDescription>Distribusi piutang berdasarkan umur tagihan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {AR_AGING.map((a) => (
                <div key={a.range}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${a.color}`} />
                      <span className="font-medium">{a.range}</span>
                      <Badge variant="outline" className="text-xs">{a.count} jamaah</Badge>
                    </div>
                    <span className="font-bold">{formatCurrency(a.amount)}</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${a.color}`}
                      style={{ width: `${(a.amount / summary.total_outstanding) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t flex items-center justify-between">
                <span className="font-semibold">Total Piutang</span>
                <span className="font-bold text-lg">{formatCurrency(summary.total_outstanding)}</span>
              </div>
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
