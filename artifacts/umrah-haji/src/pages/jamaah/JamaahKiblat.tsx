import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { MapPin, RotateCcw, Smartphone, Info } from "lucide-react";
import { JamaahAppShell } from "@/components/jamaah/shell/JamaahAppShell";
import { JamaahPageHeader } from "@/components/jamaah/shell/JamaahPageHeader";

// Koordinat Ka'bah
const KABAH_LAT = 21.4225;
const KABAH_LNG = 39.8262;

function toRad(deg: number) { return deg * (Math.PI / 180); }
function toDeg(rad: number) { return rad * (180 / Math.PI); }

function calculateQiblaDirection(userLat: number, userLng: number): number {
  const lat1 = toRad(userLat);
  const lat2 = toRad(KABAH_LAT);
  const dLng = toRad(KABAH_LNG - userLng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  let bearing = toDeg(Math.atan2(y, x));
  bearing = (bearing + 360) % 360;
  return bearing;
}

function getLocationName(lat: number, lng: number): string {
  if (lat > 20 && lat < 25 && lng > 39 && lng < 41) return "Makkah";
  if (lat > 23 && lat < 26 && lng > 38 && lng < 41) return "Madinah";
  if (lat > -7 && lat < 7 && lng > 95 && lng < 142) return "Indonesia";
  return "Lokasi Anda";
}

export default function JamaahKiblat() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [qiblaAngle, setQiblaAngle] = useState(0);
  const [deviceAngle, setDeviceAngle] = useState(0);
  const [loading, setLoading] = useState(true);
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied" | "unsupported">("prompt");
  const compassRef = useRef<HTMLDivElement>(null);

  // Ambil lokasi
  const fetchLocation = useCallback(() => {
    setLoading(true);
    if (!navigator.geolocation) {
      toast.error("Browser Anda tidak mendukung Geolocation.");
      setPermissionState("unsupported");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ lat: latitude, lng: longitude });
        setQiblaAngle(calculateQiblaDirection(latitude, longitude));
        setPermissionState("granted");
        setLoading(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        toast.error("Gagal mengakses lokasi. Pastikan izin lokasi diaktifkan.");
        setPermissionState("denied");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  // Device orientation
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      let angle = 0;
      const wk = (e as any).webkitCompassHeading;
      if (wk !== undefined) {
        angle = wk as number;
      } else if (e.alpha !== null) {
        angle = 360 - e.alpha;
      }
      setDeviceAngle(angle);
    };

    const requestPermission = async () => {
      if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
        try {
          const response = await (DeviceOrientationEvent as any).requestPermission();
          if (response === "granted") {
            window.addEventListener("deviceorientation", handleOrientation, true);
          }
        } catch {
          toast.error("Izin sensor orientasi ditolak.");
        }
      } else {
        window.addEventListener("deviceorientation", handleOrientation, true);
      }
    };

    requestPermission();

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, []);

  const rotation = (qiblaAngle - deviceAngle + 360) % 360;
  const isAligned = Math.abs(rotation) < 5 || Math.abs(rotation - 360) < 5;

  return (
    <JamaahAppShell>
      <JamaahPageHeader
        title="Arah Kiblat"
        arabic="ٱلْقِبْلَة"
        subtitle="Kompas digital untuk ibadah"
        right={
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10"
            onClick={fetchLocation} aria-label="Muat ulang">
            <RotateCcw className="h-4 w-4" />
          </Button>
        }
      />
      <div className="p-4 space-y-4">
        {/* Info Card */}
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 text-sm text-amber-800 flex gap-3">
            <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-1">Petunjuk Penggunaan</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                Arahkan bagian atas ponsel ke arah Ka'bah. Kompas akan berputar mengikuti arah perangkat Anda.
                Jika panah hijau mengarah ke atas, berarti Anda sudah menghadap kiblat dengan benar.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        {loading ? (
          <Skeleton className="h-12 w-full" />
        ) : location ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            <span>
              {getLocationName(location.lat, location.lng)} — {location.lat.toFixed(4)}°, {location.lng.toFixed(4)}°
            </span>
          </div>
        ) : permissionState === "denied" ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 text-sm text-red-700">
              <p className="font-medium">Izin lokasi ditolak</p>
              <p className="text-xs mt-1">
                Mohon aktifkan izin lokasi di pengaturan browser untuk menggunakan fitur ini.
              </p>
              <Button size="sm" variant="outline" className="mt-2" onClick={fetchLocation}>
                Coba Lagi
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {/* Compass */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Kompas Kiblat
              </span>
              {isAligned && (
                <Badge className="bg-emerald-500 text-white">Sejalan!</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex flex-col items-center">
            <div
              ref={compassRef}
              className="relative w-64 h-64 rounded-full border-4 border-muted bg-gradient-to-br from-slate-50 to-slate-100 shadow-inner flex items-center justify-center"
            >
              {/* Rotating needle */}
              <div
                className="absolute w-full h-full transition-transform duration-300 ease-out"
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                {/* Panah kiblat */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
                  <div className={`w-0 h-0 border-l-[12px] border-r-[12px] border-b-[24px] border-l-transparent border-r-transparent ${isAligned ? "border-b-emerald-500" : "border-b-primary"}`} />
                  <span className="text-[10px] font-bold text-primary mt-1">KIBLAT</span>
                </div>
              </div>

              {/* Static directions */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 text-xs font-bold text-muted-foreground">N</div>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs font-bold text-muted-foreground">S</div>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">W</div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">E</div>

              {/* Center dot */}
              <div className="w-4 h-4 rounded-full bg-primary shadow-lg" />
            </div>

            {/* Angle display */}
            <div className="mt-4 text-center">
              <p className="text-3xl font-mono font-bold text-primary">
                {qiblaAngle.toFixed(1)}°
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Arah kiblat dari lokasi Anda
              </p>
            </div>

            {/* Alignment helper */}
            {isAligned ? (
              <div className="mt-3 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Anda menghadap kiblat dengan benar
              </div>
            ) : (
              <div className="mt-3 px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm">
                Putar perangkat hingga panah hijau mengarah ke atas
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual input fallback */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Panduan Manual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-lg font-bold text-primary">{qiblaAngle.toFixed(0)}°</p>
                <p className="text-xs text-muted-foreground">Sudut dari Utara</p>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-lg font-bold text-primary">
                  {getCardinalDirection(qiblaAngle)}
                </p>
                <p className="text-xs text-muted-foreground">Arah Mata Angin</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Jika kompas digital tidak berfungsi, gunakan kompas fisik dan arahkan ke sudut{" "}
              <strong>{qiblaAngle.toFixed(0)}°</strong> dari arah Utara.
            </p>
          </CardContent>
        </Card>
      </div>
    </JamaahAppShell>
  );
}

function getCardinalDirection(angle: number): string {
  const directions = ["Utara", "Timur Laut", "Timur", "Tenggara", "Selatan", "Barat Daya", "Barat", "Barat Laut"];
  const index = Math.round(angle / 45) % 8;
  return directions[index];
}
