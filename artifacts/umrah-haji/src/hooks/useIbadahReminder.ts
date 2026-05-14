import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────

export type ReminderCity = "makkah" | "madinah";
export type PrayerKey = "Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";

export interface IbadahReminderSettings {
  enabled: boolean;
  city: ReminderCity;
  minutesBefore: number;
  prayers: Record<PrayerKey, boolean>;
  zikirPagi: boolean;
  zikirPetang: boolean;
  manasik: boolean;
  adzan: boolean;
}

export interface ScheduledReminder {
  id: string;
  label: string;
  time: string;
  type: "shalat" | "zikir" | "manasik" | "adzan";
  triggered: boolean;
  minutesBefore?: number;
}

export interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Imsak: string;
}

const STORAGE_KEY = "ibadah-reminder-settings";
const PRAYER_CACHE_KEY = "ibadah-reminder-prayer-cache";

const PRAYER_LABELS: Record<PrayerKey, string> = {
  Fajr: "Subuh",
  Dhuhr: "Dzuhur",
  Asr: "Ashar",
  Maghrib: "Maghrib",
  Isha: "Isya",
};

const PRAYER_ICONS: Record<PrayerKey, string> = {
  Fajr: "🌙",
  Dhuhr: "☀️",
  Asr: "🌤️",
  Maghrib: "🌅",
  Isha: "🌙",
};

const CITIES = {
  makkah: { city: "Makkah", country: "SA" },
  madinah: { city: "Medina", country: "SA" },
};

const DEFAULT_SETTINGS: IbadahReminderSettings = {
  enabled: false,
  city: "makkah",
  minutesBefore: 10,
  prayers: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true },
  zikirPagi: true,
  zikirPetang: true,
  manasik: true,
  adzan: false,
};

// ── Helpers ────────────────────────────────────────────────────────────────

function loadSettings(): IbadahReminderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(s: IbadahReminderSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function parseTimeToDate(timeStr: string): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function formatTime12(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function msUntil(target: Date): number {
  return target.getTime() - Date.now();
}

async function fetchPrayerTimes(city: ReminderCity): Promise<PrayerTimes | null> {
  const today = new Date().toISOString().split("T")[0];
  const cacheKey = `${PRAYER_CACHE_KEY}-${city}-${today}`;

  // Check localStorage cache (expires daily)
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as PrayerTimes;
  } catch {
    // ignore cache error
  }

  // Clean old cache entries
  Object.keys(localStorage)
    .filter((k) => k.startsWith(PRAYER_CACHE_KEY) && k !== cacheKey)
    .forEach((k) => localStorage.removeItem(k));

  const { city: cityName, country } = CITIES[city];
  try {
    const res = await fetch(
      `https://api.aladhan.com/v1/timingsByCity?city=${cityName}&country=${country}&method=4`
    );
    if (!res.ok) return null;
    const json = await res.json();
    const timings: PrayerTimes = json.data?.timings;
    if (!timings) return null;
    localStorage.setItem(cacheKey, JSON.stringify(timings));
    return timings;
  } catch {
    return null;
  }
}

async function showLocalNotification(title: string, body: string, tag: string, url = "/jamaah") {
  if (Notification.permission !== "granted") return;

  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        icon: "/images/icon-192.png",
        badge: "/images/icon-192.png",
        vibrate: [200, 100, 200],
        tag,
        renotify: true,
        data: { url },
        actions: [
          { action: "open", title: "Buka" },
          { action: "dismiss", title: "Tutup" },
        ],
      } as NotificationOptions);
      return;
    } catch {
      // fallback to Notification API
    }
  }

  // Fallback: direct Notification API
  new Notification(title, {
    body,
    icon: "/images/icon-192.png",
    tag,
  });
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useIbadahReminder(externalPrayerTimes?: PrayerTimes | null) {
  const [settings, setSettingsState] = useState<IbadahReminderSettings>(loadSettings);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [fetchedPrayerTimes, setFetchedPrayerTimes] = useState<PrayerTimes | null>(null);
  const [loadingPrayer, setLoadingPrayer] = useState(false);

  // Use external times (from page's GPS fetch) if provided, otherwise fallback to fetched
  const prayerTimes = externalPrayerTimes ?? fetchedPrayerTimes;
  const [scheduled, setScheduled] = useState<ScheduledReminder[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Persist settings on change
  const setSettings = useCallback((updater: IbadahReminderSettings | ((prev: IbadahReminderSettings) => IbadahReminderSettings)) => {
    setSettingsState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveSettings(next);
      return next;
    });
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      toast.error("Browser Anda tidak mendukung notifikasi.");
      return false;
    }
    if (Notification.permission === "granted") {
      setPermission("granted");
      return true;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      toast.success("Izin notifikasi diberikan! Pengingat ibadah siap aktif.");
      return true;
    }
    if (result === "denied") {
      toast.error("Notifikasi diblokir. Aktifkan di pengaturan browser Anda.");
    }
    return false;
  }, []);

  // Load prayer times from city only when no external times are provided
  useEffect(() => {
    if (!settings.enabled || externalPrayerTimes) return;
    let cancelled = false;
    setLoadingPrayer(true);
    fetchPrayerTimes(settings.city).then((times) => {
      if (cancelled) return;
      setFetchedPrayerTimes(times);
      setLoadingPrayer(false);
    });
    return () => { cancelled = true; };
  }, [settings.city, settings.enabled, externalPrayerTimes]);

  // Clear all scheduled timers
  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  // Schedule reminders based on prayer times + settings
  const scheduleReminders = useCallback((times: PrayerTimes, cfg: IbadahReminderSettings) => {
    clearAllTimers();
    if (!cfg.enabled || permission !== "granted") {
      setScheduled([]);
      return;
    }

    const now = Date.now();
    const newScheduled: ScheduledReminder[] = [];
    const newTimers: ReturnType<typeof setTimeout>[] = [];

    const schedule = (
      id: string,
      label: string,
      type: ScheduledReminder["type"],
      fireAt: Date,
      notifTitle: string,
      notifBody: string,
      tag: string,
      url?: string,
      minutesBefore?: number,
    ) => {
      const ms = msUntil(fireAt);
      const timeStr = `${String(fireAt.getHours()).padStart(2, "0")}:${String(fireAt.getMinutes()).padStart(2, "0")}`;

      newScheduled.push({ id, label, time: timeStr, type, triggered: ms < 0, minutesBefore });

      if (ms > 0 && ms < 24 * 60 * 60 * 1000) {
        const timer = setTimeout(() => {
          showLocalNotification(notifTitle, notifBody, tag, url);
          setScheduled((prev) =>
            prev.map((r) => (r.id === id ? { ...r, triggered: true } : r))
          );
        }, ms);
        newTimers.push(timer);
      }
    };

    const PRAYERS: PrayerKey[] = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

    PRAYERS.forEach((key) => {
      if (!cfg.prayers[key]) return;

      const prayerDate = parseTimeToDate(times[key]);

      // Reminder X minutes before shalat
      const reminderDate = new Date(prayerDate.getTime() - cfg.minutesBefore * 60 * 1000);
      schedule(
        `shalat-${key}`,
        `${PRAYER_ICONS[key]} ${PRAYER_LABELS[key]}`,
        "shalat",
        reminderDate,
        `🕌 Waktu ${PRAYER_LABELS[key]} Sebentar Lagi`,
        `${cfg.minutesBefore} menit lagi — bersiaplah untuk shalat ${PRAYER_LABELS[key]}. Semoga khusyuk. 🤲`,
        `shalat-${key}`,
        "/jamaah/waktu-sholat",
        cfg.minutesBefore,
      );

      // Adzan time (at the exact prayer time)
      if (cfg.adzan) {
        schedule(
          `adzan-${key}`,
          `🔔 Adzan ${PRAYER_LABELS[key]}`,
          "adzan",
          prayerDate,
          `🔔 Adzan ${PRAYER_LABELS[key]}`,
          `Allahu Akbar — Sekarang waktunya shalat ${PRAYER_LABELS[key]}. Mari kita tunaikan. 🕌`,
          `adzan-${key}`,
          "/jamaah/waktu-sholat",
        );
      }
    });

    // Zikir pagi — 30 menit setelah Subuh
    if (cfg.zikirPagi) {
      const subuhDate = parseTimeToDate(times.Fajr);
      const zikirPagiDate = new Date(subuhDate.getTime() + 30 * 60 * 1000);
      schedule(
        "zikir-pagi",
        "🌅 Zikir Pagi",
        "zikir",
        zikirPagiDate,
        "☀️ Saatnya Zikir Pagi",
        "Perkuat hari Anda dengan zikir pagi. Subhanallah, Alhamdulillah, Allahu Akbar. 📿",
        "zikir-pagi",
        "/jamaah/doa-panduan",
      );
    }

    // Zikir petang — 30 menit setelah Ashar
    if (cfg.zikirPetang) {
      const asharDate = parseTimeToDate(times.Asr);
      const zikirPetangDate = new Date(asharDate.getTime() + 30 * 60 * 1000);
      schedule(
        "zikir-petang",
        "🌆 Zikir Petang",
        "zikir",
        zikirPetangDate,
        "🌆 Saatnya Zikir Petang",
        "Tutup sore ini dengan zikir petang. Semoga hati selalu tenang bersama-Nya. 📿",
        "zikir-petang",
        "/jamaah/doa-panduan",
      );
    }

    timersRef.current = newTimers;
    setScheduled(newScheduled.sort((a, b) => a.time.localeCompare(b.time)));
  }, [clearAllTimers, permission]);

  // Reschedule whenever prayer times or settings change
  useEffect(() => {
    if (prayerTimes) {
      scheduleReminders(prayerTimes, settings);
    } else if (!settings.enabled) {
      clearAllTimers();
      setScheduled([]);
    }
    return clearAllTimers;
  }, [prayerTimes, settings, scheduleReminders, clearAllTimers]);

  // Refresh prayer times at midnight
  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 30, 0);
    const msToMidnight = midnight.getTime() - now.getTime();

    const t = setTimeout(() => {
      fetchPrayerTimes(settings.city).then((times) => {
        if (times) setPrayerTimes(times);
      });
    }, msToMidnight);

    return () => clearTimeout(t);
  }, [settings.city]);

  const enable = useCallback(async (): Promise<boolean> => {
    const granted = await requestPermission();
    if (!granted) return false;
    setSettings((prev) => ({ ...prev, enabled: true }));
    return true;
  }, [requestPermission, setSettings]);

  const disable = useCallback(() => {
    setSettings((prev) => ({ ...prev, enabled: false }));
    clearAllTimers();
    setScheduled([]);
  }, [setSettings, clearAllTimers]);

  const togglePrayer = useCallback((key: PrayerKey) => {
    setSettings((prev) => ({
      ...prev,
      prayers: { ...prev.prayers, [key]: !prev.prayers[key] },
    }));
  }, [setSettings]);

  const testNotification = useCallback(async () => {
    const granted = permission === "granted" || await requestPermission();
    if (!granted) return;
    await showLocalNotification(
      "🕌 Tes Pengingat Ibadah",
      "Pengingat ibadah Anda sudah aktif dan berfungsi dengan baik! 🤲",
      "test-notif",
      "/jamaah/pengingat-ibadah",
    );
    toast.success("Notifikasi tes berhasil dikirim!");
  }, [permission, requestPermission]);

  const prayerList = (["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as PrayerKey[]).map((key) => ({
    key,
    label: PRAYER_LABELS[key],
    icon: PRAYER_ICONS[key],
    time: prayerTimes ? formatTime12(prayerTimes[key]) : "--:--",
    enabled: settings.prayers[key],
  }));

  return {
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
    PRAYER_LABELS,
    PRAYER_ICONS,
  };
}
