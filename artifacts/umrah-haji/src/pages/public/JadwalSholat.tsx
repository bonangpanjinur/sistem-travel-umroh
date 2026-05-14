import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, RefreshCw, Bell, BellOff, Moon, Sun, Sunrise, Sunset, ChevronRight } from "lucide-react";
import { DynamicPublicLayout } from "@/components/layout/DynamicPublicLayout";
import { AppPageHeader } from "@/components/shared/AppPageHeader";
import { PrayerNotificationCard } from "@/components/pwa/PrayerNotificationCard";
import { cn } from "@/lib/utils";

interface PrayerTimes {
  Fajr: string; Dhuhr: string; Asr: string; Maghrib: string; Isha: string; Sunrise: string;
}

interface TimingsResponse {
  timings: PrayerTimes;
  date: { readable: string; gregorian: { date: string }; hijri: { date: string; month: { en: string; ar: string }; year: string; weekday: { en: string } } };
  meta: { latitude: number; longitude: number; timezone: string; method: { name: string } };
}

const PRAYER_LIST = [
  { key: "Fajr",    label: "Subuh",   labelAr: "الفجر",   icon: Moon,    gradient: "from-indigo-600 to-blue-700",   light: "bg-indigo-50 dark:bg-indigo-950/40",  accent: "text-indigo-600 dark:text-indigo-400" },
  { key: "Sunrise", label: "Terbit",  labelAr: "الشروق",  icon: Sunrise, gradient: "from-amber-500 to-orange-500",  light: "bg-amber-50 dark:bg-amber-950/40",    accent: "text-amber-600 dark:text-amber-400",  isInfo: true },
  { key: "Dhuhr",   label: "Dzuhur",  labelAr: "الظهر",   icon: Sun,     gradient: "from-yellow-500 to-orange-400", light: "bg-yellow-50 dark:bg-yellow-950/40",  accent: "text-yellow-600 dark:text-yellow-400" },
  { key: "Asr",     label: "Ashar",   labelAr: "العصر",   icon: Sun,     gradient: "from-orange-500 to-rose-500",   light: "bg-orange-50 dark:bg-orange-950/40",  accent: "text-orange-600 dark:text-orange-400" },
  { key: "Maghrib", label: "Maghrib", labelAr: "المغرب",  icon: Sunset,  gradient: "from-rose-600 to-pink-600",     light: "bg-rose-50 dark:bg-rose-950/40",      accent: "text-rose-600 dark:text-rose-400" },
  { key: "Isha",    label: "Isya",    labelAr: "العشاء",  icon: Moon,    gradient: "from-violet-700 to-purple-800", light: "bg-violet-50 dark:bg-violet-950/40",  accent: "text-violet-600 dark:text-violet-400" },
];

const WAJIB_KEYS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

function getNextPrayer(timings: PrayerTimes): string {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (const p of WAJIB_KEYS) {
    const [h, m] = timings[p].split(":").map(Number);
    if (h * 60 + m > nowMin) return p;
  }
  return "Fajr";
}

function minutesUntil(timeStr: string): number {
  const now = new Date();
  const [h, m] = timeStr.split(":").map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return Math.round((target.getTime() - now.getTime()) / 60000);
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

function formatTime12(timeStr: string): { time: string; period: string } {
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return { time: `${hour}:${m.toString().padStart(2, "0")}`, period };
}

function PrayerRow({ info, time, isNext, isPassed }: {
  info: typeof PRAYER_LIST[0];
  time: string;
  isNext: boolean;
  isPassed: boolean;
}) {
  const Icon = info.icon;
  const fmt = time !== "--:--" ? formatTime12(time) : null;
  return (
    <div
      className={cn(
        "flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all",
        isNext
          ? `bg-gradient-to-r ${info.gradient} shadow-lg shadow-black/10`
          : isPassed
          ? "opacity-40"
          : info.light,
      )}
    >
      <div className={cn(
        "flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl",
        isNext ? "bg-white/20" : `${info.light}`,
      )}>
        <Icon className={cn("w-5 h-5", isNext ? "text-white" : info.accent)} />
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn("font-semibold text-sm", isNext ? "text-white" : "text-foreground")}>
          {info.label}
        </p>
        <p className={cn("text-xs", isNext ? "text-white/70" : "text-muted-foreground")}>
          {info.labelAr}
          {info.isInfo && <span className="ml-1 text-[10px]">• Matahari Terbit</span>}
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        {fmt ? (
          <div className="flex items-baseline gap-0.5">
            <span className={cn("text-xl font-bold font-mono tabular-nums", isNext ? "text-white" : "text-foreground")}>
              {fmt.time}
            </span>
            <span className={cn("text-xs font-medium", isNext ? "text-white/60" : "text-muted-foreground")}>
              {fmt.period}
            </span>
          </div>
        ) : (
          <div className="w-16 h-6 bg-white/10 rounded animate-pulse" />
        )}
        {isNext && (
          <Badge className="mt-1 bg-white/20 text-white border-0 text-[10px] font-semibold px-2 py-0.5">
            Berikutnya
          </Badge>
        )}
      </div>
    </div>
  );
}

export default function JadwalSholat() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState("Memuat lokasi...");
  const [countdown, setCountdown] = useState("--:--:--");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`)
          .then(r => r.json())
          .then(d => setLocationName(d.address?.city || d.address?.town || d.address?.county || "Lokasi Anda"))
          .catch(() => setLocationName("Lokasi Anda"));
      },
      () => {
        setCoords({ lat: -6.2088, lng: 106.8456 });
        setLocationName("Jakarta");
      }
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
    const t = setInterval(() => {
      const newNow = new Date();
      setNow(newNow);
      if (data) setCountdown(formatCountdown(data.timings, getNextPrayer(data.timings)));
    }, 1000);
    if (data) setCountdown(formatCountdown(data.timings, getNextPrayer(data.timings)));
    return () => clearInterval(t);
  }, [data]);

  const nextPrayer = data ? getNextPrayer(data.timings) : null;
  const nextInfo = PRAYER_LIST.find(p => p.key === nextPrayer);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const HIJRI_MONTHS_ID: Record<string, string> = {
    Muharram: "Muharram", Safar: "Shafar", "Rabi' al-awwal": "Rabi'ul Awal",
    "Rabi' al-thani": "Rabi'ul Akhir", "Jumada al-awwal": "Jumadil Awal",
    "Jumada al-thani": "Jumadil Akhir", Rajab: "Rajab", "Sha'ban": "Sya'ban",
    Ramadan: "Ramadhan", Shawwal: "Syawal", "Dhu al-Qi'dah": "Dzulqa'dah",
    "Dhu al-Hijjah": "Dzulhijjah",
  };
  const hijriMonthEn = data?.date.hijri.month.en || "";
  const hijriMonthId = HIJRI_MONTHS_ID[hijriMonthEn] || hijriMonthEn;

  return (
    <DynamicPublicLayout>
      <div className="min-h-screen bg-background">

        {/* App-like header */}
        <AppPageHeader
          title="Jadwal Sholat"
          subtitle={locationName}
          backTo="/"
          dark={false}
          right={
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
              title="Perbarui"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          }
        />

        {/* Hero: Clock + Date */}
        <div className="relative bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-4 pt-6 pb-0">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=800')] bg-cover bg-center opacity-5" />
          <div className="relative z-10 text-center">

            {/* Live Clock */}
            <div className="text-6xl font-mono font-black text-white tabular-nums tracking-tight">
              {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="text-2xl font-mono text-white/30 tabular-nums mt-1">
              :{now.toLocaleTimeString("id-ID", { second: "2-digit" }).slice(-2)}
            </div>

            {/* Dates */}
            <p className="text-white/60 text-sm mt-2">
              {now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
            {data && (
              <p className="text-amber-400 text-sm font-medium mt-0.5">
                {data.date.hijri.date} {hijriMonthId} {data.date.hijri.year} H
              </p>
            )}

            {/* Location */}
            <div className="flex items-center justify-center gap-1.5 mt-3 text-white/50 text-xs">
              <MapPin className="w-3.5 h-3.5" />
              <span>{locationName}</span>
            </div>

            {/* Next Prayer Countdown — hero pill */}
            {nextPrayer && nextInfo && data && (
              <div className={cn(
                "mt-5 mx-auto max-w-xs rounded-2xl p-4 bg-gradient-to-r shadow-xl",
                nextInfo.gradient,
              )}>
                <p className="text-white/70 text-xs font-medium uppercase tracking-widest mb-1">
                  Menuju Sholat Berikutnya
                </p>
                <p className="text-white font-bold text-lg">
                  {nextInfo.label} · {data.timings[nextPrayer as keyof PrayerTimes]}
                </p>
                <div className="text-4xl font-mono font-black text-white mt-1 tabular-nums">
                  {countdown}
                </div>
                {minutesUntil(data.timings[nextPrayer as keyof PrayerTimes]) < 30 && (
                  <Badge className="mt-2 bg-white/20 text-white border-0 text-xs">
                    ⚡ Segera
                  </Badge>
                )}
              </div>
            )}
            {isLoading && (
              <div className="mt-5 mx-auto max-w-xs rounded-2xl p-4 bg-white/10 animate-pulse h-28" />
            )}

            {/* Curved bottom */}
            <div className="h-8 mt-4 -mx-4 bg-background rounded-t-3xl" />
          </div>
        </div>

        {/* Prayer Times List */}
        <div className="px-4 -mt-2 space-y-2 pb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Waktu Sholat Hari Ini
          </p>
          {PRAYER_LIST.map((info) => {
            const time = data?.timings[info.key as keyof PrayerTimes] ?? "--:--";
            const isNext = nextPrayer === info.key;
            const [h, m] = time !== "--:--" ? time.split(":").map(Number) : [0, 0];
            const pMin = h * 60 + m;
            const isPassed = !isNext && time !== "--:--" && pMin < nowMin && !info.isInfo;
            return (
              <PrayerRow key={info.key} info={info} time={time} isNext={isNext} isPassed={isPassed} />
            );
          })}

          {/* Method info */}
          {data && (
            <p className="text-center text-muted-foreground/50 text-xs pt-2">
              Metode: {data.meta.method.name}
            </p>
          )}
        </div>

        {/* Notification Settings */}
        <div className="px-4 pb-8">
          <PrayerNotificationCard />
        </div>

      </div>
    </DynamicPublicLayout>
  );
}
