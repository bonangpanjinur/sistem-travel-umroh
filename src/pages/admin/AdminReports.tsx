import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from "@/components/ui/table";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { id } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";
import { exportToExcel, exportToPDF, formatDateRange } from "@/lib/export-utils";
import {
  FileSpreadsheet, FileText, CalendarIcon, Download,
  TrendingUp, CreditCard, Users, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

type DateRange = { from: Date | undefined; to: Date | undefined };

const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Dikonfirmasi",
  processing: "Diproses",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  refunded: "Refund",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  partial: "Sebagian",
  paid: "Lunas",
  refunded: "Refund",
  failed: "Gagal",
};

const COMMISSION_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  paid: "Dibayar",
};

export default function AdminReports() {
  const [activeTab, setActiveTab] = useState("bookings");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

  // Quick date range presets
  const setPresetRange = (preset: string) => {
    const now = new Date();
    switch (preset) {
      case "thisMonth":
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case "lastMonth":
        const lastMonth = subMonths(now, 1);
        setDateRange({ from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) });
        break;
      case "last3Months":
        setDateRange({ from: startOfMonth(subMonths(now, 2)), to: endOfMonth(now) });
        break;
      case "all":
        setDateRange({ from: undefined, to: undefined });
        break;
    }
  };

  // Fetch branches for filter
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch bookings data
  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['report-bookings', dateRange, statusFilter, branchFilter],
    queryFn: async () => {
      let query = supabase
        .from('bookings')
        .select(`
          id, booking_code, room_type, total_pax, total_price, paid_amount,
          remaining_amount, booking_status, payment_status, created_at,
          customer:customers(full_name, phone),
          departure:departures(
            departure_date, return_date,
            package:packages(name, code)
          ),
          branch:branches(name)
        `)
        .order('created_at', { ascending: false });

      if (dateRange.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange.to) {
        query = query.lte('created_at', dateRange.to.toISOString());
      }
      if (statusFilter !== 'all') {
        query = query.eq('booking_status', statusFilter as any);
      }
      if (branchFilter !== 'all') {
        query = query.eq('branch_id', branchFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch payments data
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['report-payments', dateRange, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select(`
          id, payment_code, amount, payment_method, bank_name,
          status, created_at, verified_at,
          booking:bookings(
            booking_code,
            customer:customers(full_name, phone)
          )
        `)
        .order('created_at', { ascending: false });

      if (dateRange.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange.to) {
        query = query.lte('created_at', dateRange.to.toISOString());
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch commissions data
  const { data: commissions, isLoading: commissionsLoading } = useQuery({
    queryKey: ['report-commissions', dateRange, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('agent_commissions')
        .select(`
          id, commission_amount, status, created_at, paid_at, notes,
          agent:agents(agent_code, company_name, user_id),
          booking:bookings(booking_code, total_price)
        `)
        .order('created_at', { ascending: false });

      if (dateRange.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange.to) {
        query = query.lte('created_at', dateRange.to.toISOString());
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Calculate summary stats
  const bookingStats = {
    total: bookings?.length || 0,
    totalRevenue: bookings?.reduce((sum, b) => sum + Number(b.total_price), 0) || 0,
    totalPaid: bookings?.reduce((sum, b) => sum + Number(b.paid_amount), 0) || 0,
    totalPax: bookings?.reduce((sum, b) => sum + (b.total_pax || 0), 0) || 0,
  };

  const paymentStats = {
    total: payments?.length || 0,
    totalAmount: payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0,
    paidCount: payments?.filter(p => p.status === 'paid').length || 0,
    pendingCount: payments?.filter(p => p.status === 'pending').length || 0,
  };

  const commissionStats = {
    total: commissions?.length || 0,
    totalAmount: commissions?.reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0,
    paidAmount: commissions?.filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0,
    pendingAmount: commissions?.filter(c => c.status === 'pending')
      .reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0,
  };

  // Export handlers
  const handleExportBookings = async (type: 'excel' | 'pdf') => {
    if (!bookings) return;
    setIsExporting(true);

    const columns = [
      { header: 'Kode Booking', accessor: 'booking_code', width: 18 },
      { header: 'Customer', accessor: (r: any) => r.customer?.full_name || '-', width: 25 },
      { header: 'Telepon', accessor: (r: any) => r.customer?.phone || '-', width: 15 },
      { header: 'Paket', accessor: (r: any) => r.departure?.package?.name || '-', width: 30 },
      { header: 'Keberangkatan', accessor: (r: any) => 
        r.departure?.departure_date ? format(new Date(r.departure.departure_date), 'd MMM yyyy', { locale: id }) : '-', width: 15 },
      { header: 'Pax', accessor: 'total_pax', width: 8 },
      { header: 'Tipe Kamar', accessor: 'room_type', width: 12 },
      { header: 'Total Harga', accessor: (r: any) => formatCurrency(r.total_price), width: 18 },
      { header: 'Dibayar', accessor: (r: any) => formatCurrency(r.paid_amount), width: 18 },
      { header: 'Sisa', accessor: (r: any) => formatCurrency(r.remaining_amount), width: 18 },
      { header: 'Status Booking', accessor: (r: any) => BOOKING_STATUS_LABELS[r.booking_status] || r.booking_status, width: 15 },
      { header: 'Status Bayar', accessor: (r: any) => PAYMENT_STATUS_LABELS[r.payment_status] || r.payment_status, width: 12 },
      { header: 'Tanggal', accessor: (r: any) => format(new Date(r.created_at), 'd MMM yyyy', { locale: id }), width: 12 },
    ];

    const filename = `Laporan_Booking_${format(new Date(), 'yyyyMMdd_HHmmss')}`;
    const title = 'Laporan Data Booking';
    const subtitle = `Periode: ${formatDateRange(dateRange.from, dateRange.to)}`;

    try {
      if (type === 'excel') {
        exportToExcel(bookings, columns, filename, 'Bookings');
      } else {
        exportToPDF(bookings, columns, filename, title, subtitle);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPayments = async (type: 'excel' | 'pdf') => {
    if (!payments) return;
    setIsExporting(true);

    const columns = [
      { header: 'Kode Pembayaran', accessor: 'payment_code', width: 20 },
      { header: 'Kode Booking', accessor: (r: any) => r.booking?.booking_code || '-', width: 18 },
      { header: 'Customer', accessor: (r: any) => r.booking?.customer?.full_name || '-', width: 25 },
      { header: 'Metode', accessor: (r: any) => r.payment_method || '-', width: 15 },
      { header: 'Bank', accessor: (r: any) => r.bank_name || '-', width: 15 },
      { header: 'Jumlah', accessor: (r: any) => formatCurrency(r.amount), width: 18 },
      { header: 'Status', accessor: (r: any) => PAYMENT_STATUS_LABELS[r.status] || r.status, width: 12 },
      { header: 'Tanggal Bayar', accessor: (r: any) => format(new Date(r.created_at), 'd MMM yyyy', { locale: id }), width: 15 },
      { header: 'Tanggal Verifikasi', accessor: (r: any) => 
        r.verified_at ? format(new Date(r.verified_at), 'd MMM yyyy', { locale: id }) : '-', width: 15 },
    ];

    const filename = `Laporan_Pembayaran_${format(new Date(), 'yyyyMMdd_HHmmss')}`;
    const title = 'Laporan Data Pembayaran';
    const subtitle = `Periode: ${formatDateRange(dateRange.from, dateRange.to)}`;

    try {
      if (type === 'excel') {
        exportToExcel(payments, columns, filename, 'Payments');
      } else {
        exportToPDF(payments, columns, filename, title, subtitle);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCommissions = async (type: 'excel' | 'pdf') => {
    if (!commissions) return;
    setIsExporting(true);

    const columns = [
      { header: 'Kode Agent', accessor: (r: any) => r.agent?.agent_code || '-', width: 15 },
      { header: 'Nama Perusahaan', accessor: (r: any) => r.agent?.company_name || '-', width: 25 },
      { header: 'Kode Booking', accessor: (r: any) => r.booking?.booking_code || '-', width: 18 },
      { header: 'Total Booking', accessor: (r: any) => formatCurrency(r.booking?.total_price), width: 18 },
      { header: 'Komisi', accessor: (r: any) => formatCurrency(r.commission_amount), width: 18 },
      { header: 'Status', accessor: (r: any) => COMMISSION_STATUS_LABELS[r.status] || r.status, width: 12 },
      { header: 'Tanggal Dibuat', accessor: (r: any) => format(new Date(r.created_at), 'd MMM yyyy', { locale: id }), width: 15 },
      { header: 'Tanggal Dibayar', accessor: (r: any) => 
        r.paid_at ? format(new Date(r.paid_at), 'd MMM yyyy', { locale: id }) : '-', width: 15 },
      { header: 'Catatan', accessor: (r: any) => r.notes || '-', width: 25 },
    ];

    const filename = `Laporan_Komisi_${format(new Date(), 'yyyyMMdd_HHmmss')}`;
    const title = 'Laporan Data Komisi Agent';
    const subtitle = `Periode: ${formatDateRange(dateRange.from, dateRange.to)}`;

    try {
      if (type === 'excel') {
        exportToExcel(commissions, columns, filename, 'Commissions');
      } else {
        exportToPDF(commissions, columns, filename, title, subtitle);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusOptions = () => {
    switch (activeTab) {
      case 'bookings':
        return Object.entries(BOOKING_STATUS_LABELS).map(([value, label]) => ({ value, label }));
      case 'payments':
        return Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => ({ value, label }));
      case 'commissions':
        return Object.entries(COMMISSION_STATUS_LABELS).map(([value, label]) => ({ value, label }));
      default:
        return [];
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Laporan</h1>
        <p className="text-muted-foreground">Export data booking, pembayaran, dan komisi</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Date Range Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Periode</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[280px] justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "d MMM", { locale: id })} -{" "}
                          {format(dateRange.to, "d MMM yyyy", { locale: id })}
                        </>
                      ) : (
                        format(dateRange.from, "d MMMM yyyy", { locale: id })
                      )
                    ) : (
                      <span>Pilih tanggal</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Preset</label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPresetRange('thisMonth')}>
                  Bulan Ini
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPresetRange('lastMonth')}>
                  Bulan Lalu
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPresetRange('last3Months')}>
                  3 Bulan
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPresetRange('all')}>
                  Semua
                </Button>
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  {getStatusOptions().map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Branch Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Cabang</label>
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Semua Cabang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Cabang</SelectItem>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setStatusFilter('all'); }}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bookings" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Booking
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Pembayaran
          </TabsTrigger>
          <TabsTrigger value="commissions" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Komisi
          </TabsTrigger>
        </TabsList>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="space-y-4">
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Booking</p>
                <p className="text-2xl font-bold">{bookingStats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold">{formatCurrency(bookingStats.totalRevenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Dibayar</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(bookingStats.totalPaid)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Jamaah</p>
                <p className="text-2xl font-bold">{bookingStats.totalPax}</p>
              </CardContent>
            </Card>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2">
            <Button onClick={() => handleExportBookings('excel')} disabled={isExporting || !bookings?.length}>
              {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
              Export Excel
            </Button>
            <Button variant="outline" onClick={() => handleExportBookings('pdf')} disabled={isExporting || !bookings?.length}>
              {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
              Export PDF
            </Button>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {bookingsLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !bookings?.length ? (
                <div className="p-8 text-center text-muted-foreground">Tidak ada data booking</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kode</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Paket</TableHead>
                        <TableHead>Pax</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Dibayar</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tanggal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings.slice(0, 20).map((booking: any) => (
                        <TableRow key={booking.id}>
                          <TableCell className="font-mono font-medium">{booking.booking_code}</TableCell>
                          <TableCell>{booking.customer?.full_name || '-'}</TableCell>
                          <TableCell>{booking.departure?.package?.name || '-'}</TableCell>
                          <TableCell>{booking.total_pax}</TableCell>
                          <TableCell>{formatCurrency(booking.total_price)}</TableCell>
                          <TableCell className="text-green-600">{formatCurrency(booking.paid_amount)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{BOOKING_STATUS_LABELS[booking.booking_status] || booking.booking_status}</Badge>
                          </TableCell>
                          <TableCell>{format(new Date(booking.created_at), 'd MMM yyyy', { locale: id })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {bookings.length > 20 && (
                    <p className="p-4 text-center text-sm text-muted-foreground">
                      Menampilkan 20 dari {bookings.length} data. Export untuk melihat semua data.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Transaksi</p>
                <p className="text-2xl font-bold">{paymentStats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Nominal</p>
                <p className="text-xl font-bold">{formatCurrency(paymentStats.totalAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Terverifikasi</p>
                <p className="text-2xl font-bold text-green-600">{paymentStats.paidCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{paymentStats.pendingCount}</p>
              </CardContent>
            </Card>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2">
            <Button onClick={() => handleExportPayments('excel')} disabled={isExporting || !payments?.length}>
              {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
              Export Excel
            </Button>
            <Button variant="outline" onClick={() => handleExportPayments('pdf')} disabled={isExporting || !payments?.length}>
              {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
              Export PDF
            </Button>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {paymentsLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !payments?.length ? (
                <div className="p-8 text-center text-muted-foreground">Tidak ada data pembayaran</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kode Pembayaran</TableHead>
                        <TableHead>Kode Booking</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Metode</TableHead>
                        <TableHead>Jumlah</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tanggal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.slice(0, 20).map((payment: any) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono font-medium">{payment.payment_code}</TableCell>
                          <TableCell className="font-mono">{payment.booking?.booking_code || '-'}</TableCell>
                          <TableCell>{payment.booking?.customer?.full_name || '-'}</TableCell>
                          <TableCell>{payment.payment_method || '-'}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>
                            <Badge className={
                              payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                              payment.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                              'bg-red-100 text-red-800'
                            }>
                              {PAYMENT_STATUS_LABELS[payment.status] || payment.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{format(new Date(payment.created_at), 'd MMM yyyy', { locale: id })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {payments.length > 20 && (
                    <p className="p-4 text-center text-sm text-muted-foreground">
                      Menampilkan 20 dari {payments.length} data. Export untuk melihat semua data.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commissions Tab */}
        <TabsContent value="commissions" className="space-y-4">
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Transaksi</p>
                <p className="text-2xl font-bold">{commissionStats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Komisi</p>
                <p className="text-xl font-bold">{formatCurrency(commissionStats.totalAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Sudah Dibayar</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(commissionStats.paidAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Belum Dibayar</p>
                <p className="text-xl font-bold text-amber-600">{formatCurrency(commissionStats.pendingAmount)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2">
            <Button onClick={() => handleExportCommissions('excel')} disabled={isExporting || !commissions?.length}>
              {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
              Export Excel
            </Button>
            <Button variant="outline" onClick={() => handleExportCommissions('pdf')} disabled={isExporting || !commissions?.length}>
              {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
              Export PDF
            </Button>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {commissionsLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !commissions?.length ? (
                <div className="p-8 text-center text-muted-foreground">Tidak ada data komisi</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kode Agent</TableHead>
                        <TableHead>Perusahaan</TableHead>
                        <TableHead>Kode Booking</TableHead>
                        <TableHead>Total Booking</TableHead>
                        <TableHead>Komisi</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tanggal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissions.slice(0, 20).map((commission: any) => (
                        <TableRow key={commission.id}>
                          <TableCell className="font-mono font-medium">{commission.agent?.agent_code || '-'}</TableCell>
                          <TableCell>{commission.agent?.company_name || '-'}</TableCell>
                          <TableCell className="font-mono">{commission.booking?.booking_code || '-'}</TableCell>
                          <TableCell>{formatCurrency(commission.booking?.total_price)}</TableCell>
                          <TableCell className="font-semibold text-primary">{formatCurrency(commission.commission_amount)}</TableCell>
                          <TableCell>
                            <Badge className={commission.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                              {COMMISSION_STATUS_LABELS[commission.status] || commission.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{format(new Date(commission.created_at), 'd MMM yyyy', { locale: id })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {commissions.length > 20 && (
                    <p className="p-4 text-center text-sm text-muted-foreground">
                      Menampilkan 20 dari {commissions.length} data. Export untuk melihat semua data.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
