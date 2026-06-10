import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import {
  Sparkles, Home, ChevronRight, Download, Share2, Star,
  Camera, BookOpen, Heart, Award, RefreshCcw,
  Calendar, Plane, CheckCircle2, Users, CreditCard,
  MapPin, Moon, Footprints
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import jsPDF from "jspdf";

function buildRingkasan(booking: any, photos: number, badges: number, attendance: any, checklist: any, passengers: any[]): string {
  const nama = booking?.customer?.full_name || "Jamaah";
  const paket = booking?.departure?.package?.name || "Umroh";
  const tglBerangkat = booking?.departure?.departure_date
    ? format(parseISO(booking.departure.departure_date), "d MMMM yyyy", { locale: idLocale }) : "—";
  const tglKembali = booking?.departure?.return_date
    ? format(parseISO(booking.departure.return_date), "d MMMM yyyy", { locale: idLocale }) : "—";
  const lama = booking?.departure?.departure_date && booking?.departure?.return_date
    ? differenceInDays(new Date(booking.departure.return_date), new Date(booking.departure.departure_date)) : 10;
  const hotel = booking?.departure?.hotel_makkah?.name || booking?.departure?.hotel_name || "Hotel Bintang 4";
  const maskapai = booking?.departure?.airline?.name || booking?.departure?.flight_number || "Saudi Airlines";
  const totalPax = passengers.length || booking?.total_pax || 1;
  const paidAmount = booking?.paid_amount || 0;
  const totalPrice = booking?.total_price || 0;
  const paidPct = totalPrice > 0 ? Math.round((paidAmount / totalPrice) * 100) : 100;

  const hadir = attendance?.hadir ?? null;
  const totalAbsen = attendance?.total ?? null;
  const attendancePct = hadir !== null && totalAbsen > 0 ? Math.round((hadir / totalAbsen) * 100) : null;

  const checklistDone = checklist?.done ?? null;
  const checklistTotal = checklist?.total ?? null;
  const checklistPct = checklistDone !== null && checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : null;

  const ibadahEstimasi = lama * 5;
  const thawafPerkiraan = Math.max(7, Math.round(lama / 2));

  let lines: string[] = [
    `Alhamdulillah, perjalanan suci ${nama} telah selesai. Berikut ringkasan perjalanan ibadah yang tercatat dalam sistem Vinstour Travel:`,
    "",
    `🕋 PERJALANAN ${paket.toUpperCase()}`,
    `Tanggal Berangkat  : ${tglBerangkat}`,
    `Tanggal Kembali    : ${tglKembali}`,
    `Durasi             : ${lama} hari ${lama} malam`,
    `Total Jamaah       : ${totalPax} orang`,
    "",
    `✈️ TRANSPORTASI & AKOMODASI`,
    `Maskapai           : ${maskapai}`,
    `Hotel Makkah       : ${hotel}`,
  ];
  if (booking?.departure?.hotel_madinah?.name) {
    lines.push(`Hotel Madinah      : ${booking.departure.hotel_madinah.name}`);
  }
  lines.push("");

  if (attendancePct !== null) {
    lines.push(`✅ KEHADIRAN PROGRAM`);
    lines.push(`Hadir              : ${hadir} dari ${totalAbsen} sesi (${attendancePct}%)`);
    if (attendancePct >= 90) lines.push(`Kehadiran Anda sangat baik — Alhamdulillah! 🎉`);
    else if (attendancePct >= 70) lines.push(`Kehadiran Anda cukup baik.`);
    else lines.push(`Ada beberapa sesi yang terlewatkan — semoga Allah tetap menerima ibadah Anda.`);
    lines.push("");
  }

  if (checklistPct !== null) {
    lines.push(`📋 CHECKLIST PERSIAPAN`);
    lines.push(`Selesai            : ${checklistDone} dari ${checklistTotal} item (${checklistPct}%)`);
    lines.push("");
  }

  lines.push(`🕌 IBADAH (Estimasi)`);
  lines.push(`Sholat berjamaah   : ~${ibadahEstimasi} sholat`);
  lines.push(`Thawaf             : ${thawafPerkiraan} × 7 putaran`);
  lines.push(`Sa'i               : di antara Shafa–Marwa`);
  lines.push(`Doa & dzikir       : ${lama * 150}+ kali`);
  lines.push("");

  lines.push(`📸 KENANGAN DIGITAL`);
  lines.push(`Foto diupload      : ${photos} foto`);
  lines.push(`Badge pencapaian   : ${badges} badge`);
  lines.push("");

  if (paidPct >= 100) {
    lines.push(`💳 PEMBAYARAN`);
    lines.push(`Status             : ✅ Lunas (${formatCurrency(paidAmount)})`);
    lines.push("");
  } else if (paidPct > 0) {
    lines.push(`💳 PEMBAYARAN`);
    lines.push(`Terbayar           : ${formatCurrency(paidAmount)} (${paidPct}%)`);
    lines.push("");
  }

  lines.push(`🌟 PENUTUP`);
  lines.push(`Semoga setiap langkah, setiap doa, dan setiap tetes air mata keharuan di Tanah Suci`);
  lines.push(`menjadi amalan yang diterima Allah SWT. Semoga menjadi haji/umroh yang mabrur.`);
  lines.push("");
  lines.push(`Barakallahu fiikum 🤲`);
  lines.push(`— Tim Vinstour Travel`);

  return lines.join("\n");
}

export default function JamaahRingkasanAI() {
  const { user } = useAuth();
  const [selectedBooking, setSelectedBooking] = useState("");
  const [generating, setGenerating] = useState(false);
  const [ringkasan, setRingkasan] = useState("");
  const [downloading, setDownloading] = useState(false);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["ringkasan-bookings", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select(`
          id, booking_code, booking_status, total_price, paid_amount, remaining_amount, total_pax,
          departure:departures(
            departure_date, return_date, flight_number, hotel_name,
            hotel_makkah:hotels!departures_hotel_makkah_id_fkey(name, star_rating),
            hotel_madinah:hotels!departures_hotel_madinah_id_fkey(name, star_rating),
            airline:airlines(name),
            package:packages(name, package_type)
          ),
          customer:profiles(full_name)
        `)
        .eq("customer_id", user!.id)
        .in("booking_status", ["completed", "confirmed"])
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: photos = [] } = useQuery({
    queryKey: ["user-photos", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("trip_photos").select("id").eq("uploaded_by", user!.id);
      return data || [];
    },
  });

  const { data: badges = [] } = useQuery({
    queryKey: ["user-badges-count", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("jamaah_badges").select("id").eq("user_id", user!.id);
      return data || [];
    },
  });

  const selected = (bookings as any[]).find(b => b.id === selectedBooking);

  const { data: attendanceSummary } = useQuery({
    queryKey: ["ringkasan-attendance", selected?.departure?.id],
    enabled: !!selected?.departure?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("status")
        .eq("user_id", user!.id);
      if (!data) return null;
      const hadir = data.filter((a: any) => a.status === "hadir").length;
      return { hadir, total: data.length };
    },
  });

  const { data: checklistSummary } = useQuery({
    queryKey: ["ringkasan-checklist", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("jamaah_checklist")
        .select("is_done")
        .eq("user_id", user!.id);
      if (!data) return null;
      const done = data.filter((c: any) => c.is_done).length;
      return { done, total: data.length };
    },
  });

  const { data: passengers = [] } = useQuery({
    queryKey: ["ringkasan-passengers", selectedBooking],
    enabled: !!selectedBooking,
    queryFn: async () => {
      const { data } = await supabase
        .from("booking_passengers")
        .select("id, passenger_type")
        .eq("booking_id", selectedBooking);
      return data || [];
    },
  });

  const lama = selected?.departure?.departure_date && selected?.departure?.return_date
    ? differenceInDays(new Date(selected.departure.return_date), new Date(selected.departure.departure_date))
    : 0;

  async function generateRingkasanAI() {
    if (!selected) return;
    setGenerating(true);
    await new Promise(r => setTimeout(r, 800));
    const text = buildRingkasan(
      selected,
      (photos as any[]).length,
      (badges as any[]).length,
      attendanceSummary,
      checklistSummary,
      passengers as any[],
    );
    setRingkasan(text);
    setGenerating(false);
    toast.success("Ringkasan perjalanan berhasil dibuat dari data aktual Anda!");
  }

  async function downloadPDF() {
    if (!ringkasan || !selected) return;
    setDownloading(true);
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const W = 210, margin = 20;
      const lineWidth = W - margin * 2;

      doc.setFillColor(30, 58, 138);
      doc.rect(0, 0, W, 48, "F");
      doc.setFillColor(212, 175, 55);
      doc.rect(0, 45, W, 2.5, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20); doc.setFont("helvetica", "bold");
      doc.text("RINGKASAN PERJALANAN", W / 2, 18, { align: "center" });
      doc.setFontSize(13); doc.setFont("helvetica", "normal");
      doc.text(`${selected.departure?.package?.name || "Umroh"} — ${selected.customer?.full_name || ""}`, W / 2, 30, { align: "center" });
      doc.setFontSize(9);
      doc.text(selected.booking_code || "", W / 2, 39, { align: "center" });

      doc.setTextColor(30, 30, 30);
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(ringkasan, lineWidth);
      let y = 55;
      for (const line of lines) {
        if (y > 272) { doc.addPage(); y = 20; }
        const isBold = line.match(/^[🕋✈️🕌📸💳✅📋🌟]/u) || line.startsWith("PERJALANAN") || line.startsWith("TRANSPORTASI") || line.startsWith("KEHADIRAN") || line.startsWith("CHECKLIST") || line.startsWith("IBADAH") || line.startsWith("KENANGAN") || line.startsWith("PEMBAYARAN") || line.startsWith("PENUTUP");
        if (isBold) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10.5);
        } else {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
        }
        doc.text(line, margin, y);
        y += isBold ? 6.5 : 5.5;
      }

      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFillColor(212, 175, 55);
        doc.rect(0, 284, W, 13, "F");
        doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont("helvetica", "normal");
        doc.text(`Vinstour Travel — ${format(new Date(), "MMMM yyyy", { locale: idLocale })}`, W / 2, 291.5, { align: "center" });
      }

      doc.save(`Ringkasan_${selected.customer?.full_name?.replace(/\s+/g, "_") || "Jamaah"}.pdf`);
      toast.success("PDF berhasil diunduh");
    } catch (e: any) {
      toast.error("Gagal generate PDF: " + e.message);
    } finally {
      setDownloading(false);
    }
  }

  async function shareRingkasan() {
    if (!ringkasan) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Ringkasan Perjalanan Umroh — Vinstour", text: ringkasan.slice(0, 500) + "..." });
      } else {
        await navigator.clipboard.writeText(ringkasan);
        toast.success("Ringkasan disalin ke clipboard");
      }
    } catch {}
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pb-20">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/jamaah"><Home className="h-5 w-5 text-muted-foreground" /></Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">Ringkasan Perjalanan</span>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-5 text-white">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/20 rounded-xl"><Sparkles className="h-6 w-6" /></div>
            <div>
              <h1 className="text-lg font-bold">Ringkasan Perjalanan</h1>
              <p className="text-sm text-indigo-100 mt-0.5">Dibuat dari data aktual perjalanan ibadah Anda</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">Memuat data booking...</CardContent></Card>
        ) : (bookings as any[]).length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center space-y-3">
              <Plane className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
              <p className="text-muted-foreground">Belum ada perjalanan yang selesai</p>
              <p className="text-xs text-muted-foreground">Ringkasan hanya tersedia setelah perjalanan ibadah Anda selesai</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="p-4 space-y-3">
                <label className="text-sm font-medium">Pilih Perjalanan</label>
                <Select value={selectedBooking} onValueChange={v => { setSelectedBooking(v); setRingkasan(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih booking untuk dirangkum..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(bookings as any[]).map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.departure?.package?.name || "Umroh"} — {b.departure?.departure_date ? format(parseISO(b.departure.departure_date), "MMM yyyy", { locale: idLocale }) : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selected && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {[
                      { icon: Calendar, label: "Berangkat", value: selected.departure?.departure_date ? format(parseISO(selected.departure.departure_date), "dd MMM yyyy", { locale: idLocale }) : "—" },
                      { icon: Moon, label: "Durasi", value: lama > 0 ? lama + " hari" : "—" },
                      { icon: Camera, label: "Foto", value: (photos as any[]).length + " foto" },
                      { icon: Award, label: "Badge", value: (badges as any[]).length + " badge" },
                      { icon: Users, label: "Penumpang", value: (passengers as any[]).length > 0 ? (passengers as any[]).length + " orang" : (selected.total_pax || "—") + " pax" },
                      { icon: CreditCard, label: "Pembayaran", value: selected.total_price > 0 ? Math.min(100, Math.round(((selected.paid_amount || 0) / selected.total_price) * 100)) + "% lunas" : "—" },
                      ...(attendanceSummary ? [{ icon: CheckCircle2, label: "Kehadiran", value: `${attendanceSummary.hadir}/${attendanceSummary.total} sesi` }] : []),
                      ...(checklistSummary ? [{ icon: Footprints, label: "Checklist", value: `${checklistSummary.done}/${checklistSummary.total} item` }] : []),
                    ].map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <div key={i} className="bg-muted/50 rounded-lg p-2.5 flex items-center gap-2">
                          <Icon className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">{item.label}</p>
                            <p className="text-sm font-medium truncate">{item.value}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  onClick={generateRingkasanAI}
                  disabled={!selectedBooking || generating}
                >
                  {generating ? (
                    <><RefreshCcw className="h-4 w-4 mr-2 animate-spin" />Menyusun ringkasan dari data Anda...</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" />Buat Ringkasan Perjalanan</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {ringkasan && (
              <Card className="border-indigo-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2 text-indigo-700">
                      <CheckCircle2 className="h-4 w-4" />Ringkasan Perjalanan Anda
                    </span>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={shareRingkasan}>
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={downloadPDF} disabled={downloading}>
                        {downloading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gradient-to-b from-indigo-50 to-white rounded-xl p-4 border border-indigo-100">
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans text-gray-700">{ringkasan}</pre>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={downloadPDF} disabled={downloading}>
                      <Download className="h-4 w-4 mr-1" />Unduh PDF
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={shareRingkasan}>
                      <Share2 className="h-4 w-4 mr-1" />Bagikan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
              <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
              Lihat Kenangan Lainnya
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Link to="/jamaah/galeri"><Button size="sm" variant="outline" className="w-full text-xs"><Camera className="h-3 w-3 mr-1" />Galeri</Button></Link>
              <Link to="/jamaah/badges"><Button size="sm" variant="outline" className="w-full text-xs"><Award className="h-3 w-3 mr-1" />Badge</Button></Link>
              <Link to="/jamaah/jurnal"><Button size="sm" variant="outline" className="w-full text-xs"><BookOpen className="h-3 w-3 mr-1" />Jurnal</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
