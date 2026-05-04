import React from 'react';
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  data: {
    title: string;
    subtitle: string;
    imageUrl: string;
    ctaText: string;
  };
  waNumber: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ data, waNumber }) => {
  const handleCTA = () => {
    window.open(`https://wa.me/${waNumber}?text=Halo, saya tertarik dengan paket ini`, '_blank');
  };

  return (
    <section className="relative w-full min-h-[600px] flex items-center justify-center overflow-hidden bg-gray-900 text-white">
      {data.imageUrl && (
        <div className="absolute inset-0 z-0">
          <img 
            src={data.imageUrl} 
            alt={data.title} 
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900/80" />
        </div>
      )}
      
      <div className="container relative z-10 px-4 py-20 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          {data.title}
        </h1>
        <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto text-gray-200">
          {data.subtitle}
        </p>
        <Button 
          size="lg" 
          className="bg-green-600 hover:bg-green-700 text-white text-lg px-8 py-6 rounded-full"
          onClick={handleCTA}
        >
          {data.ctaText || "Daftar Sekarang"}
        </Button>
      </div>
    </section>
  );
};
