import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useLoyaltyPoints(customerId: string | undefined) {
  return useQuery({
    queryKey: ['loyalty_points', customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase.from('loyalty_points').select('*').eq('customer_id', customerId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useLoyaltyTransactions(customerId: string | undefined) {
  return useQuery({
    queryKey: ['loyalty_transactions', customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase.from('loyalty_transactions').select('*').eq('customer_id', customerId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useLoyaltyRewards() {
  return useQuery({
    queryKey: ['loyalty_rewards'],
    queryFn: async () => {
      const { data, error } = await supabase.from('loyalty_rewards').select('*').eq('is_active', true).order('points_required', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}
