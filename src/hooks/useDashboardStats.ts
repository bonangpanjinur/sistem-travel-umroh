import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Database } from '@/integrations/supabase/types';

type Booking = Database['public']['Tables']['bookings']['Row'];
type Departure = Database['public']['Tables']['departures']['Row'];
type Package = Database['public']['Tables']['packages']['Row'];

export function useDashboardStats(branchId?: string | null) {
  return useQuery({
    queryKey: ['admin-dashboard-stats', branchId],
    queryFn: async () => {
      let bookingsQuery = supabase
        .from('bookings')
        .select('total_price, paid_amount, booking_status, payment_status, created_at, total_pax');
      if (branchId) bookingsQuery = bookingsQuery.eq('branch_id', branchId);
      const { data: bookings } = await bookingsQuery;

      let customerQuery = supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });
      if (branchId) customerQuery = customerQuery.eq('branch_id', branchId);
      const { count: customerCount } = await customerQuery;

      const { data: pendingPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'pending');

      const totalRevenue = bookings?.reduce((sum, b) => sum + (b.paid_amount || 0), 0) || 0;
      const totalBookings = bookings?.length || 0;
      const pendingBookings = bookings?.filter(b => b.booking_status === 'pending').length || 0;
      const pendingPaymentAmount = pendingPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const pendingPaymentCount = pendingPayments?.length || 0;
      const totalPax = bookings?.reduce((sum, b) => sum + (b.total_pax || 0), 0) || 0;

      const months = eachMonthOfInterval({
        start: subMonths(new Date(), 5),
        end: new Date()
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
      const statusData = Object.entries(statusMap).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value
      }));

      const paymentMap: Record<string, number> = {};
      bookings?.forEach(b => {
        const status = b.payment_status || 'pending';
        paymentMap[status] = (paymentMap[status] || 0) + 1;
      });
      const paymentData = Object.entries(paymentMap).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
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
      };
    },
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

export function useUpcomingDepartures() {
  return useQuery({
    queryKey: ['admin-upcoming-departures'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departures')
        .select(`
          id, departure_date, quota, booked_count,
          package:packages(name, code)
        `)
        .gte('departure_date', new Date().toISOString().split('T')[0])
        .order('departure_date', { ascending: true })
        .limit(5);
      if (error) throw error;
      
      return data as (Pick<Departure, 'id' | 'departure_date' | 'quota' | 'booked_count'> & {
        package: Pick<Package, 'name' | 'code'> | null;
      })[];
    },
  });
}
