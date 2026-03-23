import { useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DynamicHeroSection } from '@/components/home/DynamicHeroSection';
import { ModernHeroSection } from '@/components/home/ModernHeroSection';
import { FuturisticHeroSection } from '@/components/home/FuturisticHeroSection';
import { NatureHeroSection } from '@/components/home/NatureHeroSection';
import { RoyalHeroSection } from '@/components/home/RoyalHeroSection';
import { FeaturedPackages } from '@/components/home/FeaturedPackages';
import { WhyChooseUs } from '@/components/home/WhyChooseUs';
import { Testimonials } from '@/components/home/Testimonials';
import { DynamicCTASection } from '@/components/home/DynamicCTASection';
import { ModernCTASection } from '@/components/home/ModernCTASection';
import { FuturisticCTASection } from '@/components/home/FuturisticCTASection';
import { NatureCTASection } from '@/components/home/NatureCTASection';
import { RoyalCTASection } from '@/components/home/RoyalCTASection';
import { useTenantWebsiteSettings, HomepageSection, WebsiteSettings } from '@/hooks/useWebsiteSettings';
import { Skeleton } from '@/components/ui/skeleton';
import { TenantPublicLayout } from '@/components/layout/TenantPublicLayout';
import { NotFound } from './TenantNotFound';
import { useTenant } from '@/contexts/TenantContext';

export default function AgentWebsite() {
  const { agentSlug } = useParams<{ agentSlug: string }>();
  const { data: settings, isLoading, isError } = useTenantWebsiteSettings('agent', agentSlug);
  const { setTenant } = useTenant();
  const template = settings?.template || 'classic';

  // Set tenant context when agent is loaded
  useEffect(() => {
    if (settings?.agent_id) {
      setTenant({
        type: 'agent',
        id: settings.agent_id,
        slug: agentSlug,
        name: settings.company_name,
      });
    }
  }, [settings?.agent_id, settings?.company_name, agentSlug, setTenant]);

  const sectionComponents: Record<string, React.ComponentType<{ settings?: WebsiteSettings }>> = useMemo(() => ({
    hero: 
      template === 'modern' ? ModernHeroSection : 
      template === 'futuristic' ? FuturisticHeroSection :
      template === 'nature' ? NatureHeroSection :
      template === 'royal' ? RoyalHeroSection :
      DynamicHeroSection,
    featured_packages: FeaturedPackages as any,
    why_choose_us: WhyChooseUs as any,
    testimonials: Testimonials as any,
    cta: 
      template === 'modern' ? ModernCTASection : 
      template === 'futuristic' ? FuturisticCTASection :
      template === 'nature' ? NatureCTASection :
      template === 'royal' ? RoyalCTASection :
      DynamicCTASection,
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
        return <Component key={section.id} settings={settings} />;
      })}
    </TenantPublicLayout>
  );
}
