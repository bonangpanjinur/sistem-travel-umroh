import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ThemedHeroSection } from '@/components/home/ThemedHeroSection';
import { ThemedCTASection } from '@/components/home/ThemedCTASection';
import { FeaturedPackages } from '@/components/home/FeaturedPackages';
import { WhyChooseUs } from '@/components/home/WhyChooseUs';
import { Testimonials } from '@/components/home/Testimonials';
import { useTenantWebsiteSettings, HomepageSection, WebsiteSettings } from '@/hooks/useWebsiteSettings';
import { Skeleton } from '@/components/ui/skeleton';
import { TenantPublicLayout } from '@/components/layout/TenantPublicLayout';
import { NotFound } from './TenantNotFound';
import { useTenant } from '@/contexts/TenantContext';
import { useSaveAgentRef } from '@/hooks/useAgentRef';

export default function AgentWebsite() {
  const { agentSlug } = useParams<{ agentSlug: string }>();
  const { data: settings, isLoading, isError } = useTenantWebsiteSettings('agent', agentSlug);
  const { setTenant } = useTenant();

  // Simpan referensi agen ke localStorage agar booking auto-attribut ke agen ini
  useSaveAgentRef({
    agentId: settings?.agent_id ?? undefined,
    agentSlug: agentSlug ?? undefined,
  });

  // Set tenant context when agent is loaded
  useEffect(() => {
    if (settings?.agent_id) {
      setTenant({
        type: 'agent',
        id: settings.agent_id,
        slug: agentSlug ?? null,
        name: settings.company_name,
      });
    }
  }, [settings?.agent_id, settings?.company_name, agentSlug, setTenant]);

  /**
   * Map template names to their corresponding Hero and CTA components
   * All templates are now fully implemented
   */
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
