/**
 * useMuthawifNotifications
 * Manages browser Notification API for the muthawif dashboard.
 * - Requests & tracks permission
 * - Sends OS-level notifications (via Service Worker when available)
 * - No server/VAPID needed — works whenever the browser tab is open
 */
import { useState, useEffect, useCallback, useRef } from "react";

type Permission = "default" | "granted" | "denied" | "unsupported";

function showNotification(title: string, body: string, url = "/", tag?: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const options: NotificationOptions = {
    body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: tag || `muthawif-${Date.now()}`,
    requireInteraction: true,
    data: { url },
  };

  // Prefer Service Worker for better mobile support
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready
      .then(reg => reg.showNotification(title, { ...options, vibrate: [300, 150, 300] }))
      .catch(() => {
        // Fallback to direct Notification API
        const n = new Notification(title, options);
        n.onclick = () => { window.focus(); if (url !== "/") window.location.href = url; n.close(); };
      });
  } else {
    const n = new Notification(title, options);
    n.onclick = () => { window.focus(); if (url !== "/") window.location.href = url; n.close(); };
  }
}

export function useMuthawifNotifications() {
  const [permission, setPermission] = useState<Permission>(() => {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission as Permission;
  });
  const [isRequesting, setIsRequesting] = useState(false);
  const dismissedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!("Notification" in window)) { setPermission("unsupported"); return; }
    setPermission(Notification.permission as Permission);
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") { setPermission("granted"); return true; }
    if (Notification.permission === "denied")  { setPermission("denied");  return false; }

    setIsRequesting(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result as Permission);
      return result === "granted";
    } finally {
      setIsRequesting(false);
    }
  }, []);

  const notify = useCallback((
    title: string,
    body: string,
    opts: { url?: string; tag?: string; vibrate?: boolean; dedup?: string } = {}
  ) => {
    // De-duplicate: if same dedup key was already sent this session, skip
    if (opts.dedup && dismissedRef.current.has(opts.dedup)) return;
    if (opts.dedup) dismissedRef.current.add(opts.dedup);

    if (opts.vibrate && navigator.vibrate) {
      navigator.vibrate([400, 150, 400, 150, 400]);
    }
    showNotification(title, body, opts.url || "/", opts.tag);
  }, []);

  const isSupported = permission !== "unsupported";
  const isGranted   = permission === "granted";
  const isDenied    = permission === "denied";

  return { permission, isSupported, isGranted, isDenied, isRequesting, requestPermission, notify };
}
