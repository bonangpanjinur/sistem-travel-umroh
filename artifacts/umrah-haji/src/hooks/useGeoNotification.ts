import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface HolyLocation {
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  notifTitle: string;
  notifBody: string;
  key: string;
}

const HOLY_LOCATIONS: HolyLocation[] = [
  {
    name: "Masjidil Haram",
    lat: 21.4225,
    lng: 39.8262,
    radiusMeters: 500,
    notifTitle: "🕋 Mendekati Masjidil Haram",
    notifBody: "Anda sedang dalam jangkauan 500m dari Masjidil Haram. Bersiaplah untuk ibadah.",
    key: "masjidil-haram",
  },
  {
    name: "Masjid Nabawi",
    lat: 24.4672,
    lng: 39.6111,
    radiusMeters: 500,
    notifTitle: "🕌 Mendekati Masjid Nabawi",
    notifBody: "Anda sedang dalam jangkauan 500m dari Masjid Nabawi. Sampaikan salam untuk Nabi SAW.",
    key: "masjid-nabawi",
  },
  {
    name: "Bukit Arafah",
    lat: 21.3547,
    lng: 39.9842,
    radiusMeters: 1000,
    notifTitle: "🌄 Mendekati Padang Arafah",
    notifBody: "Anda sedang mendekati Padang Arafah. Perbanyak doa dan dzikir.",
    key: "padang-arafah",
  },
  {
    name: "Muzdalifah",
    lat: 21.3808,
    lng: 39.9372,
    radiusMeters: 800,
    notifTitle: "🌙 Mendekati Muzdalifah",
    notifBody: "Anda sedang mendekati Muzdalifah. Persiapkan untuk mabit dan mengumpulkan kerikil.",
    key: "muzdalifah",
  },
  {
    name: "Mina",
    lat: 21.4133,
    lng: 39.8935,
    radiusMeters: 800,
    notifTitle: "🪨 Mendekati Mina",
    notifBody: "Anda sedang mendekati Mina (Kota Tenda). Persiapkan untuk melempar jumrah.",
    key: "mina",
  },
];

const NOTIF_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
const GEO_INTERVAL_MS = 60 * 1000; // check every 60 seconds

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function canNotify(key: string): boolean {
  try {
    const last = localStorage.getItem(`geo-notif-${key}`);
    if (!last) return true;
    return Date.now() - parseInt(last, 10) > NOTIF_COOLDOWN_MS;
  } catch {
    return true;
  }
}

function markNotified(key: string) {
  try {
    localStorage.setItem(`geo-notif-${key}`, String(Date.now()));
  } catch {}
}

async function sendNotification(loc: HolyLocation) {
  if (!canNotify(loc.key)) return;
  markNotified(loc.key);

  // Try native push notification if permission granted
  if ("Notification" in window && Notification.permission === "granted") {
    if (navigator.serviceWorker) {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (reg) {
        await reg.showNotification(loc.notifTitle, {
          body: loc.notifBody,
          icon: "/images/icon-192.png",
          badge: "/images/icon-192.png",
          tag: `geo-${loc.key}`,
          data: { url: "/jamaah/peta-lokasi" },
        }).catch(() => {});
        return;
      }
    }
    new Notification(loc.notifTitle, { body: loc.notifBody, icon: "/images/icon-192.png" });
    return;
  }

  // Fallback: in-app toast
  toast(loc.notifTitle, {
    description: loc.notifBody,
    duration: 8000,
    icon: "📍",
  });
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission().catch(() => {});
  }
}

export function useGeoNotification(enabled = true) {
  const watchRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPositionRef = useRef<GeolocationPosition | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (!("geolocation" in navigator)) return;

    requestNotificationPermission();

    function checkPosition(position: GeolocationPosition) {
      lastPositionRef.current = position;
      const { latitude, longitude } = position.coords;

      for (const loc of HOLY_LOCATIONS) {
        const dist = haversineDistance(latitude, longitude, loc.lat, loc.lng);
        if (dist <= loc.radiusMeters) {
          sendNotification(loc);
        }
      }
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
    };

    watchRef.current = navigator.geolocation.watchPosition(checkPosition, () => {}, options);

    // Also poll every minute in case watchPosition is throttled
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(checkPosition, () => {}, options);
    }, GEO_INTERVAL_MS);

    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, [enabled]);
}
