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

const DEFAULT_CONTACT_PAGE_CONTENT: ContactPageContent = {
  id: 'default',
  settings_id: 'default',
  hero_title: 'Ada Pertanyaan?',
  hero_subtitle: 'Tim kami siap membantu merencanakan perjalanan ibadah Anda. Hubungi kami melalui form di bawah atau kontak langsung.',
  form_title: 'Kirim Pesan',
  operating_hours: [
    { label: 'Senin - Jumat', value: '08:00 - 17:00' },
    { label: 'Sabtu', value: '09:00 - 14:00' },
    { label: 'Minggu & Hari Libur', value: 'Tutup' },
  ],
  map_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export function useContactPageContent(settingsId: string = '00000000-0000-0000-0000-000000000001') {
  return useQuery<ContactPageContent, Error>({
    queryKey: ['contact-page-content', settingsId],
    queryFn: async (): Promise<ContactPageContent> => {
      try {
        const { data, error } = await (supabase as any)
          .from('contact_page_content')
          .select('*')
          .eq('settings_id', settingsId)
          .maybeSingle();

        if (error) {
          console.warn('Error fetching contact page content:', error);
          return DEFAULT_CONTACT_PAGE_CONTENT;
        }
        
        return data || DEFAULT_CONTACT_PAGE_CONTENT;
      } catch (err) {
        console.warn('Exception fetching contact page content:', err);
        return DEFAULT_CONTACT_PAGE_CONTENT;
      }
    },
    staleTime: 1000 * 60 * 60,
  });
}
