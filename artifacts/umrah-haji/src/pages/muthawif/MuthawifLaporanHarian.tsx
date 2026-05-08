import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileDown, Users, CheckCircle2, XCircle, Clock,
  AlertCircle, RefreshCcw, CalendarDays, ArrowLeft,
  TrendingUp, UserCheck, UserX, ChevronDown, ChevronRight,
  Printer
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { toast } from "sonner";

// ─── Constants ───────────────────────────────────────────────────────────────

const SESSION_TYPES = [
  { value: "keberangkatan",   label: "Check-in Keberangkatan" },
  { value: "sholat_berjamaah", label: "Sholat Berjamaah" },
  { value: "ziarah",          label: "Ziarah & City Tour" },
  { value: "bus",             label: "Naik Bus" },
  { value: "makan",           label: "Makan Bersama" },
  { value: "lainnya",         label: "Sesi Lainnya" },
];

type AttStatus = "hadir" | "absen" | "terlambat" | "izin";

const STATUS_CFG: Record<AttStatus, { label: string; cls: string; icon: any; short: string }> = {
  hadir:     { label: "Hadir",     cls: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2, short: "H" },
  absen:     { label: "Absen",     cls: "bg-red-100 text-red-800 border-red-200",             icon: XCircle,      short: "A" },
  terlambat: { label: "Terlambat", cls: "bg-amber-100 text-amber-800 border-amber-200",       icon: Clock,        short: "T" },
  izin:      { label: "Izin",      cls: "bg-blue-100 text-blue-800 border-blue-200",          icon: AlertCircle,  short: "I" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(a: number, total: number) {
  return total === 0 ? 0 : Math.round((a / total) * 100);
}

function MiniBar({ value, max, color = "bg-emerald-500" }: { value: number; max: number; color?: string }) {
  const w = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${w}%` }} />
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function MuthawifLaporanHarian() {
  const { user } = useAuth();
  const [reportDate, setReportDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [expandedSection, setExpandedSection] = useState<string | null>("belum-checkin");
  const [exporting, setExporting] = useState(false);

  // Muthawif profile
  const { data: muthawif } = useQuery({
    queryKey: ["muthawif-profile", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const { data } = await supabase
        .from("muthawifs")
        .select("*")
        .eq("email", user!.email)
        .maybeSingle();
      return data;
    },
  });

  // Active departure
  const { data: activeDeparture, isLoading: loadingDep } = useQuery({
    queryKey: ["muthawif-active-departure", muthawif?.id],
    enabled: !!muthawif?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select(`
          id, departure_date, return_date, status,
          package:packages(name),
          bookings:bookings(
            id, booking_code, booking_status,
            customer:profiles(id, full_name, phone, gender)
          )
        `)
        .eq("muthawif_id", muthawif.id)
        .in("status", ["ongoing", "scheduled"])
        .order("departure_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const allPassengers = useMemo(() => {
    if (!activeDeparture?.bookings) return [];
    return (activeDeparture.bookings as any[])
      .filter((b: any) => b.booking_status !== "cancelled")
      .map((b: any) => ({
        bookingId: b.id,
        bookingCode: b.booking_code,
        customerId: b.customer?.id,
        name: b.customer?.full_name || "-",
        phone: b.customer?.phone || "-",
        gender: b.customer?.gender,
      }));
  }, [activeDeparture]);

  // All attendance records for today across all sessions
  const { data: allRecords = [], isLoading: loadingAtt, refetch } = useQuery({
    queryKey: ["muthawif-laporan-harian", activeDeparture?.id, reportDate],
    enabled: !!activeDeparture?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("*")
        .eq("departure_id", activeDeparture!.id)
        .eq("attendance_date", reportDate);
      return data || [];
    },
  });

  // Build session summary
  const sessionSummary = useMemo(() => {
    return SESSION_TYPES.map(s => {
      const sessionRecords = (allRecords as any[]).filter(r => r.session_type === s.value);
      const hadir     = sessionRecords.filter(r => r.status === "hadir").length;
      const absen     = sessionRecords.filter(r => r.status === "absen").length;
      const terlambat = sessionRecords.filter(r => r.status === "terlambat").length;
      const izin      = sessionRecords.filter(r => r.status === "izin").length;
      const total     = allPassengers.length;
      const dicatat   = sessionRecords.length;
      return { ...s, hadir, absen, terlambat, izin, total, dicatat };
    }).filter(s => s.dicatat > 0 || s.value === "keberangkatan");
  }, [allRecords, allPassengers]);

  // Jamaah belum check-in (tidak ada record "keberangkatan" hadir/izin hari ini)
  const belumCheckin = useMemo(() => {
    const checkinRecords = (allRecords as any[]).filter(
      r => r.session_type === "keberangkatan" && (r.status === "hadir" || r.status === "izin")
    );
    const checkedIds = new Set(checkinRecords.map((r: any) => r.customer_id));
    return allPassengers.filter(p => !checkedIds.has(p.customerId));
  }, [allRecords, allPassengers]);

  // Per-jamaah attendance matrix
  const jamaahMatrix = useMemo(() => {
    const activeSessions = SESSION_TYPES.filter(s =>
      (allRecords as any[]).some(r => r.session_type === s.value)
    );
    return {
      sessions: activeSessions,
      rows: allPassengers.map(p => {
        const statusMap: Record<string, AttStatus | null> = {};
        for (const s of activeSessions) {
          const rec = (allRecords as any[]).find(
            r => r.customer_id === p.customerId && r.session_type === s.value
          );
          statusMap[s.value] = rec?.status ?? null;
        }
        return { ...p, statusMap };
      }),
    };
  }, [allRecords, allPassengers]);

  // Toggle section
  const toggle = (key: string) =>
    setExpandedSection(prev => (prev === key ? null : key));

  // PDF Export
  const handleExportPDF = async () => {
    if (!activeDeparture) return;
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 18;

      // ── Header ────────────────────────────────────────────────────
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 100, 60);
      doc.text("LAPORAN HARIAN MUTHAWIF", 20, y);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      y += 7;
      doc.text(`Muthawif : ${muthawif?.name || "-"}`, 20, y);
      doc.text(`Tanggal  : ${format(new Date(reportDate + "T00:00:00"), "d MMMM yyyy", { locale: idLocale })}`, 110, y);
      y += 5;
      doc.text(`Paket    : ${(activeDeparture as any).package?.name || "-"}`, 20, y);
      doc.text(`Cetak    : ${format(new Date(), "d MMM yyyy HH:mm", { locale: idLocale })}`, 110, y);
      y += 3;

      doc.setDrawColor(0, 120, 70);
      doc.setLineWidth(0.6);
      doc.line(20, y + 2, pageWidth - 20, y + 2);
      y += 10;

      // ── Ringkasan Sesi ────────────────────────────────────────────
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("A. Ringkasan Kehadiran per Sesi", 20, y);
      y += 4;

      const sessionRows = sessionSummary.map(s => [
        s.label,
        s.hadir.toString(),
        s.terlambat.toString(),
        s.izin.toString(),
        s.absen.toString(),
        `${s.dicatat}/${s.total}`,
        `${pct(s.hadir, s.total)}%`,
      ]);

      autoTable(doc, {
        startY: y,
        head: [["Sesi", "Hadir", "Terlambat", "Izin", "Absen", "Tercatat", "% Hadir"]],
        body: sessionRows,
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [0, 120, 70], textColor: 255, fontStyle: "bold" },
        columnStyles: {
          1: { halign: "center" },
          2: { halign: "center" },
          3: { halign: "center" },
          4: { halign: "center" },
          5: { halign: "center" },
          6: { halign: "center", fontStyle: "bold" },
        },
        margin: { left: 20, right: 20 },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // ── Jamaah Belum Check-in ─────────────────────────────────────
      if (belumCheckin.length > 0) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(180, 30, 30);
        doc.text(`B. Jamaah Belum Check-in (${belumCheckin.length} orang)`, 20, y);
        y += 4;

        autoTable(doc, {
          startY: y,
          head: [["No", "Nama", "No HP", "Gender"]],
          body: belumCheckin.map((p, i) => [
            (i + 1).toString(),
            p.name,
            p.phone,
            p.gender === "male" || p.gender === "laki-laki" ? "L" : "P",
          ]),
          styles: { fontSize: 8, cellPadding: 2.5 },
          headStyles: { fillColor: [180, 30, 30], textColor: 255, fontStyle: "bold" },
          columnStyles: {
            0: { cellWidth: 10, halign: "center" },
            3: { cellWidth: 12, halign: "center" },
          },
          margin: { left: 20, right: 20 },
        });

        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // ── Matriks Kehadiran ─────────────────────────────────────────
      if (jamaahMatrix.sessions.length > 0 && jamaahMatrix.rows.length > 0) {
        // New page if little space left
        if (y > 200) { doc.addPage(); y = 20; }

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("C. Matriks Kehadiran Lengkap", 20, y);
        y += 4;

        const sessionHeaders = jamaahMatrix.sessions.map(s => s.label.substring(0, 12));
        autoTable(doc, {
          startY: y,
          head: [["No", "Nama", ...sessionHeaders]],
          body: jamaahMatrix.rows.map((row, i) => [
            (i + 1).toString(),
            row.name,
            ...jamaahMatrix.sessions.map(s => {
              const st = row.statusMap[s.value];
              if (!st) return "-";
              return STATUS_CFG[st]?.short || st;
            }),
          ]),
          styles: { fontSize: 7, cellPadding: 2 },
          headStyles: { fillColor: [40, 80, 160], textColor: 255, fontStyle: "bold", fontSize: 7 },
          columnStyles: {
            0: { cellWidth: 8,  halign: "center" },
            1: { cellWidth: 45 },
          },
          margin: { left: 20, right: 20 },
        });

        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // ── Footer ────────────────────────────────────────────────────
      const totalPages = (doc as any).internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Halaman ${i}/${totalPages} — Dicetak oleh sistem Vinstour`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: "center" }
        );
      }

      const fileName = `laporan-harian-${muthawif?.name?.replace(/\s+/g, "-") || "muthawif"}-${reportDate}.pdf`;
      doc.save(fileName);
      toast.success("PDF berhasil diunduh");
    } catch (e) {
      console.error(e);
      toast.error("Gagal mengekspor PDF");
    } finally {
      setExporting(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  const isLoading = loadingDep || loadingAtt;
  const total = allPassengers.length;

  // Aggregate check-in summary for hero stats
  const checkinRecords = (allRecords as any[]).filter(r => r.session_type === "keberangkatan");
  const checkinHadir   = checkinRecords.filter(r => r.status === "hadir" || r.status === "terlambat").length;
  const checkinAbsen   = checkinRecords.filter(r => r.status === "absen").length;
  const belumCount     = belumCheckin.length;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="bg-card border-b px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
              <Link to="/muthawif/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div className="min-w-0">
              <h1 className="text-base font-bold truncate">Laporan Harian</h1>
              <p className="text-xs text-muted-foreground truncate">
                {(activeDeparture as any)?.package?.name || "Memuat..."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleExportPDF}
              disabled={exporting || !activeDeparture || total === 0}
            >
              {exporting ? (
                <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileDown className="h-3.5 w-3.5" />
              )}
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">

        {/* ── Date & Departure Selector ──────────────────────────── */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  type="date"
                  value={reportDate}
                  onChange={e => setReportDate(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {activeDeparture
                  ? `${total} jamaah terdaftar`
                  : "Tidak ada keberangkatan aktif"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Hero Stats ─────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="pt-3 pb-3 text-center">
                <UserCheck className="h-5 w-5 mx-auto text-emerald-600 mb-1" />
                <p className="text-2xl font-bold text-emerald-700">{checkinHadir}</p>
                <p className="text-xs text-emerald-600">Sudah Check-in</p>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-3 pb-3 text-center">
                <UserX className="h-5 w-5 mx-auto text-red-500 mb-1" />
                <p className="text-2xl font-bold text-red-600">{belumCount}</p>
                <p className="text-xs text-red-500">Belum Check-in</p>
              </CardContent>
            </Card>
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-3 pb-3 text-center">
                <TrendingUp className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                <p className="text-2xl font-bold text-blue-700">{pct(checkinHadir, total)}%</p>
                <p className="text-xs text-blue-600">Tingkat Hadir</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Session Summary ────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <button
              className="flex items-center justify-between w-full"
              onClick={() => toggle("sesi")}
            >
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Rekap per Sesi ({sessionSummary.filter(s => s.dicatat > 0).length} sesi aktif)
              </CardTitle>
              {expandedSection === "sesi" ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </button>
          </CardHeader>
          {expandedSection === "sesi" && (
            <CardContent className="pt-0 pb-3 space-y-3">
              {isLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
              ) : sessionSummary.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground py-4">Belum ada data absensi untuk tanggal ini</p>
              ) : (
                sessionSummary.map(s => (
                  <div key={s.value} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{s.label}</p>
                      <span className="text-xs text-muted-foreground">{s.dicatat}/{s.total} tercatat</span>
                    </div>
                    <MiniBar value={s.hadir} max={s.total} color="bg-emerald-500" />
                    <div className="flex gap-3 flex-wrap">
                      {s.hadir > 0 && (
                        <span className="flex items-center gap-1 text-xs text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> {s.hadir} hadir
                        </span>
                      )}
                      {s.terlambat > 0 && (
                        <span className="flex items-center gap-1 text-xs text-amber-700">
                          <Clock className="h-3 w-3" /> {s.terlambat} terlambat
                        </span>
                      )}
                      {s.izin > 0 && (
                        <span className="flex items-center gap-1 text-xs text-blue-700">
                          <AlertCircle className="h-3 w-3" /> {s.izin} izin
                        </span>
                      )}
                      {s.absen > 0 && (
                        <span className="flex items-center gap-1 text-xs text-red-700">
                          <XCircle className="h-3 w-3" /> {s.absen} absen
                        </span>
                      )}
                      {s.dicatat === 0 && (
                        <span className="text-xs text-muted-foreground italic">Belum ada absensi</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          )}
        </Card>

        {/* ── Jamaah Belum Check-in ──────────────────────────────── */}
        <Card className={belumCount > 0 ? "border-red-200" : ""}>
          <CardHeader className="pb-2">
            <button
              className="flex items-center justify-between w-full"
              onClick={() => toggle("belum-checkin")}
            >
              <CardTitle className={`text-base flex items-center gap-2 ${belumCount > 0 ? "text-red-700" : ""}`}>
                <UserX className={`h-4 w-4 ${belumCount > 0 ? "text-red-500" : "text-muted-foreground"}`} />
                Belum Check-in
                <Badge className={`text-[10px] ml-1 ${belumCount > 0 ? "bg-red-100 text-red-700 border-red-200 border" : "bg-muted text-muted-foreground"}`}>
                  {belumCount}
                </Badge>
              </CardTitle>
              {expandedSection === "belum-checkin" ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </button>
          </CardHeader>
          {expandedSection === "belum-checkin" && (
            <CardContent className="pt-0 pb-0">
              {isLoading ? (
                <div className="space-y-2 pb-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10" />)}</div>
              ) : belumCheckin.length === 0 ? (
                <div className="py-6 text-center">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
                  <p className="text-sm text-emerald-600 font-medium">Semua jamaah sudah check-in!</p>
                </div>
              ) : (
                <div className="divide-y">
                  {belumCheckin.map((p, i) => (
                    <div key={p.bookingId} className="flex items-center gap-3 py-2.5 px-0">
                      <span className="text-xs text-muted-foreground w-5 shrink-0 text-center">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/muthawif/jamaah/${p.customerId}`}
                          className="text-sm font-medium truncate block hover:text-primary hover:underline underline-offset-2 transition-colors"
                        >
                          {p.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{p.phone}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className={`text-[10px] ${p.gender === "male" || p.gender === "laki-laki" ? "border-blue-300 text-blue-700" : "border-pink-300 text-pink-700"}`}>
                          {p.gender === "male" || p.gender === "laki-laki" ? "L" : "P"}
                        </Badge>
                        {p.phone && p.phone !== "-" && (
                          <a
                            href={`https://wa.me/${p.phone.replace(/\D/g,"").replace(/^0/,"62")}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-700 text-xs font-medium px-2 py-1 rounded border border-green-200 hover:bg-green-50 transition-colors"
                          >
                            WA
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* ── Full Attendance Matrix ─────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <button
              className="flex items-center justify-between w-full"
              onClick={() => toggle("matriks")}
            >
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Matriks Kehadiran Lengkap
              </CardTitle>
              {expandedSection === "matriks" ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </button>
          </CardHeader>
          {expandedSection === "matriks" && (
            <CardContent className="pt-0 px-0 pb-0">
              {isLoading ? (
                <div className="p-4 space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-9" />)}</div>
              ) : jamaahMatrix.sessions.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground py-6">Belum ada sesi absensi untuk tanggal ini</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[400px]">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-6">#</th>
                        <th className="text-left px-2 py-2.5 font-medium text-muted-foreground">Nama</th>
                        {jamaahMatrix.sessions.map(s => (
                          <th key={s.value} className="px-2 py-2.5 font-medium text-muted-foreground text-center whitespace-nowrap" style={{ minWidth: 70 }}>
                            {s.label.length > 10 ? s.label.substring(0, 10) + "…" : s.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {jamaahMatrix.rows.map((row, i) => (
                        <tr key={row.bookingId} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                          <td className="px-2 py-2">
                            <p className="font-medium">{row.name}</p>
                            <p className="text-muted-foreground text-[10px]">{row.phone}</p>
                          </td>
                          {jamaahMatrix.sessions.map(s => {
                            const st = row.statusMap[s.value] as AttStatus | null;
                            const cfg = st ? STATUS_CFG[st] : null;
                            return (
                              <td key={s.value} className="px-2 py-2 text-center">
                                {cfg ? (
                                  <Badge className={`text-[10px] border ${cfg.cls} px-1.5 py-0`}>
                                    {cfg.short}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Legend */}
              {jamaahMatrix.sessions.length > 0 && (
                <div className="flex flex-wrap gap-3 px-4 py-3 border-t bg-muted/20">
                  {Object.entries(STATUS_CFG).map(([k, v]) => {
                    const Icon = v.icon;
                    return (
                      <span key={k} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Badge className={`text-[10px] border ${v.cls} px-1 py-0`}>{v.short}</Badge>
                        {v.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* ── Export & Print ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 pb-4">
          <Button
            variant="outline"
            className="h-10 gap-2"
            onClick={handleExportPDF}
            disabled={exporting || !activeDeparture || total === 0}
          >
            {exporting ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Download PDF
          </Button>
          <Button
            variant="outline"
            className="h-10 gap-2"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            Cetak
          </Button>
        </div>

      </div>
    </div>
  );
}
