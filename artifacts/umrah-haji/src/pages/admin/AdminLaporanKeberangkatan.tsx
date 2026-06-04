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
  Plane, Users, FileCheck, CreditCard, Search, Download,
  FileSpreadsheet, FileText, RefreshCcw, CheckCircle2, XCircle,
  Clock, AlertCircle, CalendarDays
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type BookingRow = {
  id: string;
  booking_code: string | null;
  booking_status: string;
  total_price: number;
  paid_amount: number;
  pax_count: number;
  created_at: string;
  customer: { full_name: string; phone: string } | null;
  departure: {
    id: string;
    departure_date: string | null;
    package: { name: string } | null;
  } | null;
  documents: { status: string }[];
  visa_status?: string;
};

type DepartureGroup = {
  departureId: string;
  departureDate: string;
  packageName: string;
  bookings: BookingRow[];
};

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:   { label: "Pending",    cls: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    confirmed: { label: "Dikonfirmasi", cls: "bg-blue-100 text-blue-800 border-blue-200" },
    completed: { label: "Selesai",    cls: "bg-green-100 text-green-800 border-green-200" },
    cancelled: { label: "Dibatalkan", cls: "bg-red-100 text-red-800 border-red-200" },
  };
  const item = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground border-border" };
  return <Badge className={`${item.cls} border text-[10px] font-medium`}>{item.label}</Badge>;
}

function payBadge(paid: number, total: number) {
  const pct = total > 0 ? (paid / total) * 100 : 0;
  if (pct >= 100) return <Badge className="bg-green-100 text-green-800 border border-green-200 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-0.5" />Lunas</Badge>;
  if (pct >= 50) return <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px]"><Clock className="h-3 w-3 mr-0.5" />Sebagian</Badge>;
  return <Badge className="bg-red-100 text-red-800 border border-red-200 text-[10px]"><XCircle className="h-3 w-3 mr-0.5" />Kurang</Badge>;
}

function docBadge(docs: { status: string }[]) {
  if (!docs?.length) return <Badge variant="outline" className="text-[10px]">Belum Upload</Badge>;
  const allVerified = docs.every(d => d.status === "verified");
  const anyPending = docs.some(d => d.status === "pending");
  if (allVerified) return <Badge className="bg-green-100 text-green-800 border border-green-200 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-0.5" />Lengkap</Badge>;
  if (anyPending) return <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px]"><Clock className="h-3 w-3 mr-0.5" />Review</Badge>;
  return <Badge className="bg-red-100 text-red-800 border border-red-200 text-[10px]"><AlertCircle className="h-3 w-3 mr-0.5" />Perlu Aksi</Badge>;
}

export default function AdminLaporanKeberangkatan() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDeparture, setSelectedDeparture] = useState("all");

  const { data: rawBookings = [], isLoading, refetch } = useQuery({
    queryKey: ["laporan-keberangkatan"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, booking_code, booking_status, total_price, paid_amount, pax_count, created_at,
          customer:profiles(full_name, phone),
          departure:departures(id, departure_date, package:packages(name)),
          documents:customer_documents(status)
        `)
        .not("departure_id", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as BookingRow[];
    },
  });

  // Group by departure
  const departures = useMemo<DepartureGroup[]>(() => {
    const map = new Map<string, DepartureGroup>();
    rawBookings.forEach((b: BookingRow) => {
      const dep = b.departure;
      if (!dep) return;
      if (!map.has(dep.id)) {
        map.set(dep.id, {
          departureId: dep.id,
          departureDate: dep.departure_date || "",
          packageName: dep.package?.name || "Paket Tidak Diketahui",
          bookings: [],
        });
      }
      map.get(dep.id)!.bookings.push(b);
    });
    return Array.from(map.values()).sort((a, b) =>
      (a.departureDate || "").localeCompare(b.departureDate || "")
    );
  }, [rawBookings]);

  // Filter bookings
  const filteredBookings = useMemo(() => {
    let list = rawBookings;
    if (selectedDeparture !== "all") list = list.filter((b: BookingRow) => b.departure?.id === selectedDeparture);
    if (statusFilter !== "all") list = list.filter((b: BookingRow) => b.booking_status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((b: BookingRow) =>
        b.customer?.full_name?.toLowerCase().includes(q) ||
        b.booking_code?.toLowerCase().includes(q) ||
        b.departure?.package?.name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rawBookings, selectedDeparture, statusFilter, search]);

  // Summary
  const summary = useMemo(() => {
    const total = filteredBookings.length;
    const lunas = filteredBookings.filter((b: BookingRow) => b.paid_amount >= b.total_price && b.total_price > 0).length;
    const dokumenLengkap = filteredBookings.filter((b: BookingRow) =>
      b.documents?.length > 0 && b.documents.every((d: any) => d.status === "verified")
    ).length;
    const totalPax = filteredBookings.reduce((s: number, b: BookingRow) => s + (b.pax_count || 1), 0);
    const totalPendapatan = filteredBookings.reduce((s: number, b: BookingRow) => s + (b.total_price || 0), 0);
    return { total, lunas, dokumenLengkap, totalPax, totalPendapatan };
  }, [filteredBookings]);

  function exportExcel() {
    const rows = filteredBookings.map((b: BookingRow, i: number) => ({
      "No": i + 1,
      "Kode Booking": b.booking_code || "-",
      "Nama Jamaah": b.customer?.full_name || "-",
      "No HP": b.customer?.phone || "-",
      "Paket": b.departure?.package?.name || "-",
      "Tanggal Keberangkatan": b.departure?.departure_date ? format(parseISO(b.departure.departure_date), "dd MMM yyyy", { locale: idLocale }) : "-",
      "Status Booking": b.booking_status,
      "Pax": b.pax_count || 1,
      "Total Harga": b.total_price,
      "Sudah Dibayar": b.paid_amount,
      "Sisa": b.total_price - b.paid_amount,
      "Status Dokumen": b.documents?.length > 0 ? (b.documents.every((d: any) => d.status === "verified") ? "Lengkap" : "Belum Lengkap") : "Belum Upload",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 5 }, { wch: 16 }, { wch: 25 }, { wch: 16 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 6 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Keberangkatan");
    XLSX.writeFile(wb, `laporan-keberangkatan-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("File Excel berhasil diunduh");
  }

  function exportPDF() {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("Laporan Jamaah per Keberangkatan", 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Total: ${summary.total} jamaah | ${summary.totalPax} pax | Pendapatan: ${formatCurrency(summary.totalPendapatan)}`, 14, 26);

    autoTable(doc, {
      startY: 32,
      head: [["No", "Kode Booking", "Nama Jamaah", "Paket", "Tgl Berangkat", "Status", "Bayar", "Dokumen"]],
      body: filteredBookings.map((b: BookingRow, i: number) => [
        i + 1,
        b.booking_code || "-",
        b.customer?.full_name || "-",
        b.departure?.package?.name || "-",
        b.departure?.departure_date ? format(parseISO(b.departure.departure_date), "dd MMM yyyy", { locale: idLocale }) : "-",
        b.booking_status,
        b.paid_amount >= b.total_price ? "Lunas" : "Sebagian",
        b.documents?.every((d: any) => d.status === "verified") ? "Lengkap" : "Belum",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });
    doc.save(`laporan-keberangkatan-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("File PDF berhasil diunduh");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laporan Keberangkatan</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Status dokumen, visa, dan pembayaran seluruh jamaah per keberangkatan</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCcw className="h-4 w-4 mr-1.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <FileText className="h-4 w-4 mr-1.5" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open(`/api/reports/export?type=manifest&format=xlsx${selectedDeparture !== 'all' ? `&departure_id=${selectedDeparture}` : ''}`, '_blank')}>
            <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Server Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open(`/api/reports/export?type=manifest&format=pdf${selectedDeparture !== 'all' ? `&departure_id=${selectedDeparture}` : ''}`, '_blank')}>
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
            <p className="text-xs text-muted-foreground">Total Jamaah</p>
            <p className="text-2xl font-bold mt-1">{summary.total}</p>
            <p className="text-xs text-muted-foreground">{summary.totalPax} pax</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Lunas</p>
            <p className="text-2xl font-bold mt-1">{summary.lunas}</p>
            <Progress value={summary.total > 0 ? (summary.lunas / summary.total) * 100 : 0} className="h-1.5 mt-2" />
          </CardContent></Card>
          <Card><CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Dokumen Lengkap</p>
            <p className="text-2xl font-bold mt-1">{summary.dokumenLengkap}</p>
            <Progress value={summary.total > 0 ? (summary.dokumenLengkap / summary.total) * 100 : 0} className="h-1.5 mt-2" />
          </CardContent></Card>
          <Card><CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Total Pendapatan</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(summary.totalPendapatan)}</p>
          </CardContent></Card>
        </div>
      )}

      {/* Departure quick select */}
      {!isLoading && departures.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm" variant={selectedDeparture === "all" ? "default" : "outline"}
            onClick={() => setSelectedDeparture("all")}
          >
            Semua
          </Button>
          {departures.map(d => (
            <Button
              key={d.departureId}
              size="sm"
              variant={selectedDeparture === d.departureId ? "default" : "outline"}
              onClick={() => setSelectedDeparture(d.departureId)}
            >
              <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
              {d.packageName} — {d.departureDate ? format(parseISO(d.departureDate), "dd MMM yyyy", { locale: idLocale }) : "TBD"}
              <Badge className="ml-2 text-[9px] h-4 bg-background/30">{d.bookings.length}</Badge>
            </Button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari nama, kode booking..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Dikonfirmasi</SelectItem>
            <SelectItem value="completed">Selesai</SelectItem>
            <SelectItem value="cancelled">Dibatalkan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-sm font-medium">
            {filteredBookings.length} jamaah ditemukan
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Plane className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Tidak ada data jamaah ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">No</TableHead>
                    <TableHead>Nama Jamaah</TableHead>
                    <TableHead>Kode Booking</TableHead>
                    <TableHead>Paket</TableHead>
                    <TableHead>Tgl Berangkat</TableHead>
                    <TableHead>Pax</TableHead>
                    <TableHead>Status Booking</TableHead>
                    <TableHead>Pembayaran</TableHead>
                    <TableHead>Dokumen</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((b: BookingRow, i: number) => (
                    <TableRow key={b.id}>
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell className="font-medium">{b.customer?.full_name || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{b.booking_code || "-"}</TableCell>
                      <TableCell className="text-xs max-w-36 truncate">{b.departure?.package?.name || "-"}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {b.departure?.departure_date
                          ? format(parseISO(b.departure.departure_date), "dd MMM yyyy", { locale: idLocale })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-center">{b.pax_count || 1}</TableCell>
                      <TableCell>{statusBadge(b.booking_status)}</TableCell>
                      <TableCell>{payBadge(b.paid_amount, b.total_price)}</TableCell>
                      <TableCell>{docBadge(b.documents || [])}</TableCell>
                      <TableCell className="text-right text-xs font-medium">{formatCurrency(b.total_price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
