import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import JamaahPrivateGate from "@/components/auth/JamaahPrivateGate";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Plane, CreditCard, FileText, Calendar, Hotel,
  ChevronRight, Package, Clock, CheckCircle,
  AlertCircle, XCircle, ArrowLeft, Loader2
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { id } from "date-fns/locale";
import { Link, useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/format";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:   { label: "Menunggu",    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",   icon: Clock },
  confirmed: { label: "Terkonfirmasi", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300", icon: CheckCircle },
  completed: { label: "Selesai",     color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",      icon: CheckCircle },
  cancelled: { label: "Dibatalkan",  color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",          icon: XCircle },
  waitlist:  { label: "Waiting List",color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300", icon: Clock },
};

function BookingCard({ booking }: { booking: any }) {
  const navigate = useNavigate();
  const dep = booking.departure;
  const pkg = dep?.package;
  const paid = booking.paid_amount || 0;
  const total = booking.total_price || 1;
  const progress = Math.min(100, (paid / total) * 100);
  const daysLeft = dep?.departure_date
    ? differenceInDays(new Date(dep.departure_date), new Date())
    : null;
  const status = STATUS_CONFIG[booking.booking_status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;

  return (
    <Card className="overflow-hidden border border-border/60 shadow-sm hover:shadow-md transition-shadow">
      {/* Header strip */}
      <div className="bg-gradient-to-r from-primary to-primary/80 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-primary-foreground/70 uppercase tracking-widest font-semibold">Kode Booking</p>
          <p className="text-base font-bold text-primary-foreground font-mono tracking-wider">{booking.booking_code}</p>
        </div>
        <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${status.color}`}>
          <StatusIcon className="h-3 w-3" />
          {status.label}
        </span>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Package info */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-snug line-clamp-2">{pkg?.name || "—"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{pkg?.duration_days} Hari · {pkg?.package_type === "umroh" ? "Umroh" : pkg?.package_type === "haji" ? "Haji" : pkg?.package_type || "—"}</p>
          </div>
        </div>

        <Separator />

        {/* Departure info */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-muted-foreground">Keberangkatan</p>
              <p className="font-medium">
                {dep?.departure_date
                  ? format(new Date(dep.departure_date), "dd MMM yyyy", { locale: id })
                  : "—"}
              </p>
            </div>
          </div>
          {daysLeft !== null && daysLeft >= 0 && (
            <div className="flex items-center gap-2">
              <Plane className="h-3.5 w-3.5 text-primary shrink-0" />
              <div>
                <p className="text-muted-foreground">Berangkat</p>
                <p className="font-semibold text-primary">{daysLeft === 0 ? "Hari ini!" : `${daysLeft} hari lagi`}</p>
              </div>
            </div>
          )}
          {dep?.hotel_makkah && (
            <div className="flex items-center gap-2 col-span-2">
              <Hotel className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <p className="text-muted-foreground truncate">{dep.hotel_makkah.name} ⭐{dep.hotel_makkah.star_rating} · {dep?.hotel_madinah?.name}</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Payment progress */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Pembayaran</span>
            <span className={`font-semibold ${progress >= 100 ? "text-emerald-600" : "text-amber-600"}`}>
              {progress >= 100 ? "Lunas ✓" : `${progress.toFixed(0)}% dari ${formatCurrency(total)}`}
            </span>
          </div>
          <Progress value={progress} className="h-1.5" />
          {progress < 100 && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Sisa: <span className="font-medium text-destructive">{formatCurrency(booking.remaining_amount || 0)}</span>
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {progress < 100 && (
            <Button asChild size="sm" className="flex-1 h-8 text-xs">
              <Link to="/jamaah/payment">
                <CreditCard className="h-3.5 w-3.5 mr-1" /> Bayar
              </Link>
            </Button>
          )}
          {booking.id && (
            <Button asChild variant="outline" size="sm" className="flex-1 h-8 text-xs">
              <Link to={`/jamaah/invoice/${booking.id}`}>
                <FileText className="h-3.5 w-3.5 mr-1" /> Invoice
              </Link>
            </Button>
          )}
          <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
            <Link to="/jamaah/itinerary" title="Lihat Itinerary">
              <Calendar className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function JamaahBookingList() {
  const { user } = useAuth();

  const { data: customer } = useQuery({
    queryKey: ["jamaah-customer", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("customers")
        .select("id, full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["jamaah-bookings-list", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, booking_code, booking_status, payment_status,
          total_price, paid_amount, remaining_amount, created_at,
          departure:departures(
            id, departure_date,
            package:packages(id, name, duration_days, package_type),
            hotel_makkah:hotels!departures_hotel_makkah_id_fkey(id, name, star_rating),
            hotel_madinah:hotels!departures_hotel_madinah_id_fkey(id, name, star_rating),
            airline:airlines(name)
          )
        `)
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!customer?.id,
  });

  return (
    <JamaahPrivateGate>
      <div className="min-h-screen bg-gray-50 dark:bg-background pb-24 md:pb-6">
        <JamaahBottomNav />

        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/50">
          <div className="flex items-center gap-3 px-4 h-14 max-w-lg mx-auto">
            <Link to="/jamaah" className="p-1.5 rounded-lg hover:bg-muted transition-colors -ml-1">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="font-bold text-base">Booking Saya</h1>
              {bookings && <p className="text-[11px] text-muted-foreground">{bookings.length} booking</p>}
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-4 md:ml-64 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !bookings || bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Package className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2">Belum Ada Booking</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Anda belum memiliki booking perjalanan umroh atau haji. Mulai pilih paket sekarang!
              </p>
              <Button asChild className="w-full max-w-xs">
                <Link to="/jamaah/paket">
                  <Plane className="h-4 w-4 mr-2" /> Lihat Paket Tersedia
                </Link>
              </Button>
            </div>
          ) : (
            <>
              {/* Active bookings first */}
              {bookings.filter((b: any) => ["confirmed", "pending"].includes(b.booking_status)).length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 px-0.5">
                    Booking Aktif
                  </p>
                  <div className="space-y-3">
                    {bookings
                      .filter((b: any) => ["confirmed", "pending"].includes(b.booking_status))
                      .map((b: any) => <BookingCard key={b.id} booking={b} />)}
                  </div>
                </div>
              )}

              {/* Past bookings */}
              {bookings.filter((b: any) => !["confirmed", "pending"].includes(b.booking_status)).length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 px-0.5 mt-2">
                    Riwayat Booking
                  </p>
                  <div className="space-y-3">
                    {bookings
                      .filter((b: any) => !["confirmed", "pending"].includes(b.booking_status))
                      .map((b: any) => <BookingCard key={b.id} booking={b} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </JamaahPrivateGate>
  );
}
