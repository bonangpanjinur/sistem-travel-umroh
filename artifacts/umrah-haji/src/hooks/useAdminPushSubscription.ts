/**
 * useAdminPushSubscription
 *
 * Hook untuk mendaftarkan browser staf internal, branch manager, dan agen
 * ke Web Push Notifications. Auto-subscribe secara diam-diam jika izin sudah
 * pernah diberikan. Notifikasi akan diterima saat ada booking baru atau perubahan status.
 *
 * Dipakai di AuthProvider setelah user login.
 */
import { useState, useEffect, useCallback, useRef } from "react";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export type PushPermissionState = "default" | "granted" | "denied" | "unsupported";

const PUSH_ROLES = [
  "super_admin", "owner", "branch_manager",
  "finance", "sales", "marketing", "operational", "equipment",
  "agent", "sub_agent",
];

interface UseAdminPushSubscriptionOptions {
  userId?: string | null;
  roles?: string[];
  branchId?: string | null;
  agentId?: string | null;
  autoSubscribe?: boolean;
}

export function useAdminPushSubscription({
  userId,
  roles = [],
  branchId,
  agentId,
  autoSubscribe = true,
}: UseAdminPushSubscriptionOptions) {
  const [permission, setPermission] = useState<PushPermissionState>(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return Notification.permission as PushPermissionState;
  });
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [vapidKey, setVapidKey] = useState<string | null>(null);
  const attemptedRef = useRef(false);

  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  // Hanya subscribe untuk role internal atau agen
  const shouldSubscribe = roles.some((r) => PUSH_ROLES.includes(r));

  // ── Ambil VAPID key dari API ───────────────────────────────────────────────
  useEffect(() => {
    if (!isSupported || !shouldSubscribe) return;
    fetch("/api/push/vapid-public-key")
      .then((r) => r.json())
      .then((d) => { if (d.publicKey) setVapidKey(d.publicKey); })
      .catch(() => {});
  }, [isSupported, shouldSubscribe]);

  // ── Cek status subscription saat ini ─────────────────────────────────────
  useEffect(() => {
    if (!isSupported) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setIsSubscribed(!!sub))
      .catch(() => {});
  }, [isSupported]);

  // ── Simpan subscription ke server ────────────────────────────────────────
  const saveSubscription = useCallback(
    async (sub: PushSubscription) => {
      if (!userId) return;
      const json = sub.toJSON();
      const primaryRole = roles.find((r) => PUSH_ROLES.includes(r)) ?? roles[0] ?? null;
      const body = {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
        user_id: userId,
        role: primaryRole,
        branch_id: branchId ?? null,
        agent_id: agentId ?? null,
      };
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal menyimpan push subscription");
      }
    },
    [userId, roles, branchId, agentId],
  );

  // ── Subscribe (manual atau otomatis) ────────────────────────────────────
  const subscribe = useCallback(
    async (silent = false): Promise<boolean> => {
      if (!isSupported || !vapidKey || !userId || !shouldSubscribe) return false;
      try {
        const perm = await Notification.requestPermission();
        setPermission(perm as PushPermissionState);
        if (perm !== "granted") return false;

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
        if (!silent) {
          const { toast } = await import("sonner");
          toast.success("Notifikasi booking aktif — Anda akan diberitahu saat booking baru masuk.");
        }
        return true;
      } catch {
        return false;
      }
    },
    [isSupported, vapidKey, userId, shouldSubscribe, saveSubscription],
  );

  // ── Auto-subscribe diam-diam jika izin sudah diberikan ───────────────────
  useEffect(() => {
    if (!autoSubscribe) return;
    if (!vapidKey || !userId || !shouldSubscribe) return;
    if (permission !== "granted") return;
    if (isSubscribed) return;
    if (attemptedRef.current) return;
    attemptedRef.current = true;
    subscribe(true);
  }, [autoSubscribe, vapidKey, userId, shouldSubscribe, permission, isSubscribed, subscribe]);

  // ── Unsubscribe ───────────────────────────────────────────────────────────
  const unsubscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      setIsSubscribed(false);
    } catch { /* best-effort */ }
  }, []);

  return { isSupported, isSubscribed, permission, shouldSubscribe, subscribe, unsubscribe };
}
