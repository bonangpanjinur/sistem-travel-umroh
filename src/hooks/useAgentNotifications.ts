import { useState, useEffect, useCallback } from "react";
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

export function useAgentNotifications(agentId?: string) {
  const [notifications, setNotifications] = useState<AgentNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

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

    // Subscribe to booking status changes for this agent
    const bookingStatusChannel = supabase
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
      .subscribe();

    // Subscribe to document rejection for this agent's customers
    const documentChannel = supabase
      .channel(`agent-documents-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'customer_documents',
        },
        async (payload) => {
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
      .subscribe();

    // Subscribe to commission status changes
    const commissionChannel = supabase
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
      .subscribe();

    // Subscribe to payment verification for this agent's bookings
    const paymentChannel = supabase
      .channel(`agent-payments-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
        },
        async (payload) => {
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
      .subscribe();

    return () => {
      supabase.removeChannel(bookingStatusChannel);
      supabase.removeChannel(documentChannel);
      supabase.removeChannel(commissionChannel);
      supabase.removeChannel(paymentChannel);
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
