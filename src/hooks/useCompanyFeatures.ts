import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Award, Clock, HeartHandshake, Building2, Headphones } from 'lucide-react';

export interface CompanyFeature {
  id: string;
  settings_id: string;
  icon_name: string;
  title: string;
  description: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Icon mapping
const iconMap: Record<string, React.ComponentType<any>> = {
  'Shield': Shield,
  'Award': Award,
  'Clock': Clock,
  'HeartHandshake': HeartHandshake,
  'Building2': Building2,
  'Headphones': Headphones,
};

const DEFAULT_COMPANY_FEATURES: CompanyFeature[] = [
  {
    id: '1',
    settings_id: 'default',
    icon_name: 'Shield',
    title: 'Izin Resmi Kemenag',
    description: 'Terdaftar dan berizin resmi dari Kementerian Agama RI dengan nomor PPIU yang valid.',
    display_order: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    settings_id: 'default',
    icon_name: 'Award',
    title: 'Pengalaman 15+ Tahun',
    description: 'Lebih dari 15 tahun pengalaman memberangkatkan jamaah umroh dan haji dengan aman.',
    display_order: 2,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    settings_id: 'default',
    icon_name: 'Building2',
    title: 'Hotel Bintang 5',
    description: 'Akomodasi terbaik dengan hotel bintang 5 dekat Masjidil Haram dan Masjid Nabawi.',
    display_order: 3,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    settings_id: 'default',
    icon_name: 'HeartHandshake',
    title: 'Muthawif Berpengalaman',
    description: 'Pembimbing ibadah profesional yang akan mendampingi selama perjalanan.',
    display_order: 4,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '5',
    settings_id: 'default',
    icon_name: 'Clock',
    title: 'Jadwal Fleksibel',
    description: 'Berbagai pilihan jadwal keberangkatan yang bisa disesuaikan dengan waktu Anda.',
    display_order: 5,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '6',
    settings_id: 'default',
    icon_name: 'Headphones',
    title: 'Layanan 24/7',
    description: 'Tim customer service siap membantu Anda kapan saja sebelum dan selama perjalanan.',
    display_order: 6,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function useCompanyFeatures() {
  return useQuery({
    queryKey: ['company-features'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('company_features')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });
        
        if (error) {
          console.warn('Error fetching company features:', error);
          return DEFAULT_COMPANY_FEATURES;
        }
        
        return data && data.length > 0 ? data : DEFAULT_COMPANY_FEATURES;
      } catch (err) {
        console.warn('Exception fetching company features:', err);
        return DEFAULT_COMPANY_FEATURES;
      }
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function getIconComponent(iconName: string) {
  return iconMap[iconName] || Shield;
}
