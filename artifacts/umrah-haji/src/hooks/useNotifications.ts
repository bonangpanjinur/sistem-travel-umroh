import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: customer } = useQuery({
    queryKey: ["notif-customer-id", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["customer-notifications", customer?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_notifications" as any)
        .select("*")
        .eq("customer_id", customer!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return (data || []) as any[];
    },
    enabled: !!customer?.id,
  });

  const unreadCount = notifications?.filter((n: any) => !n.is_read).length || 0;

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("customer_notifications" as any)
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-notifications"] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!customer?.id) return;
      const { error } = await supabase
        .from("customer_notifications" as any)
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("customer_id", customer.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-notifications"] });
    },
  });

  return {
    notifications: notifications || [],
    isLoading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    customerId: customer?.id,
  };
}
