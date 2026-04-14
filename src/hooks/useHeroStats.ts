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
    queryFn: async (): Promise<HeroStat[]> => {
      try {
        const { data, error } = await (supabase as any)
          .from('hero_stats')
          .select('*')
          .order('display_order', { ascending: true });
        
        if (error) {
          console.warn('Error fetching hero stats:', error);
          return [];
        }
        
        return data || [];
      } catch (err) {
        console.warn('Exception fetching hero stats:', err);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}
