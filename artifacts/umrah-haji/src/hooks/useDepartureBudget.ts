import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { toast } from "sonner";

export type BudgetCategory =
  | "hotel" | "tiket" | "visa" | "katering" | "transportasi"
  | "handling" | "manasik" | "perlengkapan" | "lainnya";

export const BUDGET_CATEGORIES: Record<BudgetCategory, string> = {
  hotel:         "Hotel",
  tiket:         "Tiket Pesawat",
  visa:          "Visa",
  katering:      "Katering",
  transportasi:  "Transportasi / Bus",
  handling:      "Handling",
  manasik:       "Manasik",
  perlengkapan:  "Perlengkapan Jamaah",
  lainnya:       "Lainnya",
};

export interface BudgetRow {
  id: string;
  departure_id: string;
  category: BudgetCategory;
  description?: string;
  budgeted_amount: number;
  pax_count?: number;
  per_pax_amount?: number;
  notes?: string;
}

export interface BudgetSummary {
  category: BudgetCategory;
  budgeted: number;
  realized: number;
  variance: number;
  variancePct: number;
}

export function useDepartureBudget(departureId: string) {
  return useQuery({
    queryKey: ["departure-budget", departureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departure_budgets")
        .select("*")
        .eq("departure_id", departureId)
        .order("category");
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return (data || []) as BudgetRow[];
    },
    enabled: !!departureId,
  });
}

export function useDepartureCosts(departureId: string) {
  return useQuery({
    queryKey: ["departure-costs", departureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_costs")
        .select("*")
        .eq("departure_id", departureId);
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data || [];
    },
    enabled: !!departureId,
  });
}

export function useSaveBudget(departureId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rows: Partial<BudgetRow>[]) => {
      for (const row of rows) {
        const payload = { ...row, departure_id: departureId };
        if (row.id) {
          const { error } = await supabase.from("departure_budgets").update(payload).eq("id", row.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("departure_budgets").insert(payload);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departure-budget", departureId] });
      toast.success("Budget disimpan");
    },
    onError: (e: any) => toast.error("Gagal menyimpan budget: " + e.message),
  });
}

export function computeBudgetSummary(budgets: BudgetRow[], costs: any[]): BudgetSummary[] {
  const catMap: Partial<Record<BudgetCategory, BudgetSummary>> = {};

  for (const b of budgets) {
    catMap[b.category] = {
      category: b.category,
      budgeted: b.budgeted_amount,
      realized: 0,
      variance: 0,
      variancePct: 0,
    };
  }

  for (const c of costs) {
    const cat = (c.cost_category || "lainnya") as BudgetCategory;
    if (!catMap[cat]) {
      catMap[cat] = { category: cat, budgeted: 0, realized: 0, variance: 0, variancePct: 0 };
    }
    catMap[cat]!.realized += Number(c.amount) || 0;
  }

  return Object.values(catMap).map(s => {
    const variance    = s!.budgeted - s!.realized;
    const variancePct = s!.budgeted > 0 ? (variance / s!.budgeted) * 100 : 0;
    return { ...s!, variance, variancePct };
  });
}
