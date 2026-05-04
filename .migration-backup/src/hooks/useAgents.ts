import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data, error } = await supabase.from('agents').select('*, branches(name)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAgent(id: string | undefined) {
  return useQuery({
    queryKey: ['agents', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('agents').select('*').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useAgentByUserId(userId: string | undefined) {
  return useQuery({
    queryKey: ['agents', 'user', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('agents').select('*').eq('user_id', userId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useAgentCommissions(agentId: string | undefined) {
  return useQuery({
    queryKey: ['agent_commissions', agentId],
    enabled: !!agentId,
    queryFn: async () => {
      const { data, error } = await supabase.from('agent_commissions').select('*, bookings(booking_code, total_price, customers(full_name))').eq('agent_id', agentId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAgentWallet(agentId: string | undefined) {
  return useQuery({
    queryKey: ['agent_wallets', agentId],
    enabled: !!agentId,
    queryFn: async () => {
      const { data, error } = await supabase.from('agent_wallets').select('*').eq('agent_id', agentId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useAgentStats(agentId: string | undefined) {
  return useQuery({
    queryKey: ['agent-stats', agentId],
    enabled: !!agentId,
    queryFn: async () => {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, total_price, booking_status')
        .eq('agent_id', agentId!);

      const { data: commissions } = await supabase
        .from('agent_commissions')
        .select('commission_amount, status')
        .eq('agent_id', agentId!);

      const totalBookings = bookings?.length || 0;
      const confirmedBookings = bookings?.filter(b => b.booking_status === 'confirmed').length || 0;
      const totalCommission = commissions?.reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;
      const pendingCommission = commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;
      const paidCommission = commissions?.filter(c => c.status === 'paid').reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;

      return { totalBookings, confirmedBookings, totalCommission, pendingCommission, paidCommission };
    },
  });
}

export function useAgentRecentBookings(agentId: string | undefined) {
  return useQuery({
    queryKey: ['agent-recent-bookings', agentId],
    enabled: !!agentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`id, booking_code, total_price, booking_status, created_at, customer:customers(full_name)`)
        .eq('agent_id', agentId!)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });
}
