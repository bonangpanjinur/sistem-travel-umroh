import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Package, Departure } from '@/types/database';

export function usePackages() {
  return useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select(`
          *,
          hotel_makkah:hotels!packages_hotel_makkah_id_fkey(*),
          hotel_madinah:hotels!packages_hotel_madinah_id_fkey(*),
          airline:airlines(*),
          departures(
            *,
            airline:airlines(*),
            hotel_makkah:hotels!departures_hotel_makkah_id_fkey(*),
            hotel_madinah:hotels!departures_hotel_madinah_id_fkey(*)
          ),
          package_group:package_groups(id,name,color,slug)
        `)
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[usePackages] query error:', error);
        throw error;
      }
      return data as Package[];
    },
  });
}

export function useFeaturedPackages() {
  return useQuery({
    queryKey: ['packages', 'featured'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select(`
          *,
          hotel_makkah:hotels!packages_hotel_makkah_id_fkey(*),
          hotel_madinah:hotels!packages_hotel_madinah_id_fkey(*),
          airline:airlines(*),
          departures(
            *,
            airline:airlines(*),
            hotel_makkah:hotels!departures_hotel_makkah_id_fkey(*),
            hotel_madinah:hotels!departures_hotel_madinah_id_fkey(*)
          )
        `)
        .eq('is_active', true)
        .eq('is_featured', true)
        .limit(6);

      if (error) {
        console.error('[useFeaturedPackages] query error:', error);
        throw error;
      }
      return data as Package[];
    },
  });
}

export function usePackage(packageId: string | undefined) {
  return useQuery({
    queryKey: ['packages', packageId],
    queryFn: async () => {
      if (!packageId) return null;
      
      const { data, error } = await supabase
        .from('packages')
        .select(`
          *,
          hotel_makkah:hotels!packages_hotel_makkah_id_fkey(*),
          hotel_madinah:hotels!packages_hotel_madinah_id_fkey(*),
          airline:airlines(*),
          departures(
            *,
            airline:airlines(*),
            hotel_makkah:hotels!departures_hotel_makkah_id_fkey(*),
            hotel_madinah:hotels!departures_hotel_madinah_id_fkey(*)
          )
        `)
        .eq('id', packageId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('[usePackage] query error:', error);
        throw error;
      }
      return data as Package;
    },
    enabled: !!packageId,
  });
}

export function usePackageDepartures(packageId: string | undefined) {
  return useQuery({
    queryKey: ['departures', packageId],
    queryFn: async () => {
      if (!packageId) return [];
      
      const { data, error } = await supabase
        .from('departures')
        .select('*')
        .eq('package_id', packageId)
        .eq('status', 'open')
        .gte('departure_date', new Date().toISOString().split('T')[0])
        .order('departure_date', { ascending: true });

      if (error) throw error;
      
      return data.map(d => ({
        ...d,
        available_seats: (d.quota || 0) - (d.booked_count || 0),
      })) as Departure[];
    },
    enabled: !!packageId,
  });
}

export function useUpcomingDepartures() {
  return useQuery({
    queryKey: ['departures', 'upcoming'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departures')
        .select(`
          *,
          package:packages(*)
        `)
        .eq('status', 'open')
        .eq('packages.is_active', true)
        .gte('departure_date', new Date().toISOString().split('T')[0])
        .order('departure_date', { ascending: true })
        .limit(10);

      if (error) throw error;
      
      const filteredData = (data || []).filter((d: any) => d.package && d.package.is_active !== false);

      return filteredData.map(d => ({
        ...d,
        available_seats: (d.quota || 0) - (d.booked_count || 0),
      })) as (Departure & { package: Package })[];
    },
  });
}

export function useSearchPackages(searchTerm: string, packageType?: string) {
  return useQuery({
    queryKey: ['packages', 'search', searchTerm, packageType],
    queryFn: async () => {
      let query = supabase
        .from('packages')
        .select(`
          *,
          hotel_makkah:hotels!packages_hotel_makkah_id_fkey(*),
          hotel_madinah:hotels!packages_hotel_madinah_id_fkey(*),
          airline:airlines(*),
          departures(
            *,
            airline:airlines(*),
            hotel_makkah:hotels!departures_hotel_makkah_id_fkey(*),
            hotel_madinah:hotels!departures_hotel_madinah_id_fkey(*)
          )
        `)
        .eq('is_active', true);

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      if (packageType && packageType !== 'all') {
        query = query.eq('package_type', packageType as 'umroh' | 'haji' | 'haji_plus' | 'umroh_plus');
      }

      const { data, error } = await query.order('is_featured', { ascending: false });

      if (error) {
        console.error('[useSearchPackages] query error:', error);
        throw error;
      }
      return data as Package[];
    },
    enabled: true,
  });
}
