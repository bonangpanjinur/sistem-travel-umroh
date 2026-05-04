import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type HRSettings = Database["public"]["Tables"]["hr_settings"]["Row"];
type HRSettingsUpdate = Database["public"]["Tables"]["hr_settings"]["Update"];

export function useHRSettings() {
  return useQuery({
    queryKey: ["hr-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as HRSettings | null;
    },
  });
}

export function useUpdateHRSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: HRSettingsUpdate) => {
      // Get the current settings first to ensure we have an ID
      const { data: currentSettings, error: fetchError } = await supabase
        .from("hr_settings")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!currentSettings) {
        // If no settings exist, create one
        const { data, error } = await supabase
          .from("hr_settings")
          .insert([updates])
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      // Update existing settings
      const { data, error } = await supabase
        .from("hr_settings")
        .update(updates)
        .eq("id", currentSettings.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-settings"] });
      toast.success("Pengaturan HR berhasil disimpan");
    },
    onError: (error: any) => {
      toast.error(`Gagal menyimpan: ${error.message}`);
    },
  });
}
