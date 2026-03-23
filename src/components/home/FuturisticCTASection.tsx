import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageSquare, Phone, MapPin, ArrowRight } from 'lucide-react';
import { useWebsiteSettings, WebsiteSettings } from '@/hooks/useWebsiteSettings';

interface FuturisticCTASectionProps {
  settings?: WebsiteSettings;
}

export function FuturisticCTASection({ settings: propSettings }: FuturisticCTASectionProps) {
  const { data: fetchedSettings } = useWebsiteSettings();
  const settings = propSettings || fetchedSettings;

  const whatsappNumber = settings?.footer_whatsapp || '6281234567890';
  const phoneNumber = settings?.footer_phone || '6281234567890';
  const address = settings?.footer_address || 'Jl. Raya Ibadah No. 123, Jakarta';

  const whatsappLink = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`;
  const telLink = `tel:${phoneNumber.replace(/\D/g, '')}`;

  return (
    <section className="py-24 bg-[#050505] relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none">
                  SIAP UNTUK <span className="text-primary">TRANSFORMASI</span> SPIRITUAL?
                </h2>
                <p className="text-xl text-gray-400 font-light max-w-md">
                  Hubungi tim ahli kami sekarang untuk konsultasi perjalanan ibadah yang dipersonalisasi.
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-black font-bold px-8 py-6 rounded-none">
                  <Link to="/packages" className="flex items-center gap-2">
                    Lihat Paket <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" className="bg-[#25D366] hover:bg-[#25D366]/90 text-white font-bold px-8 py-6 rounded-none border-none">
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" /> WhatsApp
                  </a>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-none group hover:border-primary/50 transition-all duration-500">
                <Phone className="h-8 w-8 text-primary mb-6" />
                <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-widest">Telepon</h3>
                <p className="text-gray-400 mb-4 text-sm">{phoneNumber}</p>
                <a href={telLink} className="text-primary font-bold text-xs flex items-center gap-2 group-hover:gap-4 transition-all">
                  HUBUNGI SEKARANG <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              <div className="p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-none group hover:border-primary/50 transition-all duration-500">
                <MapPin className="h-8 w-8 text-primary mb-6" />
                <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-widest">Lokasi</h3>
                <p className="text-gray-400 mb-4 text-sm line-clamp-2">{address}</p>
                <Link to="/contact" className="text-primary font-bold text-xs flex items-center gap-2 group-hover:gap-4 transition-all">
                  LIHAT MAPS <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
