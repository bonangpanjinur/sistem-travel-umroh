import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Plane, MapPin, CalendarDays, Users,
  Hotel, Star, Trophy, Clock, FileText, ChevronRight,
  Sunrise, Heart
} from "lucide-react";
import { Link } from "react-router-dom";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { format, differenceInDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AlumniBooking {
  id: string;
  booking_code: string;
  booking_status: string;
  created_at: string;
  departure: {
    departure_date: string;
    return_date: string;
    package: { name: string; type: string; duration_days: number } | null;
    hotel_makkah?: { name: string; star_rating: number | null } | null;
    hotel_madinah?: { name: string; star_rating: number | null } | null;
    airline?: { name: string } | null;
    muthawif?: { name: string } | null;
  } | null;
}

const packageTypeLabel: Record<string, { label: string; color: string; bg: string }> = {
  umroh: { label: "Umroh", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  haji: { label: "Haji", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  haji_plus: { label: "Haji Plus", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  haji_furoda: { label: "Haji Furoda", color: "text-red-700", bg: "bg-red-50 border-red-200" },
};

function StarRating({ stars }: { stars: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: Math.min(stars, 5) }).map((_, i) => (
        <Star key={i} className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
      ))}
    </span>
  );
}

export default function JamaahRiwayatPerjalanan() {
  const { user } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: customer } = useQuery({
    queryKey: ["jamaah-customer", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from("customers").select("*").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["alumni-trips", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_code,
          booking_status,
          created_at,
          departure:departures(
            departure_date,
            return_date,
            package:packages(name, type, duration_days),
            hotel_makkah:hotels!departures_hotel_makkah_id_fkey(name, star_rating),
            hotel_madinah:hotels!departures_hotel_madinah_id_fkey(name, star_rating),
            airline:airlines(name),
            muthawif:muthawifs(name)
          )
        `)
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data as any[]).map(item => ({
        ...item,
        departure: item.departure ? {
          ...item.departure,
          package: item.departure.package && !(item.departure.package as any).error ? item.departure.package : null
        } : null
      })) as AlumniBooking[];
    },
    enabled: !!customer?.id,
  });

  const completedTrips = trips.filter(t => t.booking_status === "completed");
  const activeTrips = trips.filter(t => t.booking_status === "confirmed");
  const otherTrips = trips.filter(t => !["completed", "confirmed"].includes(t.booking_status));

  const totalDays = completedTrips.reduce((sum, t) => {
    const dep = t.departure?.departure_date;
    const ret = t.departure?.return_date;
    if (dep && ret) return sum + differenceInDays(new Date(ret), new Date(dep));
    return sum + (t.departure?.package?.duration_days ?? 0);
  }, 0);

  const TripCard = ({ trip, showStatus = true }: { trip: AlumniBooking; showStatus?: boolean }) => {
    const isExpanded = expandedId === trip.id;
    const dep = trip.departure;
    const pkgType = dep?.package?.type ?? "umroh";
    const typeConfig = packageTypeLabel[pkgType] ?? packageTypeLabel.umroh;
    const isCompleted = trip.booking_status === "completed";

    return (
      <Card className={cn(
        "overflow-hidden transition-all",
        isCompleted ? "border-green-200" : "border-blue-200"
      )}>
        <button
          className="w-full text-left"
          onClick={() => setExpandedId(isExpanded ? null : trip.id)}
        >
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                isCompleted ? "bg-green-100" : "bg-blue-100"
              )}>
                {isCompleted ? (
                  <Trophy className={cn("h-6 w-6", isCompleted ? "text-green-600" : "text-blue-600")} />
                ) : (
                  <Plane className="h-6 w-6 text-blue-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{dep?.package?.name ?? "Paket Perjalanan"}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className={cn("text-xs py-0 border", typeConfig.bg, typeConfig.color)}>
                        {typeConfig.label}
                      </Badge>
                      {dep?.package?.duration_days && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Clock className="h-3 w-3" /> {dep.package.duration_days} hari
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {showStatus && (
                      <Badge variant={isCompleted ? "default" : "secondary"} className={cn(
                        "text-[10px] py-0",
                        isCompleted ? "bg-green-600" : "bg-blue-600"
                      )}>
                        {isCompleted ? "Selesai" : "Aktif"}
                      </Badge>
                    )}
                    <ChevronRight className={cn("h-4 w-4 text-gray-400 transition-transform", isExpanded && "rotate-90")} />
                  </div>
                </div>
                {dep?.departure_date && (
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {format(new Date(dep.departure_date), "d MMMM yyyy", { locale: localeId })}
                    {dep.return_date && ` — ${format(new Date(dep.return_date), "d MMMM yyyy", { locale: localeId })}`}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </button>

        {/* Expanded Detail */}
        {isExpanded && (
          <div className="border-t bg-gray-50 px-4 py-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Detail Perjalanan</p>

            {dep?.hotel_makkah?.name && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Hotel className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="flex-1">Hotel Makkah: <span className="font-medium">{dep.hotel_makkah.name}</span></span>
                <StarRating stars={dep.hotel_makkah.star_rating ?? 0} />
              </div>
            )}
            {dep?.hotel_madinah?.name && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Hotel className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="flex-1">Hotel Madinah: <span className="font-medium">{dep.hotel_madinah.name}</span></span>
                <StarRating stars={dep.hotel_madinah.star_rating ?? 0} />
              </div>
            )}
            {dep?.airline?.name && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Plane className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>Maskapai: <span className="font-medium">{dep.airline.name}</span></span>
              </div>
            )}
            {dep?.muthawif?.name && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>Muthawif: <span className="font-medium">{dep.muthawif.name}</span></span>
              </div>
            )}

            <div className="flex gap-2 mt-3 pt-2 border-t">
              <Link to={`/jamaah/invoice/${trip.id}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
                  <FileText className="h-3.5 w-3.5" /> Invoice
                </Button>
              </Link>
              {isCompleted && (
                <Link to={`/jamaah/feedback/${trip.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs text-yellow-600 border-yellow-200 hover:bg-yellow-50">
                    <Star className="h-3.5 w-3.5" /> Beri Ulasan
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </Card>
    );
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
              <Sunrise className="h-4 w-4 text-primary" />
              <span className="font-semibold text-gray-900">Riwayat Perjalanan</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Kenangan ibadah bersama Vinstour</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto space-y-5">
        {/* Alumni Stats */}
        {completedTrips.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="pt-3 pb-3 text-center">
                <Trophy className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-green-700">{completedTrips.length}×</p>
                <p className="text-[10px] text-green-600">Perjalanan</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-50 to-sky-50 border-blue-200">
              <CardContent className="pt-3 pb-3 text-center">
                <CalendarDays className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-blue-700">{totalDays}</p>
                <p className="text-[10px] text-blue-600">Total Hari</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200">
              <CardContent className="pt-3 pb-3 text-center">
                <Heart className="h-5 w-5 text-rose-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-rose-600">Alumni</p>
                <p className="text-[10px] text-rose-500">Vinstour</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i}><CardContent className="pt-4 pb-3"><div className="flex gap-3"><Skeleton className="h-12 w-12 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-24" /></div></div></CardContent></Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && trips.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Plane className="h-8 w-8 text-gray-400" />
            </div>
            <p className="font-semibold text-gray-700">Belum Ada Riwayat</p>
            <p className="text-sm text-muted-foreground mt-1">Perjalanan ibadahmu akan muncul di sini</p>
            <Link to="/jamaah">
              <Button variant="outline" className="mt-4">Kembali ke Beranda</Button>
            </Link>
          </div>
        )}

        {/* Active trips */}
        {activeTrips.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Plane className="h-4 w-4 text-blue-500" /> Perjalanan Aktif
            </p>
            <div className="space-y-3">
              {activeTrips.map(t => <TripCard key={t.id} trip={t} />)}
            </div>
          </div>
        )}

        {/* Completed trips */}
        {completedTrips.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-green-600" /> Perjalanan Selesai ({completedTrips.length})
            </p>
            <div className="space-y-3">
              {completedTrips.map(t => <TripCard key={t.id} trip={t} />)}
            </div>
          </div>
        )}

        {/* Other trips */}
        {otherTrips.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Riwayat Lainnya</p>
            <div className="space-y-3">
              {otherTrips.map(t => <TripCard key={t.id} trip={t} />)}
            </div>
          </div>
        )}
      </div>

      <JamaahBottomNav />
    </div>
  );
}
