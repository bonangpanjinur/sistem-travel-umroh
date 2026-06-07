import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { formatCurrency, formatPackageType, formatDate } from "@/lib/format";
import {
  ArrowLeft, Link2, Edit, Calendar, Users, Plane, ChevronDown, Eye,
  AlertCircle, CheckCircle2, Clock, TrendingUp, ExternalLink, DollarSign,
  Search, BarChart3, ShoppingCart, Target, ArrowUpRight, PlusCircle,
  Star, Image, Unlink, LayoutList, Wallet, Globe, AreaChart,
} from "lucide-react";
import { useState, useMemo } from "react";
import { slugify } from "@/lib/slug";
import { LinkDepartureForm } from "@/components/admin/forms/LinkDepartureForm";
import { PackageForm } from "@/components/admin/forms/PackageForm";
import { MilestoneTrackerCard } from "@/components/admin/MilestoneTrackerCard";
import { BreakEvenIndicatorCard } from "@/components/admin/BreakEvenIndicatorCard";
import { EquipmentReadinessCard } from "@/components/admin/EquipmentReadinessCard";
import { PackageCancellationPolicyCard } from "@/components/admin/PackageCancellationPolicyCard";
import { PackageGalleryCard } from "@/components/admin/PackageGalleryCard";
import { PackagePriceTrendCard } from "@/components/admin/PackagePriceTrendCard";
import { PackagePriceAuditCard } from "@/components/admin/PackagePriceAuditCard";
import { DeparturePriceComparisonCard } from "@/components/admin/DeparturePriceComparisonCard";
import { PackageFinancialSection } from "@/components/admin/financial/PackageFinancialSection";
import { toast } from "sonner";

const MONTHS = [
  { value: "01", label: "Januari" }, { value: "02", label: "Februari" },
  { value: "03", label: "Maret" },   { value: "04", label: "April" },
  { value: "05", label: "Mei" },     { value: "06", label: "Juni" },
  { value: "07", label: "Juli" },    { value: "08", label: "Agustus" },
  { value: "09", label: "September" },{ value: "10", label: "Oktober" },
  { value: "11", label: "November" }, { value: "12", label: "Desember" },
];

export default function AdminPackageDetail() {
  const { id } = useParams<{ id: string }>() as { id: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isPackageFormOpen, setIsPackageFormOpen] = useState(false);
  const [isLinkDepartureOpen, setIsLinkDepartureOpen] = useState(false);
  const [unlinkDeparture, setUnlinkDeparture] = useState<any>(null);
  const [expandedDepartures, setExpandedDepartures] = useState<Set<string>>(new Set());

  const { data: packageData, isLoading } = useQuery({
    queryKey: ['admin-package', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select(`
          *,
          airline:airlines(id, name, code),
          hotel_makkah:hotels!packages_hotel_makkah_id_fkey(id, name, star_rating),
          hotel_madinah:hotels!packages_hotel_madinah_id_fkey(id, name, star_rating),
          muthawif:muthawifs(id, name),
          package_type_ref:package_types(name)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: departures, isLoading: departuresLoading } = useQuery({
    queryKey: ['admin-departures', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departures')
        .select(`
          *,
          departure_airport:airports!departures_departure_airport_id_fkey(code, city),
          arrival_airport:airports!departures_arrival_airport_id_fkey(code, city),
          airline:airlines(id, name, code),
          hotel_makkah:hotels!departures_hotel_makkah_id_fkey(id, name, star_rating),
          hotel_madinah:hotels!departures_hotel_madinah_id_fkey(id, name, star_rating),
          bookings(
            id, booking_code, booking_status, payment_status,
            total_pax, total_price, paid_amount,
            customer:customers(id, full_name, phone, email, nik)
          )
        `)
        .eq('package_id', id)
        .order('departure_date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const unlinkDepartureMutation = useMutation({
    mutationFn: async (departureId: string) => {
      const { error } = await supabase
        .from('departures')
        .update({ package_id: null })
        .eq('id', departureId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Keberangkatan berhasil dilepas dari paket");
      queryClient.invalidateQueries({ queryKey: ['admin-departures', id] });
      setUnlinkDeparture(null);
    },
    onError: (error: any) => toast.error(error.message || "Gagal melepas keberangkatan"),
  });

  const linkedDepartureIds = departures?.map(d => d.id) || [];

  const { data: pkgStats } = useQuery({
    queryKey: ['package-booking-stats', id, linkedDepartureIds],
    queryFn: async () => {
      if (!linkedDepartureIds.length) return null;
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('id, booking_status, payment_status, total_price, paid_amount, total_pax, created_at')
        .in('departure_id', linkedDepartureIds);
      if (error) throw error;
      if (!bookings || !bookings.length) return null;

      const total     = bookings.length;
      const confirmed = bookings.filter(b => b.booking_status === 'confirmed' || b.booking_status === 'completed').length;
      const cancelled = bookings.filter(b => b.booking_status === 'cancelled').length;
      const pending   = bookings.filter(b => b.booking_status === 'pending').length;
      const totalPax  = bookings.reduce((s, b) => s + (b.total_pax || 0), 0);
      const activeBookings = bookings.filter(b => b.booking_status !== 'cancelled');
      const totalRevenue = activeBookings.reduce((s, b) => s + (b.total_price || 0), 0);
      const totalPaid    = activeBookings.reduce((s, b) => s + (b.paid_amount || 0), 0);
      const conversionRate = total > 0 ? Math.round((confirmed / total) * 100) : 0;
      const avgBookingValue = confirmed > 0
        ? bookings.filter(b => b.booking_status === 'confirmed' || b.booking_status === 'completed')
            .reduce((s, b) => s + (b.total_price || 0), 0) / confirmed
        : 0;
      const paidRate = totalRevenue > 0 ? Math.round((totalPaid / totalRevenue) * 100) : 0;

      return { total, confirmed, cancelled, pending, totalPax, totalRevenue, totalPaid, conversionRate, avgBookingValue, paidRate };
    },
    enabled: linkedDepartureIds.length > 0,
  });

  const dynamicData = useMemo(() => {
    if (!departures || departures.length === 0) return null;
    const lowestPrices = {
      quad:   Math.min(...departures.map(d => d.price_quad).filter((p): p is number => p !== null && p > 0)) || 0,
      triple: Math.min(...departures.map(d => d.price_triple).filter((p): p is number => p !== null && p > 0)) || 0,
      double: Math.min(...departures.map(d => d.price_double).filter((p): p is number => p !== null && p > 0)) || 0,
      single: Math.min(...departures.map(d => d.price_single).filter((p): p is number => p !== null && p > 0)) || 0,
    };
    const highestTierDeparture = [...departures].reduce((prev, current) => {
      const maxPrev    = Math.max(prev.price_quad || 0, prev.price_triple || 0, prev.price_double || 0, prev.price_single || 0);
      const maxCurrent = Math.max(current.price_quad || 0, current.price_triple || 0, current.price_double || 0, current.price_single || 0);
      return (maxCurrent > maxPrev) ? current : prev;
    }, departures[0]);
    return { lowestPrices, highestTierDeparture };
  }, [departures]);

  const aggregateCapacity = useMemo(() => {
    if (!departures || departures.length === 0) return null;
    const totalQuota    = departures.reduce((sum, d) => sum + (d.quota || 0), 0);
    const totalBooked   = departures.reduce((sum, d) => sum + ((d as any).booked_count || 0), 0);
    const openCount     = departures.filter(d => d.status === 'open').length;
    const departedCount = departures.filter(d => d.status === 'departed').length;
    const fullCount     = departures.filter(d => d.status === 'full').length;
    const fillPct       = totalQuota > 0 ? Math.round((totalBooked / totalQuota) * 100) : 0;
    return { totalQuota, totalBooked, openCount, departedCount, fullCount, fillPct, total: departures.length };
  }, [departures]);

  const getMilestoneStatus = (deadline: string | null) => {
    if (!deadline) return { label: "Belum diatur", color: "text-muted-foreground", icon: Clock };
    const diffDays = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
    if (diffDays < 0) return { label: "Terlewati",              color: "text-destructive",  icon: AlertCircle };
    if (diffDays <= 7) return { label: `Mendekati (${diffDays}h)`, color: "text-orange-500", icon: AlertCircle };
    return { label: "Aman", color: "text-green-500", icon: CheckCircle2 };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':     return <Badge className="bg-green-500">Open</Badge>;
      case 'closed':   return <Badge variant="secondary">Closed</Badge>;
      case 'full':     return <Badge className="bg-orange-500">Full</Badge>;
      case 'departed': return <Badge variant="outline">Departed</Badge>;
      default:         return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getBookingStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':    return <Badge variant="outline">Pending</Badge>;
      case 'confirmed':  return <Badge className="bg-blue-500">Confirmed</Badge>;
      case 'processing': return <Badge className="bg-yellow-500">Processing</Badge>;
      case 'completed':  return <Badge className="bg-green-500">Completed</Badge>;
      case 'cancelled':  return <Badge variant="destructive">Cancelled</Badge>;
      case 'refunded':   return <Badge variant="secondary">Refunded</Badge>;
      default:           return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':  return <Badge variant="outline">Belum Bayar</Badge>;
      case 'partial':  return <Badge className="bg-yellow-500">Sebagian</Badge>;
      case 'paid':     return <Badge className="bg-green-500">Lunas</Badge>;
      case 'refunded': return <Badge variant="secondary">Refund</Badge>;
      default:         return <Badge variant="outline">{status}</Badge>;
    }
  };

  const toggleDepartureExpanded = (departureId: string) => {
    const newExpanded = new Set(expandedDepartures);
    newExpanded.has(departureId) ? newExpanded.delete(departureId) : newExpanded.add(departureId);
    setExpandedDepartures(newExpanded);
  };

  // ─── Loading State ───────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!packageData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Paket tidak ditemukan</p>
        <Button asChild className="mt-4">
          <Link to="/admin/packages">Kembali</Link>
        </Button>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ═══ HERO HEADER ═══════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/8 via-primary/4 to-transparent shadow-sm">
        {packageData.featured_image && (
          <div className="absolute inset-0 pointer-events-none">
            <img src={packageData.featured_image} alt="" className="w-full h-full object-cover opacity-[0.08]" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-background/30" />
          </div>
        )}
        <div className="relative px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            {/* Left: back + title */}
            <div className="flex items-start gap-3">
              <Button variant="ghost" size="icon" asChild className="shrink-0 mt-0.5">
                <Link to="/admin/packages"><ArrowLeft className="h-5 w-5" /></Link>
              </Button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold leading-tight">{packageData.name}</h1>
                  {!packageData.is_active && <Badge variant="destructive">Nonaktif</Badge>}
                  {packageData.is_featured && (
                    <Badge className="bg-amber-500 text-white gap-1">
                      <Star className="h-3 w-3" /> Unggulan
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {packageData.package_type_ref?.name || formatPackageType(packageData.package_type)}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm mt-0.5">
                  {packageData.code} • {packageData.duration_days} Hari
                </p>

                {/* Quick stats row */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3">
                  {aggregateCapacity ? (
                    <>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Users className="h-4 w-4 text-primary/70" />
                        <span>
                          <span className="font-semibold">{aggregateCapacity.totalBooked}</span>
                          <span className="text-muted-foreground"> / {aggregateCapacity.totalQuota} jamaah</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Calendar className="h-4 w-4 text-primary/70" />
                        <span>
                          <span className="font-semibold">{aggregateCapacity.total}</span>
                          <span className="text-muted-foreground"> jadwal</span>
                          {aggregateCapacity.openCount > 0 && (
                            <span className="ml-1 text-green-600 font-medium">({aggregateCapacity.openCount} buka)</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <AreaChart className="h-4 w-4 text-primary/70" />
                        <span className={`font-semibold ${aggregateCapacity.fillPct >= 80 ? 'text-orange-500' : aggregateCapacity.fillPct >= 50 ? 'text-amber-500' : 'text-primary'}`}>
                          {aggregateCapacity.fillPct}% terisi
                        </span>
                      </div>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Belum ada keberangkatan</span>
                  )}
                  {pkgStats && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      <span className="text-emerald-600 font-semibold">{pkgStats.conversionRate}% konversi</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: action buttons */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/packages/${packageData.id}-${slugify(packageData.name)}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1.5" /> Website
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsLinkDepartureOpen(true)}>
                <Link2 className="h-4 w-4 mr-1.5" /> Hubungkan Jadwal
              </Button>
              <Button size="sm" onClick={() => setIsPackageFormOpen(true)}>
                <Edit className="h-4 w-4 mr-1.5" /> Edit Paket
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ TABS ══════════════════════════════════════════════ */}
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1 bg-muted/60 p-1">
          <TabsTrigger value="info" className="gap-1.5">
            <Globe className="h-3.5 w-3.5" /> Info
          </TabsTrigger>
          <TabsTrigger value="jadwal" className="gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> Jadwal & Booking
            {aggregateCapacity && (
              <Badge variant="secondary" className="text-[10px] px-1.5 ml-0.5">
                {aggregateCapacity.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="analitik" className="gap-1.5">
            <AreaChart className="h-3.5 w-3.5" /> Analitik
          </TabsTrigger>
          <TabsTrigger value="keuangan" className="gap-1.5">
            <Wallet className="h-3.5 w-3.5" /> Keuangan
          </TabsTrigger>
          <TabsTrigger value="galeri" className="gap-1.5">
            <Image className="h-3.5 w-3.5" /> Galeri & Harga
          </TabsTrigger>
        </TabsList>

        {/* ═══ TAB: INFO ════════════════════════════════════════ */}
        <TabsContent value="info" className="space-y-6">

          {/* Package Info + Pricing */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Informasi Paket</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {packageData.featured_image && (
                  <img
                    src={packageData.featured_image}
                    alt={packageData.name}
                    className="w-full h-48 object-cover rounded-lg border"
                  />
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Durasi</p>
                    <p className="font-semibold mt-0.5">{packageData.duration_days} Hari</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Maskapai</p>
                    <p className="font-semibold mt-0.5">
                      {dynamicData?.highestTierDeparture?.airline?.name || packageData.airline?.name || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Hotel Makkah</p>
                    <p className="font-semibold mt-0.5">
                      {dynamicData?.highestTierDeparture?.hotel_makkah?.name || packageData.hotel_makkah?.name || '-'}
                      {(dynamicData?.highestTierDeparture?.hotel_makkah?.star_rating || packageData.hotel_makkah?.star_rating) &&
                        <span className="text-amber-500 ml-1">{'★'.repeat(dynamicData?.highestTierDeparture?.hotel_makkah?.star_rating || packageData.hotel_makkah?.star_rating || 0)}</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Hotel Madinah</p>
                    <p className="font-semibold mt-0.5">
                      {dynamicData?.highestTierDeparture?.hotel_madinah?.name || packageData.hotel_madinah?.name || '-'}
                      {(dynamicData?.highestTierDeparture?.hotel_madinah?.star_rating || packageData.hotel_madinah?.star_rating) &&
                        <span className="text-amber-500 ml-1">{'★'.repeat(dynamicData?.highestTierDeparture?.hotel_madinah?.star_rating || packageData.hotel_madinah?.star_rating || 0)}</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Muthawif</p>
                    <p className="font-semibold mt-0.5">{packageData.muthawif?.name || '-'}</p>
                  </div>
                </div>
                {packageData.description && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1.5">Deskripsi</p>
                    <p className="text-sm leading-relaxed">{packageData.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pricing Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Harga</CardTitle>
                {dynamicData && (
                  <p className="text-[11px] text-muted-foreground italic">
                    * Harga terendah dari semua jadwal
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Quad (4 orang)", key: "quad" },
                  { label: "Triple (3 orang)", key: "triple" },
                  { label: "Double (2 orang)", key: "double" },
                  { label: "Single (1 orang)", key: "single" },
                ].map(({ label, key }) => {
                  const price = (dynamicData?.lowestPrices as any)?.[key] || (packageData as any)[`price_${key}`];
                  return (
                    <div key={key} className="flex justify-between items-center py-1 border-b last:border-0">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <span className="font-semibold text-sm">
                        {price ? formatCurrency(price, packageData.currency) : <span className="text-muted-foreground">-</span>}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Includes / Excludes */}
          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-green-600 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Termasuk dalam Paket
                </CardTitle>
              </CardHeader>
              <CardContent>
                {packageData.includes && packageData.includes.length > 0 ? (
                  <ul className="space-y-1.5">
                    {packageData.includes.map((item: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm italic">Belum ada data</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-red-500 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> Tidak Termasuk
                </CardTitle>
              </CardHeader>
              <CardContent>
                {packageData.excludes && packageData.excludes.length > 0 ? (
                  <ul className="space-y-1.5">
                    {packageData.excludes.map((item: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-red-400 mt-0.5 shrink-0">✗</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm italic">Belum ada data</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* SEO Card */}
          {((packageData as any)?.meta_title || (packageData as any)?.meta_description || ((packageData as any)?.keywords?.length ?? 0) > 0) ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Search className="h-4 w-4 text-blue-600" /> SEO & Mesin Pencari
                  </CardTitle>
                  <button onClick={() => setIsPackageFormOpen(true)} className="text-xs text-primary hover:underline font-medium">
                    Edit SEO →
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Preview di Google</p>
                  <div className="p-4 bg-white border rounded-xl space-y-1 shadow-sm">
                    <p className="text-[#1a0dab] text-base font-medium line-clamp-1 hover:underline cursor-pointer">
                      {(packageData as any)?.meta_title || packageData.name}
                    </p>
                    <p className="text-[#006621] text-xs">
                      https://vinstour.com/packages/{slugify(packageData.name)}
                    </p>
                    <p className="text-[#545454] text-sm line-clamp-2">
                      {(packageData as any)?.meta_description || packageData.description || 'Belum ada meta description.'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Meta Title", val: (packageData as any)?.meta_title, max: 70 },
                    { label: "Meta Desc",  val: (packageData as any)?.meta_description, max: 160 },
                  ].map(({ label, val, max }) => (
                    <div key={label} className="text-center p-3 bg-muted/50 rounded-xl">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">{label}</p>
                      {val ? (
                        <>
                          <p className="text-sm font-bold mt-1">{val.length}<span className="text-muted-foreground">/{max}</span></p>
                          <div className="w-full bg-muted h-1.5 rounded-full mt-1 overflow-hidden">
                            <div className={`h-full rounded-full ${val.length > max * 0.8 ? 'bg-emerald-500' : 'bg-amber-400'}`}
                              style={{ width: `${Math.min(100, (val.length / max) * 100)}%` }} />
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-rose-500 font-medium mt-1">Belum diisi</p>
                      )}
                    </div>
                  ))}
                  <div className="text-center p-3 bg-muted/50 rounded-xl">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Keywords</p>
                    <p className="text-sm font-bold mt-1">{(packageData as any)?.keywords?.length ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">kata kunci</p>
                  </div>
                </div>
                {(packageData as any)?.keywords?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Kata Kunci:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(packageData as any).keywords.map((k: string, i: number) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <Search className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">SEO belum dikonfigurasi</p>
                    <p className="text-xs text-muted-foreground">Tambahkan meta title, description, dan keywords agar mudah ditemukan di Google.</p>
                  </div>
                </div>
                <button onClick={() => setIsPackageFormOpen(true)} className="text-sm text-primary hover:underline font-medium whitespace-nowrap ml-4">
                  Isi Sekarang →
                </button>
              </CardContent>
            </Card>
          )}

          {/* Cancellation Policy */}
          <PackageCancellationPolicyCard
            packageId={id}
            packageName={packageData.name}
            cancellationRuleId={(packageData as any)?.cancellation_rule_id ?? null}
          />
        </TabsContent>

        {/* ═══ TAB: JADWAL & BOOKING ════════════════════════════ */}
        <TabsContent value="jadwal" className="space-y-6">

          {/* Aggregate Capacity */}
          {aggregateCapacity && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Ringkasan Kapasitas — Semua Keberangkatan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {[
                    { label: "Total Jamaah",    val: aggregateCapacity.totalBooked,  cls: "text-foreground" },
                    { label: "Total Kuota",     val: aggregateCapacity.totalQuota,   cls: "text-foreground" },
                    { label: "Terisi",          val: `${aggregateCapacity.fillPct}%`, cls: "text-primary" },
                    { label: "Jadwal Buka",     val: aggregateCapacity.openCount,    cls: "text-green-600" },
                    { label: "Jadwal Penuh",    val: aggregateCapacity.fullCount,    cls: "text-orange-500" },
                    { label: "Sudah Berangkat", val: aggregateCapacity.departedCount, cls: "text-muted-foreground" },
                  ].map(({ label, val, cls }) => (
                    <div key={label} className="rounded-lg bg-muted/40 p-3 text-center">
                      <p className={`text-xl font-bold ${cls}`}>{val}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{aggregateCapacity.totalBooked} jamaah terdaftar</span>
                    <span>dari {aggregateCapacity.totalQuota} kuota ({aggregateCapacity.total} jadwal)</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div className="bg-primary h-full transition-all rounded-full"
                      style={{ width: `${Math.min(100, aggregateCapacity.fillPct)}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Departure list header */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <LayoutList className="h-4 w-4 text-muted-foreground" />
              Daftar Jadwal Keberangkatan
            </h2>
            <Button size="sm" variant="outline" onClick={() => setIsLinkDepartureOpen(true)}>
              <Link2 className="h-4 w-4 mr-1.5" /> Hubungkan Keberangkatan
            </Button>
          </div>

          {/* Departures */}
          {departuresLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : !departures || departures.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">Belum ada jadwal keberangkatan terhubung</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Buat jadwal di menu <strong>Keberangkatan</strong>, lalu hubungkan ke paket ini.
                </p>
                <Button variant="outline" onClick={() => setIsLinkDepartureOpen(true)}>
                  <Link2 className="h-4 w-4 mr-2" /> Hubungkan Sekarang
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {departures.map((departure: any) => {
                const isExpanded  = expandedDepartures.has(departure.id);
                const bookingCount = departure.bookings?.length || 0;
                const totalBooked  = departure.booked_count || 0;
                const breakEven    = departure.break_even_pax || 0;

                return (
                  <div key={departure.id} className="border rounded-xl overflow-hidden shadow-sm">
                    <Collapsible open={isExpanded} onOpenChange={() => toggleDepartureExpanded(departure.id)}>
                      <CollapsibleTrigger asChild>
                        <button className="w-full px-4 py-3.5 hover:bg-muted/40 transition-colors flex items-center gap-3 text-left">
                          {/* Date */}
                          <div className="shrink-0 w-[90px]">
                            {departure.departure_date ? (
                              <>
                                <p className="font-semibold text-sm leading-tight">{formatDate(departure.departure_date)}</p>
                                <p className="text-[10px] text-muted-foreground">s/d {formatDate(departure.return_date)}</p>
                              </>
                            ) : (
                              <>
                                <p className="font-medium text-sm">TBA</p>
                                <p className="text-[10px] text-muted-foreground italic">Segera diumumkan</p>
                              </>
                            )}
                          </div>

                          {/* Route */}
                          <div className="flex items-center gap-1.5 text-sm shrink-0">
                            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{departure.departure_airport?.code || '—'}</span>
                            <Plane className="h-3 w-3 text-muted-foreground" />
                            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{departure.arrival_airport?.code || '—'}</span>
                          </div>

                          {/* Flight */}
                          {departure.flight_number && (
                            <span className="text-xs text-muted-foreground hidden sm:block">{departure.flight_number}</span>
                          )}

                          {/* Status */}
                          <div className="shrink-0">{getStatusBadge(departure.status)}</div>

                          {/* Capacity */}
                          <div className="flex items-center gap-1 text-sm">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className={`font-semibold ${totalBooked >= (departure.quota || 0) ? 'text-orange-500' : ''}`}>
                              {totalBooked}
                            </span>
                            <span className="text-muted-foreground">/ {departure.quota}</span>
                          </div>

                          <div className="flex items-center gap-2 ml-auto shrink-0">
                            {/* Booking badge */}
                            <Badge variant="secondary" className="text-[11px]">
                              {bookingCount} Jamaah
                            </Badge>

                            {/* Quick: Buat Booking */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1 hidden sm:flex"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/admin/bookings?departure=${departure.id}`);
                              }}
                            >
                              <PlusCircle className="h-3.5 w-3.5" /> Buat Booking
                            </Button>

                            {/* Detail link */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/admin/departures/${departure.id}`);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>

                            {/* Unlink */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setUnlinkDeparture(departure);
                              }}
                            >
                              <Unlink className="h-3.5 w-3.5" />
                            </Button>

                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </button>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="border-t bg-muted/10">
                        <div className="p-4 space-y-6">
                          {/* Milestone / Break-even / Equipment */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <MilestoneTrackerCard
                              departureId={departure.id}
                              milestones={[
                                { label: "Pengumpulan Dokumen", date: departure.document_deadline, type: "document" },
                                { label: "Pelunasan Pembayaran", date: departure.payment_deadline, type: "payment" },
                                { label: "Pengurusan Visa",     date: departure.visa_deadline,     type: "visa" },
                              ]}
                            />
                            <BreakEvenIndicatorCard
                              totalBooked={totalBooked}
                              quota={departure.quota}
                              breakEvenPax={breakEven}
                              operationalCostPerPax={(departure as any)?.operational_cost_per_pax || 0}
                            />
                            <EquipmentReadinessCard
                              departureId={departure.id}
                              totalJamaah={departure.quota}
                            />
                          </div>

                          {/* Jamaah table */}
                          {!departure.bookings || departure.bookings.length === 0 ? (
                            <div className="text-center py-8">
                              <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                              <p className="text-sm text-muted-foreground">Belum ada jamaah terdaftar</p>
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-3 gap-1.5"
                                onClick={() => navigate(`/admin/bookings?departure=${departure.id}`)}
                              >
                                <PlusCircle className="h-4 w-4" /> Buat Booking Pertama
                              </Button>
                            </div>
                          ) : (
                            <div className="overflow-x-auto rounded-lg border">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/30">
                                    <TableHead className="text-xs">Nama Jamaah</TableHead>
                                    <TableHead className="text-xs">NIK</TableHead>
                                    <TableHead className="text-xs">Kode Booking</TableHead>
                                    <TableHead className="text-xs">Status</TableHead>
                                    <TableHead className="text-xs">Pembayaran</TableHead>
                                    <TableHead className="text-right text-xs">Harga</TableHead>
                                    <TableHead className="text-right text-xs">Terbayar</TableHead>
                                    <TableHead className="text-center text-xs">Aksi</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {departure.bookings.map((booking: any) => (
                                    <TableRow key={booking.id}>
                                      <TableCell>
                                        <p className="font-medium text-sm">{booking.customer?.full_name || '-'}</p>
                                        <p className="text-xs text-muted-foreground">{booking.customer?.phone || '-'}</p>
                                      </TableCell>
                                      <TableCell className="text-xs font-mono">{booking.customer?.nik || '-'}</TableCell>
                                      <TableCell>
                                        <p className="font-mono text-xs">{booking.booking_code}</p>
                                      </TableCell>
                                      <TableCell>{getBookingStatusBadge(booking.booking_status)}</TableCell>
                                      <TableCell>{getPaymentStatusBadge(booking.payment_status)}</TableCell>
                                      <TableCell className="text-right text-sm font-semibold">
                                        {formatCurrency(booking.total_price)}
                                      </TableCell>
                                      <TableCell className="text-right text-sm font-semibold">
                                        {formatCurrency(booking.paid_amount)}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                          <Link to={`/admin/bookings/${booking.id}`}>
                                            <Eye className="h-3.5 w-3.5" />
                                          </Link>
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                              {/* Footer: Buat Booking button */}
                              <div className="px-4 py-2.5 border-t bg-muted/20 flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">{bookingCount} booking terdaftar</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => navigate(`/admin/bookings?departure=${departure.id}`)}
                                >
                                  <PlusCircle className="h-3.5 w-3.5" /> Buat Booking Baru
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ═══ TAB: ANALITIK ════════════════════════════════════ */}
        <TabsContent value="analitik" className="space-y-6">
          {!pkgStats ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">Belum ada data analitik</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Data akan muncul setelah ada booking pada keberangkatan yang terhubung.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-xl bg-primary/5 p-4 text-center border">
                  <ShoppingCart className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-2xl font-bold text-primary">{pkgStats.total}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Booking</p>
                </div>
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-4 text-center border">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-emerald-600">{pkgStats.confirmed}</p>
                  <p className="text-xs text-muted-foreground mt-1">Dikonfirmasi</p>
                </div>
                <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 p-4 text-center border">
                  <Users className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-blue-600">{pkgStats.totalPax}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Jamaah</p>
                </div>
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-4 text-center border">
                  <DollarSign className="h-5 w-5 text-amber-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-amber-600 leading-tight">{formatCurrency(pkgStats.totalRevenue)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Pendapatan</p>
                </div>
              </div>

              {/* Rate cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 border rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold">Conversion Rate</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5
                      ${pkgStats.conversionRate >= 60 ? 'bg-emerald-100 text-emerald-700' :
                        pkgStats.conversionRate >= 30 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                      <ArrowUpRight className="h-3 w-3" />
                      {pkgStats.conversionRate}%
                    </span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all
                      ${pkgStats.conversionRate >= 60 ? 'bg-emerald-500' :
                        pkgStats.conversionRate >= 30 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      style={{ width: `${pkgStats.conversionRate}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {pkgStats.confirmed} konfirmasi dari {pkgStats.total} booking
                  </p>
                </div>

                <div className="p-4 border rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      <p className="text-sm font-semibold">Tingkat Pelunasan</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                      ${pkgStats.paidRate >= 80 ? 'bg-emerald-100 text-emerald-700' :
                        pkgStats.paidRate >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                      {pkgStats.paidRate}%
                    </span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all
                      ${pkgStats.paidRate >= 80 ? 'bg-emerald-500' :
                        pkgStats.paidRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      style={{ width: `${pkgStats.paidRate}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatCurrency(pkgStats.totalPaid)} dari {formatCurrency(pkgStats.totalRevenue)}
                  </p>
                </div>

                <div className="p-4 border rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <p className="text-sm font-semibold">Rata-rata Nilai Booking</p>
                  </div>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(pkgStats.avgBookingValue)}</p>
                  <p className="text-xs text-muted-foreground mt-2">per booking yang dikonfirmasi</p>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {pkgStats.pending > 0 && (
                      <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">{pkgStats.pending} pending</span>
                    )}
                    {pkgStats.cancelled > 0 && (
                      <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded-full font-medium">{pkgStats.cancelled} dibatalkan</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Link to full bookings list */}
              <div className="flex justify-end">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/admin/bookings?package=${id}`}>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Lihat Semua Booking Paket Ini →
                  </Link>
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* ═══ TAB: KEUANGAN ════════════════════════════════════ */}
        <TabsContent value="keuangan" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                Keuangan per Keberangkatan
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                HPP (modal), pengeluaran operasional, pendapatan tambahan, dan laporan laba/rugi per keberangkatan.
              </p>
            </CardHeader>
            <CardContent>
              <PackageFinancialSection
                departures={(departures || []).map((d: any) => ({ ...d, status: d.status ?? "open" }))}
                packageName={packageData?.name}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB: GALERI & HARGA ══════════════════════════════ */}
        <TabsContent value="galeri" className="space-y-6">
          <PackageGalleryCard packageId={id} mainImageUrl={packageData?.featured_image} />
          <PackagePriceTrendCard packageId={id} departures={departures || []} />
          <PackagePriceAuditCard packageId={id} />
          {departures && departures.length > 1 && (
            <DeparturePriceComparisonCard departures={departures} />
          )}
        </TabsContent>
      </Tabs>

      {/* ═══ DIALOGS ══════════════════════════════════════════════ */}
      <Dialog open={isPackageFormOpen} onOpenChange={setIsPackageFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Paket</DialogTitle></DialogHeader>
          <PackageForm
            packageData={packageData}
            onSuccess={() => setIsPackageFormOpen(false)}
            onCancel={() => setIsPackageFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isLinkDepartureOpen} onOpenChange={setIsLinkDepartureOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Hubungkan Keberangkatan</DialogTitle></DialogHeader>
          <LinkDepartureForm
            packageId={id!}
            linkedDepartureIds={linkedDepartureIds}
            onSuccess={() => setIsLinkDepartureOpen(false)}
            onCancel={() => setIsLinkDepartureOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!unlinkDeparture} onOpenChange={() => setUnlinkDeparture(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lepas Keberangkatan?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin melepas keberangkatan{" "}
              {unlinkDeparture && (
                unlinkDeparture.departure_date
                  ? `tanggal ${formatDate(unlinkDeparture.departure_date)}`
                  : `bulan ${MONTHS.find(m => m.value === unlinkDeparture.month)?.label}`
              )}{" "}
              dari paket ini?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => unlinkDeparture && unlinkDepartureMutation.mutate(unlinkDeparture.id)}>
              Lepas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
