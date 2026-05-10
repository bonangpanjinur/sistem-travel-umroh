import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "recently_viewed_packages";
const MAX_ITEMS = 5;

export interface RecentlyViewedPackageItem {
  id: string;
  name: string;
  package_type: string;
  duration_days: number;
  price_quad: number;
  currency: string;
  featured_image: string | null;
  viewedAt: number;
}

function readFromStorage(): RecentlyViewedPackageItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentlyViewedPackageItem[];
  } catch {
    return [];
  }
}

function writeToStorage(items: RecentlyViewedPackageItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // quota exceeded — skip silently
  }
}

export function trackPackageView(pkg: {
  id: string;
  name: string;
  package_type: string;
  duration_days: number;
  price_quad: number;
  currency: string;
  featured_image: string | null;
}) {
  const existing = readFromStorage();
  const filtered = existing.filter((item) => item.id !== pkg.id);
  const updated: RecentlyViewedPackageItem[] = [
    {
      id: pkg.id,
      name: pkg.name,
      package_type: pkg.package_type,
      duration_days: pkg.duration_days,
      price_quad: pkg.price_quad,
      currency: pkg.currency,
      featured_image: pkg.featured_image,
      viewedAt: Date.now(),
    },
    ...filtered,
  ].slice(0, MAX_ITEMS);
  writeToStorage(updated);

  // Sync to Supabase customer_accounts metadata asynchronously (best-effort)
  syncToProfile(updated).catch(() => {});
}

async function syncToProfile(items: RecentlyViewedPackageItem[]) {
  // Note: customer_accounts table sync is commented out as it may not exist in the schema
  // Uncomment when the table is available in Supabase
  /*
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const payload = items.map(({ id, viewedAt }) => ({ id, viewedAt }));
  await supabase
    .from("customer_accounts")
    .update({ recently_viewed_packages: payload } as any)
    .eq("user_id", user.id);
  */
}

export function useRecentlyViewedPackages() {
  const [localItems, setLocalItems] = useState<RecentlyViewedPackageItem[]>(
    () => readFromStorage()
  );

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setLocalItems(readFromStorage());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const refresh = useCallback(() => {
    setLocalItems(readFromStorage());
  }, []);

  const packageIds = localItems.map((i) => i.id);

  // Fetch fresh package data from Supabase so prices/names stay current
  const { data: freshPackages, isLoading } = useQuery({
    queryKey: ["recently-viewed-packages", packageIds.join(",")],
    queryFn: async () => {
      if (packageIds.length === 0) return [];
      const { data, error } = await supabase
        .from("packages")
        .select(
          "id, name, package_type, duration_days, price_quad, currency, featured_image, is_active"
        )
        .in("id", packageIds)
        .eq("is_active", true);
      if (error) throw error;
      return data ?? [];
    },
    enabled: packageIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Merge local order (most recent first) with fresh Supabase data
  const merged: RecentlyViewedPackageItem[] = localItems
    .map((local) => {
      const fresh = freshPackages?.find((p) => p.id === local.id);
      if (!fresh) return null;
      return {
        ...local,
        name: fresh.name,
        package_type: fresh.package_type,
        duration_days: fresh.duration_days,
        price_quad: fresh.price_quad,
        currency: fresh.currency,
        featured_image: fresh.featured_image,
      } as RecentlyViewedPackageItem;
    })
    .filter(Boolean) as RecentlyViewedPackageItem[];

  const clearAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setLocalItems([]);
  }, []);

  return { items: merged, isLoading: packageIds.length > 0 && isLoading, refresh, clearAll };
}
