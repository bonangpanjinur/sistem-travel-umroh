import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { X, ExternalLink } from 'lucide-react';

interface Announcement {
  id: string;
  message: string;
  bg_color: string;
  text_color: string;
  link_url: string | null;
  link_text: string | null;
}

const COLOR_MAP: Record<string, string> = {
  emerald: 'bg-emerald-600 text-white',
  green:   'bg-green-600 text-white',
  blue:    'bg-blue-600 text-white',
  amber:   'bg-amber-500 text-white',
  red:     'bg-red-600 text-white',
  purple:  'bg-purple-600 text-white',
  gray:    'bg-gray-700 text-white',
  dark:    'bg-gray-900 text-white',
};

export function AnnouncementBar() {
  const [dismissed, setDismissed] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('dismissed_announcement') : null
  );

  const { data: announcement } = useQuery<Announcement | null>({
    queryKey: ['public-announcement'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await (supabase as any)
        .from('announcements')
        .select('id,message,bg_color,text_color,link_url,link_text')
        .eq('is_active', true)
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`ends_at.is.null,ends_at.gte.${now}`)
        .order('sort_order', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data ?? null;
    },
    staleTime: 60_000,
  });

  if (!announcement) return null;
  if (dismissed === announcement.id) return null;

  const colorClass = COLOR_MAP[announcement.bg_color] ?? COLOR_MAP.emerald;

  const dismiss = () => {
    localStorage.setItem('dismissed_announcement', announcement.id);
    setDismissed(announcement.id);
  };

  return (
    <div className={`relative flex items-center justify-center px-4 py-2 text-sm font-medium ${colorClass}`}>
      <span className="text-center leading-snug">
        {announcement.message}
        {announcement.link_url && announcement.link_text && (
          <a
            href={announcement.link_url}
            target={announcement.link_url.startsWith('http') ? '_blank' : '_self'}
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 ml-2 underline underline-offset-2 opacity-90 hover:opacity-100"
          >
            {announcement.link_text}
            {announcement.link_url.startsWith('http') && <ExternalLink className="h-3 w-3" />}
          </a>
        )}
      </span>
      <button
        onClick={dismiss}
        aria-label="Tutup pengumuman"
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-black/20 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
