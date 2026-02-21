import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { CheckCircle, Copy, CreditCard, Home, Calendar, Users } from "lucide-react";
import { toast } from "sonner";

export default function BookingSuccess() {
  const { bookingId } = useParams();

  // Fetch bank accounts dynamically
  const { data: bankAccount } = useQuery({
    queryKey: ['primary-bank-account'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking-success', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          departure:departures(
            departure_date,
            return_date,
            package:packages(name)
          ),
          booking_passengers(
            id,
            room_preference
          )
        `)
        .eq('id', bookingId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!bookingId,
  });

  const copyBookingCode = () => {
    if (booking?.booking_code) {
      navigator.clipboard.writeText(booking.booking_code);
      toast.success('Kode booking disalin!');
    }
  };

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container py-12 max-w-2xl">
          <Skeleton className="h-64 w-full" />
        </div>
      </PublicLayout>
    );
  }

  if (!booking) {
    return (
      <PublicLayout>
        <div className="container py-12 max-w-2xl text-center">
          <h1 className="text-2xl font-bold">Booking tidak ditemukan</h1>
          <Button asChild className="mt-4">
            <Link to="/">Kembali ke Beranda</Link>
          </Button>
        </div>
      </PublicLayout>
    );
  }

  const departure = booking.departure as any;

  return (
    <PublicLayout>
      <div className="container py-12 max-w-2xl">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-green-600">Booking Berhasil!</h1>
          <p className="text-muted-foreground mt-2">
            Terima kasih, booking Anda telah kami terima
          </p>
        </div>

        {/* Booking Code */}
        <Card className="mb-6 bg-primary/5 border-primary/20">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">Kode Booking</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl font-bold tracking-wider">{booking.booking_code}</span>
              <Button variant="ghost" size="icon" onClick={copyBookingCode}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Simpan kode ini untuk melakukan pembayaran
            </p>
          </CardContent>
        </Card>

        {/* Booking Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Detail Booking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{departure?.package?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(departure?.departure_date), "d MMMM yyyy", { locale: id })} - 
                  {format(new Date(departure?.return_date), " d MMMM yyyy", { locale: id })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{booking.total_pax} Jamaah</p>
                <p className="text-sm text-muted-foreground">
                  {(() => {
                    const passengers = (booking as any).booking_passengers || [];
                    const roomCounts: Record<string, number> = {};
                    passengers.forEach((p: any) => {
                      const rt = p.room_preference || booking.room_type;
                      roomCounts[rt] = (roomCounts[rt] || 0) + 1;
                    });
                    const parts = Object.entries(roomCounts).map(
                      ([type, count]) => `${count} ${type.charAt(0).toUpperCase() + type.slice(1)}`
                    );
                    return parts.length > 0 ? parts.join(', ') : `Kamar ${booking.room_type.charAt(0).toUpperCase() + booking.room_type.slice(1)}`;
                  })()}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Total Pembayaran</p>
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(booking.total_price)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Info */}
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-amber-800">Instruksi Pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-amber-800">
            <p className="mb-3">
              Silakan lakukan pembayaran ke rekening berikut:
            </p>
            {bankAccount ? (
              <div className="bg-white rounded-lg p-4 mb-3">
                <p className="font-medium">{bankAccount.bank_name}</p>
                <p className="text-lg font-bold">{bankAccount.account_number}</p>
                <p>a.n. {bankAccount.account_name}</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg p-4 mb-3">
                <p className="text-sm">Hubungi admin untuk info rekening pembayaran</p>
              </div>
            )}
            <p>
              Setelah transfer, upload bukti pembayaran melalui halaman "Booking Saya" 
              atau hubungi customer service kami.
            </p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild className="flex-1">
            <Link to="/my-bookings">
              Lihat Booking Saya
            </Link>
          </Button>
          <Button variant="outline" asChild className="flex-1">
            <Link to="/">
              <Home className="h-4 w-4 mr-2" />
              Kembali ke Beranda
            </Link>
          </Button>
        </div>
      </div>
    </PublicLayout>
  );
}
