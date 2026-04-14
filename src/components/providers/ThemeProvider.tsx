import { ReactNode, useEffect, useMemo } from 'react';
import { useWebsiteSettings, WebsiteSettings } from '@/hooks/useWebsiteSettings';

interface ThemeProviderProps {
  children: ReactNode;
  settings?: WebsiteSettings | null;
}

const THEME_CACHE_KEY = 'website-theme-cache';
const THEME_VERSION_KEY = 'website-theme-version';
const CURRENT_THEME_VERSION = '2'; // Increment this when cache structure changes

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

// Helper to update or create meta tags
function updateMetaTag(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let element = document.querySelector(`meta[${attr}="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

// Apply dynamic meta tags for SEO
function applyMetaTags(settings: WebsiteSettings | null | undefined) {
  if (!settings) return;

  const title = settings.meta_title || settings.company_name || 'Umrah Haji';
  const description = settings.meta_description || settings.tagline || 'Sistem Manajemen Umrah & Haji';
  const logo = settings.logo_url || '/favicon.ico';

  document.title = title;
  updateMetaTag('description', description);
  
  // Open Graph
  updateMetaTag('og:title', title, 'property');
  updateMetaTag('og:description', description, 'property');
  updateMetaTag('og:image', logo, 'property');
  
  // Twitter
  updateMetaTag('twitter:title', title);
  updateMetaTag('twitter:description', description);
  updateMetaTag('twitter:image', logo);

  // Theme Color (Sync with Primary)
  if (settings.primary_color) {
    // Convert HSL to Hex or similar if needed, but for now use the variable
    updateMetaTag('theme-color', `hsl(${settings.primary_color})`);
  }

  // Google Search Console Verification
  if (settings.google_console_verification) {
    updateMetaTag('google-site-verification', settings.google_console_verification);
  }

  const iconUrl = settings.favicon_url || settings.logo_url;
  if (iconUrl) {
    let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    favicon.href = iconUrl;
    
    // Apple Touch Icon
    let appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
    if (!appleIcon) {
      appleIcon = document.createElement('link');
      appleIcon.rel = 'apple-touch-icon';
      document.head.appendChild(appleIcon);
    }
    appleIcon.href = iconUrl;
  }
}

/**
 * Generate a hash of the settings to detect changes
 * This helps invalidate cache when settings structure changes
 */
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
  
  // Simple hash function - in production, consider using a proper hashing library
  return btoa(JSON.stringify(hashableData)).substring(0, 16);
}

/**
 * ThemeProvider component that applies website settings to the document
 * Includes improved caching with version control to prevent stale styles
 */
export function ThemeProvider({ children, settings: propSettings }: ThemeProviderProps) {
  const { data: fetchedSettings } = useWebsiteSettings();
  const settings = propSettings !== undefined ? propSettings : fetchedSettings;

  const cssVariables = useMemo(() => generateCSSVariables(settings), [settings]);
  const settingsHash = useMemo(() => generateSettingsHash(settings), [settings]);

  useEffect(() => {
    if (!settings) return;

    // Check if cached version is still valid
    try {
      const cachedVersion = localStorage.getItem(THEME_VERSION_KEY);
      const cachedHash = localStorage.getItem(`${THEME_CACHE_KEY}-hash`);
      
      // Clear cache if version mismatch or hash mismatch (settings changed)
      if (cachedVersion !== CURRENT_THEME_VERSION || cachedHash !== settingsHash) {
        localStorage.removeItem(THEME_CACHE_KEY);
        localStorage.removeItem(`${THEME_CACHE_KEY}-hash`);
      }
    } catch {
      // Ignore quota errors
    }

    // Apply CSS variables
    applyCSSVariables(cssVariables, settings);

      // Cache CSS variables and metadata for instant apply on next reload
    try {
      localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(cssVariables));
      localStorage.setItem(THEME_VERSION_KEY, CURRENT_THEME_VERSION);
      localStorage.setItem(`${THEME_CACHE_KEY}-hash`, settingsHash);
      
      // Cache SEO settings for instant head tag injection
      if (settings.google_console_verification) {
        localStorage.setItem('website-seo-verification', settings.google_console_verification);
      } else {
        localStorage.removeItem('website-seo-verification');
      }
    } catch {
      // Ignore quota errors (localStorage full)
    }

    // Load Google Fonts
    loadGoogleFonts(settings.heading_font, settings.body_font);

    // Apply meta tags
    applyMetaTags(settings);
  }, [settings, cssVariables, settingsHash]);

  return <>{children}</>;
}

export { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
