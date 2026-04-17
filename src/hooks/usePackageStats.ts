import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO } from 'date-fns';

export function usePackageStats() {
  return useQuery({
    queryKey: ['package-realization-stats'],
    queryFn: async () => {
      // 1. Fetch all bookings with package info through departures
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          total_pax,
          created_at,
          booking_status,
          departure:departures (
            id,
            package:packages (
              id,
              name,
              code
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

      let totalSold = 0;
      let soldThisMonth = 0;
      let soldThisYear = 0;
      
      const packageSales: Record<string, { name: string; code: string; count: number }> = {};

      bookings?.forEach((booking: any) => {
        const pax = booking.total_pax || 0;
        const createdAt = parseISO(booking.created_at);
        const pkg = booking.departure?.package;

        if (!pkg) return;

        // Overall stats
        totalSold += pax;

        // Monthly stats
        if (isWithinInterval(createdAt, { start: monthStart, end: monthEnd })) {
          soldThisMonth += pax;
        }

        // Yearly stats
        if (isWithinInterval(createdAt, { start: yearStart, end: yearEnd })) {
          soldThisYear += pax;
        }

        // Per package stats for "Most Popular"
        if (!packageSales[pkg.id]) {
          packageSales[pkg.id] = { 
            name: pkg.name, 
            code: pkg.code, 
            count: 0 
          };
        }
        packageSales[pkg.id].count += pax;
      });

      // Sort packages by sales count to find the most popular
      const sortedPackages = Object.values(packageSales).sort((a, b) => b.count - a.count);
      const mostPopular = sortedPackages[0] || null;

      return {
        totalSold,
        soldThisMonth,
        soldThisYear,
        mostPopular,
        topPackages: sortedPackages.slice(0, 5)
      };
    },
  });
}
