import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQSectionProps {
  data: {
    title: string;
    faqs: { id: string; question: string; answer: string }[];
  };
}

export const FAQSection: React.FC<FAQSectionProps> = ({ data }) => {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 max-w-4xl">
        <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center text-gray-900">
          {data.title || "Pertanyaan Umum (FAQ)"}
        </h2>
        
        <Accordion type="single" collapsible className="w-full space-y-4">
          {data.faqs.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id} className="bg-white rounded-lg border border-gray-200 px-6 shadow-sm">
              <AccordionTrigger className="text-left text-lg font-semibold py-4 hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 text-base pb-4 leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};
