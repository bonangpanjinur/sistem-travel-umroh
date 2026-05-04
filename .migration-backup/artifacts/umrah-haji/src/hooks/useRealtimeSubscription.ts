import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribe to realtime changes on a Supabase table and auto-invalidate React Query caches.
 * Optimized with debounce to prevent excessive refetching.
 */
export function useRealtimeSubscription(
  table: string,
  queryKeys: string[][]
) {
  const queryClient = useQueryClient();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${table}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          // Debounce invalidation to prevent waterfall refetching
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            queryKeys.forEach((key) => {
              queryClient.invalidateQueries({ queryKey: key });
            });
          }, 300); // 300ms debounce
        }
      );
    
    channel.subscribe();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [table, queryClient]);
}

export function useMultipleRealtimeSubscriptions(
  tables: string[],
  queryKeys: string[][]
) {
  const queryClient = useQueryClient();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Stable channel ID derived from sorted tables list — Supabase JS client
    // dedupes channels by name, preventing repeated WS reconnects on re-render.
    const channelKey = [...tables].sort().join('+');
    const channel = supabase.channel(`realtime-multi-${channelKey}`);
    
    tables.forEach((table) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            queryKeys.forEach((key) => {
              queryClient.invalidateQueries({ queryKey: key });
            });
          }, 500); // Higher debounce for multiple tables
        }
      );
    });
    
    channel.subscribe();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [tables.join(','), queryClient]);
}
