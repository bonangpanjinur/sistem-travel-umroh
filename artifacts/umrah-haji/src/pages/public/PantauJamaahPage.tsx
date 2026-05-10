import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plane, Calendar, User, Package, CheckCircle2,
  Clock, XCircle, Shield, Phone, MapPin, Heart,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
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
          id, booking_code, booking_status, created_at,
          customer:customers(full_name, branch_id),
          departure:departures(
            departure_date, return_date, airport,
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
