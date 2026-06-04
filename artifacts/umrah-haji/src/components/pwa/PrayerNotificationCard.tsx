import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Bell, BellRing, ChevronDown, ChevronUp,
  Clock, CheckCircle2, AlertCircle, Loader2, TestTube
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIbadahReminder } from "@/hooks/useIbadahReminder";
import type { PrayerKey, PrayerTimes } from "@/hooks/useIbadahReminder";

const MINUTES_OPTIONS = [5, 10, 15, 20, 30];

interface Props {
  prayerTimes?: PrayerTimes | null;
  locationName?: string;
}

export function PrayerNotificationCard({ prayerTimes: externalTimes, locationName }: Props = {}) {
  const {
    settings, setSettings, permission, prayerTimes, loadingPrayer,
    scheduled, prayerList, enable, disable, togglePrayer, testNotification,
  } = useIbadahReminder(externalTimes);

  const [expanded, setExpanded] = useState(false);
  const [enabling, setEnabling] = useState(false);

  const handleToggleEnabled = async () => {
    if (settings.enabled) {
      disable();
    } else {
      setEnabling(true);
      await enable();
      setEnabling(false);
    }
  };

  const upcomingReminders = scheduled
    .filter(r => !r.triggered)
    .slice(0, 5);

  const permDenied = permission === "denied";

  const usingLocalTimes = !!externalTimes;

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {settings.enabled ? (
              <BellRing className="w-5 h-5 text-emerald-500 animate-pulse" />
            ) : (
              <Bell className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <CardTitle className="text-foreground text-base leading-none">Pengingat Sholat</CardTitle>
              {usingLocalTimes && locationName && (
                <p className="text-xs text-muted-foreground mt-0.5">{locationName}</p>
              )}
            </div>
            {settings.enabled && (
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">Aktif</Badge>
            )}
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={handleToggleEnabled}
            disabled={enabling || permDenied}
            className="data-[state=checked]:bg-emerald-500"
          />
        </div>
        {permDenied && (
          <div className="flex items-center gap-2 mt-2 text-amber-600 dark:text-amber-400 text-xs bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg p-2.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Notifikasi diblokir. Aktifkan di pengaturan browser Anda.</span>
          </div>
        )}
      </CardHeader>

      {settings.enabled && (
        <CardContent className="pt-0 space-y-4">
          {/* Upcoming reminders */}
          {loadingPrayer ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Mengambil jadwal sholat...
            </div>
          ) : upcomingReminders.length > 0 ? (
            <div className="rounded-xl bg-muted/40 border border-border p-3">
              <p className="text-muted-foreground text-[10px] uppercase tracking-widest font-semibold mb-2.5">
                Pengingat Hari Ini
              </p>
              <div className="space-y-2">
                {upcomingReminders.map(r => (
                  <div key={r.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-sm text-foreground">{r.label}</span>
                      {r.minutesBefore && (
                        <span className="text-[10px] text-muted-foreground">
                          ({r.minutesBefore} mnt sebelum)
                        </span>
                      )}
                    </div>
                    <span className="text-foreground font-mono text-xs bg-muted px-2 py-0.5 rounded-md">
                      {r.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : prayerTimes ? (
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-3">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Semua pengingat hari ini telah terlewat. Besok otomatis dijadwal ulang.</span>
            </div>
          ) : null}

          <Separator />

          {/* Expand settings */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-xs transition-colors w-full font-medium"
          >
            <span>Pengaturan lanjutan</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
          </button>

          {expanded && (
            <div className="space-y-5">
              {/* Minutes before */}
              <div>
                <p className="text-muted-foreground text-[10px] uppercase tracking-widest font-semibold mb-2">
                  Ingatkan sebelum sholat
                </p>
                <div className="flex flex-wrap gap-2">
                  {MINUTES_OPTIONS.map(m => (
                    <button
                      key={m}
                      onClick={() => setSettings(s => ({ ...s, minutesBefore: m }))}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                        settings.minutesBefore === m
                          ? "bg-emerald-500 text-white border-emerald-500"
                          : "bg-background text-muted-foreground border-border hover:border-emerald-500/50"
                      )}
                    >
                      {m} menit
                    </button>
                  ))}
                </div>
              </div>

              {/* Per-prayer toggles */}
              <div>
                <p className="text-muted-foreground text-[10px] uppercase tracking-widest font-semibold mb-2">
                  Pilih waktu sholat
                </p>
                <div className="space-y-2.5">
                  {prayerList.map(p => (
                    <div key={p.key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base leading-none">{p.icon}</span>
                        <Label className="text-sm text-foreground cursor-pointer font-normal">{p.label}</Label>
                        <span className="text-muted-foreground text-xs font-mono">{p.time}</span>
                      </div>
                      <Switch
                        checked={p.enabled}
                        onCheckedChange={() => togglePrayer(p.key as PrayerKey)}
                        className="data-[state=checked]:bg-emerald-500 scale-90"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Extra reminders */}
              <div>
                <p className="text-muted-foreground text-[10px] uppercase tracking-widest font-semibold mb-2">
                  Pengingat Tambahan
                </p>
                <div className="space-y-3">
                  {[
                    { key: "adzan" as const, label: "🔔 Tepat waktu adzan", desc: "Notifikasi saat adzan berkumandang" },
                    { key: "zikirPagi" as const, label: "🌅 Zikir Pagi", desc: "30 menit setelah Subuh" },
                    { key: "zikirPetang" as const, label: "🌆 Zikir Petang", desc: "30 menit setelah Ashar" },
                  ].map(item => (
                    <div key={item.key} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch
                        checked={settings[item.key]}
                        onCheckedChange={() => setSettings(s => ({ ...s, [item.key]: !s[item.key] }))}
                        className="data-[state=checked]:bg-emerald-500 scale-90 shrink-0 mt-0.5"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Test button */}
              <Button
                variant="outline"
                size="sm"
                onClick={testNotification}
                className="w-full"
              >
                <TestTube className="w-4 h-4 mr-2" />
                Kirim Notifikasi Tes
              </Button>
            </div>
          )}
        </CardContent>
      )}

      {!settings.enabled && !enabling && (
        <CardContent className="pt-0">
          <p className="text-muted-foreground text-sm leading-relaxed">
            Aktifkan untuk mendapat pengingat otomatis sebelum waktu sholat.
            Pengingat tetap berfungsi meski browser di-minimize.
          </p>
        </CardContent>
      )}
      {enabling && (
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Meminta izin notifikasi...
          </div>
        </CardContent>
      )}
    </Card>
  );
}
