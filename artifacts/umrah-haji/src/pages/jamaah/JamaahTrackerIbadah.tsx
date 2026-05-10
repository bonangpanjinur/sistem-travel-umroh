import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft, ChevronRight, Flame, Star, BarChart3,
  CalendarDays, CheckCircle2, Plus, Minus, BookOpen,
  Heart, Moon, Sun, Sunrise, Sunset, Clock, Trophy,
  Scroll, Coins, Utensils
} from "lucide-react";
import { format, subDays, addDays, parseISO, isSameDay, differenceInDays, startOfDay } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────
interface DailyLog {
  // Shalat fardhu
  subuh: boolean;
  dzuhur: boolean;
  ashar: boolean;
  maghrib: boolean;
  isya: boolean;
  // Shalat sunnah
  tahajud: boolean;
  dhuha: boolean;
  rawatibQabli: boolean;
  rawatibBadi: boolean;
  // Tawaf & Sa'i
  tawafRounds: number;   // jumlah putaran (per 7 = 1 tawaf)
  saiTrips: number;      // jumlah perjalanan (per 7 = 1 sa'i)
  // Zikir & Wirid
  tasbih: number;        // x33 (subhanallah)
  tahmid: number;        // x33 (alhamdulillah)
  takbir: number;        // x33 (allahu akbar)
  istighfar: number;     // x100
  shalawat: number;      // x100
  // Al-Qur'an
  quranPages: number;
  // Lainnya
  sedekah: boolean;
  puasaSunnah: boolean;
  muhasabah: boolean;    // refleksi/muhasabah malam
  // Metadata
  savedAt: string;
}

const DEFAULT_LOG: DailyLog = {
  subuh: false, dzuhur: false, ashar: false, maghrib: false, isya: false,
  tahajud: false, dhuha: false, rawatibQabli: false, rawatibBadi: false,
  tawafRounds: 0, saiTrips: 0,
  tasbih: 0, tahmid: 0, takbir: 0, istighfar: 0, shalawat: 0,
  quranPages: 0,
  sedekah: false, puasaSunnah: false, muhasabah: false,
  savedAt: "",
};

const STORAGE_KEY = "jamaah-ibadah-tracker";

function getDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function loadAllLogs(): Record<string, DailyLog> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveLog(dateKey: string, log: DailyLog) {
  const all = loadAllLogs();
  all[dateKey] = { ...log, savedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function scoreLog(log: DailyLog): number {
  let score = 0;
  // Fardhu (5 pts each = 25)
  if (log.subuh) score += 5;
  if (log.dzuhur) score += 5;
  if (log.ashar) score += 5;
  if (log.maghrib) score += 5;
  if (log.isya) score += 5;
  // Sunnah (3 pts each = 12)
  if (log.tahajud) score += 4;
  if (log.dhuha) score += 3;
  if (log.rawatibQabli) score += 2;
  if (log.rawatibBadi) score += 2;
  // Tawaf & Sa'i (3 pts per completion)
  score += Math.floor(log.tawafRounds / 7) * 3;
  score += Math.floor(log.saiTrips / 7) * 3;
  // Zikir (1 pt each set)
  if (log.tasbih > 0) score += 2;
  if (log.tahmid > 0) score += 2;
  if (log.takbir > 0) score += 2;
  if (log.istighfar > 0) score += 2;
  if (log.shalawat > 0) score += 2;
  // Qur'an (2 pts per halaman)
  score += Math.min(log.quranPages * 2, 20);
  // Lainnya
  if (log.sedekah) score += 3;
  if (log.puasaSunnah) score += 5;
  if (log.muhasabah) score += 2;
  return score;
}

const MAX_SCORE = 100;

// ── Sub-components ─────────────────────────────────────────────────────────
function CounterRow({
  label, emoji, value, onInc, onDec, unit, max,
}: {
  label: string; emoji: string; value: number;
  onInc: () => void; onDec: () => void; unit?: string; max?: number;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-2.5">
        <span className="text-xl">{emoji}</span>
        <div>
          <p className="text-sm font-medium">{label}</p>
          {unit && <p className="text-xs text-muted-foreground">{unit}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onDec}
          disabled={value <= 0}
          className="w-8 h-8 rounded-full border flex items-center justify-center disabled:opacity-30 hover:bg-muted transition-colors"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-10 text-center font-bold tabular-nums text-base">{value}</span>
        <button
          onClick={onInc}
          disabled={max !== undefined && value >= max}
          className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function CheckRow({
  label, emoji, checked, onToggle, sublabel,
}: {
  label: string; emoji: string; checked: boolean; onToggle: () => void; sublabel?: string;
}) {
  return (
    <label className="flex items-center gap-3 py-2.5 cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={onToggle} className="h-5 w-5" />
      <span className="text-xl">{emoji}</span>
      <div className="flex-1">
        <p className={cn("text-sm font-medium", checked && "text-primary")}>{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
      </div>
      {checked && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
    </label>
  );
}

// ── Week bar chart (pure CSS) ───────────────────────────────────────────────
function WeekChart({ logs }: { logs: Record<string, DailyLog> }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i));

  return (
    <div className="flex items-end gap-2 h-24 px-1">
      {days.map((day) => {
        const key = getDateKey(day);
        const log = logs[key];
        const score = log ? scoreLog(log) : 0;
        const pct = Math.round((score / MAX_SCORE) * 100);
        const isToday = isSameDay(day, today);
        return (
          <div key={key} className="flex-1 flex flex-col items-center gap-1">
            <p className="text-[10px] font-bold text-muted-foreground">{pct > 0 ? `${pct}` : ""}</p>
            <div className="w-full flex flex-col justify-end rounded-t-md overflow-hidden" style={{ height: "60px" }}>
              <div
                className={cn(
                  "w-full rounded-t-md transition-all",
                  isToday ? "bg-primary" : pct >= 70 ? "bg-green-400" : pct >= 40 ? "bg-amber-400" : pct > 0 ? "bg-muted-foreground/30" : "bg-muted/50"
                )}
                style={{ height: `${Math.max(pct, 4)}%` }}
              />
            </div>
            <p className={cn("text-[10px]", isToday ? "text-primary font-bold" : "text-muted-foreground")}>
              {format(day, "EEE", { locale: localeId }).slice(0, 3)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ── Mini calendar ──────────────────────────────────────────────────────────
function MiniCalendar({ logs, selectedDate, onSelectDate }: {
  logs: Record<string, DailyLog>;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
}) {
  const today = new Date();
  const days = Array.from({ length: 14 }, (_, i) => subDays(today, 13 - i));

  return (
    <div className="grid grid-cols-7 gap-1">
      {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => (
        <p key={d} className="text-center text-[10px] text-muted-foreground font-medium py-1">{d}</p>
      ))}
      {/* empty cells for alignment based on first day */}
      {Array.from({ length: days[0].getDay() }).map((_, i) => (
        <div key={`empty-${i}`} />
      ))}
      {days.map((day) => {
        const key = getDateKey(day);
        const log = logs[key];
        const score = log ? scoreLog(log) : 0;
        const pct = (score / MAX_SCORE) * 100;
        const isSelected = isSameDay(day, selectedDate);
        const isToday = isSameDay(day, today);
        const isFuture = day > today;
        return (
          <button
            key={key}
            onClick={() => !isFuture && onSelectDate(day)}
            disabled={isFuture}
            className={cn(
              "aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all relative",
              isSelected && "ring-2 ring-primary",
              isToday && !isSelected && "border border-primary text-primary",
              isFuture && "opacity-30",
              !isFuture && !isSelected && "hover:bg-muted"
            )}
          >
            <div
              className={cn(
                "absolute inset-0 rounded-lg",
                pct >= 80 ? "bg-green-400/30" : pct >= 50 ? "bg-amber-400/20" : pct > 0 ? "bg-muted/60" : ""
              )}
            />
            <span className="relative z-10">{format(day, "d")}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Streak counter ─────────────────────────────────────────────────────────
function calcStreak(logs: Record<string, DailyLog>): number {
  const today = new Date();
  let streak = 0;
  let day = today;
  while (true) {
    const key = getDateKey(day);
    const log = logs[key];
    if (!log || scoreLog(log) === 0) break;
    streak++;
    day = subDays(day, 1);
  }
  return streak;
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function JamaahTrackerIbadah() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [allLogs, setAllLogs] = useState<Record<string, DailyLog>>(loadAllLogs);
  const [log, setLog] = useState<DailyLog>(() => {
    const all = loadAllLogs();
    return all[getDateKey(today)] || { ...DEFAULT_LOG };
  });

  // Sync log when date changes
  useEffect(() => {
    const key = getDateKey(selectedDate);
    setLog(allLogs[key] || { ...DEFAULT_LOG });
  }, [selectedDate, allLogs]);

  const isToday = isSameDay(selectedDate, today);
  const isFuture = selectedDate > today;

  const updateLog = useCallback((updater: (prev: DailyLog) => DailyLog) => {
    if (!isToday) return;
    setLog((prev) => {
      const next = updater(prev);
      const key = getDateKey(selectedDate);
      saveLog(key, next);
      setAllLogs(loadAllLogs());
      return next;
    });
  }, [isToday, selectedDate]);

  const toggle = (field: keyof DailyLog) => {
    updateLog((p) => ({ ...p, [field]: !p[field] }));
  };

  const inc = (field: keyof DailyLog, step = 1, max?: number) => {
    updateLog((p) => {
      const cur = (p[field] as number) || 0;
      if (max !== undefined && cur >= max) return p;
      return { ...p, [field]: cur + step };
    });
  };

  const dec = (field: keyof DailyLog, step = 1) => {
    updateLog((p) => {
      const cur = (p[field] as number) || 0;
      if (cur <= 0) return p;
      return { ...p, [field]: Math.max(0, cur - step) };
    });
  };

  const score = scoreLog(log);
  const scorePct = Math.min(Math.round((score / MAX_SCORE) * 100), 100);
  const streak = calcStreak(allLogs);
  const fardhuCount = [log.subuh, log.dzuhur, log.ashar, log.maghrib, log.isya].filter(Boolean).length;

  const goDate = (dir: -1 | 1) => {
    const next = dir === -1 ? subDays(selectedDate, 1) : addDays(selectedDate, 1);
    if (next > today) return;
    setSelectedDate(next);
  };

  const scoreLabel = scorePct >= 90 ? "Luar Biasa! 🌟" : scorePct >= 70 ? "Bagus! ✨" : scorePct >= 50 ? "Cukup Baik 👍" : scorePct >= 30 ? "Terus Semangat 💪" : "Mulai Catat Ibadah";
  const scoreColor = scorePct >= 70 ? "text-green-600" : scorePct >= 40 ? "text-amber-600" : "text-muted-foreground";

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-primary text-white p-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link to="/jamaah" className="p-1 rounded-lg hover:bg-white/20 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Star className="h-5 w-5" /> Tracker Ibadah Harian
            </h1>
            <p className="text-white/80 text-xs">Catat amal ibadah selama di Tanah Suci</p>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1 bg-white/20 rounded-xl px-2.5 py-1">
              <Flame className="h-4 w-4 text-orange-300" />
              <span className="text-sm font-bold">{streak}</span>
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="catat">
        <TabsList className="w-full rounded-none border-b h-11 bg-background sticky top-[68px] z-10">
          <TabsTrigger value="catat" className="flex-1 gap-1.5 text-sm">
            <CheckCircle2 className="h-4 w-4" /> Catat
          </TabsTrigger>
          <TabsTrigger value="progres" className="flex-1 gap-1.5 text-sm">
            <BarChart3 className="h-4 w-4" /> Progres
          </TabsTrigger>
          <TabsTrigger value="kalender" className="flex-1 gap-1.5 text-sm">
            <CalendarDays className="h-4 w-4" /> Kalender
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════
            TAB CATAT
        ═══════════════════════════════════════════════════════ */}
        <TabsContent value="catat" className="mt-0">
          {/* Date navigator */}
          <div className="bg-background border-b px-4 py-2 flex items-center justify-between">
            <button onClick={() => goDate(-1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold">
                {isToday ? "Hari Ini" : format(selectedDate, "EEEE", { locale: localeId })}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(selectedDate, "d MMMM yyyy", { locale: localeId })}
              </p>
            </div>
            <button
              onClick={() => goDate(1)}
              disabled={isToday}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Score summary */}
          <div className="p-4">
            <Card className={cn(
              "border-0",
              scorePct >= 70 ? "bg-green-50" : scorePct >= 40 ? "bg-amber-50" : "bg-muted/40"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className={cn("text-2xl font-bold", scoreColor)}>{scorePct}%</p>
                    <p className={cn("text-sm font-medium", scoreColor)}>{scoreLabel}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Shalat Fardhu</p>
                    <p className="font-bold text-lg">{fardhuCount}/5</p>
                  </div>
                </div>
                <Progress value={scorePct} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1.5">Skor hari ini: {score} / {MAX_SCORE}</p>
              </CardContent>
            </Card>

            {isFuture && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mt-3 text-sm text-amber-800 text-center">
                Catatan untuk tanggal mendatang belum tersedia
              </div>
            )}

            {!isToday && !isFuture && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 mt-3 text-xs text-blue-800 text-center">
                Melihat catatan {format(selectedDate, "d MMM yyyy", { locale: localeId })} — hanya bisa edit hari ini
              </div>
            )}
          </div>

          <div className="px-4 space-y-3 pb-4">
            {/* Shalat Fardhu */}
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Moon className="h-4 w-4 text-indigo-500" /> Shalat Fardhu
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 divide-y">
                {[
                  { field: "subuh" as const, label: "Subuh", emoji: "🌅", sub: "2 rakaat" },
                  { field: "dzuhur" as const, label: "Dzuhur", emoji: "☀️", sub: "4 rakaat" },
                  { field: "ashar" as const, label: "Ashar", emoji: "🌤️", sub: "4 rakaat" },
                  { field: "maghrib" as const, label: "Maghrib", emoji: "🌇", sub: "3 rakaat" },
                  { field: "isya" as const, label: "Isya", emoji: "🌙", sub: "4 rakaat" },
                ].map(({ field, label, emoji, sub }) => (
                  <CheckRow
                    key={field}
                    label={label}
                    emoji={emoji}
                    sublabel={sub}
                    checked={log[field] as boolean}
                    onToggle={() => toggle(field)}
                  />
                ))}
              </CardContent>
            </Card>

            {/* Shalat Sunnah */}
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sunrise className="h-4 w-4 text-amber-500" /> Shalat Sunnah
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 divide-y">
                {[
                  { field: "tahajud" as const, label: "Tahajud", emoji: "🌃", sub: "Min. 2 rakaat setelah tengah malam" },
                  { field: "dhuha" as const, label: "Dhuha", emoji: "🌞", sub: "2–12 rakaat pagi hari" },
                  { field: "rawatibQabli" as const, label: "Rawatib Qabli", emoji: "⬆️", sub: "Sebelum shalat fardhu" },
                  { field: "rawatibBadi" as const, label: "Rawatib Ba'di", emoji: "⬇️", sub: "Setelah shalat fardhu" },
                ].map(({ field, label, emoji, sub }) => (
                  <CheckRow
                    key={field}
                    label={label}
                    emoji={emoji}
                    sublabel={sub}
                    checked={log[field] as boolean}
                    onToggle={() => toggle(field)}
                  />
                ))}
              </CardContent>
            </Card>

            {/* Tawaf & Sa'i */}
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  🕋 Tawaf & Sa'i
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 divide-y">
                <CounterRow
                  label="Putaran Tawaf"
                  emoji="🕋"
                  value={log.tawafRounds}
                  onInc={() => inc("tawafRounds")}
                  onDec={() => dec("tawafRounds")}
                  unit={`${Math.floor(log.tawafRounds / 7)} tawaf lengkap · ${log.tawafRounds % 7} putaran`}
                />
                <CounterRow
                  label="Perjalanan Sa'i"
                  emoji="🏃"
                  value={log.saiTrips}
                  onInc={() => inc("saiTrips")}
                  onDec={() => dec("saiTrips")}
                  unit={`${Math.floor(log.saiTrips / 7)} sa'i lengkap · ${log.saiTrips % 7} perjalanan`}
                />
              </CardContent>
            </Card>

            {/* Zikir & Wirid */}
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  📿 Zikir & Wirid
                  <span className="text-xs text-muted-foreground font-normal">(jumlah set x33 / x100)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 divide-y">
                <CounterRow label="Tasbih (SubhanaAllah)" emoji="✨" value={log.tasbih}
                  onInc={() => inc("tasbih")} onDec={() => dec("tasbih")} unit={`${log.tasbih * 33} kali`} />
                <CounterRow label="Tahmid (Alhamdulillah)" emoji="🙏" value={log.tahmid}
                  onInc={() => inc("tahmid")} onDec={() => dec("tahmid")} unit={`${log.tahmid * 33} kali`} />
                <CounterRow label="Takbir (Allahu Akbar)" emoji="🌙" value={log.takbir}
                  onInc={() => inc("takbir")} onDec={() => dec("takbir")} unit={`${log.takbir * 33} kali`} />
                <CounterRow label="Istighfar (Astaghfirullah)" emoji="💙" value={log.istighfar}
                  onInc={() => inc("istighfar")} onDec={() => dec("istighfar")} unit={`${log.istighfar * 100} kali`} />
                <CounterRow label="Shalawat Nabi" emoji="🌿" value={log.shalawat}
                  onInc={() => inc("shalawat")} onDec={() => dec("shalawat")} unit={`${log.shalawat * 100} kali`} />
              </CardContent>
            </Card>

            {/* Al-Qur'an */}
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-emerald-600" /> Tilawah Al-Qur'an
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <CounterRow label="Halaman dibaca" emoji="📖" value={log.quranPages}
                  onInc={() => inc("quranPages")} onDec={() => dec("quranPages")}
                  unit={log.quranPages > 0 ? `≈ ${(log.quranPages / 20).toFixed(1)} juz` : "0 halaman"} />
              </CardContent>
            </Card>

            {/* Amal Lainnya */}
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Heart className="h-4 w-4 text-rose-500" /> Amal Lainnya
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 divide-y">
                <CheckRow label="Sedekah" emoji="🤲" sublabel="Bersedekah kepada sesama jamaah atau orang sekitar"
                  checked={log.sedekah} onToggle={() => toggle("sedekah")} />
                <CheckRow label="Puasa Sunnah" emoji="🌙" sublabel="Puasa Senin-Kamis atau puasa sunnah lainnya"
                  checked={log.puasaSunnah} onToggle={() => toggle("puasaSunnah")} />
                <CheckRow label="Muhasabah Malam" emoji="📔" sublabel="Refleksi diri dan evaluasi ibadah hari ini"
                  checked={log.muhasabah} onToggle={() => toggle("muhasabah")} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════
            TAB PROGRES
        ═══════════════════════════════════════════════════════ */}
        <TabsContent value="progres" className="mt-0 p-4 space-y-4">
          {/* Streak & stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="text-center">
              <CardContent className="p-3">
                <div className="flex justify-center mb-1">
                  <Flame className="h-5 w-5 text-orange-500" />
                </div>
                <p className="text-2xl font-bold">{streak}</p>
                <p className="text-[10px] text-muted-foreground">Streak hari</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-3">
                <div className="flex justify-center mb-1">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                </div>
                <p className="text-2xl font-bold">{Object.keys(allLogs).filter(k => scoreLog(allLogs[k]) > 0).length}</p>
                <p className="text-[10px] text-muted-foreground">Hari tercatat</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-3">
                <div className="flex justify-center mb-1">
                  <Star className="h-5 w-5 text-primary" />
                </div>
                <p className="text-2xl font-bold">{scorePct}%</p>
                <p className="text-[10px] text-muted-foreground">Skor hari ini</p>
              </CardContent>
            </Card>
          </div>

          {/* Weekly chart */}
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-sm">Grafik 7 Hari Terakhir</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <WeekChart logs={allLogs} />
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-400" /> ≥ 70%</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-400" /> 40–70%</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-muted-foreground/30" /> &lt; 40%</div>
              </div>
            </CardContent>
          </Card>

          {/* Breakdown today */}
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-sm">Rincian Ibadah Hari Ini</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {[
                { label: "Shalat Fardhu", value: fardhuCount, max: 5, color: "bg-indigo-500" },
                { label: "Shalat Sunnah", value: [log.tahajud, log.dhuha, log.rawatibQabli, log.rawatibBadi].filter(Boolean).length, max: 4, color: "bg-amber-500" },
                { label: "Tawaf (putaran)", value: log.tawafRounds, max: 7, color: "bg-emerald-500" },
                { label: "Al-Qur'an (halaman)", value: log.quranPages, max: 20, color: "bg-green-600" },
                { label: "Zikir (set)", value: log.tasbih + log.tahmid + log.takbir + log.istighfar + log.shalawat, max: 10, color: "bg-purple-500" },
              ].map(({ label, value, max, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold">{value}/{max}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", color)}
                      style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Motivational quote */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex gap-3">
              <Scroll className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-primary mb-1">Hadits Motivasi</p>
                <p className="text-xs text-muted-foreground italic">
                  "Amalan yang paling dicintai oleh Allah adalah amalan yang paling konsisten meskipun sedikit."
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">— HR. Bukhari & Muslim</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════
            TAB KALENDER
        ═══════════════════════════════════════════════════════ */}
        <TabsContent value="kalender" className="mt-0 p-4 space-y-4">
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-sm">14 Hari Terakhir</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <MiniCalendar
                logs={allLogs}
                selectedDate={selectedDate}
                onSelectDate={(d) => { setSelectedDate(d); }}
              />
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-400/30 border border-green-400" /> ≥ 80%</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-400/20 border border-amber-400" /> 50–79%</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-muted/60" /> Ada catatan</div>
              </div>
            </CardContent>
          </Card>

          {/* Selected day detail */}
          {!isFuture && (
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-sm">
                  {isToday ? "Hari Ini" : format(selectedDate, "d MMMM yyyy", { locale: localeId })}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {scoreLog(allLogs[getDateKey(selectedDate)] || DEFAULT_LOG) === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Belum ada catatan ibadah</p>
                ) : (
                  <div className="space-y-2">
                    {(() => {
                      const l = allLogs[getDateKey(selectedDate)] || DEFAULT_LOG;
                      const items = [
                        { label: `Shalat Fardhu`, val: `${[l.subuh, l.dzuhur, l.ashar, l.maghrib, l.isya].filter(Boolean).length}/5`, show: true },
                        { label: "Tahajud", val: "✅", show: l.tahajud },
                        { label: "Dhuha", val: "✅", show: l.dhuha },
                        { label: "Tawaf", val: `${l.tawafRounds} putaran`, show: l.tawafRounds > 0 },
                        { label: "Sa'i", val: `${l.saiTrips} perjalanan`, show: l.saiTrips > 0 },
                        { label: "Al-Qur'an", val: `${l.quranPages} halaman`, show: l.quranPages > 0 },
                        { label: "Zikir (set)", val: `${l.tasbih + l.tahmid + l.takbir + l.istighfar + l.shalawat}`, show: l.tasbih + l.tahmid + l.takbir > 0 },
                        { label: "Sedekah", val: "✅", show: l.sedekah },
                        { label: "Puasa Sunnah", val: "✅", show: l.puasaSunnah },
                        { label: "Muhasabah", val: "✅", show: l.muhasabah },
                      ].filter(i => i.show);
                      return items.map(({ label, val }) => (
                        <div key={label} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium">{val}</span>
                        </div>
                      ));
                    })()}
                    <Separator className="my-2" />
                    <div className="flex justify-between text-sm font-bold">
                      <span>Skor Hari Ini</span>
                      <span className={cn(
                        scorePct >= 70 ? "text-green-600" : scorePct >= 40 ? "text-amber-600" : "text-muted-foreground"
                      )}>
                        {Math.round((scoreLog(allLogs[getDateKey(selectedDate)] || DEFAULT_LOG) / MAX_SCORE) * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <JamaahBottomNav />
    </div>
  );
}
