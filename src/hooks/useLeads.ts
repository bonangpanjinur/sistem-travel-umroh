import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Lead = Database['public']['Tables']['leads']['Row'];
type LeadInsert = Database['public']['Tables']['leads']['Insert'];
type LeadUpdate = Database['public']['Tables']['leads']['Update'];
type LeadStatus = Database['public']['Enums']['lead_status'];

export function useLeads(filters?: { status?: LeadStatus; assignedTo?: string }) {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: async () => {
      let query = supabase.from('leads').select(`
        *, 
        package:packages!leads_package_interest_fkey(name, code, price_quad), 
        branch:branches!leads_branch_id_fkey(name),
        assigned_profile:profiles!leads_assigned_to_fkey(full_name)
      `).order('created_at', { ascending: false });
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.assignedTo) query = query.eq('assigned_to', filters.assignedTo);
      const { data, error } = await query;
      if (error) {
        // Fallback without profile join if FK doesn't exist
        let fallbackQuery = supabase.from('leads').select(`
          *, 
          package:packages!leads_package_interest_fkey(name, code, price_quad), 
          branch:branches!leads_branch_id_fkey(name)
        `).order('created_at', { ascending: false });
        if (filters?.status) fallbackQuery = fallbackQuery.eq('status', filters.status);
        if (filters?.assignedTo) fallbackQuery = fallbackQuery.eq('assigned_to', filters.assignedTo);
        const { data: fallbackData, error: fallbackError } = await fallbackQuery;
        if (fallbackError) throw fallbackError;
        return fallbackData;
      }
      return data;
    },
  });
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: ['leads', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('leads').select('*, packages:package_interest(*)').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LeadInsert) => {
      const { data, error } = await supabase.from('leads').insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: LeadUpdate & { id: string }) => {
      const { data, error } = await supabase.from('leads').update(input).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useConvertLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, bookingId }: { id: string; bookingId: string }) => {
      const { data, error } = await supabase
        .from('leads')
        .update({ status: 'won' as LeadStatus, converted_at: new Date().toISOString(), converted_booking_id: bookingId })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}
