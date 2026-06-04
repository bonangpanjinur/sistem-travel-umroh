import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Download, FileText, Printer, Share2 } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";

export default function JamaahInvoice() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { user } = useAuth();
  const { getSetting } = useCompanySettings();

  const { data: customer } = useQuery({
    queryKey: ["jamaah-customer", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: booking, isLoading } = useQuery({
    queryKey: ["invoice-booking", bookingId, customer?.id],
    queryFn: async () => {
      if (!bookingId || !customer?.id) return null;
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          departure:departures(
            *,
            package:packages(name, description, duration_days),
            hotel_makkah:hotels!departures_hotel_makkah_id_fkey(name, star_rating),
            hotel_madinah:hotels!departures_hotel_madinah_id_fkey(name, star_rating),
            airline:airlines(name)
          )
        `)
        .eq("id", bookingId)
        .eq("customer_id", customer.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!bookingId && !!customer?.id,
  });

  const { data: payments } = useQuery({
    queryKey: ["invoice-payments", bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("booking_id", bookingId)
        .eq("status", "paid")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!bookingId,
  });

  const handleDownloadPDF = async () => {
    if (!booking) return;
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const companyName = getSetting("company_name") || "Vinstour Travel";
      const companyPhone = getSetting("company_phone") || "";
      const companyEmail = getSetting("company_email") || "";
      const companyAddress = getSetting("company_address") || "";

      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      // Header
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 100, 60);
      doc.text(companyName, 20, y);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      y += 7;
      if (companyAddress) doc.text(companyAddress, 20, y);
      y += 5;
      if (companyPhone) doc.text(`Tel: ${companyPhone}`, 20, y);
      if (companyEmail) doc.text(`Email: ${companyEmail}`, 100, y);
      y += 10;

      // Divider
      doc.setDrawColor(0, 120, 70);
      doc.setLineWidth(0.8);
      doc.line(20, y, pageWidth - 20, y);
      y += 8;

      // Invoice title
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("KWITANSI / INVOICE", 20, y);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(`No: INV-${booking.booking_code}`, pageWidth - 20, y, { align: "right" });
      y += 6;

      doc.setFontSize(9);
      doc.text(
        `Tanggal: ${format(new Date(), "d MMMM yyyy", { locale: id })}`,
        pageWidth - 20,
        y,
        { align: "right" }
      );
      y += 10;

      // Customer Info
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Data Jamaah:", 20, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      doc.text(`Nama   : ${customer?.full_name || "-"}`, 20, y); y += 5;
      doc.text(`NIK    : ${customer?.nik || "-"}`, 20, y); y += 5;
      doc.text(`Paspor : ${customer?.passport_number || "-"}`, 20, y); y += 5;
      doc.text(`HP     : ${customer?.phone || "-"}`, 20, y); y += 10;

      // Package Details
      const dep = (booking as any).departure;
      const pkg = dep?.package;

      autoTable(doc, {
        startY: y,
        head: [["Keterangan", "Detail"]],
        body: [
          ["Paket", pkg?.name || "-"],
          ["Durasi", `${pkg?.duration_days || "-"} Hari`],
          ["Kode Booking", booking.booking_code || "-"],
          ["Tanggal Keberangkatan", dep?.departure_date ? format(new Date(dep.departure_date), "d MMMM yyyy", { locale: id }) : "-"],
          ["Maskapai", dep?.airline?.name || "-"],
          ["Hotel Makkah", dep?.hotel_makkah?.name || "-"],
          ["Hotel Madinah", dep?.hotel_madinah?.name || "-"],
          ["Status Booking", booking.booking_status || "-"],
        ],
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [0, 120, 70], textColor: 255, fontStyle: "bold" },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 60 } },
        margin: { left: 20, right: 20 },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // Payment Summary
      autoTable(doc, {
        startY: y,
        head: [["Tanggal Bayar", "Metode", "Jumlah", "Status"]],
        body: (payments || []).map((p) => [
          format(new Date(p.created_at!), "d MMM yyyy", { locale: id }),
          `${p.payment_method || "-"} ${p.bank_name ? `(${p.bank_name})` : ""}`,
          formatCurrency(p.amount),
          "✓ Terverifikasi",
        ]),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [50, 50, 120], textColor: 255, fontStyle: "bold" },
        margin: { left: 20, right: 20 },
      });

      y = (doc as any).lastAutoTable.finalY + 8;

      // Total
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(20, y, pageWidth - 20, y);
      y += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Total Harga:", 20, y);
      doc.text(formatCurrency(booking.total_price || 0), pageWidth - 20, y, { align: "right" });
      y += 6;
      doc.text("Total Terbayar:", 20, y);
      doc.setTextColor(0, 120, 60);
      doc.text(formatCurrency(booking.paid_amount || 0), pageWidth - 20, y, { align: "right" });
      y += 6;
      doc.setTextColor(200, 50, 50);
      doc.text("Sisa Tagihan:", 20, y);
      doc.text(formatCurrency(booking.remaining_amount || 0), pageWidth - 20, y, { align: "right" });
      y += 14;

      // Footer
      doc.setTextColor(120, 120, 120);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Dokumen ini diterbitkan secara elektronik dan sah tanpa tanda tangan basah.", 20, y);
      y += 5;
      doc.text(`Dicetak: ${format(new Date(), "d MMMM yyyy HH:mm", { locale: id })}`, 20, y);

      doc.save(`Invoice-${booking.booking_code}.pdf`);
      toast.success("Invoice berhasil diunduh!");
    } catch (err: any) {
      toast.error("Gagal membuat PDF: " + (err.message || ""));
    }
  };

  const handlePrint = () => window.print();

  const handleShare = async () => {
    if (!booking) return;
    const text = `Kwitansi Booking ${booking.booking_code}\nNama: ${customer?.full_name}\nTotal: ${formatCurrency(booking.total_price || 0)}\nTerbayar: ${formatCurrency(booking.paid_amount || 0)}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Invoice Umroh", text }); return; } catch {}
    }
    await navigator.clipboard.writeText(text);
    toast.success("Info invoice disalin ke clipboard");
  };

  const dep = (booking as any)?.departure;
  const pkg = dep?.package;

  return (
    <div className="min-h-screen bg-background pb-24 print:pb-0">
      {/* Header — hidden on print */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-50 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/my-bookings">
              <Button variant="ghost" size="icon" className="text-primary-foreground">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold">Invoice / Kwitansi</h1>
              <p className="text-xs opacity-80">{booking?.booking_code || "Loading..."}</p>
            </div>
          </div>
          {booking && (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : !booking ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Invoice tidak ditemukan</p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link to="/my-bookings">Kembali ke Booking</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Invoice Preview */}
            <Card className="print:shadow-none print:border-0">
              <CardContent className="p-6 space-y-5">
                {/* Company Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-primary">
                      {getSetting("company_name") || "Vinstour Travel"}
                    </h2>
                    {getSetting("company_address") && (
                      <p className="text-xs text-muted-foreground mt-0.5">{getSetting("company_address")}</p>
                    )}
                    {getSetting("company_phone") && (
                      <p className="text-xs text-muted-foreground">{getSetting("company_phone")}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-muted-foreground">INVOICE</p>
                    <p className="font-mono font-bold">INV-{booking.booking_code}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(), "d MMM yyyy", { locale: id })}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Customer Info */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">DATA JAMAAH</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div>
                      <span className="text-muted-foreground">Nama</span>
                      <p className="font-medium">{customer?.full_name || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">NIK</span>
                      <p className="font-medium">{customer?.nik || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Paspor</span>
                      <p className="font-medium">{customer?.passport_number || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">HP</span>
                      <p className="font-medium">{customer?.phone || "-"}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Package Info */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">DETAIL PAKET</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paket</span>
                      <span className="font-medium text-right">{pkg?.name || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Durasi</span>
                      <span className="font-medium">{pkg?.duration_days} Hari</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Keberangkatan</span>
                      <span className="font-medium">
                        {dep?.departure_date
                          ? format(new Date(dep.departure_date), "d MMM yyyy", { locale: id })
                          : "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Maskapai</span>
                      <span className="font-medium">{dep?.airline?.name || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hotel Makkah</span>
                      <span className="font-medium">{dep?.hotel_makkah?.name || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hotel Madinah</span>
                      <span className="font-medium">{dep?.hotel_madinah?.name || "-"}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Payments */}
                {payments && payments.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">RIWAYAT PEMBAYARAN</p>
                    <div className="space-y-2">
                      {payments.map((p, idx) => (
                        <div key={p.id} className="flex justify-between items-center text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">
                              #{idx + 1} — {format(new Date(p.created_at!), "d MMM yyyy", { locale: id })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {p.payment_method} {p.bank_name ? `(${p.bank_name})` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-green-700">{formatCurrency(p.amount)}</span>
                            <Badge variant="outline" className="text-[10px] h-4 text-green-600 border-green-200">✓</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Harga Paket</span>
                    <span className="font-medium">{formatCurrency(booking.total_price || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Terbayar</span>
                    <span className="font-bold text-green-700">{formatCurrency(booking.paid_amount || 0)}</span>
                  </div>
                  {(booking.remaining_amount || 0) > 0 && (
                    <div className="flex justify-between text-sm bg-red-50 p-2 rounded-lg">
                      <span className="font-medium text-red-700">Sisa Tagihan</span>
                      <span className="font-bold text-red-700">{formatCurrency(booking.remaining_amount || 0)}</span>
                    </div>
                  )}
                  {(booking.remaining_amount || 0) === 0 && (
                    <div className="text-center py-2">
                      <Badge className="bg-green-600 text-white px-4">✓ LUNAS</Badge>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Footer note */}
                <p className="text-xs text-muted-foreground text-center">
                  Dokumen ini sah secara elektronik • {getSetting("company_name") || "Vinstour Travel"}
                </p>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 print:hidden">
              <Button onClick={handleDownloadPDF} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Unduh PDF
              </Button>
              <Button onClick={handlePrint} variant="outline" className="w-full">
                <Printer className="h-4 w-4 mr-2" />
                Cetak
              </Button>
            </div>

            <Button onClick={handleShare} variant="outline" className="w-full print:hidden">
              <Share2 className="h-4 w-4 mr-2" />
              Bagikan via WhatsApp / Email
            </Button>
          </>
        )}
      </div>

      <JamaahBottomNav />
    </div>
  );
}
