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
          .select('id, stock_quantity')
          .lte('stock_quantity', 5),
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
      const critical = items.filter((i: any) => i.stock_quantity === 0).length;
      const low = items.filter((i: any) => i.stock_quantity > 0 && i.stock_quantity <= 5).length;

      return {
        stockAlerts: { critical, low, total: items.length },
        pendingDocuments: pendingCount || 0,
        recentAudits: auditsData || [],
      };
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 30,
  });
}
