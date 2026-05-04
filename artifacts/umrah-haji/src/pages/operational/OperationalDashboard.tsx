import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Plane, Users, Luggage, CheckCircle } from "lucide-react";

export default function OperationalDashboard() {
  const { data: upcomingDepartures, isLoading } = useQuery({
    queryKey: ['operational-upcoming-departures'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departures')
        .select(`
          id,
          departure_date,
          return_date,
          quota,
          booked_count,
          status,
          flight_number,
          package:packages(name, code)
        `)
        .gte('departure_date', new Date().toISOString().split('T')[0])
        .order('departure_date', { ascending: true })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['operational-stats'],
    queryFn: async () => {
      // Get today's check-ins
      const today = new Date().toISOString().split('T')[0];
      const { count: todayCheckins } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .gte('checked_in_at', `${today}T00:00:00`)
        .lte('checked_in_at', `${today}T23:59:59`);

      // Get registered luggage count
      const { count: luggageCount } = await supabase
        .from('luggage')
        .select('*', { count: 'exact', head: true });

      // Get total manifests
      const { count: manifestCount } = await supabase
        .from('manifests')
        .select('*', { count: 'exact', head: true });

      return {
        todayCheckins: todayCheckins || 0,
        luggageCount: luggageCount || 0,
        manifestCount: manifestCount || 0,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Operasional</h1>
        <p className="text-muted-foreground">Kelola keberangkatan, check-in, dan luggage</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Check-in Hari Ini</p>
                <p className="text-2xl font-bold">{stats?.todayCheckins || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Luggage</p>
                <p className="text-2xl font-bold">{stats?.luggageCount || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Luggage className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Manifest</p>
                <p className="text-2xl font-bold">{stats?.manifestCount || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Departures */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Keberangkatan Mendatang
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : upcomingDepartures?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Tidak ada keberangkatan mendatang
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingDepartures?.map((departure) => (
                <div 
                  key={departure.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div className="space-y-1">
                    <p className="font-semibold">
                      {(departure.package as any)?.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(departure.departure_date), "EEEE, dd MMMM yyyy", { locale: id })}
                    </p>
                    {departure.flight_number && (
                      <p className="text-xs text-muted-foreground">
                        Flight: {departure.flight_number}
                      </p>
                    )}
                  </div>
                  <div className="text-right space-y-1">
                    <Badge variant={departure.status === 'open' ? 'default' : 'secondary'}>
                      {departure.status}
                    </Badge>
                    <p className="text-sm">
                      <span className="font-semibold">{departure.booked_count}</span>
                      <span className="text-muted-foreground">/{departure.quota} pax</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
