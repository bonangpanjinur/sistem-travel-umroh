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
import { exportBookingsToPDF } from "@/lib/booking-pdf-exporter";
import { exportStatisticsToPDF } from "@/lib/statistics-pdf-exporter";
import { useCompanySettings } from "@/hooks/useCompanySettings";
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

  const { getSetting } = useCompanySettings();

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

  // Get company info
  const companyInfo = {
    company_name: getSetting('company_name') || 'Vins Tour Travel',
    company_address: getSetting('company_address') || 'Alamat Perusahaan',
    company_phone: getSetting('company_phone') || '0812-3456-7890',
    company_email: getSetting('company_email') || 'info@vinstour.com',
  };

  // Export handlers
  const handleExportBookingsPDF = async () => {
    if (!bookings) return;
    setIsExporting(true);

    try {
      const bookingData = bookings.map((b: any) => ({
        booking_code: b.booking_code,
        customer_name: b.customer?.full_name || '-',
        customer_phone: b.customer?.phone || '-',
        package_name: b.departure?.package?.name || '-',
        departure_date: b.departure?.departure_date || new Date().toISOString(),
        return_date: b.departure?.return_date || new Date().toISOString(),
        total_pax: b.total_pax || 0,
        room_type: b.room_type || '-',
        total_price: Number(b.total_price) || 0,
        paid_amount: Number(b.paid_amount) || 0,
        remaining_amount: Number(b.remaining_amount) || 0,
        booking_status: b.booking_status || 'pending',
        payment_status: b.payment_status || 'pending',
        created_at: b.created_at || new Date().toISOString(),
      }));

      const subtitle = `Periode: ${formatDateRange(dateRange.from, dateRange.to)}`;

      await exportBookingsToPDF(bookingData, companyInfo, {
        title: 'Laporan Data Booking',
        subtitle: subtitle,
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportBookingsExcel = async (type: 'excel' | 'pdf') => {
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
    const title = 'Laporan Pembayaran';
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
      { header: 'Kode Agen', accessor: (r: any) => r.agent?.agent_code || '-', width: 15 },
      { header: 'Nama Agen', accessor: (r: any) => r.agent?.company_name || '-', width: 25 },
      { header: 'Kode Booking', accessor: (r: any) => r.booking?.booking_code || '-', width: 18 },
      { header: 'Komisi', accessor: (r: any) => formatCurrency(r.commission_amount), width: 18 },
      { header: 'Status', accessor: (r: any) => COMMISSION_STATUS_LABELS[r.status] || r.status, width: 12 },
      { header: 'Tanggal', accessor: (r: any) => format(new Date(r.created_at), 'd MMM yyyy', { locale: id }), width: 15 },
      { header: 'Tanggal Bayar', accessor: (r: any) => 
        r.paid_at ? format(new Date(r.paid_at), 'd MMM yyyy', { locale: id }) : '-', width: 15 },
    ];

    const filename = `Laporan_Komisi_${format(new Date(), 'yyyyMMdd_HHmmss')}`;
    const title = 'Laporan Komisi Agen';
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Laporan & Export</h1>
          <p className="text-muted-foreground">Export data booking, pembayaran, dan komisi</p>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Periode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button
              variant={dateRange.from?.toDateString() === startOfMonth(new Date()).toDateString() ? "default" : "outline"}
              onClick={() => setPresetRange("thisMonth")}
              size="sm"
            >
              Bulan Ini
            </Button>
            <Button
              variant={dateRange.from?.toDateString() === startOfMonth(subMonths(new Date(), 1)).toDateString() ? "default" : "outline"}
              onClick={() => setPresetRange("lastMonth")}
              size="sm"
            >
              Bulan Lalu
            </Button>
            <Button
              variant={dateRange.from?.toDateString() === startOfMonth(subMonths(new Date(), 2)).toDateString() ? "default" : "outline"}
              onClick={() => setPresetRange("last3Months")}
              size="sm"
            >
              3 Bulan
            </Button>
            <Button
              variant={!dateRange.from ? "default" : "outline"}
              onClick={() => setPresetRange("all")}
              size="sm"
            >
              Semua
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bookings">Booking</TabsTrigger>
          <TabsTrigger value="payments">Pembayaran</TabsTrigger>
          <TabsTrigger value="commissions">Komisi</TabsTrigger>
        </TabsList>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Data Booking</CardTitle>
                  <CardDescription>Laporan lengkap booking jamaah</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleExportBookingsPDF}
                    disabled={isExporting || !bookings?.length}
                    size="sm"
                  >
                    {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                    Export PDF Profesional
                  </Button>
                  <Button
                    onClick={() => handleExportBookingsExcel('excel')}
                    disabled={isExporting || !bookings?.length}
                    variant="outline"
                    size="sm"
                  >
                    {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
                    Excel
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Total Booking</p>
                      <p className="text-2xl font-bold text-blue-600">{bookingStats.total}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-green-100">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Total Jamaah</p>
                      <p className="text-2xl font-bold text-green-600">{bookingStats.totalPax}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Total Pendapatan</p>
                      <p className="text-xl font-bold text-purple-600">{formatCurrency(bookingStats.totalRevenue)}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Terbayar</p>
                      <p className="text-xl font-bold text-orange-600">{formatCurrency(bookingStats.totalPaid)}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Table */}
              {bookingsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : bookings && bookings.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kode Booking</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Paket</TableHead>
                        <TableHead>Pax</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings.slice(0, 10).map((booking: any) => (
                        <TableRow key={booking.id}>
                          <TableCell className="font-mono text-sm">{booking.booking_code}</TableCell>
                          <TableCell>{booking.customer?.full_name}</TableCell>
                          <TableCell>{booking.departure?.package?.name}</TableCell>
                          <TableCell>{booking.total_pax}</TableCell>
                          <TableCell>{formatCurrency(booking.total_price)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{BOOKING_STATUS_LABELS[booking.booking_status]}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Tidak ada data booking</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Data Pembayaran</CardTitle>
                  <CardDescription>Laporan pembayaran jamaah</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleExportPayments('excel')}
                    disabled={isExporting || !payments?.length}
                    size="sm"
                  >
                    {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
                    Export Excel
                  </Button>
                  <Button
                    onClick={() => handleExportPayments('pdf')}
                    disabled={isExporting || !payments?.length}
                    variant="outline"
                    size="sm"
                  >
                    {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                    PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Total Pembayaran</p>
                      <p className="text-2xl font-bold text-blue-600">{paymentStats.total}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-green-100">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Sudah Verifikasi</p>
                      <p className="text-2xl font-bold text-green-600">{paymentStats.paidCount}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Menunggu</p>
                      <p className="text-2xl font-bold text-yellow-600">{paymentStats.pendingCount}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Total Jumlah</p>
                      <p className="text-xl font-bold text-purple-600">{formatCurrency(paymentStats.totalAmount)}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Table */}
              {paymentsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : payments && payments.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kode Pembayaran</TableHead>
                        <TableHead>Booking</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Jumlah</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.slice(0, 10).map((payment: any) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono text-sm">{payment.payment_code}</TableCell>
                          <TableCell>{payment.booking?.booking_code}</TableCell>
                          <TableCell>{payment.booking?.customer?.full_name}</TableCell>
                          <TableCell>{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{PAYMENT_STATUS_LABELS[payment.status]}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Tidak ada data pembayaran</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commissions Tab */}
        <TabsContent value="commissions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Data Komisi</CardTitle>
                  <CardDescription>Laporan komisi agen</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleExportCommissions('excel')}
                    disabled={isExporting || !commissions?.length}
                    size="sm"
                  >
                    {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
                    Export Excel
                  </Button>
                  <Button
                    onClick={() => handleExportCommissions('pdf')}
                    disabled={isExporting || !commissions?.length}
                    variant="outline"
                    size="sm"
                  >
                    {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                    PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Total Komisi</p>
                      <p className="text-2xl font-bold text-blue-600">{commissionStats.total}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-green-100">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Sudah Dibayar</p>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(commissionStats.paidAmount)}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Menunggu Bayar</p>
                      <p className="text-xl font-bold text-yellow-600">{formatCurrency(commissionStats.pendingAmount)}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Total Jumlah</p>
                      <p className="text-xl font-bold text-purple-600">{formatCurrency(commissionStats.totalAmount)}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Table */}
              {commissionsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : commissions && commissions.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agen</TableHead>
                        <TableHead>Booking</TableHead>
                        <TableHead>Komisi</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissions.slice(0, 10).map((commission: any) => (
                        <TableRow key={commission.id}>
                          <TableCell>{commission.agent?.company_name}</TableCell>
                          <TableCell>{commission.booking?.booking_code}</TableCell>
                          <TableCell>{formatCurrency(commission.commission_amount)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{COMMISSION_STATUS_LABELS[commission.status]}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Tidak ada data komisi</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
