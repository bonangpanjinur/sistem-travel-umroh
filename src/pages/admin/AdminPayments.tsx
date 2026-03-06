import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Payment } from "@/types/database";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/format";
import { exportToExcel } from "@/lib/export-utils";
import { toast } from "sonner";
import { 
  CheckCircle, XCircle, Eye, Clock, 
  CreditCard, User, Calendar,
  Search, Filter, Download, AlertCircle, X, ImageIcon,
  Bell, Loader2
} from "lucide-react";

const PAGE_SIZE = 20;

export default function AdminPayments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [showProofDialog, setShowProofDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSendingReminders, setIsSendingReminders] = useState(false);

  const { data: payments, isLoading } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: async (): Promise<Payment[]> => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          booking:bookings(
            id,
            booking_code,
            total_price,
            remaining_amount,
            paid_amount,
            customer:customers(id, full_name, phone, email)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as Payment[];
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ paymentId, status, notes }: { paymentId: string; status: 'paid' | 'failed'; notes?: string }) => {
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .update({
          status,
          verified_at: new Date().toISOString(),
          verified_by: user?.id,
          notes: notes || null,
        })
        .eq('id', paymentId)
        .select('booking_id, amount')
        .single();

      if (paymentError) throw paymentError;

      // paid_amount & payment_status are automatically updated by the
      // database trigger `update_booking_paid_amount` — no manual update needed.

      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      toast.success('Pembayaran berhasil diverifikasi');
      setSelectedPayment(null);
      setShowRejectDialog(false);
      setShowProofDialog(false);
      setRejectReason("");
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal memverifikasi pembayaran');
    },
  });

  const handleApprove = (payment: Payment) => {
    verifyMutation.mutate({ paymentId: payment.id, status: 'paid' });
  };

  const handleReject = () => {
    if (!selectedPayment) return;
    verifyMutation.mutate({ 
      paymentId: selectedPayment.id, 
      status: 'failed',
      notes: rejectReason 
    });
  };

  const openProofDialog = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowProofDialog(true);
  };

  // Unique methods for filter
  const paymentMethods = useMemo(() => {
    if (!payments) return [];
    const methods = new Set<string>();
    payments.forEach(p => { if (p.payment_method) methods.add(p.payment_method); });
    return Array.from(methods);
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return payments?.filter(payment => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const booking = payment.booking as any;
        const match = 
          payment.payment_code.toLowerCase().includes(search) ||
          booking?.booking_code?.toLowerCase().includes(search) ||
          booking?.customer?.full_name?.toLowerCase().includes(search);
        if (!match) return false;
      }
      if (statusFilter !== "all" && payment.status !== statusFilter) return false;
      if (methodFilter !== "all" && payment.payment_method !== methodFilter) return false;
      if (dateFrom && payment.created_at && payment.created_at < dateFrom) return false;
      if (dateTo && payment.created_at && payment.created_at > dateTo + 'T23:59:59') return false;
      return true;
    });
  }, [payments, searchTerm, statusFilter, methodFilter, dateFrom, dateTo]);

  const activeFilterCount = [
    statusFilter !== "all",
    methodFilter !== "all",
    !!dateFrom,
    !!dateTo,
  ].filter(Boolean).length;

  const hasActiveFilters = !!searchTerm || activeFilterCount > 0;

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setMethodFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  // Pagination for "all" tab
  const totalPages = Math.ceil((filteredPayments?.length || 0) / PAGE_SIZE);
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredPayments?.slice(start, start + PAGE_SIZE);
  }, [filteredPayments, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, methodFilter, dateFrom, dateTo]);

  const pendingPayments = payments?.filter(p => p.status === 'pending') || [];
  const paidPayments = payments?.filter(p => p.status === 'paid') || [];
  const failedPayments = payments?.filter(p => p.status === 'failed') || [];

  // Stats by method
  const methodStats = useMemo(() => {
    if (!payments) return [];
    const map = new Map<string, { count: number; amount: number }>();
    payments.filter(p => p.status === 'paid').forEach(p => {
      const m = p.payment_method || 'Lainnya';
      const prev = map.get(m) || { count: 0, amount: 0 };
      map.set(m, { count: prev.count + 1, amount: prev.amount + p.amount });
    });
    return Array.from(map, ([method, data]) => ({ method, ...data })).sort((a, b) => b.amount - a.amount);
  }, [payments]);

  const stats = {
    pending: pendingPayments.length,
    pendingAmount: pendingPayments.reduce((sum, p) => sum + p.amount, 0),
    paid: paidPayments.length,
    paidAmount: paidPayments.reduce((sum, p) => sum + p.amount, 0),
    failed: failedPayments.length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Disetujui</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Menunggu</Badge>;
      case 'failed':
        return <Badge variant="destructive">Ditolak</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Verifikasi Pembayaran</h1>
          <p className="text-muted-foreground">Kelola dan verifikasi bukti pembayaran</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={async () => {
              setIsSendingReminders(true);
              try {
                const { data, error } = await supabase.functions.invoke('send-payment-reminder', {
                  body: { reminder_type: 'all' }
                });
                if (error) throw error;
                toast.success(`Reminder terkirim: ${data.summary?.sent || 0} berhasil, ${data.summary?.failed || 0} gagal`);
              } catch (err: any) {
                toast.error(err.message || 'Gagal mengirim reminder');
              } finally {
                setIsSendingReminders(false);
              }
            }}
            disabled={isSendingReminders}
          >
            {isSendingReminders ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Bell className="h-4 w-4 mr-2" />
            )}
            Kirim Reminder
          </Button>
          <Button variant="outline" onClick={() => {
            if (!payments || payments.length === 0) return;
            exportToExcel(
              filteredPayments || payments,
              [
                { header: 'Kode Pembayaran', accessor: 'payment_code', width: 20 },
                { header: 'Kode Booking', accessor: (r: any) => (r.booking as any)?.booking_code || '-', width: 20 },
                { header: 'Nama', accessor: (r: any) => (r.booking as any)?.customer?.full_name || '-', width: 25 },
                { header: 'Metode', accessor: 'payment_method', width: 18 },
                { header: 'Bank', accessor: 'bank_name', width: 15 },
                { header: 'Jumlah', accessor: 'amount', width: 18 },
                { header: 'Status', accessor: (r: any) => r.status === 'paid' ? 'Disetujui' : r.status === 'pending' ? 'Menunggu' : 'Ditolak', width: 14 },
                { header: 'Tanggal', accessor: (r: any) => r.created_at ? formatDate(r.created_at) : '-', width: 15 },
              ],
              `pembayaran-${new Date().toISOString().slice(0, 10)}`,
              'Pembayaran'
            );
            toast.success('File Excel telah diunduh');
          }}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <p className="text-sm text-muted-foreground">Menunggu Verifikasi</p>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(stats.pendingAmount)}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-sm text-muted-foreground">Disetujui</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(stats.paidAmount)}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-muted-foreground">Ditolak</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">Total Transaksi</p>
            </div>
            <p className="text-2xl font-bold">{payments?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Method breakdown */}
      {methodStats.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {methodStats.slice(0, 4).map(ms => (
            <Card key={ms.method}>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground font-medium">{ms.method}</p>
                <p className="text-lg font-bold">{formatCurrency(ms.amount)}</p>
                <p className="text-xs text-muted-foreground">{ms.count} transaksi</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Menunggu ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="all">Semua Pembayaran</TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending" className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : pendingPayments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <p className="text-muted-foreground">Tidak ada pembayaran yang menunggu verifikasi</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingPayments.map((payment) => (
                <PendingPaymentCard
                  key={payment.id}
                  payment={payment}
                  onViewProof={() => openProofDialog(payment)}
                  onApprove={() => handleApprove(payment)}
                  onReject={() => {
                    setSelectedPayment(payment);
                    setShowRejectDialog(true);
                  }}
                  isPending={verifyMutation.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* All Payments Tab */}
        <TabsContent value="all" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari kode pembayaran, booking, atau nama..."
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Status</SelectItem>
                        <SelectItem value="pending">Menunggu</SelectItem>
                        <SelectItem value="paid">Disetujui</SelectItem>
                        <SelectItem value="failed">Ditolak</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Metode Pembayaran</label>
                    <Select value={methodFilter} onValueChange={setMethodFilter}>
                      <SelectTrigger><SelectValue placeholder="Semua Metode" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Metode</SelectItem>
                        {paymentMethods.map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
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
                </div>

                {hasActiveFilters && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                    {statusFilter !== "all" && (
                      <Badge variant="secondary" className="gap-1">
                        Status: {statusFilter === 'paid' ? 'Disetujui' : statusFilter === 'pending' ? 'Menunggu' : 'Ditolak'}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => setStatusFilter("all")} />
                      </Badge>
                    )}
                    {methodFilter !== "all" && (
                      <Badge variant="secondary" className="gap-1">
                        Metode: {methodFilter}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => setMethodFilter("all")} />
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
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-1" />
                      Reset
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : !paginatedPayments || paginatedPayments.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  Tidak ada pembayaran yang ditemukan
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kode Pembayaran</TableHead>
                        <TableHead>Booking</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Metode</TableHead>
                        <TableHead className="text-right">Jumlah</TableHead>
                        <TableHead>Bukti</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPayments.map((payment) => {
                        const booking = payment.booking as any;
                        const isPending = payment.status === 'pending';
                        return (
                          <TableRow key={payment.id} className={isPending ? 'bg-yellow-50/50 dark:bg-yellow-950/10' : ''}>
                            <TableCell className="font-mono text-sm">
                              {payment.payment_code}
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-sm">{booking?.booking_code}</span>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{booking?.customer?.full_name}</p>
                                <p className="text-xs text-muted-foreground">{booking?.customer?.phone}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p>{payment.payment_method || '-'}</p>
                                <p className="text-xs text-muted-foreground">{payment.bank_name}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div>
                                <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                                {booking?.total_price && (
                                  <p className="text-xs text-muted-foreground">
                                    Sisa: {formatCurrency(booking.remaining_amount || 0)}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {payment.proof_url ? (
                                <button 
                                  onClick={() => openProofDialog(payment)}
                                  className="block w-10 h-10 rounded border overflow-hidden hover:ring-2 hover:ring-primary transition-all cursor-pointer"
                                >
                                  <img 
                                    src={payment.proof_url} 
                                    alt="Bukti" 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                      (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-muted"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div>';
                                    }}
                                  />
                                </button>
                              ) : (
                                <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Belum
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>{getStatusBadge(payment.status || 'pending')}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(payment.created_at || '')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {payment.proof_url && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => openProofDialog(payment)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                                {isPending && (
                                  <>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      className="text-green-600 hover:text-green-700"
                                      onClick={() => handleApprove(payment)}
                                      disabled={verifyMutation.isPending}
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => {
                                        setSelectedPayment(payment);
                                        setShowRejectDialog(true);
                                      }}
                                      disabled={verifyMutation.isPending}
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
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

          {filteredPayments && filteredPayments.length > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              Menampilkan {((currentPage - 1) * PAGE_SIZE) + 1}-{Math.min(currentPage * PAGE_SIZE, filteredPayments.length)} dari {filteredPayments.length} pembayaran
            </p>
          )}
        </TabsContent>
      </Tabs>

      {/* Proof Dialog */}
      <Dialog open={showProofDialog} onOpenChange={setShowProofDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bukti Pembayaran - {selectedPayment?.payment_code}</DialogTitle>
            <DialogDescription>
              {(selectedPayment?.booking as any)?.customer?.full_name} • {formatCurrency(selectedPayment?.amount || 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPayment?.proof_url ? (
              <div className="relative">
                <img 
                  src={selectedPayment.proof_url} 
                  alt="Bukti Pembayaran"
                  className="w-full max-h-[60vh] object-contain rounded-lg border cursor-zoom-in"
                  onClick={() => {
                    const img = document.createElement('div');
                    img.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;cursor:zoom-out';
                    img.onclick = () => img.remove();
                    const imgEl = document.createElement('img');
                    imgEl.src = selectedPayment.proof_url;
                    imgEl.style.cssText = 'max-width:95vw;max-height:95vh;object-fit:contain';
                    img.appendChild(imgEl);
                    document.body.appendChild(img);
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ImageIcon className="h-12 w-12 mb-4" />
                <p>Bukti pembayaran belum diupload</p>
              </div>
            )}
            
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Metode Pembayaran</span>
                <span>{selectedPayment?.payment_method || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bank</span>
                <span>{selectedPayment?.bank_name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">No. Rekening</span>
                <span>{selectedPayment?.account_number || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Atas Nama</span>
                <span>{selectedPayment?.account_name || '-'}</span>
              </div>
            </div>
          </div>
          {selectedPayment?.status === 'pending' && (
            <DialogFooter className="gap-2">
              <Button 
                variant="destructive" 
                onClick={() => {
                  setShowProofDialog(false);
                  setShowRejectDialog(true);
                }}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Tolak
              </Button>
              <Button 
                onClick={() => handleApprove(selectedPayment)}
                disabled={verifyMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Setujui Pembayaran
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Tolak Pembayaran
            </DialogTitle>
            <DialogDescription>
              Pembayaran {selectedPayment?.payment_code} akan ditolak
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Alasan Penolakan</label>
              <Textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Masukkan alasan penolakan pembayaran..."
                rows={3}
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Batal
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={verifyMutation.isPending || !rejectReason.trim()}
            >
              Tolak Pembayaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface PendingPaymentCardProps {
  payment: any;
  onViewProof: () => void;
  onApprove: () => void;
  onReject: () => void;
  isPending: boolean;
}

function PendingPaymentCard({ payment, onViewProof, onApprove, onReject, isPending }: PendingPaymentCardProps) {
  const booking = payment.booking as any;
  const totalPrice = booking?.total_price || 0;
  const paidAmount = booking?.paid_amount || 0;
  const progressPct = totalPrice > 0 ? Math.min((paidAmount / totalPrice) * 100, 100) : 0;
  const willComplete = (paidAmount + payment.amount) >= totalPrice;
  const hasProof = !!payment.proof_url;

  return (
    <Card className="border-2 border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/20">
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            {/* Inline proof thumbnail */}
            {hasProof ? (
              <button onClick={onViewProof} className="shrink-0 w-16 h-16 rounded-lg border overflow-hidden hover:ring-2 hover:ring-primary transition-all cursor-pointer">
                <img src={payment.proof_url} alt="Bukti" className="w-full h-full object-cover" />
              </button>
            ) : (
              <div className="shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-orange-400 bg-orange-50 dark:bg-orange-950/20 flex flex-col items-center justify-center">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <span className="text-[9px] text-orange-600 font-medium">No Bukti</span>
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono font-semibold">{payment.payment_code}</span>
                <Badge className="bg-yellow-100 text-yellow-800">Menunggu Verifikasi</Badge>
                {!hasProof && (
                  <Badge variant="destructive" className="text-xs">Belum Upload Bukti</Badge>
                )}
                {willComplete && (
                  <Badge className="bg-green-100 text-green-800 text-xs">🎉 Akan Lunas</Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {booking?.customer?.full_name}
                </span>
                <span>Booking: {booking?.booking_code}</span>
              </div>
              {/* Payment progress bar */}
              <div className="flex items-center gap-2 max-w-xs">
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatCurrency(paidAmount)}/{formatCurrency(totalPrice)} ({progressPct.toFixed(0)}%)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(payment.created_at || '')}
                </span>
                <span>{payment.payment_method} • {payment.bank_name}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="text-left sm:text-right">
              <p className="text-2xl font-bold text-primary">{formatCurrency(payment.amount)}</p>
              <p className="text-xs text-muted-foreground">
                Sisa tagihan: {formatCurrency(booking?.remaining_amount || 0)}
              </p>
            </div>
            
            <div className="flex gap-2">
              {hasProof && (
                <Button variant="outline" size="sm" onClick={onViewProof}>
                  <Eye className="h-4 w-4 mr-1" />
                  Bukti
                </Button>
              )}
              <Button 
                size="sm" 
                onClick={onApprove}
                disabled={isPending || !hasProof}
                className="bg-green-600 hover:bg-green-700"
                title={!hasProof ? 'Bukti pembayaran belum diupload' : ''}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Setujui
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={onReject}
                disabled={isPending}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Tolak
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
