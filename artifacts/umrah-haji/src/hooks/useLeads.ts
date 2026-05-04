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
    retry: 2,
    retryDelay: (attempt) => Math.min(attempt * 1000, 3000),
    staleTime: 1000 * 60 * 5, // 5 minutes - balance between freshness and performance
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    queryFn: async () => {
      let query = supabase.from('leads').select(`
        *, 
        package:packages!leads_package_interest_fkey(name, code, price_quad), 
        branch:branches!leads_branch_id_fkey(name)
      `).order('created_at', { ascending: false });
      
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.assignedTo) query = query.eq('assigned_to', filters.assignedTo);
      
      const { data: rawLeads, error } = await query;
      if (error) throw error;

      // Fetch profiles separately to avoid join issues with missing FK
      const assignedToIds = [...new Set((rawLeads || []).map(l => l.assigned_to).filter(Boolean))];
      
      let profiles: any[] = [];
      if (assignedToIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', assignedToIds as string[]);
        profiles = profilesData || [];
      }

      const leads = rawLeads?.map(l => ({
        ...l,
        assigned_profile: profiles.find(p => p.user_id === l.assigned_to) || null
      })) || [];

      return leads;
    },
  });
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: ['leads', id],
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
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
    onSuccess: () => {
      // Invalidate only the leads list, not individual leads
      qc.invalidateQueries({ queryKey: ['leads'], exact: false });
    },
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
    onSuccess: (data) => {
      // Invalidate both the list and the specific lead
      qc.invalidateQueries({ queryKey: ['leads'], exact: false });
      qc.setQueryData(['leads', data.id], data);
    },
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
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['leads'], exact: false });
      qc.setQueryData(['leads', data.id], data);
    },
  });
}
