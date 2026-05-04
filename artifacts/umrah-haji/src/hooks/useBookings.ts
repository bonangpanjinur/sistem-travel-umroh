import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Booking = Database['public']['Tables']['bookings']['Row'];
type BookingInsert = Database['public']['Tables']['bookings']['Insert'];
type BookingStatus = Database['public']['Enums']['booking_status'];
type PaymentStatus = Database['public']['Enums']['payment_status'];

export function useBookings(filters?: { status?: BookingStatus; departureId?: string; customerId?: string }) {
  return useQuery({
    queryKey: ['bookings', filters],
    queryFn: async () => {
      let query = supabase
        .from('bookings')
        .select('*, customers(full_name, phone), departures(departure_date, return_date, packages(name))')
        .order('created_at', { ascending: false });
      if (filters?.status) query = query.eq('booking_status', filters.status);
      if (filters?.departureId) query = query.eq('departure_id', filters.departureId);
      if (filters?.customerId) query = query.eq('customer_id', filters.customerId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useBooking(id: string | undefined) {
  return useQuery({
    queryKey: ['bookings', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, customers(*), departures(*, packages(*), airlines(*), hotels:hotel_makkah_id(*)), booking_passengers(*, customers(*))')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BookingInsert) => {
      const { data, error } = await supabase.from('bookings').insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      // Trigger DB sudah update booked_count; refresh tampilan keberangkatan.
      qc.invalidateQueries({ queryKey: ['departures'] });
      qc.invalidateQueries({ queryKey: ['admin-departures'] });
      qc.invalidateQueries({ queryKey: ['admin-departures-stats'] });
    },
  });
}

export function useUpdateBookingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, booking_status, payment_status }: { id: string; booking_status?: BookingStatus; payment_status?: PaymentStatus }) => {
      const update: Record<string, any> = {};
      if (booking_status) update.booking_status = booking_status;
      if (payment_status) update.payment_status = payment_status;
      const { data, error } = await supabase.from('bookings').update(update).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
}
