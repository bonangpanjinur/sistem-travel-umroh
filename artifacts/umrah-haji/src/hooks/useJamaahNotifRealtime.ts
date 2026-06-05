import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const TYPE_EMOJI: Record<string, string> = {
  info:        'ℹ️',
  warning:     '⚠️',
  success:     '✅',
  urgent:      '🚨',
  refund:      '💸',
  payment:     '💳',
  visa_update: '📋',
  document:    '📄',
};

/**
 * Sets up a single Supabase realtime subscription for the logged-in jamaah user's
 * customer_notifications row. On INSERT:
 *   • Invalidates the React Query cache → badge count + list update instantly
 *   • Shows a Sonner toast with title, excerpt, and a "Lihat" action
 *
 * Call this hook ONCE at app/layout level (via JamaahNotifListener) — never in loops.
 */
export function useJamaahNotifRealtime() {
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const seenIds = useRef<Set<string>>(new Set());

  // Reuse the same query key as useNotifications so the cache is shared
  const { data: customer } = useQuery({
    queryKey: ['notif-customer-id', user?.id],
    enabled: !!user?.id && hasRole('jamaah'),
    staleTime: Infinity,
    queryFn: async () => {
      const { data } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data as { id: string } | null;
    },
  });

  const customerId = customer?.id;

  useEffect(() => {
    if (!customerId) return;

    // Tear down any stale channel before creating a new one
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`jamaah-notif-rt-${customerId}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'customer_notifications',
          filter: `customer_id=eq.${customerId}`,
        },
        (payload: any) => {
          // Always invalidate so badge + list stay in sync on INSERT / UPDATE / DELETE
          queryClient.invalidateQueries({
            queryKey: ['customer-notifications', customerId],
          });

          // Toast only on INSERT of a new notification
          if (payload.eventType !== 'INSERT' || !payload.new?.id) return;
          if (seenIds.current.has(payload.new.id)) return;
          seenIds.current.add(payload.new.id);

          const notif = payload.new;
          const emoji = TYPE_EMOJI[notif.type as string] ?? '🔔';
          const title  = notif.title   || 'Notifikasi Baru';
          const desc   = notif.message || '';

          toast(`${emoji} ${title}`, {
            description: desc.length > 120 ? desc.slice(0, 120) + '…' : desc,
            duration: 7000,
            action: {
              label: 'Lihat',
              onClick: () => {
                window.location.href = '/jamaah/notifications';
              },
            },
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [customerId, queryClient]);
}
