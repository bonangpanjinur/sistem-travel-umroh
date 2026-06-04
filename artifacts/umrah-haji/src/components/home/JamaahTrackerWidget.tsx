import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Plane, Clock, Moon, Sun, Sunrise, Sunset, Flame,
  CheckCircle2, ChevronRight, MapPin, BookOpen,
  RefreshCw, Loader2, Heart, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

interface PrayerTimes {
  Fajr: string; Dhuhr: string; Asr: string; Maghrib: string; Isha: string; Sunrise: string;
}

interface DailyLog {
  subuh: boolean; dzuhur: boolean; ashar: boolean; maghrib: boolean; isya: boolean;
  tahajud: boolean; dhuha: boolean; rawatibQabli: boolean; rawatibBadi: boolean;
  tawafRounds: number; saiTrips: number;
  tasbih: number; tahmid: number; takbir: number; istighfar: number; shalawat: number;
  quranPages: number;
  sedekah: boolean; puasaSunnah: boolean; muhasabah: boolean;
  savedAt: string;
}

// ── Prayer helpers ─────────────────────────────────────────────────────────

const PRAYER_INFO = [
  { key: "Fajr",    label: "Subuh",    Icon: Moon,    bg: "bg-indigo-500",  text: "text-indigo-600" },
  { key: "Dhuhr",   label: "Dzuhur",   Icon: Sun,     bg: "bg-amber-500",   text: "text-amber-600" },
  { key: "Asr",     label: "Ashar",    Icon: Sun,     bg: "bg-orange-500",  text: "text-orange-600" },
  { key: "Maghrib", label: "Maghrib",  Icon: Sunset,  bg: "bg-rose-500",    text: "text-rose-600" },
  { key: "Isha",    label: "Isya",     Icon: Moon,    bg: "bg-purple-500",  text: "text-purple-600" },
];

function getNextPrayer(times: PrayerTimes): string {
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  for (const { key } of PRAYER_INFO) {
    const [h, m] = times[key as keyof PrayerTimes].split(":").map(Number);
    if (h * 60 + m > nowMin) return key;
  }
  return "Fajr";
}

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeUntil(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const target = new Date(); target.setHours(h, m, 0, 0);
  if (target <= new Date()) target.setDate(target.getDate() + 1);
  const diff = target.getTime() - Date.now();
  const hh = Math.floor(diff / 3600000);
  const mm = Math.floor((diff % 3600000) / 60000);
  const ss = Math.floor((diff % 60000) / 1000);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

async function fetchPrayerTimes(lat: number, lng: number): Promise<PrayerTimes | null> {
  const today = new Date();
  const d = String(today.getDate()).padStart(2, "0");
  const mo = String(today.getMonth() + 1).padStart(2, "0");
  const y = today.getFullYear();
  try {
    const r = await fetch(`https://api.aladhan.com/v1/timings/${d}-${mo}-${y}?latitude=${lat}&longitude=${lng}&method=11`);
    const j = await r.json();
    return j.data?.timings ?? null;
  } catch { return null; }
}

// ── Ibadah progress ────────────────────────────────────────────────────────

const IBADAH_FARDHU = ["subuh", "dzuhur", "ashar", "maghrib", "isya"] as const;
const IBADAH_LABELS: Record<string, string> = {
  subuh: "Subuh", dzuhur: "Dzuhur", ashar: "Ashar", maghrib: "Maghrib", isya: "Isya",
};

function getTodayLog(): DailyLog | null {
  try {
    const all = JSON.parse(localStorage.getItem("jamaah-ibadah-tracker") || "{}");
    const key = format(new Date(), "yyyy-MM-dd");
    return all[key] ?? null;
  } catch { return null; }
}

// ── Countdown display ──────────────────────────────────────────────────────

function useLiveCountdown(targetDate: string | null): { days: number; h: number; m: number; s: number } {
  const [tick, setTick] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!targetDate) return { days: 0, h: 0, m: 0, s: 0 };
  const target = new Date(targetDate);
  const diff = Math.max(0, target.getTime() - tick);
  const days = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { days, h, m, s };
}

// ── Sub-components ─────────────────────────────────────────────────────────

function CountdownPanel({ departureDate, packageName }: { departureDate: string | null; packageName: string }) {
  const { days, h, m, s } = useLiveCountdown(departureDate);
  const isPast = departureDate ? new Date(departureDate) < new Date() : false;

  if (!departureDate) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 text-center py-2">
        <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <Plane className="h-7 w-7 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Belum Ada Jadwal</p>
          <p className="text-xs text-muted-foreground mt-1">Pesan paket umroh sekarang</p>
        </div>
        <Button size="sm" asChild className="mt-1">
          <Link to="/packages">Lihat Paket</Link>
        </Button>
      </div>
    );
  }

  if (isPast) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 text-center py-2">
        <div className="h-14 w-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Heart className="h-7 w-7 text-amber-600 fill-amber-400" />
        </div>
        <p className="text-sm font-bold text-foreground">Alhamdulillah</p>
        <p className="text-xs text-muted-foreground">Perjalanan telah selesai</p>
        <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Selesai</Badge>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-1.5">
        {[{ v: days, l: "Hari" }, { v: h, l: "Jam" }, { v: m, l: "Menit" }, { v: s, l: "Detik" }].map(({ v, l }) => (
          <div key={l} className="flex flex-col items-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20 py-2">
            <span className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
              {String(v).padStart(2, "0")}
            </span>
            <span className="text-[10px] text-emerald-600/70 dark:text-emerald-500/70 font-medium">{l}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2">
        <Plane className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
        <p className="text-[11px] text-muted-foreground truncate">{packageName}</p>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-1.5">
        <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
        <p className="text-[11px] text-muted-foreground">
          {format(new Date(departureDate), "dd MMMM yyyy", { locale: localeId })}
        </p>
      </div>
    </div>
  );
}

function PrayerPanel({ coords }: { coords: { lat: number; lng: number } | null }) {
  const [countdown, setCountdown] = useState("--:--:--");

  const { data: times, isLoading } = useQuery<PrayerTimes | null>({
    queryKey: ["prayer-widget", coords?.lat, coords?.lng],
    queryFn: () => coords ? fetchPrayerTimes(coords.lat, coords.lng) : Promise.resolve(null),
    enabled: !!coords,
    staleTime: 1000 * 60 * 60,
  });

  const nextKey = times ? getNextPrayer(times) : null;
  const nextInfo = PRAYER_INFO.find(p => p.key === nextKey);

  useEffect(() => {
    if (!times || !nextKey) return;
    const id = setInterval(() => setCountdown(timeUntil(times[nextKey as keyof PrayerTimes])), 1000);
    setCountdown(timeUntil(times[nextKey as keyof PrayerTimes]));
    return () => clearInterval(id);
  }, [times, nextKey]);

  if (isLoading || !coords) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-3">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Memuat waktu sholat...</p>
      </div>
    );
  }

  if (!times) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-3 text-center">
        <RefreshCw className="h-5 w-5 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Gagal memuat. Periksa koneksi.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Next prayer banner */}
      {nextInfo && (
        <div className={cn("flex items-center justify-between rounded-xl px-3 py-2.5", nextInfo.bg, "bg-opacity-10 dark:bg-opacity-20")}>
          <div className="flex items-center gap-2">
            <nextInfo.Icon className={cn("h-4 w-4", nextInfo.text)} />
            <div>
              <p className={cn("text-[11px] font-bold", nextInfo.text)}>Berikutnya: {nextInfo.label}</p>
              <p className="text-[10px] text-muted-foreground">{formatTime(times[nextInfo.key as keyof PrayerTimes])} WIB</p>
            </div>
          </div>
          <span className={cn("font-mono text-sm font-bold tabular-nums", nextInfo.text)}>{countdown}</span>
        </div>
      )}

      {/* Prayer list */}
      <div className="grid gap-1">
        {PRAYER_INFO.map(({ key, label, Icon, text, bg }) => {
          const isNext = key === nextKey;
          return (
            <div key={key} className={cn(
              "flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors",
              isNext ? "bg-primary/8 dark:bg-primary/15 ring-1 ring-primary/20" : "hover:bg-muted/50"
            )}>
              <div className="flex items-center gap-2">
                <div className={cn("flex h-6 w-6 items-center justify-center rounded-md text-white text-[10px]", bg)}>
                  <Icon className="h-3 w-3" />
                </div>
                <span className={cn("text-xs font-medium", isNext ? "text-primary" : "text-foreground")}>{label}</span>
              </div>
              <span className={cn("font-mono text-xs tabular-nums", isNext ? text + " font-bold" : "text-muted-foreground")}>
                {formatTime(times[key as keyof PrayerTimes])}
              </span>
            </div>
          );
        })}
      </div>

      <Link to="/sholat" className="flex items-center justify-center gap-1 text-[11px] text-primary hover:underline mt-0.5">
        Jadwal lengkap <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function IbadahPanel() {
  const [log, setLog] = useState<DailyLog | null>(null);

  useEffect(() => {
    setLog(getTodayLog());
    const id = setInterval(() => setLog(getTodayLog()), 5000);
    return () => clearInterval(id);
  }, []);

  const fardhuDone = IBADAH_FARDHU.filter(k => log?.[k]).length;
  const totalScore = log ? (
    fardhuDone +
    (log.tahajud ? 1 : 0) + (log.dhuha ? 1 : 0) +
    (log.sedekah ? 1 : 0) + (log.muhasabah ? 1 : 0) +
    Math.min(Math.floor(log.quranPages / 2), 3) +
    Math.min(Math.floor((log.tasbih + log.tahmid + log.takbir) / 33), 3)
  ) : 0;
  const maxScore = 14;
  const pct = Math.min(Math.round((totalScore / maxScore) * 100), 100);

  const streak = (() => {
    try {
      const all: Record<string, DailyLog> = JSON.parse(localStorage.getItem("jamaah-ibadah-tracker") || "{}");
      let s = 0;
      let d = new Date();
      while (true) {
        const key = format(d, "yyyy-MM-dd");
        const entry = all[key];
        if (!entry) break;
        const done = IBADAH_FARDHU.filter(k => entry[k]).length;
        if (done === 0) break;
        s++;
        d = new Date(d.getTime() - 86400000);
      }
      return s;
    } catch { return 0; }
  })();

  if (!log) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 text-center py-2">
        <div className="h-14 w-14 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
          <BookOpen className="h-7 w-7 text-violet-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Belum Ada Catatan Hari Ini</p>
          <p className="text-xs text-muted-foreground mt-1">Catat ibadah harian Anda sekarang</p>
        </div>
        <Button size="sm" variant="outline" asChild className="mt-1">
          <Link to="/jamaah/tracker-ibadah">Mulai Catat</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Progress ring + score */}
      <div className="flex items-center gap-4">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
          <svg className="absolute h-16 w-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
            <circle
              cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="6"
              className="text-violet-500"
              strokeDasharray={`${2 * Math.PI * 26}`}
              strokeDashoffset={`${2 * Math.PI * 26 * (1 - pct / 100)}`}
              strokeLinecap="round"
            />
          </svg>
          <span className="text-sm font-bold text-violet-600 dark:text-violet-400">{pct}%</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            {pct >= 80 ? "Luar Biasa! 🌟" : pct >= 50 ? "Terus Semangat! 💪" : "Ayo Mulai! 🤲"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Skor hari ini: {totalScore}/{maxScore}</p>
          {streak > 1 && (
            <div className="flex items-center gap-1 mt-1">
              <Flame className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-xs font-bold text-orange-600">{streak} hari beruntun</span>
            </div>
          )}
        </div>
      </div>

      {/* Shalat fardhu checklist */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Shalat Fardhu</p>
        <div className="flex gap-1.5">
          {IBADAH_FARDHU.map(k => {
            const done = !!log[k];
            return (
              <div key={k} className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 border transition-colors",
                done ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800" : "bg-muted/30 border-border"
              )}>
                <CheckCircle2 className={cn("h-4 w-4", done ? "text-emerald-500" : "text-muted-foreground/30")} />
                <span className={cn("text-[9px] font-medium", done ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground")}>
                  {IBADAH_LABELS[k]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-1.5 text-center">
        <div className="rounded-lg bg-muted/40 py-1.5">
          <p className="text-sm font-bold text-violet-600">{log.quranPages}</p>
          <p className="text-[10px] text-muted-foreground">Hal. Quran</p>
        </div>
        <div className="rounded-lg bg-muted/40 py-1.5">
          <p className="text-sm font-bold text-amber-600">{log.tasbih + log.tahmid + log.takbir}</p>
          <p className="text-[10px] text-muted-foreground">Dzikir</p>
        </div>
        <div className="rounded-lg bg-muted/40 py-1.5">
          <p className="text-sm font-bold text-rose-600">{log.sedekah ? "✓" : "–"}</p>
          <p className="text-[10px] text-muted-foreground">Sedekah</p>
        </div>
      </div>

      <Link to="/jamaah/tracker-ibadah"
        className="flex items-center justify-center gap-1 text-[11px] text-primary hover:underline">
        Catat lebih lengkap <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ── Main Widget ────────────────────────────────────────────────────────────

export function JamaahTrackerWidget() {
  const { user } = useAuth();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState<string>("Lokasi Anda");
  const [activeTab, setActiveTab] = useState<"countdown" | "prayer" | "ibadah">("countdown");

  // Get user's geolocation
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`)
          .then(r => r.json())
          .then(d => setLocationName(d.address?.city || d.address?.town || d.address?.county || "Lokasi Anda"))
          .catch(() => {});
      },
      () => setCoords({ lat: -6.2088, lng: 106.8456 }) // Jakarta default
    );
  }, []);

  // Fetch user's upcoming booking
  const { data: booking } = useQuery({
    queryKey: ["my-next-booking", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("bookings")
        .select("id, departures(departure_date, packages(name))")
        .eq("customer_id", user.id)
        .in("status", ["confirmed", "paid", "pending"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      return data ?? null;
    },
    enabled: !!user?.id,
  });

  // Hanya tampilkan untuk tamu (belum login)
  // Pengguna yang sudah login mengakses fitur ini via Portal Jamaah
  if (user) return null;

  const dep = (booking as any)?.departures;
  const departureDate = dep?.departure_date ?? null;
  const packageName = dep?.packages?.name ?? "Paket Umroh";

  const TABS = [
    { id: "countdown" as const, label: "Keberangkatan", Icon: Plane },
    { id: "prayer" as const, label: "Sholat", Icon: Moon },
    { id: "ibadah" as const, label: "Ibadah", Icon: Sparkles },
  ];

  return (
    <section className="container mx-auto px-4 py-6">
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-500 fill-rose-400" />
              Tracker Jamaah
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <MapPin className="h-3 w-3" />{locationName}
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-xs h-8 gap-1">
            <Link to="/jamaah">
              Portal Jamaah <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-border">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all border-b-2",
                activeTab === id
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Panel content */}
        <div className="p-4 min-h-[180px]">
          {activeTab === "countdown" && (
            <CountdownPanel departureDate={departureDate} packageName={packageName} />
          )}
          {activeTab === "prayer" && (
            <PrayerPanel coords={coords} />
          )}
          {activeTab === "ibadah" && (
            <IbadahPanel />
          )}
        </div>

        {/* Footer quick links */}
        <div className="flex border-t border-border divide-x divide-border">
          {[
            { href: "/jamaah/documents", label: "Dokumen" },
            { href: "/jamaah/manasik", label: "Manasik" },
            { href: "/jamaah/doa-panduan", label: "Doa" },
            { href: "/my-bookings", label: "Booking" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              to={href}
              className="flex flex-1 items-center justify-center py-2.5 text-[11px] font-medium text-muted-foreground hover:text-primary hover:bg-muted/30 transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
