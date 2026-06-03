import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatCurrency, formatPackageType, formatDate } from "@/lib/format";
import { ArrowLeft, Link2, Edit, Trash2, Calendar, Users, Plane, ChevronDown, Eye, AlertCircle, CheckCircle2, Clock, TrendingUp, Box, ExternalLink, DollarSign } from "lucide-react";
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
  { value: "01", label: "Januari" },
  { value: "02", label: "Februari" },
  { value: "03", label: "Maret" },
  { value: "04", label: "April" },
  { value: "05", label: "Mei" },
  { value: "06", label: "Juni" },
  { value: "07", label: "Juli" },
  { value: "08", label: "Agustus" },
  { value: "09", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

export default function AdminPackageDetail() {
  const { id } = useParams<{ id: string }>() as { id: string };
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
            id,
            booking_code,
            booking_status,
            payment_status,
            total_pax,
            total_price,
            paid_amount,
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
    onError: (error: any) => {
      toast.error(error.message || "Gagal melepas keberangkatan");
    },
  });

  const linkedDepartureIds = departures?.map(d => d.id) || [];

  // Logic to get dynamic data from departures
  const getDynamicData = () => {
    if (!departures || departures.length === 0) return null;

    // 1. Get lowest prices from all departures
    const prices = departures.flatMap(d => [
      d.price_quad, d.price_triple, d.price_double, d.price_single
    ]).filter(p => p && p > 0);
    
    const lowestPrices = {
      quad: Math.min(...departures.map(d => d.price_quad).filter((p): p is number => p !== null && p > 0)) || 0,
      triple: Math.min(...departures.map(d => d.price_triple).filter((p): p is number => p !== null && p > 0)) || 0,
      double: Math.min(...departures.map(d => d.price_double).filter((p): p is number => p !== null && p > 0)) || 0,
      single: Math.min(...departures.map(d => d.price_single).filter((p): p is number => p !== null && p > 0)) || 0,
    };

    // 2. Get hotel/airline from the departure with the highest price (highest tier)
    // We look for the departure that has the highest price among all room types
    const highestTierDeparture = [...departures].reduce((prev, current) => {
      const maxPrev = Math.max(prev.price_quad || 0, prev.price_triple || 0, prev.price_double || 0, prev.price_single || 0);
      const maxCurrent = Math.max(current.price_quad || 0, current.price_triple || 0, current.price_double || 0, current.price_single || 0);
      return (maxCurrent > maxPrev) ? current : prev;
    }, departures[0]);

    return {
      lowestPrices,
      highestTierDeparture
    };
  };

  const dynamicData = getDynamicData();

  const aggregateCapacity = useMemo(() => {
    if (!departures || departures.length === 0) return null;
    const totalQuota = departures.reduce((sum, d) => sum + (d.quota || 0), 0);
    const totalBooked = departures.reduce((sum, d) => sum + ((d as any).booked_count || 0), 0);
    const openCount = departures.filter(d => d.status === 'open').length;
    const departedCount = departures.filter(d => d.status === 'departed').length;
    const fullCount = departures.filter(d => d.status === 'full').length;
    const fillPct = totalQuota > 0 ? Math.round((totalBooked / totalQuota) * 100) : 0;
    return { totalQuota, totalBooked, openCount, departedCount, fullCount, fillPct, total: departures.length };
  }, [departures]);

  const getMilestoneStatus = (deadline: string | null) => {
    if (!deadline) return { label: "Belum diatur", color: "text-muted-foreground", icon: Clock };
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: "Terlewati", color: "text-destructive", icon: AlertCircle };
    if (diffDays <= 7) return { label: `Mendekati (${diffDays} hari)`, color: "text-orange-500", icon: AlertCircle };
    return { label: "Aman", color: "text-green-500", icon: CheckCircle2 };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-green-500">Open</Badge>;
      case 'closed':
        return <Badge variant="secondary">Closed</Badge>;
      case 'full':
        return <Badge className="bg-orange-500">Full</Badge>;
      case 'departed':
        return <Badge variant="outline">Departed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getBookingStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'confirmed':
        return <Badge className="bg-blue-500">Confirmed</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-500">Processing</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'refunded':
        return <Badge variant="secondary">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Belum Bayar</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-500">Sebagian</Badge>;
      case 'paid':
        return <Badge className="bg-green-500">Lunas</Badge>;
      case 'refunded':
        return <Badge variant="secondary">Refund</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const toggleDepartureExpanded = (departureId: string) => {
    const newExpanded = new Set(expandedDepartures);
    if (newExpanded.has(departureId)) {
      newExpanded.delete(departureId);
    } else {
      newExpanded.add(departureId);
    }
    setExpandedDepartures(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/packages">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{packageData.name}</h1>
              {!packageData.is_active && <Badge variant="destructive">Nonaktif</Badge>}
              {packageData.is_featured && <Badge variant="secondary">Featured</Badge>}
            </div>
            <p className="text-muted-foreground">{packageData.code} • {packageData.package_type_ref?.name || formatPackageType(packageData.package_type)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to={`/packages/${packageData.id}-${slugify(packageData.name)}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Lihat di Website
            </Link>
          </Button>
          <Button onClick={() => setIsPackageFormOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Paket
          </Button>
        </div>
      </div>

      {/* Package Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informasi Paket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {packageData.featured_image && (
              <img 
                src={packageData.featured_image} 
                alt={packageData.name}
                className="w-full h-48 object-cover rounded-lg"
              />
            )}
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Durasi</p>
                <p className="font-medium">{packageData.duration_days} Hari</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Maskapai</p>
                <p className="font-medium">
                  {dynamicData?.highestTierDeparture?.airline?.name || packageData.airline?.name || '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hotel Makkah</p>
                <p className="font-medium">
                  {dynamicData?.highestTierDeparture?.hotel_makkah?.name || packageData.hotel_makkah?.name || '-'}
                  {(dynamicData?.highestTierDeparture?.hotel_makkah?.star_rating || packageData.hotel_makkah?.star_rating) && 
                    ` (${dynamicData?.highestTierDeparture?.hotel_makkah?.star_rating || packageData.hotel_makkah?.star_rating}⭐)`}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hotel Madinah</p>
                <p className="font-medium">
                  {dynamicData?.highestTierDeparture?.hotel_madinah?.name || packageData.hotel_madinah?.name || '-'}
                  {(dynamicData?.highestTierDeparture?.hotel_madinah?.star_rating || packageData.hotel_madinah?.star_rating) && 
                    ` (${dynamicData?.highestTierDeparture?.hotel_madinah?.star_rating || packageData.hotel_madinah?.star_rating}⭐)`}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Muthawif</p>
                <p className="font-medium">{packageData.muthawif?.name || '-'}</p>
              </div>
            </div>

            {packageData.description && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Deskripsi</p>
                <p className="text-sm">{packageData.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Harga</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quad (4 orang)</span>
              <span className="font-medium">
                {formatCurrency(dynamicData?.lowestPrices.quad || packageData.price_quad, packageData.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Triple (3 orang)</span>
              <span className="font-medium">
                {formatCurrency(dynamicData?.lowestPrices.triple || packageData.price_triple, packageData.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Double (2 orang)</span>
              <span className="font-medium">
                {formatCurrency(dynamicData?.lowestPrices.double || packageData.price_double, packageData.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Single (1 orang)</span>
              <span className="font-medium">
                {formatCurrency(dynamicData?.lowestPrices.single || packageData.price_single, packageData.currency)}
              </span>
            </div>
            {dynamicData && (
              <p className="text-[10px] text-muted-foreground mt-2 italic">
                * Menampilkan harga terendah dari jadwal yang tersedia
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Includes / Excludes */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Termasuk</CardTitle>
          </CardHeader>
          <CardContent>
            {packageData.includes && packageData.includes.length > 0 ? (
              <ul className="list-disc list-inside space-y-1 text-sm">
                {packageData.includes.map((item: string, idx: number) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">Belum ada data</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Tidak Termasuk</CardTitle>
          </CardHeader>
          <CardContent>
            {packageData.excludes && packageData.excludes.length > 0 ? (
              <ul className="list-disc list-inside space-y-1 text-sm">
                {packageData.excludes.map((item: string, idx: number) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">Belum ada data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* P5 — Aggregate Capacity across all departures */}
      {aggregateCapacity && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Kapasitas Aggregat — Semua Keberangkatan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <p className="text-2xl font-bold">{aggregateCapacity.totalBooked}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Jamaah</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <p className="text-2xl font-bold">{aggregateCapacity.totalQuota}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Kuota</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-4 text-center">
                <p className="text-2xl font-bold text-primary">{aggregateCapacity.fillPct}%</p>
                <p className="text-xs text-muted-foreground mt-1">Terisi</p>
              </div>
              <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{aggregateCapacity.openCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Jadwal Buka</p>
              </div>
              <div className="rounded-lg bg-orange-50 dark:bg-orange-950/30 p-4 text-center">
                <p className="text-2xl font-bold text-orange-500">{aggregateCapacity.fullCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Jadwal Penuh</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <p className="text-2xl font-bold text-muted-foreground">{aggregateCapacity.departedCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Sudah Berangkat</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{aggregateCapacity.totalBooked} jamaah terdaftar</span>
                <span>dari {aggregateCapacity.totalQuota} kuota total ({aggregateCapacity.total} keberangkatan)</span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all"
                  style={{ width: `${Math.min(100, aggregateCapacity.fillPct)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancellation Policy */}
      <PackageCancellationPolicyCard packageId={id} packageName={packageData.name} />

      {/* Photo Gallery */}
      <PackageGalleryCard packageId={id} mainImageUrl={packageData?.featured_image} />

      {/* Price Trend */}
      <PackagePriceTrendCard packageId={id} departures={departures || []} />

      {/* Price Audit Trail (P4) */}
      <PackagePriceAuditCard packageId={id} />

      {/* Price Comparison */}
      {departures && departures.length > 1 && (
        <DeparturePriceComparisonCard departures={departures} />
      )}

      {/* Departures with Jamaah List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Jadwal Keberangkatan & Daftar Jamaah
          </CardTitle>
          <Button onClick={() => setIsLinkDepartureOpen(true)}>
            <Link2 className="h-4 w-4 mr-2" />
            Hubungkan Keberangkatan
          </Button>
        </CardHeader>
        <CardContent>
          {departuresLoading ? (
            <Skeleton className="h-32" />
          ) : !departures || departures.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Belum ada jadwal keberangkatan terhubung</p>
              <p className="text-sm mt-1">
                Buat jadwal di menu <strong>Keberangkatan</strong>, lalu hubungkan ke paket ini
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {departures.map((departure: any) => {
                const isExpanded = expandedDepartures.has(departure.id);
                const bookingCount = departure.bookings?.length || 0;
                
                // Phase 3: Milestone status
                const docMilestone = getMilestoneStatus(departure.document_deadline);
                const payMilestone = getMilestoneStatus(departure.payment_deadline);
                const visaMilestone = getMilestoneStatus(departure.visa_deadline);
                
                // Phase 5: Break-even calculation
                const totalBooked = departure.booked_count || 0;
                const breakEven = departure.break_even_pax || 0;
                const isProfitable = breakEven > 0 && totalBooked >= breakEven;

                return (
                  <div key={departure.id} className="border rounded-lg overflow-hidden">
                    {/* Departure Header */}
                    <Collapsible open={isExpanded} onOpenChange={() => toggleDepartureExpanded(departure.id)}>
                      <CollapsibleTrigger asChild>
                        <button className="w-full px-4 py-3 hover:bg-muted/50 transition-colors flex items-center justify-between">
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-4 flex-wrap">
                              <div>
                                {departure.departure_date ? (
                                  <>
                                    <p className="font-medium">{formatDate(departure.departure_date)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      s/d {formatDate(departure.return_date)}
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <p className="font-medium">Tanggal belum ditentukan</p>
                                    <p className="text-xs text-muted-foreground italic">Segera diumumkan</p>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <span>{departure.departure_airport?.code || '-'}</span>
                                <Plane className="h-3 w-3" />
                                <span>{departure.arrival_airport?.code || '-'}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">Penerbangan:</span>
                                <span className="ml-1 font-medium">{departure.flight_number || '-'}</span>
                              </div>
                              <div className="flex items-center gap-1 text-sm">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span>{departure.booked_count || 0}/{departure.quota}</span>
                              </div>
                              <div>{getStatusBadge(departure.status)}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Badge variant="secondary">{bookingCount} Jamaah</Badge>
                            <ChevronDown 
                              className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-destructive hover:text-destructive ml-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUnlinkDeparture(departure);
                            }}
                            title="Lepas dari paket"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </button>
                      </CollapsibleTrigger>

                      {/* Jamaah List */}
                      <CollapsibleContent className="border-t">
                        <div className="p-4 space-y-6">
                          {/* Phase 3 & 5 Quick Stats */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <MilestoneTrackerCard
                              milestones={[
                                { label: "Pengumpulan Dokumen", date: departure.document_deadline, type: "document" },
                                { label: "Pelunasan Pembayaran", date: departure.payment_deadline, type: "payment" },
                                { label: "Pengurusan Visa", date: departure.visa_deadline, type: "visa" },
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

                          <div className="space-y-4">
                            {!departure.bookings || departure.bookings.length === 0 ? (
                              <div className="text-center py-8">
                                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm text-muted-foreground">Belum ada jamaah terdaftar pada keberangkatan ini</p>
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Nama Jamaah</TableHead>
                                      <TableHead>NIK</TableHead>
                                      <TableHead>Kode Booking</TableHead>
                                      <TableHead>Status Booking</TableHead>
                                      <TableHead>Status Pembayaran</TableHead>
                                      <TableHead className="text-right">Harga</TableHead>
                                      <TableHead className="text-right">Terbayar</TableHead>
                                      <TableHead className="text-center">Aksi</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {departure.bookings.map((booking: any) => (
                                      <TableRow key={booking.id}>
                                        <TableCell>
                                          <div>
                                            <p className="font-medium">{booking.customer?.full_name || '-'}</p>
                                            <p className="text-xs text-muted-foreground">{booking.customer?.phone || '-'}</p>
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-sm">{booking.customer?.nik || '-'}</TableCell>
                                        <TableCell>
                                          <p className="font-mono text-sm">{booking.booking_code}</p>
                                        </TableCell>
                                        <TableCell>
                                          {getBookingStatusBadge(booking.booking_status)}
                                        </TableCell>
                                        <TableCell>
                                          {getPaymentStatusBadge(booking.payment_status)}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                          {formatCurrency(booking.total_price)}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                          {formatCurrency(booking.paid_amount)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <Button variant="ghost" size="icon" asChild>
                                            <Link to={`/admin/bookings/${booking.id}`}>
                                              <Eye className="h-4 w-4" />
                                            </Link>
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Keuangan per Keberangkatan ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
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

      {/* Forms */}
      <Dialog open={isPackageFormOpen} onOpenChange={setIsPackageFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Paket</DialogTitle>
          </DialogHeader>
          <PackageForm 
            packageData={packageData} 
            onSuccess={() => setIsPackageFormOpen(false)}
            onCancel={() => setIsPackageFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isLinkDepartureOpen} onOpenChange={setIsLinkDepartureOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Hubungkan Keberangkatan</DialogTitle>
          </DialogHeader>
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
              Apakah Anda yakin ingin melepas keberangkatan {unlinkDeparture && (unlinkDeparture.departure_date ? `tanggal ${formatDate(unlinkDeparture.departure_date)}` : `bulan ${MONTHS.find(m => m.value === unlinkDeparture.month)?.label}`)} dari paket ini?
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
