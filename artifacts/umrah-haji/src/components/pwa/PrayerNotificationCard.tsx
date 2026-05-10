import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Bell, BellOff, BellRing, ChevronDown, ChevronUp,
  Clock, CheckCircle2, AlertCircle, Loader2, TestTube
} from "lucide-react";
import { useIbadahReminder } from "@/hooks/useIbadahReminder";
import type { PrayerKey } from "@/hooks/useIbadahReminder";

const MINUTES_OPTIONS = [5, 10, 15, 20, 30];

export function PrayerNotificationCard() {
  const {
    settings, setSettings, permission, prayerTimes, loadingPrayer,
    scheduled, prayerList, enable, disable, togglePrayer, testNotification,
  } = useIbadahReminder();

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

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {settings.enabled ? (
              <BellRing className="w-5 h-5 text-emerald-400 animate-pulse" />
            ) : (
              <Bell className="w-5 h-5 text-gray-400" />
            )}
            <CardTitle className="text-white text-base">Pengingat Sholat</CardTitle>
            {settings.enabled && (
              <Badge className="bg-emerald-600/80 text-white border-0 text-xs">Aktif</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={settings.enabled}
              onCheckedChange={handleToggleEnabled}
              disabled={enabling || permDenied}
              className="data-[state=checked]:bg-emerald-600"
            />
          </div>
        </div>
        {permDenied && (
          <div className="flex items-center gap-2 mt-2 text-amber-400 text-xs bg-amber-900/20 rounded-lg p-2">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>Notifikasi diblokir. Aktifkan di pengaturan browser.</span>
          </div>
        )}
      </CardHeader>

      {settings.enabled && (
        <CardContent className="pt-0 space-y-4">
          {/* Upcoming reminders */}
          {loadingPrayer ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Mengambil jadwal sholat...
            </div>
          ) : upcomingReminders.length > 0 ? (
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Pengingat Hari Ini</p>
              <div className="space-y-1.5">
                {upcomingReminders.map(r => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      <span className="text-gray-300">{r.label}</span>
                    </div>
                    <span className="text-white font-mono text-xs">{r.time}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : prayerTimes ? (
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Semua pengingat hari ini telah terlewat. Besok otomatis dijadwal ulang.
            </div>
          ) : null}

          <Separator className="bg-white/10" />

          {/* Expand settings */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-gray-400 hover:text-white text-xs transition-colors w-full"
          >
            <span>Pengaturan lanjutan</span>
            {expanded ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
          </button>

          {expanded && (
            <div className="space-y-4">
              {/* Minutes before */}
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Ingatkan sebelum (menit)</p>
                <div className="flex flex-wrap gap-2">
                  {MINUTES_OPTIONS.map(m => (
                    <button
                      key={m}
                      onClick={() => setSettings(s => ({ ...s, minutesBefore: m }))}
                      className={`px-3 py-1 rounded-full text-xs transition-colors ${
                        settings.minutesBefore === m
                          ? "bg-emerald-600 text-white"
                          : "bg-white/10 text-gray-400 hover:bg-white/20"
                      }`}
                    >
                      {m} menit
                    </button>
                  ))}
                </div>
              </div>

              {/* Per-prayer toggles */}
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Pilih waktu sholat</p>
                <div className="space-y-2">
                  {prayerList.map(p => (
                    <div key={p.key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{p.icon}</span>
                        <Label className="text-gray-300 text-sm cursor-pointer">{p.label}</Label>
                        <span className="text-gray-500 text-xs font-mono">{p.time}</span>
                      </div>
                      <Switch
                        checked={p.enabled}
                        onCheckedChange={() => togglePrayer(p.key as PrayerKey)}
                        className="data-[state=checked]:bg-emerald-600 scale-90"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Extra reminders */}
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Pengingat Tambahan</p>
                <div className="space-y-2">
                  {[
                    { key: "adzan" as const, label: "🔔 Notifikasi tepat waktu adzan", desc: "Tepat saat waktu sholat tiba" },
                    { key: "zikirPagi" as const, label: "🌅 Zikir Pagi", desc: "30 menit setelah Subuh" },
                    { key: "zikirPetang" as const, label: "🌆 Zikir Petang", desc: "30 menit setelah Ashar" },
                  ].map(item => (
                    <div key={item.key} className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-gray-300 text-sm">{item.label}</p>
                        <p className="text-gray-500 text-xs">{item.desc}</p>
                      </div>
                      <Switch
                        checked={settings[item.key]}
                        onCheckedChange={() => setSettings(s => ({ ...s, [item.key]: !s[item.key] }))}
                        className="data-[state=checked]:bg-emerald-600 scale-90 shrink-0"
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
                className="w-full border-emerald-700/40 text-emerald-400 hover:bg-emerald-900/30"
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
          <p className="text-gray-500 text-xs">
            Aktifkan untuk mendapat pengingat otomatis sebelum waktu sholat — bekerja bahkan saat browser di-minimize.
          </p>
        </CardContent>
      )}
      {enabling && (
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Meminta izin notifikasi...
          </div>
        </CardContent>
      )}
    </Card>
  );
}
