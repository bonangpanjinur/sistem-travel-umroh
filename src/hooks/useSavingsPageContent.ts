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

const DEFAULT_SAVINGS_PAGE_CONTENT: SavingsPageContent = {
  id: 'default',
  settings_id: 'default',
  hero_title: 'Tabungan Umroh',
  hero_subtitle: 'Wujudkan impian beribadah ke Tanah Suci dengan menabung secara bertahap. Pilih paket dan tentukan tenor cicilan sesuai kemampuan Anda.',
  benefits: [
    { icon: 'Calculator', title: 'Cicilan Fleksibel', description: 'Tenor 6-36 bulan sesuai kemampuan' },
    { icon: 'TrendingUp', title: 'Harga Terkunci', description: 'Harga paket tidak berubah selama menabung' },
    { icon: 'Shield', title: 'Dana Aman', description: 'Tercatat rapi di sistem kami' },
    { icon: 'CheckCircle', title: 'Prioritas Kuota', description: 'Dapat kuota saat tabungan lunas' },
  ],
  cta_title: 'Ada Pertanyaan?',
  cta_subtitle: 'Tim kami siap membantu menjelaskan program tabungan umroh dan membantu Anda memilih paket yang tepat.',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export function useSavingsPageContent(settingsId: string = '00000000-0000-0000-0000-000000000001') {
  return useQuery<SavingsPageContent, Error>({
    queryKey: ['savings-page-content', settingsId],
    queryFn: async (): Promise<SavingsPageContent> => {
      try {
        const { data, error } = await (supabase as any)
          .from('savings_page_content')
          .select('*')
          .eq('settings_id', settingsId)
          .maybeSingle();

        if (error) {
          console.warn('Error fetching savings page content:', error);
          return DEFAULT_SAVINGS_PAGE_CONTENT;
        }
        
        return data || DEFAULT_SAVINGS_PAGE_CONTENT;
      } catch (err) {
        console.warn('Exception fetching savings page content:', err);
        return DEFAULT_SAVINGS_PAGE_CONTENT;
      }
    },
    staleTime: 1000 * 60 * 60,
  });
}
