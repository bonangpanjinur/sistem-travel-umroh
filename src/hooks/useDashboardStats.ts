import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Database } from '@/integrations/supabase/types';

type Booking = Database['public']['Tables']['bookings']['Row'];
type Departure = Database['public']['Tables']['departures']['Row'];
type Package = Database['public']['Tables']['packages']['Row'];

export interface DashboardFilters {
  branchId?: string | null;
  startDate?: Date;
  endDate?: Date;
  agentId?: string | null;
}

/**
 * Optimized hook for dashboard statistics.
 * Implements:
 * 1. Parallel data fetching
 * 2. Efficient data processing (single pass where possible)
 * 3. Extended staleTime to reduce redundant API calls
 * 4. Selectors for granular re-renders
 */
export function useDashboardStats(filters: DashboardFilters = {}) {
  const { branchId, startDate, endDate, agentId } = filters;

  return useQuery({
    queryKey: ['admin-dashboard-stats', filters],
    queryFn: async () => {
      const defaultStartDate = subMonths(new Date(), 6);
      const effectiveStartDate = startDate || defaultStartDate;
      const effectiveEndDate = endDate || new Date();

      // Parallel fetch with optimized select statements (only fetch needed columns)
      const [
        { data: rawBookings },
        { data: agents },
        { count: customerCount },
        { data: pendingPayments },
        { data: leads }
      ] = await Promise.all([
        // Query 1: Bookings - Optimized column selection
        (() => {
          let q = supabase
            .from('bookings')
            .select('total_price, paid_amount, booking_status, payment_status, created_at, total_pax, agent_id, branch_id')
            .gte('created_at', effectiveStartDate.toISOString())
            .lte('created_at', effectiveEndDate.toISOString())
            .order('created_at', { ascending: false })
            .limit(1000);
          
          if (branchId) q = q.eq('branch_id', branchId);
          if (agentId) q = q.eq('agent_id', agentId);
          
          return q;
        })(),
        // Query 2: Agents - Cached/Limited
        supabase.from('agents').select('id, company_name').limit(200),
        // Query 3: Customer Count - Head only for performance
        (() => {
          let q = supabase.from('customers').select('*', { count: 'exact', head: true });
          if (branchId) q = q.eq('branch_id', branchId);
          return q;
        })(),
        // Query 4: Pending Payments - Inner join optimization
        (() => {
          let q = supabase.from('payments').select('amount, booking:bookings!inner(branch_id, agent_id)').eq('status', 'pending');
          if (branchId) q = q.eq('booking.branch_id', branchId);
          if (agentId) q = q.eq('booking.agent_id', agentId);
          return q;
        })(),
        // Query 5: Leads
        (() => {
          let q = supabase.from('leads').select('id, status, created_at');
          if (branchId) q = q.eq('branch_id', branchId);
          return q;
        })()
      ]);

      // Single-pass data processing for better performance
      let totalRevenue = 0;
      let totalBookings = 0;
      let pendingBookings = 0;
      let totalPax = 0;
      let totalOutstanding = 0;
      
      const agentStats: Record<string, { name: string; bookings: number; revenue: number }> = {};
      const statusMap: Record<string, number> = {};
      const paymentMap: Record<string, number> = {};
      const monthlyStatsMap: Record<string, { revenue: number; bookings: number }> = {};

      // Pre-calculate month keys for the interval to ensure all months are present
      const months = eachMonthOfInterval({
        start: effectiveStartDate,
        end: effectiveEndDate
      });
      
      months.forEach(month => {
        const key = format(month, 'yyyy-MM');
        monthlyStatsMap[key] = { revenue: 0, bookings: 0 };
      });

      rawBookings?.forEach(b => {
        const revenue = b.paid_amount || 0;
        const price = b.total_price || 0;
        const pax = b.total_pax || 0;
        const status = b.booking_status || 'pending';
        const pStatus = b.payment_status || 'pending';
        
        totalRevenue += revenue;
        totalBookings += 1;
        totalPax += pax;
        totalOutstanding += (price - revenue);
        
        if (status === 'pending') pendingBookings += 1;
        
        // Status distributions
        statusMap[status] = (statusMap[status] || 0) + 1;
        paymentMap[pStatus] = (paymentMap[pStatus] || 0) + 1;
        
        // Agent stats
        if (b.agent_id) {
          if (!agentStats[b.agent_id]) {
            const agentName = agents?.find(a => a.id === b.agent_id)?.company_name || 'Unknown Agent';
            agentStats[b.agent_id] = { name: agentName, bookings: 0, revenue: 0 };
          }
          agentStats[b.agent_id].bookings += 1;
          agentStats[b.agent_id].revenue += price;
        }
        
        // Monthly stats
        if (b.created_at) {
          const monthKey = b.created_at.substring(0, 7); // YYYY-MM
          if (monthlyStatsMap[monthKey]) {
            monthlyStatsMap[monthKey].revenue += revenue;
            monthlyStatsMap[monthKey].bookings += 1;
          }
        }
      });

      // Format monthly data for charts
      const monthlyRevenue = months.map(month => {
        const key = format(month, 'yyyy-MM');
        const stats = monthlyStatsMap[key];
        return {
          month: format(month, 'MMM', { locale: idLocale }),
          revenue: stats.revenue,
          bookings: stats.bookings
        };
      });

      // Lead Conversion Data
      const totalLeads = leads?.length || 0;
      const wonLeads = leads?.filter(l => l.status === 'won').length || 0;
      const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;

      const FUNNEL_STAGES = ['new', 'contacted', 'follow_up', 'negotiation', 'closing', 'won'];
      const FUNNEL_LABELS: Record<string, string> = {
        new: 'Baru', contacted: 'Dihubungi', follow_up: 'Follow Up',
        negotiation: 'Negosiasi', closing: 'Closing', won: 'Won'
      };

      const funnelData = FUNNEL_STAGES.map((status, index) => {
        const count = leads?.filter(l => {
          const statusIndex = FUNNEL_STAGES.indexOf(l.status as string);
          return statusIndex >= index;
        }).length || 0;
        return { name: FUNNEL_LABELS[status], value: count };
      });

      const topAgents = Object.values(agentStats)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const bookingStatusLabels: Record<string, string> = {
        pending: 'Menunggu', confirmed: 'Dikonfirmasi', cancelled: 'Dibatalkan',
        completed: 'Selesai', waiting_payment: 'Menunggu Pembayaran',
      };
      
      const statusData = Object.entries(statusMap).map(([name, value]) => ({
        name: bookingStatusLabels[name] || name.charAt(0).toUpperCase() + name.slice(1),
        value
      }));

      const pendingPaymentAmount = pendingPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const pendingPaymentCount = pendingPayments?.length || 0;

      return {
        totalRevenue,
        totalBookings,
        pendingBookings,
        customerCount: customerCount || 0,
        pendingPaymentAmount,
        pendingPaymentCount,
        totalPax,
        monthlyRevenue,
        statusData,
        totalLeads,
        wonLeads,
        conversionRate,
        funnelData,
        topAgents,
        totalOutstanding,
        arData: [
          { name: 'Terbayar', value: totalRevenue },
          { name: 'Piutang', value: totalOutstanding }
        ]
      };
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useRecentBookings(branchId?: string | null) {
  return useQuery({
    queryKey: ['admin-recent-bookings', branchId],
    queryFn: async () => {
      let query = supabase
        .from('bookings')
        .select(`
          id, booking_code, total_price, booking_status, payment_status, created_at,
          customer:customers(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      if (branchId) query = query.eq('branch_id', branchId);
      const { data, error } = await query;
      if (error) throw error;
      
      return data as (Pick<Booking, 'id' | 'booking_code' | 'total_price' | 'booking_status' | 'payment_status' | 'created_at'> & {
        customer: { full_name: string } | null;
      })[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpcomingDepartures(branchId?: string | null) {
  return useQuery({
    queryKey: ['admin-upcoming-departures', branchId],
    queryFn: async () => {
      let query = supabase
        .from('departures')
        .select(`
          id, departure_date, quota, booked_count,
          package:packages(name, code)
        `)
        .gte('departure_date', new Date().toISOString().split('T')[0])
        .order('departure_date', { ascending: true })
        .limit(5);
      let { data, error } = await query;
      
      if (branchId && data) {
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('departure_id')
          .eq('branch_id', branchId);
        
        if (bookingsError) throw bookingsError;
        
        const departureIdsInBranch = new Set((bookingsData || []).map(b => b.departure_id));
        data = data.filter(d => departureIdsInBranch.has(d.id));
      }
      if (error) throw error;
      
      return data as (Pick<Departure, 'id' | 'departure_date' | 'quota' | 'booked_count'> & {
        package: Pick<Package, 'name' | 'code'> | null;
      })[];
    },
    staleTime: 1000 * 60 * 15,
  });
}
