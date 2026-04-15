import React from 'react';
import { useParams } from "react-router-dom";
import { useLandingPage } from "@/hooks/useLandingPages";
import { SectionRenderer } from "@/components/landing-builder/SectionRenderer";
import { LoadingState } from "@/components/shared/LoadingState";
import { Helmet } from "react-helmet-async";

export default function LandingPage() {
  const { slug } = useParams();
  const { data: lp, isLoading, error } = useLandingPage(slug || "", true);

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
    if (lp.whatsapp_source_type === 'agent') return lp.agent?.phone_number || "628123456789";
    if (lp.whatsapp_source_type === 'custom') return lp.whatsapp_custom_number;
    return "628123456789"; // Nomor Global Default
  };

  const waNumber = getWANumber();

  return (
    <div className="flex flex-col w-full min-h-screen bg-white">
      <Helmet>
        <title>{lp.meta_title || lp.title}</title>
        <meta name="description" content={lp.meta_description} />
        {lp.og_image_url && <meta property="og:image" content={lp.og_image_url} />}
      </Helmet>
      
      <main className="flex-grow">
        {lp.sections
          ?.sort((a: any, b: any) => a.order - b.order)
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
