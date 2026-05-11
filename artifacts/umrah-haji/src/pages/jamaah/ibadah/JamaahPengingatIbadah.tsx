import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Bell, BellOff, ChevronLeft, MapPin, Clock, CheckCircle2,
  Sparkles, AlarmClock, BookOpen, GraduationCap, TriangleAlert,
  RefreshCw, BellRing, Play,
} from "lucide-react";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { cn } from "@/lib/utils";
import { useIbadahReminder, type PrayerKey, type ReminderCity } from "@/hooks/useIbadahReminder";

// ── Minutes-before selector ────────────────────────────────────────────────
const MINUTES_OPTIONS = [5, 10, 15, 20, 30] as const;

// ── City config ─────────────────────────────────────────────────────────────
const CITIES: { id: ReminderCity; label: string; flag: string }[] = [
  { id: "makkah",  label: "Makkah",  flag: "🕋" },
  { id: "madinah", label: "Madinah", flag: "🕌" },
];

// ── Type badge ───────────────────────────────────────────────────────────────
const TYPE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  shalat:  { bg: "bg-emerald-50",  text: "text-emerald-700", label: "Shalat"  },
  adzan:   { bg: "bg-teal-50",     text: "text-teal-700",    label: "Adzan"   },
  zikir:   { bg: "bg-amber-50",    text: "text-amber-700",   label: "Zikir"   },
  manasik: { bg: "bg-indigo-50",   text: "text-indigo-700",  label: "Manasik" },
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function JamaahPengingatIbadah() {
  const {
    settings,
    setSettings,
    permission,
    prayerTimes,
    loadingPrayer,
    scheduled,
    prayerList,
    enable,
    disable,
    togglePrayer,
    testNotification,
    requestPermission,
  } = useIbadahReminder();

  const [enabling, setEnabling] = useState(false);

  const handleToggleEnabled = async () => {
    if (settings.enabled) {
      disable();
      return;
    }
    setEnabling(true);
    await enable();
    setEnabling(false);
  };

  const todayScheduled = scheduled.filter((r) => !r.triggered);
  const triggeredToday = scheduled.filter((r) => r.triggered);

  return (
    <div className="min-h-screen bg-background pb-28 md:ml-60">
      {/* ── Header ── */}
      <div className="bg-primary text-primary-foreground px-4 py-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link to="/jamaah">
            <Button variant="ghost" size="icon" className="text-primary-foreground h-8 w-8">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-semibold text-base">Pengingat Ibadah</h1>
            <p className="text-xs opacity-75">Notifikasi otomatis shalat, zikir &amp; manasik</p>
          </div>
          <div className="ml-auto">
            {settings.enabled ? (
              <Badge className="bg-emerald-500/20 text-emerald-100 border-emerald-400/30 text-xs">
                <BellRing className="h-3 w-3 mr-1" />
                Aktif
              </Badge>
            ) : (
              <Badge variant="outline" className="border-white/30 text-white/70 text-xs">
                <BellOff className="h-3 w-3 mr-1" />
                Nonaktif
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">

        {/* ── Permission Warning ── */}
        {permission === "denied" && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 flex gap-3 items-start">
              <TriangleAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">Notifikasi Diblokir</p>
                <p className="text-xs text-red-600 mt-1">
                  Aktifkan notifikasi di pengaturan browser Anda, lalu muat ulang halaman ini.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Master Toggle ── */}
        <Card className={cn(
          "border-2 transition-colors",
          settings.enabled ? "border-emerald-200 bg-emerald-50/40" : "border-border"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center",
                  settings.enabled ? "bg-emerald-100" : "bg-muted"
                )}>
                  {settings.enabled
                    ? <BellRing className="h-5 w-5 text-emerald-600" />
                    : <Bell className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div>
                  <p className="font-semibold text-sm">Pengingat Ibadah</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {settings.enabled
                      ? "Pengingat sedang berjalan"
                      : "Ketuk untuk mengaktifkan"}
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={handleToggleEnabled}
                disabled={enabling || permission === "denied"}
              />
            </div>

            {!settings.enabled && permission !== "denied" && (
              <Button
                className="w-full mt-3"
                onClick={handleToggleEnabled}
                disabled={enabling}
              >
                {enabling ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4 mr-2" />
                )}
                {enabling ? "Mengaktifkan…" : "Aktifkan Pengingat"}
              </Button>
            )}

            {settings.enabled && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3 text-xs"
                onClick={testNotification}
              >
                <Play className="h-3.5 w-3.5 mr-1.5" />
                Kirim Notifikasi Tes
              </Button>
            )}
          </CardContent>
        </Card>

        {/* ── City Selector ── */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Lokasi Ibadah
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex gap-2">
              {CITIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSettings((prev) => ({ ...prev, city: c.id }))}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-all",
                    settings.city === c.id
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  <span>{c.flag}</span>
                  {c.label}
                </button>
              ))}
            </div>
            {prayerTimes && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Jadwal sholat hari ini telah dimuat ✓
              </p>
            )}
            {loadingPrayer && (
              <p className="text-xs text-muted-foreground mt-2 text-center flex items-center justify-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" /> Memuat jadwal sholat…
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Minutes Before ── */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlarmClock className="h-4 w-4 text-primary" />
              Pengingat Sebelum Shalat
            </CardTitle>
            <CardDescription className="text-xs">
              Berapa menit sebelum waktu shalat Anda ingin diingatkan?
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex gap-2 flex-wrap">
              {MINUTES_OPTIONS.map((min) => (
                <button
                  key={min}
                  onClick={() => setSettings((prev) => ({ ...prev, minutesBefore: min }))}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium border transition-all",
                    settings.minutesBefore === min
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  {min} mnt
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Prayer Toggles ── */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Shalat Fardhu
            </CardTitle>
            <CardDescription className="text-xs">
              Pilih shalat mana yang ingin diingatkan
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1">
            {prayerList.map((p, i) => (
              <div key={p.key}>
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-lg w-7 text-center">{p.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{p.label}</p>
                      <p className="text-xs text-muted-foreground">{p.time}</p>
                    </div>
                  </div>
                  <Switch
                    checked={p.enabled}
                    onCheckedChange={() => togglePrayer(p.key as PrayerKey)}
                    disabled={!settings.enabled}
                  />
                </div>
                {i < prayerList.length - 1 && <Separator className="opacity-50" />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── Adzan Toggle ── */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                  <BellRing className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Notifikasi Tepat Adzan</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pengingat saat tiba waktu shalat
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.adzan}
                onCheckedChange={(v) => setSettings((prev) => ({ ...prev, adzan: v }))}
                disabled={!settings.enabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Zikir Toggles ── */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Zikir &amp; Wirid
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1">
            {/* Zikir Pagi */}
            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <span className="text-lg w-7 text-center">🌅</span>
                <div>
                  <p className="text-sm font-medium">Zikir Pagi</p>
                  <p className="text-xs text-muted-foreground">30 menit setelah Subuh</p>
                </div>
              </div>
              <Switch
                checked={settings.zikirPagi}
                onCheckedChange={(v) => setSettings((prev) => ({ ...prev, zikirPagi: v }))}
                disabled={!settings.enabled}
              />
            </div>
            <Separator className="opacity-50" />
            {/* Zikir Petang */}
            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <span className="text-lg w-7 text-center">🌆</span>
                <div>
                  <p className="text-sm font-medium">Zikir Petang</p>
                  <p className="text-xs text-muted-foreground">30 menit setelah Ashar</p>
                </div>
              </div>
              <Switch
                checked={settings.zikirPetang}
                onCheckedChange={(v) => setSettings((prev) => ({ ...prev, zikirPetang: v }))}
                disabled={!settings.enabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Manasik Toggle ── */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Pengingat Manasik</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    1 jam sebelum jadwal manasik dimulai
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.manasik}
                onCheckedChange={(v) => setSettings((prev) => ({ ...prev, manasik: v }))}
                disabled={!settings.enabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Today's Schedule ── */}
        {settings.enabled && scheduled.length > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Jadwal Hari Ini
              </CardTitle>
              <CardDescription className="text-xs">
                {todayScheduled.length} pengingat aktif · {triggeredToday.length} sudah terkirim
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {scheduled.map((r) => {
                const ts = TYPE_STYLE[r.type] ?? TYPE_STYLE.shalat;
                return (
                  <div
                    key={r.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2.5 border transition-opacity",
                      r.triggered
                        ? "opacity-50 bg-muted border-transparent"
                        : "bg-background border-border"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      {r.triggered
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        : <AlarmClock className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <div>
                        <p className="text-sm font-medium leading-tight">{r.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.time}
                          {r.minutesBefore ? ` · ${r.minutesBefore} mnt sebelum` : ""}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn("text-[10px] font-semibold border-0", ts.bg, ts.text)}
                    >
                      {ts.label}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* ── Empty state when disabled ── */}
        {!settings.enabled && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-semibold text-base mb-1">Pengingat Belum Aktif</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Aktifkan pengingat untuk mendapatkan notifikasi waktu shalat, zikir pagi &amp; petang,
                serta jadwal manasik secara otomatis.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Info card ── */}
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-4 flex gap-3 items-start">
            <Bell className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700 space-y-1">
              <p className="font-semibold">Cara kerja pengingat</p>
              <p>Notifikasi dijadwalkan otomatis setiap hari menggunakan jam perangkat Anda. Pengingat aktif selama browser atau aplikasi berjalan di latar belakang.</p>
              <p className="mt-1">Untuk manasik, tambahkan jadwal di halaman <Link to="/jamaah/manasik" className="underline font-medium">Manasik Digital</Link> terlebih dahulu.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <JamaahBottomNav />
    </div>
  );
}
