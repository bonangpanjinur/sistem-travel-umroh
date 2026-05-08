import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getAgentRef, clearAgentRef } from '@/hooks/useAgentRef';

export function useCustomerAccount(userId: string | undefined) {
  return useQuery({
    queryKey: ['customer_account', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from('customer_accounts' as any)
        .select('*, agents(id, company_name, agent_code, slug), branches(id, name, code, slug)')
        .eq('user_id', userId!)
        .maybeSingle();
      return data as any;
    },
  });
}

export function useEnsureCustomerAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const ref = getAgentRef();

      const { data, error } = await supabase.rpc('create_customer_account' as any, {
        p_user_id: userId,
        p_agent_id: ref.agentId || null,
        p_branch_id: ref.branchId || null,
        p_agent_slug: ref.agentSlug || null,
        p_branch_slug: ref.branchSlug || null,
      });
      if (error) {
        const { error: insertErr } = await supabase
          .from('customer_accounts' as any)
          .upsert({
            user_id: userId,
            referred_by_agent_id: ref.agentId || null,
            referred_by_branch_id: ref.branchId || null,
            agent_slug: ref.agentSlug || null,
            branch_slug: ref.branchSlug || null,
          }, { onConflict: 'user_id' });
        if (insertErr) console.warn('[customer_account] upsert failed:', insertErr.message);
      }

      clearAgentRef();
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer_account'] });
    },
  });
}

export function useCustomerNotifications(customerId: string | undefined) {
  return useQuery({
    queryKey: ['customer_notifications', customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data } = await supabase
        .from('customer_notifications' as any)
        .select('*')
        .eq('customer_id', customerId!)
        .order('created_at', { ascending: false })
        .limit(50);
      return (data || []) as any[];
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('customer_notifications' as any).update({ is_read: true }).eq('id', id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customer_notifications'] }),
  });
}

export function useCustomerBookings(customerId: string | undefined) {
  return useQuery({
    queryKey: ['customer_bookings', customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, booking_code, booking_status, total_price, total_pax, room_type,
          created_at,
          departures(
            id, departure_date, return_date,
            packages(id, name, duration_days, package_type)
          ),
          agents(id, company_name, agent_code, slug),
          branches(id, name, code)
        `)
        .eq('customer_id', customerId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}
