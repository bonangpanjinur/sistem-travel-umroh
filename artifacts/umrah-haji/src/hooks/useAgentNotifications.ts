import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { Database } from "@/integrations/supabase/types";

export interface AgentNotification {
  id: string;
  type: 'booking' | 'document' | 'commission' | 'payment';
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
  data?: unknown;
}

interface CustomerData {
  full_name: string | null;
  id: string;
}

interface BookingWithCustomer {
  booking_code: string;
  customer: CustomerData | null;
  id: string;
}

type BookingRow = Database['public']['Tables']['bookings']['Row'];
type DocumentRow = Database['public']['Tables']['customer_documents']['Row'];
type CommissionRow = Database['public']['Tables']['agent_commissions']['Row'];
type PaymentRow = Database['public']['Tables']['payments']['Row'];

// Singleton instances untuk menyimpan channels yang persistent per agent
const agentChannelsMap = new Map<string, {
  bookingStatusChannel: ReturnType<typeof supabase.channel> | null;
  documentChannel: ReturnType<typeof supabase.channel> | null;
  commissionChannel: ReturnType<typeof supabase.channel> | null;
  paymentChannel: ReturnType<typeof supabase.channel> | null;
  subscriberCount: number;
}>();

export function useAgentNotifications(agentId?: string) {
  const [notifications, setNotifications] = useState<AgentNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();
  const isSubscribedRef = useRef(false);

  const addNotification = useCallback((notification: Omit<AgentNotification, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: AgentNotification = {
      ...notification,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50
    setUnreadCount(prev => prev + 1);

    // Show toast notification
    toast({
      title: notification.title,
      description: notification.message,
    });
  }, [toast]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    if (!agentId) return;

    // Cek apakah channels untuk agent ini sudah ada
    let agentChannels = agentChannelsMap.get(agentId);
    
    if (agentChannels && isSubscribedRef.current) {
      // Channels sudah ada dan sudah disubscribe, hanya increment subscriber count
      agentChannels.subscriberCount++;
      return () => {
        if (agentChannels) {
          agentChannels.subscriberCount--;
          // Hanya hapus channels jika tidak ada subscriber lagi
          if (agentChannels.subscriberCount === 0) {
            if (agentChannels.bookingStatusChannel) supabase.removeChannel(agentChannels.bookingStatusChannel);
            if (agentChannels.documentChannel) supabase.removeChannel(agentChannels.documentChannel);
            if (agentChannels.commissionChannel) supabase.removeChannel(agentChannels.commissionChannel);
            if (agentChannels.paymentChannel) supabase.removeChannel(agentChannels.paymentChannel);
            agentChannelsMap.delete(agentId);
          }
        }
      };
    }

    // Buat channels baru hanya jika belum ada
    if (!agentChannels) {
      agentChannels = {
        bookingStatusChannel: null,
        documentChannel: null,
        commissionChannel: null,
        paymentChannel: null,
        subscriberCount: 0,
      };
      agentChannelsMap.set(agentId, agentChannels);
    }

    // Subscribe to booking status changes for this agent
    agentChannels.bookingStatusChannel = supabase
      .channel(`agent-booking-status-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `agent_id=eq.${agentId}`,
        },
        async (payload) => {
          if (!payload || !payload.new || !payload.old) return;
          const booking = payload.new as BookingRow;
          const oldBooking = payload.old as BookingRow;
          
          // Only notify if status changed
          if (oldBooking.booking_status !== booking.booking_status) {
            const { data: customer } = await supabase
              .from('customers')
              .select('full_name')
              .eq('id', booking.customer_id)
              .single();

            const statusLabels: Record<string, string> = {
              pending: 'Pending',
              confirmed: 'Dikonfirmasi',
              processing: 'Diproses',
              completed: 'Selesai',
              cancelled: 'Dibatalkan',
            };

            addNotification({
              type: 'booking',
              title: '📋 Status Booking Berubah',
              message: `Booking ${booking.booking_code} untuk ${customer?.full_name || 'Customer'} sekarang ${statusLabels[booking.booking_status || ''] || booking.booking_status}`,
              data: booking,
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CLOSED' && process.env.NODE_ENV === 'development') {
          console.debug(`[Agent Booking Status] Channel closed for agent ${agentId} (expected behavior)`);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error(`[Agent Booking Status] Channel error for agent ${agentId}:`, status);
        }
      });

    // Subscribe to document rejection for this agent's customers
    agentChannels.documentChannel = supabase
      .channel(`agent-documents-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'customer_documents',
        },
        async (payload) => {
          if (!payload || !payload.new || !payload.old) return;
          const document = payload.new as DocumentRow;
          const oldDocument = payload.old as DocumentRow;
          
          // Only notify if status changed to rejected
          if (oldDocument.status !== 'rejected' && document.status === 'rejected') {
            // Check if this customer belongs to this agent
            const { data: booking } = await supabase
              .from('bookings')
              .select('booking_code, customer:customers(full_name)')
              .eq('agent_id', agentId)
              .eq('customer_id', document.customer_id)
              .maybeSingle();

            if (booking) {
              const bookingData = booking as unknown as BookingWithCustomer;
              const customerName = bookingData.customer?.full_name || 'Customer';
              addNotification({
                type: 'document',
                title: '❌ Dokumen Ditolak',
                message: `Dokumen ${document.document_type_id} untuk ${customerName} ditolak. Alasan: ${document.notes || 'Tidak ada keterangan'}`,
                data: document,
              });
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CLOSED' && process.env.NODE_ENV === 'development') {
          console.debug(`[Agent Documents] Channel closed for agent ${agentId} (expected behavior)`);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error(`[Agent Documents] Channel error for agent ${agentId}:`, status);
        }
      });

    // Subscribe to commission status changes
    agentChannels.commissionChannel = supabase
      .channel(`agent-commissions-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_commissions',
          filter: `agent_id=eq.${agentId}`,
        },
        async (payload) => {
          if (!payload || !payload.new || !payload.old) return;
          const commission = payload.new as CommissionRow;
          const oldCommission = payload.old as CommissionRow;
          
          // Only notify if status changed to paid
          if (oldCommission.status !== 'paid' && commission.status === 'paid') {
            addNotification({
              type: 'commission',
              title: '💰 Komisi Dibayarkan',
              message: `Komisi sebesar ${formatCurrency(commission.commission_amount)} telah ditransfer ke rekening Anda`,
              data: commission,
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CLOSED' && process.env.NODE_ENV === 'development') {
          console.debug(`[Agent Commissions] Channel closed for agent ${agentId} (expected behavior)`);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error(`[Agent Commissions] Channel error for agent ${agentId}:`, status);
        }
      });

    // Subscribe to payment verification for this agent's bookings
    agentChannels.paymentChannel = supabase
      .channel(`agent-payments-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
        },
        async (payload) => {
          if (!payload || !payload.new || !payload.old) return;
          const payment = payload.new as PaymentRow;
          const oldPayment = payload.old as PaymentRow;
          
          // Check if this payment belongs to this agent's booking
          const { data: booking } = await supabase
            .from('bookings')
            .select('booking_code, customer:customers(full_name)')
            .eq('agent_id', agentId)
            .eq('id', payment.booking_id)
            .maybeSingle();

          if (booking) {
            const bookingData = booking as unknown as BookingWithCustomer;
            const customerName = bookingData.customer?.full_name || 'Customer';
            // Notify if status changed to paid
            if (oldPayment.status !== 'paid' && payment.status === 'paid') {
              addNotification({
                type: 'payment',
                title: '✅ Pembayaran Diverifikasi',
                message: `Pembayaran ${payment.payment_code} untuk ${customerName} sebesar ${formatCurrency(payment.amount)} telah diverifikasi`,
                data: payment,
              });
            }
            // Notify if status changed to failed
            else if (oldPayment.status !== 'failed' && payment.status === 'failed') {
              addNotification({
                type: 'payment',
                title: '⚠️ Pembayaran Ditolak',
                message: `Pembayaran ${payment.payment_code} untuk ${customerName} ditolak. Alasan: ${payment.notes || 'Tidak ada keterangan'}`,
                data: payment,
              });
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CLOSED' && process.env.NODE_ENV === 'development') {
          console.debug(`[Agent Payments] Channel closed for agent ${agentId} (expected behavior)`);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error(`[Agent Payments] Channel error for agent ${agentId}:`, status);
        }
      });

    isSubscribedRef.current = true;
    agentChannels.subscriberCount++;

    return () => {
      const channels = agentChannelsMap.get(agentId);
      if (channels) {
        channels.subscriberCount--;
        // Hanya hapus channels jika tidak ada subscriber lagi
        if (channels.subscriberCount === 0) {
          if (channels.bookingStatusChannel) supabase.removeChannel(channels.bookingStatusChannel);
          if (channels.documentChannel) supabase.removeChannel(channels.documentChannel);
          if (channels.commissionChannel) supabase.removeChannel(channels.commissionChannel);
          if (channels.paymentChannel) supabase.removeChannel(channels.paymentChannel);
          agentChannelsMap.delete(agentId);
        }
      }
    };
  }, [agentId, addNotification]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
  };
}
