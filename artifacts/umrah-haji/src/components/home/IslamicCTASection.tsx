import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useWebsiteSettings, WebsiteSettings } from '@/hooks/useWebsiteSettings';
import { MessageSquare, Phone, ArrowRight, Star } from 'lucide-react';

interface IslamicCTASectionProps {
  settings?: WebsiteSettings;
}

export function IslamicCTASection({ settings: propSettings }: IslamicCTASectionProps) {
  const { data: fetchedSettings } = useWebsiteSettings();
  const settings = propSettings || fetchedSettings;

  const ctaTitle = settings?.cta_title || 'Siap Memulai Perjalanan Ibadah Anda?';
  const ctaSubtitle = settings?.cta_subtitle || 'Hubungi kami sekarang untuk konsultasi gratis mengenai paket Umroh dan Haji yang sesuai dengan kebutuhan Anda.';
  const ctaImageUrl = settings?.cta_image_url || 'https://images.unsplash.com/photo-1564767609342-620cb19b2357?q=80&w=2073';
  const ctaButtonText = settings?.cta_button_text || 'Hubungi Kami';
  const ctaButtonLink = settings?.cta_button_link || '/contact';

  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background with Pattern */}
      <div className="absolute inset-0 bg-primary/5 z-0" />
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" 
           style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/islamic-art.png")' }} />
      
      <div className="container mx-auto relative z-10">
        <div className="max-w-6xl mx-auto bg-white rounded-[3rem] shadow-2xl shadow-primary/10 border border-slate-100 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 items-center">
            
            {/* Image Side */}
            <div className="relative h-[300px] lg:h-[500px] overflow-hidden">
              <img 
                src={ctaImageUrl} 
                alt="CTA Background" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-primary/40 to-transparent" />
              
              {/* Floating Badge */}
              <div className="absolute bottom-8 left-8 bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-white/50 max-w-[240px] animate-bounce-slow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-xl bg-accent text-white">
                    <Star className="h-5 w-5 fill-white" />
                  </div>
                  <span className="font-bold text-slate-900">VVIP Service</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Layanan prioritas untuk kenyamanan ibadah Anda dan keluarga.
                </p>
              </div>
            </div>

            {/* Content Side */}
            <div className="p-10 lg:p-16 space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20">
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Konsultasi Gratis</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight">
                  {ctaTitle}
                </h2>
                <p className="text-lg text-slate-600 leading-relaxed">
                  {ctaSubtitle}
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <Button asChild size="lg" className="h-16 px-10 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20 group">
                  <Link to={ctaButtonLink} className="flex items-center gap-2">
                    {ctaButtonText}
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="h-16 px-10 rounded-2xl text-lg font-bold border-2 group">
                  <a href={`https://wa.me/${(settings?.footer_whatsapp || '6281234567890').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    WhatsApp
                  </a>
                </Button>
              </div>

              <div className="pt-8 border-t border-slate-100 flex items-center gap-6">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                      <img src={`https://i.pravatar.cc/150?u=${i}`} alt="User" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-500 font-medium">
                  <span className="text-primary font-bold">1,200+</span> Jamaah telah bergabung bulan ini
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
