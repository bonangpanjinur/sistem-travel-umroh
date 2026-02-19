import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { DynamicHeroSection } from '@/components/home/DynamicHeroSection';
import { ModernHeroSection } from '@/components/home/ModernHeroSection';
import { FeaturedPackages } from '@/components/home/FeaturedPackages';
import { WhyChooseUs } from '@/components/home/WhyChooseUs';
import { Testimonials } from '@/components/home/Testimonials';
import { DynamicCTASection } from '@/components/home/DynamicCTASection';
import { ModernCTASection } from '@/components/home/ModernCTASection';
import { useTenantWebsiteSettings, HomepageSection } from '@/hooks/useWebsiteSettings';
import { Skeleton } from '@/components/ui/skeleton';
import { TenantPublicLayout } from '@/components/layout/TenantPublicLayout';
import { NotFound } from './TenantNotFound';

export default function AgentWebsite() {
  const { agentSlug } = useParams<{ agentSlug: string }>();
  const { data: settings, isLoading, isError } = useTenantWebsiteSettings('agent', agentSlug);
  const template = settings?.template || 'classic';

  const sectionComponents: Record<string, React.ComponentType> = useMemo(() => ({
    hero: template === 'modern' ? ModernHeroSection : DynamicHeroSection,
    featured_packages: FeaturedPackages,
    why_choose_us: WhyChooseUs,
    testimonials: Testimonials,
    cta: template === 'modern' ? ModernCTASection : DynamicCTASection,
  }), [template]);

  const enabledSections = useMemo(() => {
    if (!settings?.homepage_sections) {
      return [
        { id: 'hero', order: 1, enabled: true, title: 'Hero' },
        { id: 'featured_packages', order: 2, enabled: true, title: 'Featured Packages' },
        { id: 'cta', order: 5, enabled: true, title: 'CTA' },
      ];
    }
    return settings.homepage_sections
      .filter((s: HomepageSection) => s.enabled)
      .sort((a: HomepageSection, b: HomepageSection) => a.order - b.order);
  }, [settings?.homepage_sections]);

  if (isLoading) {
    return (
      <TenantPublicLayout settings={settings}>
        <div className="min-h-screen">
          <Skeleton className="h-[600px] w-full" />
        </div>
      </TenantPublicLayout>
    );
  }

  if (isError || !settings) {
    return <NotFound type="agent" slug={agentSlug} />;
  }

  return (
    <TenantPublicLayout settings={settings}>
      {enabledSections.map((section: HomepageSection) => {
        const Component = sectionComponents[section.id];
        if (!Component) return null;
        return <Component key={section.id} />;
      })}
    </TenantPublicLayout>
  );
}
