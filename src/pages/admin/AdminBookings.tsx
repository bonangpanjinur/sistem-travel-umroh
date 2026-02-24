
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
import { useState, useMemo, useEffect } from "react";
import { 
  Search, Eye, Calendar, Users, Filter, X, Download, ShoppingCart,
  CheckCircle, Trash2, MoreHorizontal, AlertTriangle, Clock, Loader2
} from "lucide-react";
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
  const [currentPage, setCurrentPage] = useState(1);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
        // Search by booking code or customer name/phone
        query = query.or(`booking_code.ilike.%${searchTerm}%,customer_id.in.(select id from customers where full_name.ilike.%${searchTerm}% or phone.ilike.%${searchTerm}%)`);
      }
      if (statusFilter !== "all") query = query.eq('booking_status', statusFilter);
      if (paymentFilter !== "all") query = query.eq('payment_status', paymentFilter);
      if (branchFilter !== "all") query = query.eq('branch_id', branchFilter);
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

  // Extract unique packages, departures, branches for filter options
  const filterOptions = useMemo(() => {
    if (!bookings) return { packages: [], departures: [], branches: [] };
    const pkgMap = new Map<string, string>();
    const depMap = new Map<string, string>();
    const brMap = new Map<string, string>();
    bookings.forEach(b => {
      const dep = b.departure;
      const branch = b.branch;
      if (dep?.package?.id) pkgMap.set(dep.package.id, dep.package.name);
      if (dep?.id) depMap.set(dep.id, `${formatDate(dep.departure_date)} - ${dep.package?.name || ''}`);
      if (branch?.id) brMap.set(branch.id, branch.name);
    });
    return {
      packages: Array.from(pkgMap, ([id, name]) => ({ id, name })),
      departures: Array.from(depMap, ([id, name]) => ({ id, name })),
      branches: Array.from(brMap, ([id, name]) => ({ id, name })),
    };
  }, [bookings]);

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

  const stats = {
    total: bookings?.length || 0,
    pending: bookings?.filter(b => b.booking_status === 'pending').length || 0,
    confirmed: bookings?.filter(b => b.booking_status === 'confirmed').length || 0,
    unpaid: bookings?.filter(b => b.payment_status === 'pending').length || 0,
    totalRevenue: bookings?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0,
    totalPaid: bookings?.reduce((sum, b) => sum + (b.paid_amount || 0), 0) || 0,
  };

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
            if (!filteredBookings || filteredBookings.length === 0) return;
            exportToExcel(
              filteredBookings,
              [
                { header: 'Kode Booking', accessor: 'booking_code', width: 18 },
                { header: 'Nama', accessor: (r: any) => (r.customer as any)?.full_name || '-', width: 25 },
                { header: 'Telepon', accessor: (r: any) => (r.customer as any)?.phone || '-', width: 18 },
                { header: 'Paket', accessor: (r: any) => (r.departure as any)?.package?.name || '-', width: 25 },
                { header: 'Tgl Berangkat', accessor: (r: any) => (r.departure as any)?.departure_date || '-', width: 15 },
                { header: 'Status', accessor: (r: any) => STATUS_LABELS[r.booking_status] || r.booking_status, width: 14 },
                { header: 'Pembayaran', accessor: (r: any) => PAYMENT_LABELS[r.payment_status] || r.payment_status, width: 14 },
                { header: 'Total', accessor: (r: any) => r.total_price, width: 18 },
                { header: 'Dibayar', accessor: (r: any) => r.paid_amount || 0, width: 18 },
                { header: 'Sisa', accessor: (r: any) => r.remaining_amount || 0, width: 18 },
              ],
              `booking-${new Date().toISOString().slice(0, 10)}`,
              'Bookings'
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

      {/* Search & Filters */}
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
                const isDeadlineSoon = booking.payment_deadline && 
                  new Date(booking.payment_deadline).getTime() - Date.now() < 24 * 60 * 60 * 1000 &&
                  new Date(booking.payment_deadline).getTime() > Date.now() &&
                  paymentStatus !== 'paid';
                const isOverdue = booking.payment_deadline &&
                  new Date(booking.payment_deadline).getTime() < Date.now() &&
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
      {filteredBookings && filteredBookings.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Menampilkan {((currentPage - 1) * PAGE_SIZE) + 1}-{Math.min(currentPage * PAGE_SIZE, filteredBookings.length)} dari {filteredBookings.length} booking
          {filteredBookings.length !== (bookings?.length || 0) && ` (total: ${bookings?.length})`}
        </p>
      )}
    </div>
  );
}
