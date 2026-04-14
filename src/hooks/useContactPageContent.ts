import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ContactPageContent {
  id: string;
  settings_id: string;
  hero_title: string | null;
  hero_subtitle: string | null;
  form_title: string | null;
  operating_hours: any;
  map_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useContactPageContent(settingsId: string = '00000000-0000-0000-0000-000000000001') {
  return useQuery<ContactPageContent | null, Error>({
    queryKey: ['contact-page-content', settingsId],
    queryFn: async (): Promise<ContactPageContent | null> => {
      try {
        const { data, error } = await (supabase as any)
          .from('contact_page_content')
          .select('*')
          .eq('settings_id', settingsId)
          .maybeSingle();

        if (error) {
          console.warn('Error fetching contact page content:', error);
          return null;
        }
        
        return data || null;
      } catch (err) {
        console.warn('Exception fetching contact page content:', err);
        return null;
      }
    },
    staleTime: 1000 * 60 * 60,
  });
}
