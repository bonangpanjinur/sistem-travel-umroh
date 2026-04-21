import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO, startOfWeek, endOfWeek, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
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
  subAgentId?: string | null;
  hierarchyLevel?: 'all' | 'pusat' | 'cabang' | 'agen' | 'sub_agen';
}

/**
 * Optimized hook for dashboard statistics with hierarchy filters.
 * Implements:
 * 1. Parallel data fetching
 * 2. Efficient data processing (single pass where possible)
 * 3. Extended staleTime to reduce redundant API calls
 * 4. Jamaah registration data per day/week/month/year
 * 5. Hierarchy-aware filtering (Pusat, Cabang, Agen, Sub-Agen)
 */
export function useDashboardStats(filters: DashboardFilters = {}, options: { enabled?: boolean } = {}) {
  const { branchId, startDate, endDate, agentId, subAgentId, hierarchyLevel } = filters;
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['admin-dashboard-stats', filters],
    enabled,
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
        { data: leads },
        { data: branches },
        { data: customers },
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
          
          // Apply Hierarchy Filtering
          if (hierarchyLevel === 'pusat') {
            q = q.is('branch_id', null).is('agent_id', null);
          } else if (hierarchyLevel === 'cabang') {
            if (branchId && branchId !== 'all') {
              q = q.eq('branch_id', branchId);
            } else {
              q = q.not('branch_id', 'is', null);
            }
          } else if (hierarchyLevel === 'agen') {
            if (agentId && agentId !== 'all') {
              q = q.eq('agent_id', agentId);
            } else {
              q = q.not('agent_id', 'is', null);
            }
          } else if (hierarchyLevel === 'sub_agen') {
            if (subAgentId && subAgentId !== 'all') {
              q = q.eq('agent_id', subAgentId);
            } else {
              // This logic is tricky without a direct sub-agent flag in bookings
              // We'll filter by agent_id being in the list of sub-agents in the processing step
            }
          } else {
            // 'all' level - optionally filter by branch/agent if specifically selected
            if (branchId && branchId !== 'all') q = q.eq('branch_id', branchId);
            if (agentId && agentId !== 'all') q = q.eq('agent_id', agentId);
            if (subAgentId && subAgentId !== 'all') q = q.eq('agent_id', subAgentId);
          }
          
          return q;
        })(),
        // Query 2: Agents - Cached/Limited
        supabase.from('agents').select('id, company_name, parent_agent_id, branch_id').limit(500),
        // Query 3: Customer Count - Head only for performance
        (() => {
          let q = supabase.from('customers').select('*', { count: 'exact', head: true });
          if (branchId && branchId !== 'all') q = q.eq('branch_id', branchId);
          return q;
        })(),
        // Query 4: Pending Payments - Inner join optimization
        (() => {
          let q = supabase.from('payments').select('amount, booking:bookings!inner(branch_id, agent_id)').eq('status', 'pending');
          if (branchId && branchId !== 'all') q = q.eq('booking.branch_id', branchId);
          if (agentId && agentId !== 'all') q = q.eq('booking.agent_id', agentId);
          return q;
        })(),
        // Query 5: Leads
        (() => {
          let q = supabase.from('leads').select('id, status, created_at');
          if (branchId && branchId !== 'all') q = q.eq('branch_id', branchId);
          return q;
        })(),
        // Query 6: Branches for hierarchy
        supabase.from('branches').select('id, name, is_active'),
        // Query 7: Customers for jamaah registration tracking
        (() => {
          let q = supabase
            .from('customers')
            .select('id, created_at, branch_id')
            .gte('created_at', effectiveStartDate.toISOString())
            .lte('created_at', effectiveEndDate.toISOString());
          
          if (branchId && branchId !== 'all') q = q.eq('branch_id', branchId);
          return q;
        })(),
      ]);

      // Map for quick sub-agent identification
      const subAgentIds = new Set((agents || []).filter(a => a.parent_agent_id !== null).map(a => a.id));
      const topLevelAgentIds = new Set((agents || []).filter(a => a.parent_agent_id === null).map(a => a.id));

      // Single-pass data processing for better performance
      let totalRevenue = 0;
      let totalBookings = 0;
      let pendingBookings = 0;
      let totalPax = 0;
      let totalOutstanding = 0;
      let soldPackagesCount = 0;
      
      const agentStats: Record<string, { name: string; bookings: number; revenue: number }> = {};
      const statusMap: Record<string, number> = {};
      const paymentMap: Record<string, number> = {};
      const monthlyStatsMap: Record<string, { revenue: number; bookings: number }> = {};
      
      // Sold packages tracking
      const soldByDay: Record<string, number> = {};
      const soldByWeek: Record<string, number> = {};
      const soldByMonth: Record<string, number> = {};

      // Pre-calculate month keys for the interval to ensure all months are present
      const months = eachMonthOfInterval({
        start: effectiveStartDate,
        end: effectiveEndDate
      });
      
      months.forEach(month => {
        const key = format(month, 'yyyy-MM');
        monthlyStatsMap[key] = { revenue: 0, bookings: 0 };
      });

      // Build agent map once for O(1) lookup
      const agentMap = new Map<string, string>(
        (agents || []).map(a => [a.id, a.company_name || 'Unknown Agent'])
      );

      rawBookings?.forEach(b => {
        // Additional filtering for 'sub_agen' hierarchy level if no specific subAgentId is selected
        if (hierarchyLevel === 'sub_agen' && (!subAgentId || subAgentId === 'all')) {
          if (!b.agent_id || !subAgentIds.has(b.agent_id)) return;
        }
        // Additional filtering for 'agen' hierarchy level if no specific agentId is selected
        if (hierarchyLevel === 'agen' && (!agentId || agentId === 'all')) {
          if (!b.agent_id || !topLevelAgentIds.has(b.agent_id)) return;
        }

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
        
        const isSold = status === 'confirmed' || status === 'completed';
        if (isSold) {
          soldPackagesCount += 1;
          
          if (b.created_at) {
            const date = parseISO(b.created_at);
            // Daily
            const dayKey = format(date, 'yyyy-MM-dd');
            soldByDay[dayKey] = (soldByDay[dayKey] || 0) + 1;
            // Weekly
            const weekStart = startOfWeek(date, { weekStartsOn: 1 });
            const weekKey = format(weekStart, 'yyyy-MM-dd');
            soldByWeek[weekKey] = (soldByWeek[weekKey] || 0) + 1;
            // Monthly
            const monthKey = format(date, 'yyyy-MM');
            soldByMonth[monthKey] = (soldByMonth[monthKey] || 0) + 1;
          }
        }
        
        // Status distributions
        statusMap[status] = (statusMap[status] || 0) + 1;
        paymentMap[pStatus] = (paymentMap[pStatus] || 0) + 1;
        
        // Agent stats - O(1) Map lookup
        if (b.agent_id) {
          if (!agentStats[b.agent_id]) {
            const agentName = agentMap.get(b.agent_id) || 'Unknown Agent';
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

      // Jamaah Registration Data (per jamaah, not per booking)
      const jamaahByDay: Record<string, number> = {};
      const jamaahByWeek: Record<string, number> = {};
      const jamaahByMonth: Record<string, number> = {};
      let totalJamaah = 0;

      customers?.forEach(customer => {
        if (customer.created_at) {
          totalJamaah += 1;
          
          // Daily registration
          const dayKey = format(parseISO(customer.created_at), 'yyyy-MM-dd');
          jamaahByDay[dayKey] = (jamaahByDay[dayKey] || 0) + 1;
          
          // Weekly registration
          const weekStart = startOfWeek(parseISO(customer.created_at), { weekStartsOn: 1 });
          const weekKey = format(weekStart, 'yyyy-MM-dd');
          jamaahByWeek[weekKey] = (jamaahByWeek[weekKey] || 0) + 1;
          
          // Monthly registration
          const monthKey = format(parseISO(customer.created_at), 'yyyy-MM');
          jamaahByMonth[monthKey] = (jamaahByMonth[monthKey] || 0) + 1;
        }
      });

      // Format daily data (last 30 days)
      const days = eachDayOfInterval({
        start: effectiveStartDate,
        end: effectiveEndDate
      });

      const dailyJamaahData = days.map(day => {
        const key = format(day, 'yyyy-MM-dd');
        return {
          date: format(day, 'dd MMM', { locale: idLocale }),
          jamaah: jamaahByDay[key] || 0
        };
      });

      // Format weekly data
      const weeks = [];
      const soldWeeks = [];
      let currentWeek = startOfWeek(effectiveStartDate, { weekStartsOn: 1 });
      while (currentWeek <= effectiveEndDate) {
        const weekKey = format(currentWeek, 'yyyy-MM-dd');
        const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
        const weekLabel = `${format(currentWeek, 'dd MMM', { locale: idLocale })} - ${format(weekEnd, 'dd MMM', { locale: idLocale })}`;
        
        weeks.push({
          week: weekLabel,
          jamaah: jamaahByWeek[weekKey] || 0
        });
        
        soldWeeks.push({
          week: weekLabel,
          sold: soldByWeek[weekKey] || 0
        });
        
        currentWeek = new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
      }

      // Format monthly data
      const monthlyJamaahData = months.map(month => {
        const key = format(month, 'yyyy-MM');
        return {
          month: format(month, 'MMM yyyy', { locale: idLocale }),
          jamaah: jamaahByMonth[key] || 0
        };
      });
      
      const monthlySoldData = months.map(month => {
        const key = format(month, 'yyyy-MM');
        return {
          month: format(month, 'MMM yyyy', { locale: idLocale }),
          sold: soldByMonth[key] || 0
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
        totalJamaah,
        monthlyRevenue,
        statusData,
        totalLeads,
        wonLeads,
        conversionRate,
        funnelData,
        topAgents,
        totalOutstanding,
        soldPackagesCount,
        arData: [
          { name: 'Terbayar', value: totalRevenue },
          { name: 'Piutang', value: totalOutstanding }
        ],
        // Jamaah registration data
        dailyJamaahData,
        weeklyJamaahData: weeks,
        monthlyJamaahData,
        // Sold packages periodic data
        weeklySoldData: soldWeeks,
        monthlySoldData,
        branches: branches || [],
        agents: agents || [],
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
      if (branchId && branchId !== 'all') query = query.eq('branch_id', branchId);
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
      
      if (branchId && branchId !== 'all' && data) {
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
