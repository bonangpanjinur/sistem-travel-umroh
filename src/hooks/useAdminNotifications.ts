import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { Database } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";

export interface AdminNotification {
  id: string;
  type: 'booking' | 'payment' | 'device_registration';
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
  link?: string;
  data?: any;
}

type BookingRow = Database['public']['Tables']['bookings']['Row'];
type PaymentRow = Database['public']['Tables']['payments']['Row'];
type EmployeeDevice = Database['public']['Tables']['employee_devices']['Row'];

export function useAdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  const addNotification = useCallback((notification: Omit<AdminNotification, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: AdminNotification = {
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
      onClick: () => {
        if (notification.link) {
          navigate(notification.link);
        }
      }
    });
  }, [toast, navigate]);

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
    const channelId = crypto.randomUUID().slice(0, 8);
    
    // Combined channel for all admin notifications to reduce overhead
    const adminChannel = supabase
      .channel(`admin-notifications-${channelId}`)
      // 1. New Bookings
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bookings' },
        async (payload) => {
          if (!payload || !payload.new) return;
          const booking = payload.new as BookingRow;
          const { data: customer } = await supabase
            .from('customers')
            .select('full_name')
            .eq('id', booking.customer_id)
            .single();

          addNotification({
            type: 'booking',
            title: '🎉 Booking Baru!',
            message: `${customer?.full_name || 'Customer'} membuat booking ${booking.booking_code} senilai ${formatCurrency(booking.total_price)}`,
            link: `/admin/bookings/${booking.id}`,
            data: booking,
          });
        }
      )
      // 2. New Payments
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'payments' },
        async (payload) => {
          if (!payload || !payload.new) return;
          const payment = payload.new as PaymentRow;
          const { data: booking } = await supabase
            .from('bookings')
            .select('id, booking_code')
            .eq('id', payment.booking_id)
            .single();

          addNotification({
            type: 'payment',
            title: '💰 Pembayaran Masuk!',
            message: `Pembayaran ${payment.payment_code} untuk booking ${booking?.booking_code || ''} senilai ${formatCurrency(payment.amount)}`,
            link: booking ? `/admin/bookings/${booking.id}` : '/admin/payments',
            data: payment,
          });
        }
      )
      // 3. Payment Verification Updates
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'payments' },
        async (payload) => {
          if (!payload || !payload.new || !payload.old) return;
          const payment = payload.new as PaymentRow;
          const oldPayment = payload.old as PaymentRow;
          
          if (oldPayment.status !== 'pending' && payment.status === 'pending' && payment.proof_url) {
            const { data: booking } = await supabase
              .from('bookings')
              .select('id, booking_code')
              .eq('id', payment.booking_id)
              .single();

            addNotification({
              type: 'payment',
              title: '📄 Bukti Pembayaran Diunggah',
              message: `Pembayaran ${payment.payment_code} untuk booking ${booking?.booking_code || ''} menunggu verifikasi`,
              link: booking ? `/admin/bookings/${booking.id}` : '/admin/payments',
              data: payment,
            });
          }
        }
      )
      // 4. Device Registrations
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'employee_devices' },
        async (payload) => {
          if (!payload || !payload.new) return;
          const device = payload.new as EmployeeDevice;
          const { data: employee } = await supabase
            .from('employees')
            .select('id, full_name, employee_code')
            .eq('id', device.employee_id)
            .single();

          addNotification({
            type: 'device_registration',
            title: '📱 Perangkat Baru Terdaftar',
            message: `${employee?.full_name || 'Karyawan'} (${employee?.employee_code || ''}) telah mendaftarkan perangkat: ${device.device_name}`,
            link: '/admin/hr?tab=devices',
            data: device,
          });
        }
      )
      .subscribe((status) => {
        if (status === 'CLOSED') console.warn('Admin notifications channel closed');
        if (status === 'CHANNEL_ERROR') console.error('Admin notifications channel error');
      });

    return () => {
      supabase.removeChannel(adminChannel);
    };
  }, [addNotification]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
  };
}
