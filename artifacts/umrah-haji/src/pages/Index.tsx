import { useMemo } from 'react';
import { DynamicPublicLayout } from '@/components/layout/DynamicPublicLayout';
import { BannerCarousel } from '@/components/home/BannerCarousel';
import { ThemedHeroSection } from '@/components/home/ThemedHeroSection';
import { ThemedCTASection } from '@/components/home/ThemedCTASection';
import { FeaturedPackages } from '@/components/home/FeaturedPackages';
import { WhyChooseUs } from '@/components/home/WhyChooseUs';
import { Testimonials } from '@/components/home/Testimonials';
import { JamaahTrackerWidget } from '@/components/home/JamaahTrackerWidget';
import { FloatingChatBubble } from '@/components/home/FloatingChatBubble';
import { useWebsiteSettings, HomepageSection, WebsiteSettings } from '@/hooks/useWebsiteSettingsOptimized';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const { data: settings, isLoading } = useWebsiteSettings();
  const template = settings?.template || 'classic';
  const heroMode = (settings as any)?.hero_display_mode || 'both';

  const sectionComponents: Record<string, React.ComponentType<{ settings?: WebsiteSettings }>> = useMemo(() => ({
    hero: ThemedHeroSection as any,
    featured_packages: FeaturedPackages as any,
    why_choose_us: WhyChooseUs as any,
    testimonials: Testimonials as any,
    cta: ThemedCTASection as any,
  }), []);

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

      {/* Floating AI Chat Bubble */}
      <FloatingChatBubble />
    </DynamicPublicLayout>
  );
};

export default Index;
