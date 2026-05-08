import { useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DynamicPublicLayout } from "@/components/layout/DynamicPublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { 
  ArrowLeft, Calendar, CreditCard, Users, User,
  Plane, Hotel, Clock, CheckCircle, Upload,
  AlertCircle, FileText, CheckCircle2, Circle, Loader2,
  Pencil, Star
} from "lucide-react";
import { EditCustomerDialog } from "@/components/admin/EditCustomerDialog";
import { Progress } from "@/components/ui/progress";
import { 
  Alert, 
  AlertDescription, 
  AlertTitle 
} from "@/components/ui/alert";
import { differenceInHours, parseISO } from "date-fns";
import { toast } from "sonner";

export default function BookingDetail() {
  const { bookingId } = useParams() as { bookingId: string };
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const ktpInputRef = useRef<HTMLInputElement>(null);
  const passportInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking-detail', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          departure:departures(
            departure_date,
            return_date,
            flight_number,
            airline:airlines(name),
            package:packages(
              name,
              duration_days,
              featured_image
            ),
            hotel_makkah:hotels!departures_hotel_makkah_id_fkey(name, star_rating),
            hotel_madinah:hotels!departures_hotel_madinah_id_fkey(name, star_rating)
          ),
          booking_passengers(
            id,
            passenger_type,
            is_main_passenger,
            customer:customers(id, full_name, passport_number, gender)
          )
        `)
        .eq('id', bookingId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!bookingId && !!user,
  });

  const { data: payments } = useQuery({
    queryKey: ['booking-payments', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!bookingId,
  });

  // Fetch bank accounts dynamically
  const { data: bankAccount } = useQuery({
    queryKey: ['primary-bank-account'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch customer's documents
  const mainPassenger = (booking?.booking_passengers as any[])?.find((bp: any) => bp.is_main_passenger);
  const customerId = mainPassenger?.customer?.id;

  const { data: customerDocs } = useQuery({
    queryKey: ['customer-docs', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_documents')
        .select('*, document_type:document_types(code, name)')
        .eq('customer_id', customerId!);
      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });

  const handleDocUpload = async (file: File, docTypeCode: string) => {
    if (!user || !customerId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB');
      return;
    }

    setUploadingDoc(docTypeCode);
    try {
      // Get document type ID
      const { data: docType } = await supabase
        .from('document_types')
        .select('id')
        .eq('code', docTypeCode)
        .single();

      if (!docType) {
        toast.error('Tipe dokumen tidak ditemukan');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const filePath = `${customerId}/${docTypeCode}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('customer-documents')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      // Upsert document record - store path instead of public URL for private bucket
      const { error: dbError } = await supabase
        .from('customer_documents')
        .insert({
          customer_id: customerId,
          document_type_id: docType.id,
          file_url: filePath, // Store path
          file_name: file.name,
          status: 'pending',
        });

      if (dbError) throw dbError;

      toast.success(`${docTypeCode === 'ktp' ? 'KTP' : 'Paspor'} berhasil diupload!`);
      queryClient.invalidateQueries({ queryKey: ['customer-docs', customerId] });
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengupload dokumen');
    } finally {
      setUploadingDoc(null);
    }
  };

  if (isLoading) {
    return (
      <DynamicPublicLayout>
        <div className="container py-8 max-w-4xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64 w-full mb-4" />
          <Skeleton className="h-48 w-full" />
        </div>
      </DynamicPublicLayout>
    );
  }

  if (!booking) {
    return (
      <DynamicPublicLayout>
        <div className="container py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Booking Tidak Ditemukan</h1>
          <Button asChild>
            <Link to="/my-bookings">Kembali</Link>
          </Button>
        </div>
      </DynamicPublicLayout>
    );
  }

  const departure = booking.departure as any;
  const pkg = departure?.package;
  const passengers = booking.booking_passengers as any[];

  return (
    <DynamicPublicLayout>
      <div className="container py-8 max-w-4xl">
        {/* Header */}
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/my-bookings">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Booking Saya
          </Link>
        </Button>

        {/* Status Progress */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex justify-between mb-2">
              <div className="flex flex-col items-center gap-1">
                <div className={`p-2 rounded-full ${booking.booking_status === 'pending' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium">Booked</span>
              </div>
              <div className="flex-1 flex items-center px-2">
                <div className={`h-1 w-full rounded ${booking.payment_status === 'paid' ? 'bg-primary' : 'bg-muted'}`} />
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className={`p-2 rounded-full ${booking.payment_status === 'paid' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <CreditCard className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium">Dibayar</span>
              </div>
              <div className="flex-1 flex items-center px-2">
                <div className={`h-1 w-full rounded ${booking.booking_status === 'confirmed' ? 'bg-primary' : 'bg-muted'}`} />
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className={`p-2 rounded-full ${booking.booking_status === 'confirmed' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <FileText className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium">Diverifikasi</span>
              </div>
              <div className="flex-1 flex items-center px-2">
                <div className={`h-1 w-full rounded ${booking.booking_status === 'completed' ? 'bg-primary' : 'bg-muted'}`} />
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className={`p-2 rounded-full ${booking.booking_status === 'completed' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <Plane className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium">Berangkat</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Deadline Alert */}
        {booking.payment_status !== 'paid' && booking.payment_deadline && (
          <Alert variant="destructive" className="mb-6 bg-red-50 border-red-200 text-red-900">
            <Clock className="h-4 w-4" />
            <AlertTitle>Batas Waktu Pembayaran</AlertTitle>
            <AlertDescription>
              Segera lakukan pembayaran sebelum {format(new Date(booking.payment_deadline), "d MMMM yyyy, HH:mm", { locale: id })}. 
              {differenceInHours(new Date(booking.payment_deadline), new Date()) < 24 && (
                <span className="font-bold ml-1">Sisa waktu kurang dari 24 jam!</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Kode Booking</p>
            <h1 className="text-2xl font-bold font-mono">{booking.booking_code}</h1>
          </div>
          <Badge variant={booking.payment_status === 'paid' ? 'default' : 'destructive'} className="text-sm">
            {booking.payment_status === 'paid' ? 'Lunas' : `Sisa: ${formatCurrency(booking.remaining_amount ?? 0)}`}
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Package Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Hotel className="h-5 w-5" />
                  Detail Paket
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <img 
                    src={pkg?.featured_image || '/placeholder.svg'} 
                    alt={pkg?.name}
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                  <div>
                    <h3 className="font-semibold text-lg">{pkg?.name}</h3>
                    <p className="text-sm text-muted-foreground">{pkg?.duration_days} Hari</p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Berangkat</p>
                      <p className="font-medium">
                        {format(new Date(departure?.departure_date), "d MMMM yyyy", { locale: id })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Pulang</p>
                      <p className="font-medium">
                        {format(new Date(departure?.return_date), "d MMMM yyyy", { locale: id })}
                      </p>
                    </div>
                  </div>
                  {departure?.airline && (
                    <div className="flex items-center gap-2">
                      <Plane className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Maskapai</p>
                        <p className="font-medium">{(departure.airline as any).name}</p>
                      </div>
                    </div>
                  )}
                  {departure?.flight_number && (
                    <div className="flex items-center gap-2">
                      <Plane className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">No. Penerbangan</p>
                        <p className="font-medium">{departure.flight_number}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Passengers */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Data Jamaah ({booking.total_pax} orang)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {passengers?.map((bp, index) => (
                    <div key={bp.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg group">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {bp.customer?.full_name}
                          {bp.is_main_passenger && (
                            <Badge variant="outline" className="ml-2 text-xs">Penanggung Jawab</Badge>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {bp.customer?.gender === 'male' ? 'Laki-laki' : 'Perempuan'}
                          {bp.customer?.passport_number && ` • Paspor: ${bp.customer.passport_number}`}
                        </p>
                      </div>
                      <EditCustomerDialog 
                        customer={bp.customer}
                        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['booking-detail', bookingId] })}
                        trigger={
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>


          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Document Upload Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Dokumen Perjalanan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Lengkapi dokumen perjalanan Anda untuk mempercepat proses verifikasi.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* KTP Upload */}
                  <div className="p-4 border border-dashed rounded-lg flex flex-col items-center justify-center text-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      {customerDocs?.some((d: any) => d.document_type?.code === 'ktp') ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">Kartu Tanda Penduduk (KTP)</p>
                      <p className="text-xs text-muted-foreground">PDF, JPG (Maks 5MB)</p>
                    </div>
                    <input
                      ref={ktpInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleDocUpload(file, 'ktp');
                        e.target.value = '';
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      disabled={uploadingDoc === 'ktp'}
                      onClick={() => ktpInputRef.current?.click()}
                    >
                      {uploadingDoc === 'ktp' ? (
                        <><Loader2 className="h-3 w-3 mr-2 animate-spin" />Uploading...</>
                      ) : (
                        <><Upload className="h-3 w-3 mr-2" />{customerDocs?.some((d: any) => d.document_type?.code === 'ktp') ? 'Ganti KTP' : 'Upload KTP'}</>
                      )}
                    </Button>
                  </div>

                  {/* Passport Upload */}
                  <div className="p-4 border border-dashed rounded-lg flex flex-col items-center justify-center text-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      {customerDocs?.some((d: any) => d.document_type?.code === 'passport') ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">Paspor</p>
                      <p className="text-xs text-muted-foreground">PDF, JPG (Maks 5MB)</p>
                    </div>
                    <input
                      ref={passportInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleDocUpload(file, 'passport');
                        e.target.value = '';
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      disabled={uploadingDoc === 'passport'}
                      onClick={() => passportInputRef.current?.click()}
                    >
                      {uploadingDoc === 'passport' ? (
                        <><Loader2 className="h-3 w-3 mr-2 animate-spin" />Uploading...</>
                      ) : (
                        <><Upload className="h-3 w-3 mr-2" />{customerDocs?.some((d: any) => d.document_type?.code === 'passport') ? 'Ganti Paspor' : 'Upload Paspor'}</>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>



            {/* Payment Summary */}
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Ringkasan Pembayaran</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tipe Kamar</span>
                  <span className="capitalize">{booking.room_type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Harga Dasar</span>
                  <span>{formatCurrency(booking.base_price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Jumlah Jamaah</span>
                  <span>{booking.total_pax} orang</span>
                </div>
                {(booking.discount_amount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Diskon</span>
                    <span>-{formatCurrency(booking.discount_amount ?? 0)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(booking.total_price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sudah Dibayar</span>
                  <span className="text-green-600">{formatCurrency(booking.paid_amount ?? 0)}</span>
                </div>
                <div className="flex justify-between font-semibold text-destructive">
                  <span>Sisa Pembayaran</span>
                  <span>{formatCurrency(booking.remaining_amount ?? 0)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            {booking.payment_status !== 'paid' && (
              <Button className="w-full" size="lg" asChild>
                <Link to={`/my-bookings/${booking.id}/payment`}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Bukti Bayar
                </Link>
              </Button>
            )}

            {/* Q2: Tombol Feedback untuk booking selesai */}
            {booking.booking_status === 'completed' && (
              <Button className="w-full" size="lg" variant="outline" asChild>
                <Link to={`/jamaah/feedback/${booking.id}`}>
                  <Star className="h-4 w-4 mr-2 text-amber-500" />
                  Beri Ulasan Perjalanan
                </Link>
              </Button>
            )}

            {/* Payment History */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Riwayat Pembayaran
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!payments || payments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Belum ada pembayaran.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-mono text-sm">{payment.payment_code}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(payment.created_at!), "d MMM yyyy, HH:mm", { locale: id })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                          <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>
                            {payment.status === 'paid' ? 'Terverifikasi' : 
                             payment.status === 'pending' ? 'Menunggu Verifikasi' : payment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bank Info */}
            {bankAccount && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-amber-800">Transfer ke Rekening</CardTitle>
                </CardHeader>
                <CardContent className="text-amber-800">
                  <div className="bg-white rounded p-3 text-center">
                    <p className="font-medium">{bankAccount.bank_name}</p>
                    <p className="text-xl font-bold">{bankAccount.account_number}</p>
                    <p className="text-sm">a.n. {bankAccount.account_name}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DynamicPublicLayout>
  );
}
