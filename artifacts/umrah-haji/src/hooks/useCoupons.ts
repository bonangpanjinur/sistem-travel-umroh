import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type Coupon = Database["public"]["Tables"]["coupons"]["Row"];

export const useCoupons = () => {
  const queryClient = useQueryClient();

  const { data: coupons, isLoading, error } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching coupons:", error);
        throw error;
      }
      return data as Coupon[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Kupon berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal menghapus kupon");
    },
  });

  return {
    coupons,
    isLoading,
    error,
    deleteCoupon: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
};
