import { useMemo, useCallback } from "react";
import { useWebsiteSettings, useUpdateWebsiteSettings } from "@/hooks/useWebsiteSettings";

export interface BottomNavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  enabled: boolean;
  order: number;
}

export interface PWAIconConfig {
  iconUrl: string | null;
  appName: string;
  shortName: string;
  themeColor: string;
  bgColor: string;
}

export const DEFAULT_ICON_CONFIG: PWAIconConfig = {
  iconUrl: null,
  appName: "Vinstour Travel",
  shortName: "Vinstour",
  themeColor: "#15803d",
  bgColor: "#15803d",
};

export const DEFAULT_BOTTOM_NAV: BottomNavItem[] = [
  { id: "beranda", label: "Beranda",  icon: "Home",        path: "/",           enabled: true,  order: 0 },
  { id: "paket",   label: "Paket",   icon: "Package",     path: "/packages",   enabled: true,  order: 1 },
  { id: "sholat",  label: "Sholat",  icon: "Moon",        path: "/sholat",     enabled: true,  order: 2 },
  { id: "toko",    label: "Toko",    icon: "ShoppingBag", path: "/toko",       enabled: true,  order: 3 },
  { id: "akun",    label: "Akun",    icon: "User",        path: "/auth/login", enabled: true,  order: 4 },
];

export const ALL_NAV_OPTIONS: BottomNavItem[] = [
  { id: "beranda",    label: "Beranda",    icon: "Home",        path: "/",                  enabled: true,  order: 0  },
  { id: "paket",      label: "Paket",      icon: "Package",     path: "/packages",          enabled: true,  order: 1  },
  { id: "sholat",     label: "Sholat",     icon: "Moon",        path: "/sholat",            enabled: true,  order: 2  },
  { id: "alquran",    label: "Al-Quran",   icon: "BookOpen",    path: "/alquran",           enabled: false, order: 3  },
  { id: "kiblat",     label: "Kiblat",     icon: "Compass",     path: "/kiblat",            enabled: false, order: 4  },
  { id: "cuaca",      label: "Cuaca",      icon: "Cloud",       path: "/cuaca",             enabled: false, order: 5  },
  { id: "tracker",    label: "Tracker",    icon: "Target",      path: "/tracker-ibadah",    enabled: false, order: 6  },
  { id: "kalkislami", label: "Kalkulator", icon: "Calculator",  path: "/kalkulator-islami", enabled: false, order: 7  },
  { id: "tasbih",     label: "Tasbih",     icon: "LayoutGrid",  path: "/tasbih",            enabled: false, order: 8  },
  { id: "toko",       label: "Toko",       icon: "ShoppingBag", path: "/toko",              enabled: true,  order: 9  },
  { id: "jadwal",     label: "Jadwal",     icon: "Calendar",    path: "/departures",        enabled: false, order: 10 },
  { id: "kalkulator", label: "Biaya",      icon: "Calculator",  path: "/kalkulator",        enabled: false, order: 11 },
  { id: "kurs",       label: "Kurs",       icon: "DollarSign",  path: "/kurs",              enabled: false, order: 12 },
  { id: "tabungan",   label: "Tabungan",   icon: "PiggyBank",   path: "/savings",           enabled: false, order: 13 },
  { id: "blog",       label: "Artikel",    icon: "BookOpen",    path: "/blog",              enabled: false, order: 14 },
  { id: "akun",       label: "Akun",       icon: "User",        path: "/auth/login",        enabled: true,  order: 15 },
];

function getCustomData(settings: ReturnType<typeof useWebsiteSettings>["data"]): Record<string, any> {
  const raw = settings?.custom_sections as unknown;
  if (!raw) return {};
  if (Array.isArray(raw)) return {};
  if (typeof raw === "object") return raw as Record<string, any>;
  return {};
}

export function usePWAConfig() {
  const { data: settings, isLoading } = useWebsiteSettings();
  const updateSettings = useUpdateWebsiteSettings();

  const customData = useMemo(() => getCustomData(settings), [settings]);

  const items: BottomNavItem[] = useMemo(() => {
    const saved = customData?.pwa_bottom_nav as BottomNavItem[] | undefined;
    if (saved?.length) return saved;
    return DEFAULT_BOTTOM_NAV;
  }, [customData]);

  const iconConfig: PWAIconConfig = useMemo(() => {
    const saved = customData?.pwa_icon_config as Partial<PWAIconConfig> | undefined;
    if (saved) return { ...DEFAULT_ICON_CONFIG, ...saved };
    return {
      ...DEFAULT_ICON_CONFIG,
      appName: settings?.company_name || DEFAULT_ICON_CONFIG.appName,
      shortName: (settings?.company_name || DEFAULT_ICON_CONFIG.shortName).split(" ")[0],
      themeColor: settings?.primary_color || DEFAULT_ICON_CONFIG.themeColor,
      bgColor: settings?.primary_color || DEFAULT_ICON_CONFIG.bgColor,
      iconUrl: settings?.logo_url || null,
    };
  }, [customData, settings]);

  const save = useCallback((newItems: BottomNavItem[], newIconConfig?: PWAIconConfig) => {
    updateSettings.mutate({
      custom_sections: {
        ...customData,
        pwa_bottom_nav: newItems,
        ...(newIconConfig ? { pwa_icon_config: newIconConfig } : {}),
      } as any,
    });
  }, [customData, updateSettings]);

  const saveIconConfig = useCallback((newIconConfig: PWAIconConfig) => {
    updateSettings.mutate({
      custom_sections: {
        ...customData,
        pwa_icon_config: newIconConfig,
      } as any,
    });
  }, [customData, updateSettings]);

  const reset = useCallback(() => {
    updateSettings.mutate({
      custom_sections: {
        ...customData,
        pwa_bottom_nav: DEFAULT_BOTTOM_NAV,
      } as any,
    });
  }, [customData, updateSettings]);

  const activeItems = useMemo(
    () =>
      items
        .filter((i) => i.enabled)
        .sort((a, b) => a.order - b.order)
        .slice(0, 5),
    [items],
  );

  return {
    items,
    iconConfig,
    activeItems,
    save,
    saveIconConfig,
    reset,
    isSaving: updateSettings.isPending,
    isLoading,
    settings,
  };
}
