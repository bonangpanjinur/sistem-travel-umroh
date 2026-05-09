import { useState, useEffect, useCallback } from "react";

export interface BottomNavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  enabled: boolean;
  order: number;
}

export const DEFAULT_BOTTOM_NAV: BottomNavItem[] = [
  { id: "beranda",     label: "Beranda",     icon: "Home",       path: "/",           enabled: true,  order: 0 },
  { id: "paket",       label: "Paket",       icon: "Package",    path: "/packages",   enabled: true,  order: 1 },
  { id: "jadwal",      label: "Jadwal",      icon: "Calendar",   path: "/departures", enabled: true,  order: 2 },
  { id: "kalkulator",  label: "Kalkulator",  icon: "Calculator", path: "/kalkulator", enabled: true,  order: 3 },
  { id: "akun",        label: "Akun",        icon: "User",       path: "/auth/login", enabled: true,  order: 4 },
];

export const ALL_NAV_OPTIONS: BottomNavItem[] = [
  { id: "beranda",     label: "Beranda",     icon: "Home",       path: "/",              enabled: true,  order: 0 },
  { id: "paket",       label: "Paket",       icon: "Package",    path: "/paket",         enabled: true,  order: 1 },
  { id: "jadwal",      label: "Jadwal",      icon: "Calendar",   path: "/jadwal",        enabled: false, order: 2 },
  { id: "kalkulator",  label: "Kalkulator",  icon: "Calculator", path: "/kalkulator",    enabled: true,  order: 2 },
  { id: "kurs",        label: "Kurs",        icon: "DollarSign", path: "/kurs",          enabled: true,  order: 3 },
  { id: "tabungan",    label: "Tabungan",    icon: "PiggyBank",  path: "/tabungan",      enabled: false, order: 5 },
  { id: "blog",        label: "Artikel",     icon: "BookOpen",   path: "/blog",          enabled: false, order: 6 },
  { id: "fitur",       label: "Fitur",       icon: "LayoutGrid", path: "/fitur",         enabled: false, order: 7 },
  { id: "kontak",      label: "Kontak",      icon: "Phone",      path: "/kontak",        enabled: false, order: 8 },
  { id: "akun",        label: "Akun",        icon: "User",       path: "/login",         enabled: true,  order: 4 },
];

const STORAGE_KEY = "pwa-bottom-nav-config";

export function usePWAConfig() {
  const [items, setItems] = useState<BottomNavItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored) as BottomNavItem[];
    } catch {}
    return DEFAULT_BOTTOM_NAV;
  });

  const save = useCallback((newItems: BottomNavItem[]) => {
    setItems(newItems);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems)); } catch {}
  }, []);

  const reset = useCallback(() => {
    save(DEFAULT_BOTTOM_NAV);
  }, [save]);

  const activeItems = items
    .filter((i) => i.enabled)
    .sort((a, b) => a.order - b.order)
    .slice(0, 5);

  return { items, activeItems, save, reset };
}
