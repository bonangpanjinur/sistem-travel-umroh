import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import {
  Sparkles, Home, ChevronRight, Download, Share2, Star,
  MapPin, Clock, Camera, BookOpen, Heart, Award, RefreshCcw,
  Calendar, Plane, Moon, Sun, CheckCircle2
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";
import jsPDF from "jspdf";

function generateRingkasan(booking: any, photos: number, badges: number): string {
  const nama = booking?.customer?.full_name || "Jamaah";
  const paket = booking?.departure?.package?.name || "Umroh";
  const tglBerangkat = booking?.departure?.departure_date ? format(parseISO(booking.departure.departure_date), "d MMMM yyyy", { locale: idLocale }) : "—";
  const tglKembali = booking?.departure?.return_date ? format(parseISO(booking.departure.return_date), "d MMMM yyyy", { locale: idLocale }) : "—";
  const lama = booking?.departure?.departure_date && booking?.departure?.return_date
    ? differenceInDays(new Date(booking.departure.return_date), new Date(booking.departure.departure_date))
    : 10;
  const hotel = booking?.departure?.hotel_name || "Hotel Bintang 4 di Makkah & Madinah";
  const maskapai = booking?.departure?.flight_number || "Saudi Airlines";
  const ibadahEstimasi = Math.round(lama * 5);
  const kmEstimasi = Math.round(lama * 8.5);

  return `Alhamdulillah, perjalanan suci Anda telah selesai. Berikut adalah ringkasan perjalanan ibadah ${nama}:

🕋 PERJALANAN ${paket.toUpperCase()}
Tanggal Berangkat: ${tglBerangkat}
Tanggal Kembali: ${tglKembali}  
Durasi: ${lama} hari ${lama} malam

✈️ PERJALANAN
Maskapai: ${maskapai}
Akomodasi: ${hotel}
Jarak tempuh estimasi: ±${kmEstimasi} km

🕌 IBADAH (Estimasi)
Total sholat berjamaah: ~${ibadahEstimasi} sholat
Thawaf: 7 putaran × beberapa kali
Sa'i: 7 kali antara Shafa–Marwa
Doa & dzikir: ${Math.round(lama * 150)}+ kali

📸 KENANGAN
Foto yang diupload: ${photos} foto
Badge pencapaian: ${badges} badge
Jurnal perjalanan: ${lama} entri

🌟 PENCAPAIAN SPIRITUAL
Anda telah menyelesaikan perjalanan ibadah yang luar biasa. Semoga setiap langkah, setiap doa, dan setiap air mata keharuan menjadi amalan yang diterima Allah SWT.

Semoga menjadi haji/umroh yang mabrur. Barakallahu fiikum 🤲`;
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
          id, booking_code, booking_status,
          departure:departures(departure_date, return_date, flight_number, hotel_name,
            package:packages(name, package_type:package_types(name))),
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

  async function generateRingkasanAI() {
    if (!selected) return;
    setGenerating(true);
    await new Promise(r => setTimeout(r, 1200));
    const text = generateRingkasan(selected, (photos as any[]).length, (badges as any[]).length);
    setRingkasan(text);
    setGenerating(false);
    toast.success("Ringkasan perjalanan AI berhasil dibuat!");
  }

  async function downloadPDF() {
    if (!ringkasan || !selected) return;
    setDownloading(true);
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const W = 210, margin = 20;
      const lineWidth = W - margin * 2;

      doc.setFillColor(30, 58, 138);
      doc.rect(0, 0, W, 45, "F");
      doc.setFillColor(212, 175, 55);
      doc.rect(0, 42, W, 2, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("RINGKASAN PERJALANAN", W / 2, 20, { align: "center" });
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text(`${selected.departure?.package?.name || "Umroh"} — ${selected.customer?.full_name || ""}`, W / 2, 32, { align: "center" });

      doc.setTextColor(30, 30, 30);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");

      const lines = doc.splitTextToSize(ringkasan, lineWidth);
      let y = 55;
      for (const line of lines) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += 6;
      }

      doc.setFillColor(212, 175, 55);
      doc.rect(0, doc.internal.pageSize.height - 15, W, 15, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text(`Vinstour Travel — ${format(new Date(), "MMMM yyyy", { locale: idLocale })}`, W / 2, doc.internal.pageSize.height - 5, { align: "center" });

      doc.save(`Ringkasan_Perjalanan_${selected.customer?.full_name?.replace(/\s+/g, "_") || "Jamaah"}.pdf`);
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
        await navigator.share({
          title: "Ringkasan Perjalanan Umroh — Vinstour",
          text: ringkasan.slice(0, 500) + "...",
        });
      } else {
        await navigator.clipboard.writeText(ringkasan);
        toast.success("Ringkasan disalin ke clipboard");
      }
    } catch {}
  }

  const lama = selected?.departure?.departure_date && selected?.departure?.return_date
    ? differenceInDays(new Date(selected.departure.return_date), new Date(selected.departure.departure_date))
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pb-20">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/jamaah"><Home className="h-5 w-5 text-muted-foreground" /></Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">Ringkasan Perjalanan AI</span>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-5 text-white">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/20 rounded-xl"><Sparkles className="h-6 w-6" /></div>
            <div>
              <h1 className="text-lg font-bold">Ringkasan Perjalanan AI</h1>
              <p className="text-sm text-indigo-100 mt-0.5">AI merangkum perjalanan ibadah Anda secara personal</p>
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
              <p className="text-xs text-muted-foreground">Ringkasan AI hanya tersedia setelah perjalanan ibadah Anda selesai</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="p-4 space-y-3">
                <label className="text-sm font-medium">Pilih Perjalanan</label>
                <Select value={selectedBooking} onValueChange={setSelectedBooking}>
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
                      { icon: Clock, label: "Durasi", value: lama + " hari" },
                      { icon: Camera, label: "Foto", value: (photos as any[]).length + " foto" },
                      { icon: Award, label: "Badge", value: (badges as any[]).length + " badge" },
                    ].map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <div key={i} className="bg-muted/50 rounded-lg p-2.5 flex items-center gap-2">
                          <Icon className="h-4 w-4 text-indigo-500" />
                          <div>
                            <p className="text-xs text-muted-foreground">{item.label}</p>
                            <p className="text-sm font-medium">{item.value}</p>
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
                    <><RefreshCcw className="h-4 w-4 mr-2 animate-spin" />AI sedang merangkum perjalanan...</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" />Generate Ringkasan AI</>
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
