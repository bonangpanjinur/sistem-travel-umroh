import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate, getRoomTypeLabel, getBookingStatusLabel, getPaymentStatusLabel } from "@/lib/format";
import { 
  ArrowLeft, User, Calendar, Plane, CreditCard, FileText, 
  Users, Phone, Mail, MapPin, Printer, Send, CheckCircle, 
  XCircle, Eye, AlertCircle, Loader2 
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { EditCustomerDialog } from "@/components/admin/EditCustomerDialog";
import { generateInvoice, type InvoiceData } from "@/lib/document-generator";
import { useAuth } from "@/hooks/useAuth";

type BookingStatus = Database["public"]["Enums"]["booking_status"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];

const BOOKING_STATUSES: { value: BookingStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Terkonfirmasi' },
  { value: 'processing', label: 'Dalam Proses' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' },
  { value: 'refunded', label: 'Dikembalikan' },
];

export default function AdminBookingDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [newStatus, setNewStatus] = useState<BookingStatus | null>(null);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  
  // Payment management state
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [showProofDialog, setShowProofDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const { data: booking, isLoading } = useQuery({
    queryKey: ['admin-booking', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:customers(*),
          departure:departures(
            *,
            package:packages(*),
            departure_airport:airports!departures_departure_airport_id_fkey(code, name, city),
            arrival_airport:airports!departures_arrival_airport_id_fkey(code, name, city)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: passengers } = useQuery({
    queryKey: ['booking-passengers', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_passengers')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('booking_id', id);

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: payments } = useQuery({
    queryKey: ['booking-payments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('booking_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch bank accounts for invoice
  const { data: bankAccounts } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .limit(1);
      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: BookingStatus) => {
      const { error } = await supabase
        .from('bookings')
        .update({ booking_status: status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status booking berhasil diperbarui");
      queryClient.invalidateQueries({ queryKey: ['admin-booking', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      setShowStatusConfirm(false);
      setNewStatus(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal memperbarui status");
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async ({ paymentId, status, notes }: { paymentId: string; status: 'paid' | 'failed'; notes?: string }) => {
      const { error } = await supabase
        .from('payments')
        .update({
          status,
          verified_at: new Date().toISOString(),
          verified_by: user?.id,
          notes: notes || null,
        })
        .eq('id', paymentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-booking', id] });
      queryClient.invalidateQueries({ queryKey: ['booking-payments', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      toast.success('Pembayaran berhasil diperbarui');
      setSelectedPayment(null);
      setShowRejectDialog(false);
      setShowProofDialog(false);
      setRejectReason("");
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal memperbarui pembayaran');
    },
  });

  const handleApprovePayment = (payment: any) => {
    verifyPaymentMutation.mutate({ paymentId: payment.id, status: 'paid' });
  };

  const handleRejectPayment = () => {
    if (!selectedPayment) return;
    verifyPaymentMutation.mutate({ 
      paymentId: selectedPayment.id, 
      status: 'failed',
      notes: rejectReason 
    });
  };

  // Send WhatsApp notification
  const sendNotificationMutation = useMutation({
    mutationFn: async (type: string) => {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-notification', {
        body: { type, booking_id: id }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Notifikasi berhasil dikirim: ${data.sent || 0} terkirim`);
    },
    onError: (error: Error) => {
      toast.error("Gagal mengirim notifikasi: " + error.message);
    },
  });

  const handlePrintInvoice = () => {
    if (!booking || !customer) return;
    
    const departure = booking.departure as any;
    const pkg = departure?.package;
    const bank = bankAccounts?.[0];
    
    const invoiceData: InvoiceData = {
      invoiceNumber: `INV-${booking.booking_code}`,
      invoiceDate: new Date(booking.created_at || new Date()),
      dueDate: booking.payment_deadline ? new Date(booking.payment_deadline) : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      customer: {
        name: customer.full_name || '-',
        address: [customer.address, customer.city, customer.province].filter(Boolean).join(', ') || '-',
        phone: customer.phone || '-',
        email: customer.email || undefined,
      },
      items: [
        {
          description: `Paket ${pkg?.name || 'Umrah'} - Kamar ${getRoomTypeLabel(booking.room_type)} (${booking.total_pax || 1} Pax)\nBerangkat: ${departure?.departure_date ? formatDate(departure.departure_date) : '-'}`,
          quantity: booking.total_pax || 1,
          unitPrice: booking.base_price / (booking.total_pax || 1),
          total: booking.base_price,
        },
        ...(booking.addons_price && booking.addons_price > 0 ? [{
          description: 'Biaya Tambahan',
          quantity: 1,
          unitPrice: booking.addons_price,
          total: booking.addons_price,
        }] : []),
      ],
      subtotal: booking.base_price + (booking.addons_price || 0),
      discount: booking.discount_amount || undefined,
      total: booking.total_price,
      notes: `Pembayaran sudah diterima: ${formatCurrency(booking.paid_amount || 0)}\nSisa pembayaran: ${formatCurrency(booking.remaining_amount || 0)}`,
      bankInfo: bank ? {
        bankName: bank.bank_name,
        accountNumber: bank.account_number,
        accountName: bank.account_name,
      } : undefined,
    };

    const doc = generateInvoice(invoiceData);
    doc.save(`Invoice-${booking.booking_code}.pdf`);
    toast.success('Invoice berhasil di-download');
  };

  const handleStatusChange = (status: BookingStatus) => {
    setNewStatus(status);
    setShowStatusConfirm(true);
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return 'default';
      case 'cancelled':
      case 'refunded':
        return 'destructive';
      case 'processing':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getPaymentBadgeClass = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'pending':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Booking tidak ditemukan</p>
        <Button asChild className="mt-4">
          <Link to="/admin/bookings">Kembali</Link>
        </Button>
      </div>
    );
  }

  const customer = booking.customer as any;
  const departure = booking.departure as any;
  const pkg = departure?.package;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/bookings">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-mono">{booking.booking_code}</h1>
              <Badge variant={getStatusBadgeVariant(booking.booking_status || 'pending')}>
                {getBookingStatusLabel(booking.booking_status || 'pending')}
              </Badge>
              <Badge className={getPaymentBadgeClass(booking.payment_status || 'pending')}>
                {getPaymentStatusLabel(booking.payment_status || 'pending')}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Dibuat: {formatDate(booking.created_at || '')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select 
            value={booking.booking_status || 'pending'} 
            onValueChange={(v) => handleStatusChange(v as BookingStatus)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Ubah Status" />
            </SelectTrigger>
            <SelectContent>
              {BOOKING_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informasi Pemesan
              </CardTitle>
              <EditCustomerDialog customer={customer} />
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Nama Lengkap</p>
                <p className="font-medium">{customer?.full_name || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">No. WhatsApp</p>
                <p className="font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {customer?.phone || '-'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {customer?.email || '-'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Alamat</p>
                <p className="font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {[customer?.address, customer?.city, customer?.province].filter(Boolean).join(', ') || '-'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Package Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                Detail Paket & Keberangkatan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Nama Paket</p>
                  <p className="font-medium">{pkg?.name || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Tanggal Keberangkatan</p>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {departure?.departure_date ? formatDate(departure.departure_date) : '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Tipe Kamar</p>
                  <p className="font-medium">{getRoomTypeLabel(booking.room_type)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Jumlah Jamaah</p>
                  <p className="font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {booking.total_pax} Orang
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Rute Penerbangan</p>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="font-bold">{departure?.departure_airport?.code || '-'}</p>
                      <p className="text-xs text-muted-foreground">{departure?.departure_airport?.city || '-'}</p>
                    </div>
                    <div className="flex-1 border-t-2 border-dashed border-muted relative">
                      <Plane className="h-4 w-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold">{departure?.arrival_airport?.code || '-'}</p>
                      <p className="text-xs text-muted-foreground">{departure?.arrival_airport?.city || '-'}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Maskapai</p>
                  <p className="font-medium">{departure?.airline || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Passengers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Daftar Jamaah
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!passengers || passengers.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">Belum ada data jamaah</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Hubungan</TableHead>
                      <TableHead>No. Paspor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {passengers.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.customer?.full_name}</TableCell>
                        <TableCell className="capitalize">{p.relationship || 'Diri Sendiri'}</TableCell>
                        <TableCell>{p.customer?.passport_number || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {p.customer?.gender || '-'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Payments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Riwayat Pembayaran
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/admin/payments?booking=${id}`}>Lihat Semua</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {!payments || payments.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">Belum ada riwayat pembayaran</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kode</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Metode</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                      <TableHead>Bukti</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => {
                      const isPending = payment.status === 'pending';
                      return (
                        <TableRow key={payment.id} className={isPending ? 'bg-yellow-50/50 dark:bg-yellow-950/10' : ''}>
                          <TableCell className="font-mono text-sm">{payment.payment_code}</TableCell>
                          <TableCell>{formatDate(payment.created_at || '')}</TableCell>
                          <TableCell>{payment.payment_method || '-'}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell>
                            {payment.proof_url ? (
                              <button 
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setShowProofDialog(true);
                                }}
                                className="block w-8 h-8 rounded border overflow-hidden hover:ring-2 hover:ring-primary transition-all cursor-pointer"
                              >
                                <img 
                                  src={payment.proof_url} 
                                  alt="Bukti" 
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ) : (
                              <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Belum
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={getPaymentBadgeClass(payment.status || 'pending')}>
                              {getPaymentStatusLabel(payment.status || 'pending')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {isPending && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="h-8 text-green-600 border-green-300 hover:bg-green-50"
                                    onClick={() => handleApprovePayment(payment)}
                                    disabled={verifyPaymentMutation.isPending || !payment.proof_url}
                                  >
                                    <CheckCircle className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                                    onClick={() => {
                                      setSelectedPayment(payment);
                                      setShowRejectDialog(true);
                                    }}
                                    disabled={verifyPaymentMutation.isPending}
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                              {payment.proof_url && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="h-8"
                                  onClick={() => {
                                    setSelectedPayment(payment);
                                    setShowProofDialog(true);
                                  }}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Payment Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan Pembayaran</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Harga Paket</span>
                <span>{formatCurrency(booking.base_price)}</span>
              </div>
              {(booking.addons_price || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tambahan</span>
                  <span>{formatCurrency(booking.addons_price || 0)}</span>
                </div>
              )}
              {(booking.discount_amount || 0) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Diskon</span>
                  <span>-{formatCurrency(booking.discount_amount || 0)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(booking.total_price)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-green-600">
                <span>Dibayar</span>
                <span>{formatCurrency(booking.paid_amount || 0)}</span>
              </div>
              <div className="flex justify-between text-destructive font-bold">
                <span>Sisa</span>
                <span>{formatCurrency(booking.remaining_amount || 0)}</span>
              </div>
            </CardContent>
          </Card>

          {booking.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Catatan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{booking.notes}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Aksi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline" onClick={handlePrintInvoice}>
                <Printer className="h-4 w-4 mr-2" />
                Cetak Invoice PDF
              </Button>
              <Button className="w-full" variant="outline" asChild>
                <Link to={`/admin/payments?booking=${id}`}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Kelola Pembayaran
                </Link>
              </Button>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => sendNotificationMutation.mutate('booking_confirmed')}
                disabled={sendNotificationMutation.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                Kirim Notifikasi WA
              </Button>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => sendNotificationMutation.mutate('payment_received')}
                disabled={sendNotificationMutation.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                Kirim Reminder Bayar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Change Confirmation */}
      <AlertDialog open={showStatusConfirm} onOpenChange={setShowStatusConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ubah Status Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda yakin ingin mengubah status booking ini menjadi "{BOOKING_STATUSES.find(s => s.value === newStatus)?.label}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNewStatus(null)}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => newStatus && updateStatusMutation.mutate(newStatus)}
              disabled={updateStatusMutation.isPending}
            >
              Ya, Ubah Status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Proof Dialog */}
      <Dialog open={showProofDialog} onOpenChange={setShowProofDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bukti Pembayaran - {selectedPayment?.payment_code}</DialogTitle>
            <DialogDescription>
              {formatCurrency(selectedPayment?.amount || 0)} • {selectedPayment?.payment_method}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPayment?.proof_url ? (
              <div className="relative">
                <img 
                  src={selectedPayment.proof_url} 
                  alt="Bukti Pembayaran"
                  className="w-full max-h-[60vh] object-contain rounded-lg border"
                />
              </div>
            ) : (
              <div className="h-40 flex flex-col items-center justify-center bg-muted rounded-lg border border-dashed">
                <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Bukti pembayaran belum diupload</p>
              </div>
            )}
            
            {selectedPayment?.status === 'pending' && (
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setShowRejectDialog(true)}
                >
                  <XCircle className="h-4 w-4 mr-2" /> Tolak
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleApprovePayment(selectedPayment)}
                  disabled={verifyPaymentMutation.isPending || !selectedPayment?.proof_url}
                >
                  <CheckCircle className="h-4 w-4 mr-2" /> Setujui Pembayaran
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Pembayaran</DialogTitle>
            <DialogDescription>
              Berikan alasan penolakan pembayaran ini. Alasan ini akan terlihat oleh jamaah.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Textarea 
              placeholder="Contoh: Bukti transfer tidak terbaca atau nominal tidak sesuai..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Batal</Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectPayment}
              disabled={!rejectReason || verifyPaymentMutation.isPending}
            >
              {verifyPaymentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Konfirmasi Tolak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
