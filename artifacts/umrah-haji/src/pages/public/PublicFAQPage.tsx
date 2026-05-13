import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;

import { DynamicPublicLayout } from "@/components/layout/DynamicPublicLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { HelpCircle } from "lucide-react";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

function usePublicFAQs() {
  return useQuery<FAQ[]>({
    queryKey: ["public-faqs-page"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faqs")
        .select("id, question, answer, category")
        .eq("is_published", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FAQ[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export default function PublicFAQPage() {
  const { data: faqs = [], isLoading, isError } = usePublicFAQs();

  // Group by category, preserving insertion order
  const grouped = faqs.reduce<Record<string, FAQ[]>>((acc, faq) => {
    const cat = faq.category || "Umum";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(faq);
    return acc;
  }, {});

  const categories = Object.keys(grouped);

  return (
    <DynamicPublicLayout>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-full mb-4">
            <HelpCircle className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Pertanyaan yang Sering Diajukan
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Temukan jawaban atas pertanyaan-pertanyaan umum seputar perjalanan Umroh &amp; Haji bersama kami.
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Gagal memuat FAQ. Silakan coba kembali.</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && faqs.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Belum ada FAQ tersedia saat ini.</p>
          </div>
        )}

        {/* FAQ Grouped by Category */}
        {!isLoading && !isError && categories.length > 0 && (
          <div className="space-y-10">
            {categories.map((cat) => (
              <div key={cat}>
                {categories.length > 1 && (
                  <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b">
                    {cat}
                  </h2>
                )}
                <Accordion type="single" collapsible className="w-full space-y-3">
                  {grouped[cat].map((faq) => (
                    <AccordionItem
                      key={faq.id}
                      value={faq.id}
                      className="bg-card rounded-lg border px-6 shadow-sm"
                    >
                      <AccordionTrigger className="text-left font-semibold py-4 hover:no-underline leading-snug">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pb-4 leading-relaxed whitespace-pre-wrap">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        {!isLoading && faqs.length > 0 && (
          <div className="mt-14 text-center bg-primary/5 rounded-2xl p-8">
            <p className="text-foreground font-semibold text-lg mb-2">
              Tidak menemukan jawaban yang Anda cari?
            </p>
            <p className="text-muted-foreground mb-5">
              Tim kami siap membantu Anda secara langsung.
            </p>
            <a
              href="https://wa.me/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Hubungi Tim Kami
            </a>
          </div>
        )}
      </div>
    </DynamicPublicLayout>
  );
}
