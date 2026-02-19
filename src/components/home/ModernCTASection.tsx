import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Phone, MessageCircle, ArrowRight, MapPin } from 'lucide-react';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';

export function ModernCTASection() {
  const { data: settings } = useWebsiteSettings();

  const whatsapp = settings?.footer_whatsapp || '6281234567890';
  const phone = settings?.footer_phone || '+6281234567890';
  const address = settings?.footer_address || 'Jakarta Selatan';

  const whatsappLink = `https://wa.me/${whatsapp.replace(/\D/g, '')}`;
  const phoneLink = `tel:${phone.replace(/\D/g, '')}`;

  return (
    <section className="py-24 bg-gradient-to-br from-primary via-primary to-primary/80 relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Mulai Perjalanan Suci Anda
            </h2>
            <p className="text-lg text-white/80 max-w-2xl mx-auto">
              Pilih paket yang sesuai atau hubungi tim kami untuk konsultasi gratis
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm hover:bg-white/20 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <ArrowRight className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Pilih Paket</h3>
                <p className="text-white/70 text-sm mb-4">Lihat berbagai pilihan paket umroh & haji</p>
                <Button asChild variant="secondary" className="w-full">
                  <Link to="/packages">Lihat Paket</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20 backdrop-blur-sm hover:bg-white/20 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">WhatsApp</h3>
                <p className="text-white/70 text-sm mb-4">Chat langsung dengan tim kami</p>
                <Button asChild variant="secondary" className="w-full">
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer">Hubungi</a>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20 backdrop-blur-sm hover:bg-white/20 transition-colors">
              <CardContent className="p-6 text-center">
                <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Phone className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Telepon</h3>
                <p className="text-white/70 text-sm mb-4">Hubungi kami langsung</p>
                <Button asChild variant="secondary" className="w-full">
                  <a href={phoneLink}>Telepon</a>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-8 text-white/60 text-sm flex items-center justify-center gap-2">
            <MapPin className="h-4 w-4" />
            {address}
          </div>
        </div>
      </div>
    </section>
  );
}
