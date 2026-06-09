import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  MapPin, Navigation, ChevronLeft, ExternalLink,
  Clock, AlertCircle, RefreshCw, Loader2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const supabase: any = supabaseRaw;

interface GLocation {
  id: string;
  user_id: string;
  guide_name?: string;
  role: string;
  label?: string;
  latitude: number;
  longitude: number;
  shared_until?: string;
  updated_at: string;
  is_active: boolean;
}

const ROLE_LABEL: Record<string, string> = {
  tour_leader: "Tour Leader",
  muthawif:    "Muthawif",
  guide:       "Guide",
};

export default function JamaahLokasiGuide() {
  const { user } = useAuth();

  const { data: booking } = useQuery({
    queryKey: ["jamaah-departure", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("departure_id, departure:departures(id, package:packages(name))")
        .eq("customer_id", user!.id)
        .in("status", ["confirmed", "active"])
        .order("created_at", { ascending: false })
        .limit(1).single();
      return data;
    },
  });

  const depId = booking?.departure_id;

  const { data, isLoading, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["jamaah-guide-locations", depId],
    enabled: !!depId,
    refetchInterval: 30000,
    queryFn: async () => {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(`/api/v1/guide/locations/${depId}`, {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      return res.json();
    },
  });

  const locations: GLocation[] = data?.locations || [];
  const activeLocations = locations.filter(l => l.is_active);

  const openGoogleMaps = (lat: number, lng: number, label?: string) => {
    const q = label ? encodeURIComponent(label) : `${lat},${lng}`;
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, "_blank");
  };

  const openNavigation = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/jamaah-info" className="text-slate-500 hover:text-slate-700">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-semibold text-slate-800">Lokasi Guide</h1>
              <p className="text-xs text-slate-500">{booking?.departure?.package?.name}</p>
            </div>
          </div>
          <Button
            size="sm" variant="ghost"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 w-8 p-0 text-slate-400"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Auto-refresh indicator */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Diperbarui otomatis setiap 30 detik</span>
          {dataUpdatedAt > 0 && (
            <span>
              Terakhir: {formatDistanceToNow(dataUpdatedAt, { addSuffix: true, locale: idLocale })}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : !depId ? (
          <Card className="text-center p-8">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Belum ada booking aktif.</p>
          </Card>
        ) : activeLocations.length === 0 ? (
          <Card className="text-center p-8">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-700 mb-1">Posisi Belum Dibagikan</p>
            <p className="text-slate-500 text-sm">Tour leader belum membagikan lokasi saat ini. Hubungi guide Anda jika perlu.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeLocations.map(loc => {
              const isRecent = new Date().getTime() - new Date(loc.updated_at).getTime() < 5 * 60000;
              return (
                <Card key={loc.id} className={`border-l-4 ${isRecent ? "border-l-emerald-500" : "border-l-amber-400"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2 h-2 rounded-full ${isRecent ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`} />
                          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            {ROLE_LABEL[loc.role] || loc.role}
                          </span>
                        </div>
                        {loc.guide_name && (
                          <p className="font-semibold text-slate-800">{loc.guide_name}</p>
                        )}
                        {loc.label && (
                          <p className="text-sm text-slate-600 mt-0.5">📍 {loc.label}</p>
                        )}
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          Diperbarui {formatDistanceToNow(new Date(loc.updated_at), { addSuffix: true, locale: idLocale })}
                        </p>
                        {loc.shared_until && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            Berbagi hingga: {new Date(loc.shared_until).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                          </p>
                        )}
                        <p className="text-xs text-slate-400 font-mono mt-1">
                          {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-9"
                        onClick={() => openNavigation(loc.latitude, loc.longitude)}
                      >
                        <Navigation className="w-4 h-4 mr-1.5" />Navigasi ke Guide
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9"
                        onClick={() => openGoogleMaps(loc.latitude, loc.longitude, loc.label)}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Tips */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-xs text-blue-800 space-y-1">
            <p className="font-semibold">💡 Cara Menggunakan:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Tekan "Navigasi ke Guide" untuk membuka Google Maps</li>
              <li>Lokasi diperbarui setiap kali guide menekan tombol refresh</li>
              <li>Jika posisi tidak muncul, hubungi tour leader Anda</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
