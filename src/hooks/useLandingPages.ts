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
      if (!identifier) throw new Error("Identifier is required");

      // Step 1: Get the landing page
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
      
      let query = supabase.from("landing_pages").select("*");
      
      if (isUuid) {
        query = query.eq("id", identifier);
      } else {
        query = query.eq("slug", identifier);
      }
      
      if (isPublic) {
        query = query.eq("is_published", true);
      }
      
      const { data: lp, error: lpError } = await query.single();
      
      if (lpError) {
        console.error("Error fetching landing page:", lpError);
        throw lpError;
      }

      // Step 2: Fetch agent info separately to avoid 406 error from complex joins
      if (lp.whatsapp_agent_id) {
        try {
          const { data: agent, error: agentError } = await supabase
            .from("agents")
            .select("id, company_name, user_id")
            .eq("id", lp.whatsapp_agent_id)
            .single();
          
          if (!agentError && agent) {
            (lp as any).agent = agent;

            // Step 3: Fetch agent's profile phone number
            if (agent.user_id) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("phone")
                .eq("user_id", agent.user_id)
                .single();
              
              if (profile) {
                (lp as any).agent.profiles = [profile];
              }
            }
          }
        } catch (err) {
          console.warn("Could not fetch agent info:", err);
          // Don't fail the whole request if agent info fails
        }
      }
      
      return lp as LandingPageData;
    },
    enabled: !!identifier,
    retry: 1,
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
      // Hanya kirim kolom yang benar-benar ada di tabel landing_pages
      const cleanData = {
        slug: updateData.slug,
        title: updateData.title,
        meta_title: updateData.meta_title,
        meta_description: updateData.meta_description,
        og_image_url: updateData.og_image_url,
        sections: updateData.sections,
        whatsapp_source_type: updateData.whatsapp_source_type,
        whatsapp_agent_id: updateData.whatsapp_agent_id,
        whatsapp_custom_number: updateData.whatsapp_custom_number,
        is_published: updateData.is_published,
        updated_at: new Date().toISOString()
      };
      
      // Hapus field yang undefined agar tidak menimpa data yang ada jika tidak dikirim
      Object.keys(cleanData).forEach(key => 
        (cleanData as any)[key] === undefined && delete (cleanData as any)[key]
      );

      const { data, error } = await supabase
        .from("landing_pages")
        .update(cleanData)
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
