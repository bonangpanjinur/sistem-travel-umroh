import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Clock, RefreshCw, MapPin, Moon, Sun,
  Sunrise, Sunset, Bell, Navigation
} from "lucide-react";
import { JamaahAppShell } from "@/components/jamaah/shell/JamaahAppShell";
import { JamaahPageHeader } from "@/components/jamaah/shell/JamaahPageHeader";
import { usePortalContext } from "@/hooks/usePortalContext";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Imsak: string;
}

interface AladhanResponse {
  data: {
    timings: PrayerTimes;
    date: {
      readable: string;
      hijri: {
        date: string;
        month: { en: string; ar: string };
        year: string;
        weekday: { en: string; ar: string };
      };
    };
  };
}

const PRAYERS = [
  { key: "Imsak", label: "Imsak", icon: Moon, color: "text-slate-600", bg: "bg-slate-50" },
  { key: "Fajr", label: "Subuh", icon: Moon, color: "text-indigo-600", bg: "bg-indigo-50" },
  { key: "Sunrise", label: "Syuruq", icon: Sunrise, color: "text-orange-400", bg: "bg-orange-50" },
  { key: "Dhuhr", label: "Dzuhur", icon: Sun, color: "text-yellow-600", bg: "bg-yellow-50" },
  { key: "Asr", label: "Ashar", icon: Sun, color: "text-amber-600", bg: "bg-amber-50" },
  { key: "Maghrib", label: "Maghrib", icon: Sunset, color: "text-rose-500", bg: "bg-rose-50" },
  { key: "Isha", label: "Isya", icon: Moon, color: "text-purple-600", bg: "bg-purple-50" },
] as const;

const CITIES = [
  { id: "makkah", label: "Makkah", city: "Makkah", country: "SA" },
  { id: "madinah", label: "Madinah", city: "Medina", country: "SA" },
];

function getNextPrayer(timings: PrayerTimes): string | null {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const prayerKeys = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
  for (const key of prayerKeys) {
    const [h, m] = timings[key].split(":").map(Number);
    const prayerMinutes = h * 60 + m;
    if (prayerMinutes > nowMinutes) return key;
  }
  return "Fajr";
}

function getCountdown(timeStr: string): string {
  const now = new Date();
  const [h, m] = timeStr.split(":").map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  const diff = Math.floor((target.getTime() - now.getTime()) / 1000);
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// S17-05: Derive prayer city from active itinerary location when ON_TRIP.
// Maps location_city strings containing 'Madinah'/'Medina' to "madinah",
// everything else (including Makkah/Mecca/Jeddah/Arafah) defaults to "makkah".
function detectCityFromItinerary(itinerary: Array<{ location_city?: string | null }> | undefined): string | null {
  if (!itinerary?.length) return null;
  const city = itinerary.find((i) => i.location_city)?.location_city?.toLowerCase() ?? "";
  if (city.includes("madinah") || city.includes("medina") || city.includes("المدينة")) return "madinah";
  if (city) return "makkah";
  return null;
}

export default function JamaahWaktuSholat() {
  const ctx = usePortalContext();
  const [selectedCity, setSelectedCity] = useState<string>("makkah");
  const [autoCity, setAutoCity] = useState<string | null>(null);
  const [prayerData, setPrayerData] = useState<AladhanResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  // S17-05: Auto-select city when jamaah is ON_TRIP based on today's itinerary
  useEffect(() => {
    if (ctx.status === "ON_TRIP") {
      const detected = detectCityFromItinerary(ctx.todayItinerary as any);
      if (detected) {
        setAutoCity(detected);
        setSelectedCity(detected);
      }
    } else {
      setAutoCity(null);
    }
  }, [ctx.status, ctx.todayItinerary]);

  const fetchPrayerTimes = useCallback(async (cityId: string) => {
    setLoading(true);
    const city = CITIES.find((c) => c.id === cityId);
    if (!city) return;
    try {
      const today = format(new Date(), "dd-MM-yyyy");
      const cacheKey = `prayer-${cityId}-${today}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setPrayerData(JSON.parse(cached));
        setLoading(false);
        return;
      }
      const res = await fetch(
        `https://api.aladhan.com/v1/timingsByCity?city=${city.city}&country=${city.country}&method=4`
      );
      if (!res.ok) throw new Error("API error");
      const json: AladhanResponse = await res.json();
      sessionStorage.setItem(cacheKey, JSON.stringify(json.data));
      setPrayerData(json.data);
    } catch {
      toast.error("Gagal memuat jadwal sholat. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrayerTimes(selectedCity);
  }, [selectedCity, fetchPrayerTimes]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      if (prayerData) {
        const nextKey = getNextPrayer(prayerData.timings);
        if (nextKey) setCountdown(getCountdown(prayerData.timings[nextKey as keyof PrayerTimes]));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [prayerData]);

  const nextPrayerKey = prayerData ? getNextPrayer(prayerData.timings) : null;
  const nextPrayer = PRAYERS.find((p) => p.key === nextPrayerKey);
  const nextPrayerTime = nextPrayerKey && prayerData
    ? prayerData.timings[nextPrayerKey as keyof PrayerTimes]
    : null;

  const hijri = prayerData?.date.hijri;

  return (
    <JamaahAppShell>
      <JamaahPageHeader
        title="Waktu Sholat"
        arabic="مَوَاقِيتُ الصَّلَاةِ"
        subtitle={format(currentTime, "EEEE, d MMMM yyyy", { locale: id })}
        right={
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10"
            onClick={() => fetchPrayerTimes(selectedCity)} aria-label="Muat ulang">
            <RefreshCw className="h-4 w-4" />
          </Button>
        }
      />
      <div className="p-4 space-y-4">
        {/* City Toggle — S17-05: shows auto-detect badge when ON_TRIP */}
        <div className="space-y-1.5">
          {autoCity && (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400">
              <Navigation className="h-3 w-3" />
              <span>Otomatis berdasarkan lokasi itinerary hari ini</span>
            </div>
          )}
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            {CITIES.map((city) => (
              <button
                key={city.id}
                onClick={() => { setAutoCity(null); setSelectedCity(city.id); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedCity === city.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted-foreground/10"
                }`}
              >
                <MapPin className="h-3.5 w-3.5" />
                {city.label}
                {autoCity === city.id && (
                  <span className="text-[9px] bg-white/30 rounded px-1">Auto</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Hijri Date */}
        {hijri && (
          <div className="text-center text-sm text-muted-foreground">
            {hijri.weekday?.ar} — {hijri.date} {hijri.month.en} {hijri.year} H
          </div>
        )}

        {/* Countdown to Next Prayer */}
        {nextPrayer && nextPrayerTime && !loading && (
          <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <CardContent className="p-5 text-center">
              <p className="text-sm opacity-80 mb-1">Sholat berikutnya</p>
              <p className="text-2xl font-bold mb-0.5">{nextPrayer.label}</p>
              <p className="text-3xl font-mono font-bold tracking-wider mb-2">{countdown}</p>
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {nextPrayerTime}
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* Prayer Times List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Jadwal Sholat — {CITIES.find((c) => c.id === selectedCity)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading
              ? Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))
              : PRAYERS.map((prayer) => {
                  const isNext = prayer.key === nextPrayerKey;
                  const timeStr = prayerData?.timings[prayer.key as keyof PrayerTimes];
                  const Icon = prayer.icon;
                  return (
                    <div
                      key={prayer.key}
                      className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                        isNext
                          ? "border-2 border-primary bg-primary/5"
                          : `${prayer.bg} border border-transparent`
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full bg-white/70 flex items-center justify-center shadow-sm`}>
                          <Icon className={`h-4 w-4 ${prayer.color}`} />
                        </div>
                        <div>
                          <p className={`font-semibold text-sm ${isNext ? "text-primary" : ""}`}>
                            {prayer.label}
                          </p>
                          <p className="text-xs text-muted-foreground">{prayer.key}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-mono font-bold ${isNext ? "text-primary" : ""}`}>
                          {timeStr || "--:--"}
                        </p>
                        {isNext && (
                          <Badge variant="outline" className="text-[10px] h-4 border-primary text-primary">
                            Berikutnya
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 text-sm text-amber-800">
            <p className="font-medium mb-1">ℹ️ Sumber Jadwal</p>
            <p className="text-xs text-amber-700">
              Data waktu sholat menggunakan metode <strong>Umm Al-Qura University, Makkah</strong> (metode resmi Arab Saudi)
              via Aladhan API. Waktu dapat berbeda ±1-2 menit dari pengumuman masjid setempat.
            </p>
          </CardContent>
        </Card>
      </div>
    </JamaahAppShell>
  );
}
