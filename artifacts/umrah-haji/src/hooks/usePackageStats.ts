import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO, eachDayOfInterval, format, subDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export interface PackageStatsFilters {
  startDate?: Date;
  endDate?: Date;
  packageType?: 'umroh' | 'haji' | 'haji_plus' | 'umroh_plus';
}

export function usePackageStats(filters?: PackageStatsFilters) {
  return useQuery({
    queryKey: ['package-realization-stats', filters],
    queryFn: async () => {
      // 1. Fetch all bookings with package info through departures
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          total_pax,
          created_at,
          booking_status,
          total_price,
          departure:departures (
            id,
            package:packages (
              id,
              name,
              code,
              package_type
            )
          )
        `)
        .neq('booking_status', 'cancelled');

      if (bookingsError) throw bookingsError;

      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const yearStart = startOfYear(now);
      const yearEnd = endOfYear(now);
      const last30Days = subDays(now, 30);

      // Apply custom date filter if provided
      const filterStartDate = filters?.startDate || last30Days;
      const filterEndDate = filters?.endDate || now;

      let totalSold = 0;
      let soldThisMonth = 0;
      let soldThisYear = 0;
      let soldInRange = 0;
      let totalRevenue = 0;
      let revenueInRange = 0;
      
      const packageSales: Record<string, { 
        name: string; 
        code: string; 
        count: number;
        revenue: number;
        bookingCount: number;
        type: string;
      }> = {};
      
      const dailyStats: Record<string, { date: string; pax: number; revenue: number; bookings: number }> = {};
      const monthlyStats: Record<string, { month: string; pax: number; revenue: number; bookings: number }> = {};

      bookings?.forEach((booking: any) => {
        const pax = booking.total_pax || 0;
        const revenue = booking.total_price || 0;
        const createdAt = parseISO(booking.created_at);
        const pkg = booking.departure?.package;

        if (!pkg) return;

        // Filter by package type if specified
        if (filters?.packageType && pkg.package_type !== filters.packageType) {
          return;
        }

        // Overall stats
        totalSold += pax;
        totalRevenue += revenue;

        // Monthly stats
        if (isWithinInterval(createdAt, { start: monthStart, end: monthEnd })) {
          soldThisMonth += pax;
        }

        // Yearly stats
        if (isWithinInterval(createdAt, { start: yearStart, end: yearEnd })) {
          soldThisYear += pax;
        }

        // Range filter stats
        if (isWithinInterval(createdAt, { start: filterStartDate, end: filterEndDate })) {
          soldInRange += pax;
          revenueInRange += revenue;
        }

        // Per package stats for "Most Popular"
        if (!packageSales[pkg.id]) {
          packageSales[pkg.id] = { 
            name: pkg.name, 
            code: pkg.code, 
            count: 0,
            revenue: 0,
            bookingCount: 0,
            type: pkg.package_type
          };
        }
        packageSales[pkg.id].count += pax;
        packageSales[pkg.id].revenue += revenue;
        packageSales[pkg.id].bookingCount += 1;

        // Daily stats for chart
        const dateKey = format(createdAt, 'yyyy-MM-dd');
        if (!dailyStats[dateKey]) {
          dailyStats[dateKey] = { date: dateKey, pax: 0, revenue: 0, bookings: 0 };
        }
        dailyStats[dateKey].pax += pax;
        dailyStats[dateKey].revenue += revenue;
        dailyStats[dateKey].bookings += 1;

        // Monthly stats for chart
        const monthKey = format(createdAt, 'yyyy-MM');
        if (!monthlyStats[monthKey]) {
          monthlyStats[monthKey] = { month: monthKey, pax: 0, revenue: 0, bookings: 0 };
        }
        monthlyStats[monthKey].pax += pax;
        monthlyStats[monthKey].revenue += revenue;
        monthlyStats[monthKey].bookings += 1;
      });

      // Sort packages by sales count to find the most popular
      const sortedPackages = Object.values(packageSales).sort((a, b) => b.count - a.count);
      const mostPopular = sortedPackages[0] || null;

      // Prepare daily chart data for last 30 days
      const last30DaysArray = eachDayOfInterval({ start: filterStartDate, end: filterEndDate });
      const dailyChartData = last30DaysArray.map(date => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const stats = dailyStats[dateKey] || { date: dateKey, pax: 0, revenue: 0, bookings: 0 };
        return {
          date: format(date, 'dd MMM', { locale: idLocale }),
          pax: stats.pax,
          revenue: stats.revenue,
          bookings: stats.bookings
        };
      });

      // Prepare monthly chart data
      const monthlyChartData = Object.values(monthlyStats)
        .sort((a, b) => a.month.localeCompare(b.month))
        .map(stat => ({
          month: format(parseISO(stat.month + '-01'), 'MMM yyyy', { locale: idLocale }),
          pax: stat.pax,
          revenue: stat.revenue,
          bookings: stat.bookings
        }));

      // Calculate package type breakdown
      const packageTypeBreakdown: Record<string, { type: string; count: number; revenue: number }> = {};
      sortedPackages.forEach(pkg => {
        if (!packageTypeBreakdown[pkg.type]) {
          packageTypeBreakdown[pkg.type] = { type: pkg.type, count: 0, revenue: 0 };
        }
        packageTypeBreakdown[pkg.type].count += pkg.count;
        packageTypeBreakdown[pkg.type].revenue += pkg.revenue;
      });

      return {
        // Summary stats
        totalSold,
        soldThisMonth,
        soldThisYear,
        soldInRange,
        totalRevenue,
        revenueInRange,
        mostPopular,
        topPackages: sortedPackages.slice(0, 5),
        
        // Chart data
        dailyChartData,
        monthlyChartData,
        
        // Breakdown data
        packageTypeBreakdown: Object.values(packageTypeBreakdown),
        allPackages: sortedPackages,
        
        // Additional metrics
        averageBookingValue: bookings && bookings.length > 0 ? totalRevenue / bookings.length : 0,
        totalBookings: bookings?.length || 0,
        conversionRate: bookings && bookings.length > 0 ? (bookings.filter(b => b.booking_status === 'confirmed').length / bookings.length) * 100 : 0
      };
    },
  });
}
