import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useMembershipPlans(planType?: 'agent' | 'branch') {
  return useQuery({
    queryKey: ['membership_plans', planType],
    queryFn: async () => {
      let q = supabase
        .from('membership_plans' as any)
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (planType) q = q.eq('plan_type', planType);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export function useAgentMembership(agentId: string | undefined) {
  return useQuery({
    queryKey: ['agent_membership', agentId],
    enabled: !!agentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_memberships' as any)
        .select('*, membership_plans(*)')
        .eq('agent_id', agentId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

export function useBranchMembership(branchId: string | undefined) {
  return useQuery({
    queryKey: ['branch_membership', branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branch_memberships' as any)
        .select('*, membership_plans(*)')
        .eq('branch_id', branchId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

export function useAllAgentMemberships() {
  return useQuery({
    queryKey: ['all_agent_memberships'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_memberships' as any)
        .select('*, membership_plans(*), agents(agent_code, company_name, email, phone)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export function useAllBranchMemberships() {
  return useQuery({
    queryKey: ['all_branch_memberships'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branch_memberships' as any)
        .select('*, membership_plans(*), branches(name, code, city)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export function useSubmitAgentMembership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ agentId, planId, paymentProofUrl }: { agentId: string; planId: string; paymentProofUrl?: string }) => {
      const { data: existing } = await supabase
        .from('agent_memberships' as any)
        .select('id, status')
        .eq('agent_id', agentId)
        .in('status', ['pending', 'active'])
        .maybeSingle();
      if (existing) throw new Error('Keanggotaan aktif atau sedang dalam proses sudah ada');

      const { error } = await supabase
        .from('agent_memberships' as any)
        .insert({ agent_id: agentId, plan_id: planId, payment_proof_url: paymentProofUrl || null, status: 'pending' });
      if (error) throw error;
    },
    onSuccess: (_, { agentId }) => {
      toast.success('Pendaftaran keanggotaan berhasil dikirim. Menunggu persetujuan admin.');
      qc.invalidateQueries({ queryKey: ['agent_membership', agentId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSubmitBranchMembership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ branchId, planId, paymentProofUrl }: { branchId: string; planId: string; paymentProofUrl?: string }) => {
      const { data: existing } = await supabase
        .from('branch_memberships' as any)
        .select('id, status')
        .eq('branch_id', branchId)
        .in('status', ['pending', 'active'])
        .maybeSingle();
      if (existing) throw new Error('Keanggotaan aktif atau sedang dalam proses sudah ada');

      const { error } = await supabase
        .from('branch_memberships' as any)
        .insert({ branch_id: branchId, plan_id: planId, payment_proof_url: paymentProofUrl || null, status: 'pending' });
      if (error) throw error;
    },
    onSuccess: (_, { branchId }) => {
      toast.success('Pendaftaran keanggotaan cabang berhasil dikirim.');
      qc.invalidateQueries({ queryKey: ['branch_membership', branchId] });
      qc.invalidateQueries({ queryKey: ['all_branch_memberships'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useApproveMembership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, type, planId }: { id: string; type: 'agent' | 'branch'; planId: string }) => {
      const table = type === 'agent' ? 'agent_memberships' : 'branch_memberships';
      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);

      const { error } = await supabase
        .from(table as any)
        .update({
          status: 'active',
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          approved_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;

      if (type === 'agent') {
        const { data: membership } = await supabase
          .from('agent_memberships' as any)
          .select('agent_id, membership_plans(commission_rate)')
          .eq('id', id)
          .single();
        if (membership) {
          const rate = (membership as any).membership_plans?.commission_rate;
          if (rate != null) {
            await supabase.from('agents').update({ commission_rate: rate }).eq('id', (membership as any).agent_id);
          }
        }
      }
    },
    onSuccess: (_, { type }) => {
      toast.success('Keanggotaan berhasil disetujui');
      qc.invalidateQueries({ queryKey: [type === 'agent' ? 'all_agent_memberships' : 'all_branch_memberships'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRejectMembership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, type, reason }: { id: string; type: 'agent' | 'branch'; reason: string }) => {
      const table = type === 'agent' ? 'agent_memberships' : 'branch_memberships';
      const { error } = await supabase
        .from(table as any)
        .update({ status: 'rejected', rejection_reason: reason })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { type }) => {
      toast.success('Keanggotaan ditolak');
      qc.invalidateQueries({ queryKey: [type === 'agent' ? 'all_agent_memberships' : 'all_branch_memberships'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
