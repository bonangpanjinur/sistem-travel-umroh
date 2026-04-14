import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SavingsPageContent {
  id: string;
  settings_id: string;
  hero_title: string | null;
  hero_subtitle: string | null;
  benefits: any;
  cta_title: string | null;
  cta_subtitle: string | null;
  created_at: string;
  updated_at: string;
}

export function useSavingsPageContent(settingsId: string = '00000000-0000-0000-0000-000000000001') {
  return useQuery<SavingsPageContent | null, Error>({
    queryKey: ['savings-page-content', settingsId],
    queryFn: async (): Promise<SavingsPageContent | null> => {
      try {
        const { data, error } = await (supabase as any)
          .from('savings_page_content')
          .select('*')
          .eq('settings_id', settingsId)
          .maybeSingle();

        if (error) {
          console.warn('Error fetching savings page content:', error);
          return null;
        }
        
        return data || null;
      } catch (err) {
        console.warn('Exception fetching savings page content:', err);
        return null;
      }
    },
    staleTime: 1000 * 60 * 60,
  });
}
