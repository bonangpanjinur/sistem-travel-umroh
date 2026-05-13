import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase as supabaseRaw } from '@/integrations/supabase/client';
const supabase: any = supabaseRaw;

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface FAQSectionProps {
  data: {
    title: string;
    faqs: FAQItem[];
  };
}

function useLiveFAQs(fallback: FAQItem[]) {
  return useQuery<FAQItem[]>({
    queryKey: ['public-faqs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faqs')
        .select('id, question, answer')
        .eq('is_published', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as FAQItem[];
    },
    placeholderData: fallback,
    staleTime: 1000 * 60 * 5,
  });
}

export const FAQSection: React.FC<FAQSectionProps> = ({ data }) => {
  const { data: faqs = data.faqs, isLoading } = useLiveFAQs(data.faqs);

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 max-w-4xl">
        <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center text-gray-900">
          {data.title || "Pertanyaan Umum (FAQ)"}
        </h2>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : faqs.length === 0 ? (
          <p className="text-center text-gray-500">Belum ada FAQ tersedia.</p>
        ) : (
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="bg-white rounded-lg border border-gray-200 px-6 shadow-sm"
              >
                <AccordionTrigger className="text-left text-lg font-semibold py-4 hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 text-base pb-4 leading-relaxed whitespace-pre-wrap">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </section>
  );
};
