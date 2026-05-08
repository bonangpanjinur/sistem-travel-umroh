import { useState, useEffect } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import { ArrowLeft, Upload, Loader2, CheckCircle, CreditCard, Zap, AlertCircle } from "lucide-react";

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options: {
        onSuccess?: (result: any) => void;
        onPending?: (result: any) => void;
        onError?: (result: any) => void;
        onClose?: () => void;
      }) => void;
    };
  }
}

function useMidtransSnap(clientKey: string | null) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!clientKey) return;
    const existing = document.getElementById("midtrans-snap-script");
    if (existing) { setReady(true); return; }

    const script = document.createElement("script");
    script.id = "midtrans-snap-script";
    script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
    script.setAttribute("data-client-key", clientKey);
    script.onload = () => setReady(true);
    script.onerror = () => console.warn("[Midtrans] Gagal memuat Snap.js");
    document.head.appendChild(script);

    return () => {};
  }, [clientKey]);

  return ready;
}

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
  const [isSnapPaying, setIsSnapPaying] = useState(false);

  const supabaseRaw: any = supabase;

  const { data: midtransConfig } = useQuery({
    queryKey: ["midtrans-config-public"],
    queryFn: async () => {
      try {
        const { data } = await supabaseRaw
          .from("app_settings")
          .select("value")
          .eq("key", "midtrans_config")
          .maybeSingle();
        if (data?.value) return data.value as { client_key?: string; is_production?: boolean; enabled?: boolean };
      } catch {}
      try {
        const raw = localStorage.getItem("midtrans_config");
        if (raw) return JSON.parse(raw) as { client_key?: string; is_production?: boolean; enabled?: boolean };
      } catch {}
      return null;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const clientKey = midtransConfig?.client_key ?? null;
  const midtransEnabled = !!(midtransConfig?.client_key && midtransConfig?.enabled !== false);
  const snapReady = useMidtransSnap(clientKey);

  const { data: bankAccount } = useQuery({
    queryKey: ["primary-bank-account"],
    queryFn: async () => {
      const { data, error } = await supabaseRaw
        .from("bank_accounts")
        .select("*")
        .eq("is_active", true)
        .order("is_primary", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking-payment", bookingId],
    queryFn: async () => {
      const { data, error } = await supabaseRaw
        .from("bookings")
        .select(`
          id,
          booking_code,
          total_price,
          paid_amount,
          remaining_amount,
          departure:departures(
            package:packages(name)
          ),
          customer:customers(full_name, email, phone)
        `)
        .eq("id", bookingId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!bookingId && !!user,
  });

  const handleSnapPay = async () => {
    if (!booking || !user) return;
    if (!window.snap) {
      toast.error("Midtrans Snap belum siap. Coba lagi sebentar.");
      return;
    }

    const payAmount = booking.remaining_amount ?? booking.total_price ?? 0;
    if (payAmount <= 0) {
      toast.error("Tidak ada sisa tagihan yang perlu dibayar.");
      return;
    }

    setIsSnapPaying(true);

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";
      const customer = (booking as any).customer;

      const res = await fetch(`${apiBase}/api/midtrans/create-transaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: booking.id,
          booking_code: booking.booking_code,
          amount: payAmount,
          customer_name: customer?.full_name ?? user.email ?? "Jamaah",
          customer_email: customer?.email ?? user.email ?? "",
          customer_phone: customer?.phone ?? "",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Gagal menghubungi server" }));
        throw new Error(err.error ?? "Gagal membuat transaksi");
      }

      const { token } = await res.json();

      window.snap.pay(token, {
        onSuccess: async (result) => {
          toast.success("Pembayaran berhasil! Menunggu konfirmasi otomatis...");
          await supabaseRaw.from("payments").insert({
            booking_id: bookingId,
            payment_code: result.order_id ?? `SNAP-${Date.now()}`,
            amount: payAmount,
            payment_method: "midtrans",
            bank_name: result.payment_type ?? "Midtrans",
            account_name: "Online Payment",
            notes: `Midtrans transaction_id: ${result.transaction_id}`,
            status: "verified",
          });
          navigate(`/my-bookings/${bookingId}`);
        },
        onPending: async (result) => {
          toast.info("Pembayaran dalam proses — harap selesaikan sesuai instruksi.");
          await supabaseRaw.from("payments").insert({
            booking_id: bookingId,
            payment_code: result.order_id ?? `SNAP-${Date.now()}`,
            amount: payAmount,
            payment_method: "midtrans",
            bank_name: result.payment_type ?? "Midtrans",
            account_name: "Online Payment",
            notes: `Pending — transaction_id: ${result.transaction_id}`,
            status: "pending",
          });
          navigate(`/my-bookings/${bookingId}`);
        },
        onError: (result) => {
          console.error("[Midtrans Snap] Error:", result);
          toast.error("Pembayaran gagal. Silakan coba lagi atau gunakan transfer manual.");
          setIsSnapPaying(false);
        },
        onClose: () => {
          setIsSnapPaying(false);
        },
      });
    } catch (err: any) {
      console.error("[Midtrans Snap]", err);
      toast.error(err.message ?? "Gagal memproses pembayaran online");
      setIsSnapPaying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !booking || !proofFile) {
      toast.error("Lengkapi semua data yang diperlukan");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Masukkan jumlah pembayaran yang valid");
      return;
    }

    setIsSubmitting(true);

    try {
      const fileExt = proofFile.name.split(".").pop();
      const sanitizedFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `${user.id}/${sanitizedFileName}`;

      const { error: uploadError } = await supabaseRaw.storage
        .from("payment-proofs")
        .upload(filePath, proofFile, { cacheControl: "3600", upsert: false });

      if (uploadError) throw new Error(`Gagal mengunggah file: ${uploadError.message}`);

      const { data: paymentCode, error: rpcError } = await supabaseRaw.rpc("generate_payment_code");
      if (rpcError || !paymentCode) throw new Error("Gagal membuat kode pembayaran");

      const { error: paymentError } = await supabaseRaw.from("payments").insert({
        booking_id: bookingId,
        payment_code: paymentCode,
        amount: amountNum,
        payment_method: paymentMethod,
        bank_name: bankName,
        account_name: accountName,
        proof_url: filePath,
        notes: notes,
        status: "pending",
      });

      if (paymentError) throw new Error(`Gagal menyimpan data pembayaran: ${paymentError.message}`);

      await supabaseRaw.from("notifications").insert({
        title: "Bukti Pembayaran Baru",
        message: `Jamaah mengunggah bukti pembayaran untuk booking ${booking.booking_code} sebesar Rp ${amountNum.toLocaleString("id-ID")}. Harap verifikasi segera.`,
        type: "info",
        target_role: "admin",
        booking_id: bookingId,
        is_read: false,
      });

      toast.success("Bukti pembayaran berhasil diupload! Tim kami akan memverifikasi dalam 1x24 jam.");
      navigate(`/my-bookings/${bookingId}`);
    } catch (error: any) {
      console.error("Payment upload error:", error);
      toast.error(error.message ?? "Gagal mengupload bukti pembayaran");
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
          <Button asChild><Link to="/my-bookings">Kembali</Link></Button>
        </div>
      </DynamicPublicLayout>
    );
  }

  const departure = (booking as any).departure;
  const remaining = (booking as any).remaining_amount ?? 0;

  return (
    <DynamicPublicLayout>
      <div className="container py-8 max-w-2xl">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to={`/my-bookings/${bookingId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Detail Booking
          </Link>
        </Button>

        <h1 className="text-2xl font-bold mb-2">Pembayaran</h1>
        <p className="text-muted-foreground mb-6">
          Booking: <span className="font-mono font-semibold">{booking.booking_code}</span>
          {departure?.package?.name ? ` — ${departure.package.name}` : ""}
        </p>

        {/* Midtrans Online Payment Banner */}
        {midtransEnabled && (
          <Card className="mb-6 border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-emerald-100 shrink-0">
                  <Zap className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-emerald-900">Bayar Online via Midtrans</p>
                    <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Rekomendasi</Badge>
                  </div>
                  <p className="text-sm text-emerald-700 mb-3">
                    Bayar langsung menggunakan kartu kredit, GoPay, OVO, QRIS, VA BCA/Mandiri/BNI, dan lainnya.
                    Konfirmasi otomatis — tidak perlu upload bukti transfer.
                  </p>
                  <Button
                    onClick={handleSnapPay}
                    disabled={isSnapPaying || !snapReady || remaining <= 0}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  >
                    {isSnapPaying ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Memproses...</>
                    ) : !snapReady ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Memuat payment gateway...</>
                    ) : (
                      <><Zap className="h-4 w-4" /> Bayar Rp {remaining.toLocaleString("id-ID")} Sekarang</>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {midtransEnabled && (
          <div className="flex items-center gap-3 mb-6">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground px-2">atau bayar via transfer manual</span>
            <Separator className="flex-1" />
          </div>
        )}

        {!midtransEnabled && (
          <Card className="mb-5 border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Pembayaran online belum aktif. Silakan lakukan transfer manual dan upload bukti di bawah.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Form */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Bukti Transfer Manual
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
                          ? "border-green-500 bg-green-50"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
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
                            if (file.size > 5 * 1024 * 1024) { toast.error("Ukuran file maksimal 5MB"); return; }
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
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Mengirim...</>
                  ) : (
                    <><Upload className="h-4 w-4 mr-2" />Kirim Bukti Pembayaran</>
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
                  <span className="font-semibold">{formatCurrency((booking as any).total_price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sudah Dibayar</span>
                  <span className="text-green-600">{formatCurrency((booking as any).paid_amount ?? 0)}</span>
                </div>
                <div className="flex justify-between font-semibold text-destructive">
                  <span>Sisa</span>
                  <span>{formatCurrency(remaining)}</span>
                </div>
              </CardContent>
            </Card>

            {bankAccount && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-amber-800">Rekening Tujuan Transfer</CardTitle>
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
