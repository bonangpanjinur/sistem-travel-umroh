import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  MapPin, Navigation, Share2, StopCircle, RefreshCw,
  ChevronLeft, Clock, AlertTriangle, ExternalLink, Loader2
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

export default function TourLeaderMap() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [isSharing, setIsSharing] = useState(false);
  const [label, setLabel] = useState("");
  const [myLocationId, setMyLocationId] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [shareHours, setShareHours] = useState(4);
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);

  const { data: departure } = useQuery({
    queryKey: ["tl-departure", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select("id, departure_date, package:packages(name)")
        .eq("tour_leader_user_id", user!.id)
        .in("status", ["active", "departed", "open"])
        .order("departure_date", { ascending: false })
        .limit(1).single();
      return data;
    },
  });

  const depId = departure?.id;

  const { data: locData, refetch: refetchLoc } = useQuery({
    queryKey: ["tl-locations", depId],
    enabled: !!depId,
    refetchInterval: 30000,
    queryFn: async () => {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(`/api/v1/guide/locations/${depId}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      return res.json();
    },
  });

  const locations: GLocation[] = locData?.locations || [];
  const myActive = locations.find(l => l.user_id === user?.id && l.is_active);

  useEffect(() => {
    if (myActive) {
      setIsSharing(true);
      setMyLocationId(myActive.id);
    } else {
      setIsSharing(false);
    }
  }, [myActive]);

  const shareMutation = useMutation({
    mutationFn: async ({ lat, lng }: { lat: number; lng: number }) => {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch("/api/v1/guide/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          departure_id: depId,
          role: "tour_leader",
          label: label || "Posisi Tour Leader",
          latitude: lat,
          longitude: lng,
          share_hours: shareHours,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Gagal share lokasi");
      return res.json();
    },
    onSuccess: (d) => {
      setMyLocationId(d.location?.id);
      setIsSharing(true);
      qc.invalidateQueries({ queryKey: ["tl-locations", depId] });
      toast.success(`Lokasi Anda sedang dibagikan ke jamaah (${shareHours} jam)`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      if (!myLocationId) return;
      const session = (await supabase.auth.getSession()).data.session;
      await fetch(`/api/v1/guide/locations/${myLocationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
    },
    onSuccess: () => {
      setIsSharing(false);
      setMyLocationId(null);
      if (watchId !== null) { navigator.geolocation.clearWatch(watchId); setWatchId(null); }
      qc.invalidateQueries({ queryKey: ["tl-locations", depId] });
      toast.success("Berbagi lokasi dihentikan");
    },
  });

  const startShare = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Browser tidak mendukung GPS");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentPos({ lat: latitude, lng: longitude });
        shareMutation.mutate({ lat: latitude, lng: longitude });
        setGpsLoading(false);

        const id = navigator.geolocation.watchPosition(
          (p) => setCurrentPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
          undefined,
          { enableHighAccuracy: true, maximumAge: 30000 }
        );
        setWatchId(id);
      },
      (err) => {
        setGpsLoading(false);
        toast.error("Tidak bisa akses GPS: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [label, shareHours, depId]);

  const refreshShare = useCallback(() => {
    if (!currentPos || !depId) return;
    shareMutation.mutate({ lat: currentPos.lat, lng: currentPos.lng });
  }, [currentPos, depId]);

  const openGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  };

  const otherLocations = locations.filter(l => l.user_id !== user?.id);

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/tour-leader" className="text-slate-500 hover:text-slate-700">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-semibold text-slate-800">Peta Lokasi</h1>
            <p className="text-xs text-slate-500">{departure?.package?.name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Share Status Card */}
        <Card className={isSharing ? "border-emerald-300 bg-emerald-50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Navigation className={`w-5 h-5 ${isSharing ? "text-emerald-600 animate-pulse" : "text-slate-400"}`} />
              {isSharing ? "Lokasi Sedang Dibagikan" : "Bagikan Lokasi Anda"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isSharing ? (
              <>
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  Jamaah dapat melihat posisi Anda secara real-time
                </div>
                {myActive?.shared_until && (
                  <p className="text-xs text-slate-500">
                    Berakhir: {new Date(myActive.shared_until).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                  </p>
                )}
                {currentPos && (
                  <p className="text-xs text-slate-500 font-mono">
                    {currentPos.lat.toFixed(6)}, {currentPos.lng.toFixed(6)}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshShare}
                    disabled={shareMutation.isPending}
                    className="flex-1 border-emerald-300 text-emerald-700"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />Perbarui Posisi
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => stopMutation.mutate()}
                    disabled={stopMutation.isPending}
                    className="border-red-300 text-red-600"
                  >
                    <StopCircle className="w-4 h-4 mr-1" />Stop
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Label Lokasi</label>
                  <Input
                    value={label}
                    onChange={e => setLabel(e.target.value)}
                    placeholder='Misal: "Saya di pintu King Fahd"'
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Durasi Berbagi</label>
                  <div className="flex gap-2">
                    {[1, 2, 4, 8].map(h => (
                      <button
                        key={h}
                        onClick={() => setShareHours(h)}
                        className={`px-3 py-1 rounded-full text-xs border transition-all ${shareHours === h ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200"}`}
                      >
                        {h} Jam
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={startShare}
                  disabled={gpsLoading || shareMutation.isPending || !depId}
                >
                  {gpsLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Mengakses GPS...</> : <><Share2 className="w-4 h-4 mr-2" />Mulai Bagikan Lokasi</>}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Guide/Staff locations */}
        {otherLocations.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-600">Lokasi Guide Lain</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {otherLocations.map(loc => (
                <div key={loc.id} className="flex items-start justify-between gap-2 p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{loc.guide_name || loc.role}</p>
                    {loc.label && <p className="text-xs text-slate-500">{loc.label}</p>}
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(loc.updated_at), { addSuffix: true, locale: idLocale })}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => openGoogleMaps(loc.latitude, loc.longitude)}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />Maps
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Tips */}
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 space-y-1">
                <p className="font-semibold">Tips:</p>
                <ul className="list-disc pl-3 space-y-0.5">
                  <li>Lokasi diperbarui setiap kali Anda tekan "Perbarui Posisi"</li>
                  <li>Jamaah melihat posisi Anda di halaman /jamaah/lokasi-guide</li>
                  <li>GPS harus aktif dan izin lokasi diberikan di browser</li>
                  <li>Lokasi otomatis berhenti setelah durasi berakhir</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
