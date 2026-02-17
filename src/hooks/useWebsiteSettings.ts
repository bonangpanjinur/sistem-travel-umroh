import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface HomepageSection {
  id: string;
  title: string;
  enabled: boolean;
  order: number;
}

export interface WebsiteSettings {
  id: string;
  active_theme: string;
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
  nav_links: Array<{href: string; label: string}> | null;
  footer_links: Record<string, Array<{href: string; label: string}>> | null;
  footer_description: string | null;
  footer_bottom_text: string | null;
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

export function useWebsiteSettings() {
  return useQuery({
    queryKey: ["website-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_settings")
        .select("*")
        .eq("id", SETTINGS_ID)
        .single();

      if (error) throw error;
      
      // Parse homepage_sections from JSON
      return {
        ...data,
        homepage_sections: data.homepage_sections as unknown as HomepageSection[] | null,
      } as WebsiteSettings;
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
      // Convert homepage_sections to JSON-compatible format
      const dbUpdates = {
        ...updates,
        homepage_sections: updates.homepage_sections 
          ? JSON.parse(JSON.stringify(updates.homepage_sections))
          : undefined,
      };

      const { data, error } = await supabase
        .from("website_settings")
        .update(dbUpdates)
        .eq("id", SETTINGS_ID)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-settings"] });
      toast.success("Pengaturan berhasil disimpan");
    },
    onError: (error: any) => {
      toast.error(`Gagal menyimpan: ${error.message}`);
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
      toast.success(`Tema "${preset.name}" berhasil diterapkan`);
    },
    onError: (error: any) => {
      toast.error(`Gagal menerapkan tema: ${error.message}`);
    },
  });
}
