import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from "recharts";
import { formatCurrency } from "@/lib/format";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import {
  Download, RefreshCcw, TrendingUp, DollarSign, Users, CheckCircle2,
  Clock, XCircle, Search, BarChart3
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COLORS = ["hsl(var(--primary))", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const STATUS_MAP: Record<string, { label: string; variant: any }> = {
  pending: { label: "Pending", variant: "secondary" },
  approved: { label: "Disetujui", variant: "default" },
  paid: { label: "Lunas", variant: "outline" },
  rejected: { label: "Ditolak", variant: "destructive" },
};

export default function AdminAgentCommissionReport() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 6),
    to: new Date(),
  });
  const [selectedAgent, setSelectedAgent] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: agents } = useQuery({
    queryKey: ["agents-for-commission"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("id, company_name, commission_rate")
        .order("company_name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: commissions, isLoading, refetch } = useQuery({
    queryKey: ["agent-commissions-report", dateRange, selectedAgent, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("agent_commissions")
        .select(`
          id, agent_id, booking_id, commission_amount, commission_rate,
          status, notes, created_at, paid_at,
          agent:agents(id, company_name, commission_rate),
          booking:bookings(id, booking_code, total_price, total_pax,
            customer:customers(full_name))
        `)
        .order("created_at", { ascending: false });

      if (dateRange?.from)
        query = query.gte("created_at", dateRange.from.toISOString());
      if (dateRange?.to)
        query = query.lte("created_at", dateRange.to.toISOString());
      if (selectedAgent !== "all")
        query = query.eq("agent_id", selectedAgent);
      if (statusFilter !== "all")
        query = query.eq("status", statusFilter);

      const { data, error } = await query.limit(2000);
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    if (!commissions) return [];
    if (!search) return commissions;
    const q = search.toLowerCase();
    return commissions.filter(
      (c: any) =>
        c.agent?.company_name?.toLowerCase().includes(q) ||
        c.booking?.booking_code?.toLowerCase().includes(q) ||
        c.booking?.customer?.full_name?.toLowerCase().includes(q)
    );
  }, [commissions, search]);

  const stats = useMemo(() => {
    const all = commissions || [];
    return {
      total: all.reduce((s: number, c: any) => s + (c.commission_amount || 0), 0),
      pending: all.filter((c: any) => c.status === "pending").reduce((s: number, c: any) => s + (c.commission_amount || 0), 0),
      paid: all.filter((c: any) => c.status === "paid").reduce((s: number, c: any) => s + (c.commission_amount || 0), 0),
      count: all.length,
      paidCount: all.filter((c: any) => c.status === "paid").length,
    };
  }, [commissions]);

  const monthlyData = useMemo(() => {
    if (!commissions || !dateRange?.from || !dateRange?.to) return [];
    const months = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });
    return months.map((month) => {
      const ms = startOfMonth(month);
      const me = endOfMonth(month);
      const mComm = commissions.filter((c: any) => {
        const d = parseISO(c.created_at);
        return d >= ms && d <= me;
      });
      return {
        month: format(month, "MMM yy", { locale: idLocale }),
        total: mComm.reduce((s: number, c: any) => s + (c.commission_amount || 0), 0),
        paid: mComm.filter((c: any) => c.status === "paid").reduce((s: number, c: any) => s + (c.commission_amount || 0), 0),
        pending: mComm.filter((c: any) => c.status === "pending").reduce((s: number, c: any) => s + (c.commission_amount || 0), 0),
      };
    });
  }, [commissions, dateRange]);

  const agentBreakdown = useMemo(() => {
    if (!commissions) return [];
    const map: Record<string, { name: string; total: number; paid: number; count: number }> = {};
    commissions.forEach((c: any) => {
      const id = c.agent_id || "unknown";
      const name = c.agent?.company_name || "Tidak Diketahui";
      if (!map[id]) map[id] = { name, total: 0, paid: 0, count: 0 };
      map[id].total += c.commission_amount || 0;
      if (c.status === "paid") map[id].paid += c.commission_amount || 0;
      map[id].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [commissions]);

  const exportExcel = () => {
    if (!filtered.length) { toast.error("Tidak ada data"); return; }
    const rows = filtered.map((c: any) => ({
      "Agen": c.agent?.company_name || "-",
      "Kode Booking": c.booking?.booking_code || "-",
      "Jamaah": c.booking?.customer?.full_name || "-",
      "Komisi": c.commission_amount || 0,
      "Rate (%)": c.commission_rate || 0,
      "Status": STATUS_MAP[c.status]?.label || c.status,
      "Tanggal": c.created_at ? format(parseISO(c.created_at), "dd/MM/yyyy") : "-",
      "Tanggal Lunas": c.paid_at ? format(parseISO(c.paid_at), "dd/MM/yyyy") : "-",
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Komisi Agen");
    XLSX.writeFile(wb, `Laporan_Komisi_Agen_${format(new Date(), "yyyyMMdd")}.xlsx`);
    toast.success("Diekspor ke Excel");
  };

  const exportPDF = () => {
    if (!filtered.length) { toast.error("Tidak ada data"); return; }
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Laporan Komisi Agen", 14, 18);
    doc.setFontSize(9);
    doc.text(`Total: ${formatCurrency(stats.total)} | Lunas: ${formatCurrency(stats.paid)} | Pending: ${formatCurrency(stats.pending)}`, 14, 26);
    autoTable(doc, {
      startY: 32,
      head: [["Agen", "Booking", "Jamaah", "Komisi", "Status", "Tanggal"]],
      body: filtered.slice(0, 100).map((c: any) => [
        c.agent?.company_name || "-",
        c.booking?.booking_code || "-",
        c.booking?.customer?.full_name || "-",
        formatCurrency(c.commission_amount || 0),
        STATUS_MAP[c.status]?.label || c.status,
        c.created_at ? format(parseISO(c.created_at), "dd/MM/yy") : "-",
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [139, 92, 246] },
    });
    doc.save(`Laporan_Komisi_Agen_${format(new Date(), "yyyyMMdd")}.pdf`);
    toast.success("Diekspor ke PDF");
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Laporan Komisi Agen</h1>
            <p className="text-muted-foreground text-sm">Detail komisi per agen, per periode, dengan grafik & export</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <Download className="h-4 w-4 mr-1" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <Download className="h-4 w-4 mr-1" /> PDF
          </Button>
          <DateRangePicker date={dateRange} setDate={setDateRange} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Komisi", value: formatCurrency(stats.total), icon: DollarSign, color: "text-primary" },
          { label: "Sudah Lunas", value: formatCurrency(stats.paid), icon: CheckCircle2, color: "text-emerald-500" },
          { label: "Pending", value: formatCurrency(stats.pending), icon: Clock, color: "text-amber-500" },
          { label: "Jumlah Transaksi", value: stats.count, icon: TrendingUp, color: "text-blue-500" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 flex items-center gap-3">
              <s.icon className={`h-7 w-7 ${s.color} flex-shrink-0`} />
              <div>
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Tren Komisi per Bulan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1e6).toFixed(0)}jt`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="paid" name="Lunas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 5 Agen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={agentBreakdown.slice(0, 5)} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name?.substring(0, 8)} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {agentBreakdown.slice(0, 5).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-agent breakdown */}
      {agentBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Komisi per Agen</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agen</TableHead>
                  <TableHead className="text-right">Total Komisi</TableHead>
                  <TableHead className="text-right">Lunas</TableHead>
                  <TableHead className="text-right">Transaksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentBreakdown.map((a, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(a.total)}</TableCell>
                    <TableCell className="text-right text-emerald-600">{formatCurrency(a.paid)}</TableCell>
                    <TableCell className="text-right">{a.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detail Transaksi Komisi</CardTitle>
          <div className="flex flex-wrap gap-3 mt-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 h-9" placeholder="Cari agen / booking..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Semua Agen" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Agen</SelectItem>
                {agents?.map((a) => <SelectItem key={a.id} value={a.id}>{a.company_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Semua Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agen</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead>Jamaah</TableHead>
                <TableHead className="text-right">Komisi</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tanggal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))
              ) : !filtered.length ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Tidak ada data komisi</TableCell></TableRow>
              ) : filtered.slice(0, 100).map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.agent?.company_name || "-"}</TableCell>
                  <TableCell className="font-mono text-xs">{c.booking?.booking_code || "-"}</TableCell>
                  <TableCell className="text-sm">{c.booking?.customer?.full_name || "-"}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(c.commission_amount || 0)}</TableCell>
                  <TableCell className="text-right text-sm">{c.commission_rate || 0}%</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_MAP[c.status]?.variant || "outline"}>
                      {STATUS_MAP[c.status]?.label || c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.created_at ? format(parseISO(c.created_at), "dd/MM/yyyy") : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
