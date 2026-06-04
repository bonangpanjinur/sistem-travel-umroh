import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, FileText, Download, Printer, CheckCircle2, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import jsPDF from "jspdf";

export default function JamaahKontrak() {
  const { user } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const { data: customer } = useQuery({
    queryKey: ["jamaah-customer", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("customers").select("*").eq("user_id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: booking, isLoading } = useQuery({
    queryKey: ["jamaah-kontrak-booking", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return null;
      const { data } = await supabase
        .from("bookings")
        .select(`
          *,
          departure:departures(
            *,
            package:packages(*),
            hotel_makkah:hotels!departures_hotel_makkah_id_fkey(name, star_rating),
            hotel_madinah:hotels!departures_hotel_madinah_id_fkey(name, star_rating),
            airline:airlines(name)
          )
        `)
        .eq("customer_id", customer.id)
        .in("booking_status", ["confirmed", "completed", "pending"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!customer?.id,
  });

  const { data: companySettings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("company_settings").select("*");
      const map: Record<string, string> = {};
      (data || []).forEach((row: any) => { map[row.key] = row.value; });
      return map;
    },
  });

  const departure = (booking?.departure as any);
  const pkg = departure?.package;
  const hotelMakkah = departure?.hotel_makkah;
  const hotelMadinah = departure?.hotel_madinah;
  const airline = departure?.airline;
  const companyName = companySettings?.["company_name"] || "Vinstour Travel";
  const companyAddress = companySettings?.["company_address"] || "Indonesia";
  const companyPhone = companySettings?.["company_phone"] || "-";

  const generatePDF = async () => {
    if (!booking || !customer) return;
    setGenerating(true);
    try {
      const doc = new jsPDF({ format: "a4", unit: "mm" });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = 20;

      const addLine = (text: string, size = 11, bold = false, color = "#1a1a2e") => {
        doc.setFontSize(size);
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setTextColor(color);
        doc.text(text, margin, y);
        y += size * 0.45 + 2;
      };

      const addRow = (label: string, value: string) => {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor("#555555");
        doc.text(label, margin, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor("#1a1a2e");
        doc.text(value, margin + 65, y);
        y += 7;
      };

      const hr = () => {
        doc.setDrawColor("#e0e0e0");
        doc.line(margin, y, pageW - margin, y);
        y += 5;
      };

      // Header
      doc.setFillColor("#1a4a8a");
      doc.rect(0, 0, pageW, 18, "F");
      doc.setTextColor("#ffffff");
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(companyName, margin, 12);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("SURAT PERJANJIAN / KONTRAK PERJALANAN IBADAH", pageW - margin, 12, { align: "right" });
      y = 28;

      addLine("SURAT PERJANJIAN PERJALANAN IBADAH UMROH/HAJI", 14, true, "#1a4a8a");
      y += 2;
      doc.setFontSize(10);
      doc.setTextColor("#666666");
      doc.text(`No. Kontrak: ${booking.booking_code} | Tanggal: ${format(new Date(booking.created_at!), "d MMMM yyyy", { locale: id })}`, margin, y);
      y += 8;
      hr();

      // Pihak yang bersepakat
      addLine("I. PIHAK YANG BERSEPAKAT", 11, true);
      y += 2;
      addRow("Pihak Pertama (Travel)", companyName);
      addRow("Alamat", companyAddress);
      addRow("Telepon", companyPhone);
      y += 2;
      addRow("Pihak Kedua (Jamaah)", customer.full_name || "-");
      addRow("No. Paspor", customer.passport_number || "-");
      addRow("No. HP", customer.phone || "-");
      y += 3;
      hr();

      // Detail Perjalanan
      addLine("II. DETAIL PERJALANAN", 11, true);
      y += 2;
      addRow("Paket", pkg?.name || "-");
      addRow("Keberangkatan", departure?.departure_date ? format(new Date(departure.departure_date), "d MMMM yyyy", { locale: id }) : "-");
      addRow("Kepulangan", departure?.return_date ? format(new Date(departure.return_date), "d MMMM yyyy", { locale: id }) : "-");
      addRow("Maskapai", airline?.name || "-");
      addRow("No. Penerbangan", departure?.flight_number || "-");
      addRow("Hotel Makkah", hotelMakkah ? `${hotelMakkah.name} (${hotelMakkah.star_rating}★)` : "-");
      addRow("Hotel Madinah", hotelMadinah ? `${hotelMadinah.name} (${hotelMadinah.star_rating}★)` : "-");
      addRow("Tipe Kamar", booking.room_type || "-");
      addRow("Jumlah Jamaah", `${booking.total_pax} orang`);
      y += 3;
      hr();

      // Pembayaran
      addLine("III. BIAYA PERJALANAN", 11, true);
      y += 2;
      addRow("Harga Paket", formatCurrency(booking.base_price));
      if ((booking.discount_amount ?? 0) > 0) addRow("Diskon", `- ${formatCurrency(booking.discount_amount ?? 0)}`);
      addRow("Total Biaya", formatCurrency(booking.total_price));
      addRow("Sudah Dibayar", formatCurrency(booking.paid_amount ?? 0));
      addRow("Sisa Pembayaran", formatCurrency(booking.remaining_amount ?? 0));
      addRow("Status Pembayaran", booking.payment_status === "paid" ? "LUNAS" : "Belum Lunas");
      y += 3;
      hr();

      // Ketentuan
      addLine("IV. KETENTUAN UMUM", 11, true);
      y += 2;
      const terms = [
        "1. Pihak pertama wajib menyediakan layanan sesuai paket yang dipilih.",
        "2. Pihak kedua wajib melunasi biaya sesuai jadwal yang disepakati.",
        "3. Pembatalan oleh jamaah dikenakan biaya sesuai kebijakan travel.",
        "4. Force majeure (bencana alam, kebijakan pemerintah) tidak menjadi tanggungjawab travel.",
        "5. Dokumen perjalanan (paspor, visa) menjadi tanggung jawab bersama.",
        "6. Perselisihan diselesaikan secara musyawarah mufakat.",
      ];
      terms.forEach(t => {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor("#333333");
        const lines = doc.splitTextToSize(t, pageW - margin * 2);
        doc.text(lines, margin, y);
        y += lines.length * 5 + 1;
      });
      y += 5;
      hr();

      // Tanda tangan
      addLine("V. TANDA TANGAN", 11, true);
      y += 4;
      doc.setFontSize(10);
      doc.setTextColor("#333333");
      doc.text("Pihak Pertama", margin, y);
      doc.text("Pihak Kedua", pageW - margin - 50, y);
      y += 20;
      doc.line(margin, y, margin + 50, y);
      doc.line(pageW - margin - 50, y, pageW - margin, y);
      y += 5;
      doc.setFontSize(9);
      doc.text(companyName, margin, y);
      doc.text(customer.full_name || "", pageW - margin - 50, y);

      // Footer
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFillColor("#f5f5f5");
      doc.rect(0, pageH - 12, pageW, 12, "F");
      doc.setFontSize(8);
      doc.setTextColor("#888888");
      doc.text(`Dicetak: ${format(new Date(), "d MMMM yyyy, HH:mm", { locale: id })} | ${companyName}`, margin, pageH - 4);

      doc.save(`kontrak-${booking.booking_code}.pdf`);
      toast.success("Kontrak berhasil diunduh sebagai PDF!");
    } catch (err: any) {
      toast.error("Gagal membuat PDF: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    if (printRef.current) {
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(`<html><head><title>Kontrak ${booking?.booking_code}</title></head><body>`);
        w.document.write(printRef.current.innerHTML);
        w.document.write("</body></html>");
        w.document.close();
        w.print();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/jamaah" className="p-1 -ml-1 rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="font-semibold text-gray-900">Kontrak Perjalanan</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Unduh surat perjanjian ibadah Anda</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {isLoading ? (
          <div className="space-y-3"><Skeleton className="h-48" /><Skeleton className="h-64" /></div>
        ) : !booking ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="h-14 w-14 mx-auto text-muted-foreground mb-4 opacity-40" />
              <p className="font-semibold text-gray-700">Belum Ada Booking</p>
              <p className="text-sm text-muted-foreground mt-1">Kontrak tersedia setelah booking terdaftar</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button onClick={generatePDF} disabled={generating} className="flex-1 gap-2">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {generating ? "Membuat PDF..." : "Unduh PDF"}
              </Button>
              <Button onClick={handlePrint} variant="outline" className="gap-2">
                <Printer className="h-4 w-4" /> Cetak
              </Button>
            </div>

            {/* Contract Preview */}
            <Card>
              <CardHeader className="pb-3 bg-primary text-white rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white text-base">{companyName}</CardTitle>
                    <p className="text-white/80 text-xs mt-0.5">Surat Perjanjian Perjalanan Ibadah</p>
                  </div>
                  <FileText className="h-8 w-8 text-white/60" />
                </div>
              </CardHeader>

              <div ref={printRef}>
                <CardContent className="pt-4 space-y-4 text-sm">
                  <div>
                    <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">No. Kontrak</p>
                    <p className="font-mono text-lg font-bold text-gray-800">{booking.booking_code}</p>
                    <p className="text-xs text-muted-foreground">
                      Dibuat: {format(new Date(booking.created_at!), "d MMMM yyyy", { locale: id })}
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-primary uppercase tracking-wider">Data Jamaah</p>
                    {[
                      ["Nama", customer?.full_name],
                      ["No. Paspor", customer?.passport_number || "-"],
                      ["No. HP", customer?.phone || "-"],
                    ].map(([l, v]) => (
                      <div key={l} className="flex justify-between gap-2">
                        <span className="text-muted-foreground text-xs w-28 flex-shrink-0">{l}</span>
                        <span className="text-right font-medium text-xs">{v}</span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-primary uppercase tracking-wider">Detail Perjalanan</p>
                    {[
                      ["Paket", pkg?.name],
                      ["Keberangkatan", departure?.departure_date ? format(new Date(departure.departure_date), "d MMMM yyyy", { locale: id }) : "-"],
                      ["Kepulangan", departure?.return_date ? format(new Date(departure.return_date), "d MMMM yyyy", { locale: id }) : "-"],
                      ["Maskapai", airline?.name || "-"],
                      ["No. Penerbangan", departure?.flight_number || "-"],
                      ["Hotel Makkah", hotelMakkah?.name || "-"],
                      ["Hotel Madinah", hotelMadinah?.name || "-"],
                      ["Tipe Kamar", booking.room_type],
                      ["Jumlah Jamaah", `${booking.total_pax} orang`],
                    ].map(([l, v]) => (
                      <div key={l} className="flex justify-between gap-2">
                        <span className="text-muted-foreground text-xs w-28 flex-shrink-0">{l}</span>
                        <span className="text-right font-medium text-xs">{v || "-"}</span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-primary uppercase tracking-wider">Biaya Perjalanan</p>
                    {[
                      ["Total Biaya", formatCurrency(booking.total_price)],
                      ["Sudah Dibayar", formatCurrency(booking.paid_amount ?? 0)],
                      ["Sisa Pembayaran", formatCurrency(booking.remaining_amount ?? 0)],
                    ].map(([l, v]) => (
                      <div key={l} className="flex justify-between gap-2">
                        <span className="text-muted-foreground text-xs w-28 flex-shrink-0">{l}</span>
                        <span className={`text-right font-bold text-sm ${l === "Sisa Pembayaran" && (booking.remaining_amount ?? 0) > 0 ? "text-destructive" : "text-gray-800"}`}>{v}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-muted-foreground text-xs">Status</span>
                      <Badge className={booking.payment_status === "paid" ? "bg-green-500" : "bg-amber-500"}>
                        {booking.payment_status === "paid" ? "✓ LUNAS" : "Belum Lunas"}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  <div className="p-3 bg-gray-50 rounded-lg text-xs text-muted-foreground space-y-1">
                    <p className="font-semibold text-gray-700">Ketentuan Utama:</p>
                    <p>• Travel wajib menyediakan layanan sesuai paket</p>
                    <p>• Jamaah wajib melunasi biaya sesuai jadwal</p>
                    <p>• Pembatalan dikenakan biaya sesuai kebijakan</p>
                    <p>• Perselisihan diselesaikan secara musyawarah</p>
                  </div>

                  <div className="text-center pt-2">
                    <p className="text-xs text-muted-foreground">Dokumen ini sah secara digital</p>
                    <div className="flex items-center justify-center gap-1 text-green-600 mt-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <p className="text-xs font-medium">Terverifikasi oleh {companyName}</p>
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
          </>
        )}
      </div>

      <JamaahBottomNav />
    </div>
  );
}
