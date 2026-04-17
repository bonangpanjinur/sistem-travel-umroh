import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HeroStat {
  id: string;
  settings_id: string;
  stat_value: string;
  stat_label: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export function useHeroStats() {
  return useQuery({
    queryKey: ['hero-stats'],
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    retry: 0,
    queryFn: async (): Promise<HeroStat[]> => {
      try {
        const { data, error } = await (supabase as any)
          .from('hero_stats')
          .select('*')
          .order('display_order', { ascending: true });
        
        if (error) {
          // Table missing or other error — silently return empty list
          return [];
        }
        
        return data || [];
      } catch {
        return [];
      }
    },
  });
}
