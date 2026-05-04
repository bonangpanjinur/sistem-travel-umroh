import React from 'react';
import { Star, Quote } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

interface TestimonialsSectionProps {
  data: {
    title: string;
    testimonials: { id: string; name: string; role: string; content: string; rating: number }[];
  };
}

export const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({ data }) => {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold mb-16 text-center text-gray-900">
          {data.title || "Apa Kata Mereka?"}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {data.testimonials.map((testimonial) => (
            <Card key={testimonial.id} className="relative overflow-hidden border-gray-100 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <Quote className="absolute top-4 right-4 w-12 h-12 text-gray-100 -z-0" />
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-5 h-5 ${i < testimonial.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                    />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic relative z-10 leading-relaxed">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-xl mr-4">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
