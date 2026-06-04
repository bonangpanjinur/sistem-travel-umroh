import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft, Share2, Copy, CheckCheck, Users, QrCode,
  Plane, Calendar, Info, Shield, Eye, EyeOff, Navigation
} from "lucide-react";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { LiveLocationShare } from "@/components/jamaah/LiveLocationShare";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

function encodeBookingToken(bookingCode: string): string {
  return btoa(bookingCode).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export default function JamaahPantauKeluarga() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [shareEnabled, setShareEnabled] = useState(() => {
    return localStorage.getItem("family-tracking-enabled") === "true";
  });

  const { data: customer } = useQuery({
    queryKey: ["customer-family", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("customers")
        .select("id, full_name, branch_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking-family", customer?.id],
    enabled: !!customer?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select(`
          id, booking_code, booking_status, created_at,
          departure:departures(
            departure_date, return_date,
            package:packages(name, code)
          )
        `)
        .eq("customer_id", customer!.id)
        .in("booking_status", ["confirmed", "processing", "completed"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const trackingToken = booking?.booking_code
    ? encodeBookingToken(booking.booking_code)
    : null;

  const trackingUrl = trackingToken
    ? `${window.location.origin}/pantau/${trackingToken}`
    : null;

  const handleToggleShare = () => {
    const next = !shareEnabled;
    setShareEnabled(next);
    localStorage.setItem("family-tracking-enabled", String(next));
    toast.success(next ? "Link pantau keluarga diaktifkan!" : "Link pantau keluarga dinonaktifkan.");
  };

  const handleCopy = async () => {
    if (!trackingUrl) return;
    try {
      await navigator.clipboard.writeText(trackingUrl);
      setCopied(true);
      toast.success("Link berhasil disalin!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin link. Coba salin manual.");
    }
  };

  const handleShare = async () => {
    if (!trackingUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Pantau Perjalanan Ibadah Saya",
          text: `Pantau perjalanan ibadah ${customer?.full_name || "saya"} melalui link berikut:`,
          url: trackingUrl,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const departure = (booking as any)?.departure;
  const packageName = departure?.package?.name;

  return (
    <div className="min-h-screen bg-background pb-28 md:ml-60">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link to="/jamaah">
            <Button variant="ghost" size="icon" className="text-primary-foreground h-8 w-8">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-semibold text-base">Pantau Keluarga</h1>
            <p className="text-xs opacity-75">Bagikan status perjalanan ke keluarga di rumah</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">

        {/* Info card */}
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-4 flex gap-3 items-start">
            <Users className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-semibold">Untuk Keluarga di Rumah</p>
              <p className="text-xs mt-1">
                Bagikan link khusus kepada keluarga agar mereka dapat memantau status perjalanan ibadah Anda
                — tanpa perlu login atau memiliki akun.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* No booking state */}
        {!isLoading && !booking && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <Plane className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-semibold">Belum Ada Booking Aktif</p>
              <p className="text-sm text-muted-foreground mt-1">
                Fitur ini tersedia setelah booking Anda dikonfirmasi.
              </p>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        )}

        {/* Booking info */}
        {booking && (
          <>
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Plane className="h-4 w-4 text-primary" />
                  Informasi Keberangkatan
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Paket</span>
                  <span className="font-medium">{packageName || "—"}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Kode Booking</span>
                  <span className="font-mono font-medium text-primary">{booking.booking_code}</span>
                </div>
                <Separator />
                {departure?.departure_date && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Keberangkatan</span>
                    <span className="font-medium">
                      {format(new Date(departure.departure_date), "d MMMM yyyy", { locale: localeId })}
                    </span>
                  </div>
                )}
                {departure?.return_date && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Kepulangan</span>
                      <span className="font-medium">
                        {format(new Date(departure.return_date), "d MMMM yyyy", { locale: localeId })}
                      </span>
                    </div>
                  </>
                )}
                <Separator />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className="text-xs">
                    {booking.booking_status === "confirmed" ? "Dikonfirmasi" :
                     booking.booking_status === "processing" ? "Dalam Proses" : "Selesai"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Toggle sharing */}
            <Card className={shareEnabled ? "border-emerald-200 bg-emerald-50/40" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${shareEnabled ? "bg-emerald-100" : "bg-muted"}`}>
                      {shareEnabled ? <Eye className="h-5 w-5 text-emerald-600" /> : <EyeOff className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Link Pantau Keluarga</p>
                      <p className="text-xs text-muted-foreground">
                        {shareEnabled ? "Aktif — keluarga bisa melihat status Anda" : "Nonaktif — link tidak dapat diakses"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={shareEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={handleToggleShare}
                    className="text-xs"
                  >
                    {shareEnabled ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
                </div>

                {shareEnabled && trackingUrl && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2.5 bg-background rounded-lg border text-xs font-mono break-all text-muted-foreground">
                      {trackingUrl}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={handleCopy}
                      >
                        {copied ? <CheckCheck className="h-3.5 w-3.5 mr-1.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                        {copied ? "Tersalin!" : "Salin Link"}
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={handleShare}
                      >
                        <Share2 className="h-3.5 w-3.5 mr-1.5" />
                        Bagikan
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Live GPS Location Sharing */}
            {customer?.id && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Navigation className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">Live Location GPS</p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Aktifkan untuk membagikan posisi GPS Anda secara real-time ke keluarga melalui link pantau di atas.
                  Lokasi diperbarui setiap 30 detik dan terlihat di peta halaman keluarga.
                </p>
                <LiveLocationShare
                  customerId={customer.id}
                  customerName={customer.full_name || "Jamaah"}
                />
              </div>
            )}

            {/* What family sees */}
            {shareEnabled && (
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Informasi yang Dilihat Keluarga
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Data finansial dan pribadi sensitif tetap terlindungi
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {[
                      { label: "Nama jamaah", visible: true },
                      { label: "Nama paket perjalanan", visible: true },
                      { label: "Tanggal keberangkatan & kepulangan", visible: true },
                      { label: "Status booking (konfirmasi, dll)", visible: true },
                      { label: "Kontak darurat / muthawif", visible: true },
                      { label: "Detail pembayaran & nominal", visible: false },
                      { label: "Dokumen pribadi (paspor, KTP, dll)", visible: false },
                      { label: "Informasi visa", visible: false },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2 text-xs">
                        {item.visible
                          ? <CheckCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          : <EyeOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                        <span className={item.visible ? "text-foreground" : "text-muted-foreground line-through"}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Privacy note */}
        <Card className="border-amber-100 bg-amber-50">
          <CardContent className="p-4 flex gap-3 items-start">
            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Link pantau bersifat privat — hanya orang yang memiliki link dapat mengaksesnya.
              Nonaktifkan kapan saja untuk mencabut akses keluarga.
            </p>
          </CardContent>
        </Card>
      </div>

      <JamaahBottomNav />
    </div>
  );
}
