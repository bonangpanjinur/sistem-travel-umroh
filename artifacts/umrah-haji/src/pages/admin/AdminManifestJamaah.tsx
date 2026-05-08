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
import {
  Plane, Search, Download, FileSpreadsheet, FileText, RefreshCcw,
  Users, CalendarDays, CheckCircle2, Clock, AlertCircle, User
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Passenger = {
  id: string;
  full_name: string;
  gender: string | null;
  birth_date: string | null;
  nationality: string | null;
  passport_number: string | null;
  passport_expiry: string | null;
  phone: string | null;
  email: string | null;
  booking_code: string | null;
  booking_status: string;
  room_number: string | null;
  room_type: string | null;
  pax_type: string | null;
  seat_number: string | null;
};

export default function AdminManifestJamaah() {
  const [selectedDeparture, setSelectedDeparture] = useState("");
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");

  // Departures list
  const { data: departures = [] } = useQuery({
    queryKey: ["manifest-departures"],
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select("id, departure_date, return_date, flight_number, package:packages(name)")
        .order("departure_date", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const departure = departures.find((d: any) => d.id === selectedDeparture) as any;

  // Fetch passengers for selected departure
  const { data: passengers = [], isLoading, refetch } = useQuery({
    queryKey: ["manifest-passengers", selectedDeparture],
    enabled: !!selectedDeparture,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_passengers")
        .select(`
          id, full_name, gender, birth_date, nationality, passport_number,
          passport_expiry, phone, email, room_number, room_type, pax_type, seat_number,
          booking:bookings!booking_passengers_booking_id_fkey(
            booking_code, booking_status, departure_id
          )
        `)
        .eq("booking.departure_id", selectedDeparture);
      if (error) {
        // Fallback: query through bookings
        const { data: bookings, error: bErr } = await supabase
          .from("bookings")
          .select(`
            id, booking_code, booking_status,
            customer:profiles(full_name, phone, email, gender, birth_date, nationality, passport_number, passport_expiry)
          `)
          .eq("departure_id", selectedDeparture)
          .not("booking_status", "eq", "cancelled");
        if (bErr) throw bErr;
        return (bookings || []).map((b: any) => ({
          id: b.id,
          full_name: b.customer?.full_name || "-",
          gender: b.customer?.gender || null,
          birth_date: b.customer?.birth_date || null,
          nationality: b.customer?.nationality || "Indonesia",
          passport_number: b.customer?.passport_number || null,
          passport_expiry: b.customer?.passport_expiry || null,
          phone: b.customer?.phone || null,
          email: b.customer?.email || null,
          booking_code: b.booking_code,
          booking_status: b.booking_status,
          room_number: null,
          room_type: null,
          pax_type: "dewasa",
          seat_number: null,
        }));
      }
      return (data || []).map((p: any) => ({
        ...p,
        booking_code: p.booking?.booking_code || null,
        booking_status: p.booking?.booking_status || "pending",
      }));
    },
  });

  // Filter
  const filtered = useMemo<Passenger[]>(() => {
    let list = passengers as Passenger[];
    if (genderFilter !== "all") list = list.filter(p => p.gender === genderFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.full_name.toLowerCase().includes(q) ||
        p.passport_number?.toLowerCase().includes(q) ||
        p.booking_code?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [passengers, search, genderFilter]);

  const summary = useMemo(() => ({
    total: filtered.length,
    pria: filtered.filter(p => p.gender === "male" || p.gender === "laki-laki").length,
    wanita: filtered.filter(p => p.gender === "female" || p.gender === "perempuan").length,
    hasPaspor: filtered.filter(p => p.passport_number).length,
    missingPaspor: filtered.filter(p => !p.passport_number).length,
  }), [filtered]);

  function exportExcel() {
    if (!filtered.length) { toast.error("Tidak ada data untuk diekspor"); return; }
    const rows = filtered.map((p, i) => ({
      "No": i + 1,
      "Nama Lengkap": p.full_name,
      "Jenis Kelamin": p.gender === "male" || p.gender === "laki-laki" ? "Laki-laki" : "Perempuan",
      "Tanggal Lahir": p.birth_date ? format(parseISO(p.birth_date), "dd/MM/yyyy") : "-",
      "Kewarganegaraan": p.nationality || "Indonesia",
      "No Paspor": p.passport_number || "-",
      "Berlaku s.d.": p.passport_expiry ? format(parseISO(p.passport_expiry), "dd/MM/yyyy") : "-",
      "No HP": p.phone || "-",
      "Email": p.email || "-",
      "Kode Booking": p.booking_code || "-",
      "Status Booking": p.booking_status || "-",
      "Tipe Kamar": p.room_type || "-",
      "No Kamar": p.room_number || "-",
      "No Kursi": p.seat_number || "-",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 5 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 18 },
      { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 24 }, { wch: 14 },
      { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 10 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Manifest");
    const depDate = departure?.departure_date ? format(parseISO(departure.departure_date), "yyyy-MM-dd") : "unknown";
    XLSX.writeFile(wb, `manifest-${departure?.package?.name || "jamaah"}-${depDate}.xlsx`);
    toast.success("Manifest Excel berhasil diunduh");
  }

  function exportPDF() {
    if (!filtered.length) { toast.error("Tidak ada data untuk diekspor"); return; }
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("Manifest Jamaah", 14, 18);
    if (departure) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(
        `${departure.package?.name || "-"} | Berangkat: ${departure.departure_date ? format(parseISO(departure.departure_date), "dd MMM yyyy", { locale: idLocale }) : "-"} | No Penerbangan: ${departure.flight_number || "-"}`,
        14, 26
      );
      doc.text(`Total: ${summary.total} jamaah | Pria: ${summary.pria} | Wanita: ${summary.wanita}`, 14, 33);
    }

    autoTable(doc, {
      startY: 38,
      head: [["No", "Nama Lengkap", "L/P", "Tgl Lahir", "No Paspor", "Berlaku s.d.", "No HP", "Kode Booking", "Kamar"]],
      body: filtered.map((p, i) => [
        i + 1,
        p.full_name,
        p.gender === "male" || p.gender === "laki-laki" ? "L" : "P",
        p.birth_date ? format(parseISO(p.birth_date), "dd/MM/yyyy") : "-",
        p.passport_number || "-",
        p.passport_expiry ? format(parseISO(p.passport_expiry), "dd/MM/yyyy") : "-",
        p.phone || "-",
        p.booking_code || "-",
        p.room_number || "-",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 138] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    const depDate = departure?.departure_date ? format(parseISO(departure.departure_date), "yyyy-MM-dd") : "unknown";
    doc.save(`manifest-jamaah-${depDate}.pdf`);
    toast.success("Manifest PDF berhasil diunduh");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manifest Jamaah</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Daftar jamaah per keberangkatan untuk maskapai & imigrasi</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedDeparture && (
            <>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCcw className="h-4 w-4 mr-1.5" /> Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={exportPDF}>
                <FileText className="h-4 w-4 mr-1.5" /> PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Departure selector */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Pilih Keberangkatan</label>
              <Select value={selectedDeparture} onValueChange={setSelectedDeparture}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tanggal keberangkatan..." />
                </SelectTrigger>
                <SelectContent>
                  {departures.map((dep: any) => (
                    <SelectItem key={dep.id} value={dep.id}>
                      <span className="flex items-center gap-2">
                        <Plane className="h-3.5 w-3.5" />
                        {dep.package?.name} — {dep.departure_date
                          ? format(parseISO(dep.departure_date), "dd MMM yyyy", { locale: idLocale })
                          : "TBD"}
                        {dep.flight_number && <span className="text-muted-foreground">({dep.flight_number})</span>}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {departure && (
              <div className="flex gap-4 items-end text-sm">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Berangkat</p>
                  <p className="font-semibold">{format(parseISO(departure.departure_date), "dd MMM yyyy", { locale: idLocale })}</p>
                </div>
                {departure.return_date && (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Kembali</p>
                    <p className="font-semibold">{format(parseISO(departure.return_date), "dd MMM yyyy", { locale: idLocale })}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedDeparture ? (
        <div className="py-20 text-center text-muted-foreground">
          <Plane className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Pilih keberangkatan untuk melihat manifest jamaah</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          {!isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card><CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Total Jamaah</p>
                <p className="text-2xl font-bold">{summary.total}</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Pria</p>
                <p className="text-2xl font-bold text-blue-600">{summary.pria}</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Wanita</p>
                <p className="text-2xl font-bold text-pink-600">{summary.wanita}</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Tanpa Paspor</p>
                <p className={`text-2xl font-bold ${summary.missingPaspor > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {summary.missingPaspor}
                </p>
              </CardContent></Card>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari nama, paspor, kode booking..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
            </div>
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Gender</SelectItem>
                <SelectItem value="male">Pria</SelectItem>
                <SelectItem value="laki-laki">Pria (laki-laki)</SelectItem>
                <SelectItem value="female">Wanita</SelectItem>
                <SelectItem value="perempuan">Wanita (perempuan)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card>
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm font-medium">{filtered.length} jamaah dalam manifest</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Tidak ada jamaah ditemukan</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">No</TableHead>
                        <TableHead>Nama Lengkap</TableHead>
                        <TableHead>L/P</TableHead>
                        <TableHead>Tgl Lahir</TableHead>
                        <TableHead>No Paspor</TableHead>
                        <TableHead>Berlaku s.d.</TableHead>
                        <TableHead>No HP</TableHead>
                        <TableHead>Kode Booking</TableHead>
                        <TableHead>Kamar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((p, i) => {
                        const isGenderMale = p.gender === "male" || p.gender === "laki-laki";
                        const pasporExpired = p.passport_expiry && parseISO(p.passport_expiry) < new Date();
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                            <TableCell className="font-medium">{p.full_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] ${isGenderMale ? "border-blue-300 text-blue-700" : "border-pink-300 text-pink-700"}`}>
                                {isGenderMale ? "L" : "P"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {p.birth_date ? format(parseISO(p.birth_date), "dd/MM/yyyy") : "-"}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {p.passport_number || (
                                <span className="text-red-500 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" /> Belum ada
                                </span>
                              )}
                            </TableCell>
                            <TableCell className={`text-xs ${pasporExpired ? "text-red-600 font-semibold" : ""}`}>
                              {p.passport_expiry ? format(parseISO(p.passport_expiry), "dd/MM/yyyy") : "-"}
                              {pasporExpired && <span className="ml-1 text-[10px]">(Kadaluarsa!)</span>}
                            </TableCell>
                            <TableCell className="text-xs">{p.phone || "-"}</TableCell>
                            <TableCell className="font-mono text-xs">{p.booking_code || "-"}</TableCell>
                            <TableCell className="text-xs">{p.room_number || "-"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
