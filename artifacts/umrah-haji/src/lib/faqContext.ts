import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;

/**
 * Builds a structured FAQ knowledge-base string from all published FAQs in the DB.
 * Grouped by category, formatted for injection into a Gemini / OpenAI system prompt.
 */
export async function buildFAQContext(): Promise<string> {
  try {
    const { data: faqs, error } = await supabase
      .from("faqs")
      .select("question, answer, category")
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .limit(60);

    if (error || !faqs?.length) return "";

    // Group by category
    const byCategory: Record<string, Array<{ question: string; answer: string }>> = {};
    for (const faq of faqs) {
      const cat = (faq.category as string) || "Umum";
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push({ question: faq.question, answer: faq.answer });
    }

    const lines: string[] = ["=== FAQ & KNOWLEDGE BASE ==="];

    for (const [category, items] of Object.entries(byCategory)) {
      lines.push(`\n[${category}]`);
      for (const { question, answer } of items) {
        lines.push(`T: ${question}`);
        // Strip HTML tags, collapse whitespace
        const cleanAnswer = answer
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        lines.push(`J: ${cleanAnswer}`);
      }
    }

    lines.push("\n=== AKHIR FAQ ===");
    lines.push(
      "Gunakan FAQ di atas sebagai referensi utama. " +
      "Jika pertanyaan sesuai FAQ, jawab berdasarkan data tersebut. " +
      "Jika tidak ada dalam FAQ, gunakan pengetahuan umum tentang umroh/haji."
    );

    return lines.join("\n");
  } catch {
    return "";
  }
}
