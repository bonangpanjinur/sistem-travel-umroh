import React from 'react';
import { Button } from "@/components/ui/button";
import { Check } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface PricingSectionProps {
  data: {
    title: string;
    subtitle: string;
    plans: { id: string; name: string; price: string; features: string[]; isPopular: boolean; ctaText: string }[];
  };
  waNumber: string;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ data, waNumber }) => {
  const handleCTA = (planName: string) => {
    window.open(`https://wa.me/${waNumber}?text=Halo, saya tertarik dengan paket ${planName}`, '_blank');
  };

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
            {data.title || "Pilihan Paket Terbaik"}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {data.subtitle || "Pilih paket yang sesuai dengan kebutuhan dan budget Anda."}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {data.plans.map((plan) => (
            <Card key={plan.id} className={`relative flex flex-col h-full border-2 transition-all duration-300 hover:scale-105 ${plan.isPopular ? 'border-green-500 shadow-2xl' : 'border-gray-100 shadow-lg'}`}>
              {plan.isPopular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-green-500 text-white px-6 py-1 rounded-full text-sm font-bold uppercase tracking-wider">
                  Paling Populer
                </div>
              )}
              <CardHeader className="text-center pb-8 pt-10">
                <CardTitle className="text-2xl font-bold text-gray-900 mb-4">{plan.name}</CardTitle>
                <div className="flex items-center justify-center">
                  <span className="text-gray-500 text-lg mr-1">Rp</span>
                  <span className="text-5xl font-extrabold text-gray-900">{plan.price}</span>
                  <span className="text-gray-500 text-lg ml-1">jt</span>
                </div>
              </CardHeader>
              <CardContent className="flex-grow px-8">
                <ul className="space-y-4">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="p-8">
                <Button 
                  className={`w-full py-6 text-lg font-bold rounded-xl ${plan.isPopular ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-900 hover:bg-gray-800 text-white'}`}
                  onClick={() => handleCTA(plan.name)}
                >
                  {plan.ctaText || "Pilih Paket"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
