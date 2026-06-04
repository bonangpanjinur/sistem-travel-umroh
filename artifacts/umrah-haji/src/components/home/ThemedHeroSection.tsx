import { useTheme } from '@/lib/themes/useTheme';
import { WebsiteSettings } from '@/hooks/useWebsiteSettings';
import { DynamicHeroSection } from './DynamicHeroSection';
import { ModernHeroSection } from './ModernHeroSection';
import { LuxuryHeroSection } from './LuxuryHeroSection';
import { IslamicHeroSection } from './IslamicHeroSection';
import { FuturisticHeroSection } from './FuturisticHeroSection';
import { NatureHeroSection } from './NatureHeroSection';
import { RoyalHeroSection } from './RoyalHeroSection';
import type { HeroVariant } from '@/lib/themes/registry';

interface Props {
  settings?: WebsiteSettings | null;
}

const HERO_BY_VARIANT: Record<HeroVariant, React.ComponentType<{ settings?: WebsiteSettings }>> = {
  classic: DynamicHeroSection as any,
  split: ModernHeroSection as any,
  asymmetric: IslamicHeroSection as any,
  neon: FuturisticHeroSection as any,
  serene: NatureHeroSection as any,
  royal: RoyalHeroSection as any,
};

/**
 * Polymorphic Hero — picks the variant from the resolved theme/layout.
 * Replaces hardcoded ternary chains across Index/BranchWebsite/AgentWebsite.
 */
export function ThemedHeroSection({ settings }: Props) {
  const { layout, tokens } = useTheme(settings ?? undefined);
  const variant: HeroVariant = layout.hero ?? tokens.components.hero;
  // Luxury uses its own asymmetric variant — prefer LuxuryHeroSection when slug is luxury.
  const Comp =
    tokens.slug === 'luxury'
      ? LuxuryHeroSection
      : HERO_BY_VARIANT[variant] ?? DynamicHeroSection;
  return <Comp settings={settings ?? undefined} />;
}