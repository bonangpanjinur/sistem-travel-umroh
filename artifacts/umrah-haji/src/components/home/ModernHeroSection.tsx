import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Star } from 'lucide-react';
import { useWebsiteSettings, WebsiteSettings } from '@/hooks/useWebsiteSettings';

interface ModernHeroSectionProps {
  settings?: WebsiteSettings;
}

export function ModernHeroSection({ settings: propSettings }: ModernHeroSectionProps) {
  const { data: fetchedSettings } = useWebsiteSettings();
  const settings = propSettings || fetchedSettings;

  const heroTitle = settings?.hero_title || 'Wujudkan Ibadah Suci Anda';
  const heroSubtitle = settings?.hero_subtitle || 'Layanan perjalanan Umroh & Haji terpercaya dengan pengalaman lebih dari 15 tahun.';
  const heroImageUrl = settings?.hero_image_url || 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=2070';
  const heroCTAText = settings?.hero_cta_text || 'Lihat Paket';
  const heroCTALink = settings?.hero_cta_link || '/packages';

  return (
    <section className="min-h-[90vh] flex items-center bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Star className="h-4 w-4 fill-primary" />
              Terpercaya Sejak 2010
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight tracking-tight">
              {heroTitle}
            </h1>

            <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
              {heroSubtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="text-lg px-8 py-6 gap-2">
                <Link to={heroCTALink}>
                  {heroCTAText}
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-lg px-8 py-6">
                <Link to="/contact">Hubungi Kami</Link>
              </Button>
            </div>

            <div className="flex gap-8 pt-4 border-t border-border">
              {[
                { value: '15+', label: 'Tahun' },
                { value: '50K+', label: 'Jamaah' },
                { value: '4.9', label: 'Rating' },
              ].map((stat, i) => (
                <div key={i}>
                  <div className="text-2xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/5]">
              <img
                src={heroImageUrl}
                alt="Perjalanan Ibadah"
                className="w-full h-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent" />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-card rounded-2xl shadow-xl p-4 border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Star className="h-5 w-5 text-primary fill-primary" />
                </div>
                <div>
                  <p className="font-semibold text-card-foreground">100+ Keberangkatan</p>
                  <p className="text-sm text-muted-foreground">Setiap tahunnya</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
