import { useEffect, useState } from "react";

/**
 * J3 — Offline cache helper.
 * Persist React Query data to localStorage and hydrate on mount when offline / before fetch.
 */
export function useOfflineCache<T>(key: string, data: T | undefined): T | undefined {
  const [cached, setCached] = useState<T | undefined>(() => {
    try {
      const raw = localStorage.getItem(`offline:${key}`);
      return raw ? (JSON.parse(raw) as T) : undefined;
    } catch {
      return undefined;
    }
  });

  useEffect(() => {
    if (data === undefined || data === null) return;
    try {
      localStorage.setItem(`offline:${key}`, JSON.stringify(data));
      setCached(data);
    } catch {
      /* quota or serialization error — ignore */
    }
  }, [key, data]);

  return data ?? cached;
}

/** Hook reaktif untuk status online/offline. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return online;
}