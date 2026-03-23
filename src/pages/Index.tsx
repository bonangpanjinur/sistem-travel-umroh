import { useMemo } from 'react';
import { DynamicPublicLayout } from '@/components/layout/DynamicPublicLayout';
import { DynamicHeroSection } from '@/components/home/DynamicHeroSection';
import { ModernHeroSection } from '@/components/home/ModernHeroSection';
import { LuxuryHeroSection } from '@/components/home/LuxuryHeroSection';
import { IslamicHeroSection } from '@/components/home/IslamicHeroSection';
import { FuturisticHeroSection } from '@/components/home/FuturisticHeroSection';
import { NatureHeroSection } from '@/components/home/NatureHeroSection';
import { FeaturedPackages } from '@/components/home/FeaturedPackages';
import { WhyChooseUs } from '@/components/home/WhyChooseUs';
import { Testimonials } from '@/components/home/Testimonials';
import { DynamicCTASection } from '@/components/home/DynamicCTASection';
import { ModernCTASection } from '@/components/home/ModernCTASection';
import { LuxuryCTASection } from '@/components/home/LuxuryCTASection';
import { IslamicCTASection } from '@/components/home/IslamicCTASection';
import { FuturisticCTASection } from '@/components/home/FuturisticCTASection';
import { NatureCTASection } from '@/components/home/NatureCTASection';
import { useWebsiteSettings, HomepageSection, WebsiteSettings } from '@/hooks/useWebsiteSettings';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const { data: settings, isLoading } = useWebsiteSettings();
  const template = settings?.template || 'classic';

  const sectionComponents: Record<string, React.ComponentType<{ settings?: WebsiteSettings }>> = useMemo(() => ({
    hero: template === 'luxury' ? LuxuryHeroSection : (template === 'modern' ? ModernHeroSection : (template === 'islamic' ? IslamicHeroSection : (template === 'futuristic' ? FuturisticHeroSection : (template === 'nature' ? NatureHeroSection : DynamicHeroSection)))),
    featured_packages: FeaturedPackages as any,
    why_choose_us: WhyChooseUs as any,
    testimonials: Testimonials as any,
    cta: template === 'luxury' ? LuxuryCTASection : (template === 'modern' ? ModernCTASection : (template === 'islamic' ? IslamicCTASection : (template === 'futuristic' ? FuturisticCTASection : (template === 'nature' ? NatureCTASection : DynamicCTASection)))),
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

  if (isLoading) {
    return (
      <DynamicPublicLayout>
        <div className="min-h-screen">
          <Skeleton className="h-[600px] w-full" />
          <div className="container mx-auto py-12 space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
          </div>
        </div>
      </DynamicPublicLayout>
    );
  }

  return (
    <DynamicPublicLayout>
      {enabledSections.map((section: HomepageSection) => {
        const Component = sectionComponents[section.id];
        if (!Component) return null;
        return <Component key={section.id} settings={settings ?? undefined} />;
      })}
    </DynamicPublicLayout>
  );
};

export default Index;
