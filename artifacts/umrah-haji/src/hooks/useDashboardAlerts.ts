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
      const [
        { data: stockData },
        { count: pendingCount },
        { data: auditsData },
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
      ]);

      const items = stockData || [];
      const total = items.length;
      const outOfStock = items.filter((i: any) => (i.stock_quantity ?? 0) === 0).length;
      const critical = outOfStock; // alias kept for backward compat
      const low = items.filter((i: any) => (i.stock_quantity ?? 0) > 0 && (i.stock_quantity ?? 0) <= 5).length;
      const healthy = total - outOfStock - low;

      return {
        stockAlerts: { critical, low, outOfStock, healthy, total },
        pendingDocuments: pendingCount || 0,
        recentAudits: auditsData || [],
      };
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
}
