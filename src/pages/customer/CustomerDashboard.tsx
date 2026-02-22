import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, getBookingStatusLabel, getPaymentStatusLabel } from "@/lib/format";
import { Link } from "react-router-dom";
import {
  Calendar, CreditCard, Star, PiggyBank, Headphones,
  ArrowRight, BookOpen, IdCard, MapPin
} from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";

export default function CustomerDashboard() {
  const { user } = useAuth();

  const { data: customer } = useQuery({
    queryKey: ['my-customer-profile'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: bookings, isLoading: loadingBookings } = useQuery({
    queryKey: ['my-dashboard-bookings'],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, booking_code, booking_status, payment_status,
          total_price, paid_amount, remaining_amount,
          departure:departures(departure_date, return_date, package:packages(name))
        `)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id,
  });

  const { data: loyalty } = useQuery({
    queryKey: ['my-loyalty-summary'],
    queryFn: async () => {
      if (!customer?.id) return null;
      const { data, error } = await supabase
        .from('loyalty_points')
        .select('current_points, tier_level, total_earned')
        .eq('customer_id', customer.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id,
  });

  const { data: savings } = useQuery({
    queryKey: ['my-savings-summary'],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await supabase
        .from('savings_plans')
        .select('id, status, paid_amount, target_amount, package:packages(name)')
        .eq('customer_id', customer.id)
        .eq('status', 'active')
        .limit(3);
      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id,
  });

  const activeBooking = bookings?.find(b => b.booking_status === 'confirmed' || b.booking_status === 'processing');

  return (
    <PublicLayout>
      <div className="container max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Assalamu'alaikum, {customer?.full_name || 'Jamaah'} 👋</h1>
        <p className="text-muted-foreground">Selamat datang di portal jamaah Anda</p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Button variant="outline" className="h-auto flex-col items-center gap-2 py-4" asChild>
          <Link to="/my-bookings">
            <Calendar className="h-5 w-5 text-primary" />
            <span className="text-xs font-semibold">Booking Saya</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto flex-col items-center gap-2 py-4" asChild>
          <Link to="/jamaah">
            <IdCard className="h-5 w-5 text-emerald-600" />
            <span className="text-xs font-semibold">Portal Jamaah</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto flex-col items-center gap-2 py-4" asChild>
          <Link to="/customer/my-savings">
            <PiggyBank className="h-5 w-5 text-amber-600" />
            <span className="text-xs font-semibold">Tabungan</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto flex-col items-center gap-2 py-4" asChild>
          <Link to="/customer/support">
            <Headphones className="h-5 w-5 text-blue-600" />
            <span className="text-xs font-semibold">Bantuan</span>
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Active Booking */}
        <div className="lg:col-span-2 space-y-6">
          {activeBooking && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Perjalanan Aktif
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-lg">{(activeBooking.departure as any)?.package?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate((activeBooking.departure as any)?.departure_date || '')}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Badge>{getBookingStatusLabel(activeBooking.booking_status || '')}</Badge>
                      <Badge variant="outline">{getPaymentStatusLabel(activeBooking.payment_status || '')}</Badge>
                    </div>
                  </div>
                  <Button asChild>
                    <Link to={`/my-bookings/${activeBooking.id}`}>
                      Detail <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Bookings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Booking Terbaru</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/my-bookings">Lihat Semua</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loadingBookings ? (
                <div className="space-y-3">
                  {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : !customer ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">Profil jamaah belum terdaftar</p>
                  <p className="text-sm mt-1">Hubungi admin untuk mendaftarkan data jamaah Anda</p>
                </div>
              ) : !bookings || bookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Belum ada booking</p>
                  <Button variant="link" asChild className="mt-2">
                    <Link to="/packages">Lihat Paket Tersedia</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.map(b => (
                    <Link
                      key={b.id}
                      to={`/my-bookings/${b.id}`}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div>
                        <p className="font-mono text-sm font-semibold">{b.booking_code}</p>
                        <p className="text-sm text-muted-foreground">
                          {(b.departure as any)?.package?.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(b.total_price)}</p>
                        <Badge variant="outline" className="text-xs">
                          {getPaymentStatusLabel(b.payment_status || 'pending')}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Loyalty */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                Loyalty Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{loyalty?.current_points || 0}</p>
              <p className="text-sm text-muted-foreground capitalize">
                Tier: {loyalty?.tier_level || 'Silver'}
              </p>
              <Button variant="link" size="sm" className="px-0 mt-2" asChild>
                <Link to="/customer/my-loyalty">Lihat Detail →</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Active Savings */}
          {savings && savings.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <PiggyBank className="h-4 w-4 text-emerald-500" />
                  Tabungan Aktif
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {savings.map((s: any) => (
                  <div key={s.id} className="p-2 bg-muted/50 rounded">
                    <p className="text-sm font-medium">{s.package?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(s.paid_amount || 0)} / {formatCurrency(s.target_amount || 0)}
                    </p>
                  </div>
                ))}
                <Button variant="link" size="sm" className="px-0" asChild>
                  <Link to="/customer/my-savings">Kelola Tabungan →</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Jamaah Portal Link */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Portal Jamaah</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link to="/jamaah/digital-id">
                  <IdCard className="h-4 w-4 mr-2" />
                  Digital ID
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link to="/jamaah/itinerary">
                  <MapPin className="h-4 w-4 mr-2" />
                  Itinerary
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link to="/jamaah/doa-panduan">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Doa & Panduan
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </PublicLayout>
  );
}
