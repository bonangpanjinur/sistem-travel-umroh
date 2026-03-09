import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AboutPageContent {
  id: string;
  settings_id: string;
  mission_text: string | null;
  vision_text: string | null;
  values: any; // JSONB type
  milestones: any; // JSONB type
  created_at: string;
  updated_at: string;
}

const DEFAULT_ABOUT_PAGE_CONTENT: AboutPageContent = {
  id: 'default',
  settings_id: 'default',
  mission_text: 'Menjadi biro perjalanan umroh dan haji terdepan di Indonesia yang memberikan pelayanan terbaik dengan standar internasional, serta menjadi mitra terpercaya umat Islam dalam menunaikan ibadah ke Tanah Suci.',
  vision_text: 'Memberikan layanan umroh dan haji berkualitas tinggi, menyediakan pembimbing ibadah yang kompeten, mengutamakan kenyamanan dan keamanan jamaah, dan inovasi teknologi untuk kemudahan jamaah.',
  values: [
    { icon: 'Heart', title: 'Amanah', description: 'Kami menjalankan setiap perjalanan dengan penuh tanggung jawab dan kejujuran.' },
    { icon: 'Shield', title: 'Terpercaya', description: 'Puluhan tahun pengalaman melayani jamaah dengan standar kualitas terbaik.' },
    { icon: 'Users', title: 'Profesional', description: 'Tim berpengalaman yang siap melayani dengan sepenuh hati.' },
    { icon: 'Star', title: 'Berkualitas', description: 'Layanan premium dengan fasilitas terbaik untuk kenyamanan ibadah Anda.' },
  ],
  milestones: [
    { year: '2009', event: 'Didirikan sebagai biro perjalanan umroh' },
    { year: '2012', event: 'Mendapatkan izin resmi Kemenag RI' },
    { year: '2015', event: 'Melayani 10.000 jamaah pertama' },
    { year: '2018', event: 'Ekspansi ke 10 cabang di seluruh Indonesia' },
    { year: '2021', event: 'Meluncurkan sistem digital booking' },
    { year: '2024', event: 'Mencapai 50.000+ jamaah terlayani' },
  ],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export function useAboutPageContent(settingsId: string = 'default') {
  return useQuery<AboutPageContent, Error>({
    queryKey: ['about-page-content', settingsId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('about_page_content')
          .select('*')
          .eq('settings_id', settingsId)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
          console.warn('Error fetching about page content:', error);
          return DEFAULT_ABOUT_PAGE_CONTENT;
        }
        
        return data || DEFAULT_ABOUT_PAGE_CONTENT;
      } catch (err) {
        console.warn('Exception fetching about page content:', err);
        return DEFAULT_ABOUT_PAGE_CONTENT;
      }
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
