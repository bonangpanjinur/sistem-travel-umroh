import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle, ArrowRight } from 'lucide-react';

export function CTASection() {
  return (
    <section className="py-20 bg-primary relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Siap Mewujudkan Perjalanan Suci Anda?
          </h2>
          <p className="text-lg text-white/90 mb-8">
            Daftarkan diri Anda sekarang dan mulai persiapan perjalanan umroh atau haji 
            bersama kami. Tim kami siap membantu Anda 24/7.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" variant="secondary" className="gap-2">
              <Link to="/packages">
                Pilih Paket
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2 bg-transparent border-white text-white hover:bg-white hover:text-primary">
              <a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" />
                Hubungi WhatsApp
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2 bg-transparent border-white text-white hover:bg-white hover:text-primary">
              <a href="tel:+6281234567890">
                <Phone className="h-4 w-4" />
                Telepon Kami
              </a>
            </Button>
          </div>

          <p className="text-white/70 text-sm mt-8">
            📍 Kantor Pusat: Jl. Masjid Agung No. 123, Jakarta Selatan
          </p>
        </div>
      </div>
    </section>
  );
}
