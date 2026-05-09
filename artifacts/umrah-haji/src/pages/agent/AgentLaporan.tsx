import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { formatCurrency } from "@/lib/format";
import {
  FileSpreadsheet, FileDown, TrendingUp, Users, DollarSign,
  CheckCircle2, Clock, Package, Calendar, ArrowUpRight
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = subMonths(new Date(), i);
  return {
    value: format(d, "yyyy-MM"),
    label: format(d, "MMMM yyyy", { locale: localeId }),
  };
});

export default function AgentLaporan() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0].value);

  const { data: agentData } = useQuery({
    queryKey: ["agent-profile-laporan", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("id, company_name, commission_rate")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [year, month] = selectedMonth.split("-");
  const startDate = startOfMonth(new Date(Number(year), Number(month) - 1)).toISOString();
  const endDate = endOfMonth(new Date(Number(year), Number(month) - 1)).toISOString();

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["agent-laporan-bookings", agentData?.id, selectedMonth],
    enabled: !!agentData?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, booking_code, status, total_price, created_at,
          customer:customers(full_name, phone),
          departure:departures(departure_date, package:packages(name))
        `)
        .eq("agent_id", agentData!.id)
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: commissions = [], isLoading: commLoading } = useQuery({
    queryKey: ["agent-laporan-comm", agentData?.id, selectedMonth],
    enabled: !!agentData?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_commissions")
        .select("*")
        .eq("agent_id", agentData!.id)
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Stats
  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter((b: any) => ["confirmed", "processing", "completed"].includes(b.status)).length;
  const totalRevenue = bookings.reduce((s: number, b: any) => s + Number(b.total_price || 0), 0);
  const totalComm = commissions.reduce((s: number, c: any) => s + Number(c.commission_amount || 0), 0);
  const paidComm = commissions.filter((c: any) => c.status === "paid").reduce((s: number, c: any) => s + Number(c.commission_amount || 0), 0);
  const pendingComm = commissions.filter((c: any) => c.status === "pending").reduce((s: number, c: any) => s + Number(c.commission_amount || 0), 0);

  // Last 6 months chart data
  const { data: chartData = [] } = useQuery({
    queryKey: ["agent-chart-6m", agentData?.id],
    enabled: !!agentData?.id,
    queryFn: async () => {
      const result = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const s = startOfMonth(d).toISOString();
        const e = endOfMonth(d).toISOString();
        const { data } = await supabase
          .from("bookings")
          .select("id, total_price")
          .eq("agent_id", agentData!.id)
          .gte("created_at", s)
          .lte("created_at", e);
        const total = (data || []).reduce((sum: number, b: any) => sum + Number(b.total_price || 0), 0);
        result.push({
          month: format(d, "MMM", { locale: localeId }),
          booking: (data || []).length,
          revenue: total,
        });
      }
      return result;
    },
  });

  const exportExcel = () => {
    const rows = bookings.map((b: any) => ({
      "Kode Booking": b.booking_code,
      "Nama Jamaah": b.customer?.full_name || "-",
      "HP": b.customer?.phone || "-",
      "Paket": b.departure?.package?.name || "-",
      "Keberangkatan": b.departure?.departure_date ? format(parseISO(b.departure.departure_date), "d MMM yyyy", { locale: localeId }) : "-",
      "Status": b.status,
      "Total Harga": Number(b.total_price || 0),
      "Tgl Booking": b.created_at ? format(parseISO(b.created_at), "d MMM yyyy", { locale: localeId }) : "-",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Booking");

    const commRows = commissions.map((c: any) => ({
      "Tanggal": c.created_at ? format(parseISO(c.created_at), "d MMM yyyy", { locale: localeId }) : "-",
      "Komisi": Number(c.commission_amount || 0),
      "Status": c.status,
      "Keterangan": c.notes || "-",
    }));
    const wsComm = XLSX.utils.json_to_sheet(commRows);
    XLSX.utils.book_append_sheet(wb, wsComm, "Komisi");

    XLSX.writeFile(wb, `Laporan_Agen_${selectedMonth}.xlsx`);
    toast.success("File Excel berhasil diunduh!");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || selectedMonth;

    doc.setFontSize(16);
    doc.text("Laporan Bulanan Agen", 14, 20);
    doc.setFontSize(11);
    doc.text(`${agentData?.company_name || "Agen"}  —  ${monthLabel}`, 14, 28);

    doc.setFontSize(10);
    doc.text(`Total Booking: ${totalBookings}  |  Konfirmasi: ${confirmedBookings}`, 14, 38);
    doc.text(`Total Komisi: ${formatCurrency(totalComm)}  |  Lunas: ${formatCurrency(paidComm)}  |  Pending: ${formatCurrency(pendingComm)}`, 14, 45);

    autoTable(doc, {
      startY: 53,
      head: [["Kode", "Jamaah", "Paket", "Status", "Total"]],
      body: bookings.map((b: any) => [
        b.booking_code,
        b.customer?.full_name || "-",
        b.departure?.package?.name || "-",
        b.status,
        formatCurrency(Number(b.total_price || 0)),
      ]),
      styles: { fontSize: 8 },
    });

    doc.save(`Laporan_Agen_${selectedMonth}.pdf`);
    toast.success("File PDF berhasil diunduh!");
  };

  const STATUS_STYLE: Record<string, string> = {
    confirmed: "bg-green-100 text-green-700",
    processing: "bg-blue-100 text-blue-700",
    completed: "bg-emerald-100 text-emerald-700",
    pending: "bg-yellow-100 text-yellow-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">Laporan Bulanan</h1>
          <p className="text-sm text-muted-foreground">Rekap booking dan komisi per bulan</p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-44">
            <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Total Booking", value: String(totalBookings), sub: `${confirmedBookings} konfirmasi`, icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Total Komisi", value: formatCurrency(totalComm), sub: "Bulan ini", icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
          { label: "Komisi Lunas", value: formatCurrency(paidComm), sub: "Sudah dibayarkan", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Komisi Pending", value: formatCurrency(pendingComm), sub: "Menunggu cair", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", s.bg)}>
                    <Icon className={cn("h-4 w-4", s.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="font-bold text-sm leading-tight">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.sub}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Chart 6 Bulan */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Tren Booking — 6 Bulan Terakhir</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => [v, "Booking"]} />
              <Bar dataKey="booking" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Download */}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={exportExcel} disabled={bookings.length === 0}>
          <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" /> Excel
        </Button>
        <Button variant="outline" className="flex-1" onClick={exportPDF} disabled={bookings.length === 0}>
          <FileDown className="h-4 w-4 mr-2 text-red-600" /> PDF
        </Button>
      </div>

      {/* Booking List */}
      <div>
        <p className="text-sm font-semibold mb-2">Detail Booking</p>
        {bookingsLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Tidak ada booking di bulan ini</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bookings.map((b: any) => (
              <Card key={b.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{b.customer?.full_name || "-"}</p>
                        <Badge className={cn("text-[10px]", STATUS_STYLE[b.status] || "bg-gray-100 text-gray-600")}>
                          {b.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{b.booking_code}</p>
                      <p className="text-xs text-muted-foreground">{b.departure?.package?.name || "-"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm text-primary">{formatCurrency(Number(b.total_price || 0))}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {b.created_at ? format(parseISO(b.created_at), "d MMM yy", { locale: localeId }) : "-"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
