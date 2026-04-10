import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribe to realtime changes on a Supabase table and auto-invalidate React Query caches.
 * @param table - The table name to subscribe to
 * @param queryKeys - Array of query keys to invalidate when changes occur
 */
export function useRealtimeSubscription(
  table: string,
  queryKeys: string[][]
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${table}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }
      );
    
    // Subscribe AFTER all .on() callbacks are registered
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, queryClient]); // queryKeys intentionally omitted to avoid re-subscribing
}

export function useMultipleRealtimeSubscriptions(
  tables: string[],
  queryKeys: string[][]
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channels = tables.map((table) => {
      const channel = supabase.channel(`realtime-${table}`);
      
      // Add listener BEFORE subscribing to avoid postgres_changes error
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }
      );
      
      // Subscribe after all listeners are attached
      channel.subscribe();
      
      return channel;
    });

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [tables.join(','), queryClient]);
}
