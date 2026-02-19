import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { DynamicHeroSection } from '@/components/home/DynamicHeroSection';
import { FeaturedPackages } from '@/components/home/FeaturedPackages';
import { WhyChooseUs } from '@/components/home/WhyChooseUs';
import { Testimonials } from '@/components/home/Testimonials';
import { DynamicCTASection } from '@/components/home/DynamicCTASection';
import { useTenantWebsiteSettings, HomepageSection } from '@/hooks/useWebsiteSettings';
import { Skeleton } from '@/components/ui/skeleton';
import { TenantPublicLayout } from '@/components/layout/TenantPublicLayout';
import { NotFound } from './TenantNotFound';

const sectionComponents: Record<string, React.ComponentType> = {
  hero: DynamicHeroSection,
  featured_packages: FeaturedPackages,
  why_choose_us: WhyChooseUs,
  testimonials: Testimonials,
  cta: DynamicCTASection,
};

export default function BranchWebsite() {
  const { branchSlug } = useParams<{ branchSlug: string }>();
  const { data: settings, isLoading, isError } = useTenantWebsiteSettings('branch', branchSlug);

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
          <div className="container mx-auto py-12 space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
          </div>
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
        return <Component key={section.id} />;
      })}
    </TenantPublicLayout>
  );
}
