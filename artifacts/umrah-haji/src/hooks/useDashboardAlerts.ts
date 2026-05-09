import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Combined dashboard alerts hook.
 * Fetches stockAlerts + pendingDocuments + recentAudits in a single Promise.all
 * to reduce round-trips and React Query subscriptions on the admin dashboard.
 */
export function useDashboardAlerts() {
  return useQuery({
    queryKey: ['admin-dashboard-alerts'],
    queryFn: async () => {
      const todayStr    = new Date().toISOString().slice(0, 10);
      const tomorrowStr = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

      const supabaseRaw: any = supabase;
      const [
        { data: stockData },
        { count: pendingCount },
        { data: auditsData },
        { count: reminderTodayCount },
        { count: reminderTomorrowCount },
        { count: reminderOverdueCount },
      ] = await Promise.all([
        supabase
          .from('equipment_items')
          .select('id, stock_quantity'),
        supabase
          .from('customer_documents')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5),
        // Reminders dengan deadline hari ini
        supabaseRaw
          .from('payment_deadline_reminders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
          .eq('payment_deadline', todayStr),
        // Reminders jatuh tempo besok
        supabaseRaw
          .from('payment_deadline_reminders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
          .eq('payment_deadline', tomorrowStr),
        // Reminders overdue (deadline sudah lewat, belum terkirim)
        supabaseRaw
          .from('payment_deadline_reminders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
          .lt('payment_deadline', todayStr),
      ]);

      const items = stockData || [];
      const total = items.length;
      const outOfStock = items.filter((i: any) => (i.stock_quantity ?? 0) === 0).length;
      const critical = outOfStock;
      const low = items.filter((i: any) => (i.stock_quantity ?? 0) > 0 && (i.stock_quantity ?? 0) <= 5).length;
      const healthy = total - outOfStock - low;

      // "Hari ini" = reminders dengan deadline today
      const remindersDueToday    = (reminderTodayCount as number)    || 0;
      const remindersDueTomorrow = (reminderTomorrowCount as number) || 0;
      const remindersOverdue     = (reminderOverdueCount as number)  || 0;

      return {
        stockAlerts: { critical, low, outOfStock, healthy, total },
        pendingDocuments: pendingCount || 0,
        recentAudits: auditsData || [],
        paymentReminders: {
          dueToday:    remindersDueToday,
          dueTomorrow: remindersDueTomorrow,
          overdue:     remindersOverdue,
          total:       remindersDueToday + remindersDueTomorrow + remindersOverdue,
        },
      };
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
}
