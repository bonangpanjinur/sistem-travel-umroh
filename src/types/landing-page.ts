export type WhatsAppSource = 'global' | 'agent' | 'custom';

export type SectionType = 'hero' | 'timer' | 'features' | 'comparison' | 'faq' | 'testimonials' | 'pricing' | 'cta';

export interface LPSection {
  id: string;
  type: SectionType;
  order: number;
  data: any; 
}

export interface LandingPageData {
  id: string;
  slug: string;
  title: string;
  meta_title?: string;
  meta_description?: string;
  og_image_url?: string;
  sections: LPSection[];
  whatsapp_source_type: WhatsAppSource;
  whatsapp_agent_id?: string;
  whatsapp_custom_number?: string;
  is_published: boolean;
  created_at?: string;
  updated_at?: string;
}
