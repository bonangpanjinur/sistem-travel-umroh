import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Package, Calendar, Users } from "lucide-react";

export default function AgentPackages() {
  const { data: packages, isLoading } = useQuery({
    queryKey: ['agent-available-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select(`
          id,
          name,
          code,
          description,
          duration_days,
          price_quad,
          price_triple,
          price_double,
          price_single,
          featured_image,
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
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const getLowestPrice = (pkg: any) => {
    const openDepartures = (pkg.departures as any[])?.filter(
      (d: any) => d.status === 'open' && d.quota > d.booked_count
    ) || [];

    // Collect all non-zero prices from open departures
    const depPrices = openDepartures.flatMap((d: any) =>
      [d.price_quad, d.price_triple, d.price_double, d.price_single].filter((p: number) => p && p > 0)
    );

    if (depPrices.length > 0) {
      return Math.min(...depPrices);
    }

    // Fallback to package prices
    const pkgPrices = [pkg.price_quad, pkg.price_triple, pkg.price_double, pkg.price_single]
      .filter((p: number) => p && p > 0);

    return pkgPrices.length > 0 ? Math.min(...pkgPrices) : 0;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paket Tersedia</h1>
        <p className="text-muted-foreground">Lihat paket yang tersedia untuk didaftarkan</p>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      ) : packages?.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Tidak ada paket tersedia saat ini</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {packages?.map((pkg) => {
            const openDepartures = (pkg.departures as any[])?.filter(
              d => d.status === 'open' && d.quota > d.booked_count
            ) || [];
            const nextDeparture = openDepartures[0];
            const lowestPrice = getLowestPrice(pkg);

            return (
              <Card key={pkg.id} className="overflow-hidden">
                {pkg.featured_image && (
                  <div className="h-40 overflow-hidden">
                    <img 
                      src={pkg.featured_image} 
                      alt={pkg.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{pkg.name}</CardTitle>
                      <Badge variant="outline" className="mt-1">{pkg.code}</Badge>
                    </div>
                    <Badge>{pkg.duration_days} Hari</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pkg.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {pkg.description}
                    </p>
                  )}

                  {/* Pricing - show lowest price */}
                  <div className="text-center py-2">
                    {lowestPrice > 0 ? (
                      <div>
                        <p className="text-xs text-muted-foreground">Mulai dari</p>
                        <p className="text-xl font-bold text-primary">{formatCurrency(lowestPrice)}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Hubungi Kami</p>
                    )}
                  </div>

                  {/* Next Departure */}
                  {nextDeparture ? (
                    <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                      <Calendar className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Keberangkatan Terdekat</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(nextDeparture.departure_date), "dd MMMM yyyy", { locale: id })}
                        </p>
                      </div>
                      <div className="ml-auto flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {nextDeparture.quota - nextDeparture.booked_count} seat
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Tidak ada keberangkatan tersedia
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {openDepartures.length} keberangkatan tersedia
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
