import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  CreditCard, Smartphone, Building2, ArrowLeft, CheckCircle2,
  Clock, AlertCircle, Wallet, Upload, QrCode, ChevronRight,
  Loader2, Shield, RefreshCw, Info
} from "lucide-react";
import { Link } from "react-router-dom";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { toast } from "sonner";

const PAYMENT_METHODS = [
  {
    id: "qris",
    label: "QRIS",
    desc: "Scan QR dari semua e-wallet & m-banking",
    icon: QrCode,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
  {
    id: "va_bca",
    label: "Virtual Account BCA",
    desc: "Transfer via ATM, M-Banking, atau Internet Banking BCA",
    icon: Building2,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  {
    id: "va_mandiri",
    label: "Virtual Account Mandiri",
    desc: "Transfer via ATM, M-Banking, atau Internet Banking Mandiri",
    icon: Building2,
    color: "text-yellow-700",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
  },
  {
    id: "va_bni",
    label: "Virtual Account BNI",
    desc: "Transfer via ATM, M-Banking, atau Internet Banking BNI",
    icon: Building2,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
  {
    id: "gopay",
    label: "GoPay",
    desc: "Bayar langsung dari aplikasi Gojek",
    icon: Smartphone,
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
  },
  {
    id: "transfer",
    label: "Transfer Manual + Bukti",
    desc: "Upload bukti transfer setelah pembayaran",
    icon: Upload,
    color: "text-gray-600",
    bg: "bg-gray-50",
    border: "border-gray-200",
  },
];

const PAYMENT_TYPE_OPTIONS = [
  { id: "dp", label: "DP / Uang Muka", desc: "Pembayaran pertama untuk konfirmasi booking" },
  { id: "cicilan", label: "Cicilan", desc: "Pembayaran sebagian sesuai jadwal cicilan" },
  { id: "pelunasan", label: "Pelunasan", desc: "Pembayaran sisa tagihan secara penuh" },
];

export default function JamaahPayment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("cicilan");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"form" | "confirm" | "processing" | "success">("form");
  const [transactionRef, setTransactionRef] = useState("");

  const { data: customer } = useQuery({
    queryKey: ["jamaah-customer", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: booking, isLoading } = useQuery({
    queryKey: ["jamaah-booking-payment", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return null;
      const { data, error } = await supabase
        .from("bookings")
        .select(`*, departure:departures(*, package:packages(*))`)
        .eq("customer_id", customer.id)
        .in("status", ["confirmed", "processing", "pending"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id,
  });

  const { data: payments } = useQuery({
    queryKey: ["jamaah-payments", booking?.id],
    queryFn: async () => {
      if (!booking?.id) return [];
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("booking_id", booking.id)
        .eq("status", "paid")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!booking?.id,
  });

  const totalPaid = payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
  const totalPrice = Number(booking?.total_price || 0);
  const remaining = totalPrice - totalPaid;
  const progressPct = totalPrice > 0 ? Math.min(100, (totalPaid / totalPrice) * 100) : 0;

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!booking?.id || !customer?.id) throw new Error("Data tidak lengkap");
      const amountNum = Number(amount.replace(/\D/g, ""));
      if (amountNum <= 0) throw new Error("Nominal tidak valid");

      const ref = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      setTransactionRef(ref);

      const { error } = await (supabase as any)
        .from("payments")
        .insert({
          booking_id: booking.id,
          customer_id: customer.id,
          amount: amountNum,
          payment_method: selectedMethod,
          payment_type: selectedType,
          status: "pending",
          notes: `Pembayaran via ${PAYMENT_METHODS.find(m => m.id === selectedMethod)?.label} | Ref: ${ref}`,
          created_at: new Date().toISOString(),
        });
      if (error) throw error;
      return ref;
    },
    onSuccess: () => {
      setStep("success");
      queryClient.invalidateQueries({ queryKey: ["jamaah-payments"] });
      queryClient.invalidateQueries({ queryKey: ["jamaah-bookings"] });
    },
    onError: (err: any) => {
      toast.error("Gagal memproses pembayaran: " + err.message);
      setStep("form");
    },
  });

  const handleSubmit = () => {
    const amountNum = Number(amount.replace(/\D/g, ""));
    if (!selectedMethod) { toast.error("Pilih metode pembayaran"); return; }
    if (amountNum < 100000) { toast.error("Minimal pembayaran Rp 100.000"); return; }
    if (amountNum > remaining) { toast.error("Nominal melebihi sisa tagihan"); return; }
    setStep("confirm");
  };

  const handleConfirm = () => {
    setStep("processing");
    submitMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
        <JamaahBottomNav />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24 flex flex-col">
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <Link to="/jamaah"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="font-semibold">Pembayaran Online</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Tidak ada booking aktif yang perlu dibayar.</p>
          <Link to="/jamaah/payment-history">
            <Button variant="outline" className="mt-4">Lihat Riwayat Bayar</Button>
          </Link>
        </div>
        <JamaahBottomNav />
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <Link to="/jamaah"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="font-semibold">Pembayaran Online</h1>
        </div>
        <div className="flex flex-col items-center justify-center p-8 text-center mt-12">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Pembayaran Terkirim!</h2>
          <p className="text-muted-foreground text-sm mb-1">Ref: <span className="font-mono font-medium">{transactionRef}</span></p>
          <p className="text-muted-foreground text-sm mb-6">
            Pembayaran Anda sedang diverifikasi oleh tim kami. Notifikasi akan dikirimkan setelah konfirmasi.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left w-full max-w-xs">
            <div className="flex gap-2">
              <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">
                {selectedMethod === "transfer"
                  ? "Jangan lupa upload bukti transfer di halaman Riwayat Bayar."
                  : "Selesaikan pembayaran melalui aplikasi atau ATM Anda."}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <Link to="/jamaah/payment-history">
              <Button className="w-full">Lihat Riwayat Bayar</Button>
            </Link>
            <Link to="/jamaah">
              <Button variant="outline" className="w-full">Kembali ke Beranda</Button>
            </Link>
          </div>
        </div>
        <JamaahBottomNav />
      </div>
    );
  }

  if (step === "processing") {
    return (
      <div className="min-h-screen bg-gray-50 pb-24 flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="font-semibold">Memproses Pembayaran...</p>
        <p className="text-sm text-muted-foreground mt-1">Mohon tunggu sebentar</p>
        <JamaahBottomNav />
      </div>
    );
  }

  if (step === "confirm") {
    const amountNum = Number(amount.replace(/\D/g, ""));
    const method = PAYMENT_METHODS.find(m => m.id === selectedMethod);
    const ptype = PAYMENT_TYPE_OPTIONS.find(t => t.id === selectedType);
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <button onClick={() => setStep("form")}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="font-semibold">Konfirmasi Pembayaran</h1>
        </div>
        <div className="p-4 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Jenis Pembayaran</span>
                <span className="font-medium">{ptype?.label}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Metode</span>
                <span className="font-medium">{method?.label}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Nominal</span>
                <span className="font-bold text-lg text-primary">{formatCurrency(amountNum)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Booking</span>
                <span className="font-medium">{(booking as any)?.booking_code}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Paket</span>
                <span className="font-medium text-right max-w-[60%] leading-tight">
                  {(booking as any)?.departure?.package?.name}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-2">
            <Shield className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700">
              Pembayaran akan tercatat dan diverifikasi oleh tim admin dalam 1×24 jam kerja.
            </p>
          </div>

          <Button className="w-full" onClick={handleConfirm} disabled={submitMutation.isPending}>
            {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Konfirmasi & Bayar
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setStep("form")}>Batal</Button>
        </div>
        <JamaahBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <Link to="/jamaah"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="font-semibold">Pembayaran Online</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Status Pembayaran */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status Tagihan</CardTitle>
            <CardDescription>{(booking as any)?.booking_code} — {(booking as any)?.departure?.package?.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Paket</span>
              <span className="font-semibold">{formatCurrency(totalPrice)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sudah Dibayar</span>
              <span className="font-semibold text-green-600">{formatCurrency(totalPaid)}</span>
            </div>
            <Progress value={progressPct} className="h-2" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sisa Tagihan</span>
              <span className="font-bold text-lg text-red-600">{formatCurrency(remaining)}</span>
            </div>
            {remaining <= 0 && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-2 mt-1">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-xs text-green-700 font-medium">Tagihan sudah lunas!</span>
              </div>
            )}
          </CardContent>
        </Card>

        {remaining > 0 && (
          <>
            {/* Pilih Jenis Pembayaran */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">Jenis Pembayaran</Label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_TYPE_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedType(t.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedType === t.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-white hover:border-primary/50"
                    }`}
                  >
                    <div className="text-xs font-semibold">{t.label}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Nominal */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">Nominal Pembayaran</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">Rp</span>
                <Input
                  className="pl-9"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    setAmount(raw ? Number(raw).toLocaleString("id-ID") : "");
                  }}
                  inputMode="numeric"
                />
              </div>
              <div className="flex gap-2 mt-2">
                {[500000, 1000000, 2000000, 5000000].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(v.toLocaleString("id-ID"))}
                    className="px-2 py-1 text-xs border rounded-lg bg-white hover:bg-primary/5 hover:border-primary transition-colors"
                  >
                    {formatCurrency(v).replace("Rp\u00a0", "").replace("Rp", "")}
                  </button>
                ))}
                <button
                  onClick={() => setAmount(remaining.toLocaleString("id-ID"))}
                  className="px-2 py-1 text-xs border rounded-lg bg-green-50 border-green-200 text-green-700 hover:bg-green-100 transition-colors"
                >
                  Lunas
                </button>
              </div>
            </div>

            {/* Pilih Metode */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">Metode Pembayaran</Label>
              <div className="space-y-2">
                {PAYMENT_METHODS.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMethod(m.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        selectedMethod === m.id
                          ? `${m.border} ${m.bg} ring-1 ring-current`
                          : "border-border bg-white hover:border-primary/40"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${m.bg}`}>
                        <Icon className={`h-5 w-5 ${m.color}`} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium">{m.label}</div>
                        <div className="text-xs text-muted-foreground">{m.desc}</div>
                      </div>
                      {selectedMethod === m.id && (
                        <CheckCircle2 className={`h-5 w-5 ${m.color}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button className="w-full" size="lg" onClick={handleSubmit}>
              Lanjut ke Konfirmasi <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </>
        )}

        {/* Riwayat Singkat */}
        {payments && payments.length > 0 && (
          <div>
            <Label className="text-sm font-semibold mb-2 block">Riwayat Pembayaran</Label>
            <div className="space-y-2">
              {payments.slice(0, 3).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between bg-white border rounded-xl p-3">
                  <div>
                    <div className="text-sm font-medium">{formatCurrency(Number(p.amount))}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.created_at ? format(new Date(p.created_at), "d MMM yyyy", { locale: localeId }) : "-"}
                    </div>
                  </div>
                  <Badge variant="default" className="text-xs bg-green-100 text-green-700 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Terverifikasi
                  </Badge>
                </div>
              ))}
              <Link to="/jamaah/payment-history" className="flex items-center justify-center gap-1 text-xs text-primary py-1">
                Lihat semua riwayat <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}
      </div>

      <JamaahBottomNav />
    </div>
  );
}
