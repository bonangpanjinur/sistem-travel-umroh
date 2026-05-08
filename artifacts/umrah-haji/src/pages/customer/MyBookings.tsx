import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { 
  Calendar, CreditCard, Users, Eye, Upload, 
  Clock, CheckCircle, XCircle, AlertCircle, Loader2, Filter
} from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_CONFIG = {
  pending: { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  confirmed: { label: 'Dikonfirmasi', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  processing: { label: 'Diproses', color: 'bg-purple-100 text-purple-800', icon: Loader2 },
  completed: { label: 'Selesai', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-800', icon: XCircle },
  refunded: { label: 'Refund', color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
};

const PAYMENT_STATUS_CONFIG = {
  pending: { label: 'Belum Bayar', color: 'bg-red-100 text-red-800' },
  partial: { label: 'Sebagian', color: 'bg-yellow-100 text-yellow-800' },
  paid: { label: 'Lunas', color: 'bg-green-100 text-green-800' },
  refunded: { label: 'Refund', color: 'bg-gray-100 text-gray-800' },
  failed: { label: 'Gagal', color: 'bg-red-100 text-red-800' },
};

export default function MyBookings() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterPayment, setFilterPayment] = useState<string>("all");

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['my-bookings', user?.id],
    queryFn: async () => {
      // First get customer id
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user!.id)
        .single();

      if (!customer) return [];

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          departure:departures(
            departure_date,
            return_date,
            package:packages(name, duration_days, featured_image)
          )
        `)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (authLoading) {
    return (
      <PublicLayout>
        <div className="container py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PublicLayout>
    );
  }

  if (!user) {
    return (
      <PublicLayout>
        <div className="container py-12 max-w-lg mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Login Diperlukan</h1>
          <p className="text-muted-foreground mb-6">
            Silakan login untuk melihat booking Anda.
          </p>
          <Button onClick={() => navigate('/auth/login?redirect=/my-bookings')}>
            Login Sekarang
          </Button>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl font-bold">Booking Saya</h1>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-28 h-8 text-sm">
                <SelectValue placeholder="Tahun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tahun</SelectItem>
                {Array.from(new Set(bookings?.map(b => b.created_at ? new Date(b.created_at).getFullYear().toString() : null).filter((y): y is string => y !== null) ?? [])).sort((a, b) => Number(b) - Number(a)).map(y => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPayment} onValueChange={setFilterPayment}>
              <SelectTrigger className="w-36 h-8 text-sm">
                <SelectValue placeholder="Status Bayar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Belum Bayar</SelectItem>
                <SelectItem value="partial">Sebagian</SelectItem>
                <SelectItem value="paid">Lunas</SelectItem>
                <SelectItem value="refunded">Refund</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : !bookings || bookings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">Anda belum memiliki booking.</p>
              <Button asChild>
                <Link to="/packages">Lihat Paket</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {(() => {
              const filtered = (bookings ?? []).filter((b: any) => {
                const yearMatch = filterYear === "all" || new Date(b.created_at).getFullYear().toString() === filterYear;
                const paymentMatch = filterPayment === "all" || b.payment_status === filterPayment;
                return yearMatch && paymentMatch;
              });
              if (filtered.length === 0) return [(
                <Card key="empty"><CardContent className="py-10 text-center text-muted-foreground">Tidak ada booking yang sesuai filter.</CardContent></Card>
              )];
              return filtered;
            })().map((booking: any) => {
              const departure = booking.departure as any;
              const pkg = departure?.package;
              const statusConfig = STATUS_CONFIG[booking.booking_status as keyof typeof STATUS_CONFIG];
              const paymentConfig = PAYMENT_STATUS_CONFIG[booking.payment_status as keyof typeof PAYMENT_STATUS_CONFIG];
              const StatusIcon = statusConfig?.icon || Clock;

              return (
                <Card key={booking.id} className="overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    {/* Image */}
                    <div className="md:w-48 h-32 md:h-auto">
                      <img
                        src={pkg?.featured_image || '/placeholder.svg'}
                        alt={pkg?.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Kode Booking: <span className="font-mono font-semibold">{booking.booking_code}</span>
                          </p>
                          <h3 className="font-semibold text-lg">{pkg?.name}</h3>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={statusConfig?.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig?.label}
                          </Badge>
                          <Badge className={paymentConfig?.color}>
                            {paymentConfig?.label}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {departure?.departure_date && 
                              format(new Date(departure.departure_date), "d MMM yyyy", { locale: id })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{booking.total_pax} Jamaah</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span>{formatCurrency(booking.total_price)}</span>
                        </div>
                        <div className="text-muted-foreground">
                          Sisa: {formatCurrency(booking.remaining_amount ?? 0)}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/my-bookings/${booking.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            Detail
                          </Link>
                        </Button>
                        {booking.payment_status !== 'paid' && (
                          <Button size="sm" asChild>
                            <Link to={`/my-bookings/${booking.id}/payment`}>
                              <Upload className="h-4 w-4 mr-1" />
                              Upload Bukti Bayar
                            </Link>
                          </Button>
                        )}
                        {booking.booking_status === 'completed' && (
                          <Button size="sm" variant="secondary" asChild>
                            <Link to={`/jamaah/feedback/${booking.id}`}>
                              Rating &amp; Feedback
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
