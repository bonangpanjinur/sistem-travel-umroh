import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Plane, Search, FileSpreadsheet, FileText, RefreshCcw,
  Users, AlertCircle, ShieldCheck, Shield, ShieldAlert,
  Printer, ExternalLink, Baby, UserCheck, ChevronDown,
  Download, CheckCircle2, XCircle, Clock, Pencil, X, Check,
} from "lucide-react";
import { format, parseISO, isAfter, addMonths } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { cn } from "@/lib/utils";

type DocStatus = "complete" | "partial" | "none";

type PassengerRow = {
  id: string;
  full_name: string;
  gender: string | null;
  birth_date: string | null;
  nationality: string | null;
  passport_number: string | null;
  passport_expiry: string | null;
  phone: string | null;
  email: string | null;
  booking_id: string | null;
  booking_code: string | null;
  booking_status: string;
  room_number: string | null;
  room_type: string | null;
  room_preference: string | null;
  passenger_type: string | null;
  seat_number: string | null;
  special_requests: string | null;
  is_main_passenger: boolean;
  customer_id: string | null;
  mahram_name: string | null;
  mahram_relation: string | null;
  doc_ktp: boolean;
  doc_passport: boolean;
  doc_photo: boolean;
  doc_status: DocStatus;
};

const DOC_STATUS_LABELS: Record<string, string> = {
  complete: "Lengkap", partial: "Sebagian", none: "Kurang",
};

const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: "Pending", confirmed: "Konfirmasi", processing: "Proses",
  completed: "Selesai", cancelled: "Batal", refunded: "Refund",
};

const PASSENGER_TYPE_LABELS: Record<string, string> = {
  adult: "Dewasa", dewasa: "Dewasa",
  child: "Anak", anak: "Anak",
  infant: "Bayi", bayi: "Bayi",
};

export default function AdminManifestJamaah() {
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);

  const [selectedDeparture, setSelectedDeparture] = useState("");
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [paxTypeFilter, setPaxTypeFilter] = useState("all");
  const [docFilter, setDocFilter] = useState("all");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("all");

  const [editingRoomNumber, setEditingRoomNumber] = useState<string | null>(null);
  const [roomNumberValue, setRoomNumberValue] = useState("");

  const updateRoomMutation = useMutation({
    mutationFn: async ({ passengerId, roomNumber }: { passengerId: string; roomNumber: string }) => {
      const { error } = await supabase
        .from("booking_passengers")
        .update({ room_number: roomNumber || null })
        .eq("id", passengerId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nomor kamar disimpan");
      queryClient.invalidateQueries({ queryKey: ["manifest-passengers", selectedDeparture] });
      setEditingRoomNumber(null);
      setRoomNumberValue("");
    },
    onError: (err: any) => toast.error(err.message || "Gagal menyimpan"),
  });

  const { data: departures = [] } = useQuery({
    queryKey: ["manifest-departures"],
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select("id, departure_date, return_date, flight_number, package:packages(id, name, package_type)")
        .order("departure_date", { ascending: false })
        .limit(80);
      return data || [];
    },
  });

  const departure = departures.find((d: any) => d.id === selectedDeparture) as any;

  const { data: rawPassengers = [], isLoading, refetch } = useQuery({
    queryKey: ["manifest-passengers", selectedDeparture],
    enabled: !!selectedDeparture,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_passengers")
        .select(`
          id, full_name, gender, birth_date, nationality,
          passport_number, passport_expiry, phone, email,
          room_number, room_type, room_preference, passenger_type,
          seat_number, special_requests, is_main_passenger,
          customer_id,
          booking:bookings!booking_passengers_booking_id_fkey(
            id, booking_code, booking_status, departure_id
          )
        `)
        .eq("booking.departure_id", selectedDeparture);

      if (error) {
        const { data: bookings } = await supabase
          .from("bookings")
          .select(`
            id, booking_code, booking_status,
            customer:customers(id, full_name, phone, email, gender, birth_date, nationality, passport_number, passport_expiry)
          `)
          .eq("departure_id", selectedDeparture)
          .not("booking_status", "in", "(cancelled,refunded)");
        return (bookings || []).map((b: any) => ({
          id: b.id, full_name: b.customer?.full_name || "-",
          gender: b.customer?.gender || null, birth_date: b.customer?.birth_date || null,
          nationality: b.customer?.nationality || "Indonesia",
          passport_number: b.customer?.passport_number || null,
          passport_expiry: b.customer?.passport_expiry || null,
          phone: b.customer?.phone || null, email: b.customer?.email || null,
          booking_id: b.id, booking_code: b.booking_code, booking_status: b.booking_status,
          room_number: null, room_type: null, room_preference: null, passenger_type: "adult",
          seat_number: null, special_requests: null, is_main_passenger: true,
          customer_id: b.customer?.id || null, mahram_name: null, mahram_relation: null,
          doc_ktp: false, doc_passport: false, doc_photo: false, doc_status: "none" as DocStatus,
        }));
      }

      return (data || []).map((p: any) => ({
        ...p,
        booking_id: p.booking?.id || null,
        booking_code: p.booking?.booking_code || null,
        booking_status: p.booking?.booking_status || "pending",
        mahram_name: null, mahram_relation: null,
        doc_ktp: false, doc_passport: false, doc_photo: false, doc_status: "none" as DocStatus,
      }));
    },
  });

  const customerIds = useMemo(
    () => [...new Set(rawPassengers.map((p: any) => p.customer_id).filter(Boolean))],
    [rawPassengers]
  );

  const { data: customerDocs = [] } = useQuery({
    queryKey: ["manifest-docs", selectedDeparture, customerIds.join(",")],
    enabled: customerIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("customer_documents")
        .select("id, customer_id, document_type, status")
        .in("customer_id", customerIds);
      return data || [];
    },
  });

  const { data: mahrams = [] } = useQuery({
    queryKey: ["manifest-mahrams", selectedDeparture, customerIds.join(",")],
    enabled: customerIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("customer_mahrams")
        .select("id, customer_id, name, relationship")
        .in("customer_id", customerIds);
      return data || [];
    },
  });

  const passengers: PassengerRow[] = useMemo(() => {
    return rawPassengers.map((p: any) => {
      const cid = p.customer_id;
      const docs = (customerDocs as any[]).filter(d => d.customer_id === cid);
      const ktp = docs.some(d => d.document_type === "ktp" && d.status === "approved");
      const pass = docs.some(d => d.document_type === "passport" && d.status === "approved");
      const photo = docs.some(d => d.document_type === "photo" && d.status === "approved");
      const score = [ktp, pass, photo].filter(Boolean).length;
      const docStatus: DocStatus = score === 3 ? "complete" : score > 0 ? "partial" : "none";

      const mahram = (mahrams as any[]).find(m => m.customer_id === cid);

      return {
        ...p,
        doc_ktp: ktp, doc_passport: pass, doc_photo: photo, doc_status: docStatus,
        mahram_name: mahram?.name || null,
        mahram_relation: mahram?.relationship || null,
      };
    });
  }, [rawPassengers, customerDocs, mahrams]);

  const isGenderMale = (g: string | null) => g === "male" || g === "laki-laki" || g === "L" || g === "pria";

  const filtered = useMemo<PassengerRow[]>(() => {
    let list = passengers;
    if (bookingStatusFilter !== "all") list = list.filter(p => p.booking_status === bookingStatusFilter);
    if (genderFilter !== "all") {
      if (genderFilter === "male") list = list.filter(p => isGenderMale(p.gender));
      if (genderFilter === "female") list = list.filter(p => !isGenderMale(p.gender));
    }
    if (paxTypeFilter !== "all") list = list.filter(p => {
      const pt = (p.passenger_type || "adult").toLowerCase();
      if (paxTypeFilter === "adult") return pt === "adult" || pt === "dewasa";
      if (paxTypeFilter === "child") return pt === "child" || pt === "anak";
      if (paxTypeFilter === "infant") return pt === "infant" || pt === "bayi";
      return true;
    });
    if (docFilter !== "all") list = list.filter(p => p.doc_status === docFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.full_name.toLowerCase().includes(q) ||
        p.passport_number?.toLowerCase().includes(q) ||
        p.booking_code?.toLowerCase().includes(q) ||
        p.room_number?.toLowerCase().includes(q) ||
        p.phone?.includes(q)
      );
    }
    return list;
  }, [passengers, search, genderFilter, paxTypeFilter, docFilter, bookingStatusFilter]);

  const summary = useMemo(() => {
    const list = filtered;
    return {
      total: list.length,
      pria: list.filter(p => isGenderMale(p.gender)).length,
      wanita: list.filter(p => !isGenderMale(p.gender)).length,
      docComplete: list.filter(p => p.doc_status === "complete").length,
      docPartial: list.filter(p => p.doc_status === "partial").length,
      docNone: list.filter(p => p.doc_status === "none").length,
      noPaspor: list.filter(p => !p.passport_number).length,
      pasporExpiringSoon: list.filter(p => {
        if (!p.passport_expiry) return false;
        const exp = parseISO(p.passport_expiry);
        const sixMonthsOut = addMonths(new Date(), 6);
        return isAfter(sixMonthsOut, exp);
      }).length,
      // KEP-FIX2: Validasi mahram — wanita dewasa tanpa mahram
      wanitaTanpaMahram: list.filter(p => {
        if (isGenderMale(p.gender)) return false;
        const pt = (p.passenger_type || "adult").toLowerCase();
        if (pt === "child" || pt === "anak" || pt === "infant" || pt === "bayi") return false;
        return !p.mahram_name;
      }).length,
    };
  }, [filtered]);

  function exportExcel() {
    if (!filtered.length) { toast.error("Tidak ada data untuk diekspor"); return; }
    const rows = filtered.map((p, i) => ({
      "No": i + 1,
      "Nama Lengkap": p.full_name,
      "L/P": isGenderMale(p.gender) ? "L" : "P",
      "Tipe": PASSENGER_TYPE_LABELS[p.passenger_type || "adult"] || "Dewasa",
      "Tgl Lahir": p.birth_date ? format(parseISO(p.birth_date), "dd/MM/yyyy") : "-",
      "Kewarganegaraan": p.nationality || "Indonesia",
      "No Paspor": p.passport_number || "-",
      "Berlaku s.d.": p.passport_expiry ? format(parseISO(p.passport_expiry), "dd/MM/yyyy") : "-",
      "No HP": p.phone || "-",
      "Email": p.email || "-",
      "Kode Booking": p.booking_code || "-",
      "Status Booking": BOOKING_STATUS_LABELS[p.booking_status] || p.booking_status,
      "Tipe Kamar": p.room_preference || p.room_type || "-",
      "No Kamar": p.room_number || "-",
      "No Kursi": p.seat_number || "-",
      "Status Dok.": DOC_STATUS_LABELS[p.doc_status],
      "KTP": p.doc_ktp ? "✓" : "—",
      "Paspor": p.doc_passport ? "✓" : "—",
      "Foto": p.doc_photo ? "✓" : "—",
      "Mahram": p.mahram_name ? `${p.mahram_name} (${p.mahram_relation})` : "-",
      "Permintaan Khusus": p.special_requests || "-",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 4 }, { wch: 28 }, { wch: 5 }, { wch: 8 }, { wch: 13 }, { wch: 16 },
      { wch: 16 }, { wch: 13 }, { wch: 15 }, { wch: 24 }, { wch: 14 }, { wch: 12 },
      { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 6 }, { wch: 6 },
      { wch: 6 }, { wch: 22 }, { wch: 22 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Manifest Jamaah");

    const depDate = departure?.departure_date
      ? format(parseISO(departure.departure_date), "yyyy-MM-dd") : "unknown";
    XLSX.writeFile(wb, `manifest-${departure?.package?.name || "jamaah"}-${depDate}.xlsx`);
    toast.success("Manifest Excel berhasil diunduh");
  }

  function exportPDF() {
    if (!filtered.length) { toast.error("Tidak ada data untuk diekspor"); return; }
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("MANIFEST JAMAAH", 14, 16);

    if (departure) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      const depDateStr = departure.departure_date
        ? format(parseISO(departure.departure_date), "dd MMMM yyyy", { locale: idLocale }) : "-";
      const retDateStr = departure.return_date
        ? format(parseISO(departure.return_date), "dd MMMM yyyy", { locale: idLocale }) : "-";
      doc.text(`Paket: ${departure.package?.name || "-"}  |  Berangkat: ${depDateStr}  |  Kembali: ${retDateStr}  |  Penerbangan: ${departure.flight_number || "-"}`, 14, 23);
      doc.text(`Total: ${summary.total}  |  Pria: ${summary.pria}  |  Wanita: ${summary.wanita}  |  Dok Lengkap: ${summary.docComplete}  |  Tanpa Paspor: ${summary.noPaspor}`, 14, 29);
    }

    doc.setTextColor(0, 0, 0);
    autoTable(doc, {
      startY: 34,
      head: [["No", "Nama Lengkap", "L/P", "Tipe", "Tgl Lahir", "No Paspor", "Berlaku s.d.", "No HP", "Kode Booking", "Tipe Kamar", "No Kamar", "Dok.", "Mahram"]],
      body: filtered.map((p, i) => [
        i + 1,
        p.full_name + (p.is_main_passenger ? " *" : ""),
        isGenderMale(p.gender) ? "L" : "P",
        PASSENGER_TYPE_LABELS[p.passenger_type || "adult"]?.charAt(0) || "D",
        p.birth_date ? format(parseISO(p.birth_date), "dd/MM/yy") : "-",
        p.passport_number || "BELUM ADA",
        p.passport_expiry ? format(parseISO(p.passport_expiry), "dd/MM/yy") : "-",
        p.phone || "-",
        p.booking_code || "-",
        p.room_preference || p.room_type || "-",
        p.room_number || "-",
        p.doc_status === "complete" ? "✓" : p.doc_status === "partial" ? "~" : "✗",
        p.mahram_name ? `${p.mahram_name}` : "-",
      ]),
      styles: { fontSize: 7.5, cellPadding: 1.5 },
      headStyles: { fillColor: [30, 58, 138], fontSize: 7.5, fontStyle: "bold", textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell(data) {
        if (data.section === "body" && data.column.index === 5) {
          const val = data.cell.raw as string;
          if (val === "BELUM ADA") {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = "bold";
          }
        }
        if (data.section === "body" && data.column.index === 11) {
          const val = data.cell.raw as string;
          data.cell.styles.textColor = val === "✓" ? [5, 150, 105] : val === "~" ? [217, 119, 6] : [220, 38, 38];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    const depDate = departure?.departure_date
      ? format(parseISO(departure.departure_date), "yyyy-MM-dd") : "unknown";
    doc.save(`manifest-jamaah-${departure?.package?.name || "umrah"}-${depDate}.pdf`);
    toast.success("Manifest PDF berhasil diunduh");
  }

  function handlePrint() {
    window.print();
  }

  const paxTypeIcon = (type: string | null) => {
    const t = (type || "adult").toLowerCase();
    if (t === "infant" || t === "bayi") return <Baby className="h-3 w-3 text-pink-500" />;
    if (t === "child" || t === "anak") return <Users className="h-3 w-3 text-purple-500" />;
    return <UserCheck className="h-3 w-3 text-blue-500" />;
  };

  return (
    <div className="space-y-5 pb-10">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Plane className="h-6 w-6 text-primary" />
            Manifest Jamaah
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Daftar penumpang per keberangkatan — untuk maskapai, imigrasi & operasional
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedDeparture && (
            <>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCcw className="h-4 w-4 mr-1.5" /> Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-600" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={exportPDF}>
                <FileText className="h-4 w-4 mr-1.5 text-blue-600" /> PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = `/api/manifest/export/${selectedDeparture}?format=csv`;
                  a.download = `manifest-${departure?.package?.name || "jamaah"}-server.csv`;
                  a.click();
                  toast.success("Mengunduh manifest CSV dari server...");
                }}
                title="Unduh langsung dari server — aman untuk data besar"
              >
                <Download className="h-4 w-4 mr-1.5 text-violet-600" /> CSV Server
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1.5 text-slate-600" /> Cetak
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="no-print border-none shadow-sm">
        <CardContent className="pt-5 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Departure selector */}
            <div className="lg:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">
                Keberangkatan
              </label>
              <Select value={selectedDeparture} onValueChange={setSelectedDeparture}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Pilih tanggal keberangkatan..." />
                </SelectTrigger>
                <SelectContent>
                  {(departures as any[]).map((dep: any) => (
                    <SelectItem key={dep.id} value={dep.id}>
                      <span className="flex items-center gap-2">
                        <Plane className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="font-medium">{dep.package?.name}</span>
                        <span className="text-muted-foreground">—</span>
                        <span>
                          {dep.departure_date
                            ? format(parseISO(dep.departure_date), "dd MMM yyyy", { locale: idLocale })
                            : "TBD"}
                        </span>
                        {dep.flight_number && (
                          <span className="text-muted-foreground text-[11px]">({dep.flight_number})</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">
                Cari Jamaah
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nama, paspor, booking..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </div>
          </div>

          {/* Secondary filters */}
          <div className="flex flex-wrap gap-2 mt-3">
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Gender</SelectItem>
                <SelectItem value="male">Laki-laki</SelectItem>
                <SelectItem value="female">Perempuan</SelectItem>
              </SelectContent>
            </Select>

            <Select value={paxTypeFilter} onValueChange={setPaxTypeFilter}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="Tipe Pax" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="adult">Dewasa</SelectItem>
                <SelectItem value="child">Anak</SelectItem>
                <SelectItem value="infant">Bayi</SelectItem>
              </SelectContent>
            </Select>

            <Select value={docFilter} onValueChange={setDocFilter}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="Status Dokumen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Dokumen</SelectItem>
                <SelectItem value="complete">Dok. Lengkap</SelectItem>
                <SelectItem value="partial">Dok. Sebagian</SelectItem>
                <SelectItem value="none">Dok. Kurang</SelectItem>
              </SelectContent>
            </Select>

            <Select value={bookingStatusFilter} onValueChange={setBookingStatusFilter}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="Status Booking" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="confirmed">Terkonfirmasi</SelectItem>
                <SelectItem value="processing">Dalam Proses</SelectItem>
                <SelectItem value="completed">Selesai</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Dibatalkan</SelectItem>
              </SelectContent>
            </Select>

            {(genderFilter !== "all" || paxTypeFilter !== "all" || docFilter !== "all" || bookingStatusFilter !== "all" || search) && (
              <button
                onClick={() => {
                  setGenderFilter("all"); setPaxTypeFilter("all");
                  setDocFilter("all"); setBookingStatusFilter("all"); setSearch("");
                }}
                className="h-8 px-3 text-xs font-medium text-muted-foreground border rounded hover:bg-muted/50 flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" /> Reset Filter
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedDeparture ? (
        <div className="py-24 text-center text-muted-foreground">
          <Plane className="h-14 w-14 mx-auto mb-5 opacity-20" />
          <p className="text-base font-medium">Pilih keberangkatan untuk melihat manifest jamaah</p>
          <p className="text-sm mt-1 opacity-70">Data jamaah, dokumen, dan kamar akan ditampilkan di sini</p>
        </div>
      ) : (
        <>
          {/* Departure info banner */}
          {departure && (
            <div className="no-print bg-primary/5 border border-primary/15 rounded-xl px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-2 font-bold text-primary">
                <Plane className="h-4 w-4" />
                {departure.package?.name}
              </div>
              <div className="text-muted-foreground">
                Berangkat: <strong className="text-foreground">
                  {format(parseISO(departure.departure_date), "dd MMMM yyyy", { locale: idLocale })}
                </strong>
              </div>
              {departure.return_date && (
                <div className="text-muted-foreground">
                  Kembali: <strong className="text-foreground">
                    {format(parseISO(departure.return_date), "dd MMMM yyyy", { locale: idLocale })}
                  </strong>
                </div>
              )}
              {departure.flight_number && (
                <div className="text-muted-foreground">
                  Penerbangan: <strong className="font-mono text-foreground">{departure.flight_number}</strong>
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          {!isLoading && (
            <div className="no-print grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {[
                { label: "Total Jamaah", value: summary.total, color: "text-foreground", bg: "" },
                { label: "Pria", value: summary.pria, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
                { label: "Wanita", value: summary.wanita, color: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-950/30" },
                { label: "Dok. Lengkap", value: summary.docComplete, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
                { label: "Dok. Sebagian", value: summary.docPartial, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
                { label: "Tanpa Dok.", value: summary.docNone, color: summary.docNone > 0 ? "text-red-600" : "text-emerald-600", bg: summary.docNone > 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-emerald-50 dark:bg-emerald-950/30" },
                { label: "Paspor Bermasalah", value: summary.pasporExpiringSoon, color: summary.pasporExpiringSoon > 0 ? "text-orange-600" : "text-emerald-600", bg: summary.pasporExpiringSoon > 0 ? "bg-orange-50 dark:bg-orange-950/30" : "" },
              ].map(({ label, value, color, bg }) => (
                <Card key={label} className={cn("border-none shadow-sm", bg)}>
                  <CardContent className="pt-3 pb-3 px-4">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-0.5">{label}</p>
                    <p className={`text-2xl font-black ${color}`}>{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Warnings */}
          {!isLoading && summary.noPaspor > 0 && (
            <div className="no-print flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-800 dark:text-red-300">
                  {summary.noPaspor} jamaah belum memiliki nomor paspor
                </p>
                <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                  Gunakan filter "Dok. Kurang" untuk melihat daftar lengkap.
                </p>
              </div>
            </div>
          )}
          {!isLoading && summary.pasporExpiringSoon > 0 && (
            <div className="no-print flex items-start gap-3 p-4 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
              <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-orange-800 dark:text-orange-300">
                  {summary.pasporExpiringSoon} paspor kedaluarsa atau akan habis dalam 6 bulan
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-400 mt-0.5">
                  Pastikan masa berlaku paspor ≥ 6 bulan dari tanggal keberangkatan.
                </p>
              </div>
            </div>
          )}
          {/* KEP-FIX2: Validasi mahram untuk jamaah haji */}
          {!isLoading && summary.wanitaTanpaMahram > 0 && (
            <div className="no-print flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <Shield className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                  {summary.wanitaTanpaMahram} jamaah wanita dewasa belum tercatat mahramnya
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  Wajib syariat untuk haji/umroh. Lengkapi data mahram pada profil jamaah masing-masing.
                </p>
              </div>
            </div>
          )}

          {/* Main Table */}
          <div className="print-area">
            {/* Print header — only visible when printing */}
            <div className="hidden print:block mb-4">
              <h2 className="text-xl font-bold">MANIFEST JAMAAH</h2>
              {departure && (
                <p className="text-sm text-gray-600">
                  {departure.package?.name} | Berangkat: {departure.departure_date ? format(parseISO(departure.departure_date), "dd MMMM yyyy", { locale: idLocale }) : "-"} | Penerbangan: {departure.flight_number || "-"}
                </p>
              )}
              <p className="text-sm text-gray-600">Total: {summary.total} jamaah | Pria: {summary.pria} | Wanita: {summary.wanita}</p>
            </div>

            <Card className="border-none shadow-md overflow-hidden">
              <div className="bg-muted/30 px-5 py-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold">{filtered.length} jamaah</span>
                  {filtered.length !== passengers.length && (
                    <span className="text-xs text-muted-foreground">(dari {passengers.length} total)</span>
                  )}
                </div>
                <div className="no-print flex items-center gap-2 text-[10px] text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Lengkap
                  <Shield className="h-3.5 w-3.5 text-amber-500" /> Sebagian
                  <ShieldAlert className="h-3.5 w-3.5 text-red-400" /> Kurang
                </div>
              </div>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-4 space-y-2">
                    {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-20 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">Tidak ada jamaah ditemukan</p>
                    <p className="text-xs mt-1">Coba ubah filter atau pilih keberangkatan lain</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="text-left px-3 py-2.5 font-bold uppercase tracking-wider text-muted-foreground w-8">#</th>
                          <th className="text-left px-3 py-2.5 font-bold uppercase tracking-wider text-muted-foreground">Nama Lengkap</th>
                          <th className="text-left px-3 py-2.5 font-bold uppercase tracking-wider text-muted-foreground">L/P</th>
                          <th className="text-left px-3 py-2.5 font-bold uppercase tracking-wider text-muted-foreground">Tipe</th>
                          <th className="text-left px-3 py-2.5 font-bold uppercase tracking-wider text-muted-foreground">Tgl Lahir</th>
                          <th className="text-left px-3 py-2.5 font-bold uppercase tracking-wider text-muted-foreground">No Paspor</th>
                          <th className="text-left px-3 py-2.5 font-bold uppercase tracking-wider text-muted-foreground">Berlaku s.d.</th>
                          <th className="text-left px-3 py-2.5 font-bold uppercase tracking-wider text-muted-foreground">No HP</th>
                          <th className="text-left px-3 py-2.5 font-bold uppercase tracking-wider text-muted-foreground">Dok.</th>
                          <th className="text-left px-3 py-2.5 font-bold uppercase tracking-wider text-muted-foreground">Kamar</th>
                          <th className="text-left px-3 py-2.5 font-bold uppercase tracking-wider text-muted-foreground no-print">No Kamar</th>
                          <th className="text-left px-3 py-2.5 font-bold uppercase tracking-wider text-muted-foreground">Mahram</th>
                          <th className="text-left px-3 py-2.5 font-bold uppercase tracking-wider text-muted-foreground no-print">Booking</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filtered.map((p, idx) => {
                          const isMale = isGenderMale(p.gender);
                          const pasporExpired = p.passport_expiry
                            ? !isAfter(parseISO(p.passport_expiry), new Date()) : false;
                          const pasporExpiringSoon = !pasporExpired && p.passport_expiry
                            ? isAfter(addMonths(new Date(), 6), parseISO(p.passport_expiry)) : false;
                          const isEditingRoom = editingRoomNumber === p.id;

                          return (
                            <tr
                              key={p.id}
                              className={cn(
                                "hover:bg-muted/20 transition-colors",
                                p.is_main_passenger && "bg-primary/3",
                                p.booking_status === "cancelled" && "opacity-50"
                              )}
                            >
                              <td className="px-3 py-2.5 text-muted-foreground font-mono">
                                {idx + 1}
                                {p.is_main_passenger && (
                                  <span className="ml-1 text-[8px] font-bold text-primary/70 bg-primary/10 px-1 rounded">PIC</span>
                                )}
                              </td>

                              <td className="px-3 py-2.5 font-semibold max-w-[160px]">
                                <span className="truncate block">{p.full_name}</span>
                                {p.special_requests && (
                                  <span className="text-[9px] text-amber-600 italic block truncate" title={p.special_requests}>
                                    ⚕ {p.special_requests}
                                  </span>
                                )}
                              </td>

                              <td className="px-3 py-2.5">
                                <span className={`font-bold text-[10px] px-2 py-0.5 rounded-full ${isMale ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" : "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300"}`}>
                                  {isMale ? "L" : "P"}
                                </span>
                              </td>

                              <td className="px-3 py-2.5">
                                <span className="inline-flex items-center gap-1 text-[10px]">
                                  {paxTypeIcon(p.passenger_type)}
                                  {PASSENGER_TYPE_LABELS[(p.passenger_type || "adult").toLowerCase()] || "Dewasa"}
                                </span>
                              </td>

                              <td className="px-3 py-2.5 text-muted-foreground">
                                {p.birth_date ? format(parseISO(p.birth_date), "dd/MM/yyyy") : "—"}
                              </td>

                              <td className="px-3 py-2.5">
                                {p.passport_number ? (
                                  <span className="font-mono font-medium">{p.passport_number}</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-red-500 font-semibold">
                                    <AlertCircle className="h-3 w-3" /> Belum ada
                                  </span>
                                )}
                              </td>

                              <td className={`px-3 py-2.5 ${pasporExpired ? "text-red-600 font-bold" : pasporExpiringSoon ? "text-orange-600 font-semibold" : "text-muted-foreground"}`}>
                                {p.passport_expiry ? format(parseISO(p.passport_expiry), "dd/MM/yyyy") : "—"}
                                {pasporExpired && <span className="block text-[9px]">KADALUARSA</span>}
                                {pasporExpiringSoon && !pasporExpired && <span className="block text-[9px]">Segera habis</span>}
                              </td>

                              <td className="px-3 py-2.5 text-muted-foreground">
                                {p.phone ? (
                                  <a
                                    href={`https://wa.me/62${p.phone.replace(/^0/, "").replace(/\D/g, "")}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="hover:text-emerald-600 transition-colors"
                                    title="Buka WhatsApp"
                                  >
                                    {p.phone}
                                  </a>
                                ) : "—"}
                              </td>

                              <td className="px-3 py-2.5">
                                <div
                                  className="flex items-center gap-1"
                                  title={`KTP: ${p.doc_ktp ? "✓" : "—"} | Paspor: ${p.doc_passport ? "✓" : "—"} | Foto: ${p.doc_photo ? "✓" : "—"}`}
                                >
                                  {p.doc_status === "complete"
                                    ? <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                    : p.doc_status === "partial"
                                    ? <Shield className="h-4 w-4 text-amber-500" />
                                    : <ShieldAlert className="h-4 w-4 text-red-400" />}
                                  <span className={`text-[10px] font-bold ${p.doc_status === "complete" ? "text-emerald-700" : p.doc_status === "partial" ? "text-amber-600" : "text-red-500"}`}>
                                    {[p.doc_ktp, p.doc_passport, p.doc_photo].filter(Boolean).length}/3
                                  </span>
                                </div>
                              </td>

                              <td className="px-3 py-2.5">
                                {(() => {
                                  const rt = p.room_preference || p.room_type || "";
                                  const rtColors: Record<string, string> = {
                                    quad: "bg-purple-100 text-purple-800", triple: "bg-blue-100 text-blue-800",
                                    double: "bg-emerald-100 text-emerald-800", single: "bg-amber-100 text-amber-800",
                                  };
                                  return rt ? (
                                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${rtColors[rt] || "bg-muted text-muted-foreground"}`}>
                                      {rt.charAt(0).toUpperCase() + rt.slice(1)}
                                    </span>
                                  ) : <span className="text-muted-foreground">—</span>;
                                })()}
                              </td>

                              <td className="px-3 py-2.5 no-print">
                                {isEditingRoom ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={roomNumberValue}
                                      onChange={e => setRoomNumberValue(e.target.value)}
                                      placeholder="cth: 201"
                                      className="text-[10px] border rounded px-1.5 py-1 w-16 focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                                      autoFocus
                                      onKeyDown={e => {
                                        if (e.key === "Enter") updateRoomMutation.mutate({ passengerId: p.id, roomNumber: roomNumberValue });
                                        if (e.key === "Escape") { setEditingRoomNumber(null); setRoomNumberValue(""); }
                                      }}
                                    />
                                    <button
                                      onClick={() => updateRoomMutation.mutate({ passengerId: p.id, roomNumber: roomNumberValue })}
                                      disabled={updateRoomMutation.isPending}
                                      className="text-[9px] bg-emerald-600 text-white rounded px-1.5 py-1 hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                      <Check className="h-2.5 w-2.5" />
                                    </button>
                                    <button
                                      onClick={() => { setEditingRoomNumber(null); setRoomNumberValue(""); }}
                                      className="text-muted-foreground hover:text-foreground"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <span className={`font-mono text-[10px] ${p.room_number ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                                      {p.room_number || "—"}
                                    </span>
                                    <button
                                      onClick={() => { setEditingRoomNumber(p.id); setRoomNumberValue(p.room_number || ""); }}
                                      className="text-muted-foreground hover:text-primary transition-colors"
                                      title="Edit nomor kamar"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </td>

                              <td className="px-3 py-2.5 max-w-[100px]">
                                {p.mahram_name ? (
                                  <div>
                                    <span className="font-semibold truncate block" title={p.mahram_name}>{p.mahram_name}</span>
                                    <span className="text-[9px] text-muted-foreground capitalize">{p.mahram_relation}</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>

                              <td className="px-3 py-2.5 no-print">
                                {p.booking_id ? (
                                  <Link
                                    to={`/admin/bookings/${p.booking_id}`}
                                    className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-primary hover:underline"
                                  >
                                    {p.booking_code || "Lihat"}
                                    <ExternalLink className="h-2.5 w-2.5" />
                                  </Link>
                                ) : (
                                  <span className="text-muted-foreground text-[10px]">{p.booking_code || "—"}</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Print footer */}
            <div className="hidden print:block mt-4 text-xs text-gray-500">
              <p>* = Jamaah utama/pemesan (PIC) | Dok.: KTP / Paspor / Foto terverifikasi</p>
              <p>Dicetak pada: {format(new Date(), "dd MMMM yyyy HH:mm", { locale: idLocale })}</p>
            </div>
          </div>

          {/* Legend */}
          {!isLoading && filtered.length > 0 && (
            <div className="no-print flex flex-wrap gap-4 text-[11px] text-muted-foreground px-1">
              <span className="flex items-center gap-1"><span className="font-bold text-primary">*</span> = Jamaah PIC/pemesan</span>
              <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> = Semua dokumen lengkap (KTP+Paspor+Foto)</span>
              <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5 text-amber-500" /> = Dokumen sebagian</span>
              <span className="flex items-center gap-1"><ShieldAlert className="h-3.5 w-3.5 text-red-400" /> = Belum ada dokumen</span>
              <span>Nomor kamar bisa diedit langsung di kolom <Pencil className="h-3 w-3 inline" /></span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
