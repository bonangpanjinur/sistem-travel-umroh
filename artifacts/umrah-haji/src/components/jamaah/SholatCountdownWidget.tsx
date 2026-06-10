import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Moon, Sun, Sunrise, Sunset, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PrayerTimes {
  Imsak: string; Fajr: string; Sunrise: string;
  Dhuhr: string; Asr: string; Maghrib: string; Isha: string;
}

const PRAYERS = [
  { key: "Fajr",    label: "Subuh",   icon: Moon,    color: "text-indigo-500" },
  { key: "Dhuhr",   label: "Dzuhur",  icon: Sun,     color: "text-yellow-500" },
  { key: "Asr",     label: "Ashar",   icon: Sun,     color: "text-amber-500"  },
  { key: "Maghrib", label: "Maghrib", icon: Sunset,  color: "text-rose-500"   },
  { key: "Isha",    label: "Isya",    icon: Moon,    color: "text-purple-500" },
] as const;

type PrayerKey = (typeof PRAYERS)[number]["key"];

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function getNextPrayer(timings: PrayerTimes): { key: PrayerKey; label: string; time: string } | null {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (const p of PRAYERS) {
    const t = timings[p.key as keyof PrayerTimes];
    if (!t) continue;
    if (timeToMinutes(t) > nowMin) return { key: p.key, label: p.label, time: t };
  }
  return { key: "Fajr", label: "Subuh", time: timings.Fajr };
}

function prayerDone(key: PrayerKey, timings: PrayerTimes): boolean {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const t = timings[key as keyof PrayerTimes];
  return !!t && timeToMinutes(t) <= nowMin;
}

interface Props {
  /** Pass Makkah/Madinah coordinates when ON_TRIP */
  lat?: number;
  lng?: number;
  cityLabel?: string;
  compact?: boolean;
}

const MAKKAH  = { lat: 21.3891, lng: 39.8579, label: "Makkah" };
const MADINAH = { lat: 24.5247, lng: 39.5692, label: "Madinah" };

export function SholatCountdownWidget({ lat, lng, cityLabel, compact = false }: Props) {
  const [countdown, setCountdown] = useState<{ h: number; m: number; s: number } | null>(null);
  const [userLat, setUserLat] = useState<number | null>(lat ?? null);
  const [userLng, setUserLng] = useState<number | null>(lng ?? null);
  const [detectedCity, setDetectedCity] = useState<string>(cityLabel ?? "");

  useEffect(() => {
    if (lat !== undefined && lng !== undefined) {
      setUserLat(lat); setUserLng(lng); setDetectedCity(cityLabel ?? "");
      return;
    }
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); },
      () => { setUserLat(-6.2088); setUserLng(106.8456); setDetectedCity("Jakarta"); },
      { timeout: 6000 },
    );
  }, [lat, lng, cityLabel]);

  const today = new Date();
  const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;

  const { data: timings, isLoading } = useQuery<PrayerTimes | null>({
    queryKey: ["prayer-times", userLat, userLng, dateStr],
    queryFn: async () => {
      if (!userLat || !userLng) return null;
      const res = await fetch(
        `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${userLat}&longitude=${userLng}&method=20`,
      );
      if (!res.ok) return null;
      const json = await res.json();
      return json.data?.timings as PrayerTimes ?? null;
    },
    enabled: !!userLat && !!userLng,
    staleTime: 60 * 60 * 1000,
    gcTime: 6 * 60 * 60 * 1000,
  });

  useEffect(() => {
    if (!timings) return;
    const tick = () => {
      const next = getNextPrayer(timings);
      if (!next) return;
      const now = new Date();
      const [th, tm] = next.time.split(":").map(Number);
      const target = new Date();
      target.setHours(th, tm, 0, 0);
      if (target < now) target.setDate(target.getDate() + 1);
      const diff = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
      setCountdown({
        h: Math.floor(diff / 3600),
        m: Math.floor((diff % 3600) / 60),
        s: diff % 60,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timings]);

  if (isLoading || !timings) {
    return (
      <div className="bg-gradient-to-r from-primary/90 to-primary rounded-2xl p-4 text-primary-foreground animate-pulse">
        <div className="h-4 bg-white/20 rounded w-32 mb-2" />
        <div className="h-8 bg-white/20 rounded w-24" />
      </div>
    );
  }

  const next = getNextPrayer(timings);
  const nextPrayerInfo = PRAYERS.find((p) => p.key === next?.key);

  if (compact) {
    return (
      <Link to="/jamaah/waktu-sholat" className="block">
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl px-4 py-3 text-primary-foreground flex items-center justify-between">
          <div className="flex items-center gap-3">
            {nextPrayerInfo && <nextPrayerInfo.icon className="h-5 w-5 opacity-90" />}
            <div>
              <p className="text-[10px] opacity-70 uppercase tracking-wider">Sholat Berikutnya</p>
              <p className="font-bold text-sm">{next?.label}</p>
            </div>
          </div>
          <div className="text-right">
            {countdown && (
              <p className="font-mono font-bold text-lg leading-none">
                {countdown.h > 0 && `${countdown.h}:`}
                {String(countdown.m).padStart(2, "0")}:{String(countdown.s).padStart(2, "0")}
              </p>
            )}
            <p className="text-[10px] opacity-70">{next?.time} {detectedCity && `· ${detectedCity}`}</p>
          </div>
          <ChevronRight className="h-4 w-4 opacity-50 ml-2" />
        </div>
      </Link>
    );
  }

  return (
    <Link to="/jamaah/waktu-sholat" className="block">
      <div className="bg-gradient-to-br from-primary via-primary to-primary/85 rounded-2xl p-4 text-primary-foreground shadow-lg">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[11px] opacity-70 uppercase tracking-wider mb-0.5">Waktu Sholat Berikutnya</p>
            <div className="flex items-center gap-2">
              {nextPrayerInfo && <nextPrayerInfo.icon className="h-5 w-5 opacity-90" />}
              <p className="font-bold text-xl">{next?.label}</p>
            </div>
            <p className="text-[12px] opacity-80 mt-0.5">Pukul {next?.time}{detectedCity && ` · ${detectedCity}`}</p>
          </div>
          {countdown && (
            <div className="text-right">
              <p className="text-[10px] opacity-70 mb-1">Hitung mundur</p>
              <p className="font-mono font-bold text-3xl tracking-tight leading-none">
                {countdown.h > 0
                  ? `${countdown.h}:${String(countdown.m).padStart(2, "0")}`
                  : `${String(countdown.m).padStart(2, "0")}:${String(countdown.s).padStart(2, "0")}`
                }
              </p>
              <p className="text-[10px] opacity-60 mt-0.5">{countdown.h > 0 ? "jam menit" : "menit detik"}</p>
            </div>
          )}
        </div>

        {/* 5 prayer progress bar */}
        <div className="flex gap-1.5 mt-1">
          {PRAYERS.map((p) => {
            const done = prayerDone(p.key, timings);
            const isNext = p.key === next?.key;
            return (
              <div key={p.key} className="flex-1 flex flex-col items-center gap-1">
                <div className={cn(
                  "h-1.5 w-full rounded-full",
                  done ? "bg-white/70" : isNext ? "bg-white/40 animate-pulse" : "bg-white/15",
                )} />
                <p className="text-[9px] opacity-60">{p.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </Link>
  );
}
