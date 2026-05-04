import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Testimonial {
  id: string;
  name: string;
  location: string | null;
  package_name: string | null;
  content: string;
  rating: number;
  photo_url: string | null;
  is_featured: boolean;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function usePublicTestimonials() {
  return useQuery({
    queryKey: ["testimonials-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .eq("is_published", true)
        .eq("is_featured", true)
        .order("sort_order");

      if (error) throw error;
      return data as Testimonial[];
    },
  });
}

export function useAllTestimonials() {
  return useQuery({
    queryKey: ["testimonials-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .order("sort_order");

      if (error) throw error;
      return data as Testimonial[];
    },
  });
}
