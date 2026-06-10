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
import {
  ArrowLeft, Upload, Loader2, CheckCircle, CreditCard,
  Zap, AlertCircle, Wallet, ExternalLink, ArrowRight,
} from "lucide-react";
import { useFinanceNotifier } from "@/hooks/useFinanceNotifier";
import { createXenditInvoice, getXenditConfigStatus } from "@/lib/paymentGateway";

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

// ─── Midtrans Snap loader ─────────────────────────────────────────────────────

function useMidtransSnap(clientKey: string | null) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!clientKey) return;
    const existing = document.getElementById("midtrans-snap-script");
    if (existing) { setReady(true); return; }

    const isProduction = false;
    const script = document.createElement("script");
    script.id = "midtrans-snap-script";
    script.src = isProduction
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";
    script.setAttribute("data-client-key", clientKey);
    script.onload = () => setReady(true);
    script.onerror = () => console.warn("[Midtrans] Gagal memuat Snap.js");
    document.head.appendChild(script);
  }, [clientKey]);

  return ready;
}

// ─── Gateway selector card ────────────────────────────────────────────────────

type Gateway = "midtrans" | "xendit" | null;

interface GatewayCardProps {
  id: "midtrans" | "xendit";
  selected: Gateway;
  onSelect: (g: Gateway) => void;
  available: boolean;
  loading: boolean;
  title: string;
  badge?: string;
  badgeColor?: string;
  description: string;
  icon: React.ReactNode;
  accentClass: string;
  disabledReason?: string;
}

function GatewayCard({
  id, selected, onSelect, available, loading,
  title, badge, badgeColor, description,
  icon, accentClass, disabledReason,
}: GatewayCardProps) {
  const isSelected = selected === id;
  const disabled = !available || loading;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(id)}
      className={`relative w-full text-left rounded-xl border-2 p-4 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        disabled
          ? "opacity-50 cursor-not-allowed border-border bg-muted/30"
          : isSelected
          ? `border-current ${accentClass} shadow-sm`
          : "border-border bg-card hover:border-muted-foreground/40 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg shrink-0 ${isSelected ? "bg-white/60" : "bg-muted"}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold text-sm">{title}</span>
            {badge && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badgeColor}`}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {disabled && disabledReason ? disabledReason : description}
          </p>
        </div>
        {/* Selected indicator */}
        <div className={`mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
          isSelected ? "border-current bg-current" : "border-muted-foreground/40"
        }`}>
          {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
        </div>
      </div>
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

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

  const [selectedGateway, setSelectedGateway] = useState<Gateway>(null);
  const [isPayingOnline, setIsPayingOnline] = useState(false);

  // Xendit invoice result (shown after creation)
  const [xenditInvoice, setXenditInvoice] = useState<{
    invoice_url: string;
    external_id: string;
    expiry_date: string;
    amount: number;
  } | null>(null);

  const { notifyFinance } = useFinanceNotifier();
  const supabaseRaw: any = supabase;

  // ── Midtrans config ─────────────────────────────────────────────────────

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

  // ── Xendit config ───────────────────────────────────────────────────────

  const { data: xenditConfig, isLoading: xenditConfigLoading } = useQuery({
    queryKey: ["xendit-config-status"],
    queryFn: () => getXenditConfigStatus(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const xenditEnabled = xenditConfig?.ready === true;

  // Auto-select the only available gateway
  useEffect(() => {
    if (selectedGateway) return;
    if (midtransEnabled && !xenditEnabled) setSelectedGateway("midtrans");
    else if (xenditEnabled && !midtransEnabled) setSelectedGateway("xendit");
  }, [midtransEnabled, xenditEnabled, selectedGateway]);

  // ── Bank account ─────────────────────────────────────────────────────────

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

  // ── Booking data ─────────────────────────────────────────────────────────

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

  const remaining = (booking as any)?.remaining_amount ?? 0;
  const customer = (booking as any)?.customer;

  // ── Midtrans Snap pay ─────────────────────────────────────────────────────

  const handleSnapPay = async () => {
    if (!booking || !user) return;
    if (!window.snap) {
      toast.error("Midtrans Snap belum siap. Coba lagi sebentar.");
      return;
    }
    if (remaining <= 0) {
      toast.error("Tidak ada sisa tagihan yang perlu dibayar.");
      return;
    }

    setIsPayingOnline(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";
      const res = await fetch(`${apiBase}/api/midtrans/create-transaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: booking.id,
          booking_code: booking.booking_code,
          amount: remaining,
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
            amount: remaining,
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
            amount: remaining,
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
          setIsPayingOnline(false);
        },
        onClose: () => {
          setIsPayingOnline(false);
        },
      });
    } catch (err: any) {
      console.error("[Midtrans Snap]", err);
      toast.error(err.message ?? "Gagal memproses pembayaran online");
      setIsPayingOnline(false);
    }
  };

  // ── Xendit Invoice pay ────────────────────────────────────────────────────

  const handleXenditPay = async () => {
    if (!booking || !user) return;
    if (remaining <= 0) {
      toast.error("Tidak ada sisa tagihan yang perlu dibayar.");
      return;
    }

    setIsPayingOnline(true);
    setXenditInvoice(null);

    try {
      const result = await createXenditInvoice({
        bookingId: booking.id,
        bookingCode: booking.booking_code,
        amount: remaining,
        customerName: customer?.full_name ?? user.email ?? "Jamaah",
        customerEmail: customer?.email ?? user.email ?? "",
        customerPhone: customer?.phone ?? "",
      });

      // Record pending payment in DB
      const paymentCode = result.external_id ?? `XEND-${Date.now()}`;
      await supabaseRaw.from("payments").insert({
        booking_id: bookingId,
        payment_code: paymentCode,
        amount: remaining,
        payment_method: "xendit",
        bank_name: "Xendit Invoice",
        account_name: "Online Payment",
        notes: `Xendit invoice: ${result.invoice_id} — URL: ${result.invoice_url}`,
        status: "pending",
      });

      // Show inline result + open in new tab
      setXenditInvoice({
        invoice_url: result.invoice_url,
        external_id: result.external_id,
        expiry_date: result.expiry_date,
        amount: result.amount,
      });

      window.open(result.invoice_url, "_blank", "noopener,noreferrer");
      toast.success("Invoice berhasil dibuat! Tab pembayaran telah dibuka.");
    } catch (err: any) {
      console.error("[Xendit Invoice]", err);
      toast.error(err.message ?? "Gagal membuat invoice Xendit");
    } finally {
      setIsPayingOnline(false);
    }
  };

  // ── Manual transfer submit ────────────────────────────────────────────────

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

      notifyFinance({
        bookingId,
        bookingCode: booking.booking_code,
        customerName: customer?.full_name ?? user?.email ?? "Jamaah",
        amount: amountNum,
      }).catch(() => {});

      toast.success("Bukti pembayaran berhasil diupload! Tim kami akan memverifikasi dalam 1x24 jam.");
      navigate(`/my-bookings/${bookingId}`);
    } catch (error: any) {
      console.error("Payment upload error:", error);
      toast.error(error.message ?? "Gagal mengupload bukti pembayaran");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render guards ─────────────────────────────────────────────────────────

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
  const anyGatewayEnabled = midtransEnabled || xenditEnabled;

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

        {/* ── Online Payment Section ─────────────────────────────────────── */}
        {anyGatewayEnabled && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Bayar Online
                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs ml-auto">
                  Rekomendasi
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Konfirmasi otomatis — tidak perlu upload bukti transfer.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Gateway cards */}
              {(midtransEnabled || xenditEnabled) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <GatewayCard
                    id="midtrans"
                    selected={selectedGateway}
                    onSelect={setSelectedGateway}
                    available={midtransEnabled}
                    loading={false}
                    title="Midtrans"
                    badge="Popup"
                    badgeColor="bg-orange-100 text-orange-700"
                    description="Kartu kredit, GoPay, ShopeePay, OVO, QRIS, VA BCA/BNI/Mandiri. Bayar tanpa meninggalkan halaman ini."
                    icon={<CreditCard className="h-5 w-5 text-orange-600" />}
                    accentClass="bg-orange-50 border-orange-400 text-orange-700"
                    disabledReason="Belum dikonfigurasi oleh admin"
                  />
                  <GatewayCard
                    id="xendit"
                    selected={selectedGateway}
                    onSelect={setSelectedGateway}
                    available={xenditEnabled}
                    loading={xenditConfigLoading}
                    title="Xendit"
                    badge="Link"
                    badgeColor="bg-blue-100 text-blue-700"
                    description="OVO, DANA, LinkAja, ShopeePay, QRIS, VA 8 bank, kartu kredit, Alfamart & Indomaret."
                    icon={<Wallet className="h-5 w-5 text-blue-600" />}
                    accentClass="bg-blue-50 border-blue-400 text-blue-700"
                    disabledReason="Belum dikonfigurasi oleh admin"
                  />
                </div>
              )}

              {/* Xendit invoice result */}
              {xenditInvoice && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-blue-800 font-medium">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    Invoice berhasil dibuat!
                  </div>
                  <p className="text-sm text-blue-700">
                    Nominal: <strong>{formatCurrency(xenditInvoice.amount)}</strong>
                    {xenditInvoice.expiry_date && (
                      <> — kadaluarsa{" "}
                        <strong>
                          {new Date(xenditInvoice.expiry_date).toLocaleString("id-ID", {
                            day: "numeric", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </strong>
                      </>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 gap-2"
                      onClick={() => window.open(xenditInvoice.invoice_url, "_blank", "noopener,noreferrer")}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Buka Halaman Pembayaran
                    </Button>
                    <Button
                      size="sm" variant="outline"
                      onClick={() => navigate(`/my-bookings/${bookingId}`)}
                    >
                      Sudah Bayar — Cek Status
                    </Button>
                  </div>
                  <p className="text-xs text-blue-600">
                    Halaman pembayaran juga sudah dibuka di tab baru. Status diperbarui otomatis setelah pembayaran selesai.
                  </p>
                </div>
              )}

              {/* Pay button */}
              {selectedGateway === "midtrans" && (
                <Button
                  className="w-full bg-orange-600 hover:bg-orange-700 gap-2"
                  onClick={handleSnapPay}
                  disabled={isPayingOnline || !snapReady || remaining <= 0}
                >
                  {isPayingOnline ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Memproses...</>
                  ) : !snapReady ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Memuat Midtrans...</>
                  ) : (
                    <><Zap className="h-4 w-4" />Bayar {formatCurrency(remaining)} via Midtrans</>
                  )}
                </Button>
              )}

              {selectedGateway === "xendit" && !xenditInvoice && (
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 gap-2"
                  onClick={handleXenditPay}
                  disabled={isPayingOnline || remaining <= 0}
                >
                  {isPayingOnline ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Membuat Invoice...</>
                  ) : (
                    <><Wallet className="h-4 w-4" />Bayar {formatCurrency(remaining)} via Xendit <ArrowRight className="h-4 w-4 ml-1" /></>
                  )}
                </Button>
              )}

              {!selectedGateway && !xenditConfigLoading && (
                <p className="text-xs text-muted-foreground text-center py-1">
                  Pilih gateway pembayaran di atas untuk melanjutkan.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* No gateway warning */}
        {!anyGatewayEnabled && !xenditConfigLoading && (
          <Card className="mb-5 border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Pembayaran online belum aktif. Silakan lakukan transfer manual dan upload bukti di bawah.
              </p>
            </CardContent>
          </Card>
        )}

        {anyGatewayEnabled && (
          <div className="flex items-center gap-3 mb-6">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground px-2">atau bayar via transfer manual</span>
            <Separator className="flex-1" />
          </div>
        )}

        {/* ── Manual transfer + summary ──────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-5">
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
