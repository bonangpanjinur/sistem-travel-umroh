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

export function useLandingPage(identifier: string, isPublic = true) {
  return useQuery({
    queryKey: ["landing-page", identifier],
    queryFn: async () => {
      // Step 1: Get the landing page and agent info
      // Determine if identifier is a UUID (ID) or a slug
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
      
      let query = supabase
        .from("landing_pages")
        .select(`*, agent:whatsapp_agent_id(id, company_name, user_id)`);
      
      if (isUuid) {
        query = query.eq("id", identifier);
      } else {
        query = query.eq("slug", identifier);
      }
      
      if (isPublic) {
        query = query.eq("is_published", true);
      }
      
      const { data: lp, error: lpError } = await query.single();
      
      if (lpError) throw lpError;

      // Step 2: Manually fetch the agent's profile phone number if an agent is linked
      if (lp.agent?.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("phone")
          .eq("user_id", lp.agent.user_id)
          .single();
        
        // Attach the profile data manually to match the expected structure
        if (profile) {
          (lp as any).agent.profiles = [profile]; // Array structure to match original select behavior
        }
      }
      
      return lp as LandingPageData;
    },
    enabled: !!identifier,
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
