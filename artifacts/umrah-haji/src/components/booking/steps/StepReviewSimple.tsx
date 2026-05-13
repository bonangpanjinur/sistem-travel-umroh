import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SimpleBookingFormData } from "@/hooks/useBookingWizardSimple";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Hotel, CreditCard, Plane, CheckCircle, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoyaltyTier, TIER_LABELS } from "@/hooks/useLoyaltyTier";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface StepReviewSimpleProps {
  formData: SimpleBookingFormData;
  packageId: string;
}

const ROOM_LABELS: Record<string, string> = {
  quad: 'Quad (4 orang)',
  triple: 'Triple (3 orang)',
  double: 'Double (2 orang)',
  single: 'Single (1 orang)',
};

export function StepReviewSimple({ formData, packageId }: StepReviewSimpleProps) {
  const { data: loyalty } = useLoyaltyTier();
  const { user } = useAuth();

  // BOOK-FIX5: Pre-booking document completeness check (NIK + paspor)
  const { data: customerDocs } = useQuery({
    queryKey: ["booking-doc-check", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("customers")
        .select("nik, passport_number, passport_expiry")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });
  const missingDocs: string[] = [];
  if (user) {
    if (!customerDocs?.nik) missingDocs.push("NIK / KTP");
    if (!customerDocs?.passport_number) missingDocs.push("Nomor Paspor");
    if (!customerDocs?.passport_expiry) missingDocs.push("Masa Berlaku Paspor");
  }
  // Fetch package details
  const { data: packageData, isLoading: packageLoading } = useQuery({
    queryKey: ['package-review', packageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select(`
          id, name, code, duration_days, currency,
          price_quad, price_triple, price_double, price_single,
          hotel_makkah:hotels!packages_hotel_makkah_id_fkey(name, city),
          hotel_madinah:hotels!packages_hotel_madinah_id_fkey(name, city),
          airline:airlines(name, code)
        `)
        .eq('id', packageId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch departure details
  const { data: departureData, isLoading: departureLoading } = useQuery({
    queryKey: ['departure-review', formData.departureId],
    enabled: !!formData.departureId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departures')
        .select(`
          id, departure_date, return_date, flight_number,
          departure_airport:airports!departures_departure_airport_id_fkey(name, code, city),
          arrival_airport:airports!departures_arrival_airport_id_fkey(name, code, city)
        `)
        .eq('id', formData.departureId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (packageLoading || departureLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const priceMap: Record<string, number> = {
    quad: packageData?.price_quad || 0,
    triple: packageData?.price_triple || 0,
    double: packageData?.price_double || 0,
    single: packageData?.price_single || 0,
  };

  const basePrice = priceMap[formData.roomType];
  const totalPax = formData.passengers.length;
  const subtotal = basePrice * totalPax;
  const tierDiscount = loyalty?.discountAmount(subtotal) ?? 0;
  const totalPrice = subtotal - tierDiscount;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Review Booking</h3>
        <p className="text-sm text-muted-foreground">
          Pastikan semua data sudah benar sebelum konfirmasi
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Package & Departure Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Plane className="h-4 w-4" />
              Paket & Keberangkatan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-semibold">{packageData?.name}</p>
              <p className="text-sm text-muted-foreground">{packageData?.duration_days} Hari</p>
            </div>
            <Separator />
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {departureData?.departure_date && format(new Date(departureData.departure_date), 'd MMMM yyyy', { locale: id })}
                </p>
                <p className="text-muted-foreground">
                  Pulang: {departureData?.return_date && format(new Date(departureData.return_date), 'd MMMM yyyy', { locale: id })}
                </p>
              </div>
            </div>
            {departureData?.flight_number && (
              <div className="text-sm">
                <Badge variant="outline">{departureData.flight_number}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Room & Passengers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Jamaah & Kamar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Hotel className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{ROOM_LABELS[formData.roomType]}</span>
            </div>
            <Separator />
            <div className="space-y-2">
              {formData.passengers.map((p, idx) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span>{p.fullName || `Jamaah ${idx + 1}`}</span>
                  <Badge variant="secondary" className="text-xs">
                    {p.gender === 'male' ? 'L' : 'P'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Price Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Ringkasan Harga
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Harga per jamaah ({ROOM_LABELS[formData.roomType]})</span>
              <span>{formatCurrency(basePrice, packageData?.currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Jumlah jamaah</span>
              <span>× {totalPax}</span>
            </div>
            {loyalty && tierDiscount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  Diskon Loyalitas {TIER_LABELS[loyalty.tier]} ({loyalty.discountPercent}%)
                </span>
                <span>− {formatCurrency(tierDiscount, packageData?.currency)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(totalPrice, packageData?.currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-success-muted dark:bg-success/10 border border-success/20">
        <CheckCircle className="h-5 w-5 text-success mt-0.5" />
        <div className="text-sm text-success">
          <p className="font-medium">Langkah Selanjutnya</p>
          <p>Setelah booking dikonfirmasi, Anda akan diarahkan untuk melakukan pembayaran. Data lengkap jamaah (NIK, paspor, dokumen) dapat dilengkapi setelah pembayaran terverifikasi.</p>
        </div>
      </div>

      {missingDocs.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium">Dokumen Belum Lengkap</p>
            <p>Anda masih perlu melengkapi: <strong>{missingDocs.join(", ")}</strong>. Booking tetap dapat dilanjutkan, namun harap dilengkapi segera setelah pembayaran agar proses visa & manifest tidak terlambat.</p>
          </div>
        </div>
      )}
    </div>
  );
}
