import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useBranchCommissions(branchId?: string) {
  return useQuery({
    queryKey: ['branch_commissions', branchId],
    queryFn: async () => {
      let q = supabase
        .from('branch_commissions' as any)
        .select('*, branches(name, code), bookings(booking_code, total_price, customers(full_name))')
        .order('created_at', { ascending: false });
      if (branchId) q = q.eq('branch_id', branchId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export function useBranchCommissionStats(branchId: string | undefined) {
  return useQuery({
    queryKey: ['branch_commission_stats', branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branch_commissions' as any)
        .select('commission_amount, status')
        .eq('branch_id', branchId!);
      if (error) throw error;
      const all = (data || []) as any[];
      return {
        total: all.reduce((s, r) => s + Number(r.commission_amount), 0),
        pending: all.filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.commission_amount), 0),
        approved: all.filter(r => r.status === 'approved').reduce((s, r) => s + Number(r.commission_amount), 0),
        paid: all.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.commission_amount), 0),
        pendingCount: all.filter(r => r.status === 'pending').length,
      };
    },
  });
}

export function useApproveBranchCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('branch_commissions' as any)
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Komisi cabang disetujui');
      qc.invalidateQueries({ queryKey: ['branch_commissions'] });
      qc.invalidateQueries({ queryKey: ['branch_commission_stats'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function usePayBranchCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, paymentReference }: { id: string; paymentReference?: string }) => {
      const { error } = await supabase
        .from('branch_commissions' as any)
        .update({ status: 'paid', paid_at: new Date().toISOString(), payment_reference: paymentReference || null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Komisi cabang ditandai lunas');
      qc.invalidateQueries({ queryKey: ['branch_commissions'] });
      qc.invalidateQueries({ queryKey: ['branch_commission_stats'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export async function autoCalculateBranchCommission(bookingId: string): Promise<{ skipped: boolean; amount: number; message: string }> {
  const { data: existing } = await supabase
    .from('branch_commissions' as any)
    .select('id')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (existing) return { skipped: true, amount: 0, message: 'Komisi cabang sudah ada untuk booking ini' };

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, total_price, branch_id, departure_id')
    .eq('id', bookingId)
    .maybeSingle();
  if (!booking || !booking.branch_id) return { skipped: true, amount: 0, message: 'Booking tidak memiliki cabang' };

  let feeBranch = 0;
  if (booking.departure_id) {
    const { data: departure } = await supabase
      .from('departures')
      .select('package_id')
      .eq('id', booking.departure_id)
      .maybeSingle();
    if (departure?.package_id) {
      const { data: pkg } = await supabase
        .from('packages')
        .select('fee_branch')
        .eq('id', departure.package_id)
        .maybeSingle();
      feeBranch = Number((pkg as any)?.fee_branch || 0);
    }
  }

  if (feeBranch <= 0) {
    const { data: bm } = await supabase
      .from('branch_memberships' as any)
      .select('membership_plans(commission_rate)')
      .eq('branch_id', booking.branch_id)
      .eq('status', 'active')
      .maybeSingle();
    feeBranch = Number((bm as any)?.membership_plans?.commission_rate || 0);
  }

  if (feeBranch <= 0) return { skipped: true, amount: 0, message: 'Rate komisi cabang adalah 0%' };

  const amount = Math.round((Number(booking.total_price) * feeBranch) / 100);
  const { error } = await supabase
    .from('branch_commissions' as any)
    .insert({
      branch_id: booking.branch_id,
      booking_id: bookingId,
      commission_amount: amount,
      commission_rate: feeBranch,
      status: 'pending',
      notes: `Auto: ${feeBranch}% dari Rp${Number(booking.total_price).toLocaleString('id-ID')}`,
    });
  if (error) throw error;

  return { skipped: false, amount, message: `Komisi cabang Rp${amount.toLocaleString('id-ID')} berhasil dicatat` };
}
