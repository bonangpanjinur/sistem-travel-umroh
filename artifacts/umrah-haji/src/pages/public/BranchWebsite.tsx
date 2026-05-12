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
import { TenantChatBubble } from '@/components/public/TenantChatBubble';

export default function BranchWebsite() {
  const { branchSlug } = useParams<{ branchSlug: string }>();
  const { data: settings, isLoading, isError } = useTenantWebsiteSettings('branch', branchSlug);
  const { setTenant } = useTenant();

  // Simpan referensi cabang ke localStorage agar booking auto-attribut ke cabang ini
  useSaveAgentRef({
    branchId: settings?.branch_id ?? undefined,
    branchSlug: branchSlug ?? undefined,
  });

  // Set tenant context when branch is loaded
  useEffect(() => {
    if (settings?.branch_id) {
      setTenant({
        type: 'branch',
        id: settings.branch_id,
        slug: branchSlug ?? null,
        name: settings.company_name,
      });
    }
  }, [settings?.branch_id, settings?.company_name, branchSlug, setTenant]);

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
        { id: 'why_choose_us', order: 3, enabled: true, title: 'Why Choose Us' },
        { id: 'testimonials', order: 4, enabled: true, title: 'Testimonials' },
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
    return <NotFound type="branch" slug={branchSlug} />;
  }

  return (
    <TenantPublicLayout settings={settings}>
      {enabledSections.map((section: HomepageSection) => {
        const Component = sectionComponents[section.id];
        if (!Component) return null;
        return <Component key={section.id} settings={settings} />;
      })}
      <TenantChatBubble
        waNumber={settings.footer_whatsapp}
        siteName={settings.company_name}
        gradientFrom="from-emerald-600"
        gradientTo="to-teal-700"
      />
    </TenantPublicLayout>
  );
}
