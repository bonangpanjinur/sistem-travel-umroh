import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Compass, MapPin, RefreshCw, Navigation } from "lucide-react";
import { DynamicPublicLayout } from "@/components/layout/DynamicPublicLayout";

const KAABA = { lat: 21.4225, lng: 39.8262 };

function calcQiblaAngle(lat: number, lng: number): number {
  const dLng = (KAABA.lng - lng) * (Math.PI / 180);
  const φ1 = lat * (Math.PI / 180);
  const φ2 = KAABA.lat * (Math.PI / 180);
  const y = Math.sin(dLng) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dLng);
  const angle = Math.atan2(y, x) * (180 / Math.PI);
  return (angle + 360) % 360;
}

function calcDistance(lat: number, lng: number): number {
  const R = 6371;
  const dLat = (KAABA.lat - lat) * (Math.PI / 180);
  const dLng = (KAABA.lng - lng) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * Math.PI / 180) * Math.cos(KAABA.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ArahKiblat() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [qiblaAngle, setQiblaAngle] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [locationName, setLocationName] = useState("Lokasi Anda");
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<"idle" | "granted" | "denied">("idle");

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });
        setQiblaAngle(calcQiblaAngle(lat, lng));
        setDistance(calcDistance(lat, lng));
        setPermissionStatus("granted");
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
          .then(r => r.json())
          .then(d => setLocationName(d.address?.city || d.address?.town || "Lokasi Anda"))
          .catch(() => {});
      },
      () => {
        setError("Tidak dapat mengakses lokasi. Izinkan akses lokasi di browser.");
        setPermissionStatus("denied");
        const lat = -6.2088, lng = 106.8456;
        setCoords({ lat, lng });
        setQiblaAngle(calcQiblaAngle(lat, lng));
        setDistance(calcDistance(lat, lng));
        setLocationName("Jakarta (Default)");
      }
    );
  }, []);

  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      const heading = (e as any).webkitCompassHeading ?? (e.alpha != null ? (360 - e.alpha) % 360 : null);
      if (heading != null) setDeviceHeading(heading);
    };
    window.addEventListener("deviceorientationabsolute", handler as any, true);
    window.addEventListener("deviceorientation", handler as any, true);
    return () => {
      window.removeEventListener("deviceorientationabsolute", handler as any, true);
      window.removeEventListener("deviceorientation", handler as any, true);
    };
  }, []);

  const requestCompass = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
      try {
        const r = await (DeviceOrientationEvent as any).requestPermission();
        if (r !== "granted") setError("Izin kompas ditolak");
      } catch { setError("Tidak dapat mengakses kompas"); }
    }
  };

  const needleRotation = qiblaAngle != null
    ? deviceHeading != null
      ? qiblaAngle - deviceHeading
      : qiblaAngle
    : 0;

  const accuracy = deviceHeading != null ? "Menggunakan kompas perangkat" : "Berdasarkan koordinat geografis";

  return (
    <DynamicPublicLayout>
      <div className="min-h-screen bg-gradient-to-b from-emerald-950 to-teal-950 pb-16">
        <div className="bg-gradient-to-r from-teal-800 to-emerald-800 py-10 px-4 text-center">
          <Badge className="mb-3 bg-white/20 text-white border-0">🧭 Arah Kiblat</Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Arah Kiblat</h1>
          <p className="text-emerald-200 text-sm">Penunjuk arah Ka'bah berbasis GPS & Kompas</p>
        </div>

        <div className="max-w-md mx-auto px-4 mt-8 space-y-6">
          {/* Location */}
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-4 flex items-center gap-3">
              <MapPin className="text-emerald-400 w-5 h-5 shrink-0" />
              <div>
                <p className="text-white font-medium">{locationName}</p>
                {coords && (
                  <p className="text-gray-400 text-xs">{coords.lat.toFixed(4)}°, {coords.lng.toFixed(4)}°</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Compass */}
          <div className="flex flex-col items-center">
            <div className="relative w-72 h-72">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-4 border-emerald-700/50 bg-emerald-950/80 shadow-2xl flex items-center justify-center">
                {/* Compass directions */}
                {["N", "E", "S", "W"].map((dir, i) => {
                  const angle = i * 90;
                  const rad = (angle - 90) * Math.PI / 180;
                  const r = 115;
                  const x = 136 + r * Math.cos(rad);
                  const y = 136 + r * Math.sin(rad);
                  return (
                    <span key={dir} className="absolute text-xs font-bold text-emerald-400/60" style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}>
                      {dir}
                    </span>
                  );
                })}
                {/* Tick marks */}
                {Array.from({ length: 72 }).map((_, i) => {
                  const angle = i * 5;
                  const rad = (angle - 90) * Math.PI / 180;
                  const r1 = i % 18 === 0 ? 98 : i % 6 === 0 ? 102 : 105;
                  const r2 = 110;
                  return (
                    <svg key={i} className="absolute inset-0 w-full h-full" viewBox="0 0 272 272" style={{ overflow: "visible" }}>
                      <line
                        x1={136 + r1 * Math.cos(rad)} y1={136 + r1 * Math.sin(rad)}
                        x2={136 + r2 * Math.cos(rad)} y2={136 + r2 * Math.sin(rad)}
                        stroke={i % 18 === 0 ? "#34d399" : "#1f5742"} strokeWidth={i % 18 === 0 ? 2 : 1}
                      />
                    </svg>
                  );
                })}
                {/* Kaaba needle */}
                <div
                  className="absolute inset-0 flex items-center justify-center transition-transform duration-300"
                  style={{ transform: `rotate(${needleRotation}deg)` }}
                >
                  <div className="flex flex-col items-center" style={{ height: "100%" }}>
                    <div className="w-1 h-24 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-full mt-8 shadow-lg" />
                    <div className="text-2xl -mt-1">🕋</div>
                    <div className="w-1 h-20 bg-gradient-to-b from-red-600 to-red-400 rounded-full mt-1" />
                  </div>
                </div>
                {/* Center dot */}
                <div className="absolute w-4 h-4 rounded-full bg-white shadow-lg z-10" />
              </div>
            </div>

            {qiblaAngle != null && (
              <div className="mt-4 text-center">
                <div className="text-4xl font-bold text-emerald-400">{Math.round(qiblaAngle)}°</div>
                <p className="text-gray-300 text-sm mt-1">Arah Kiblat dari Utara</p>
                <p className="text-gray-500 text-xs mt-1">{accuracy}</p>
              </div>
            )}
          </div>

          {/* Distance */}
          {distance && (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4 grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-gray-400 text-xs mb-1">Jarak ke Ka'bah</p>
                  <p className="text-white font-bold text-xl">{Math.round(distance).toLocaleString("id-ID")} km</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-1">Arah Kiblat</p>
                  <p className="text-white font-bold text-xl">{qiblaAngle ? Math.round(qiblaAngle) : "--"}°</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Compass button for iOS */}
          <Button onClick={requestCompass} variant="outline" className="w-full border-emerald-600/40 text-emerald-400 hover:bg-emerald-900/50">
            <Compass className="w-4 h-4 mr-2" /> Aktifkan Kompas (iOS)
          </Button>

          {error && <p className="text-amber-400 text-sm text-center">{error}</p>}

          <Card className="bg-emerald-900/20 border-emerald-700/30">
            <CardContent className="p-4">
              <p className="text-emerald-300 text-sm font-medium mb-2">📌 Panduan Penggunaan</p>
              <ul className="text-gray-400 text-xs space-y-1">
                <li>• Jarum kuning 🕋 menunjuk ke arah Ka'bah</li>
                <li>• Di perangkat mobile, kompas otomatis aktif</li>
                <li>• Pastikan tidak ada gangguan magnet di sekitar</li>
                <li>• Kalibrasi kompas dengan gerakan angka 8</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </DynamicPublicLayout>
  );
}
