import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

export function useIbadahProgress(date?: Date) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const day = format(date || new Date(), "yyyy-MM-dd");

  const query = useQuery({
    queryKey: ["ibadah-progress", user?.id, day],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ibadah_progress" as any)
        .select("*")
        .eq("user_id", user!.id)
        .eq("ibadah_date", day);
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return (data || []) as any[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (payload: {
      ibadah_type: string;
      count?: number;
      target?: number;
      notes?: string;
      completed?: boolean;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase.from("ibadah_progress" as any).upsert(
        {
          user_id: user.id,
          ibadah_date: day,
          ibadah_type: payload.ibadah_type,
          count: payload.count ?? 1,
          target: payload.target ?? null,
          notes: payload.notes ?? null,
          completed: payload.completed ?? true,
        } as any,
        { onConflict: "user_id,ibadah_type,ibadah_date" }
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ibadah-progress", user?.id, day] }),
  });

  const remove = useMutation({
    mutationFn: async (ibadah_type: string) => {
      if (!user?.id) return;
      await supabase
        .from("ibadah_progress" as any)
        .delete()
        .eq("user_id", user.id)
        .eq("ibadah_date", day)
        .eq("ibadah_type", ibadah_type);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ibadah-progress", user?.id, day] }),
  });

  const getProgress = (type: string) =>
    (query.data || []).find((p: any) => p.ibadah_type === type);

  return {
    progress: query.data || [],
    isLoading: query.isLoading,
    upsert: upsert.mutate,
    remove: remove.mutate,
    isSaving: upsert.isPending,
    getProgress,
    date: day,
  };
}