import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Users, Target, Download,
  RefreshCcw, ArrowUpRight, ArrowDownRight, FileSpreadsheet, FileText,
  CreditCard, PiggyBank, Calendar
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COLORS = ["hsl(var(--primary))", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
const MONTHS_ID = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

function StatCard({
  label, value, sub, trend, icon: Icon, color = "blue"
}: {
  label: string; value: string; sub?: string; trend?: number;
  icon: any; color?: string;
}) {
  const up = (trend ?? 0) >= 0;
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
            <p className="text-2xl font-bold tracking-tight truncate">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            {trend !== undefined && (
              <span className={`inline-flex items-center gap-0.5 text-xs font-semibold mt-1 ${up ? "text-emerald-600" : "text-red-500"}`}>
                {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(trend).toFixed(1)}% vs bln lalu
              </span>
            )}
          </div>
          <div className={`p-2.5 rounded-xl bg-${color}-100 dark:bg-${color}-950/40 flex-shrink-0`}>
            <Icon className={`h-5 w-5 text-${color}-600 dark:text-${color}-400`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminLaporanKeuangan() {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [tab, setTab] = useState("pendapatan");

  const years = useMemo(() => {
    const cur = new Date().getFullYear();
    return [cur, cur - 1, cur - 2].map(String);
  }, []);

  // Fetch bookings for the selected year
  const { data: bookings = [], isLoading: loadingBookings, refetch } = useQuery({
    queryKey: ["laporan-keuangan-bookings", year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, total_price, paid_amount, booking_status, created_at,
          departure:departures(departure_date, package:packages(name, price))
        `)
        .gte("created_at", `${year}-01-01`)
        .lte("created_at", `${year}-12-31`)
        .order("created_at");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch savings for the selected year
  const { data: savings = [], isLoading: loadingSavings } = useQuery({
    queryKey: ["laporan-keuangan-savings", year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("savings_plans")
        .select(`id, target_amount, status, created_at, converted_at`)
        .gte("created_at", `${year}-01-01`)
        .lte("created_at", `${year}-12-31`);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch payments for the selected year
  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["laporan-keuangan-payments", year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(`id, amount, status, payment_date, payment_type`)
        .gte("payment_date", `${year}-01-01`)
        .lte("payment_date", `${year}-12-31`)
        .eq("status", "verified");
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = loadingBookings || loadingSavings || loadingPayments;

  // Build monthly data
  const monthlyData = useMemo(() => {
    return MONTHS_ID.map((month, idx) => {
      const monthNum = idx + 1;
      const monthStr = `${year}-${String(monthNum).padStart(2, "0")}`;

      const monthBookings = bookings.filter((b: any) => b.created_at?.startsWith(monthStr));
      const pendapatan = monthBookings.reduce((s: number, b: any) => s + (b.total_price || 0), 0);
      const terkumpul = monthBookings.reduce((s: number, b: any) => s + (b.paid_amount || 0), 0);
      const jumlahBooking = monthBookings.length;

      const monthPayments = payments.filter((p: any) => p.payment_date?.startsWith(monthStr));
      const kas_masuk = monthPayments.reduce((s: number, p: any) => s + (p.amount || 0), 0);

      const monthSavings = savings.filter((s: any) => s.created_at?.startsWith(monthStr));
      const tabunganBaru = monthSavings.length;
      const tabunganKonversi = savings.filter((s: any) => s.converted_at?.startsWith(monthStr)).length;

      const target = 300_000_000; // configurable target
      return { month, pendapatan, terkumpul, kas_masuk, jumlahBooking, tabunganBaru, tabunganKonversi, target };
    });
  }, [bookings, payments, savings, year]);

  // Summary stats
  const summary = useMemo(() => {
    const totalPendapatan = bookings.reduce((s: number, b: any) => s + (b.total_price || 0), 0);
    const totalTerkumpul = bookings.reduce((s: number, b: any) => s + (b.paid_amount || 0), 0);
    const totalOutstanding = totalPendapatan - totalTerkumpul;
    const totalBooking = bookings.length;
    const bookingKonfirmasi = bookings.filter((b: any) => ["confirmed", "completed"].includes(b.booking_status)).length;
    const tabunganTotal = savings.length;
    const tabunganKonversi = savings.filter((s: any) => s.status === "converted").length;
    const konversiRate = tabunganTotal > 0 ? (tabunganKonversi / tabunganTotal) * 100 : 0;

    // Prev month for trend
    const curMonth = new Date().getMonth();
    const prevMonth = curMonth === 0 ? 11 : curMonth - 1;
    const curStr = `${year}-${String(curMonth + 1).padStart(2, "0")}`;
    const prevStr = curMonth === 0
      ? `${Number(year) - 1}-12`
      : `${year}-${String(prevMonth + 1).padStart(2, "0")}`;

    const curRevenue = bookings
      .filter((b: any) => b.created_at?.startsWith(curStr))
      .reduce((s: number, b: any) => s + (b.total_price || 0), 0);
    const prevRevenue = bookings
      .filter((b: any) => b.created_at?.startsWith(prevStr))
      .reduce((s: number, b: any) => s + (b.total_price || 0), 0);
    const revenueTrend = prevRevenue > 0 ? ((curRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    return { totalPendapatan, totalTerkumpul, totalOutstanding, totalBooking, bookingKonfirmasi, tabunganTotal, tabunganKonversi, konversiRate, revenueTrend };
  }, [bookings, savings, year]);

  // Export Excel
  function exportExcel() {
    const rows = monthlyData.map(m => ({
      "Bulan": m.month,
      "Pendapatan (Rp)": m.pendapatan,
      "Terkumpul (Rp)": m.terkumpul,
      "Kas Masuk (Rp)": m.kas_masuk,
      "Jumlah Booking": m.jumlahBooking,
      "Tabungan Baru": m.tabunganBaru,
      "Konversi Tabungan": m.tabunganKonversi,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Keuangan");
    XLSX.writeFile(wb, `laporan-keuangan-${year}.xlsx`);
    toast.success("File Excel berhasil diunduh");
  }

  // Export PDF
  function exportPDF() {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(18);
    doc.text(`Laporan Keuangan ${year}`, 14, 20);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Total Pendapatan: ${formatCurrency(summary.totalPendapatan)}  |  Terkumpul: ${formatCurrency(summary.totalTerkumpul)}`, 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [["Bulan", "Pendapatan", "Terkumpul", "Kas Masuk", "Booking", "Tabungan Baru", "Konversi"]],
      body: monthlyData.map(m => [
        m.month,
        formatCurrency(m.pendapatan),
        formatCurrency(m.terkumpul),
        formatCurrency(m.kas_masuk),
        m.jumlahBooking,
        m.tabunganBaru,
        m.tabunganKonversi,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save(`laporan-keuangan-${year}.pdf`);
    toast.success("File PDF berhasil diunduh");
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs">
        <p className="font-bold mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: {typeof p.value === "number" && p.value > 1000
              ? formatCurrency(p.value)
              : p.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laporan Keuangan</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Grafik pendapatan, booking, dan konversi tabungan</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCcw className="h-4 w-4 mr-1.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <FileText className="h-4 w-4 mr-1.5" /> PDF
          </Button>
        </div>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Pendapatan" value={formatCurrency(summary.totalPendapatan)} sub={`Terkumpul ${formatCurrency(summary.totalTerkumpul)}`} trend={summary.revenueTrend} icon={DollarSign} color="emerald" />
          <StatCard label="Outstanding" value={formatCurrency(summary.totalOutstanding)} sub={`${summary.totalBooking} total booking`} icon={CreditCard} color="amber" />
          <StatCard label="Total Booking" value={summary.totalBooking.toString()} sub={`${summary.bookingKonfirmasi} terkonfirmasi`} icon={Users} color="blue" />
          <StatCard label="Konversi Tabungan" value={`${summary.konversiRate.toFixed(1)}%`} sub={`${summary.tabunganKonversi} dari ${summary.tabunganTotal} tabungan`} icon={PiggyBank} color="purple" />
        </div>
      )}

      {/* Charts */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pendapatan">Pendapatan Bulanan</TabsTrigger>
          <TabsTrigger value="booking">Booking vs Target</TabsTrigger>
          <TabsTrigger value="tabungan">Konversi Tabungan</TabsTrigger>
          <TabsTrigger value="tabel">Tabel Detail</TabsTrigger>
        </TabsList>

        {/* Pendapatan Bulanan */}
        <TabsContent value="pendapatan">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pendapatan & Kas Masuk Bulanan {year}</CardTitle>
              <CardDescription>Perbandingan pendapatan (target) vs kas yang sudah terkumpul</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-72 w-full" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="gradPendapatan" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradTerkumpul" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS[2]} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={COLORS[2]} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={v => `${(v / 1_000_000).toFixed(0)}jt`} tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area type="monotone" dataKey="pendapatan" name="Pendapatan" stroke={COLORS[0]} fill="url(#gradPendapatan)" strokeWidth={2} />
                    <Area type="monotone" dataKey="terkumpul" name="Terkumpul" stroke={COLORS[2]} fill="url(#gradTerkumpul)" strokeWidth={2} />
                    <Area type="monotone" dataKey="kas_masuk" name="Kas Masuk" stroke={COLORS[3]} fill="none" strokeDasharray="5 3" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Booking vs Target */}
        <TabsContent value="booking">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Booking Bulanan vs Target {year}</CardTitle>
              <CardDescription>Jumlah booking per bulan dibandingkan dengan target omzet Rp 300jt/bln</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-72 w-full" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${(v / 1_000_000).toFixed(0)}jt`} tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="jumlahBooking" name="Jumlah Booking" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="pendapatan" name="Pendapatan" fill={COLORS[1]} radius={[4, 4, 0, 0]} opacity={0.7} />
                    <ReferenceLine yAxisId="right" y={300_000_000} stroke={COLORS[4]} strokeDasharray="6 3" label={{ value: "Target", fill: COLORS[4], fontSize: 11 }} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Konversi Tabungan */}
        <TabsContent value="tabungan">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Konversi Tabungan → Booking {year}</CardTitle>
              <CardDescription>Jumlah tabungan baru dibandingkan yang berhasil dikonversi menjadi booking</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-72 w-full" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="tabunganBaru" name="Tabungan Baru" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="tabunganKonversi" name="Konversi ke Booking" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tabel */}
        <TabsContent value="tabel">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tabel Laporan Bulanan {year}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? <Skeleton className="h-72 w-full" /> : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bulan</TableHead>
                        <TableHead className="text-right">Pendapatan</TableHead>
                        <TableHead className="text-right">Terkumpul</TableHead>
                        <TableHead className="text-right">Kas Masuk</TableHead>
                        <TableHead className="text-right">Booking</TableHead>
                        <TableHead className="text-right">Tabungan Baru</TableHead>
                        <TableHead className="text-right">Konversi</TableHead>
                        <TableHead className="text-right">% Konversi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyData.map((m, i) => {
                        const konversiPct = m.tabunganBaru > 0 ? (m.tabunganKonversi / m.tabunganBaru) * 100 : 0;
                        const isCurrentMonth = i === new Date().getMonth() && year === new Date().getFullYear().toString();
                        return (
                          <TableRow key={m.month} className={isCurrentMonth ? "bg-primary/5 font-medium" : ""}>
                            <TableCell className="font-medium">
                              {m.month}
                              {isCurrentMonth && <Badge className="ml-2 text-[10px] h-4" variant="outline">Bulan Ini</Badge>}
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(m.pendapatan)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(m.terkumpul)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(m.kas_masuk)}</TableCell>
                            <TableCell className="text-right">{m.jumlahBooking}</TableCell>
                            <TableCell className="text-right">{m.tabunganBaru}</TableCell>
                            <TableCell className="text-right">{m.tabunganKonversi}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={konversiPct >= 50 ? "default" : "secondary"} className="text-[10px]">
                                {konversiPct.toFixed(0)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">{formatCurrency(summary.totalPendapatan)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(summary.totalTerkumpul)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(payments.reduce((s: number, p: any) => s + (p.amount || 0), 0))}</TableCell>
                        <TableCell className="text-right">{summary.totalBooking}</TableCell>
                        <TableCell className="text-right">{summary.tabunganTotal}</TableCell>
                        <TableCell className="text-right">{summary.tabunganKonversi}</TableCell>
                        <TableCell className="text-right">
                          <Badge>{summary.konversiRate.toFixed(0)}%</Badge>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
