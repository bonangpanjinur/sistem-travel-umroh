import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Download, Award, Star, Share2, Lock, CheckCircle2, Printer } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import jsPDF from "jspdf";

export default function JamaahSertifikat() {
  const { user } = useAuth();
  const [selectedBooking, setSelectedBooking] = useState("");
  const [generating, setGenerating] = useState(false);

  // Get user's completed bookings
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["sertifikat-bookings", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, booking_code, booking_status,
          departure:departures(
            departure_date, return_date, flight_number,
            package:packages(name, package_type:package_types(name))
          ),
          customer:profiles(full_name, gender)
        `)
        .eq("customer_id", user!.id);
      if (error) throw error;
      return (data || []).filter((b: any) => b.booking_status === "completed" || b.booking_status === "confirmed");
    },
  });

  const selected = bookings.find((b: any) => b.id === selectedBooking) as any;
  const isCompleted = selected?.booking_status === "completed";

  async function generateSertifikat() {
    if (!selected) return;
    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const W = 297, H = 210;

      // Background gradient simulation (filled rects)
      doc.setFillColor(30, 58, 138); // deep blue
      doc.rect(0, 0, W, H, "F");

      // Gold border frame
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(3);
      doc.rect(8, 8, W - 16, H - 16);
      doc.setLineWidth(1);
      doc.rect(12, 12, W - 24, H - 24);

      // Inner white area
      doc.setFillColor(255, 255, 255);
      doc.rect(15, 15, W - 30, H - 30, "F");

      // Header green accent
      doc.setFillColor(21, 128, 61);
      doc.rect(15, 15, W - 30, 40, "F");

      // Top text
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("VINSTOUR TRAVEL & TOURS", W / 2, 27, { align: "center" });
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Penyelenggara Perjalanan Umroh & Haji Terpercaya", W / 2, 35, { align: "center" });
      doc.text("Izin Operasional: SK Kemenag RI No. 001/2024", W / 2, 43, { align: "center" });

      // Main certificate title
      doc.setTextColor(30, 58, 138);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("SERTIFIKAT PERJALANAN IBADAH", W / 2, 72, { align: "center" });

      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(selected.departure?.package?.package_type?.name?.toUpperCase() || "UMROH", W / 2, 82, { align: "center" });

      // Divider
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(1.5);
      doc.line(40, 88, W - 40, 88);

      // Body text
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("Dengan bangga menyatakan bahwa:", W / 2, 100, { align: "center" });

      // Name
      doc.setFontSize(26);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 138);
      doc.text(selected.customer?.full_name || "Jamaah", W / 2, 118, { align: "center" });

      // Name underline
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.8);
      const nameW = doc.getTextWidth(selected.customer?.full_name || "Jamaah") * 0.9;
      doc.line(W / 2 - nameW / 2, 121, W / 2 + nameW / 2, 121);

      // Details
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);

      const pkg = selected.departure?.package?.name || "-";
      const dep = selected.departure?.departure_date
        ? format(parseISO(selected.departure.departure_date), "d MMMM yyyy", { locale: idLocale })
        : "-";
      const ret = selected.departure?.return_date
        ? format(parseISO(selected.departure.return_date), "d MMMM yyyy", { locale: idLocale })
        : "-";

      doc.text(`Telah menyelesaikan perjalanan ibadah ${selected.departure?.package?.package_type?.name || "Umroh"} dengan paket:`, W / 2, 132, { align: "center" });

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(21, 128, 61);
      doc.text(`"${pkg}"`, W / 2, 141, { align: "center" });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(`Periode: ${dep} — ${ret}`, W / 2, 151, { align: "center" });
      doc.text(`No. Booking: ${selected.booking_code}`, W / 2, 158, { align: "center" });

      // Bottom divider
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(1.5);
      doc.line(40, 163, W - 40, 163);

      // Doa & seal
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);
      doc.text('"Semoga menjadi ibadah yang mabrur dan diterima oleh Allah SWT. Aamiin Ya Rabbal Alamin."', W / 2, 172, { align: "center" });

      // Signature area
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      const issuedDate = format(new Date(), "d MMMM yyyy", { locale: idLocale });
      doc.text(`Diterbitkan: ${issuedDate}`, 60, 185, { align: "center" });
      doc.text("Direktur Utama", W - 60, 182, { align: "center" });
      doc.text("Vinstour Travel & Tours", W - 60, 188, { align: "center" });

      // Kode QR placeholder (box)
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.5);
      doc.rect(W / 2 - 10, 176, 20, 20);
      doc.setFontSize(5);
      doc.setTextColor(120);
      doc.text("QR Code", W / 2, 189, { align: "center" });

      // Watermark
      doc.setFontSize(40);
      doc.setTextColor(200, 200, 200);
      doc.setGState(doc.GState({ opacity: 0.15 }));
      doc.text("VINSTOUR", W / 2, H / 2 + 10, { align: "center", angle: 30 });

      doc.save(`sertifikat-${selected.customer?.full_name?.replace(/\s+/g, "-").toLowerCase() || "jamaah"}-${selected.booking_code}.pdf`);
      toast.success("Sertifikat berhasil diunduh! 🎉");
    } catch (err) {
      console.error(err);
      toast.error("Gagal membuat sertifikat");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="text-center pt-2">
        <h1 className="text-2xl font-bold">Sertifikat Perjalanan</h1>
        <p className="text-muted-foreground text-sm mt-1">Unduh sertifikat digital perjalanan umroh/hajimu</p>
      </div>

      {/* Certificate preview illustration */}
      <Card className="bg-gradient-to-br from-blue-900 to-green-800 text-white border-0 overflow-hidden">
        <CardContent className="pt-5 pb-5">
          <div className="border-2 border-yellow-400/60 rounded-lg p-5 text-center">
            <div className="border border-yellow-400/40 rounded p-4">
              <p className="text-yellow-400 font-bold text-sm uppercase tracking-widest mb-2">VINSTOUR TRAVEL & TOURS</p>
              <p className="text-white/70 text-xs mb-4">Sertifikat Perjalanan Ibadah</p>
              <Award className="h-12 w-12 mx-auto text-yellow-400 mb-2" />
              <p className="text-white/60 text-xs">Dengan penuh kebanggaan diberikan kepada</p>
              <p className="text-xl font-bold text-yellow-300 mt-1">
                {selected?.customer?.full_name || user?.email?.split("@")[0] || "Nama Jamaah"}
              </p>
              <p className="text-white/60 text-xs mt-1">
                {selected?.departure?.package?.name || "Pilih paket untuk melihat detail"}
              </p>
              <div className="flex justify-center gap-2 mt-3">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pilih Perjalanan</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-9 w-full" />
          ) : bookings.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Lock className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sertifikat tersedia setelah perjalanan selesai</p>
              <p className="text-xs mt-1">Status booking harus "completed" atau "confirmed"</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Select value={selectedBooking} onValueChange={setSelectedBooking}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih booking..." />
                </SelectTrigger>
                <SelectContent>
                  {bookings.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      <span className="flex items-center gap-2">
                        {b.booking_status === "completed" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Award className="h-3.5 w-3.5 text-blue-600" />
                        )}
                        {b.departure?.package?.name || "Paket"} — {b.booking_code}
                        <Badge variant="outline" className="text-[10px] ml-1">{b.booking_status}</Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selected && (
                <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paket</span>
                    <span className="font-medium">{selected.departure?.package?.name || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Berangkat</span>
                    <span className="font-medium">
                      {selected.departure?.departure_date
                        ? format(parseISO(selected.departure.departure_date), "d MMM yyyy", { locale: idLocale })
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kembali</span>
                    <span className="font-medium">
                      {selected.departure?.return_date
                        ? format(parseISO(selected.departure.return_date), "d MMM yyyy", { locale: idLocale })
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className={`text-[10px] ${isCompleted ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`}>
                      {selected.booking_status}
                    </Badge>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={generateSertifikat}
                  disabled={!selectedBooking || generating}
                >
                  {generating ? (
                    <span className="flex items-center gap-2"><span className="animate-spin">⏳</span> Membuat PDF...</span>
                  ) : (
                    <><Download className="h-4 w-4 mr-2" /> Unduh Sertifikat PDF</>
                  )}
                </Button>
                {selectedBooking && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.share?.({
                        title: "Sertifikat Umroh",
                        text: `Alhamdulillah, saya telah menyelesaikan perjalanan ${selected?.departure?.package?.name || "Umroh"}! 🕋🤲`,
                      });
                    }}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
        <CardContent className="pt-3 pb-3">
          <p className="text-xs text-amber-800 dark:text-amber-400">
            💡 <strong>Tips:</strong> Sertifikat akan diunduh dalam format PDF resolusi tinggi. Cetak dan simpan sebagai kenangan perjalanan ibadah Anda yang berharga.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
