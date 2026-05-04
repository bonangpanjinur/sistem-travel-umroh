import React, { useEffect } from 'react';
import { useParams } from "react-router-dom";
import { useLandingPage } from "@/hooks/useLandingPages";
import { SectionRenderer } from "@/components/landing-builder/SectionRenderer";
import { LoadingState } from "@/components/shared/LoadingState";

export default function LandingPage() {
  const { slug } = useParams();
  const { data: lp, isLoading, error } = useLandingPage(slug || "", true);

  useEffect(() => {
    if (lp) {
      document.title = lp.meta_title || lp.title || "Umrah & Haji";
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', lp.meta_description || '');
      }
    }
  }, [lp?.id, lp?.title, lp?.meta_title, lp?.meta_description]);

  if (isLoading) return <LoadingState />;
  
  if (error || !lp) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">Halaman tidak ditemukan atau belum dipublikasikan.</p>
        <a href="/" className="text-green-600 font-bold hover:underline">Kembali ke Beranda</a>
      </div>
    </div>
  );

  const getWANumber = () => {
    if (lp.whatsapp_source_type === 'agent') {
      const agentPhone = lp.agent?.profiles?.[0]?.phone || (lp.agent?.profiles as any)?.phone;
      return agentPhone || "628123456789";
    }
    if (lp.whatsapp_source_type === 'custom') return lp.whatsapp_custom_number || "628123456789";
    return "628123456789"; // Nomor Global Default
  };

  const waNumber = getWANumber();

  return (
    <div className="flex flex-col w-full min-h-screen bg-white">
      <main className="flex-grow">
        {lp.sections
          ?.sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
          .map((section: any) => (
            <SectionRenderer 
              key={section.id} 
              type={section.type} 
              data={section.data} 
              waNumber={waNumber} 
            />
          ))}
      </main>
    </div>
  );
}
