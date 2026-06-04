/**
 * usePushNotification
 * Hook for subscribing/unsubscribing browser push notifications.
 * Uses VITE_VAPID_PUBLIC_KEY env var (set in Vercel env vars).
 */
import { useState, useEffect } from "react";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    arr[i] = rawData.charCodeAt(i);
  }
  return arr.buffer;
}

interface UsePushNotificationOptions {
  customerId?: string;
  userId?: string;
}

export function usePushNotification(opts: UsePushNotificationOptions = {}) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsSupported("serviceWorker" in navigator && "PushManager" in window);
  }, []);

  useEffect(() => {
    if (!isSupported) return;
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    });
  }, [isSupported]);

  const subscribe = async () => {
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      toast.error("VAPID public key belum dikonfigurasi");
      return;
    }
    if (!isSupported) {
      toast.error("Browser Anda tidak mendukung push notification");
      return;
    }

    try {
      setIsLoading(true);

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Izin notifikasi ditolak");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription,
          customer_id: opts.customerId || null,
          user_id: opts.userId || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Gagal menyimpan subscription");
      }

      setIsSubscribed(true);
      toast.success("Notifikasi push berhasil diaktifkan!");
    } catch (err: any) {
      console.error("[push] subscribe error:", err);
      toast.error("Gagal mengaktifkan notifikasi: " + (err?.message || ""));
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    try {
      setIsLoading(true);
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
      toast.success("Notifikasi push dinonaktifkan");
    } catch (err: any) {
      toast.error("Gagal menonaktifkan notifikasi: " + (err?.message || ""));
    } finally {
      setIsLoading(false);
    }
  };

  return { isSupported, isSubscribed, isLoading, subscribe, unsubscribe };
}
