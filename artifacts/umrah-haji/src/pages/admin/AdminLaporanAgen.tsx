import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import {
  Users, DollarSign, TrendingUp, Award, Search, RefreshCcw,
  FileSpreadsheet, FileText, Star, Trophy, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { format, subMonths, startOfMonth } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COLORS = ["hsl(var(--primary))", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

type AgentPerf = {
  id: string;
  company_name: string;
  commission_rate: number;
  phone: string | null;
  booking_count: number;
  total_revenue: number;
  total_commission: number;
  referral_count: number;
  converted_referrals: number;
};

export default function AdminLaporanAgen() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"revenue" | "booking" | "commission" | "referral">("revenue");
  const [period, setPeriod] = useState("all");

  const periodStart = useMemo(() => {
    if (period === "all") return undefined;
    if (period === "3m") return format(subMonths(new Date(), 3), "yyyy-MM-dd");
    if (period === "6m") return format(subMonths(new Date(), 6), "yyyy-MM-dd");
    if (period === "1y") return format(subMonths(new Date(), 12), "yyyy-MM-dd");
    return undefined;
  }, [period]);

  // Fetch agents
  const { data: agents = [], isLoading: loadingAgents } = useQuery({
    queryKey: ["laporan-agen-agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("id, company_name, commission_rate, phone")
        .order("company_name");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch bookings with agent
  const { data: bookings = [], isLoading: loadingBookings, refetch } = useQuery({
    queryKey: ["laporan-agen-bookings", periodStart],
    queryFn: async () => {
      let q = supabase
        .from("bookings")
        .select("id, total_price, booking_status, agent_id, created_at")
        .not("agent_id", "is", null);
      if (periodStart) q = q.gte("created_at", periodStart);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch referrals
  const { data: referrals = [], isLoading: loadingReferrals } = useQuery({
    queryKey: ["laporan-agen-referrals", periodStart],
    queryFn: async () => {
      let q = supabase
        .from("referrals")
        .select("id, referrer_agent_id, status, created_at")
        .not("referrer_agent_id", "is", null);
      if (periodStart) q = q.gte("created_at", periodStart);
      const { data, error } = await q.limit(5000);
      if (error) return [];
      return data || [];
    },
  });

  // Fetch agent commissions
  const { data: commissions = [], isLoading: loadingCommissions } = useQuery({
    queryKey: ["laporan-agen-commissions", periodStart],
    queryFn: async () => {
      let q = supabase
        .from("agent_commissions")
        .select("id, agent_id, amount, status, created_at");
      if (periodStart) q = q.gte("created_at", periodStart);
      const { data, error } = await q.limit(5000);
      if (error) return [];
      return data || [];
    },
  });

  const isLoading = loadingAgents || loadingBookings;

  // Build agent performance
  const agentPerf = useMemo<AgentPerf[]>(() => {
    return agents.map((a: any) => {
      const agentBookings = bookings.filter((b: any) => b.agent_id === a.id);
      const total_revenue = agentBookings.reduce((s: number, b: any) => s + (b.total_price || 0), 0);
      const total_commission = commissions
        .filter((c: any) => c.agent_id === a.id)
        .reduce((s: number, c: any) => s + (c.amount || 0), 0);
      const agentReferrals = referrals.filter((r: any) => r.referrer_agent_id === a.id);
      const converted_referrals = agentReferrals.filter((r: any) => r.status === "converted" || r.status === "rewarded").length;

      return {
        id: a.id,
        company_name: a.company_name,
        commission_rate: a.commission_rate || 0,
        phone: a.phone,
        booking_count: agentBookings.length,
        total_revenue,
        total_commission,
        referral_count: agentReferrals.length,
        converted_referrals,
      };
    });
  }, [agents, bookings, commissions, referrals]);

  // Sort & filter
  const filteredSorted = useMemo(() => {
    let list = agentPerf;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => a.company_name.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      if (sortBy === "revenue") return b.total_revenue - a.total_revenue;
      if (sortBy === "booking") return b.booking_count - a.booking_count;
      if (sortBy === "commission") return b.total_commission - a.total_commission;
      if (sortBy === "referral") return b.converted_referrals - a.converted_referrals;
      return 0;
    });
  }, [agentPerf, search, sortBy]);

  // Top 3
  const top3 = filteredSorted.slice(0, 3);

  // Summary
  const summary = useMemo(() => ({
    totalAgents: agents.length,
    activeAgents: agentPerf.filter(a => a.booking_count > 0).length,
    totalRevenue: agentPerf.reduce((s, a) => s + a.total_revenue, 0),
    totalCommission: agentPerf.reduce((s, a) => s + a.total_commission, 0),
    totalReferrals: agentPerf.reduce((s, a) => s + a.referral_count, 0),
    totalConverted: agentPerf.reduce((s, a) => s + a.converted_referrals, 0),
  }), [agents, agentPerf]);

  const chartData = filteredSorted.slice(0, 10).map(a => ({
    name: a.company_name.length > 15 ? a.company_name.slice(0, 14) + "…" : a.company_name,
    pendapatan: a.total_revenue,
    komisi: a.total_commission,
    booking: a.booking_count,
  }));

  function exportExcel() {
    const rows = filteredSorted.map((a, i) => ({
      "Rank": i + 1,
      "Nama Agen": a.company_name,
      "Komisi Rate (%)": a.commission_rate,
      "Jumlah Booking": a.booking_count,
      "Total Pendapatan (Rp)": a.total_revenue,
      "Total Komisi (Rp)": a.total_commission,
      "Total Referral": a.referral_count,
      "Referral Konversi": a.converted_referrals,
      "Konversi Rate (%)": a.referral_count > 0 ? ((a.converted_referrals / a.referral_count) * 100).toFixed(1) : "0",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 6 }, { wch: 28 }, { wch: 14 }, { wch: 16 }, { wch: 22 }, { wch: 22 }, { wch: 16 }, { wch: 18 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Performa Agen");
    XLSX.writeFile(wb, `laporan-agen-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("File Excel berhasil diunduh");
  }

  function exportPDF() {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("Ringkasan Performa Agen", 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`${summary.activeAgents} agen aktif | Total Pendapatan: ${formatCurrency(summary.totalRevenue)} | Total Komisi: ${formatCurrency(summary.totalCommission)}`, 14, 26);

    autoTable(doc, {
      startY: 32,
      head: [["Rank", "Nama Agen", "Booking", "Pendapatan", "Komisi", "Referral", "Konversi"]],
      body: filteredSorted.map((a, i) => [
        i + 1,
        a.company_name,
        a.booking_count,
        formatCurrency(a.total_revenue),
        formatCurrency(a.total_commission),
        a.referral_count,
        `${a.converted_referrals} (${a.referral_count > 0 ? ((a.converted_referrals / a.referral_count) * 100).toFixed(0) : 0}%)`,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 185, 129] },
    });
    doc.save(`laporan-agen-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("File PDF berhasil diunduh");
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs">
        <p className="font-bold mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: {p.name === "booking" ? p.value : formatCurrency(p.value)}
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
          <h1 className="text-2xl font-bold tracking-tight">Performa Agen</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Komisi, booking, dan konversi referral per agen</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Waktu</SelectItem>
              <SelectItem value="3m">3 Bulan Terakhir</SelectItem>
              <SelectItem value="6m">6 Bulan Terakhir</SelectItem>
              <SelectItem value="1y">1 Tahun Terakhir</SelectItem>
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
          <Button variant="outline" size="sm" onClick={() => window.open(`/api/reports/export?type=agen&format=xlsx&period=${period}`, '_blank')}>
            <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Server Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open(`/api/reports/export?type=agen&format=pdf&period=${period}`, '_blank')}>
            <FileText className="h-4 w-4 mr-1.5" /> Server PDF
          </Button>
        </div>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Total Agen</p>
            <p className="text-2xl font-bold mt-1">{summary.totalAgents}</p>
            <p className="text-xs text-muted-foreground">{summary.activeAgents} aktif</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Total Pendapatan via Agen</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(summary.totalRevenue)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Total Komisi Dibayarkan</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(summary.totalCommission)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Referral Terkonversi</p>
            <p className="text-2xl font-bold mt-1">{summary.totalConverted}</p>
            <p className="text-xs text-muted-foreground">dari {summary.totalReferrals} referral</p>
          </CardContent></Card>
        </div>
      )}

      {/* Top 3 */}
      {!isLoading && top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {top3.map((a, i) => (
            <Card key={a.id} className={i === 0 ? "border-amber-300 bg-amber-50/40 dark:bg-amber-950/10" : ""}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  {i === 0 && <Trophy className="h-5 w-5 text-amber-500" />}
                  {i === 1 && <Award className="h-5 w-5 text-slate-400" />}
                  {i === 2 && <Star className="h-5 w-5 text-amber-700" />}
                  <Badge variant="outline" className="text-[10px]">#{i + 1} Top Agen</Badge>
                </div>
                <p className="font-bold">{a.company_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Komisi {a.commission_rate}%</p>
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Booking</span>
                    <span className="font-semibold">{a.booking_count}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Pendapatan</span>
                    <span className="font-semibold">{formatCurrency(a.total_revenue)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Komisi</span>
                    <span className="font-semibold text-emerald-600">{formatCurrency(a.total_commission)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Chart */}
      {!isLoading && chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 Agen — Pendapatan & Komisi</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tickFormatter={v => `${(v / 1_000_000).toFixed(0)}jt`} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="pendapatan" name="Pendapatan" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="komisi" name="Komisi" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <CardTitle className="text-sm font-medium">Semua Agen</CardTitle>
            <div className="flex gap-2">
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Cari agen..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
              </div>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Sort: Pendapatan</SelectItem>
                  <SelectItem value="booking">Sort: Booking</SelectItem>
                  <SelectItem value="commission">Sort: Komisi</SelectItem>
                  <SelectItem value="referral">Sort: Referral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filteredSorted.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Tidak ada agen ditemukan</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Rank</TableHead>
                    <TableHead>Nama Agen</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Booking</TableHead>
                    <TableHead className="text-right">Pendapatan</TableHead>
                    <TableHead className="text-right">Komisi</TableHead>
                    <TableHead className="text-right">Referral</TableHead>
                    <TableHead className="text-right">Konversi</TableHead>
                    <TableHead className="text-right">% Konversi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSorted.map((a, i) => {
                    const convRate = a.referral_count > 0 ? (a.converted_referrals / a.referral_count) * 100 : 0;
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="text-center">
                          {i === 0 && <Trophy className="h-4 w-4 text-amber-500 mx-auto" />}
                          {i === 1 && <Award className="h-4 w-4 text-slate-400 mx-auto" />}
                          {i === 2 && <Star className="h-4 w-4 text-amber-700 mx-auto" />}
                          {i > 2 && <span className="text-xs text-muted-foreground">{i + 1}</span>}
                        </TableCell>
                        <TableCell className="font-medium">{a.company_name}</TableCell>
                        <TableCell className="text-right text-xs">{a.commission_rate}%</TableCell>
                        <TableCell className="text-right">{a.booking_count}</TableCell>
                        <TableCell className="text-right text-xs">{formatCurrency(a.total_revenue)}</TableCell>
                        <TableCell className="text-right text-xs text-emerald-600 font-medium">{formatCurrency(a.total_commission)}</TableCell>
                        <TableCell className="text-right">{a.referral_count}</TableCell>
                        <TableCell className="text-right">{a.converted_referrals}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={convRate >= 50 ? "default" : "secondary"} className="text-[10px]">
                            {convRate.toFixed(0)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
