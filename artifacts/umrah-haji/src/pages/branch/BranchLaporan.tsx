import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from "recharts";
import { formatCurrency } from "@/lib/format";
import { FileSpreadsheet, FileDown, DollarSign, TrendingUp, Package, Users, Calendar } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = subMonths(new Date(), i);
  return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy", { locale: localeId }) };
});

export default function BranchLaporan() {
  const { user, branchId } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0].value);

  const { data: branchData } = useQuery({
    queryKey: ["branch-data-laporan", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await (supabase as any).from("branches").select("id, name").eq("manager_user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const bId = branchData?.id || branchId;
  const [year, month] = selectedMonth.split("-");
  const startDate = startOfMonth(new Date(Number(year), Number(month) - 1)).toISOString();
  const endDate = endOfMonth(new Date(Number(year), Number(month) - 1)).toISOString();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["branch-laporan-bookings", bId, selectedMonth],
    enabled: !!bId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`id, booking_code, status, total_price, created_at,
          customer:customers(full_name, phone),
          agent:agents(company_name),
          departure:departures(departure_date, package:packages(name))`)
        .eq("branch_id", bId)
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: chartData = [] } = useQuery({
    queryKey: ["branch-chart-laporan", bId],
    enabled: !!bId,
    queryFn: async () => {
      const result = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const { data } = await supabase.from("bookings").select("total_price, status")
          .eq("branch_id", bId).gte("created_at", startOfMonth(d).toISOString()).lte("created_at", endOfMonth(d).toISOString());
        const confirmed = (data || []).filter((b: any) => ["confirmed","processing","completed"].includes(b.status));
        const total = confirmed.reduce((s: number, b: any) => s + Number(b.total_price || 0), 0);
        result.push({ month: format(d, "MMM yy", { locale: localeId }), booking: (data || []).length, revenue: total });
      }
      return result;
    },
  });

  const totalRevenue = bookings.filter((b: any) => ["confirmed","processing","completed"].includes(b.status))
    .reduce((s: number, b: any) => s + Number(b.total_price || 0), 0);
  const totalBookings = bookings.length;
  const confirmed = bookings.filter((b: any) => ["confirmed","processing","completed"].includes(b.status)).length;

  const exportExcel = () => {
    const rows = bookings.map((b: any) => ({
      "Kode Booking": b.booking_code,
      "Jamaah": b.customer?.full_name || "-",
      "HP": b.customer?.phone || "-",
      "Agen": b.agent?.company_name || "-",
      "Paket": b.departure?.package?.name || "-",
      "Status": b.status,
      "Total": Number(b.total_price || 0),
      "Tgl": b.created_at ? format(parseISO(b.created_at), "d MMM yyyy", { locale: localeId }) : "-",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Booking");
    XLSX.writeFile(wb, `Laporan_Cabang_${selectedMonth}.xlsx`);
    toast.success("Excel diunduh!");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14); doc.text("Laporan Revenue Cabang", 14, 18);
    doc.setFontSize(10); doc.text(`${branchData?.name} — ${MONTHS.find(m => m.value === selectedMonth)?.label}`, 14, 26);
    doc.text(`Total Booking: ${totalBookings} | Confirmed: ${confirmed} | Revenue: ${formatCurrency(totalRevenue)}`, 14, 34);
    autoTable(doc, {
      startY: 42,
      head: [["Kode", "Jamaah", "Agen", "Paket", "Status", "Total"]],
      body: bookings.map((b: any) => [b.booking_code, b.customer?.full_name || "-", b.agent?.company_name || "-", b.departure?.package?.name || "-", b.status, formatCurrency(Number(b.total_price || 0))]),
      styles: { fontSize: 8 },
    });
    doc.save(`Laporan_Cabang_${selectedMonth}.pdf`);
    toast.success("PDF diunduh!");
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">Laporan Revenue Cabang</h1>
          <p className="text-sm text-muted-foreground">Rekap pendapatan dan booking per bulan</p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-44">
            <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Booking", value: String(totalBookings), icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Confirmed", value: String(confirmed), icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
          { label: "Revenue", value: formatCurrency(totalRevenue), icon: DollarSign, color: "text-amber-600", bg: "bg-amber-50" },
        ].map(k => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardContent className="p-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", k.bg)}>
                  <Icon className={cn("h-4 w-4", k.color)} />
                </div>
                <p className="font-bold text-base">{k.value}</p>
                <p className="text-xs text-muted-foreground">{k.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-1"><CardTitle className="text-sm">Tren 6 Bulan Terakhir</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000000).toFixed(0)}jt`} />
              <Tooltip formatter={(v: any, n) => [n === "revenue" ? formatCurrency(v) : v, n === "revenue" ? "Revenue" : "Booking"]} />
              <Bar dataKey="booking" fill="#93c5fd" radius={[3,3,0,0]} name="booking" />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[3,3,0,0]} name="revenue" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Export */}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={exportExcel} disabled={bookings.length === 0}>
          <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" /> Excel
        </Button>
        <Button variant="outline" className="flex-1" onClick={exportPDF} disabled={bookings.length === 0}>
          <FileDown className="h-4 w-4 mr-2 text-red-600" /> PDF
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Detail Booking Bulan Ini</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : bookings.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">Tidak ada booking di bulan ini</p>
          ) : (
            <div className="space-y-2">
              {bookings.map((b: any) => (
                <div key={b.id} className="flex items-start justify-between gap-2 py-2 border-b last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{b.customer?.full_name || "-"}</p>
                    <p className="text-xs text-muted-foreground">{b.booking_code} · {b.agent?.company_name || "Langsung"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm">{formatCurrency(Number(b.total_price || 0))}</p>
                    <Badge className={cn("text-[10px]",
                      b.status === "confirmed" || b.status === "completed" ? "bg-green-100 text-green-700" :
                      b.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"
                    )}>{b.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
