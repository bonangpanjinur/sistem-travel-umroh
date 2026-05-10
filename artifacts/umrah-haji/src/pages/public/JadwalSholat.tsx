import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, RefreshCw, Clock, Bell, Moon, Sun, Sunrise, Sunset } from "lucide-react";
import { DynamicPublicLayout } from "@/components/layout/DynamicPublicLayout";

interface PrayerTimes {
  Fajr: string; Dhuhr: string; Asr: string; Maghrib: string; Isha: string; Sunrise: string;
}

interface TimingsResponse {
  timings: PrayerTimes;
  date: { readable: string; gregorian: { date: string }; hijri: { date: string; month: { en: string }; year: string } };
  meta: { latitude: number; longitude: number; timezone: string; method: { name: string } };
}

const PRAYER_INFO = [
  { key: "Fajr",    label: "Subuh",    icon: Moon,    color: "from-indigo-900 to-blue-900",   textColor: "text-blue-200",   bgCard: "bg-indigo-950/80" },
  { key: "Sunrise", label: "Terbit",   icon: Sunrise, color: "from-orange-700 to-amber-600",  textColor: "text-amber-200",  bgCard: "bg-orange-950/80", isInfo: true },
  { key: "Dhuhr",   label: "Dzuhur",   icon: Sun,     color: "from-yellow-500 to-amber-500",  textColor: "text-yellow-900", bgCard: "bg-yellow-50" },
  { key: "Asr",     label: "Ashar",    icon: Sun,     color: "from-orange-400 to-orange-500", textColor: "text-orange-900", bgCard: "bg-orange-50" },
  { key: "Maghrib", label: "Maghrib",  icon: Sunset,  color: "from-rose-500 to-pink-600",     textColor: "text-rose-100",   bgCard: "bg-rose-950/80" },
  { key: "Isha",    label: "Isya",     icon: Moon,    color: "from-purple-900 to-violet-900", textColor: "text-purple-200", bgCard: "bg-purple-950/80" },
];

function getNextPrayer(timings: PrayerTimes): string {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
  for (const p of prayers) {
    const [h, m] = timings[p].split(":").map(Number);
    if (h * 60 + m > nowMin) return p;
  }
  return "Fajr";
}

function formatCountdown(timings: PrayerTimes, next: string): string {
  const now = new Date();
  const [h, m] = timings[next as keyof PrayerTimes].split(":").map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  const diff = target.getTime() - now.getTime();
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function JadwalSholat() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState("Lokasi Anda");
  const [countdown, setCountdown] = useState("--:--:--");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`)
          .then(r => r.json())
          .then(d => setLocationName(d.address?.city || d.address?.town || d.address?.county || "Lokasi Anda"))
          .catch(() => {});
      },
      () => setCoords({ lat: -6.2088, lng: 106.8456 })
    );
  }, []);

  const { data, isLoading, refetch } = useQuery<TimingsResponse>({
    queryKey: ["prayer-times", coords?.lat, coords?.lng],
    queryFn: async () => {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, "0");
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const yyyy = today.getFullYear();
      const r = await fetch(
        `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${coords!.lat}&longitude=${coords!.lng}&method=11`
      );
      const json = await r.json();
      return json.data;
    },
    enabled: !!coords,
    staleTime: 1000 * 60 * 60,
  });

  useEffect(() => {
    if (!data) return;
    const next = getNextPrayer(data.timings);
    setCountdown(formatCountdown(data.timings, next));
    const t = setInterval(() => {
      setNow(new Date());
      setCountdown(formatCountdown(data.timings, next));
    }, 1000);
    return () => clearInterval(t);
  }, [data]);

  const nextPrayer = data ? getNextPrayer(data.timings) : null;

  return (
    <DynamicPublicLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-950 to-indigo-950 pb-16">
        {/* Header */}
        <div className="relative overflow-hidden py-12 px-4 text-center">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1200')] bg-cover bg-center opacity-10" />
          <div className="relative z-10">
            <Badge className="mb-3 bg-emerald-600/80 text-white border-0">🕌 Jadwal Sholat</Badge>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Waktu Sholat</h1>
            <div className="flex items-center justify-center gap-2 text-blue-300 text-sm mb-6">
              <MapPin className="w-4 h-4" />
              <span>{locationName}</span>
              <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-blue-300 hover:text-white p-1 h-auto">
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
            {/* Live Clock */}
            <div className="text-5xl font-mono font-bold text-white tabular-nums">
              {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
            <p className="text-blue-300 text-sm mt-1">
              {now.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
            {data && (
              <div className="mt-4 text-amber-300 text-sm">
                {data.date.hijri.date} {data.date.hijri.month.en} {data.date.hijri.year} H
              </div>
            )}
          </div>
        </div>

        {/* Countdown to next prayer */}
        {nextPrayer && data && (
          <div className="mx-4 mb-6">
            <Card className="bg-emerald-700/30 border-emerald-500/30 backdrop-blur">
              <CardContent className="py-4 text-center">
                <p className="text-emerald-300 text-sm mb-1">Menuju Sholat Berikutnya</p>
                <p className="text-white font-bold text-lg">
                  {PRAYER_INFO.find(p => p.key === nextPrayer)?.label} — {data.timings[nextPrayer as keyof PrayerTimes]}
                </p>
                <div className="text-3xl font-mono font-bold text-emerald-400 mt-1 tabular-nums">{countdown}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Prayer Times Grid */}
        <div className="px-4 grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
          {PRAYER_INFO.map(({ key, label, icon: Icon, bgCard, textColor }) => {
            const time = data?.timings[key as keyof PrayerTimes] || "--:--";
            const isNext = nextPrayer === key;
            return (
              <Card
                key={key}
                className={`${bgCard} border-0 transition-all duration-300 ${isNext ? "ring-2 ring-emerald-400 scale-105" : ""}`}
              >
                <CardContent className="p-4 text-center">
                  <Icon className={`w-6 h-6 mx-auto mb-2 ${textColor}`} />
                  <p className={`text-xs font-medium uppercase tracking-wide ${textColor} opacity-70`}>{label}</p>
                  {isLoading ? (
                    <div className="h-8 bg-white/10 rounded animate-pulse mt-1" />
                  ) : (
                    <p className={`text-2xl font-bold font-mono ${textColor} mt-1`}>{time}</p>
                  )}
                  {isNext && <Badge className="mt-2 bg-emerald-500 text-white border-0 text-xs">Berikutnya</Badge>}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Method info */}
        {data && (
          <p className="text-center text-blue-400/60 text-xs mt-6 px-4">
            Metode: {data.meta.method.name} • {data.meta.timezone}
          </p>
        )}
      </div>
    </DynamicPublicLayout>
  );
}
