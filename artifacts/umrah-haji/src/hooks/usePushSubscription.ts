import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePWAConfig } from "@/hooks/usePWAConfig";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function usePushSubscription(customerId?: string) {
  const { vapidConfig } = usePWAConfig();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  const refresh = useCallback(async () => {
    if (!supported) return;
    setPermission(Notification.permission);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    } catch {
      setIsSubscribed(false);
    }
  }, [supported]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    if (!supported) {
      toast.error("Browser tidak mendukung push notification");
      return false;
    }
    if (!vapidConfig.enabled || !vapidConfig.publicKey) {
      toast.error("Push notification belum dikonfigurasi admin");
      return false;
    }
    setIsLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        toast.error("Izin notifikasi ditolak");
        return false;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidConfig.publicKey),
      });
      const json = sub.toJSON();
      const { error } = await supabase.functions.invoke("push-subscribe", {
        body: {
          endpoint: json.endpoint,
          keys: json.keys,
          user_agent: navigator.userAgent,
          customer_id: customerId,
        },
      });
      if (error) throw error;
      setIsSubscribed(true);
      toast.success("Notifikasi diaktifkan");
      return true;
    } catch (e: any) {
      toast.error("Gagal subscribe: " + (e?.message || e));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [supported, vapidConfig, customerId]);

  const unsubscribe = useCallback(async () => {
    if (!supported) return;
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.functions.invoke("push-subscribe", {
          body: { endpoint: sub.endpoint },
          method: "DELETE",
        });
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
      toast.success("Notifikasi dinonaktifkan");
    } catch (e: any) {
      toast.error("Gagal unsubscribe: " + (e?.message || e));
    } finally {
      setIsLoading(false);
    }
  }, [supported]);

  return {
    supported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    canSubscribe: supported && vapidConfig.enabled && !!vapidConfig.publicKey,
  };
}