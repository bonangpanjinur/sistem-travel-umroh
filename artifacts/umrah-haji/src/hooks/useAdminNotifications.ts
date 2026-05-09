import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { Database } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";

export interface AdminNotification {
  id: string;
  type: 'booking' | 'payment' | 'device_registration' | 'chat_lead' | 'sos_alert' | 'visa_update' | 'approval_request' | 'lead' | 'document';
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

let adminChannelInstance: ReturnType<typeof supabase.channel> | null = null;
let channelSubscriberCount = 0;

export function useAdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();
  const isSubscribedRef = useRef(false);

  const addNotification = useCallback((notification: Omit<AdminNotification, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: AdminNotification = {
      ...notification,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 50));
    setUnreadCount(prev => prev + 1);
    toast({
      title: notification.title,
      description: notification.message,
      onClick: () => { if (notification.link) navigate(notification.link); }
    });
  }, [toast, navigate]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
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
    if (adminChannelInstance && isSubscribedRef.current) {
      channelSubscriberCount++;
      return () => {
        channelSubscriberCount--;
        if (channelSubscriberCount === 0 && adminChannelInstance) {
          supabase.removeChannel(adminChannelInstance);
          adminChannelInstance = null;
        }
      };
    }

    if (!adminChannelInstance) {
      adminChannelInstance = supabase
        .channel('admin-notifications-persistent')

        // 1. New Bookings
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' },
          async (payload) => {
            if (!payload?.new) return;
            const booking = payload.new as BookingRow;
            const { data: customer } = await supabase
              .from('customers').select('full_name').eq('id', booking.customer_id).single();
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
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments' },
          async (payload) => {
            if (!payload?.new) return;
            const payment = payload.new as PaymentRow;
            const { data: booking } = await supabase
              .from('bookings').select('id, booking_code').eq('id', payment.booking_id).single();
            addNotification({
              type: 'payment',
              title: '💰 Pembayaran Masuk!',
              message: `Pembayaran ${payment.payment_code} untuk booking ${booking?.booking_code || ''} senilai ${formatCurrency(payment.amount)}`,
              link: booking ? `/admin/bookings/${booking.id}` : '/admin/payments',
              data: payment,
            });
          }
        )

        // 3. Payment Proof Upload
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'payments' },
          async (payload) => {
            if (!payload?.new || !payload?.old) return;
            const payment = payload.new as PaymentRow;
            const oldPayment = payload.old as PaymentRow;
            if (oldPayment.status !== 'pending' && payment.status === 'pending' && payment.proof_url) {
              const { data: booking } = await supabase
                .from('bookings').select('id, booking_code').eq('id', payment.booking_id).single();
              addNotification({
                type: 'payment',
                title: '📄 Bukti Pembayaran Diunggah',
                message: `Pembayaran ${payment.payment_code} menunggu verifikasi — booking ${booking?.booking_code || ''}`,
                link: booking ? `/admin/bookings/${booking.id}` : '/admin/payments',
                data: payment,
              });
            }
          }
        )

        // 4. Device Registrations
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'employee_devices' },
          async (payload) => {
            if (!payload?.new) return;
            const device = payload.new as EmployeeDevice;
            const { data: employee } = await supabase
              .from('employees').select('id, full_name, employee_code').eq('id', device.employee_id).single();
            addNotification({
              type: 'device_registration',
              title: '📱 Perangkat Baru',
              message: `${employee?.full_name || 'Karyawan'} (${employee?.employee_code || ''}) mendaftarkan: ${device.device_name}`,
              link: '/admin/hr?tab=devices',
              data: device,
            });
          }
        )

        // 5. Support Tickets
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_tickets' },
          (payload) => {
            if (!payload?.new) return;
            const ticket = payload.new as any;
            addNotification({
              type: 'booking',
              title: '🎫 Tiket Support Baru',
              message: `"${ticket.subject || 'Tanpa Judul'}" dari ${ticket.customer_name || 'Customer'}`,
              link: '/admin/support',
              data: ticket,
            });
          }
        )

        // 6. Chat Leads (Widget)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_leads' },
          (payload) => {
            if (!payload?.new) return;
            const lead = payload.new as any;
            addNotification({
              type: 'chat_lead',
              title: '💬 Lead dari Chat Widget',
              message: `${lead.name || 'Pengunjung'} (${lead.phone || '-'})${lead.message ? `: "${lead.message.slice(0, 60)}${lead.message.length > 60 ? '…' : ''}"` : ''}`,
              link: '/admin/chat-leads',
              data: lead,
            });
          }
        )

        // 7. New CRM Leads
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' },
          (payload) => {
            if (!payload?.new) return;
            const lead = payload.new as any;
            const sourceLabel: Record<string, string> = {
              website: 'Website', whatsapp: 'WhatsApp', instagram: 'Instagram',
              facebook: 'Facebook', referral: 'Referral', walk_in: 'Walk-in',
            };
            addNotification({
              type: 'lead',
              title: '👤 Prospek Baru!',
              message: `${lead.full_name || 'Prospek'} (${lead.phone || lead.email || '-'}) — ${sourceLabel[lead.source] || lead.source || 'Sumber tidak diketahui'}`,
              link: '/admin/leads',
              data: lead,
            });
          }
        )

        // 8. Document Uploads (pending verification)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'customer_documents' },
          async (payload) => {
            if (!payload?.new) return;
            const doc = payload.new as any;
            const { data: customer } = await supabase
              .from('customers').select('full_name').eq('id', doc.customer_id).maybeSingle();
            addNotification({
              type: 'document',
              title: '📎 Dokumen Baru Diupload',
              message: `${customer?.full_name || 'Jamaah'} mengupload dokumen — menunggu verifikasi`,
              link: '/admin/document-verification',
              data: doc,
            });
          }
        )

        // 9. SOS Alerts
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sos_alerts' },
          async (payload) => {
            if (!payload?.new) return;
            const sos = payload.new as any;
            const { data: customer } = await supabase
              .from('customers').select('full_name, phone').eq('id', sos.customer_id).maybeSingle();
            const typeLabels: Record<string, string> = {
              medical: 'Medis/Kesehatan', lost: 'Tersesat/Hilang',
              security: 'Keamanan', other: 'Lainnya',
            };
            addNotification({
              type: 'sos_alert',
              title: '🆘 SOS DARURAT!',
              message: `${customer?.full_name || 'Jamaah'} (${customer?.phone || '-'}): ${typeLabels[sos.emergency_type] || sos.emergency_type}`,
              link: '/admin/sos-alerts',
              data: sos,
            });
          }
        )

        // 10. Visa Status Updates
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'visa_applications' },
          async (payload) => {
            if (!payload?.new || !payload?.old) return;
            const newVisa = payload.new as any;
            const oldVisa = payload.old as any;
            if (newVisa.status === oldVisa.status) return;
            const { data: customer } = await supabase
              .from('customers').select('full_name').eq('id', newVisa.customer_id).maybeSingle();
            const statusLabels: Record<string, string> = {
              approved: 'Disetujui ✅', rejected: 'Ditolak ❌',
              processing: 'Diproses', submitted: 'Diajukan',
            };
            addNotification({
              type: 'visa_update',
              title: '📋 Update Status Visa',
              message: `Visa ${customer?.full_name || 'Jamaah'}: ${statusLabels[newVisa.status] || newVisa.status}`,
              link: '/admin/visa',
              data: newVisa,
            });
          }
        )

        .subscribe((status) => {
          if (import.meta.env.DEV) {
            if (status === 'CLOSED') console.debug('[Admin Notifications] Channel closed');
            if (status === 'CHANNEL_ERROR') console.debug('[Admin Notifications] Channel error');
          }
        });
    }

    isSubscribedRef.current = true;
    channelSubscriberCount++;

    return () => {
      channelSubscriberCount--;
      if (channelSubscriberCount === 0 && adminChannelInstance) {
        supabase.removeChannel(adminChannelInstance);
        adminChannelInstance = null;
        isSubscribedRef.current = false;
      }
    };
  }, [addNotification]);

  return { notifications, unreadCount, markAsRead, markAllAsRead, clearAll };
}
