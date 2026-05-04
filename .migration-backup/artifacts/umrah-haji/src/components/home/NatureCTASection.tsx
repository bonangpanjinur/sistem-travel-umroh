import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageSquare, Phone, MapPin, ArrowRight, Leaf } from 'lucide-react';
import { useWebsiteSettings, WebsiteSettings } from '@/hooks/useWebsiteSettings';

interface NatureCTASectionProps {
  settings?: WebsiteSettings;
}

export function NatureCTASection({ settings: propSettings }: NatureCTASectionProps) {
  const { data: fetchedSettings } = useWebsiteSettings();
  const settings = propSettings || fetchedSettings;

  const whatsappNumber = settings?.footer_whatsapp || '6281234567890';
  const phoneNumber = settings?.footer_phone || '6281234567890';
  const address = settings?.footer_address || 'Jl. Raya Ibadah No. 123, Jakarta';

  const whatsappLink = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`;
  const telLink = `tel:${phoneNumber.replace(/\D/g, '')}`;

  return (
    <section className="py-32 bg-[#f4f1e6] relative overflow-hidden">
      {/* Decorative Leaves */}
      <div className="absolute -top-20 -right-20 text-emerald-900/5 pointer-events-none">
        <Leaf className="h-96 w-96 rotate-12" />
      </div>
      <div className="absolute -bottom-20 -left-20 text-emerald-900/5 pointer-events-none">
        <Leaf className="h-96 w-96 -rotate-45" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center space-y-8 mb-20">
            <h2 className="text-4xl md:text-6xl font-serif text-[#2c3e2d] leading-tight">
              Mari Melangkah Bersama <br /> Dalam <span className="italic text-emerald-700 underline decoration-emerald-200 underline-offset-8">Ketenangan</span>
            </h2>
            <p className="text-xl text-[#5c6b5d] max-w-2xl mx-auto font-light">
              Konsultasikan rencana ibadah Anda dengan tim kami yang ramah dan berpengalaman. Kami siap membantu mewujudkan impian Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-emerald-900/5 border border-emerald-50 text-center group hover:-translate-y-2 transition-all duration-500">
              <div className="h-16 w-16 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-700 mx-auto mb-8 group-hover:bg-emerald-700 group-hover:text-white transition-colors duration-500">
                <MessageSquare className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-serif text-[#2c3e2d] mb-4">WhatsApp</h3>
              <p className="text-[#5c6b5d] mb-8 text-sm leading-relaxed">Respon cepat melalui pesan instan untuk pertanyaan Anda.</p>
              <Button asChild variant="ghost" className="text-emerald-700 hover:bg-emerald-50 font-bold group-hover:gap-4 transition-all">
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                  HUBUNGI KAMI <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>

            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-emerald-900/5 border border-emerald-50 text-center group hover:-translate-y-2 transition-all duration-500">
              <div className="h-16 w-16 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-700 mx-auto mb-8 group-hover:bg-emerald-700 group-hover:text-white transition-colors duration-500">
                <Phone className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-serif text-[#2c3e2d] mb-4">Telepon</h3>
              <p className="text-[#5c6b5d] mb-8 text-sm leading-relaxed">Bicara langsung dengan konsultan ibadah kami yang ramah.</p>
              <Button asChild variant="ghost" className="text-emerald-700 hover:bg-emerald-50 font-bold group-hover:gap-4 transition-all">
                <a href={telLink} className="flex items-center gap-2">
                  PANGGIL SEKARANG <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>

            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-emerald-900/5 border border-emerald-50 text-center group hover:-translate-y-2 transition-all duration-500">
              <div className="h-16 w-16 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-700 mx-auto mb-8 group-hover:bg-emerald-700 group-hover:text-white transition-colors duration-500">
                <MapPin className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-serif text-[#2c3e2d] mb-4">Lokasi</h3>
              <p className="text-[#5c6b5d] mb-8 text-sm leading-relaxed">{address}</p>
              <Button asChild variant="ghost" className="text-emerald-700 hover:bg-emerald-50 font-bold group-hover:gap-4 transition-all">
                <Link to="/contact" className="flex items-center gap-2">
                  LIHAT MAPS <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
