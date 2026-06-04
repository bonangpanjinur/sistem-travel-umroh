import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, QrCode, CheckCircle2, Clock, Calendar, Plane, Download, Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import QRCode from "qrcode";

const STEP_LABELS = [
  { key: "registered", label: "Terdaftar", icon: "📋" },
  { key: "payment_confirmed", label: "Pembayaran Lunas", icon: "💳" },
  { key: "documents_complete", label: "Dokumen Lengkap", icon: "📄" },
  { key: "visa_ready", label: "Visa Siap", icon: "🛂" },
  { key: "ready_to_depart", label: "Siap Berangkat", icon: "✈️" },
];

export default function JamaahCheckin() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrGenerated, setQrGenerated] = useState(false);

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
    queryKey: ["jamaah-checkin-booking", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return null;
      const { data } = await supabase
        .from("bookings")
        .select(`*, departure:departures(*, package:packages(*), airline:airlines(name))`)
        .eq("customer_id", customer.id)
        .in("booking_status", ["confirmed", "completed", "pending"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!customer?.id,
  });

  const departure = (booking?.departure as any);
  const pkg = departure?.package;

  const checkinPayload = booking ? JSON.stringify({
    code: booking.booking_code,
    name: customer?.full_name,
    passport: customer?.passport_number,
    depart: departure?.departure_date,
    pkg: pkg?.name,
    pax: booking.total_pax,
  }) : null;

  useEffect(() => {
    if (!checkinPayload || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, checkinPayload, {
      width: 220,
      margin: 2,
      color: { dark: "#1a1a2e", light: "#ffffff" },
    }, (err) => {
      if (!err) setQrGenerated(true);
    });
  }, [checkinPayload]);

  const getCheckinSteps = () => {
    if (!booking) return [];
    const steps = [];
    steps.push({ key: "registered", done: true });
    steps.push({ key: "payment_confirmed", done: booking.payment_status === "paid" });
    const docsOk = booking.payment_status === "paid";
    steps.push({ key: "documents_complete", done: docsOk });
    steps.push({ key: "visa_ready", done: false });
    steps.push({ key: "ready_to_depart", done: booking.booking_status === "completed" });
    return steps;
  };

  const steps = getCheckinSteps();
  const doneCount = steps.filter(s => s.done).length;
  const allReady = doneCount === steps.length;

  const handleDownloadQR = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `checkin-${booking?.booking_code}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
    toast.success("QR Check-in diunduh!");
  };

  const handleShare = async () => {
    if (!canvasRef.current || !booking) return;
    const text = `Check-in Jamaah\nNama: ${customer?.full_name}\nBooking: ${booking.booking_code}\nKeberangkatan: ${departure?.departure_date ? format(new Date(departure.departure_date), "d MMMM yyyy", { locale: id }) : "-"}`;
    if (navigator.share) {
      try { await navigator.share({ title: "QR Check-in Jamaah", text }); } catch {}
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Info check-in disalin!");
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
              <QrCode className="h-4 w-4 text-primary" />
              <span className="font-semibold text-gray-900">Check-in Mandiri</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">QR code & status keberangkatan</p>
          </div>
          {booking && (
            <Badge className={allReady ? "bg-green-100 text-green-700 border-green-200" : "bg-amber-100 text-amber-700 border-amber-200"} variant="outline">
              {allReady ? "Siap Berangkat ✓" : `${doneCount}/${steps.length} Langkah`}
            </Badge>
          )}
        </div>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-72 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        ) : !booking ? (
          <Card>
            <CardContent className="py-16 text-center">
              <QrCode className="h-14 w-14 mx-auto text-muted-foreground mb-4 opacity-40" />
              <p className="font-semibold text-gray-700">Belum Ada Booking Aktif</p>
              <p className="text-sm text-muted-foreground mt-1">QR check-in tersedia setelah booking dikonfirmasi</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* QR Card */}
            <Card className="overflow-hidden">
              <div className={`px-4 py-3 ${allReady ? "bg-green-500" : "bg-primary"} text-white`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-lg">{pkg?.name || "Paket Umroh"}</p>
                    <p className="text-sm opacity-80 font-mono">{booking.booking_code}</p>
                  </div>
                  <Plane className="h-8 w-8 opacity-60" />
                </div>
              </div>
              <CardContent className="py-5 flex flex-col items-center gap-4">
                <div className="p-3 bg-white border-2 border-primary/20 rounded-2xl shadow-inner">
                  <canvas ref={canvasRef} className="rounded-lg" />
                  {!qrGenerated && (
                    <div className="w-[220px] h-[220px] bg-gray-100 rounded-lg flex items-center justify-center">
                      <QrCode className="h-12 w-12 text-gray-300" />
                    </div>
                  )}
                </div>

                <div className="w-full text-center space-y-1">
                  <p className="font-bold text-lg">{customer?.full_name}</p>
                  {customer?.passport_number && (
                    <p className="text-sm text-muted-foreground font-mono">Paspor: {customer.passport_number}</p>
                  )}
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-2 w-full">
                  {[
                    { icon: <Calendar className="h-3.5 w-3.5" />, label: "Berangkat", value: departure?.departure_date ? format(new Date(departure.departure_date), "d MMM yyyy", { locale: id }) : "-" },
                    { icon: <Plane className="h-3.5 w-3.5" />, label: "Maskapai", value: (departure?.airline as any)?.name || "-" },
                    { icon: <Clock className="h-3.5 w-3.5" />, label: "No. Penerbangan", value: departure?.flight_number || "-" },
                    { icon: <QrCode className="h-3.5 w-3.5" />, label: "Jumlah Jamaah", value: `${booking.total_pax} orang` },
                  ].map(item => (
                    <div key={item.label} className="bg-gray-50 rounded-xl p-2.5">
                      <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                        {item.icon}
                        <p className="text-[10px]">{item.label}</p>
                      </div>
                      <p className="text-xs font-semibold truncate">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 w-full">
                  <Button onClick={handleDownloadQR} variant="outline" className="flex-1 gap-2 h-9 text-sm" disabled={!qrGenerated}>
                    <Download className="h-4 w-4" /> Unduh QR
                  </Button>
                  <Button onClick={handleShare} variant="outline" className="flex-1 gap-2 h-9 text-sm">
                    <Share2 className="h-4 w-4" /> Bagikan
                  </Button>
                </div>

                <p className="text-[11px] text-muted-foreground text-center">
                  Tunjukkan QR ini kepada petugas saat berkumpul di bandara
                </p>
              </CardContent>
            </Card>

            {/* Checklist progress */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Progress Check-in ({doneCount}/{steps.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0 divide-y">
                {steps.map((step, idx) => {
                  const meta = STEP_LABELS[idx];
                  return (
                    <div key={step.key} className="flex items-center gap-3 py-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                        step.done ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
                      }`}>
                        {step.done ? "✓" : meta.icon}
                      </div>
                      <p className={`text-sm flex-1 ${step.done ? "text-gray-800 font-medium" : "text-muted-foreground"}`}>
                        {meta.label}
                      </p>
                      <Badge variant={step.done ? "default" : "outline"} className={`text-xs ${step.done ? "bg-green-500" : ""}`}>
                        {step.done ? "Selesai" : "Belum"}
                      </Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <JamaahBottomNav />
    </div>
  );
}
