import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";
import {
  CreditCard, Building2, Upload, CheckCircle2, Loader2,
  ArrowLeft, Copy, Zap, ExternalLink, AlertCircle, Info,
  Landmark, Clock, ShieldCheck,
} from "lucide-react";
import { DynamicPublicLayout } from "@/components/layout/DynamicPublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const API = "/api/v1/payments";

// ─── Midtrans Snap loader ─────────────────────────────────────────────────────
function useMidtransSnap(clientKey: string | null, isProduction: boolean) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!clientKey) return;
    const existing = document.getElementById("midtrans-snap-js");
    if (existing) { setReady(true); return; }
    const script = document.createElement("script");
    script.id = "midtrans-snap-js";
    script.src = isProduction
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";
    script.setAttribute("data-client-key", clientKey);
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, [clientKey, isProduction]);
  return ready;
}

export default function PublicPaymentPage() {
  const { bookingCode } = useParams() as { bookingCode: string };

  // Form state
  const [tab, setTab] = useState("transfer");
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [paymentCode, setPaymentCode] = useState("");
  const [isPayingGateway, setIsPayingGateway] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Fetch booking summary ─────────────────────────────────────────────────
  const { data: bk, isLoading: bkLoading, error: bkError } = useQuery({
    queryKey: ["pub-payment-booking", bookingCode],
    queryFn: async () => {
      const r = await fetch(`${API}/booking-summary/${bookingCode}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Booking tidak ditemukan");
      return d.booking;
    },
    enabled: !!bookingCode,
  });

  // ── Fetch bank accounts ───────────────────────────────────────────────────
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["pub-bank-accounts"],
    queryFn: async () => {
      const r = await fetch(`${API}/bank-accounts`);
      const d = await r.json();
      return d.accounts || [];
    },
  });

  // ── Fetch gateway status ──────────────────────────────────────────────────
  const { data: gateway } = useQuery({
    queryKey: ["pub-gateway-status"],
    queryFn: async () => {
      const r = await fetch(`${API}/gateway-status`);
      return r.json();
    },
  });

  const snapReady = useMidtransSnap(
    gateway?.midtrans?.client_key ?? null,
    gateway?.midtrans?.is_production ?? false,
  );

  // ── Auto-fill amount with remaining ──────────────────────────────────────
  useEffect(() => {
    if (bk?.remaining_amount && !amount) {
      setAmount(String(bk.remaining_amount));
    }
  }, [bk]);

  // ── File handler ─────────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("Ukuran file maksimal 5 MB"); return; }
    setProofFile(f);
    const reader = new FileReader();
    reader.onload = () => setProofPreview(reader.result as string);
    reader.readAsDataURL(f);
  }

  // ── Upload proof file ─────────────────────────────────────────────────────
  async function uploadProofFile(): Promise<string | null> {
    if (!proofFile) return null;
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(proofFile);
    });
    const r = await fetch(`${API}/upload-proof`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: proofFile.name,
        mimeType: proofFile.type,
        data: base64,
      }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Gagal upload bukti");
    return d.url;
  }

  // ── Submit transfer confirmation ──────────────────────────────────────────
  async function handleTransferSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bk) return;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Masukkan jumlah pembayaran yang valid"); return;
    }
    setIsSubmitting(true);
    try {
      let proofUrl: string | null = null;
      if (proofFile) {
        proofUrl = await uploadProofFile();
      }
      const r = await fetch(`${API}/transfer-confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id:     bk.id,
          booking_code:   bk.booking_code,
          amount:         Number(amount),
          payment_method: "transfer",
          bank_name:      bankName,
          account_name:   accountName,
          account_number: accountNumber,
          notes,
          proof_url:      proofUrl,
          proof_filename: proofFile?.name,
          customer_name:  bk.customer_name,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal mengirim konfirmasi");
      setPaymentCode(d.payment_code);
      setSubmitted(true);
      toast.success("Konfirmasi pembayaran berhasil dikirim!");
    } catch (e: any) {
      toast.error(e.message);
    }
    setIsSubmitting(false);
  }

  // ── Pay with Midtrans Snap ────────────────────────────────────────────────
  async function handleMidtransPay() {
    if (!bk || !window.snap) { toast.error("Midtrans belum siap"); return; }
    const remaining = bk.remaining_amount;
    if (remaining <= 0) { toast.error("Tidak ada tagihan yang perlu dibayar"); return; }
    setIsPayingGateway(true);
    try {
      const r = await fetch("/api/midtrans/create-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id:    bk.id,
          booking_code:  bk.booking_code,
          amount:        remaining,
          customer_name: bk.customer_name || "Jamaah",
          customer_email: bk.customer_email || "",
          customer_phone: bk.customer_phone || "",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal membuat transaksi Midtrans");
      window.snap.pay(d.token, {
        onSuccess: () => { toast.success("Pembayaran berhasil!"); setSubmitted(true); },
        onPending: () => toast.info("Pembayaran pending, cek status di inbox Anda"),
        onError: () => toast.error("Pembayaran gagal"),
        onClose: () => setIsPayingGateway(false),
      });
    } catch (e: any) {
      toast.error(e.message);
    }
    setIsPayingGateway(false);
  }

  // ── Pay with Xendit ───────────────────────────────────────────────────────
  async function handleXenditPay() {
    if (!bk) return;
    setIsPayingGateway(true);
    try {
      const r = await fetch("/api/xendit/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id:    bk.id,
          booking_code:  bk.booking_code,
          amount:        bk.remaining_amount,
          customer_name: bk.customer_name || "Jamaah",
          customer_email: bk.customer_email || "",
          customer_phone: bk.customer_phone || "",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal membuat invoice Xendit");
      window.open(d.invoice_url, "_blank");
      toast.success("Halaman pembayaran Xendit dibuka di tab baru");
    } catch (e: any) {
      toast.error(e.message);
    }
    setIsPayingGateway(false);
  }

  const remaining = bk?.remaining_amount ?? 0;
  const isPaid    = bk?.payment_status === "paid" || remaining <= 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DynamicPublicLayout>
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/50 to-white py-10 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Link to="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <CreditCard className="h-6 w-6 text-emerald-600" /> Pembayaran
              </h1>
              <p className="text-muted-foreground text-sm">
                Booking <span className="font-mono font-semibold">{bookingCode}</span>
              </p>
            </div>
          </div>

          {/* Loading / Error */}
          {bkLoading && (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Memuat data booking...
            </div>
          )}
          {bkError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {(bkError as Error).message}. Pastikan kode booking benar.
              </AlertDescription>
            </Alert>
          )}

          {/* Booking Summary */}
          {bk && (
            <Card className="border-emerald-100 bg-emerald-50/30">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm text-muted-foreground">Paket</p>
                    <p className="font-semibold">{bk.package_name || "—"}</p>
                    {bk.departure_date && (
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(bk.departure_date), "dd MMMM yyyy", { locale: idLocale })}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">{bk.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-bold text-lg">{formatCurrency(bk.total_price)}</p>
                    <p className="text-xs text-muted-foreground">Sudah dibayar: {formatCurrency(bk.paid_amount)}</p>
                    <Badge className={cn("mt-1 text-xs",
                      isPaid ? "bg-green-100 text-green-700 border-green-200"
                             : "bg-amber-100 text-amber-700 border-amber-200",
                      "border"
                    )}>
                      {isPaid ? "Lunas" : `Sisa: ${formatCurrency(remaining)}`}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Already paid */}
          {bk && isPaid && !submitted && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="font-semibold text-green-800">Pembayaran sudah lunas!</p>
                <p className="text-sm text-green-700 mt-1">Terima kasih, booking Anda sudah terkonfirmasi.</p>
              </CardContent>
            </Card>
          )}

          {/* Success state */}
          {submitted && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="py-10 text-center space-y-3">
                <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
                <p className="text-xl font-bold text-emerald-800">Konfirmasi Diterima!</p>
                {paymentCode && (
                  <p className="text-sm text-emerald-700">
                    Kode konfirmasi: <span className="font-mono font-bold">{paymentCode}</span>
                  </p>
                )}
                <Alert className="bg-white border-emerald-200 text-left">
                  <Info className="h-4 w-4 text-emerald-600" />
                  <AlertDescription className="text-emerald-800 text-sm">
                    Tim kami akan memverifikasi pembayaran Anda dalam 1×24 jam kerja.
                    Anda akan dihubungi via WhatsApp setelah verifikasi selesai.
                  </AlertDescription>
                </Alert>
                <Link to="/">
                  <Button variant="outline" className="mt-2">Kembali ke Beranda</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Payment methods */}
          {bk && !isPaid && !submitted && (
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="w-full">
                <TabsTrigger value="transfer" className="flex-1">
                  <Building2 className="h-3.5 w-3.5 mr-1.5" /> Transfer Bank
                </TabsTrigger>
                {gateway?.any_gateway && (
                  <TabsTrigger value="gateway" className="flex-1">
                    <Zap className="h-3.5 w-3.5 mr-1.5" /> Bayar Online
                  </TabsTrigger>
                )}
              </TabsList>

              {/* ── TRANSFER TAB ── */}
              <TabsContent value="transfer" className="space-y-4 mt-4">
                {/* Bank accounts */}
                {bankAccounts.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Landmark className="h-4 w-4 text-emerald-600" />
                        Transfer ke Rekening Berikut
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {bankAccounts.map((acc: any) => (
                        <div key={acc.id} className={cn(
                          "rounded-lg border p-3 flex items-center gap-3",
                          acc.is_primary && "border-emerald-200 bg-emerald-50/30"
                        )}>
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm shrink-0">
                            {acc.bank_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{acc.bank_name}</p>
                            <p className="font-mono text-base font-bold tracking-wider">{acc.account_number}</p>
                            <p className="text-xs text-muted-foreground">a/n {acc.account_name}{acc.branch ? ` — Cabang ${acc.branch}` : ""}</p>
                          </div>
                          {acc.is_primary && <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200 border shrink-0">Utama</Badge>}
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                            onClick={() => { navigator.clipboard.writeText(acc.account_number); toast.success("Nomor rekening disalin"); }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Transfer amount */}
                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 text-sm">
                    Transfer sebesar <strong>{formatCurrency(remaining)}</strong> untuk melunasi tagihan.
                    Boleh transfer sebagian (cicilan).
                  </AlertDescription>
                </Alert>

                {/* Confirmation form */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Konfirmasi Transfer</CardTitle>
                    <CardDescription className="text-xs">
                      Isi data transfer Anda agar tim kami bisa memverifikasi dengan cepat
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleTransferSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Jumlah Transfer (Rp) *</Label>
                          <Input
                            type="number"
                            className="h-9"
                            placeholder={String(remaining)}
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Dari Bank</Label>
                          <Input
                            className="h-9"
                            placeholder="BCA, BRI, Mandiri..."
                            value={bankName}
                            onChange={e => setBankName(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Nama Pengirim</Label>
                          <Input
                            className="h-9"
                            placeholder="Sesuai nama di rekening"
                            value={accountName}
                            onChange={e => setAccountName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">No. Rekening Pengirim</Label>
                          <Input
                            className="h-9"
                            placeholder="Opsional"
                            value={accountNumber}
                            onChange={e => setAccountNumber(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Upload proof */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Bukti Transfer (JPG, PNG, PDF — maks 5 MB)</Label>
                        <div
                          className={cn(
                            "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-emerald-400 transition-colors",
                            proofFile ? "border-emerald-400 bg-emerald-50/30" : "border-border"
                          )}
                          onClick={() => fileRef.current?.click()}
                        >
                          {proofPreview && proofFile?.type?.startsWith("image/") ? (
                            <img src={proofPreview} alt="preview" className="max-h-32 mx-auto rounded object-contain" />
                          ) : proofFile ? (
                            <div className="flex items-center justify-center gap-2 text-emerald-700">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-sm font-medium">{proofFile.name}</span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">Klik untuk upload bukti transfer</p>
                              <p className="text-xs text-muted-foreground">JPG, PNG, WebP, PDF — maks 5 MB</p>
                            </div>
                          )}
                        </div>
                        <input
                          ref={fileRef}
                          type="file"
                          className="hidden"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          onChange={handleFileChange}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Catatan (opsional)</Label>
                        <Textarea
                          className="h-16 resize-none text-sm"
                          placeholder="Informasi tambahan..."
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                        />
                      </div>

                      <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Mengirim...</>
                        ) : (
                          <><ShieldCheck className="h-4 w-4 mr-2" /> Kirim Konfirmasi Transfer</>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── GATEWAY TAB ── */}
              <TabsContent value="gateway" className="space-y-4 mt-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 text-sm">
                    Bayar online via payment gateway. Status pembayaran diperbarui otomatis.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  {/* Midtrans */}
                  {gateway?.midtrans?.enabled && (
                    <Card>
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">MT</div>
                        <div className="flex-1">
                          <p className="font-semibold">Midtrans</p>
                          <p className="text-xs text-muted-foreground">Transfer, QRIS, Virtual Account, Kartu Kredit</p>
                        </div>
                        <Button
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={handleMidtransPay}
                          disabled={isPayingGateway || !snapReady}
                        >
                          {!snapReady ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Zap className="h-4 w-4 mr-1.5" /> Bayar Sekarang</>}
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Xendit */}
                  {gateway?.xendit?.enabled && (
                    <Card>
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm shrink-0">XD</div>
                        <div className="flex-1">
                          <p className="font-semibold">Xendit</p>
                          <p className="text-xs text-muted-foreground">Transfer, QRIS, Virtual Account, E-Wallet</p>
                        </div>
                        <Button
                          className="bg-purple-600 hover:bg-purple-700"
                          onClick={handleXenditPay}
                          disabled={isPayingGateway}
                        >
                          {isPayingGateway ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ExternalLink className="h-4 w-4 mr-1.5" /> Bayar</>}
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {!gateway?.midtrans?.enabled && !gateway?.xendit?.enabled && (
                    <Card>
                      <CardContent className="py-10 text-center text-muted-foreground">
                        <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Payment gateway belum dikonfigurasi.</p>
                        <p className="text-xs mt-1">Gunakan tab Transfer Bank untuk membayar.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Steps info */}
          {bk && !isPaid && !submitted && (
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <p className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Alur Pembayaran</p>
                <div className="space-y-2">
                  {[
                    { n: "1", text: "Transfer ke rekening yang tertera di atas" },
                    { n: "2", text: "Kirim konfirmasi dengan upload bukti transfer" },
                    { n: "3", text: "Tim finance memverifikasi dalam 1×24 jam kerja" },
                    { n: "4", text: "Status booking diperbarui & Anda dihubungi via WA" },
                  ].map(s => (
                    <div key={s.n} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{s.n}</div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{s.text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DynamicPublicLayout>
  );
}
