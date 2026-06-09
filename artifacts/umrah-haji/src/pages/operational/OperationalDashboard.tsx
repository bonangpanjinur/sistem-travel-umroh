import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  Plane, Users, Luggage, CheckCircle, BedDouble, Package,
  FileText, DollarSign, ArrowRight, AlertCircle, TrendingUp,
  Calendar, Clock, ListChecks, Flag, QrCode, WifiOff
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatCurrency } from "@/lib/format";

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
      const today = new Date().toISOString().split('T')[0];
      const [
        { count: todayCheckins },
        { count: luggageCount },
        { count: manifestCount },
        { count: roomCount },
        { count: equipmentDistCount },
        { count: totalBookings },
        { count: paidBookings },
      ] = await Promise.all([
        supabase.from('attendance').select('*', { count: 'exact', head: true })
          .gte('checked_in_at', `${today}T00:00:00`).lte('checked_in_at', `${today}T23:59:59`),
        supabase.from('luggage').select('*', { count: 'exact', head: true }),
        supabase.from('manifests').select('*', { count: 'exact', head: true }),
        supabase.from('room_assignments').select('*', { count: 'exact', head: true }),
        supabase.from('equipment_distributions').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).neq('booking_status', 'cancelled'),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('payment_status', 'paid'),
      ]);

      return {
        todayCheckins:      todayCheckins      || 0,
        luggageCount:       luggageCount       || 0,
        manifestCount:      manifestCount      || 0,
        roomCount:          roomCount          || 0,
        equipmentDistCount: equipmentDistCount || 0,
        totalBookings:      totalBookings      || 0,
        paidBookings:       paidBookings       || 0,
      };
    },
  });

  const paymentPct = stats ? Math.round((stats.paidBookings / Math.max(stats.totalBookings, 1)) * 100) : 0;

  const moduleCards = [
    {
      title: "Kamar / Rooming",
      desc: "Penugasan & auto-assign kamar jamaah",
      icon: BedDouble,
      href: "/operational/rooming",
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      stat: `${stats?.roomCount || 0} kamar`,
      statLabel: "terdaftar",
    },
    {
      title: "Perlengkapan",
      desc: "Distribusi perlengkapan jamaah",
      icon: Package,
      href: "/operational/equipment",
      color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
      stat: `${stats?.equipmentDistCount || 0} distribusi`,
      statLabel: "tercatat",
    },
    {
      title: "Manifest",
      desc: "Daftar penumpang + export Excel/PDF",
      icon: Users,
      href: "/operational/manifest",
      color: "bg-green-500/10 text-green-600 dark:text-green-400",
      stat: `${stats?.manifestCount || 0} jamaah`,
      statLabel: "terdaftar",
    },
    {
      title: "Luggage Tracking",
      desc: "Pelacakan & status koper jamaah",
      icon: Luggage,
      href: "/operational/luggage",
      color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      stat: `${stats?.luggageCount || 0} bagasi`,
      statLabel: "teregistrasi",
    },
    {
      title: "Check-in & QR",
      desc: "Scan QR kamera di setiap checkpoint",
      icon: QrCode,
      href: "/operational/checkin",
      color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
      stat: `${stats?.todayCheckins || 0} hari ini`,
      statLabel: "check-in",
    },
    {
      title: "Generate Dokumen",
      desc: "Surat, invoice & e-ticket jamaah",
      icon: FileText,
      href: "/operational/documents",
      color: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
      stat: "Surat Cuti",
      statLabel: "Invoice, E-Ticket",
    },
    {
      title: "Checklist Kesiapan",
      desc: "Pantau status siap per jamaah",
      icon: ListChecks,
      href: "/operational/readiness",
      color: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
      stat: "Bayar · Kamar",
      statLabel: "Dokumen · Perlengkapan",
    },
    {
      title: "Timeline Perjalanan",
      desc: "Progress harian selama perjalanan",
      icon: Flag,
      href: "/operational/timeline",
      color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
      stat: "Day-by-day",
      statLabel: "tracking",
    },
    {
      title: "Keuangan",
      desc: "Status pembayaran per jamaah",
      icon: DollarSign,
      href: "/finance",
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      stat: `${paymentPct}% lunas`,
      statLabel: `${stats?.paidBookings || 0} dari ${stats?.totalBookings || 0}`,
    },
    {
      title: "Scanner Offline",
      desc: "QR check-in tanpa internet (IndexedDB)",
      icon: WifiOff,
      href: "/operational/offline-checkin",
      color: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
      stat: "Offline-first",
      statLabel: "IndexedDB + sync",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Operasional</h1>
        <p className="text-muted-foreground">Pantau keberangkatan, kamar, perlengkapan, dokumen, dan keuangan jamaah</p>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {[
          { label: "Check-in Hari Ini", value: stats?.todayCheckins || 0, icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-500/10" },
          { label: "Total Manifest",    value: stats?.manifestCount  || 0, icon: Users,       color: "text-blue-600",  bgColor: "bg-blue-500/10"  },
          { label: "Bagasi Teregistrasi", value: stats?.luggageCount || 0, icon: Luggage,    color: "text-amber-600", bgColor: "bg-amber-500/10" },
          { label: "Kamar Terdaftar",   value: stats?.roomCount      || 0, icon: BedDouble,   color: "text-purple-600",bgColor: "bg-purple-500/10"},
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground leading-none mb-1">{item.label}</p>
                  <p className="text-2xl font-bold">{item.value}</p>
                </div>
                <div className={`p-2.5 rounded-full ${item.bgColor}`}>
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Progress Pembayaran Jamaah</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-green-600 font-semibold">{stats?.paidBookings || 0} lunas</span>
              <span className="text-muted-foreground">dari {stats?.totalBookings || 0} booking</span>
              <Badge variant={paymentPct === 100 ? "default" : paymentPct > 60 ? "secondary" : "destructive"} className="text-xs">
                {paymentPct}%
              </Badge>
            </div>
          </div>
          <Progress value={paymentPct} className="h-2" />
          <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
            <span>✅ Lunas: {stats?.paidBookings || 0}</span>
            <span>⏳ Belum lunas: {(stats?.totalBookings || 0) - (stats?.paidBookings || 0)}</span>
            <Link to="/finance" className="ml-auto text-primary hover:underline font-medium flex items-center gap-1">
              Lihat Keuangan <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Modul Operasional
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {moduleCards.map(mod => (
            <Link key={mod.title} to={mod.href}>
              <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className={`w-9 h-9 rounded-lg ${mod.color} flex items-center justify-center mb-3`}>
                    <mod.icon className="h-5 w-5" />
                  </div>
                  <p className="font-semibold text-sm leading-tight">{mod.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-2">{mod.desc}</p>
                  <div className="border-t pt-2 mt-auto">
                    <span className="text-sm font-bold">{mod.stat}</span>
                    <span className="text-xs text-muted-foreground ml-1">{mod.statLabel}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plane className="h-4 w-4" />
              Keberangkatan Mendatang
            </CardTitle>
            <Link to="/operational/manifest">
              <Button variant="ghost" size="sm" className="text-xs h-7">
                Lihat Semua <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : !upcomingDepartures?.length ? (
            <div className="text-center py-10 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Tidak ada keberangkatan mendatang</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingDepartures?.map((dep) => {
                const daysLeft = Math.ceil(
                  (new Date(dep.departure_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                const fillPct = Math.round(((dep.booked_count || 0) / Math.max(dep.quota, 1)) * 100);
                return (
                  <div key={dep.id} className="p-4 bg-muted/40 hover:bg-muted/60 rounded-xl transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{(dep.package as any)?.name}</p>
                          <Badge variant={dep.status === 'open' ? 'default' : 'secondary'} className="text-[10px] h-4 px-1.5">
                            {dep.status}
                          </Badge>
                          {daysLeft <= 7 && daysLeft > 0 && (
                            <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                              <AlertCircle className="h-2.5 w-2.5 mr-0.5" />{daysLeft} hari lagi
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(dep.departure_date), "EEE, dd MMM yyyy", { locale: id })}
                          {dep.flight_number && ` · ${dep.flight_number}`}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <Progress value={fillPct} className="h-1 flex-1" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {dep.booked_count}/{dep.quota} pax
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {daysLeft > 0 ? `${daysLeft}h lagi` : daysLeft === 0 ? 'Hari ini' : 'Sudah berangkat'}
                        </div>
                        <div className="flex gap-1 flex-wrap justify-end">
                          <Link to={`/operational/readiness?departure=${dep.id}`}>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 gap-1">
                              <ListChecks className="h-3 w-3" />Siapkan
                            </Button>
                          </Link>
                          <Link to={`/operational/rooming?departure=${dep.id}`}>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 gap-1">
                              <BedDouble className="h-3 w-3" />Kamar
                            </Button>
                          </Link>
                          <Link to={`/operational/manifest?departure=${dep.id}`}>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 gap-1">
                              <Users className="h-3 w-3" />Manifest
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
