import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO, isWithinInterval } from 'date-fns';
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

export function useDashboardStats(filters: DashboardFilters = {}) {
  const { branchId, startDate, endDate, agentId } = filters;

  return useQuery({
    queryKey: ['admin-dashboard-stats', filters],
    queryFn: async () => {
      // Default to last 6 months if no date range provided
      const defaultStartDate = subMonths(new Date(), 6);
      const effectiveStartDate = startDate || defaultStartDate;
      const effectiveEndDate = endDate || new Date();

      // Use Promise.all to fetch all dashboard data in parallel
      const [
        { data: rawBookings },
        { data: agents },
        { count: customerCount },
        { data: pendingPayments },
        { data: leads }
      ] = await Promise.all([
        // Query 1: Bookings (capped to 1000 rows for filtered view)
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
        // Query 2: Agents (limit to top 100 for leaderboard)
        supabase.from('agents').select('id, company_name').limit(100),
        // Query 3: Customer Count
        (() => {
          let q = supabase.from('customers').select('*', { count: 'exact', head: true });
          if (branchId) q = q.eq('branch_id', branchId);
          return q;
        })(),
        // Query 4: Pending Payments
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
          // Leads might not have agent_id directly in some schemas, but if they do:
          // if (agentId) q = q.eq('agent_id', agentId);
          return q;
        })()
      ]);

      const bookings = rawBookings?.map(b => ({
        ...b,
        agent: agents?.find(a => a.id === b.agent_id) || null
      })) || [];

      const totalRevenue = bookings?.reduce((sum, b) => sum + (b.paid_amount || 0), 0) || 0;
      const totalBookings = bookings?.length || 0;
      const pendingBookings = bookings?.filter(b => b.booking_status === 'pending').length || 0;
      const pendingPaymentAmount = pendingPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const pendingPaymentCount = pendingPayments?.length || 0;
      const totalPax = bookings?.reduce((sum, b) => sum + (b.total_pax || 0), 0) || 0;

      // Lead Conversion Data
      const totalLeads = leads?.length || 0;
      const wonLeads = leads?.filter(l => l.status === 'won').length || 0;
      const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;

      const FUNNEL_STAGES = ['new', 'contacted', 'follow_up', 'negotiation', 'closing', 'won'];
      const FUNNEL_LABELS: Record<string, string> = {
        new: 'Baru',
        contacted: 'Dihubungi',
        follow_up: 'Follow Up',
        negotiation: 'Negosiasi',
        closing: 'Closing',
        won: 'Won'
      };

      const funnelData = FUNNEL_STAGES.map((status, index) => {
        const count = leads?.filter(l => {
          const statusIndex = FUNNEL_STAGES.indexOf(l.status as string);
          return statusIndex >= index;
        }).length || 0;
        return { name: FUNNEL_LABELS[status], value: count };
      });

      // Agent Leaderboard (Top 5)
      const agentStats: Record<string, { name: string; bookings: number; revenue: number }> = {};
      bookings?.forEach(b => {
        if (!b.agent_id) return;
        const agentName = (b.agent as any)?.company_name || 'Unknown Agent';
        if (!agentStats[b.agent_id]) {
          agentStats[b.agent_id] = { name: agentName, bookings: 0, revenue: 0 };
        }
        agentStats[b.agent_id].bookings += 1;
        agentStats[b.agent_id].revenue += b.total_price || 0;
      });

      const topAgents = Object.values(agentStats)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // AR Aging (Receivables)
      const totalOutstanding = bookings?.reduce((sum, b) => sum + ((b.total_price || 0) - (b.paid_amount || 0)), 0) || 0;
      const arData = [
        { name: 'Terbayar', value: totalRevenue },
        { name: 'Piutang', value: totalOutstanding }
      ];

      // Calculate monthly data based on the selected range
      const months = eachMonthOfInterval({
        start: effectiveStartDate,
        end: effectiveEndDate
      });

      const monthlyRevenue = months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const monthBookings = bookings?.filter(b => {
          if (!b.created_at) return false;
          const date = parseISO(b.created_at);
          return date >= monthStart && date <= monthEnd;
        }) || [];

        return {
          month: format(month, 'MMM', { locale: idLocale }),
          revenue: monthBookings.reduce((sum, b) => sum + (b.paid_amount || 0), 0),
          bookings: monthBookings.length
        };
      });

      const statusMap: Record<string, number> = {};
      bookings?.forEach(b => {
        const status = b.booking_status || 'pending';
        statusMap[status] = (statusMap[status] || 0) + 1;
      });
      const bookingStatusLabels: Record<string, string> = {
        pending: 'Menunggu',
        confirmed: 'Dikonfirmasi',
        cancelled: 'Dibatalkan',
        completed: 'Selesai',
        waiting_payment: 'Menunggu Pembayaran',
      };
      const statusData = Object.entries(statusMap).map(([name, value]) => ({
        name: bookingStatusLabels[name] || name.charAt(0).toUpperCase() + name.slice(1),
        value
      }));

      const paymentMap: Record<string, number> = {};
      bookings?.forEach(b => {
        const status = b.payment_status || 'pending';
        paymentMap[status] = (paymentMap[status] || 0) + 1;
      });
      const paymentStatusLabels: Record<string, string> = {
        pending: 'Menunggu',
        unpaid: 'Belum Bayar',
        partial: 'Sebagian',
        paid: 'Lunas',
        refunded: 'Dikembalikan',
      };
      const paymentData = Object.entries(paymentMap).map(([name, value]) => ({
        name: paymentStatusLabels[name] || name.charAt(0).toUpperCase() + name.slice(1),
        value
      }));

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
        paymentData,
        totalLeads,
        wonLeads,
        conversionRate,
        funnelData,
        topAgents,
        totalOutstanding,
        arData
      };
    },
    staleTime: 1000 * 60 * 5,
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
      
      // Filter departures by branch if branchId is provided
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
  });
}
