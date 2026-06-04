import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FaqSuggestion = {
  id: string;
  question: string;
  answer: string;
  category: string;
};

const CATEGORY_EMOJI: Record<string, string> = {
  "Umum":        "💬",
  "Pendaftaran": "📝",
  "Dokumen":     "📄",
  "Visa":        "🛂",
  "Paket":       "🕋",
  "Pembayaran":  "💳",
  "Pembatalan":  "↩️",
  "Lainnya":     "❓",
};

export { CATEGORY_EMOJI };

export function useFaqSuggestions() {
  return useQuery<FaqSuggestion[]>({
    queryKey: ["faq-suggestions-public"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("faqs")
        .select("id, question, answer, category")
        .eq("is_published", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FaqSuggestion[];
    },
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });
}

/** Deduplicated list of categories that appear in the FAQ list */
export function getCategories(faqs: FaqSuggestion[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const f of faqs) {
    if (f.category && !seen.has(f.category)) {
      seen.add(f.category);
      result.push(f.category);
    }
  }
  return result;
}
