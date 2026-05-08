import { supabase } from '@/integrations/supabase/client';

export interface AutoCommissionResult {
  agentCommissionId?: string;
  parentCommissionId?: string;
  agentAmount: number;
  parentAmount: number;
  skipped: boolean;
  message: string;
}

/**
 * Menghitung dan mencatat komisi agen + parent agen (jika sub agen) secara otomatis.
 * Idempoten: tidak akan membuat duplikat jika komisi sudah ada untuk booking ini.
 */
export async function autoCalculateCommission(bookingId: string): Promise<AutoCommissionResult> {
  const result: AutoCommissionResult = {
    agentAmount: 0,
    parentAmount: 0,
    skipped: false,
    message: '',
  };

  // 1. Cek apakah komisi sudah ada untuk booking ini
  const { data: existing } = await supabase
    .from('agent_commissions')
    .select('id, agent_id')
    .eq('booking_id', bookingId);

  if (existing && existing.length > 0) {
    return { ...result, skipped: true, message: 'Komisi sudah ada untuk booking ini' };
  }

  // 2. Ambil data booking
  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .select('id, booking_code, total_price, agent_id, booking_status')
    .eq('id', bookingId)
    .single();

  if (bookingErr || !booking) {
    throw new Error('Booking tidak ditemukan');
  }

  if (!booking.agent_id) {
    return { ...result, skipped: true, message: 'Booking tidak memiliki agen' };
  }

  // 3. Ambil data agen
  const { data: agent, error: agentErr } = await supabase
    .from('agents')
    .select('id, agent_code, commission_rate, parent_agent_id')
    .eq('id', booking.agent_id)
    .single();

  if (agentErr || !agent) {
    throw new Error('Data agen tidak ditemukan');
  }

  const commissionRate = Number(agent.commission_rate) || 0;
  if (commissionRate <= 0) {
    return { ...result, skipped: true, message: 'Rate komisi agen adalah 0%' };
  }

  // 4. Hitung komisi agen
  const agentCommissionAmount = Math.round((Number(booking.total_price) * commissionRate) / 100);
  result.agentAmount = agentCommissionAmount;

  // 5. Buat komisi untuk agen langsung
  const { data: agentCommission, error: agentCommErr } = await supabase
    .from('agent_commissions')
    .insert({
      agent_id: agent.id,
      booking_id: bookingId,
      commission_amount: agentCommissionAmount,
      status: 'pending',
      notes: `Auto: ${commissionRate}% dari Rp${Number(booking.total_price).toLocaleString('id-ID')} (Booking ${booking.booking_code})`,
    })
    .select('id')
    .single();

  if (agentCommErr) throw new Error('Gagal membuat komisi agen: ' + agentCommErr.message);
  result.agentCommissionId = agentCommission.id;

  // 6. Jika sub agen (punya parent), buat komisi royalti untuk parent agen
  if (agent.parent_agent_id) {
    const { data: parentAgent } = await supabase
      .from('agents')
      .select('id, agent_code, commission_rate')
      .eq('id', agent.parent_agent_id)
      .single();

    if (parentAgent) {
      const parentRate = Number(parentAgent.commission_rate) || 0;
      if (parentRate > 0) {
        const parentCommissionAmount = Math.round((Number(booking.total_price) * parentRate) / 100);
        result.parentAmount = parentCommissionAmount;

        const { data: parentCommission } = await supabase
          .from('agent_commissions')
          .insert({
            agent_id: parentAgent.id,
            booking_id: bookingId,
            commission_amount: parentCommissionAmount,
            status: 'pending',
            notes: `Royalti Sub Agen (${agent.agent_code}): ${parentRate}% dari Rp${Number(booking.total_price).toLocaleString('id-ID')} (Booking ${booking.booking_code})`,
          })
          .select('id')
          .single();

        result.parentCommissionId = parentCommission?.id;
      }
    }
  }

  result.message = `Komisi berhasil dicatat: Agen Rp${agentCommissionAmount.toLocaleString('id-ID')}${
    result.parentAmount > 0 ? ` + Royalti Parent Rp${result.parentAmount.toLocaleString('id-ID')}` : ''
  }`;

  // 7. Hitung komisi cabang otomatis
  try {
    const { autoCalculateBranchCommission } = await import('./useBranchCommissions');
    await autoCalculateBranchCommission(bookingId);
  } catch (_) {
    // Tidak menghentikan proses jika komisi cabang gagal
  }

  return result;
}
