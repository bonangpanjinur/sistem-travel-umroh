import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BookingFormData } from "@/hooks/useBookingWizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar, Hotel, Plane, Users, User } from "lucide-react";
import { RoomType } from "@/types/database";

interface StepReviewProps {
  formData: BookingFormData;
  packageId: string;
}

const ROOM_LABELS: Record<RoomType, string> = {
  quad: 'Quad (4 orang/kamar)',
  triple: 'Triple (3 orang/kamar)',
  double: 'Double (2 orang/kamar)',
  single: 'Single (1 orang/kamar)',
};

export function StepReview({ formData, packageId }: StepReviewProps) {
  const { data: pkg, isLoading: loadingPackage } = useQuery({
    queryKey: ['package-review', packageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select(`
          name,
          package_type,
          duration_days,
          price_quad,
          price_triple,
          price_double,
          price_single,
          currency,
          airline:airlines(name),
          hotel_makkah:hotels!packages_hotel_makkah_id_fkey(name, city, star_rating),
          hotel_madinah:hotels!packages_hotel_madinah_id_fkey(name, city, star_rating)
        `)
        .eq('id', packageId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: departure, isLoading: loadingDeparture } = useQuery({
    queryKey: ['departure-review', formData.departureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departures')
        .select('departure_date, return_date, flight_number')
        .eq('id', formData.departureId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!formData.departureId,
  });

  if (loadingPackage || loadingDeparture) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const priceMap: Record<RoomType, number> = {
    quad: pkg?.price_quad || 0,
    triple: pkg?.price_triple || 0,
    double: pkg?.price_double || 0,
    single: pkg?.price_single || 0,
  };

  const pricePerPerson = priceMap[formData.roomType];
  const totalPax = formData.passengers.length;
  const totalPrice = pricePerPerson * totalPax;

  // Type-safe access for joined data
  const airline = pkg?.airline as { name: string } | null;
  const hotelMakkah = pkg?.hotel_makkah as { name: string; city: string; star_rating: number } | null;
  const hotelMadinah = pkg?.hotel_madinah as { name: string; city: string; star_rating: number } | null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Review Booking</h3>
        <p className="text-sm text-muted-foreground">
          Periksa kembali data booking Anda sebelum melanjutkan
        </p>
      </div>

      {/* Package Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Hotel className="h-4 w-4" />
            Detail Paket
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="font-semibold text-lg">{pkg?.name}</p>
            <Badge variant="secondary" className="mt-1">
              {pkg?.duration_days} Hari
            </Badge>
          </div>
          
          <div className="grid gap-2 text-sm">
            {airline && (
              <div className="flex items-center gap-2">
                <Plane className="h-4 w-4 text-muted-foreground" />
                <span>{airline.name}</span>
              </div>
            )}
            {hotelMakkah && (
              <div className="flex items-center gap-2">
                <Hotel className="h-4 w-4 text-muted-foreground" />
                <span>{hotelMakkah.city}: {hotelMakkah.name} ({hotelMakkah.star_rating}⭐)</span>
              </div>
            )}
            {hotelMadinah && (
              <div className="flex items-center gap-2">
                <Hotel className="h-4 w-4 text-muted-foreground" />
                <span>{hotelMadinah.city}: {hotelMadinah.name} ({hotelMadinah.star_rating}⭐)</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Departure Info */}
      {departure && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Jadwal Keberangkatan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Berangkat</p>
                <p className="font-medium">
                  {format(new Date(departure.departure_date), "d MMMM yyyy", { locale: id })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Pulang</p>
                <p className="font-medium">
                  {format(new Date(departure.return_date), "d MMMM yyyy", { locale: id })}
                </p>
              </div>
              {departure.flight_number && (
                <div>
                  <p className="text-muted-foreground">Penerbangan</p>
                  <p className="font-medium">{departure.flight_number}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Passengers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Data Jamaah ({totalPax} orang)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {formData.passengers.map((passenger, index) => (
              <div key={passenger.id} className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{passenger.fullName || `Jamaah ${index + 1}`}</p>
                  <p className="text-muted-foreground text-xs">
                    {passenger.passengerType === 'adult' ? 'Dewasa' : 
                     passenger.passengerType === 'child' ? 'Anak' : 'Bayi'}
                    {passenger.passportNumber && ` • Paspor: ${passenger.passportNumber}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pricing Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ringkasan Biaya</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tipe Kamar</span>
            <span className="font-medium">{ROOM_LABELS[formData.roomType]}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Harga per orang</span>
            <span>{formatCurrency(pricePerPerson)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Jumlah jamaah</span>
            <span>{totalPax} orang</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(totalPrice)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
