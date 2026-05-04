import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AboutPageContent {
  id: string;
  settings_id: string;
  mission_text: string | null;
  vision_text: string | null;
  values: any;
  milestones: any;
  created_at: string;
  updated_at: string;
}

export function useAboutPageContent(settingsId: string = '00000000-0000-0000-0000-000000000001') {
  return useQuery<AboutPageContent | null, Error>({
    queryKey: ['about-page-content', settingsId],
    queryFn: async (): Promise<AboutPageContent | null> => {
      try {
        const { data, error } = await (supabase as any)
          .from('about_page_content')
          .select('*')
          .eq('settings_id', settingsId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.warn('Error fetching about page content:', error);
          return null;
        }
        
        return (data && data.length > 0) ? data[0] : null;
      } catch (err) {
        console.warn('Exception fetching about page content:', err);
        return null;
      }
    },
    staleTime: 1000 * 60 * 60,
  });
}
