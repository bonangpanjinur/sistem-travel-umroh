import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";
import { z } from "zod";

export interface HomepageSection {
  id: string;
  title: string;
  enabled: boolean;
  order: number;
}

export interface CustomSection {
  id: string;
  title: string;
  content: string;
  enabled: boolean;
  order: number;
}

export interface WebsiteSettings {
  id: string;
  active_theme: string;
  template: string;
  branch_id: string | null;
  agent_id: string | null;
  company_name: string | null;
  tagline: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  background_color: string | null;
  foreground_color: string | null;
  heading_font: string | null;
  body_font: string | null;
  homepage_sections: HomepageSection[] | null;
  custom_sections: CustomSection[] | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  hero_image_url: string | null;
  hero_cta_text: string | null;
  hero_cta_link: string | null;
  footer_address: string | null;
  footer_phone: string | null;
  footer_email: string | null;
  footer_whatsapp: string | null;
  social_instagram: string | null;
  social_facebook: string | null;
  social_youtube: string | null;
  social_tiktok: string | null;
  meta_title: string | null;
  meta_description: string | null;
  google_console_verification: string | null;
  nav_links: Array<{href: string; label: string}> | null;
  footer_links: Record<string, Array<{href: string; label: string}>> | null;
  footer_description: string | null;
  footer_bottom_text: string | null;
  cta_title: string | null;
  cta_subtitle: string | null;
  cta_image_url: string | null;
  cta_button_text: string | null;
  cta_button_link: string | null;
  featured_packages_count: number | null;
  package_card_layout: 'modern' | 'classic' | 'minimal' | null;
  package_card_image_ratio: '16/10' | '1/1' | '3/4' | '9/6' | null;
  package_card_show_airline: boolean | null;
  package_card_show_hotel: boolean | null;
  package_card_show_duration: boolean | null;
  package_card_show_departure: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ThemePreset {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  preview_image_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  foreground_color: string;
  heading_font: string | null;
  body_font: string | null;
  is_default: boolean | null;
  created_at: string | null;
}

const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";
const SETTINGS_CACHE_KEY = "website-settings-cache";
const SETTINGS_CACHE_TIME_KEY = "website-settings-cache-time";
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

type WebsiteSettingsRow = Database['public']['Tables']['website_settings']['Row'];

// Default settings untuk fallback
const DEFAULT_SETTINGS: WebsiteSettings = {
  id: SETTINGS_ID,
  active_theme: 'classic',
  template: 'classic',
  branch_id: null,
  agent_id: null,
  company_name: 'UmrohTravel',
  tagline: 'Perjalanan Suci Anda',
  logo_url: null,
  favicon_url: null,
  primary_color: '160 84% 25%',
  secondary_color: '160 20% 96%',
  accent_color: '45 93% 47%',
  background_color: '0 0% 100%',
  foreground_color: '160 50% 5%',
  heading_font: 'Plus Jakarta Sans',
  body_font: 'Inter',
  homepage_sections: [
    { id: 'hero', order: 1, enabled: true, title: 'Hero' },
    { id: 'featured_packages', order: 2, enabled: true, title: 'Featured Packages' },
    { id: 'why_choose_us', order: 3, enabled: true, title: 'Why Choose Us' },
    { id: 'testimonials', order: 4, enabled: true, title: 'Testimonials' },
    { id: 'cta', order: 5, enabled: true, title: 'CTA' },
  ],
  custom_sections: null,
  hero_title: 'Perjalanan Umroh Impian Anda',
  hero_subtitle: 'Nikmati pengalaman spiritual yang tak terlupakan',
  hero_image_url: null,
  hero_cta_text: 'Pesan Sekarang',
  hero_cta_link: '/packages',
  footer_address: null,
  footer_phone: null,
  footer_email: null,
  footer_whatsapp: null,
  social_instagram: null,
  social_facebook: null,
  social_youtube: null,
  social_tiktok: null,
  meta_title: 'UmrohTravel - Perjalanan Umroh Terpercaya',
  meta_description: 'Layanan perjalanan umroh berkualitas dengan harga terjangkau',
  google_console_verification: null,
  nav_links: null,
  footer_links: null,
  footer_description: null,
  footer_bottom_text: null,
  cta_title: null,
  cta_subtitle: null,
  cta_image_url: null,
  cta_button_text: null,
  cta_button_link: null,
  featured_packages_count: 6,
  package_card_layout: 'modern',
  package_card_image_ratio: '16/10',
  package_card_show_airline: true,
  package_card_show_hotel: true,
  package_card_show_duration: true,
  package_card_show_departure: true,
  created_at: null,
  updated_at: null,
};

const mapWebsiteSettings = (data: WebsiteSettingsRow): WebsiteSettings => {
  const raw = data as any;
  return {
    ...data,
    google_console_verification: raw.google_console_verification ?? null,
    homepage_sections: data.homepage_sections as unknown as HomepageSection[] | null,
    custom_sections: data.custom_sections as unknown as CustomSection[] | null,
    nav_links: data.nav_links as unknown as WebsiteSettings['nav_links'],
    footer_links: data.footer_links as unknown as WebsiteSettings['footer_links'],
    cta_title: raw.cta_title ?? null,
    cta_subtitle: raw.cta_subtitle ?? null,
    cta_image_url: raw.cta_image_url ?? null,
    cta_button_text: raw.cta_button_text ?? null,
    cta_button_link: raw.cta_button_link ?? null,
    featured_packages_count: raw.featured_packages_count ?? null,
    package_card_layout: raw.package_card_layout || 'modern',
    package_card_image_ratio: raw.package_card_image_ratio || '16/10',
    package_card_show_airline: raw.package_card_show_airline !== false,
    package_card_show_hotel: raw.package_card_show_hotel !== false,
    package_card_show_duration: raw.package_card_show_duration !== false,
    package_card_show_departure: raw.package_card_show_departure !== false,
  };
};

// Helper untuk mendapatkan cached settings
const getCachedSettings = (): WebsiteSettings | null => {
  try {
    const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
    const cacheTime = localStorage.getItem(SETTINGS_CACHE_TIME_KEY);
    
    if (!cached || !cacheTime) return null;
    
    const now = Date.now();
    const age = now - parseInt(cacheTime);
    
    // Return cache jika masih valid (< 1 jam)
    if (age < CACHE_DURATION) {
      return JSON.parse(cached);
    }
    
    // Clear expired cache
    localStorage.removeItem(SETTINGS_CACHE_KEY);
    localStorage.removeItem(SETTINGS_CACHE_TIME_KEY);
    return null;
  } catch (e) {
    return null;
  }
};

// Helper untuk menyimpan settings ke cache
const setCachedSettings = (settings: WebsiteSettings) => {
  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings));
    localStorage.setItem(SETTINGS_CACHE_TIME_KEY, Date.now().toString());
  } catch (e) {
    console.warn('Failed to cache settings:', e);
  }
};

// Validation schema for website settings
const websiteSettingsSchema = z.object({
  company_name: z.string().min(2, "Nama perusahaan minimal 2 karakter").nullable().optional(),
  footer_email: z.string().email("Format email tidak valid").nullable().optional().or(z.literal("")),
  footer_phone: z.string().min(10, "Nomor telepon minimal 10 digit").nullable().optional().or(z.literal("")),
  footer_whatsapp: z.string().min(10, "Nomor WhatsApp minimal 10 digit").nullable().optional().or(z.literal("")),
  logo_url: z.string().url("URL logo tidak valid").nullable().optional().or(z.literal("")),
  favicon_url: z.string().url("URL favicon tidak valid").nullable().optional().or(z.literal("")),
  hero_image_url: z.string().url("URL gambar hero tidak valid").nullable().optional().or(z.literal("")),
  google_console_verification: z.string().nullable().optional().or(z.literal("")),
});

export function useWebsiteSettings() {
  return useQuery({
    queryKey: ["website-settings"],
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    retry: 1,
    queryFn: async () => {
      // Cek cache terlebih dahulu
      const cached = getCachedSettings();
      if (cached) {
        return cached;
      }

      // Jika tidak ada cache, gunakan default settings sementara
      // dan fetch dari server secara background
      try {
        const { data, error } = await supabase
          .from("website_settings")
          .select("*")
          .eq("id", SETTINGS_ID)
          .maybeSingle();

        if (error) {
          console.warn('Failed to fetch settings, using defaults:', error);
          return DEFAULT_SETTINGS;
        }
        
        if (!data) {
          return DEFAULT_SETTINGS;
        }
        
        const mapped = mapWebsiteSettings(data);
        setCachedSettings(mapped);
        return mapped;
      } catch (error) {
        console.warn('Error fetching settings:', error);
        return DEFAULT_SETTINGS;
      }
    },
  });
}

export function useTenantWebsiteSettings(type: 'branch' | 'agent', slug?: string) {
  return useQuery<WebsiteSettings>({
    queryKey: ["website-settings", type, slug],
    enabled: !!slug,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    retry: 1,
    queryFn: async (): Promise<WebsiteSettings> => {
      const fetchSettingsBy = async (key: 'branch_id' | 'agent_id', value: string): Promise<WebsiteSettingsRow | null> => {
        const { data } = await supabase
          .from("website_settings")
          .select("*")
          .eq(key, value)
          .maybeSingle();
        return data;
      };

      const fetchMainSettings = async () => {
        const { data, error } = await supabase
          .from("website_settings")
          .select("*")
          .eq("id", SETTINGS_ID)
          .single();
        if (error) throw error;
        return data;
      };

      try {
        if (type === 'branch') {
          const { data: branch, error: branchError } = await supabase
            .from("branches")
            .select("id, name")
            .eq("slug", slug!)
            .single();
          if (branchError || !branch) throw new Error("Branch not found");

          const tenantSettings = await fetchSettingsBy("branch_id", branch.id);
          if (tenantSettings) {
            const mapped = mapWebsiteSettings(tenantSettings);
            return {
              ...mapped,
              company_name: mapped.company_name || branch.name,
            };
          }

          const mainSettings = await fetchMainSettings();
          const mappedMain = mapWebsiteSettings(mainSettings);
          return {
            ...mappedMain,
            company_name: branch.name,
            tagline: `Cabang ${branch.name}`,
          };
        } else {
          const { data: agent, error: agentError } = await supabase
            .from("agents")
            .select("id, company_name, agent_code")
            .eq("slug", slug!)
            .single();
          if (agentError || !agent) throw new Error("Agent not found");

          const tenantSettings = await fetchSettingsBy("agent_id", agent.id);
          if (tenantSettings) {
            const mapped = mapWebsiteSettings(tenantSettings);
            return {
              ...mapped,
              company_name: mapped.company_name || agent.company_name || agent.agent_code,
            };
          }

          const mainSettings = await fetchMainSettings();
          const mappedMain = mapWebsiteSettings(mainSettings);
          return {
            ...mappedMain,
            company_name: agent.company_name || agent.agent_code,
            tagline: `Agen Resmi`,
          };
        }
      } catch (error) {
        console.warn('Error fetching tenant settings:', error);
        return DEFAULT_SETTINGS;
      }
    },
  });
}

export function useThemePresets() {
  return useQuery({
    queryKey: ["theme-presets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("theme_presets")
        .select("*")
        .order("is_default", { ascending: false });

      if (error) throw error;
      return data as ThemePreset[];
    },
  });
}

export function useUpdateWebsiteSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<WebsiteSettings>) => {
      // Validate inputs before sending to database
      try {
        websiteSettingsSchema.partial().parse(updates);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          throw new Error(validationError.errors[0].message);
        }
        throw validationError;
      }

      // Convert JSON fields to JSON-compatible format if they exist
      const dbUpdates: any = { ...updates };
      
      if (updates.homepage_sections) {
        dbUpdates.homepage_sections = JSON.parse(JSON.stringify(updates.homepage_sections));
      }
      if (updates.custom_sections) {
        dbUpdates.custom_sections = JSON.parse(JSON.stringify(updates.custom_sections));
      }
      if (updates.nav_links) {
        dbUpdates.nav_links = JSON.parse(JSON.stringify(updates.nav_links));
      }
      if (updates.footer_links) {
        dbUpdates.footer_links = JSON.parse(JSON.stringify(updates.footer_links));
      }

      const { data, error } = await supabase
        .from("website_settings")
        .update(dbUpdates)
        .eq("id", SETTINGS_ID)
        .select();

      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error("Pengaturan tidak ditemukan di database.");
      }
      
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-settings"] });
      // Clear cache on update
      localStorage.removeItem(SETTINGS_CACHE_KEY);
      localStorage.removeItem(SETTINGS_CACHE_TIME_KEY);
    },
    onError: (error: any) => {
      toast.error(`Gagal menyimpan: ${error.message}`);
      console.error("Website settings update error:", error);
    },
  });
}

export function useApplyThemePreset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preset: ThemePreset) => {
      const { data, error } = await supabase
        .from("website_settings")
        .update({
          active_theme: preset.slug,
          primary_color: preset.primary_color,
          secondary_color: preset.secondary_color,
          accent_color: preset.accent_color,
          background_color: preset.background_color,
          foreground_color: preset.foreground_color,
          heading_font: preset.heading_font,
          body_font: preset.body_font,
        })
        .eq("id", SETTINGS_ID)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, preset) => {
      queryClient.invalidateQueries({ queryKey: ["website-settings"] });
      // Clear cache on update
      localStorage.removeItem(SETTINGS_CACHE_KEY);
      localStorage.removeItem(SETTINGS_CACHE_TIME_KEY);
      toast.success(`Tema "${preset.name}" berhasil diterapkan`);
    },
    onError: (error: any) => {
      toast.error(`Gagal menerapkan tema: ${error.message}`);
      console.error("Theme preset application error:", error);
    },
  });
}
