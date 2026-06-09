/**
 * useJamaahPushSubscription
 *
 * Hook untuk mendaftarkan browser jamaah ke Web Push Notifications.
 * - Mengambil VAPID public key dari API server
 * - Mendaftar ke PushManager browser
 * - Menyimpan subscription ke push_subscriptions dengan customer_id
 * - Auto-subscribe jika izin sudah diberikan sebelumnya
 * - Notifikasi itinerary live update dari guide
 */
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

interface UseJamaahPushSubscriptionOptions {
  customerId: string | undefined;
  userId?: string;
  autoSubscribe?: boolean;
}

export function useJamaahPushSubscription({
  customerId,
  userId,
  autoSubscribe = true,
}: UseJamaahPushSubscriptionOptions) {
  const [permission, setPermission] = useState<PushPermission>(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return Notification.permission as PushPermission;
  });
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [vapidKey, setVapidKey] = useState<string | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  useEffect(() => {
    if (!isSupported) return;
    fetch("/api/push/vapid-public-key")
      .then((r) => r.json())
      .then((d) => { if (d.publicKey) setVapidKey(d.publicKey); })
      .catch(() => {});
  }, [isSupported]);

  useEffect(() => {
    if (!isSupported || !customerId) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setIsSubscribed(!!sub))
      .catch(() => {});
  }, [isSupported, customerId]);

  const saveSubscription = useCallback(
    async (sub: PushSubscription) => {
      if (!customerId) return;
      const json = sub.toJSON();
      const body = {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
        customer_id: customerId,
        user_id: userId ?? null,
        role: "customer",
      };
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal menyimpan subscription push");
      }
    },
    [customerId, userId],
  );

  const subscribe = useCallback(
    async (silent = false) => {
      if (!isSupported) {
        if (!silent) toast.error("Browser tidak mendukung push notification");
        return false;
      }
      if (!vapidKey) {
        if (!silent) toast.error("VAPID key belum dikonfigurasi di server");
        return false;
      }
      if (!customerId) {
        if (!silent) toast.error("Profil jamaah belum dimuat");
        return false;
      }

      setIsLoading(true);
      try {
        const perm = await Notification.requestPermission();
        setPermission(perm as PushPermission);
        if (perm !== "granted") {
          if (!silent) toast.error("Izin notifikasi ditolak");
          return false;
        }

        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
          });
        }

        await saveSubscription(sub);
        setIsSubscribed(true);
        if (!silent) toast.success("Notifikasi itinerary aktif! Anda akan diberitahu saat guide memperbarui program.");
        return true;
      } catch (err: any) {
        if (!silent) toast.error("Gagal aktifkan notifikasi: " + (err?.message || ""));
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [isSupported, vapidKey, customerId, saveSubscription],
  );

  useEffect(() => {
    if (!autoSubscribe) return;
    if (!customerId || !vapidKey) return;
    if (permission !== "granted") return;
    if (isSubscribed) return;
    subscribe(true);
  }, [autoSubscribe, customerId, vapidKey, permission, isSubscribed, subscribe]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      setIsSubscribed(false);
      toast.success("Notifikasi itinerary dinonaktifkan");
    } catch (err: any) {
      toast.error("Gagal nonaktifkan: " + (err?.message || ""));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
  };
}
