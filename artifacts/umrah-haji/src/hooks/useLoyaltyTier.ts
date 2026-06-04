import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type LoyaltyTier = "silver" | "gold" | "platinum";

export const TIER_DISCOUNT_PERCENT: Record<LoyaltyTier, number> = {
  silver: 0,
  gold: 2,
  platinum: 5,
};

export const TIER_LABELS: Record<LoyaltyTier, string> = {
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

export interface LoyaltyTierInfo {
  tier: LoyaltyTier;
  points: number;
  discountPercent: number;
  discountAmount: (subtotal: number) => number;
}

export function useLoyaltyTier(): {
  data: LoyaltyTierInfo | null;
  isLoading: boolean;
} {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["loyalty-tier", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<LoyaltyTierInfo | null> => {
      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!customer) return null;

      const { data: lp } = await supabase
        .from("loyalty_points")
        .select("current_points, tier_level")
        .eq("customer_id", customer.id)
        .maybeSingle();

      const tier = (lp?.tier_level as LoyaltyTier) || "silver";
      const points = lp?.current_points || 0;
      const discountPercent = TIER_DISCOUNT_PERCENT[tier] ?? 0;

      return {
        tier,
        points,
        discountPercent,
        discountAmount: (subtotal: number) =>
          Math.round((subtotal * discountPercent) / 100),
      };
    },
  });

  return { data: data ?? null, isLoading };
}
