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

const DEFAULT_HERO_STATS: HeroStat[] = [
  { id: '1', settings_id: 'default', stat_value: '15+', stat_label: 'Tahun Pengalaman', display_order: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '2', settings_id: 'default', stat_value: '50K+', stat_label: 'Jamaah Terlayani', display_order: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '3', settings_id: 'default', stat_value: '100+', stat_label: 'Keberangkatan/Tahun', display_order: 3, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '4', settings_id: 'default', stat_value: '4.9', stat_label: 'Rating Kepuasan', display_order: 4, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

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
          return DEFAULT_HERO_STATS;
        }
        
        return data && data.length > 0 ? data : DEFAULT_HERO_STATS;
      } catch (err) {
        console.warn('Exception fetching hero stats:', err);
        return DEFAULT_HERO_STATS;
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}
