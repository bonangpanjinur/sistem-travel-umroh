import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Leaf, Heart, Wind, ArrowRight } from 'lucide-react';
import { useWebsiteSettings, WebsiteSettings } from '@/hooks/useWebsiteSettings';

interface NatureHeroSectionProps {
  settings?: WebsiteSettings;
}

export function NatureHeroSection({ settings: propSettings }: NatureHeroSectionProps) {
  const { data: fetchedSettings } = useWebsiteSettings();
  const settings = propSettings || fetchedSettings;

  const heroTitle = settings?.hero_title || 'Temukan Kedamaian Spiritual Sejati';
  const heroSubtitle = settings?.hero_subtitle || 'Perjalanan ibadah yang tenang, nyaman, dan penuh makna di tanah suci dengan pelayanan yang tulus dari hati.';
  const heroImageUrl = settings?.hero_image_url || 'https://images.unsplash.com/photo-1519817650390-64a93db51149?q=80&w=2070';
  const heroCTAText = settings?.hero_cta_text || 'Mulai Perjalanan';
  const heroCTALink = settings?.hero_cta_link || '/packages';

  return (
    <section className="relative min-h-screen flex items-center bg-[#fdfcf8] overflow-hidden pt-20">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-[#f4f1e6] -skew-x-12 translate-x-1/4 pointer-events-none" />
      <div className="absolute top-20 left-10 text-[#e8e4d1] pointer-events-none opacity-20">
        <Leaf className="h-64 w-64 rotate-45" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-10">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-100">
              <Wind className="h-4 w-4" />
              Perjalanan Penuh Berkah & Ketenangan
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif text-[#2c3e2d] leading-[1.1]">
              {heroTitle}
            </h1>

            <p className="text-xl text-[#5c6b5d] max-w-lg leading-relaxed font-light">
              {heroSubtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-5">
              <Button asChild size="lg" className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-lg px-10 py-7 rounded-2xl shadow-xl shadow-emerald-900/10">
                <Link to={heroCTALink} className="flex items-center gap-2">
                  {heroCTAText}
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="text-[#2c3e2d] hover:bg-emerald-50 font-medium text-lg px-10 py-7 rounded-2xl">
                <Link to="/contact">Tanya Kami</Link>
              </Button>
            </div>

            <div className="flex items-center gap-8 pt-6">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 w-12 rounded-full border-4 border-white bg-gray-200 overflow-hidden">
                    <img src={`https://i.pravatar.cc/150?u=${i}`} alt="User" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1 text-amber-500">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Heart key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm text-[#5c6b5d] font-medium">Dipercaya 5,000+ Jamaah</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative rounded-[3rem] overflow-hidden shadow-2xl aspect-[4/5] transform rotate-2 hover:rotate-0 transition-transform duration-700">
              <img
                src={heroImageUrl}
                alt="Serene Travel"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2c3e2d]/40 to-transparent" />
            </div>
            
            {/* Floating Card */}
            <div className="absolute -bottom-10 -left-10 bg-white p-8 rounded-3xl shadow-2xl border border-emerald-50 max-w-xs hidden md:block">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Leaf className="h-6 w-6" />
                </div>
                <h3 className="font-serif text-xl text-[#2c3e2d]">Eco-Friendly</h3>
              </div>
              <p className="text-sm text-[#5c6b5d] leading-relaxed">
                Kami berkomitmen menjaga kelestarian lingkungan dalam setiap perjalanan ibadah Anda.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
