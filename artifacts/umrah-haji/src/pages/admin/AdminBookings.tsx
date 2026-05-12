
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { formatCurrency, formatDate } from "@/lib/format";
import { exportToExcel } from "@/lib/export-utils";
import { exportBookingStatsToExcel } from "@/lib/booking-stats-exporter";
import { exportDynamicBookingExcel, exportDynamicStatisticsExcel } from "@/lib/dynamic-excel-exporter";
import { resolveExcelStyle } from "@/lib/excel-style-resolver";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useState, useMemo, useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Search, Eye, Calendar, Users, Filter, X, Download, ShoppingCart,
  CheckCircle, Trash2, MoreHorizontal, AlertTriangle, Clock, Loader2, TrendingUp, MessageSquare, ChevronDown
} from "lucide-react";
import { startOfDay, startOfWeek, startOfMonth, subMonths, endOfDay } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { LoadingState } from "@/components/shared/LoadingState";
import { Booking } from "@/types/database";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Konfirmasi',
  processing: 'Proses',
  completed: 'Selesai',
  cancelled: 'Batal',
  refunded: 'Refund',
};

const PAYMENT_LABELS: Record<string, string> = {
  pending: 'Belum Bayar',
  partial: 'Sebagian',
  paid: 'Lunas',
  refunded: 'Refund',
};

const PAGE_SIZE = 20;

export default function AdminBookings() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [packageFilter, setPackageFilter] = useState<string>("all");
  const [departureFilter, setDepartureFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [periodPreset, setPeriodPreset] = useState<string>("all");
  const [customPeriodFrom, setCustomPeriodFrom] = useState("");
  const [customPeriodTo, setCustomPeriodTo] = useState("");
  const [isStatsExpanded, setIsStatsExpanded] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { company } = useCompanyInfo();
  const { getSetting } = useCompanySettings();

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['admin-bookings', currentPage, searchTerm, statusFilter, paymentFilter, packageFilter, departureFilter, branchFilter, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          customer:customers(id, full_name, phone, email),
          departure:departures(
            id,
            departure_date,
            return_date,
            package:packages(id, name, code)
          ),
          branch:branches(id, name)
        `, { count: 'exact' });

      if (searchTerm) {
        // Sanitize special characters that could break PostgREST queries.
        // PostgREST does NOT support nested SQL subqueries inside `.or()`, jadi
        // resolve dulu customer IDs yang cocok, lalu pakai `.in()` literal.
        const sanitized = searchTerm.replace(/[%_()\\*?{}[\],:'"]/g, '').trim();
        if (sanitized) {
          const safeOr = sanitized.replace(/[,()]/g, ' ');
          const { data: matchedCustomers } = await supabase
            .from('customers')
            .select('id')
            .or(`full_name.ilike.%${safeOr}%,phone.ilike.%${safeOr}%`)
            .limit(200);
          const customerIds = (matchedCustomers || []).map((c: any) => c.id);
          if (customerIds.length > 0) {
            query = query.or(
              `booking_code.ilike.%${sanitized}%,customer_id.in.(${customerIds.join(',')})`
            );
          } else {
            query = query.ilike('booking_code', `%${sanitized}%`);
          }
        }
      }
      if (statusFilter !== "all") query = query.eq('booking_status', statusFilter as any);
      if (paymentFilter !== "all") query = query.eq('payment_status', paymentFilter as any);
      if (branchFilter !== "all") query = query.eq('branch_id', branchFilter);
      if (departureFilter !== "all") {
        query = query.eq('departure_id', departureFilter);
      } else if (packageFilter !== "all") {
        // PostgREST tidak bisa filter via dot pada nested join — resolve dulu departure IDs.
        const { data: deps, error: depsErr } = await supabase
          .from('departures')
          .select('id')
          .eq('package_id', packageFilter);
        if (depsErr) throw depsErr;
        const ids = (deps || []).map(d => d.id);
        if (ids.length === 0) return { bookings: [] as Booking[], count: 0 };
        query = query.in('departure_id', ids);
      }
      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59');

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

      if (error) throw error;
      return { bookings: data as unknown as Booking[], count: count || 0 };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const bookings = bookingsData?.bookings;
  const totalCount = bookingsData?.count || 0;

  // Period range computation
  const periodRange = useMemo(() => {
    const now = new Date();
    switch (periodPreset) {
      case "all": return { from: new Date(0), to: endOfDay(now), label: "Semua Waktu" };
      case "today": return { from: startOfDay(now), to: endOfDay(now), label: "Hari Ini" };
      case "week": return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfDay(now), label: "Minggu Ini" };
      case "month": return { from: startOfMonth(now), to: endOfDay(now), label: "Bulan Ini" };
      case "3m": return { from: subMonths(now, 3), to: endOfDay(now), label: "3 Bulan" };
      case "6m": return { from: subMonths(now, 6), to: endOfDay(now), label: "6 Bulan" };
      case "9m": return { from: subMonths(now, 9), to: endOfDay(now), label: "9 Bulan" };
      case "12m": return { from: subMonths(now, 12), to: endOfDay(now), label: "12 Bulan" };
      case "custom": {
        if (customPeriodFrom && customPeriodTo) {
          return { from: new Date(customPeriodFrom), to: new Date(customPeriodTo + "T23:59:59"), label: "Kustom" };
        }
        return null;
      }
      default: return null;
    }
  }, [periodPreset, customPeriodFrom, customPeriodTo]);

  const { data: periodStats } = useQuery({
    queryKey: ['admin-bookings-period-stats', periodRange?.from?.toISOString(), periodRange?.to?.toISOString()],
    enabled: !!periodRange,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('total_pax, total_price, booking_status')
        .gte('created_at', periodRange!.from.toISOString())
        .lte('created_at', periodRange!.to.toISOString())
        .neq('booking_status', 'cancelled');
      if (error) throw error;
      const rows = data || [];
      const totalPax = rows.reduce((s, b: any) => s + (b.total_pax || 0), 0);
      const totalBookings = rows.length;
      const totalRevenue = rows.reduce((s, b: any) => s + (b.total_price || 0), 0);
      const byStatus: Record<string, { pax: number; bookings: number }> = {};
      ['confirmed', 'pending', 'processing', 'completed'].forEach(s => byStatus[s] = { pax: 0, bookings: 0 });
      rows.forEach((b: any) => {
        const st = b.booking_status || 'pending';
        if (!byStatus[st]) byStatus[st] = { pax: 0, bookings: 0 };
        byStatus[st].pax += b.total_pax || 0;
        byStatus[st].bookings += 1;
      });
      return { totalPax, totalBookings, totalRevenue, byStatus };
    },
  });

  // Server-side filter options (lengkap, tidak terbatas halaman saat ini)
  const { data: filterOptionsData } = useQuery({
    queryKey: ['admin-bookings-filter-options'],
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const [pkgs, deps, brs] = await Promise.all([
        supabase.from('packages').select('id, name').order('name'),
        supabase
          .from('departures')
          .select('id, departure_date, package:packages(name)')
          .order('departure_date', { ascending: false })
          .limit(200),
        supabase.from('branches').select('id, name').order('name'),
      ]);
      return {
        packages: (pkgs.data || []).map((p: any) => ({ id: p.id, name: p.name })),
        departures: (deps.data || []).map((d: any) => ({
          id: d.id,
          name: `${formatDate(d.departure_date)} - ${d.package?.name || ''}`,
        })),
        branches: (brs.data || []).map((b: any) => ({ id: b.id, name: b.name })),
      };
    },
  });
  const filterOptions = filterOptionsData ?? { packages: [], departures: [], branches: [] };

  // Pagination
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const paginatedBookings = bookings;

  // Reset page when filters change
  useEffect(() => { 
    if (currentPage !== 1) setCurrentPage(1); 
  }, [searchTerm, statusFilter, paymentFilter, packageFilter, departureFilter, branchFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setPackageFilter("all");
    setDepartureFilter("all");
    setBranchFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const activeFilterCount = [
    statusFilter !== "all",
    paymentFilter !== "all",
    packageFilter !== "all",
    departureFilter !== "all",
    branchFilter !== "all",
    !!dateFrom,
    !!dateTo,
  ].filter(Boolean).length;

  const hasActiveFilters = !!searchTerm || activeFilterCount > 0;

  // Server-side aggregate stats — mengikuti filter yang sama dengan list
  // sehingga angka di kartu mencerminkan seluruh dataset (bukan halaman saat ini).
  const { data: serverStats } = useQuery({
    queryKey: ['admin-bookings-stats', searchTerm, statusFilter, paymentFilter, packageFilter, departureFilter, branchFilter, dateFrom, dateTo],
    staleTime: 1000 * 60 * 2,
    queryFn: async () => {
      let q = supabase
        .from('bookings')
        .select('booking_status, payment_status, total_price, paid_amount, departure_id');

      if (statusFilter !== 'all') q = q.eq('booking_status', statusFilter as any);
      if (paymentFilter !== 'all') q = q.eq('payment_status', paymentFilter as any);
      if (branchFilter !== 'all') q = q.eq('branch_id', branchFilter);
      if (departureFilter !== 'all') {
        q = q.eq('departure_id', departureFilter);
      } else if (packageFilter !== 'all') {
        const { data: deps } = await supabase
          .from('departures').select('id').eq('package_id', packageFilter);
        const ids = (deps || []).map(d => d.id);
        if (ids.length === 0) return { total: 0, pending: 0, confirmed: 0, unpaid: 0, totalRevenue: 0, totalPaid: 0 };
        q = q.in('departure_id', ids);
      }
      if (dateFrom) q = q.gte('created_at', dateFrom);
      if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59');

      const { data, error } = await q.limit(10000);
      if (error) throw error;
      const rows = (data || []) as Array<{
        booking_status?: string | null;
        payment_status?: string | null;
        total_price?: number | null;
        paid_amount?: number | null;
      }>;
      return {
        total: rows.length,
        pending: rows.filter(b => b.booking_status === 'pending').length,
        confirmed: rows.filter(b => b.booking_status === 'confirmed').length,
        unpaid: rows.filter(b => b.payment_status === 'pending').length,
        totalRevenue: rows.reduce((s, b) => s + (b.total_price || 0), 0),
        totalPaid: rows.reduce((s, b) => s + (b.paid_amount || 0), 0),
      };
    },
  });
  const stats = serverStats ?? { total: 0, pending: 0, confirmed: 0, unpaid: 0, totalRevenue: 0, totalPaid: 0 };

  const toggleAll = () => {
    if (selectedBookings.length === (paginatedBookings?.length || 0)) {
      setSelectedBookings([]);
    } else {
      setSelectedBookings(paginatedBookings?.map(b => b.id) || []);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Kelola Booking</h1>
          <p className="text-muted-foreground">Lihat dan kelola semua booking</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link to="/admin/bookings/create">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Buat Booking
            </Link>
          </Button>
          {selectedBookings.length > 0 && (
            <div className="flex items-center gap-2 mr-4 bg-muted p-1 rounded-md animate-in fade-in slide-in-from-right-2">
              <span className="text-sm font-medium px-2">{selectedBookings.length} dipilih</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm">
                    Aksi Masal
                    <MoreHorizontal className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={async () => {
                    setIsBulkProcessing(true);
                    try {
                      const { error } = await supabase
                        .from('bookings')
                        .update({ booking_status: 'confirmed' })
                        .in('id', selectedBookings);
                      if (error) throw error;
                      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
                      toast({ title: "Berhasil", description: `${selectedBookings.length} booking dikonfirmasi` });
                      setSelectedBookings([]);
                    } catch (err: any) {
                      toast({ title: "Gagal", description: err.message, variant: "destructive" });
                    } finally {
                      setIsBulkProcessing(false);
                    }
                  }} disabled={isBulkProcessing}>
                    {isBulkProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Konfirmasi Semua
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={async () => {
                    setIsBulkProcessing(true);
                    try {
                      const { error } = await supabase
                        .from('bookings')
                        .update({ booking_status: 'cancelled' })
                        .in('id', selectedBookings);
                      if (error) throw error;
                      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
                      toast({ title: "Berhasil", description: `${selectedBookings.length} booking dibatalkan` });
                      setSelectedBookings([]);
                    } catch (err: any) {
                      toast({ title: "Gagal", description: err.message, variant: "destructive" });
                    } finally {
                      setIsBulkProcessing(false);
                    }
                  }} disabled={isBulkProcessing}>
                    {isBulkProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                    Batalkan Semua
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="sm" onClick={() => setSelectedBookings([])}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <Button variant="outline" onClick={() => {
            if (!paginatedBookings || paginatedBookings.length === 0) return;

            const styleConfig = resolveExcelStyle(getSetting);

            const mappedData = paginatedBookings.map(b => ({
              booking_code: b.booking_code,
              customer_name: (b.customer as any)?.full_name || '-',
              customer_phone: (b.customer as any)?.phone || '-',
              package_name: (b.departure as any)?.package?.name || '-',
              departure_date: (b.departure as any)?.departure_date || '',
              total_pax: b.total_pax || 0,
              room_type: (b as any).room_type || '-',
              total_price: b.total_price || 0,
              paid_amount: b.paid_amount || 0,
              remaining_amount: b.remaining_amount || 0,
              booking_status: b.booking_status || 'pending',
              payment_status: b.payment_status || 'pending',
              created_at: b.created_at || '',
            }));

            exportDynamicBookingExcel(
              mappedData,
              company,
              styleConfig,
              dateFrom ? new Date(dateFrom) : undefined,
              dateTo ? new Date(dateTo) : undefined
            );
            toast({ title: "Export berhasil", description: "File Excel telah diunduh" });
          }}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Booking</p>
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground mt-1">Revenue: {formatCurrency(stats.totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Menunggu Konfirmasi</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Terkonfirmasi</p>
            <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Belum Bayar</p>
            <p className="text-2xl font-bold text-red-600">{stats.unpaid}</p>
            <p className="text-xs text-muted-foreground mt-1">Terkumpul: {formatCurrency(stats.totalPaid)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Period Stats - Jumlah Jamaah */}
      <Card className="border-2 border-primary/20">
        <Collapsible open={isStatsExpanded} onOpenChange={setIsStatsExpanded}>
          <CollapsibleTrigger asChild>
            <div className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h2 className="font-bold text-lg">Statistik Jamaah per Periode</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">{isStatsExpanded ? 'Tutup' : 'Buka'}</span>
                  <ChevronDown className={`h-5 w-5 text-primary transition-transform duration-200 ${isStatsExpanded ? 'rotate-0' : '-rotate-90'}`} />
                </div>
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t">
            <div className="p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={periodPreset} onValueChange={setPeriodPreset}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Waktu</SelectItem>
                  <SelectItem value="today">Hari Ini</SelectItem>
                  <SelectItem value="week">Minggu Ini</SelectItem>
                  <SelectItem value="month">Bulan Ini</SelectItem>
                  <SelectItem value="3m">3 Bulan Terakhir</SelectItem>
                  <SelectItem value="6m">6 Bulan Terakhir</SelectItem>
                  <SelectItem value="9m">9 Bulan Terakhir</SelectItem>
                  <SelectItem value="12m">12 Bulan Terakhir</SelectItem>
                  <SelectItem value="custom">Pilih Tanggal</SelectItem>
                </SelectContent>
              </Select>
              {periodPreset === "custom" && (
                <>
                  <Input type="date" value={customPeriodFrom} onChange={e => setCustomPeriodFrom(e.target.value)} className="w-[150px]" />
                  <span className="text-muted-foreground text-sm">s/d</span>
                  <Input type="date" value={customPeriodTo} onChange={e => setCustomPeriodTo(e.target.value)} className="w-[150px]" />
                </>
              )}
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  if (!periodStats || !periodRange) return;

                  const styleConfig = resolveExcelStyle(getSetting);

                  exportDynamicStatisticsExcel(
                    periodStats as any,
                    company,
                    periodRange.label,
                    periodRange.from.toISOString().slice(0, 10),
                    periodRange.to.toISOString().slice(0, 10),
                    styleConfig
                  );
                  toast({ title: 'Unduh dimulai', description: 'File Excel telah diunduh.' });
                }}
              >
                <Download className="h-4 w-4 mr-1" />
                Unduh Excel
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Jumlah Jamaah ({periodRange?.label || '-'})</p>
              <p className="text-3xl font-bold text-primary">{periodStats?.totalPax ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">orang</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Jumlah Booking</p>
              <p className="text-3xl font-bold">{periodStats?.totalBookings ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">transaksi</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Total Nilai</p>
              <p className="text-2xl font-bold">{formatCurrency(periodStats?.totalRevenue ?? 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">revenue</p>
            </div>
          </div>

          {/* Status breakdown */}
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Komposisi per Status Booking</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { key: 'confirmed', label: 'Terkonfirmasi', dot: 'bg-green-500' },
                { key: 'pending', label: 'Menunggu', dot: 'bg-yellow-500' },
                { key: 'processing', label: 'Diproses', dot: 'bg-blue-500' },
                { key: 'completed', label: 'Selesai', dot: 'bg-emerald-600' },
              ].map(s => {
                const stat = periodStats?.byStatus?.[s.key] || { pax: 0, bookings: 0 };
                const pct = (periodStats?.totalPax || 0) > 0 ? Math.round((stat.pax / periodStats!.totalPax) * 100) : 0;
                return (
                  <div key={s.key} className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                      <span className="text-xs text-muted-foreground">{s.label}</span>
                    </div>
                    <p className="text-xl font-bold">{stat.pax}</p>
                    <p className="text-xs text-muted-foreground">{stat.bookings} booking · {pct}%</p>
                  </div>
                );
              })}
            </div>
          </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari kode booking, nama, atau telepon..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? "bg-muted" : ""}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">{activeFilterCount}</Badge>
            )}
          </Button>
        </div>

        {showFilters && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Status Booking</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Konfirmasi</SelectItem>
                      <SelectItem value="processing">Proses</SelectItem>
                      <SelectItem value="completed">Selesai</SelectItem>
                      <SelectItem value="cancelled">Batal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Status Pembayaran</label>
                  <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Pembayaran</SelectItem>
                      <SelectItem value="pending">Belum Bayar</SelectItem>
                      <SelectItem value="partial">Sebagian</SelectItem>
                      <SelectItem value="paid">Lunas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Paket</label>
                  <Select value={packageFilter} onValueChange={setPackageFilter}>
                    <SelectTrigger><SelectValue placeholder="Semua Paket" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Paket</SelectItem>
                      {filterOptions.packages.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Keberangkatan</label>
                  <Select value={departureFilter} onValueChange={setDepartureFilter}>
                    <SelectTrigger><SelectValue placeholder="Semua Keberangkatan" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Keberangkatan</SelectItem>
                      {filterOptions.departures.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Cabang</label>
                  <Select value={branchFilter} onValueChange={setBranchFilter}>
                    <SelectTrigger><SelectValue placeholder="Semua Cabang" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Cabang</SelectItem>
                      {filterOptions.branches.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Tanggal Dari</label>
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Tanggal Sampai</label>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>

                {hasActiveFilters && (
                  <div className="flex items-end">
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full">
                      <X className="h-4 w-4 mr-1" />
                      Reset Semua Filter
                    </Button>
                  </div>
                )}
              </div>

              {/* Active filter chips */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                  {statusFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Status: {STATUS_LABELS[statusFilter] || statusFilter}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setStatusFilter("all")} />
                    </Badge>
                  )}
                  {paymentFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Bayar: {PAYMENT_LABELS[paymentFilter] || paymentFilter}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setPaymentFilter("all")} />
                    </Badge>
                  )}
                  {packageFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Paket: {filterOptions.packages.find(p => p.id === packageFilter)?.name}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setPackageFilter("all")} />
                    </Badge>
                  )}
                  {departureFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Keberangkatan
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setDepartureFilter("all")} />
                    </Badge>
                  )}
                  {branchFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Cabang: {filterOptions.branches.find(b => b.id === branchFilter)?.name}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setBranchFilter("all")} />
                    </Badge>
                  )}
                  {dateFrom && (
                    <Badge variant="secondary" className="gap-1">
                      Dari: {dateFrom}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setDateFrom("")} />
                    </Badge>
                  )}
                  {dateTo && (
                    <Badge variant="secondary" className="gap-1">
                      Sampai: {dateTo}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setDateTo("")} />
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bookings List */}
      <Card>
        <div className="border-b p-4 bg-muted/30 flex items-center gap-3">
          <Checkbox 
            checked={selectedBookings.length > 0 && selectedBookings.length === paginatedBookings?.length}
            onCheckedChange={toggleAll}
          />
          <span className="text-sm font-medium">Pilih Semua</span>
          <span className="text-xs text-muted-foreground ml-auto">
            Halaman {currentPage} dari {totalPages || 1}
          </span>
        </div>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingState />
          ) : !paginatedBookings || paginatedBookings.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title={hasActiveFilters ? 'Tidak ada booking yang cocok' : 'Belum ada booking'}
              description={hasActiveFilters ? 'Coba ubah filter pencarian' : 'Booking baru akan muncul di sini'}
            />
          ) : (
            <div className="divide-y">
              {paginatedBookings.map((booking) => {
                const customer = booking.customer as any;
                const departure = booking.departure as any;
                const bookingStatus = booking.booking_status || 'pending';
                const paymentStatus = booking.payment_status || 'pending';
                const paymentPercent = booking.total_price > 0
                  ? Math.min(100, Math.round(((booking.paid_amount || 0) / booking.total_price) * 100))
                  : 0;
                const isDeadlineSoon = (booking as any).payment_deadline && 
                  new Date((booking as any).payment_deadline).getTime() - Date.now() < 24 * 60 * 60 * 1000 &&
                  new Date((booking as any).payment_deadline).getTime() > Date.now() &&
                  paymentStatus !== 'paid';
                const isOverdue = (booking as any).payment_deadline &&
                  new Date((booking as any).payment_deadline).getTime() < Date.now() &&
                  paymentStatus !== 'paid';

                return (
                  <div key={booking.id} className={`p-4 hover:bg-muted/50 transition-colors ${selectedBookings.includes(booking.id) ? 'bg-primary/5' : ''} ${isOverdue ? 'border-l-4 border-l-destructive' : isDeadlineSoon ? 'border-l-4 border-l-yellow-500' : ''}`}>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox 
                          className="mt-1"
                          checked={selectedBookings.includes(booking.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedBookings(prev => [...prev, booking.id]);
                            } else {
                              setSelectedBookings(prev => prev.filter(id => id !== booking.id));
                            }
                          }}
                        />
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-semibold">{booking.booking_code}</span>
                            <StatusBadge status={bookingStatus} label={STATUS_LABELS[bookingStatus] || bookingStatus} />
                            <StatusBadge status={paymentStatus === 'pending' ? 'unpaid' : paymentStatus} label={PAYMENT_LABELS[paymentStatus] || paymentStatus} />
                            {isOverdue && (
                              <Badge variant="destructive" className="gap-1 text-xs">
                                <AlertTriangle className="h-3 w-3" />
                                Jatuh Tempo
                              </Badge>
                            )}
                            {isDeadlineSoon && !isOverdue && (
                              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 gap-1 text-xs">
                                <Clock className="h-3 w-3" />
                                Hampir Jatuh Tempo
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium">{customer?.full_name || '-'}</p>
                          <p className="text-sm text-muted-foreground">
                            {departure?.package?.name || '-'}
                          </p>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {departure?.departure_date ? formatDate(departure.departure_date) : '-'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {booking.total_pax} pax
                            </span>
                            {customer?.phone && (
                              <span>{customer.phone}</span>
                            )}
                          </div>

                          {/* Payment progress bar */}
                          <div className="max-w-xs space-y-1 pt-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Pembayaran</span>
                              <span className="font-medium">{paymentPercent}%</span>
                            </div>
                            <Progress value={paymentPercent} className="h-2" />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(booking.total_price)}</p>
                          <p className="text-xs text-muted-foreground">
                            Dibayar: {formatCurrency(booking.paid_amount || 0)}
                          </p>
                          {(booking.remaining_amount || 0) > 0 && (
                            <p className="text-xs text-destructive font-medium">
                              Sisa: {formatCurrency(booking.remaining_amount || 0)}
                            </p>
                          )}
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/admin/bookings/${booking.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            Detail
                          </Link>
                        </Button>
                        {(paymentStatus === 'pending' || paymentStatus === 'partial') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-950/30"
                            onClick={async (e) => {
                              e.preventDefault();
                              try {
                                const res = await fetch('/api/whatsapp/payment-reminder', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ booking_id: booking.id }),
                                });
                                const data = await res.json();
                                if (data?.success) {
                                  toast({ title: "Reminder terkirim", description: `WhatsApp tagihan dikirim ke ${customer?.full_name}` });
                                } else {
                                  toast({ title: "Gagal mengirim", description: data?.error || data?.message || 'Periksa konfigurasi WhatsApp', variant: "destructive" });
                                }
                              } catch (err: any) {
                                toast({ title: "Gagal", description: err.message || 'Tidak dapat mengirim reminder', variant: "destructive" });
                              }
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Tagih
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) {
                page = i + 1;
              } else if (currentPage <= 3) {
                page = i + 1;
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i;
              } else {
                page = currentPage - 2 + i;
              }
              return (
                <PaginationItem key={page}>
                  <PaginationLink
                    isActive={page === currentPage}
                    onClick={() => setCurrentPage(page)}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <PaginationItem><PaginationEllipsis /></PaginationItem>
            )}
            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Results count */}
      {paginatedBookings && paginatedBookings.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Menampilkan {((currentPage - 1) * PAGE_SIZE) + 1}-{Math.min(currentPage * PAGE_SIZE, totalCount)} dari {totalCount} booking
        </p>
      )}
    </div>
  );
}
