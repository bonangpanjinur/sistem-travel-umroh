import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DynamicPublicLayout } from "@/components/layout/DynamicPublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import { ArrowLeft, Upload, Loader2, CheckCircle, CreditCard } from "lucide-react";

export default function PaymentUpload() {
  const { bookingId } = useParams() as { bookingId: string };
  const navigate = useNavigate();
  const { user } = useAuth();

  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [notes, setNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking-payment', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_code,
          total_price,
          paid_amount,
          remaining_amount,
          departure:departures(
            package:packages(name)
          )
        `)
        .eq('id', bookingId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!bookingId && !!user,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !booking || !proofFile) {
      toast.error('Lengkapi semua data yang diperlukan');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Masukkan jumlah pembayaran yang valid');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload proof file
      // Sanitize file name: remove special characters and use timestamp
      const fileExt = proofFile.name.split('.').pop();
      const sanitizedFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `${user.id}/${sanitizedFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, proofFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw new Error(`Gagal mengunggah file: ${uploadError.message}`);
      }

      // 2. Generate payment code server-side
      const { data: paymentCode, error: rpcError } = await supabase.rpc('generate_payment_code');
      if (rpcError || !paymentCode) {
        throw new Error('Gagal membuat kode pembayaran');
      }
      
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          booking_id: bookingId!,
          payment_code: paymentCode,
          amount: amountNum,
          payment_method: paymentMethod,
          bank_name: bankName,
          account_name: accountName,
          proof_url: filePath, // Store path instead of public URL
          notes: notes,
          status: 'pending',
        } as any);

      if (paymentError) {
        console.error('Payment record error:', paymentError);
        throw new Error(`Gagal menyimpan data pembayaran: ${paymentError.message}`);
      }

      toast.success('Bukti pembayaran berhasil diupload! Tim kami akan memverifikasi dalam 1x24 jam.');
      navigate(`/my-bookings/${bookingId}`);

    } catch (error: any) {
      console.error('Payment upload error:', error);
      toast.error(error.message || 'Gagal mengupload bukti pembayaran');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <DynamicPublicLayout>
        <div className="container py-8 max-w-2xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-96 w-full" />
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

  return (
    <DynamicPublicLayout>
      <div className="container py-8 max-w-2xl">
        {/* Header */}
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to={`/my-bookings/${bookingId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Detail Booking
          </Link>
        </Button>

        <h1 className="text-2xl font-bold mb-2">Upload Bukti Pembayaran</h1>
        <p className="text-muted-foreground mb-6">
          Booking: <span className="font-mono font-semibold">{booking.booking_code}</span> - {departure?.package?.name}
        </p>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Form */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Form Pembayaran
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="amount">Jumlah Transfer (Rp)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="Contoh: 25000000"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="method">Metode Pembayaran</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih metode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transfer">Transfer Bank</SelectItem>
                      <SelectItem value="cash">Tunai</SelectItem>
                      <SelectItem value="va">Virtual Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="bank">Nama Bank Pengirim</Label>
                  <Input
                    id="bank"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    placeholder="Contoh: BCA, Mandiri, BNI"
                  />
                </div>

                <div>
                  <Label htmlFor="accountName">Nama Pemilik Rekening</Label>
                  <Input
                    id="accountName"
                    value={accountName}
                    onChange={e => setAccountName(e.target.value)}
                    placeholder="Nama sesuai rekening"
                  />
                </div>

                <div>
                  <Label htmlFor="proof">Bukti Transfer</Label>
                  <div className="mt-2">
                    <label
                      htmlFor="proof"
                      className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                        proofFile 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      {proofFile ? (
                        <div className="flex flex-col items-center text-green-600">
                          <CheckCircle className="h-8 w-8" />
                          <span className="mt-2 text-sm font-medium">{proofFile.name}</span>
                          <span className="text-xs">Klik untuk ganti</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-muted-foreground">
                          <Upload className="h-8 w-8" />
                          <span className="mt-2 text-sm">Upload bukti transfer</span>
                          <span className="text-xs">JPG, PNG, PDF (maks 5MB)</span>
                        </div>
                      )}
                      <Input
                        id="proof"
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error('Ukuran file maksimal 5MB');
                              return;
                            }
                            setProofFile(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Catatan (opsional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Catatan tambahan..."
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Kirim Bukti Pembayaran
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Summary */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Ringkasan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Biaya</span>
                  <span className="font-semibold">{formatCurrency(booking.total_price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sudah Dibayar</span>
                  <span className="text-green-600">{formatCurrency(booking.paid_amount ?? 0)}</span>
                </div>
                <div className="flex justify-between font-semibold text-destructive">
                  <span>Sisa</span>
                  <span>{formatCurrency(booking.remaining_amount ?? 0)}</span>
                </div>
              </CardContent>
            </Card>

            {bankAccount && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-amber-800">Rekening Tujuan</CardTitle>
                </CardHeader>
                <CardContent className="text-amber-800">
                  <div className="bg-white rounded p-3 text-center">
                    <p className="font-medium">{bankAccount.bank_name}</p>
                    <p className="text-lg font-bold">{bankAccount.account_number}</p>
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
