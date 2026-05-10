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
  { id: "beranda",  label: "Beranda",  icon: "Home",       path: "/",           enabled: true,  order: 0 },
  { id: "paket",    label: "Paket",    icon: "Package",    path: "/packages",   enabled: true,  order: 1 },
  { id: "sholat",   label: "Sholat",   icon: "Moon",       path: "/sholat",     enabled: true,  order: 2 },
  { id: "toko",     label: "Toko",     icon: "ShoppingBag", path: "/toko",      enabled: true,  order: 3 },
  { id: "akun",     label: "Akun",     icon: "User",        path: "/auth/login", enabled: true,  order: 4 },
];

export const ALL_NAV_OPTIONS: BottomNavItem[] = [
  { id: "beranda",      label: "Beranda",     icon: "Home",        path: "/",                 enabled: true,  order: 0 },
  { id: "paket",        label: "Paket",       icon: "Package",     path: "/packages",         enabled: true,  order: 1 },
  { id: "sholat",       label: "Sholat",      icon: "Moon",        path: "/sholat",           enabled: true,  order: 2 },
  { id: "alquran",      label: "Al-Quran",    icon: "BookOpen",    path: "/alquran",          enabled: false, order: 3 },
  { id: "kiblat",       label: "Kiblat",      icon: "Compass",     path: "/kiblat",           enabled: false, order: 4 },
  { id: "cuaca",        label: "Cuaca",       icon: "Cloud",       path: "/cuaca",            enabled: false, order: 5 },
  { id: "tracker",      label: "Tracker",     icon: "Target",      path: "/tracker-ibadah",   enabled: false, order: 6 },
  { id: "kalkislami",   label: "Kalkulator",  icon: "Calculator",  path: "/kalkulator-islami", enabled: false, order: 7 },
  { id: "tasbih",       label: "Tasbih",      icon: "LayoutGrid",  path: "/tasbih",           enabled: false, order: 8 },
  { id: "toko",         label: "Toko",        icon: "ShoppingBag", path: "/toko",             enabled: true,  order: 9 },
  { id: "jadwal",       label: "Jadwal",      icon: "Calendar",    path: "/departures",       enabled: false, order: 10 },
  { id: "kalkulator",   label: "Biaya",       icon: "Calculator",  path: "/kalkulator",       enabled: false, order: 11 },
  { id: "kurs",         label: "Kurs",        icon: "DollarSign",  path: "/kurs",             enabled: false, order: 12 },
  { id: "tabungan",     label: "Tabungan",    icon: "PiggyBank",   path: "/savings",          enabled: false, order: 13 },
  { id: "blog",         label: "Artikel",     icon: "BookOpen",    path: "/blog",             enabled: false, order: 14 },
  { id: "akun",         label: "Akun",        icon: "User",        path: "/auth/login",       enabled: true,  order: 15 },
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
