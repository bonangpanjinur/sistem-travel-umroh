/**
 * Theme Registry — single source of truth untuk 7 tema bawaan.
 *
 * Setiap tema mendefinisikan:
 * - palet HSL (primary/secondary/accent/background/foreground/surface/accentGold)
 * - tipografi heading/body
 * - radius, density, mood
 * - hero / cta variant + card style + ornamen
 *
 * Komponen UI (Hero, CTA, Testimonials, dll.) membaca tema lewat
 * `useTheme()` dan tidak boleh meng-hardcode warna lagi.
 */

export type ThemeSlug =
  | 'classic'
  | 'modern'
  | 'luxury'
  | 'islamic'
  | 'futuristic'
  | 'nature'
  | 'royal';

export type ThemeMood = 'light' | 'dark' | 'sepia';
export type ThemeRadius = 'sharp' | 'soft' | 'pill';
export type ThemeDensity = 'compact' | 'comfortable' | 'spacious';
export type ThemeOrnament =
  | 'none'
  | 'islamic'
  | 'neon'
  | 'serif-divider'
  | 'leaf'
  | 'gold-foil';

export type HeroVariant =
  | 'classic'
  | 'split'
  | 'asymmetric'
  | 'neon'
  | 'serene'
  | 'royal';

export type CtaVariant =
  | 'classic'
  | 'gradient'
  | 'serif'
  | 'islamic'
  | 'neon'
  | 'organic'
  | 'gold';

export type CardStyle = 'flat' | 'glass' | 'bordered' | 'elevated';

export interface ThemeTokens {
  slug: ThemeSlug;
  name: string;
  description: string;
  colors: {
    /** HSL string (e.g. "142 70% 38%") — never includes hsl() wrapper */
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    surface: string;
    accentGold?: string;
  };
  fonts: { heading: string; body: string };
  radius: ThemeRadius;
  density: ThemeDensity;
  mood: ThemeMood;
  ornament: ThemeOrnament;
  components: {
    hero: HeroVariant;
    cta: CtaVariant;
    cards: CardStyle;
  };
}

export const THEMES: Record<ThemeSlug, ThemeTokens> = {
  classic: {
    slug: 'classic',
    name: 'Classic Professional',
    description:
      'Layout korporat dengan hero besar, statistik, dan section standar. Cocok untuk tampilan profesional.',
    colors: {
      primary: '142 70% 38%',
      secondary: '45 90% 50%',
      accent: '160 65% 32%',
      background: '0 0% 100%',
      foreground: '142 25% 12%',
      surface: '0 0% 98%',
    },
    fonts: { heading: 'Plus Jakarta Sans', body: 'Inter' },
    radius: 'soft',
    density: 'comfortable',
    mood: 'light',
    ornament: 'none',
    components: { hero: 'classic', cta: 'classic', cards: 'elevated' },
  },
  modern: {
    slug: 'modern',
    name: 'Modern Minimalist',
    description:
      'Hero split-screen, layout horizontal lega, CTA card-style bergradasi.',
    colors: {
      primary: '215 90% 50%',
      secondary: '215 30% 25%',
      accent: '195 90% 45%',
      background: '0 0% 100%',
      foreground: '220 25% 10%',
      surface: '215 30% 97%',
    },
    fonts: { heading: 'Space Grotesk', body: 'Inter' },
    radius: 'sharp',
    density: 'spacious',
    mood: 'light',
    ornament: 'none',
    components: { hero: 'split', cta: 'gradient', cards: 'flat' },
  },
  luxury: {
    slug: 'luxury',
    name: 'Elegant Luxury',
    description:
      'Tipografi serif, aksen emas halus, layout asimetris untuk segmen premium.',
    colors: {
      primary: '160 50% 22%',
      secondary: '40 75% 55%',
      accent: '40 65% 45%',
      background: '40 30% 97%',
      foreground: '160 25% 12%',
      surface: '40 25% 94%',
      accentGold: '40 80% 55%',
    },
    fonts: { heading: 'Playfair Display', body: 'Cormorant Garamond' },
    radius: 'soft',
    density: 'spacious',
    mood: 'sepia',
    ornament: 'serif-divider',
    components: { hero: 'asymmetric', cta: 'serif', cards: 'bordered' },
  },
  islamic: {
    slug: 'islamic',
    name: 'Islamic Contemporary',
    description:
      'Sentuhan ornamen Islami, search widget menonjol, layout dinamis & clean.',
    colors: {
      primary: '162 80% 28%',
      secondary: '45 92% 52%',
      accent: '162 60% 38%',
      background: '0 0% 99%',
      foreground: '162 30% 12%',
      surface: '162 30% 96%',
      accentGold: '45 92% 52%',
    },
    fonts: { heading: 'Amiri', body: 'Plus Jakarta Sans' },
    radius: 'soft',
    density: 'comfortable',
    mood: 'light',
    ornament: 'islamic',
    components: { hero: 'asymmetric', cta: 'islamic', cards: 'glass' },
  },
  futuristic: {
    slug: 'futuristic',
    name: 'Futuristic Dark',
    description: 'Dark UI elegan dengan aksen neon dan elemen digital.',
    colors: {
      primary: '180 90% 55%',
      secondary: '280 80% 60%',
      accent: '160 90% 50%',
      background: '230 25% 6%',
      foreground: '0 0% 96%',
      surface: '230 20% 10%',
    },
    fonts: { heading: 'Space Grotesk', body: 'Inter' },
    radius: 'sharp',
    density: 'compact',
    mood: 'dark',
    ornament: 'neon',
    components: { hero: 'neon', cta: 'neon', cards: 'glass' },
  },
  nature: {
    slug: 'nature',
    name: 'Nature Serenity',
    description:
      'Palet alam, tipografi serif lembut, bentuk organik menenangkan.',
    colors: {
      primary: '152 35% 30%',
      secondary: '40 35% 60%',
      accent: '152 30% 45%',
      background: '60 25% 97%',
      foreground: '152 20% 15%',
      surface: '60 30% 94%',
    },
    fonts: { heading: 'Playfair Display', body: 'Lora' },
    radius: 'pill',
    density: 'spacious',
    mood: 'sepia',
    ornament: 'leaf',
    components: { hero: 'serene', cta: 'organic', cards: 'flat' },
  },
  royal: {
    slug: 'royal',
    name: 'Royal Gold',
    description:
      'Background gelap mewah dengan aksen emas eksklusif untuk layanan VVIP.',
    colors: {
      primary: '42 95% 52%',
      secondary: '0 0% 8%',
      accent: '42 80% 45%',
      background: '0 0% 4%',
      foreground: '42 30% 92%',
      surface: '0 0% 8%',
      accentGold: '42 95% 52%',
    },
    fonts: { heading: 'Cinzel', body: 'Cormorant Garamond' },
    radius: 'soft',
    density: 'spacious',
    mood: 'dark',
    ornament: 'gold-foil',
    components: { hero: 'royal', cta: 'gold', cards: 'bordered' },
  },
};

export const THEME_SLUGS = Object.keys(THEMES) as ThemeSlug[];

export function getTheme(slug?: string | null): ThemeTokens {
  if (slug && slug in THEMES) return THEMES[slug as ThemeSlug];
  return THEMES.classic;
}

/** Map radius keyword → CSS `--radius` value (rem). */
export const RADIUS_MAP: Record<ThemeRadius, string> = {
  sharp: '0.25rem',
  soft: '0.625rem',
  pill: '1.25rem',
};

/** Map density keyword → vertical section padding. */
export const DENSITY_MAP: Record<ThemeDensity, string> = {
  compact: '3rem',
  comfortable: '5rem',
  spacious: '6.5rem',
};

/**
 * Default layout_variant per tema — section variant yang cocok dengan mood
 * tema. Bisa di-override per tenant via `website_settings.layout_variant`.
 */
export interface LayoutVariant {
  hero?: HeroVariant;
  cta?: CtaVariant;
  packages?: 'grid-3' | 'grid-4' | 'carousel';
  testimonials?: 'grid' | 'masonry' | 'slider';
  whyUs?: 'grid' | 'split' | 'numbered';
}

export const DEFAULT_LAYOUT: Record<ThemeSlug, LayoutVariant> = {
  classic:    { packages: 'grid-3', testimonials: 'grid',    whyUs: 'grid'     },
  modern:     { packages: 'grid-3', testimonials: 'slider',  whyUs: 'split'    },
  luxury:     { packages: 'grid-3', testimonials: 'grid',    whyUs: 'numbered' },
  islamic:    { packages: 'grid-3', testimonials: 'grid',    whyUs: 'grid'     },
  futuristic: { packages: 'grid-4', testimonials: 'masonry', whyUs: 'numbered' },
  nature:     { packages: 'grid-3', testimonials: 'grid',    whyUs: 'split'    },
  royal:      { packages: 'grid-3', testimonials: 'grid',    whyUs: 'numbered' },
};
