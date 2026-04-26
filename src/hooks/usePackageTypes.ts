import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PackageType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

const DEFAULT_PACKAGE_TYPES: PackageType[] = [
  { id: '1', code: 'umroh', name: 'Umroh', description: 'Paket umroh reguler', is_active: true, display_order: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '2', code: 'haji', name: 'Haji Reguler', description: 'Paket haji reguler', is_active: true, display_order: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '3', code: 'haji_plus', name: 'Haji Plus', description: 'Paket haji dengan fasilitas tambahan', is_active: true, display_order: 3, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '4', code: 'umroh_plus', name: 'Umroh Plus', description: 'Paket umroh dengan fasilitas tambahan', is_active: true, display_order: 4, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '5', code: 'tabungan', name: 'Paket Tabungan', description: 'Paket dengan skema cicilan tabungan umroh/haji', is_active: true, display_order: 5, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export function usePackageTypes() {
  return useQuery({
    queryKey: ['package-types'],
    queryFn: async (): Promise<PackageType[]> => {
      try {
        const { data, error } = await (supabase as any)
          .from('package_types')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });
        
        if (error) {
          console.warn('Error fetching package types:', error);
          return DEFAULT_PACKAGE_TYPES;
        }
        
        return data && data.length > 0 ? data : DEFAULT_PACKAGE_TYPES;
      } catch (err) {
        console.warn('Exception fetching package types:', err);
        return DEFAULT_PACKAGE_TYPES;
      }
    },
    staleTime: 1000 * 60 * 10,
  });
}
