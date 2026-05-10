import { ReactNode, useEffect, useMemo, useRef } from 'react';
import { useWebsiteSettings, WebsiteSettings } from '@/hooks/useWebsiteSettingsOptimized';

interface ThemeProviderProps {
  children: ReactNode;
  settings?: WebsiteSettings | null;
}

const THEME_CACHE_KEY = 'website-theme-cache';
const THEME_VERSION_KEY = 'website-theme-version';
const CURRENT_THEME_VERSION = '2';

// Fonts already preloaded in index.html — skip duplicate loading for these.
const PRELOADED_FONTS = new Set(['Inter', 'Plus Jakarta Sans']);

function generateCSSVariables(settings: WebsiteSettings | null | undefined): Record<string, string> {
  if (!settings) return {};

  return {
    '--primary': settings.primary_color || '142 70% 45%',
    '--primary-foreground': '0 0% 100%',
    '--secondary': settings.secondary_color || '45 93% 47%',
    '--secondary-foreground': '0 0% 0%',
    '--accent': settings.accent_color || '142 60% 35%',
    '--accent-foreground': '0 0% 100%',
    '--background': settings.background_color || '0 0% 100%',
    '--foreground': settings.foreground_color || '142 20% 10%',
    '--muted': `${settings.background_color?.split(' ')[0] || '0'} 10% 94%`,
    '--muted-foreground': `${settings.foreground_color?.split(' ')[0] || '0'} 10% 45%`,
    '--card': settings.background_color || '0 0% 100%',
    '--card-foreground': settings.foreground_color || '142 20% 10%',
    '--popover': settings.background_color || '0 0% 100%',
    '--popover-foreground': settings.foreground_color || '142 20% 10%',
    '--border': `${settings.foreground_color?.split(' ')[0] || '0'} 10% 90%`,
    '--input': `${settings.foreground_color?.split(' ')[0] || '0'} 10% 90%`,
    '--ring': settings.primary_color || '142 70% 45%',
    '--sidebar-primary': settings.primary_color || '142 70% 45%',
    '--sidebar-accent': settings.accent_color || '142 60% 35%',
    '--sidebar-background': settings.background_color || '0 0% 100%',
    '--sidebar-foreground': settings.foreground_color || '142 20% 10%',
    '--sidebar-border': `${settings.foreground_color?.split(' ')[0] || '0'} 10% 90%`,
    '--sidebar-ring': settings.primary_color || '142 70% 45%',
    '--success': '142 76% 36%',
    '--success-foreground': '0 0% 100%',
    '--warning': '38 92% 50%',
    '--warning-foreground': '0 0% 0%',
    '--info': '199 89% 48%',
    '--info-foreground': '0 0% 100%',
    '--success-muted': '142 76% 95%',
    '--warning-muted': '38 92% 95%',
    '--info-muted': '199 89% 95%',
    '--destructive': '0 84% 60%',
    '--destructive-foreground': '0 0% 100%',
    '--destructive-muted': '0 84% 95%',
    '--font-heading': settings.heading_font || 'Plus Jakarta Sans',
    '--font-body': settings.body_font || 'Inter',
  };
}

function applyCSSVariables(cssVariables: Record<string, string>, settings?: Partial<WebsiteSettings> | null) {
  const root = document.documentElement;
  Object.entries(cssVariables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  if (settings?.heading_font) {
    root.style.setProperty('--font-display', `"${settings.heading_font}", sans-serif`);
  }
  if (settings?.body_font) {
    root.style.setProperty('--font-sans', `"${settings.body_font}", sans-serif`);
  }
}

// Load Google Fonts dynamically — but skip fonts already preloaded in index.html.
function loadGoogleFonts(headingFont: string | null, bodyFont: string | null) {
  const fonts = [headingFont, bodyFont].filter(Boolean) as string[];
  // Skip preloaded fonts to avoid duplicate render-blocking <link> tags.
  const customFonts = [...new Set(fonts)].filter(f => !PRELOADED_FONTS.has(f));

  const existingLink = document.getElementById('dynamic-google-fonts');

  if (customFonts.length === 0) {
    // Nothing custom to load — clean up any prior dynamic link.
    if (existingLink) existingLink.remove();
    return;
  }

  const fontFamilies = customFonts.map(f => f.replace(/\s+/g, '+')).join('&family=');
  const newHref = `https://fonts.googleapis.com/css2?family=${fontFamilies}:wght@400;500;600;700&display=swap`;

  // Skip if already loaded with the same href.
  if (existingLink && (existingLink as HTMLLinkElement).href === newHref) return;
  if (existingLink) existingLink.remove();

  const link = document.createElement('link');
  link.id = 'dynamic-google-fonts';
  link.rel = 'stylesheet';
  link.href = newHref;
  document.head.appendChild(link);
}

function updateMetaTag(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let element = document.querySelector(`meta[${attr}="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

interface PWAIconConfig {
  iconUrl?: string | null;
  appName?: string;
  shortName?: string;
  themeColor?: string;
  bgColor?: string;
}

function getPWAIconConfig(settings: WebsiteSettings | null | undefined): PWAIconConfig {
  const raw = settings?.custom_sections as unknown;
  if (!raw || Array.isArray(raw) || typeof raw !== 'object') return {};
  return ((raw as Record<string, unknown>).pwa_icon_config ?? {}) as PWAIconConfig;
}

function applyMetaTags(settings: WebsiteSettings | null | undefined) {
  if (!settings) return;

  const pwa = getPWAIconConfig(settings);

  const title = settings.meta_title || settings.company_name || 'Umrah Haji';
  const description = settings.meta_description || settings.tagline || 'Sistem Manajemen Umrah & Haji';
  const logo = settings.logo_url || '/favicon.ico';

  document.title = title;
  updateMetaTag('description', description);
  updateMetaTag('og:title', title, 'property');
  updateMetaTag('og:description', description, 'property');
  updateMetaTag('og:image', logo, 'property');
  updateMetaTag('twitter:title', title);
  updateMetaTag('twitter:description', description);
  updateMetaTag('twitter:image', logo);

  // theme-color: prefer the PWA hex override, then fall back to primary_color (HSL → hex conversion not needed — hex works fine)
  const themeColor = pwa.themeColor || (settings.primary_color ? `hsl(${settings.primary_color})` : null);
  if (themeColor) {
    updateMetaTag('theme-color', themeColor);
  }

  // PWA-specific: apple title uses the short name set in PWA Settings
  const appleTitle =
    pwa.shortName ||
    (settings.company_name ? settings.company_name.split(' ')[0] : null) ||
    title;
  updateMetaTag('apple-mobile-web-app-title', appleTitle);

  if (settings.google_console_verification) {
    updateMetaTag('google-site-verification', settings.google_console_verification);
  }

  // Favicon / apple-touch-icon: prefer custom PWA icon, then favicon/logo
  const iconUrl = pwa.iconUrl || settings.favicon_url || settings.logo_url;
  if (iconUrl) {
    let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    favicon.href = iconUrl;

    let appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
    if (!appleIcon) {
      appleIcon = document.createElement('link');
      appleIcon.rel = 'apple-touch-icon';
      document.head.appendChild(appleIcon);
    }
    appleIcon.href = iconUrl;
  }
}

function generateSettingsHash(settings: WebsiteSettings | null | undefined): string {
  if (!settings) return '';

  const hashableData = {
    colors: {
      primary: settings.primary_color,
      secondary: settings.secondary_color,
      accent: settings.accent_color,
      background: settings.background_color,
      foreground: settings.foreground_color,
    },
    fonts: {
      heading: settings.heading_font,
      body: settings.body_font,
    },
    template: settings.template,
    updated_at: settings.updated_at,
  };

  return btoa(JSON.stringify(hashableData)).substring(0, 16);
}

/**
 * ThemeProvider — applies website settings to the document.
 * Effects are split by concern to minimize redundant DOM mutations.
 */
export function ThemeProvider({ children, settings: propSettings }: ThemeProviderProps) {
  const { data: fetchedSettings } = useWebsiteSettings();
  const settings = propSettings !== undefined ? propSettings : fetchedSettings;

  const cssVariables = useMemo(() => generateCSSVariables(settings), [settings]);
  const settingsHash = useMemo(() => generateSettingsHash(settings), [settings]);
  const lastAppliedHashRef = useRef<string>('');

  // Effect 1: CSS variables — re-apply only when computed values change.
  useEffect(() => {
    if (!settings) return;
    applyCSSVariables(cssVariables, settings);
  }, [cssVariables, settings]);

  // Effect 2: Fonts — re-apply only when font names change.
  useEffect(() => {
    if (!settings) return;
    loadGoogleFonts(settings.heading_font, settings.body_font);
  }, [settings?.heading_font, settings?.body_font]);

  // Effect 3: Meta tags — re-apply only when relevant SEO/PWA fields change.
  useEffect(() => {
    if (!settings) return;
    applyMetaTags(settings);
  }, [
    settings?.meta_title,
    settings?.meta_description,
    settings?.company_name,
    settings?.tagline,
    settings?.logo_url,
    settings?.favicon_url,
    settings?.primary_color,
    settings?.google_console_verification,
    // custom_sections holds pwa_icon_config (shortName, themeColor, iconUrl)
    settings?.custom_sections,
  ]);

  // Effect 4: Cache write — only when the settings hash actually changes.
  useEffect(() => {
    if (!settings || !settingsHash) return;
    if (lastAppliedHashRef.current === settingsHash) return;
    lastAppliedHashRef.current = settingsHash;

    try {
      const cachedVersion = localStorage.getItem(THEME_VERSION_KEY);
      const cachedHash = localStorage.getItem(`${THEME_CACHE_KEY}-hash`);

      if (cachedVersion !== CURRENT_THEME_VERSION || cachedHash !== settingsHash) {
        localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(cssVariables));
        localStorage.setItem(THEME_VERSION_KEY, CURRENT_THEME_VERSION);
        localStorage.setItem(`${THEME_CACHE_KEY}-hash`, settingsHash);
      }

      if (settings.google_console_verification) {
        localStorage.setItem('website-seo-verification', settings.google_console_verification);
      } else {
        localStorage.removeItem('website-seo-verification');
      }
    } catch {
      // Ignore quota errors
    }
  }, [settingsHash, cssVariables, settings]);

  return <>{children}</>;
}

export { useWebsiteSettings } from '@/hooks/useWebsiteSettingsOptimized';
