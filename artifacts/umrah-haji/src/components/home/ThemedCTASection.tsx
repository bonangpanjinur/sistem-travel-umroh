import { useTheme } from '@/lib/themes/useTheme';
import { WebsiteSettings } from '@/hooks/useWebsiteSettings';
import { DynamicCTASection } from './DynamicCTASection';
import { ModernCTASection } from './ModernCTASection';
import { LuxuryCTASection } from './LuxuryCTASection';
import { IslamicCTASection } from './IslamicCTASection';
import { FuturisticCTASection } from './FuturisticCTASection';
import { NatureCTASection } from './NatureCTASection';
import { RoyalCTASection } from './RoyalCTASection';
import type { CtaVariant } from '@/lib/themes/registry';

interface Props {
  settings?: WebsiteSettings | null;
}

const CTA_BY_VARIANT: Record<CtaVariant, React.ComponentType<{ settings?: WebsiteSettings }>> = {
  classic: DynamicCTASection as any,
  gradient: ModernCTASection as any,
  serif: LuxuryCTASection as any,
  islamic: IslamicCTASection as any,
  neon: FuturisticCTASection as any,
  organic: NatureCTASection as any,
  gold: RoyalCTASection as any,
};

/** Polymorphic CTA — picks the variant from the resolved theme/layout. */
export function ThemedCTASection({ settings }: Props) {
  const { layout, tokens } = useTheme(settings ?? undefined);
  const variant: CtaVariant = layout.cta ?? tokens.components.cta;
  const Comp = CTA_BY_VARIANT[variant] ?? DynamicCTASection;
  return <Comp settings={settings ?? undefined} />;
}