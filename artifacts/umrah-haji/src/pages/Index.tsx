import { useMemo } from 'react';
import { DynamicPublicLayout } from '@/components/layout/DynamicPublicLayout';
import { BannerCarousel } from '@/components/home/BannerCarousel';
import { DynamicHeroSection } from '@/components/home/DynamicHeroSection';
import { ModernHeroSection } from '@/components/home/ModernHeroSection';
import { LuxuryHeroSection } from '@/components/home/LuxuryHeroSection';
import { IslamicHeroSection } from '@/components/home/IslamicHeroSection';
import { FuturisticHeroSection } from '@/components/home/FuturisticHeroSection';
import { NatureHeroSection } from '@/components/home/NatureHeroSection';
import { RoyalHeroSection } from '@/components/home/RoyalHeroSection';
import { FeaturedPackages } from '@/components/home/FeaturedPackages';
import { WhyChooseUs } from '@/components/home/WhyChooseUs';
import { Testimonials } from '@/components/home/Testimonials';
import { DynamicCTASection } from '@/components/home/DynamicCTASection';
import { ModernCTASection } from '@/components/home/ModernCTASection';
import { LuxuryCTASection } from '@/components/home/LuxuryCTASection';
import { IslamicCTASection } from '@/components/home/IslamicCTASection';
import { FuturisticCTASection } from '@/components/home/FuturisticCTASection';
import { NatureCTASection } from '@/components/home/NatureCTASection';
import { RoyalCTASection } from '@/components/home/RoyalCTASection';
import { QuickMenuGrid } from '@/components/home/QuickMenuGrid';
import { JamaahTrackerWidget } from '@/components/home/JamaahTrackerWidget';
import { useWebsiteSettings, HomepageSection, WebsiteSettings } from '@/hooks/useWebsiteSettingsOptimized';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const { data: settings, isLoading } = useWebsiteSettings();
  const template = settings?.template || 'classic';
  const heroMode = (settings as any)?.hero_display_mode || 'both';

  const sectionComponents: Record<string, React.ComponentType<{ settings?: WebsiteSettings }>> = useMemo(() => ({
    hero: template === 'royal' ? RoyalHeroSection : (template === 'luxury' ? LuxuryHeroSection : (template === 'modern' ? ModernHeroSection : (template === 'islamic' ? IslamicHeroSection : (template === 'futuristic' ? FuturisticHeroSection : (template === 'nature' ? NatureHeroSection : DynamicHeroSection))))),
    featured_packages: FeaturedPackages as any,
    why_choose_us: WhyChooseUs as any,
    testimonials: Testimonials as any,
    cta: template === 'royal' ? RoyalCTASection : (template === 'luxury' ? LuxuryCTASection : (template === 'modern' ? ModernCTASection : (template === 'islamic' ? IslamicCTASection : (template === 'futuristic' ? FuturisticCTASection : (template === 'nature' ? NatureCTASection : DynamicCTASection))))),
  }), [template]);

  const enabledSections = useMemo(() => {
    if (!settings?.homepage_sections) {
      return [
        { id: 'hero', order: 1, enabled: true, title: 'Hero' },
        { id: 'featured_packages', order: 2, enabled: true, title: 'Featured Packages' },
        { id: 'why_choose_us', order: 3, enabled: true, title: 'Why Choose Us' },
        { id: 'testimonials', order: 4, enabled: true, title: 'Testimonials' },
        { id: 'cta', order: 5, enabled: true, title: 'CTA' },
      ];
    }
    return settings.homepage_sections
      .filter((section: HomepageSection) => section.enabled)
      .sort((a: HomepageSection, b: HomepageSection) => a.order - b.order);
  }, [settings?.homepage_sections]);

  const showBanner = heroMode === 'both' || heroMode === 'banner_only' || heroMode === 'banner_as_background';
  const showHero = heroMode === 'both' || heroMode === 'hero_only' || heroMode === 'banner_as_background';
  const heroAsOverlay = heroMode === 'banner_as_background';

  return (
    <DynamicPublicLayout>
      {/* Banner / Hero combo */}
      {heroAsOverlay ? (
        <div className="relative">
          <BannerCarousel template={template as any} compact />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60 pointer-events-none" />
          <div className="relative z-10 -mt-[320px] md:-mt-[420px]">
            {(() => {
              const HeroComp = sectionComponents['hero'];
              return HeroComp ? <HeroComp settings={settings ?? undefined} /> : null;
            })()}
          </div>
        </div>
      ) : (
        <>
          {showBanner && <BannerCarousel template={template as any} />}
        </>
      )}
      {/* Quick Menu Grid – always visible right after banner/hero */}
      <QuickMenuGrid settings={settings ?? undefined} />

      {/* Jamaah Tracker – only visible for logged-in users */}
      <JamaahTrackerWidget />

      {enabledSections.map((section: HomepageSection) => {
        if (section.id === 'hero') {
          if (heroAsOverlay) return null; // already rendered above
          if (!showHero) return null;
        }
        const Component = sectionComponents[section.id];
        if (!Component) return null;
        return <Component key={section.id} settings={settings ?? undefined} />;
      })}
    </DynamicPublicLayout>
  );
};

export default Index;
