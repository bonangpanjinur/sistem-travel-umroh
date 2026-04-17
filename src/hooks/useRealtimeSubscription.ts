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
    const instanceId = Math.random().toString(36).substring(2, 9);
    const channel = supabase
      .channel(`realtime-${table}-${instanceId}`)
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
    const instanceId = Math.random().toString(36).substring(2, 9);
    
    // Create a single channel for multiple tables if possible, 
    // but Supabase JS client usually recommends one per table or one channel with multiple .on()
    const channel = supabase.channel(`realtime-multi-${instanceId}`);
    
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
