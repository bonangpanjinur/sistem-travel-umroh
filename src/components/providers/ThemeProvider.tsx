import { ReactNode, useEffect, useMemo } from 'react';
import { useWebsiteSettings, WebsiteSettings } from '@/hooks/useWebsiteSettings';

interface ThemeProviderProps {
  children: ReactNode;
  settings?: WebsiteSettings | null;
}

const THEME_CACHE_KEY = 'website-theme-cache';

// Generate CSS variables from website settings
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

// Apply CSS variables to root element
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

// Load Google Fonts dynamically
function loadGoogleFonts(headingFont: string | null, bodyFont: string | null) {
  const fonts = [headingFont, bodyFont].filter(Boolean) as string[];
  const uniqueFonts = [...new Set(fonts)];
  
  if (uniqueFonts.length === 0) return;

  const existingLink = document.getElementById('dynamic-google-fonts');
  if (existingLink) existingLink.remove();

  const fontFamilies = uniqueFonts.map(f => f.replace(/\s+/g, '+')).join('&family=');
  const link = document.createElement('link');
  link.id = 'dynamic-google-fonts';
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontFamilies}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

// Apply dynamic meta tags for SEO
function applyMetaTags(settings: WebsiteSettings | null | undefined) {
  if (!settings) return;

  if (settings.meta_title) {
    document.title = settings.meta_title;
  }

  let metaDescription = document.querySelector('meta[name="description"]');
  if (!metaDescription) {
    metaDescription = document.createElement('meta');
    metaDescription.setAttribute('name', 'description');
    document.head.appendChild(metaDescription);
  }
  if (settings.meta_description) {
    metaDescription.setAttribute('content', settings.meta_description);
  }

  if (settings.favicon_url) {
    let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    favicon.href = settings.favicon_url;
  }
}

// NOTE: Theme caching is now handled by the inline script in index.html
// This ensures the theme is applied before React renders, preventing FOUC

export function ThemeProvider({ children, settings: propSettings }: ThemeProviderProps) {
  const { data: fetchedSettings } = useWebsiteSettings();
  const settings = propSettings !== undefined ? propSettings : fetchedSettings;

  const cssVariables = useMemo(() => generateCSSVariables(settings), [settings]);

  useEffect(() => {
    if (!settings) return;

    // Apply CSS variables
    applyCSSVariables(cssVariables, settings);

    // Cache to localStorage for instant apply on next reload
    try {
      localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(cssVariables));
    } catch {
      // Ignore quota errors
    }

    // Load Google Fonts
    loadGoogleFonts(settings.heading_font, settings.body_font);

    // Apply meta tags
    applyMetaTags(settings);
  }, [settings, cssVariables]);

  return <>{children}</>;
}

export { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
