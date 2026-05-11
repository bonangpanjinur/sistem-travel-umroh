import { useMemo } from 'react';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettingsOptimized';
import {
  DEFAULT_LAYOUT,
  getTheme,
  LayoutVariant,
  ThemeTokens,
} from './registry';

export interface ResolvedTheme {
  tokens: ThemeTokens;
  layout: LayoutVariant;
  /** Quick mood checks for component branching. */
  isDark: boolean;
  isSepia: boolean;
  /** Tailwind-friendly accent classes derived from registry tokens. */
  cardClass: string;
}

function cardClassFor(style: ThemeTokens['components']['cards']): string {
  switch (style) {
    case 'glass':
      return 'bg-card/60 backdrop-blur-md border border-border/40 shadow-lg';
    case 'bordered':
      return 'bg-card border-2 border-border/60 shadow-sm';
    case 'flat':
      return 'bg-card border border-border/30';
    case 'elevated':
    default:
      return 'bg-card border border-border shadow-md';
  }
}

/**
 * Resolve current site theme tokens + layout variant from website_settings.
 * Components should call this instead of reading raw `settings.template`.
 */
export function useTheme(propSettings?: { template?: string | null; layout_variant?: any } | null): ResolvedTheme {
  const { data: fetched } = useWebsiteSettings();
  const settings = propSettings !== undefined ? propSettings : fetched;

  return useMemo(() => {
    const slug = settings?.template ?? 'classic';
    const tokens = getTheme(slug);
    const layoutOverride = (settings?.layout_variant ?? {}) as LayoutVariant;
    const layout: LayoutVariant = {
      ...DEFAULT_LAYOUT[tokens.slug],
      ...layoutOverride,
      hero: layoutOverride.hero ?? tokens.components.hero,
      cta: layoutOverride.cta ?? tokens.components.cta,
    };
    return {
      tokens,
      layout,
      isDark: tokens.mood === 'dark',
      isSepia: tokens.mood === 'sepia',
      cardClass: cardClassFor(tokens.components.cards),
    };
  }, [settings?.template, settings?.layout_variant]);
}
