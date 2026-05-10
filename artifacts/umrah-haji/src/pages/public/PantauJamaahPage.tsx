import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Plane, Calendar, User, Package, CheckCircle2,
  Clock, XCircle, Shield, Phone, MapPin, Heart,
  AlertCircle, Navigation, ExternalLink, Signal, RefreshCw
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

function decodeBookingToken(token: string): string {
  try {
    const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - b64.length % 4) % 4);
    return atob(padded);
  } catch {
    return "";
  }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2; description: string }> = {
  pending:    { label: "Menunggu Konfirmasi", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock,        description: "Booking sedang menunggu konfirmasi dari tim Vinstour Travel." },
  confirmed:  { label: "Terkonfirmasi",       color: "bg-blue-100 text-blue-800 border-blue-200",       icon: CheckCircle2, description: "Booking telah dikonfirmasi. Persiapan perjalanan sedang berlangsung." },
  processing: { label: "Dalam Proses",        color: "bg-purple-100 text-purple-800 border-purple-200", icon: Clock,        description: "Dokumen dan persiapan perjalanan sedang diproses oleh tim." },
  completed:  { label: "Perjalanan Selesai",  color: "bg-green-100 text-green-800 border-green-200",    icon: CheckCircle2, description: "Perjalanan ibadah telah selesai. Semoga menjadi ibadah yang mabrur." },
  cancelled:  { label: "Dibatalkan",          color: "bg-red-100 text-red-800 border-red-200",          icon: XCircle,      description: "Booking telah dibatalkan." },
};

export default function PantauJamaahPage() {
  const { token } = useParams<{ token: string }>();

  const bookingCode = token ? decodeBookingToken(token) : "";

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ["pantau-jamaah", bookingCode],
    enabled: !!bookingCode,
    queryFn: async () => {
      if (!bookingCode) return null;

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, booking_code, booking_status, created_at, customer_id,
          customer:customers(id, full_name, branch_id),
          departure:departures(
            id, departure_date, return_date, airport,
            package:packages(name, code, duration_days),
            muthawif:muthawifs(name, phone)
          )
        `)
        .eq("booking_code", bookingCode)
        .not("booking_status", "eq", "cancelled")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Check if sharing is enabled (we check via a simple convention)
  const sharingEnabled = localStorage.getItem("family-tracking-enabled") !== "false";

  const statusInfo = booking ? STATUS_CONFIG[booking.booking_status ?? "confirmed"] || STATUS_CONFIG.confirmed : null;
  const customer = (booking as any)?.customer;
  const departure = (booking as any)?.departure;
  const muthawif = departure?.muthawif;
  const customerId: string | null = customer?.id ?? (booking as any)?.customer_id ?? null;

  // Live location — poll every 30 seconds
  const { data: liveLocation, dataUpdatedAt, refetch: refetchLocation, isFetching: fetchingLocation } = useQuery({
    queryKey: ["pantau-live-location", customerId],
    enabled: !!customerId,
    refetchInterval: 30_000,
    queryFn: async () => {
      if (!customerId) return null;
      const { data, error } = await (supabase as any)
        .from("jamaah_live_locations")
        .select("latitude, longitude, accuracy, speed, heading, updated_at")
        .eq("customer_id", customerId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data as { latitude: number; longitude: number; accuracy: number; speed: number | null; heading: number | null; updated_at: string } | null;
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-5">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <span className="text-white text-xs font-bold">V</span>
            </div>
            <span className="text-sm font-semibold opacity-90">Vinstour Travel</span>
          </div>
          <h1 className="text-lg font-bold mt-2">Status Perjalanan Ibadah</h1>
          <p className="text-xs opacity-75 mt-0.5">Halaman pantau untuk keluarga — dibagikan oleh jamaah</p>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4">

        {/* Loading */}
        {isLoading && (
          <Card>
            <CardContent className="p-5 space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        )}

        {/* Not found */}
        {!isLoading && !booking && (
          <Card className="border-dashed mt-8">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-semibold">Halaman Tidak Ditemukan</p>
              <p className="text-sm text-muted-foreground mt-1">
                Link ini tidak valid atau akses telah dinonaktifkan oleh jamaah.
              </p>
              <Link to="/" className="text-sm text-primary underline mt-3 inline-block">
                Kembali ke Beranda
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Main content */}
        {booking && (
          <>
            {/* Jamaah info */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-base">{customer?.full_name || "Jamaah"}</p>
                    <p className="text-xs text-muted-foreground">Kode Booking: {booking.booking_code}</p>
                  </div>
                </div>

                {/* Status */}
                {statusInfo && (
                  <div className={`flex items-start gap-3 p-3 rounded-xl border ${statusInfo.color}`}>
                    <statusInfo.icon className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">{statusInfo.label}</p>
                      <p className="text-xs mt-0.5 opacity-80">{statusInfo.description}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Live Location Map */}
            {liveLocation && (
              <Card className="overflow-hidden border-emerald-200">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <Navigation className="h-4 w-4 text-emerald-600" />
                      Lokasi Real-time Jamaah
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => refetchLocation()}
                      disabled={fetchingLocation}
                      className="h-7 px-2 text-xs text-muted-foreground"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 mr-1 ${fetchingLocation ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  {/* OpenStreetMap iframe embed */}
                  <div className="rounded-xl overflow-hidden border border-border h-52 bg-muted">
                    <iframe
                      title="Lokasi Jamaah"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${liveLocation.longitude - 0.004},${liveLocation.latitude - 0.004},${liveLocation.longitude + 0.004},${liveLocation.latitude + 0.004}&layer=mapnik&marker=${liveLocation.latitude},${liveLocation.longitude}`}
                      style={{ border: 0 }}
                    />
                  </div>

                  {/* Location details */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-muted p-2.5">
                      <p className="text-muted-foreground mb-0.5">Koordinat</p>
                      <p className="font-mono font-medium">
                        {liveLocation.latitude.toFixed(5)}, {liveLocation.longitude.toFixed(5)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted p-2.5">
                      <p className="text-muted-foreground mb-0.5">Akurasi GPS</p>
                      <p className="font-medium">±{Math.round(liveLocation.accuracy ?? 0)} meter</p>
                    </div>
                    {liveLocation.speed != null && liveLocation.speed > 0 && (
                      <div className="rounded-lg bg-muted p-2.5">
                        <p className="text-muted-foreground mb-0.5">Kecepatan</p>
                        <p className="font-medium">{(liveLocation.speed * 3.6).toFixed(1)} km/h</p>
                      </div>
                    )}
                    <div className="rounded-lg bg-muted p-2.5">
                      <p className="text-muted-foreground mb-0.5">Diperbarui</p>
                      <p className="font-medium">
                        {formatDistanceToNow(new Date(liveLocation.updated_at), { addSuffix: true, locale: localeId })}
                      </p>
                    </div>
                  </div>

                  {/* Open in Maps button */}
                  <a
                    href={`https://maps.google.com/maps?q=${liveLocation.latitude},${liveLocation.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Buka di Google Maps
                    </Button>
                  </a>
                </CardContent>
              </Card>
            )}

            {/* No live location yet — show info hint */}
            {!liveLocation && customerId && (
              <Card className="border-dashed border-muted-foreground/30">
                <CardContent className="p-4 flex gap-3 items-center">
                  <Signal className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Lokasi GPS belum dibagikan</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Jamaah belum mengaktifkan live location. Halaman ini akan otomatis memperbarui setiap 30 detik.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Departure info */}
            {departure && (
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    Informasi Perjalanan
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2.5">
                  {departure.package?.name && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Paket</span>
                      <span className="font-medium text-right max-w-[60%]">{departure.package.name}</span>
                    </div>
                  )}
                  {departure.departure_date && (
                    <>
                      <Separator />
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Plane className="h-3.5 w-3.5" /> Berangkat
                        </span>
                        <span className="font-medium">
                          {format(new Date(departure.departure_date), "EEEE, d MMM yyyy", { locale: localeId })}
                        </span>
                      </div>
                    </>
                  )}
                  {departure.return_date && (
                    <>
                      <Separator />
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> Pulang
                        </span>
                        <span className="font-medium">
                          {format(new Date(departure.return_date), "EEEE, d MMM yyyy", { locale: localeId })}
                        </span>
                      </div>
                    </>
                  )}
                  {departure.package?.duration_days && (
                    <>
                      <Separator />
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Durasi</span>
                        <span className="font-medium">{departure.package.duration_days} hari</span>
                      </div>
                    </>
                  )}
                  {departure.airport && (
                    <>
                      <Separator />
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> Bandara
                        </span>
                        <span className="font-medium">{departure.airport}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Muthawif / Pembimbing */}
            {muthawif?.name && (
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Pembimbing (Muthawif)
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{muthawif.name}</p>
                        <p className="text-xs text-muted-foreground">Muthawif / Pembimbing Ibadah</p>
                      </div>
                    </div>
                    {muthawif.phone && (
                      <a
                        href={`tel:${muthawif.phone}`}
                        className="flex items-center gap-1.5 text-sm text-primary font-medium"
                      >
                        <Phone className="h-4 w-4" />
                        Hubungi
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Doa */}
            <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100">
              <CardContent className="p-4 text-center">
                <Heart className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-emerald-800">Doa untuk Jamaah</p>
                <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                  "Semoga Allah SWT menerima ibadah, mengampuni dosa, dan mengembalikan dalam keadaan selamat dengan predikat haji mabrur. Aamiin."
                </p>
              </CardContent>
            </Card>

            {/* Footer */}
            <div className="text-center py-3">
              <p className="text-xs text-muted-foreground">
                Halaman ini dibagikan oleh jamaah Anda melalui
              </p>
              <Link to="/" className="text-xs text-primary font-medium hover:underline">
                Vinstour Travel Portal
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
