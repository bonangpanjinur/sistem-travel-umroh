import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StaticPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  meta_title: string | null;
  meta_description: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useStaticPage(slug: string) {
  return useQuery({
    queryKey: ["static-page", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("static_pages")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();

      if (error) throw error;
      return data as StaticPage;
    },
    enabled: !!slug,
  });
}

export function useAllStaticPages() {
  return useQuery({
    queryKey: ["static-pages-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("static_pages")
        .select("*")
        .order("sort_order");

      if (error) throw error;
      return data as StaticPage[];
    },
  });
}
