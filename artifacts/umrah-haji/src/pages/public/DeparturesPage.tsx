import { DynamicPublicLayout } from "@/components/layout/DynamicPublicLayout";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Plane, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { slugify } from "@/lib/slug";

export default function DeparturesPage() {
  const { data: departures, isLoading } = useQuery({
    queryKey: ["public-departures"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departures")
        .select(`
          *,
          package:packages(id, name, package_type, duration_days, is_active),
          airline:airlines(name, code),
          hotel_makkah:hotels!departures_hotel_makkah_id_fkey(name, star_rating),
          hotel_madinah:hotels!departures_hotel_madinah_id_fkey(name, star_rating)
        `)
        .eq("status", "open")
        .gte("departure_date", new Date().toISOString().split("T")[0])
        .order("departure_date");

      if (error) throw error;
      // Filter out departures whose packages are inactive
      return (data || []).filter((dep: any) => dep.package?.is_active !== false);
    },
  });

  return (
    <DynamicPublicLayout>

      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            Jadwal Keberangkatan
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4">
            Jadwal Keberangkatan Umroh
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Pilih jadwal keberangkatan yang sesuai dengan rencana Anda
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : departures && departures.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {departures.map((dep: any) => {
              const availableSlots = dep.quota - (dep.booked_count || 0);
              const lowestPrice = Math.min(
                dep.price_quad || Infinity,
                dep.price_triple || Infinity,
                dep.price_double || Infinity,
                dep.price_single || Infinity
              );

              return (
                <Card key={dep.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader className="bg-primary/5 pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">
                        {dep.package?.name || "Paket Umroh"}
                      </CardTitle>
                      <Badge variant={availableSlots > 5 ? "default" : "destructive"}>
                        Sisa {availableSlots} kursi
                      </Badge>
                    </div>
                    {dep.package?.package_type && (
                      <Badge variant="outline" className="w-fit">
                        {dep.package.package_type === "umroh_reguler" ? "Reguler" : 
                         dep.package.package_type === "umroh_plus" ? "Plus" : dep.package.package_type}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span>
                        {format(new Date(dep.departure_date), "dd MMMM yyyy", { locale: localeId })}
                        {" - "}
                        {format(new Date(dep.return_date), "dd MMMM yyyy", { locale: localeId })}
                      </span>
                    </div>

                    {dep.package?.duration_days && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4 text-primary" />
                        <span>{dep.package.duration_days} Hari</span>
                      </div>
                    )}

                    {dep.airline && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Plane className="h-4 w-4 text-primary" />
                        <span>{dep.airline.name}</span>
                      </div>
                    )}

                    {(dep.hotel_makkah || dep.hotel_madinah) && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Star className="h-4 w-4 text-primary" />
                        <span>
                          {dep.hotel_makkah?.name}
                          {dep.hotel_makkah && dep.hotel_madinah ? " & " : ""}
                          {dep.hotel_madinah?.name}
                        </span>
                      </div>
                    )}

                    <div className="pt-3 border-t">
                      <p className="text-xs text-muted-foreground">Mulai dari</p>
                      <p className="text-xl font-bold text-primary">
                        {lowestPrice < Infinity ? formatCurrency(lowestPrice) : "-"}
                      </p>
                    </div>

                    <Button asChild className="w-full">
                      <Link to={dep.package?.id ? `/packages/${dep.package.id}-${slugify(dep.package.name)}` : "/packages"}>
                        Daftar Sekarang
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Belum Ada Jadwal Tersedia
            </h3>
            <p className="text-muted-foreground">
              Jadwal keberangkatan baru akan segera tersedia. Silakan hubungi kami untuk informasi lebih lanjut.
            </p>
          </div>
        )}
      </div>
    </DynamicPublicLayout>
  );
}
