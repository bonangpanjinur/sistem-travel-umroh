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
import { formatCurrency, formatDate, getRoomTypeLabel, getBookingStatusLabel, getPaymentStatusLabel } from "@/lib/format";
import { ArrowLeft, User, Calendar, Plane, CreditCard, FileText, Users, Phone, Mail, MapPin, Printer, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { EditCustomerDialog } from "@/components/admin/EditCustomerDialog";
import { generateInvoice, type InvoiceData } from "@/lib/document-generator";

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
  const queryClient = useQueryClient();
  
  const [newStatus, setNewStatus] = useState<BookingStatus | null>(null);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);

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
            onValueChange={(value) => handleStatusChange(value as BookingStatus)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Update Status" />
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
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informasi Pemesan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Nama Lengkap</p>
                  <p className="font-medium">{customer?.full_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">NIK</p>
                  <p className="font-medium">{customer?.nik || '-'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{customer?.phone || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{customer?.email || '-'}</span>
                </div>
              </div>
              {customer?.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm">{customer.address}, {customer.city}, {customer.province}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Package & Departure */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                Paket & Keberangkatan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Paket</p>
                  <p className="font-medium">{pkg?.name || '-'}</p>
                  <p className="text-xs text-muted-foreground">{pkg?.code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipe Kamar</p>
                  <p className="font-medium">{getRoomTypeLabel(booking.room_type)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal Berangkat</p>
                  <p className="font-medium">{departure?.departure_date ? formatDate(departure.departure_date) : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal Pulang</p>
                  <p className="font-medium">{departure?.return_date ? formatDate(departure.return_date) : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bandara Berangkat</p>
                  <p className="font-medium">
                    {departure?.departure_airport?.code} - {departure?.departure_airport?.city || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bandara Tujuan</p>
                  <p className="font-medium">
                    {departure?.arrival_airport?.code} - {departure?.arrival_airport?.city || '-'}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Jumlah Jamaah</span>
                </div>
                <div className="text-right">
                  <p className="font-bold">{booking.total_pax} Orang</p>
                  <p className="text-xs text-muted-foreground">
                    {booking.adult_count} Dewasa
                    {(booking.child_count || 0) > 0 && `, ${booking.child_count} Anak`}
                    {(booking.infant_count || 0) > 0 && `, ${booking.infant_count} Bayi`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Passengers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Daftar Jamaah ({passengers?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!passengers || passengers.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Belum ada data jamaah</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Paspor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {passengers.map((passenger: any) => (
                      <TableRow key={passenger.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{passenger.customer?.full_name}</p>
                            {passenger.is_main_passenger && (
                              <Badge variant="outline" className="text-xs">Pemesan Utama</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{passenger.passenger_type}</TableCell>
                        <TableCell>{passenger.customer?.passport_number || '-'}</TableCell>
                        <TableCell>
                          {passenger.customer?.passport_expiry ? (
                            <span className="text-xs">
                              Exp: {formatDate(passenger.customer.passport_expiry)}
                            </span>
                          ) : (
                            <Badge variant="outline" className="text-xs">Belum ada paspor</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {passenger.customer && (
                              <EditCustomerDialog 
                                customer={passenger.customer}
                                onSuccess={() => queryClient.invalidateQueries({ queryKey: ['booking-passengers', id] })}
                              />
                            )}
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/admin/customers/${passenger.customer?.id}`}>
                                Lihat Detail
                              </Link>
                            </Button>
                          </div>
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Riwayat Pembayaran
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!payments || payments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Belum ada pembayaran</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kode</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Metode</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-sm">{payment.payment_code}</TableCell>
                        <TableCell>{formatDate(payment.created_at || '')}</TableCell>
                        <TableCell>{payment.payment_method || '-'}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getPaymentBadgeClass(payment.status || 'pending')}>
                            {getPaymentStatusLabel(payment.status || 'pending')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
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
    </div>
  );
}
