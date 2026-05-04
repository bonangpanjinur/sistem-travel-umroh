import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePackageAnalytics() {
  return useQuery({
    queryKey: ['package-analytics'],
    queryFn: async () => {
      // Fetch all packages with their departures
      const { data: packages, error: packagesError } = await supabase
        .from('packages')
        .select(`
          id,
          name,
          code,
          is_active,
          is_featured,
          price_quad,
          price_triple,
          price_double,
          price_single,
          departures(
            id,
            departure_date,
            quota,
            booked_count,
            status,
            price_quad,
            price_triple,
            price_double,
            price_single
          )
        `)
        .order('created_at', { ascending: false });

      if (packagesError) throw packagesError;

      // Calculate analytics
      const totalPackages = packages?.length || 0;
      const activePackages = packages?.filter(p => p.is_active).length || 0;
      const inactivePackages = packages?.filter(p => !p.is_active).length || 0;
      const featuredPackages = packages?.filter(p => p.is_featured).length || 0;

      let totalDepartures = 0;
      let openDepartures = 0;
      let totalCapacity = 0;
      let totalBooked = 0;
      let totalRevenue = 0;
      let priceSum = 0;
      let priceCount = 0;

      packages?.forEach((pkg: any) => {
        const departures = pkg.departures || [];
        totalDepartures += departures.length;

        departures.forEach((dep: any) => {
          // Count open departures
          if (dep.status === 'open') {
            openDepartures += 1;
          }

          // Calculate capacity and booked
          const quota = dep.quota || 0;
          const booked = dep.booked_count || 0;
          totalCapacity += quota;
          totalBooked += booked;

          // Calculate potential revenue from available seats
          const available = quota - booked;
          if (available > 0) {
            const prices = [dep.price_quad, dep.price_triple, dep.price_double, dep.price_single]
              .filter((p: number) => p && p > 0);
            if (prices.length > 0) {
              const avgPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
              totalRevenue += available * avgPrice;
            }
          }
        });

        // Calculate average price from package
        const prices = [pkg.price_quad, pkg.price_triple, pkg.price_double, pkg.price_single]
          .filter((p: number) => p && p > 0);
        if (prices.length > 0) {
          priceSum += prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
          priceCount += 1;
        }
      });

      const availableCapacity = totalCapacity - totalBooked;
      const capacityUtilization = totalCapacity > 0 ? ((totalBooked / totalCapacity) * 100).toFixed(1) : "0";
      const averagePrice = priceCount > 0 ? priceSum / priceCount : 0;

      return {
        totalPackages,
        activePackages,
        inactivePackages,
        featuredPackages,
        totalDepartures,
        openDepartures,
        totalCapacity,
        totalBooked,
        availableCapacity,
        capacityUtilization: parseFloat(capacityUtilization as string),
        totalRevenue,
        averagePrice,
      };
    },
  });
}
