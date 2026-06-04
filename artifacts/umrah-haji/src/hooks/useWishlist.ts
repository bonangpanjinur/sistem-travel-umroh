import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "wishlist_packages";

export interface WishlistItem {
  id: string;
  name: string;
  package_type: string;
  duration_days: number;
  price_quad: number;
  currency: string;
  featured_image: string | null;
  savedAt: number;
}

function readFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function writeToStorage(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // quota exceeded — skip silently
  }
}

async function syncToProfile(ids: string[]) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await (supabase as any)
    .from("customer_accounts")
    .update({ wishlist_packages: ids })
    .eq("user_id", user.id);
}

export function useWishlist() {
  const [ids, setIds] = useState<string[]>(() => readFromStorage());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setIds(readFromStorage());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev];
      writeToStorage(next);
      syncToProfile(next).catch(() => {});
      return next;
    });
  }, []);

  const isWishlisted = useCallback((id: string) => ids.includes(id), [ids]);

  const remove = useCallback((id: string) => {
    setIds((prev) => {
      const next = prev.filter((x) => x !== id);
      writeToStorage(next);
      syncToProfile(next).catch(() => {});
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    writeToStorage([]);
    syncToProfile([]).catch(() => {});
    setIds([]);
  }, []);

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["wishlist-packages", ids.join(",")],
    queryFn: async () => {
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("packages")
        .select(
          `id, name, package_type, duration_days, price_quad, price_triple,
           price_double, price_single, currency, featured_image, is_active,
           departures:package_departures(
             departure_date, month, year, status, quota, booked_count,
             price_quad, price_triple, price_double, price_single,
             airline:airlines(name),
             hotel_makkah:hotels!package_departures_hotel_makkah_id_fkey(name, star_rating),
             hotel_madinah:hotels!package_departures_hotel_madinah_id_fkey(name, star_rating)
           )`
        )
        .in("id", ids)
        .eq("is_active", true);
      if (error) throw error;
      return data ?? [];
    },
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const orderedPackages = ids
    .map((id) => packages.find((p: any) => p.id === id))
    .filter(Boolean) as any[];

  return {
    ids,
    packages: orderedPackages,
    isLoading: ids.length > 0 && isLoading,
    toggle,
    isWishlisted,
    remove,
    clearAll,
    count: ids.length,
  };
}
