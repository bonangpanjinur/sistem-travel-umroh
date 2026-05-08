import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, getBookingStatusLabel, getPaymentStatusLabel } from "@/lib/format";
import { Link } from "react-router-dom";
import {
  Calendar, CreditCard, Star, PiggyBank, Headphones,
  ArrowRight, BookOpen, IdCard, MapPin, Clock, CheckCircle2,
  Plane, FileCheck, Stethoscope, ShieldCheck, Calculator, Scale
} from "lucide-react";
import { CountdownTimer } from "@/components/customer/CountdownTimer";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { differenceInDays, format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { Slider } from "@/components/ui/slider";

const DEFAULT_CHECKLIST = [
  { key: "passport", label: "Paspor (min. 6 bulan berlaku)", category: "document" },
  { key: "visa", label: "Visa Umrah/Haji", category: "document" },
  { key: "ktp", label: "KTP", category: "document" },
  { key: "photo", label: "Pas foto 4x6 (latar putih)", category: "document" },
  { key: "vaccine_meningitis", label: "Vaksin Meningitis", category: "health" },
  { key: "vaccine_covid", label: "Vaksin COVID-19", category: "health" },
  { key: "health_check", label: "Surat Keterangan Sehat", category: "health" },
  { key: "ihram", label: "Kain Ihram / Mukena", category: "equipment" },
  { key: "travel_bag", label: "Koper & Tas Cabin", category: "equipment" },
  { key: "dp_paid", label: "DP Lunas", category: "financial" },
  { key: "full_paid", label: "Pelunasan", category: "financial" },
];

const CATEGORY_ICONS: Record<string, any> = {
  document: FileCheck,
  health: Stethoscope,
  equipment: ShieldCheck,
  financial: CreditCard,
};

const CATEGORY_LABELS: Record<string, string> = {
  document: "Dokumen",
  health: "Kesehatan",
  equipment: "Perlengkapan",
  financial: "Keuangan",
};

export default function CustomerDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [simulatorTarget, setSimulatorTarget] = useState(25000000);
  const [simulatorTenor, setSimulatorTenor] = useState(12);

  const { data: customer } = useQuery({
    queryKey: ['my-customer-profile'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user!.id)
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
  const departureDate = activeBooking ? (activeBooking.departure as any)?.departure_date : null;
  const daysUntilDeparture = departureDate ? differenceInDays(new Date(departureDate), new Date()) : null;

  // Checklist for active booking
  const { data: checklist } = useQuery({
    queryKey: ['my-checklist', activeBooking?.id, customer?.id],
    queryFn: async () => {
      if (!customer?.id || !activeBooking?.id) return [];
      const { data } = await supabase
        .from('preparation_checklists')
        .select('*')
        .eq('customer_id', customer.id)
        .eq('booking_id', activeBooking.id);
      return data || [];
    },
    enabled: !!customer?.id && !!activeBooking?.id,
  });

  // Initialize checklist if empty
  const initChecklist = useMutation({
    mutationFn: async () => {
      if (!customer?.id || !activeBooking?.id) return;
      const items = DEFAULT_CHECKLIST.map(item => ({
        customer_id: customer.id,
        booking_id: activeBooking.id,
        item_key: item.key,
        item_label: item.label,
        category: item.category,
      }));
      const { error } = await supabase.from('preparation_checklists').insert(items);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-checklist'] }),
  });

  const toggleChecklist = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from('preparation_checklists').update({
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-checklist'] }),
  });

  const { data: visaStatus } = useQuery({
    queryKey: ['my-visa-status', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return null;
      const { data } = await supabase
        .from('visa_applications')
        .select('status, visa_number, visa_expiry')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!customer?.id,
  });

  const { data: manasikSchedules } = useQuery({
    queryKey: ['my-manasik'],
    queryFn: async () => {
      if (!customer?.id || !activeBooking) return [];
      const depId = (activeBooking.departure as any)?.departure_date ? undefined : null;
      // Get manasik for the departure
      const { data } = await supabase
        .from('manasik_schedules')
        .select('id, title, schedule_date, start_time, location')
        .gte('schedule_date', new Date().toISOString().split('T')[0])
        .order('schedule_date')
        .limit(3);
      return data || [];
    },
    enabled: !!customer?.id && !!activeBooking,
  });

  const completedItems = checklist?.filter((c: any) => c.is_completed).length || 0;
  const totalItems = checklist?.length || 0;
  const checklistProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Group checklist by category
  const checklistByCategory = checklist?.reduce((acc: any, item: any) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, any[]>) || {};

  return (
    <PublicLayout>
      <div className="container max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Assalamu'alaikum, {customer?.full_name || 'Jamaah'} 👋</h1>
        <p className="text-muted-foreground">Selamat datang di portal jamaah Anda</p>
      </div>

      {/* Countdown Banner — Enhanced */}
      {activeBooking && departureDate && (
        <div className="space-y-3">
          <CountdownTimer
            departureDate={departureDate}
            packageName={(activeBooking.departure as any)?.package?.name}
          />
          <div className="flex flex-wrap gap-2 px-1">
            <Badge>{getBookingStatusLabel(activeBooking.booking_status || '')}</Badge>
            <Badge variant="outline">{getPaymentStatusLabel(activeBooking.payment_status || '')}</Badge>
            {departureDate && (
              <Badge variant="outline">
                {format(new Date(departureDate), "EEEE, dd MMMM yyyy", { locale: idLocale })}
              </Badge>
            )}
            {visaStatus && (
              <Badge variant={visaStatus.status === 'approved' ? 'secondary' : 'outline'}>
                Visa: {visaStatus.status === 'approved' ? 'Disetujui ✓' : visaStatus.status === 'processing' ? 'Diproses' : 'Menunggu'}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Button variant="outline" className="h-auto flex-col items-center gap-2 py-4" asChild>
          <Link to="/my-bookings"><Calendar className="h-5 w-5 text-primary" /><span className="text-xs font-semibold">Booking Saya</span></Link>
        </Button>
        <Button variant="outline" className="h-auto flex-col items-center gap-2 py-4" asChild>
          <Link to="/jamaah"><IdCard className="h-5 w-5 text-primary" /><span className="text-xs font-semibold">Portal Jamaah</span></Link>
        </Button>
        <Button variant="outline" className="h-auto flex-col items-center gap-2 py-4" asChild>
          <Link to="/customer/my-savings"><PiggyBank className="h-5 w-5 text-primary" /><span className="text-xs font-semibold">Tabungan</span></Link>
        </Button>
        <Button variant="outline" className="h-auto flex-col items-center gap-2 py-4" asChild>
          <Link to="/kalkulator-cicilan"><Calculator className="h-5 w-5 text-green-600" /><span className="text-xs font-semibold">Kalkulator</span></Link>
        </Button>
        <Button variant="outline" className="h-auto flex-col items-center gap-2 py-4" asChild>
          <Link to="/packages/compare"><Scale className="h-5 w-5 text-blue-600" /><span className="text-xs font-semibold">Bandingkan</span></Link>
        </Button>
        <Button variant="outline" className="h-auto flex-col items-center gap-2 py-4" asChild>
          <Link to="/customer/support"><Headphones className="h-5 w-5 text-primary" /><span className="text-xs font-semibold">Bantuan</span></Link>
        </Button>
      </div>

      <Tabs defaultValue="bookings" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="bookings" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Jadwal Keberangkatan Saya
          </TabsTrigger>
          <TabsTrigger value="savings" className="flex items-center gap-2">
            <PiggyBank className="h-4 w-4" /> Progres Tabungan Saya
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Preparation Checklist */}
              {activeBooking && (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" /> Checklist Persiapan
                      </CardTitle>
                      <span className="text-sm font-medium text-muted-foreground">{completedItems}/{totalItems}</span>
                    </div>
                    {totalItems > 0 && <Progress value={checklistProgress} className="mt-2" />}
                  </CardHeader>
                  <CardContent>
                    {totalItems === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground mb-3">Belum ada checklist persiapan</p>
                        <Button size="sm" onClick={() => initChecklist.mutate()} disabled={initChecklist.isPending}>
                          Buat Checklist
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(checklistByCategory).map(([category, items]: [string, any]) => {
                          const Icon = CATEGORY_ICONS[category] || CheckCircle2;
                          return (
                            <div key={category}>
                              <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1 mb-2">
                                <Icon className="h-3 w-3" /> {CATEGORY_LABELS[category] || category}
                              </p>
                              <div className="space-y-1">
                                {items.map((item: any) => (
                                  <label key={item.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer">
                                    <Checkbox
                                      checked={item.is_completed}
                                      onCheckedChange={(checked) => toggleChecklist.mutate({ id: item.id, completed: !!checked })}
                                    />
                                    <span className={`text-sm ${item.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                                      {item.item_label}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Upcoming Manasik */}
              {manasikSchedules && manasikSchedules.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" /> Jadwal Manasik
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {manasikSchedules.map((m: any) => (
                      <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center text-primary">
                          <span className="text-xs font-bold">{format(new Date(m.schedule_date), "dd")}</span>
                          <span className="text-[10px]">{format(new Date(m.schedule_date), "MMM")}</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{m.title}</p>
                          <p className="text-xs text-muted-foreground">{m.start_time || ""} {m.location ? `• ${m.location}` : ""}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Recent Bookings */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Booking Terbaru</CardTitle>
                  <Button variant="ghost" size="sm" asChild><Link to="/my-bookings">Lihat Semua</Link></Button>
                </CardHeader>
                <CardContent>
                  {loadingBookings ? (
                    <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
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
                      <Button variant="link" asChild className="mt-2"><Link to="/packages">Lihat Paket Tersedia</Link></Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bookings.map(b => (
                        <Link key={b.id} to={`/my-bookings/${b.id}`} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                          <div>
                            <p className="font-mono text-sm font-semibold">{b.booking_code}</p>
                            <p className="text-sm text-muted-foreground">{(b.departure as any)?.package?.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(b.total_price)}</p>
                            <Badge variant="outline" className="text-xs">{getPaymentStatusLabel(b.payment_status || 'pending')}</Badge>
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
                  <CardTitle className="text-base flex items-center gap-2"><Star className="h-4 w-4 text-primary" /> Loyalty Points</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{loyalty?.current_points || 0}</p>
                  <p className="text-sm text-muted-foreground capitalize">Tier: {loyalty?.tier_level || 'Silver'}</p>
                  <Button variant="link" size="sm" className="px-0 mt-2" asChild><Link to="/customer/my-loyalty">Lihat Detail →</Link></Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="savings" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <PiggyBank className="h-4 w-4 text-primary" /> Progres Tabungan Saya
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {savings && savings.length > 0 ? (
                    <div className="space-y-6">
                      {savings.map((s: any) => {
                        const progress = (s.paid_amount / s.target_amount) * 100;
                        return (
                          <div key={s.id} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <p className="font-medium">{s.package?.name}</p>
                              <p className="text-sm font-bold text-primary">{progress.toFixed(1)}%</p>
                            </div>
                            <Progress value={progress} className="h-3" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Terkumpul: {formatCurrency(s.paid_amount || 0)}</span>
                              <span>Target: {formatCurrency(s.target_amount || 0)}</span>
                            </div>
                          </div>
                        );
                      })}
                      <Button className="w-full" asChild>
                        <Link to="/customer/my-savings">Kelola Tabungan Lengkap</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <PiggyBank className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Belum ada tabungan aktif</p>
                      <Button variant="link" asChild className="mt-2">
                        <Link to="/savings">Mulai Menabung Sekarang</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-primary" /> Simulasi Tabungan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Target Tabungan</label>
                    <p className="text-lg font-bold text-primary">{formatCurrency(simulatorTarget)}</p>
                    <Slider
                      value={[simulatorTarget]}
                      onValueChange={(v) => setSimulatorTarget(v[0])}
                      min={5000000}
                      max={100000000}
                      step={1000000}
                      className="py-2"
                    />
                    <p className="text-xs text-muted-foreground">Rp 5 juta - Rp 100 juta</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tenor Cicilan</label>
                    <p className="text-lg font-bold text-primary">{simulatorTenor} Bulan</p>
                    <Slider
                      value={[simulatorTenor]}
                      onValueChange={(v) => setSimulatorTenor(v[0])}
                      min={6}
                      max={36}
                      step={6}
                      className="py-2"
                    />
                    <p className="text-xs text-muted-foreground">6 - 36 bulan</p>
                  </div>

                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="text-xs text-muted-foreground mb-1">Cicilan per Bulan</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(Math.ceil(simulatorTarget / simulatorTenor))}</p>
                    <p className="text-xs text-muted-foreground mt-2">Selesai dalam {simulatorTenor} bulan</p>
                  </div>

                  <Button className="w-full" asChild>
                    <Link to="/savings">Mulai Tabungan</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

          {/* Jamaah Portal Link */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Portal Jamaah</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link to="/jamaah/digital-id"><IdCard className="h-4 w-4 mr-2" />Digital ID</Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link to="/jamaah/itinerary"><MapPin className="h-4 w-4 mr-2" />Itinerary</Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link to="/jamaah/doa-panduan"><BookOpen className="h-4 w-4 mr-2" />Doa & Panduan</Link>
              </Button>
            </CardContent>
          </Card>
      </div>
    </PublicLayout>
  );
}
