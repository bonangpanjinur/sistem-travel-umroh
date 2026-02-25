import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type RoomType = Database['public']['Enums']['room_type'];
type Departure = Database['public']['Tables']['departures']['Row'];
type Package = Database['public']['Tables']['packages']['Row'];
type Airline = Database['public']['Tables']['airlines']['Row'];
type Airport = Database['public']['Tables']['airports']['Row'];
type Hotel = Database['public']['Tables']['hotels']['Row'];
type Muthawif = Database['public']['Tables']['muthawifs']['Row'];

export function useDepartures(filters?: { status?: string; packageId?: string }) {
  return useQuery({
    queryKey: ['departures', filters],
    queryFn: async () => {
      let query = supabase
        .from('departures')
        .select('*, packages(name, category), airlines(name, code), hotels:hotel_makkah_id(name, city)')
        .order('departure_date', { ascending: true });
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.packageId) query = query.eq('package_id', filters.packageId);
      const { data, error } = await query;
      if (error) throw error;
      
      return data as any[];
    },
  });
}

export function useDeparture(id: string | undefined) {
  return useQuery({
    queryKey: ['departures', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departures')
        .select('*, packages(*), airlines(*), departure_airport:airports!departures_departure_airport_id_fkey(*), arrival_airport:airports!departures_arrival_airport_id_fkey(*), hotel_makkah:hotels!departures_hotel_makkah_id_fkey(*), hotel_madinah:hotels!departures_hotel_madinah_id_fkey(*), muthawifs:muthawif_id(*)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      
      return data as any;
    },
  });
}

export function useDepartureAvailability(departureId: string | undefined) {
  return useQuery({
    queryKey: ['departures', departureId, 'availability'],
    enabled: !!departureId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departures')
        .select('quota, booked_count')
        .eq('id', departureId!)
        .single();
      if (error) throw error;
      return { 
        available: (data.quota ?? 0) - (data.booked_count ?? 0), 
        quota: data.quota, 
        booked: data.booked_count 
      };
    },
  });
}

export function getDeparturePrice(departure: { price_quad?: number | null; price_triple?: number | null; price_double?: number | null; price_single?: number | null }, roomType: RoomType): number {
  const priceMap: Record<RoomType, number | null | undefined> = {
    quad: departure.price_quad,
    triple: departure.price_triple,
    double: departure.price_double,
    single: departure.price_single,
  };
  return Number(priceMap[roomType] ?? 0);
}
