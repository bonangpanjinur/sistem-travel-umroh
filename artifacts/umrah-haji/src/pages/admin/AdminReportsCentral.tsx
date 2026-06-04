import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { 
  FileSpreadsheet, FileText, Download, Users, 
  CreditCard, TrendingUp, Plane, Loader2 
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { formatDateRange } from "@/lib/export-utils";
import { 
  getBookingColumns, getPaymentColumns, getManifestColumns, 
  getCommissionColumns, exportReport, isGenderMale 
} from "@/lib/report-helpers";
import { toast } from "sonner";

export default function AdminReportsCentral() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [selectedDeparture, setSelectedDeparture] = useState<string>("all");
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // --- Data Fetching ---

  const { data: departures = [] } = useQuery({
    queryKey: ["report-departures"],
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select("id, departure_date, package:packages(name)")
        .order("departure_date", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["central-report-stats", dateRange],
    queryFn: async () => {
      let bookingQuery = supabase.from("bookings").select("id, total_price, total_pax", { count: "exact" });
      let paymentQuery = supabase.from("payments").select("id, amount", { count: "exact" }).eq("status", "paid");
      let commissionQuery = supabase.from("agent_commissions").select("id, commission_amount", { count: "exact" });

      if (dateRange?.from) {
        const fromStr = dateRange.from.toISOString();
        bookingQuery = bookingQuery.gte("created_at", fromStr);
        paymentQuery = paymentQuery.gte("created_at", fromStr);
        commissionQuery = commissionQuery.gte("created_at", fromStr);
      }
      if (dateRange?.to) {
        const toStr = dateRange.to.toISOString();
        bookingQuery = bookingQuery.lte("created_at", toStr);
        paymentQuery = paymentQuery.lte("created_at", toStr);
        commissionQuery = commissionQuery.lte("created_at", toStr);
      }

      const [bRes, pRes, cRes] = await Promise.all([bookingQuery, paymentQuery, commissionQuery]);

      return {
        bookings: { count: bRes.count || 0, total: bRes.data?.reduce((s, b) => s + (b.total_price || 0), 0) || 0 },
        payments: { count: pRes.count || 0, total: pRes.data?.reduce((s, p) => s + (p.amount || 0), 0) || 0 },
        commissions: { count: cRes.count || 0, total: cRes.data?.reduce((s, c) => s + (c.commission_amount || 0), 0) || 0 },
      };
    },
  });

  // --- Export Handlers ---

  const handleExport = async (type: 'bookings' | 'payments' | 'commissions' | 'manifest', exportFormat: 'excel' | 'pdf') => {
    setIsExporting(`${type}-${exportFormat}`);
    try {
      const subtitle = `Periode: ${formatDateRange(dateRange?.from, dateRange?.to)}`;
      const timestamp = format(new Date(), "yyyyMMdd_HHmmss");

      if (type === 'bookings') {
        let query = supabase.from("bookings").select(`
          id, booking_code, room_type, total_pax, total_price, paid_amount,
          remaining_amount, booking_status, payment_status, created_at,
          customer:customers(full_name, phone),
          departure:departures(departure_date, package:packages(name))
        `);
        if (dateRange?.from) query = query.gte("created_at", dateRange.from.toISOString());
        if (dateRange?.to) query = query.lte("created_at", dateRange.to.toISOString());
        
        const { data } = await query;
        if (!data?.length) {
          toast.error("Tidak ada data untuk periode ini");
          return;
        }
        
        exportReport(exportFormat as any, data, getBookingColumns(), `Laporan_Booking_${timestamp}`, "Laporan Data Booking", subtitle);
      } 
      
      else if (type === 'payments') {
        let query = supabase.from("payments").select(`
          id, payment_code, amount, payment_method, bank_name, status, created_at, verified_at,
          booking:bookings(booking_code, customer:customers(full_name))
        `);
        if (dateRange?.from) query = query.gte("created_at", dateRange.from.toISOString());
        if (dateRange?.to) query = query.lte("created_at", dateRange.to.toISOString());
        
        const { data } = await query;
        if (!data?.length) {
          toast.error("Tidak ada data untuk periode ini");
          return;
        }
        
        exportReport(exportFormat as any, data, getPaymentColumns(), `Laporan_Pembayaran_${timestamp}`, "Laporan Pembayaran", subtitle);
      }

      else if (type === 'commissions') {
        let query = supabase.from("agent_commissions").select(`
          id, commission_amount, status, created_at,
          agent:agents(company_name),
          booking:bookings(booking_code, customer:customers(full_name))
        `);
        if (dateRange?.from) query = query.gte("created_at", dateRange.from.toISOString());
        if (dateRange?.to) query = query.lte("created_at", dateRange.to.toISOString());
        
        const { data } = await query;
        if (!data?.length) {
          toast.error("Tidak ada data untuk periode ini");
          return;
        }
        
        exportReport(exportFormat as any, data, getCommissionColumns(), `Laporan_Komisi_Agen_${timestamp}`, "Laporan Komisi Agen", subtitle);
      }

      else if (type === 'manifest') {
        if (selectedDeparture === 'all') {
          toast.error("Pilih keberangkatan terlebih dahulu");
          return;
        }
        
        const { data, error } = await supabase.from("booking_passengers").select(`
          id, full_name, gender, birth_date, nationality, passport_number, passport_expiry, phone,
          room_number, room_type, room_preference, passenger_type,
          booking:bookings!booking_passengers_booking_id_fkey(booking_code, departure_id)
        `).eq("booking.departure_id", selectedDeparture);

        if (error || !data?.length) {
          toast.error("Tidak ada jamaah di keberangkatan ini");
          return;
        }

        const processed = data.map((p: any) => ({
          ...p,
          booking_code: p.booking?.booking_code,
          doc_status: 'none' // Simplified for central report
        }));

        const dep = departures.find(d => d.id === selectedDeparture);
        const depName = dep ? `${(dep.package as any)?.name} (${format(new Date(dep.departure_date), 'dd MMM yyyy')})` : '';
        
        exportReport(exportFormat as any, processed, getManifestColumns(), `Manifest_${timestamp}`, "Manifest Jamaah", depName);
      }

      toast.success(`Laporan ${type} berhasil diunduh`);
    } catch (error) {
      console.error(error);
      toast.error("Gagal mengunduh laporan");
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laporan Terpusat</h1>
          <p className="text-muted-foreground">Unduh berbagai jenis laporan dari satu halaman</p>
        </div>
        <DateRangePicker date={dateRange} setDate={setDateRange} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Booking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.bookings.count || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">{formatCurrency(stats?.bookings.total || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pembayaran Masuk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.payments.count || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">{formatCurrency(stats?.payments.total || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Komisi Agen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.commissions.count || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">{formatCurrency(stats?.commissions.total || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Periode Aktif</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium truncate">{formatDateRange(dateRange?.from, dateRange?.to)}</div>
            <p className="text-xs text-muted-foreground mt-1">Gunakan filter untuk mengubah</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Laporan Keuangan/Booking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Laporan Keuangan & Booking
            </CardTitle>
            <CardDescription>Data transaksi, omzet, dan status pembayaran jamaah</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-full"><FileSpreadsheet className="h-4 w-4 text-blue-600" /></div>
                <div>
                  <div className="text-sm font-medium">Data Booking</div>
                  <div className="text-xs text-muted-foreground">Detail paket, harga, & status</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleExport('bookings', 'excel')} disabled={!!isExporting}>
                  {isExporting === 'bookings-excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excel'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleExport('bookings', 'pdf')} disabled={!!isExporting}>
                  {isExporting === 'bookings-pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'PDF'}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-full"><CreditCard className="h-4 w-4 text-emerald-600" /></div>
                <div>
                  <div className="text-sm font-medium">Data Pembayaran</div>
                  <div className="text-xs text-muted-foreground">Riwayat cicilan & pelunasan</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleExport('payments', 'excel')} disabled={!!isExporting}>
                  {isExporting === 'payments-excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excel'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleExport('payments', 'pdf')} disabled={!!isExporting}>
                  {isExporting === 'payments-pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'PDF'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Laporan Manifest */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-blue-500" />
              Laporan Manifest Jamaah
            </CardTitle>
            <CardDescription>Daftar jamaah per keberangkatan untuk keperluan maskapai/hotel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Pilih Keberangkatan</label>
              <Select value={selectedDeparture} onValueChange={setSelectedDeparture}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Jadwal..." />
                </SelectTrigger>
                <SelectContent>
                  {departures.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.package?.name} ({format(new Date(d.departure_date), 'dd MMM yyyy')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" variant="outline" onClick={() => handleExport('manifest', 'excel')} disabled={!!isExporting || selectedDeparture === 'all'}>
                {isExporting === 'manifest-excel' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
                Download Excel
              </Button>
              <Button className="flex-1" variant="outline" onClick={() => handleExport('manifest', 'pdf')} disabled={!!isExporting || selectedDeparture === 'all'}>
                {isExporting === 'manifest-pdf' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Laporan Agen */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              Laporan Komisi Agen
            </CardTitle>
            <CardDescription>Rekapitulasi komisi yang harus dibayarkan ke agen/mitra</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-full"><Users className="h-4 w-4 text-purple-600" /></div>
                <div>
                  <div className="text-sm font-medium">Rekap Komisi</div>
                  <div className="text-xs text-muted-foreground">Per agen & status bayar</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleExport('commissions', 'excel')} disabled={!!isExporting}>
                  {isExporting === 'commissions-excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excel'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleExport('commissions', 'pdf')} disabled={!!isExporting}>
                  {isExporting === 'commissions-pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'PDF'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-slate-50 border-none shadow-none">
          <CardHeader>
            <CardTitle className="text-sm">Petunjuk Penggunaan</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p>1. Gunakan <strong>Filter Periode</strong> di pojok kanan atas untuk menentukan rentang data (berdasarkan tanggal dibuat).</p>
            <p>2. Untuk <strong>Manifest</strong>, Anda wajib memilih jadwal keberangkatan spesifik terlebih dahulu.</p>
            <p>3. Format <strong>Excel</strong> cocok untuk pengolahan data lanjut, sementara <strong>PDF</strong> cocok untuk arsip atau cetak langsung.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
