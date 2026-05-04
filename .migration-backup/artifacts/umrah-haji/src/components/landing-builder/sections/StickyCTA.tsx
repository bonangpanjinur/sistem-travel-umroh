import React from 'react';
import { Button } from "@/components/ui/button";
import { MessageCircle } from 'lucide-react';

interface StickyCTAProps {
  data: {
    text: string;
    subtext?: string;
  };
  waNumber: string;
}

export const StickyCTA: React.FC<StickyCTAProps> = ({ data, waNumber }) => {
  const handleCTA = () => {
    window.open(`https://wa.me/${waNumber}?text=Halo, saya ingin bertanya tentang paket ini`, '_blank');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white/80 backdrop-blur-md border-t border-gray-200 shadow-2xl md:hidden">
      <div className="flex items-center justify-between gap-4 max-w-md mx-auto">
        <div className="flex-grow">
          <h4 className="font-bold text-gray-900 text-sm leading-tight">{data.text || "Daftar Sekarang!"}</h4>
          {data.subtext && <p className="text-xs text-gray-500">{data.subtext}</p>}
        </div>
        <Button 
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-full flex items-center gap-2 shadow-lg animate-bounce"
          onClick={handleCTA}
        >
          <MessageCircle className="w-5 h-5" />
          <span>WhatsApp</span>
        </Button>
      </div>
    </div>
  );
};
