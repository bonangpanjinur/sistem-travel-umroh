import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LandingPageData } from "@/types/landing-page";
import { toast } from "sonner";

export function useLandingPages() {
  return useQuery({
    queryKey: ["landing-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_pages")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as LandingPageData[];
    },
  });
}

export function useLandingPage(slug: string, isPublic = true) {
  return useQuery({
    queryKey: ["landing-page", slug],
    queryFn: async () => {
      let query = supabase
        .from("landing_pages")
        .select(`*, agent:agents(id, phone_number, company_name)`)
        .eq("slug", slug);
      
      if (isPublic) {
        query = query.eq("is_published", true);
      }
      
      const { data, error } = await query.single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
}

export function useCreateLandingPage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newData: Partial<LandingPageData>) => {
      const { data, error } = await supabase
        .from("landing_pages")
        .insert([newData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing-pages"] });
      toast.success("Landing page created successfully");
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    }
  });
}

export function useUpdateLandingPage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<LandingPageData> & { id: string }) => {
      const { data, error } = await supabase
        .from("landing_pages")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["landing-pages"] });
      queryClient.invalidateQueries({ queryKey: ["landing-page", data.slug] });
      toast.success("Landing page updated successfully");
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    }
  });
}

export function useDeleteLandingPage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("landing_pages")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing-pages"] });
      toast.success("Landing page deleted successfully");
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    }
  });
}
