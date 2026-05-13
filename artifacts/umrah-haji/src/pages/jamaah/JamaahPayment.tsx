import { useState, useEffect, useRef, useCallback } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  CreditCard, Smartphone, Building2, ArrowLeft, CheckCircle2,
  Clock, AlertCircle, Wallet, Upload, QrCode, ChevronRight,
  Loader2, Shield, RefreshCw, Info, Download, TimerOff,
  ScanLine, Zap, WifiOff
} from "lucide-react";
import { Link } from "react-router-dom";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { toast } from "sonner";
import {
  createQrisPayment, checkQrisStatus,
  isQrisPaid, isQrisExpired, getQrisSecondsLeft,
  type QrisCreateResult,
} from "@/lib/paymentGateway";

// ─── Types ────────────────────────────────────────────────────────────────────

type PageStep =
  | "form"
  | "confirm"
  | "generating-qr"
  | "showing-qr"
  | "qris-paid"
  | "processing"
  | "success";

// ─── Payment method definitions ───────────────────────────────────────────────

const PAYMENT_METHODS = [
  {
    id: "qris",
    label: "QRIS",
    desc: "Scan QR — diterima semua e-wallet & m-banking",
    icon: QrCode,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    badge: "Online Instan",
    badgeCls: "bg-purple-100 text-purple-700",
  },
  {
    id: "va_bca",
    label: "Virtual Account BCA",
    desc: "Transfer via ATM, M-Banking, atau Internet Banking BCA",
    icon: Building2,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: null,
    badgeCls: "",
  },
  {
    id: "va_mandiri",
    label: "Virtual Account Mandiri",
    desc: "Transfer via ATM, M-Banking, atau Internet Banking Mandiri",
    icon: Building2,
    color: "text-yellow-700",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    badge: null,
    badgeCls: "",
  },
  {
    id: "va_bni",
    label: "Virtual Account BNI",
    desc: "Transfer via ATM, M-Banking, atau Internet Banking BNI",
    icon: Building2,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    badge: null,
    badgeCls: "",
  },
  {
    id: "gopay",
    label: "GoPay",
    desc: "Bayar langsung dari aplikasi Gojek",
    icon: Smartphone,
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
    badge: null,
    badgeCls: "",
  },
  {
    id: "transfer",
    label: "Transfer Manual + Bukti",
    desc: "Upload bukti transfer setelah pembayaran",
    icon: Upload,
    color: "text-gray-600",
    bg: "bg-gray-50",
    border: "border-gray-200",
    badge: null,
    badgeCls: "",
  },
];

const PAYMENT_TYPE_OPTIONS = [
  { id: "dp",        label: "DP / Uang Muka",  desc: "Pembayaran pertama untuk konfirmasi booking" },
  { id: "cicilan",   label: "Cicilan",           desc: "Pembayaran sebagian sesuai jadwal cicilan" },
  { id: "pelunasan", label: "Pelunasan",          desc: "Pembayaran sisa tagihan secara penuh" },
];

// ─── Countdown Component ──────────────────────────────────────────────────────

function QrisCountdown({ totalSeconds, onExpire }: { totalSeconds: number; onExpire: () => void }) {
  const [left, setLeft] = useState(totalSeconds);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    setLeft(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    if (left <= 0) { onExpireRef.current(); return; }
    const t = setTimeout(() => setLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const mins = Math.floor(left / 60);
  const secs = left % 60;
  const pct  = totalSeconds > 0 ? (left / totalSeconds) * 100 : 0;
  const color = left < 60 ? "text-red-600" : left < 180 ? "text-amber-600" : "text-emerald-600";

  return (
    <div className="space-y-1.5">
      <div className={`text-center text-2xl font-mono font-bold tabular-nums ${color}`}>
        {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </div>
      <Progress
        value={pct}
        className="h-1.5"
      />
      <p className="text-center text-[11px] text-muted-foreground">
        {left <= 0 ? "QR Code kedaluwarsa" : "QR Code kedaluwarsa dalam"}
      </p>
    </div>
  );
}

// ─── QR Code Display ──────────────────────────────────────────────────────────

function QrisDisplay({
  qrData,
  booking,
  amountNum,
  paymentType,
  onPaid,
  onExpire,
  onCancel,
}: {
  qrData: QrisCreateResult;
  booking: any;
  amountNum: number;
  paymentType: string;
  onPaid: (settlementTime?: string) => void;
  onExpire: () => void;
  onCancel: () => void;
}) {
  const [imgError, setImgError]       = useState(false);
  const [polling, setPolling]         = useState(true);
  const [pollCount, setPollCount]     = useState(0);
  const [lastStatus, setLastStatus]   = useState<string>("pending");
  const onPaidRef   = useRef(onPaid);
  const onExpireRef = useRef(onExpire);
  onPaidRef.current   = onPaid;
  onExpireRef.current = onExpire;

  const secondsLeft = getQrisSecondsLeft(qrData.expiry_time);

  // ── Auto-poll every 5 seconds ──────────────────────────────────────────────
  const poll = useCallback(async () => {
    if (!polling) return;
    try {
      const status = await checkQrisStatus(qrData.order_id);
      setLastStatus(status.transaction_status);
      if (isQrisPaid(status.transaction_status)) {
        setPolling(false);
        onPaidRef.current(status.settlement_time);
      } else if (isQrisExpired(status.transaction_status)) {
        setPolling(false);
        onExpireRef.current();
      }
    } catch {
      // network hiccup — lanjut polling
    }
    setPollCount((c) => c + 1);
  }, [polling, qrData.order_id]);

  useEffect(() => {
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [poll]);

  const handleDownloadQr = () => {
    if (!qrData.qr_code_url) return;
    const a = document.createElement("a");
    a.href = qrData.qr_code_url;
    a.download = `QRIS-${booking.booking_code}.png`;
    a.target = "_blank";
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Header info */}
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="pt-4 pb-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Nominal</span>
            <span className="font-bold text-lg text-purple-700">{formatCurrency(amountNum)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Booking</span>
            <span className="font-medium">{booking.booking_code}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Jenis</span>
            <span className="font-medium capitalize">{paymentType}</span>
          </div>
        </CardContent>
      </Card>

      {/* QR Code */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 text-center">
          <CardTitle className="text-sm flex items-center justify-center gap-2">
            <ScanLine className="h-4 w-4 text-purple-600" /> Scan QR Code
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Gunakan m-banking, GoPay, OVO, DANA, ShopeePay, atau semua e-wallet ber-QRIS
          </p>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 pb-4">
          {qrData.qr_code_url && !imgError ? (
            <div className="relative">
              <img
                src={qrData.qr_code_url}
                alt="QRIS QR Code"
                className="w-56 h-56 object-contain border-4 border-white shadow-md rounded-lg"
                onError={() => setImgError(true)}
              />
              {/* QRIS logo overlay */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white px-2 py-0.5 rounded text-[9px] font-bold text-purple-700 border border-purple-200">
                QRIS
              </div>
            </div>
          ) : (
            <div className="w-56 h-56 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2">
              <QrCode className="h-12 w-12 text-gray-400" />
              <p className="text-xs text-muted-foreground text-center px-4">
                {qrData.qr_string
                  ? "QR image tidak tersedia — gunakan kode di bawah"
                  : "Gagal memuat QR Code"}
              </p>
              {qrData.qr_string && (
                <p className="font-mono text-[9px] break-all text-center px-2 text-gray-500 max-h-20 overflow-hidden">
                  {qrData.qr_string}
                </p>
              )}
            </div>
          )}

          {/* Countdown */}
          <div className="w-full max-w-xs">
            <QrisCountdown totalSeconds={secondsLeft} onExpire={onExpire} />
          </div>

          {/* Polling indicator */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {polling ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-purple-500" />
                Menunggu konfirmasi pembayaran...
                <span className="opacity-50">#{pollCount}</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                Polling dihentikan
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        {qrData.qr_code_url && (
          <Button variant="outline" size="sm" className="flex-1" onClick={handleDownloadQr}>
            <Download className="h-4 w-4 mr-1.5" /> Simpan QR
          </Button>
        )}
        <Button variant="ghost" size="sm" className="flex-1 text-muted-foreground" onClick={onCancel}>
          Batal
        </Button>
      </div>

      {/* Instruction */}
      <Alert className="border-amber-200 bg-amber-50">
        <Info className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-xs text-amber-700">
          Setelah scan dan bayar, halaman ini akan otomatis berubah ke konfirmasi sukses.
          Jangan tutup atau refresh halaman ini.
        </AlertDescription>
      </Alert>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function JamaahPayment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [selectedType,   setSelectedType]   = useState<string>("cicilan");
  const [amount,         setAmount]         = useState("");
  const [step,           setStep]           = useState<PageStep>("form");
  const [transactionRef, setTransactionRef] = useState("");

  // QRIS-specific state
  const [qrisData,    setQrisData]    = useState<QrisCreateResult | null>(null);
  const [qrisExpired, setQrisExpired] = useState(false);

  // ── Data fetching ─────────────────────────────────────────────────────────

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

  const { data: profile } = useQuery({
    queryKey: ["jamaah-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
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

  const totalPaid  = payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
  const totalPrice = Number(booking?.total_price || 0);
  const remaining  = totalPrice - totalPaid;
  const progressPct = totalPrice > 0 ? Math.min(100, (totalPaid / totalPrice) * 100) : 0;
  const amountNum   = Number(amount.replace(/\D/g, ""));

  // ── QRIS: Generate QR ──────────────────────────────────────────────────────

  const generateQris = async () => {
    if (!booking?.id || !customer?.id) return;
    setStep("generating-qr");
    setQrisExpired(false);
    try {
      const result = await createQrisPayment({
        bookingId:     booking.id,
        bookingCode:   (booking as any).booking_code,
        amount:        amountNum,
        customerName:  profile?.full_name || "Jamaah",
        customerEmail: user?.email || undefined,
        customerPhone: profile?.phone    || undefined,
      });
      setQrisData(result);
      setStep("showing-qr");
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat QRIS");
      setStep("confirm");
    }
  };

  // ── QRIS: Payment settled callback ────────────────────────────────────────

  const handleQrisPaid = useCallback(async (settlementTime?: string) => {
    if (!booking?.id || !customer?.id || !qrisData) return;
    setStep("generating-qr"); // loading state
    try {
      const ref = qrisData.order_id;
      setTransactionRef(ref);

      await (supabase as any)
        .from("payments")
        .insert({
          booking_id:        booking.id,
          customer_id:       customer.id,
          amount:            amountNum,
          payment_method:    "qris",
          payment_type:      selectedType,
          status:            "paid",
          transaction_id:    qrisData.transaction_id,
          notes:             `QRIS via Midtrans | Order: ${ref} | Settlement: ${settlementTime || new Date().toISOString()}`,
          created_at:        settlementTime || new Date().toISOString(),
        });

      queryClient.invalidateQueries({ queryKey: ["jamaah-payments"] });
      queryClient.invalidateQueries({ queryKey: ["jamaah-bookings"] });
      setStep("qris-paid");
    } catch (err: any) {
      toast.error("Pembayaran diterima tapi gagal disimpan: " + err.message);
      setStep("qris-paid");
    }
  }, [booking?.id, customer?.id, qrisData, amountNum, selectedType, queryClient]);

  // ── Non-QRIS: Manual pending record ──────────────────────────────────────

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!booking?.id || !customer?.id) throw new Error("Data tidak lengkap");
      const ref = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      setTransactionRef(ref);
      const { error } = await (supabase as any)
        .from("payments")
        .insert({
          booking_id:     booking.id,
          customer_id:    customer.id,
          amount:         amountNum,
          payment_method: selectedMethod,
          payment_type:   selectedType,
          status:         "pending",
          notes: `Pembayaran via ${PAYMENT_METHODS.find(m => m.id === selectedMethod)?.label} | Ref: ${ref}`,
          created_at:     new Date().toISOString(),
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

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    if (!selectedMethod)        { toast.error("Pilih metode pembayaran"); return; }
    if (amountNum < 100000)     { toast.error("Minimal pembayaran Rp 100.000"); return; }
    if (amountNum > remaining)  { toast.error("Nominal melebihi sisa tagihan"); return; }
    setStep("confirm");
  };

  const handleConfirm = () => {
    if (selectedMethod === "qris") {
      generateQris();
    } else {
      setStep("processing");
      submitMutation.mutate();
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render loading
  // ─────────────────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────────────────
  // Step: QRIS Paid — SUCCESS
  // ─────────────────────────────────────────────────────────────────────────

  if (step === "qris-paid") {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <Link to="/jamaah"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="font-semibold">Pembayaran Berhasil</h1>
        </div>
        <div className="flex flex-col items-center justify-center p-8 text-center mt-8">
          <div className="w-24 h-24 rounded-full bg-purple-100 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-12 w-12 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Pembayaran QRIS Lunas!</h2>
          <p className="text-muted-foreground text-sm mb-1">
            <span className="font-mono font-semibold text-purple-700">{transactionRef}</span>
          </p>
          <p className="text-muted-foreground text-sm mb-2">
            {formatCurrency(amountNum)} telah diterima
          </p>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6 text-left w-full max-w-xs">
            <div className="flex gap-2">
              <Zap className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
              <p className="text-xs text-purple-700">
                Pembayaran Anda telah dikonfirmasi secara otomatis. Tidak perlu menunggu verifikasi admin.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <Link to="/jamaah/payment-history">
              <Button className="w-full bg-purple-600 hover:bg-purple-700">Lihat Riwayat Bayar</Button>
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

  // ─────────────────────────────────────────────────────────────────────────
  // Step: Manual success (non-QRIS)
  // ─────────────────────────────────────────────────────────────────────────

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
          <p className="text-muted-foreground text-sm mb-1">
            Ref: <span className="font-mono font-medium">{transactionRef}</span>
          </p>
          <p className="text-muted-foreground text-sm mb-6">
            Pembayaran Anda sedang diverifikasi oleh tim kami dalam 1×24 jam kerja.
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

  // ─────────────────────────────────────────────────────────────────────────
  // Step: Loading / Processing
  // ─────────────────────────────────────────────────────────────────────────

  if (step === "processing" || step === "generating-qr") {
    const isQrisGen = step === "generating-qr";
    return (
      <div className="min-h-screen bg-gray-50 pb-24 flex flex-col items-center justify-center gap-4">
        <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center">
          {isQrisGen
            ? <QrCode className="h-10 w-10 text-purple-600 animate-pulse" />
            : <Loader2 className="h-10 w-10 animate-spin text-primary" />}
        </div>
        <div className="text-center">
          <p className="font-semibold text-lg">
            {isQrisGen ? "Membuat QR Code QRIS..." : "Memproses Pembayaran..."}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Mohon tunggu sebentar</p>
        </div>
        <JamaahBottomNav />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step: Showing QR Code
  // ─────────────────────────────────────────────────────────────────────────

  if (step === "showing-qr" && qrisData) {
    if (qrisExpired) {
      return (
        <div className="min-h-screen bg-gray-50 pb-24">
          <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
            <button onClick={() => { setStep("form"); setQrisData(null); }}>
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-semibold">Pembayaran QRIS</h1>
          </div>
          <div className="p-4 flex flex-col items-center justify-center gap-4 mt-12 text-center">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
              <TimerOff className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="text-lg font-bold">QR Code Kedaluwarsa</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              QR Code ini sudah tidak berlaku. Silakan buat QR Code baru untuk melanjutkan pembayaran.
            </p>
            <Button className="w-full max-w-xs bg-purple-600 hover:bg-purple-700" onClick={generateQris}>
              <RefreshCw className="h-4 w-4 mr-2" /> Buat QR Baru
            </Button>
            <Button variant="outline" className="w-full max-w-xs"
              onClick={() => { setStep("form"); setQrisData(null); setQrisExpired(false); }}>
              Ganti Metode Bayar
            </Button>
          </div>
          <JamaahBottomNav />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <button onClick={() => { setStep("form"); setQrisData(null); }}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-semibold">Scan QR Code QRIS</h1>
        </div>
        <div className="p-4 max-w-md mx-auto">
          <QrisDisplay
            qrData={qrisData}
            booking={booking}
            amountNum={amountNum}
            paymentType={selectedType}
            onPaid={handleQrisPaid}
            onExpire={() => setQrisExpired(true)}
            onCancel={() => { setStep("form"); setQrisData(null); }}
          />
        </div>
        <JamaahBottomNav />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step: Confirm
  // ─────────────────────────────────────────────────────────────────────────

  if (step === "confirm") {
    const method = PAYMENT_METHODS.find(m => m.id === selectedMethod);
    const ptype  = PAYMENT_TYPE_OPTIONS.find(t => t.id === selectedType);
    const isQris = selectedMethod === "qris";

    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <button onClick={() => setStep("form")}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="font-semibold">Konfirmasi Pembayaran</h1>
        </div>
        <div className="p-4 space-y-4 max-w-md mx-auto">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Jenis Pembayaran</span>
                <span className="font-medium">{ptype?.label}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Metode</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{method?.label}</span>
                  {isQris && (
                    <Badge className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0">
                      <Zap className="h-2.5 w-2.5 mr-0.5" /> Instan
                    </Badge>
                  )}
                </div>
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

          {isQris ? (
            <Alert className="border-purple-200 bg-purple-50">
              <QrCode className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-xs text-purple-700">
                Setelah klik tombol di bawah, QR Code QRIS akan muncul. Scan dengan m-banking atau e-wallet Anda.
                Pembayaran dikonfirmasi <strong>otomatis</strong> — tidak perlu upload bukti.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-blue-200 bg-blue-50">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-xs text-blue-700">
                Pembayaran akan tercatat dan diverifikasi oleh tim admin dalam 1×24 jam kerja.
              </AlertDescription>
            </Alert>
          )}

          <Button
            className={`w-full ${isQris ? "bg-purple-600 hover:bg-purple-700" : ""}`}
            onClick={handleConfirm}
            disabled={submitMutation.isPending}
          >
            {isQris
              ? <><QrCode className="h-4 w-4 mr-2" /> Tampilkan QR Code</>
              : <><Shield className="h-4 w-4 mr-2" /> Konfirmasi &amp; Bayar</>}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setStep("form")}>Batal</Button>
        </div>
        <JamaahBottomNav />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step: Form (main)
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <Link to="/jamaah"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="font-semibold">Pembayaran Online</h1>
      </div>

      <div className="p-4 space-y-4 max-w-md mx-auto">

        {/* Status Tagihan */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status Tagihan</CardTitle>
            <CardDescription>
              {(booking as any)?.booking_code} — {(booking as any)?.departure?.package?.name}
            </CardDescription>
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
            {/* Jenis Pembayaran */}
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
              <div className="flex gap-2 mt-2 flex-wrap">
                {[500000, 1000000, 2000000, 5000000].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(v.toLocaleString("id-ID"))}
                    className="px-2 py-1 text-xs border rounded-lg bg-white hover:bg-primary/5 hover:border-primary transition-colors"
                  >
                    {formatCurrency(v).replace(/Rp\s?/, "")}
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

            {/* Metode Pembayaran */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">Metode Pembayaran</Label>
              <div className="space-y-2">
                {PAYMENT_METHODS.map((m) => {
                  const Icon = m.icon;
                  const isSelected = selectedMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMethod(m.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        isSelected
                          ? `${m.border} ${m.bg} ring-1 ring-current`
                          : "border-border bg-white hover:border-primary/40"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${m.bg}`}>
                        <Icon className={`h-5 w-5 ${m.color}`} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium">{m.label}</span>
                          {m.badge && (
                            <span className={`text-[10px] px-1.5 py-0 rounded-full font-medium ${m.badgeCls}`}>
                              {m.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{m.desc}</div>
                      </div>
                      {isSelected && <CheckCircle2 className={`h-5 w-5 ${m.color} shrink-0`} />}
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
              {(payments as any[]).slice(0, 3).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between bg-white border rounded-xl p-3">
                  <div>
                    <div className="text-sm font-medium">{formatCurrency(Number(p.amount))}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.created_at
                        ? format(new Date(p.created_at), "d MMM yyyy", { locale: localeId })
                        : "-"}
                      {p.payment_method === "qris" && (
                        <span className="ml-1.5 text-purple-600 font-medium">· QRIS</span>
                      )}
                    </div>
                  </div>
                  <Badge variant="default" className="text-xs bg-green-100 text-green-700 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Terverifikasi
                  </Badge>
                </div>
              ))}
              <Link to="/jamaah/payment-history"
                className="flex items-center justify-center gap-1 text-xs text-primary py-1">
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
