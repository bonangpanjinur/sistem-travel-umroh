import { useState, useEffect, useCallback } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2, AlertCircle, RefreshCcw, Eye, EyeOff,
  Wallet, Zap, QrCode, Building2, FileText, Copy, Info,
  ShieldCheck, ExternalLink,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConfigStatus {
  secret_key_configured: boolean;
  callback_token_configured: boolean;
  environment: "live" | "test";
  ready: boolean;
  key_hint: string | null;
}

interface TestResult {
  success: boolean;
  message: string;
  environment?: string;
  balance?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

const XENDIT_VA_BANKS = [
  { value: "BCA", label: "BCA" },
  { value: "BNI", label: "BNI" },
  { value: "BRI", label: "BRI" },
  { value: "MANDIRI", label: "Mandiri" },
  { value: "PERMATA", label: "Permata" },
  { value: "BSI", label: "BSI" },
  { value: "BJB", label: "BJB" },
  { value: "CIMB", label: "CIMB Niaga" },
];

const XENDIT_PAYMENT_METHODS = [
  { value: "CREDIT_CARD", label: "Kartu Kredit" },
  { value: "BCA", label: "BCA VA" },
  { value: "BNI", label: "BNI VA" },
  { value: "BRI", label: "BRI VA" },
  { value: "MANDIRI", label: "Mandiri VA" },
  { value: "PERMATA", label: "Permata VA" },
  { value: "BSI", label: "BSI VA" },
  { value: "QRIS", label: "QRIS" },
  { value: "OVO", label: "OVO" },
  { value: "DANA", label: "DANA" },
  { value: "LINKAJA", label: "LinkAja" },
  { value: "SHOPEEPAY", label: "ShopeePay" },
  { value: "ALFAMART", label: "Alfamart" },
  { value: "INDOMARET", label: "Indomaret" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminXendit() {
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  const [testKey, setTestKey] = useState("");
  const [showTestKey, setShowTestKey] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const [demoForm, setDemoForm] = useState({
    booking_code: "DEMO-001",
    amount: "1000000",
    customer_name: "Jamaah Test",
    customer_email: "test@vinstour.com",
    customer_phone: "+6281234567890",
    bank: "BNI",
    payment_methods: [] as string[],
  });
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoResult, setDemoResult] = useState<any>(null);
  const [demoError, setDemoError] = useState<string | null>(null);

  // ─── Load config status ───────────────────────────────────────────────────

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/xendit/config-status`);
      if (r.ok) setConfig(await r.json());
    } catch {
      // silently ignore network errors
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  // ─── Test connection ──────────────────────────────────────────────────────

  const testConnection = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const body: Record<string, unknown> = {};
      if (testKey.trim()) body.secret_key = testKey.trim();
      const r = await fetch(`${API_BASE}/api/xendit/test-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setTestResult(await r.json());
    } catch (e: any) {
      setTestResult({ success: false, message: `Error: ${e.message}` });
    } finally {
      setTestLoading(false);
    }
  };

  // ─── Demo Invoice ─────────────────────────────────────────────────────────

  const createDemoInvoice = async () => {
    setDemoLoading(true);
    setDemoResult(null);
    setDemoError(null);
    try {
      const payload: Record<string, unknown> = {
        booking_id: "demo",
        booking_code: demoForm.booking_code,
        amount: Number(demoForm.amount),
        customer_name: demoForm.customer_name,
        customer_email: demoForm.customer_email,
        customer_phone: demoForm.customer_phone,
      };
      if (demoForm.payment_methods.length > 0) {
        payload.payment_methods = demoForm.payment_methods;
      }
      const r = await fetch(`${API_BASE}/api/xendit/create-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) setDemoError(data.error || "Gagal membuat invoice");
      else setDemoResult(data);
    } catch (e: any) {
      setDemoError(e.message);
    } finally {
      setDemoLoading(false);
    }
  };

  // ─── Demo QRIS ────────────────────────────────────────────────────────────

  const createDemoQRIS = async () => {
    setDemoLoading(true);
    setDemoResult(null);
    setDemoError(null);
    try {
      const r = await fetch(`${API_BASE}/api/xendit/create-qris`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_code: demoForm.booking_code,
          amount: Number(demoForm.amount),
          customer_name: demoForm.customer_name,
        }),
      });
      const data = await r.json();
      if (!r.ok) setDemoError(data.error || "Gagal membuat QRIS");
      else setDemoResult(data);
    } catch (e: any) {
      setDemoError(e.message);
    } finally {
      setDemoLoading(false);
    }
  };

  // ─── Demo VA ──────────────────────────────────────────────────────────────

  const createDemoVA = async () => {
    setDemoLoading(true);
    setDemoResult(null);
    setDemoError(null);
    try {
      const r = await fetch(`${API_BASE}/api/xendit/create-va`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_code: demoForm.booking_code,
          amount: Number(demoForm.amount),
          customer_name: demoForm.customer_name,
          customer_email: demoForm.customer_email,
          bank: demoForm.bank,
        }),
      });
      const data = await r.json();
      if (!r.ok) setDemoError(data.error || "Gagal membuat Virtual Account");
      else setDemoResult(data);
    } catch (e: any) {
      setDemoError(e.message);
    } finally {
      setDemoLoading(false);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text).catch(() => {});

  const togglePaymentMethod = (method: string) => {
    setDemoForm(prev => ({
      ...prev,
      payment_methods: prev.payment_methods.includes(method)
        ? prev.payment_methods.filter(m => m !== method)
        : [...prev.payment_methods, method],
    }));
  };

  const formatIDR = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  // ─── Render ───────────────────────────────────────────────────────────────

  const webhookUrl = `${window.location.protocol}//${window.location.hostname.replace("5000", "3001")}/api/xendit/notification`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-7 w-7 text-blue-600" />
            Xendit Payment Gateway
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Konfigurasi dan kelola integrasi Xendit — Invoice, QRIS, dan Virtual Account
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadConfig} disabled={configLoading}>
          <RefreshCcw className={`h-4 w-4 mr-1.5 ${configLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Status Banner */}
      {!configLoading && config && (
        <Alert className={config.ready ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50"}>
          <AlertDescription className="flex items-center gap-3">
            {config.ready
              ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              : <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />}
            <div className="flex-1">
              {config.ready ? (
                <span className="text-green-800 font-medium">
                  Xendit aktif &mdash; mode{" "}
                  <Badge className={config.environment === "live" ? "bg-green-600" : "bg-blue-600"}>
                    {config.environment === "live" ? "Live" : "Sandbox / Test"}
                  </Badge>
                  {config.key_hint && (
                    <span className="text-green-700 ml-2 text-xs font-mono">{config.key_hint}</span>
                  )}
                </span>
              ) : (
                <span className="text-amber-800 font-medium">
                  Secret Key belum dikonfigurasi — set <code className="bg-amber-100 px-1 rounded">XENDIT_SECRET_KEY</code> di Replit Secrets
                </span>
              )}
            </div>
            {config.callback_token_configured && (
              <Badge variant="outline" className="text-green-700 border-green-400 shrink-0">
                <ShieldCheck className="h-3 w-3 mr-1" /> Webhook Token OK
              </Badge>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="setup">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="setup">Setup & Test</TabsTrigger>
          <TabsTrigger value="invoice">Invoice</TabsTrigger>
          <TabsTrigger value="qris-va">QRIS & VA</TabsTrigger>
          <TabsTrigger value="webhook">Webhook</TabsTrigger>
        </TabsList>

        {/* ── Tab: Setup & Test ─────────────────────────────────────────── */}
        <TabsContent value="setup" className="space-y-4 mt-4">

          {/* Secret Key Config */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Konfigurasi Secret Key
              </CardTitle>
              <CardDescription>
                Masukkan Xendit Secret Key di{" "}
                <strong>Replit Secrets</strong> (🔒 panel kiri) dengan nama{" "}
                <code className="bg-muted px-1 rounded">XENDIT_SECRET_KEY</code>.
                Restart API Server setelah disimpan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Secret Key</p>
                  <code className="text-sm font-mono font-semibold">XENDIT_SECRET_KEY</code>
                  <p className="text-xs text-muted-foreground">xnd_development_xxx... atau xnd_production_xxx...</p>
                </div>
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Webhook Token (opsional)</p>
                  <code className="text-sm font-mono font-semibold">XENDIT_CALLBACK_TOKEN</code>
                  <p className="text-xs text-muted-foreground">Digunakan untuk verifikasi webhook dari Xendit</p>
                </div>
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Frontend URL (opsional)</p>
                  <code className="text-sm font-mono font-semibold">FRONTEND_URL</code>
                  <p className="text-xs text-muted-foreground">Untuk redirect setelah bayar, mis. https://vinstour.id</p>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Sandbox:</strong> Daftar di{" "}
                  <a href="https://dashboard.xendit.co" target="_blank" rel="noreferrer"
                    className="underline text-blue-600 inline-flex items-center gap-1">
                    dashboard.xendit.co <ExternalLink className="h-3 w-3" />
                  </a>{" "}
                  → Settings → API Keys → buat Test key (dimulai dengan <code>xnd_development_</code>).
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Test Connection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Test Koneksi</CardTitle>
              <CardDescription>
                Masukkan key di bawah untuk test cepat tanpa mengubah Secrets, atau biarkan kosong untuk menggunakan key yang sudah dikonfigurasi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Secret Key untuk diuji (opsional — tidak disimpan)</Label>
                <div className="relative mt-1">
                  <Input
                    type={showTestKey ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="xnd_development_xxxx atau xnd_production_xxxx"
                    value={testKey}
                    onChange={e => setTestKey(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    size="icon" variant="ghost"
                    className="absolute right-1 top-1 h-7 w-7"
                    onClick={() => setShowTestKey(!showTestKey)}
                  >
                    {showTestKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Key ini hanya digunakan untuk test — tidak disimpan ke database manapun
                </p>
              </div>

              {testResult && (
                <Alert className={testResult.success ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}>
                  <AlertDescription className={`flex items-center gap-2 ${testResult.success ? "text-green-800" : "text-red-800"}`}>
                    {testResult.success
                      ? <CheckCircle2 className="h-4 w-4" />
                      : <AlertCircle className="h-4 w-4" />}
                    <div>
                      <p>{testResult.message}</p>
                      {testResult.balance !== null && testResult.balance !== undefined && (
                        <p className="text-xs mt-0.5 font-mono">Balance: {formatIDR(testResult.balance)}</p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <Button onClick={testConnection} disabled={testLoading} className="w-full">
                {testLoading
                  ? <><RefreshCcw className="h-4 w-4 mr-2 animate-spin" />Testing...</>
                  : <><Zap className="h-4 w-4 mr-2" />Test Koneksi ke Xendit</>}
              </Button>
            </CardContent>
          </Card>

          {/* Perbandingan Xendit vs Midtrans */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Xendit vs Midtrans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <p className="font-semibold text-blue-700 flex items-center gap-1">
                    <Wallet className="h-4 w-4" /> Xendit
                  </p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>✅ Invoice link (semua metode sekaligus)</li>
                    <li>✅ QRIS dinamis</li>
                    <li>✅ Virtual Account 8+ bank</li>
                    <li>✅ E-wallet: OVO, DANA, LinkAja, ShopeePay</li>
                    <li>✅ Alfamart & Indomaret</li>
                    <li>✅ Settlement T+1 (Weekdays)</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-orange-700 flex items-center gap-1">
                    <FileText className="h-4 w-4" /> Midtrans
                  </p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>✅ Snap popup terintegrasi</li>
                    <li>✅ QRIS & VA</li>
                    <li>✅ Kartu kredit / debit</li>
                    <li>✅ GoPay & ShopeePay</li>
                    <li>✅ Alfamart & Indomaret</li>
                    <li>⚠️ MDR lebih tinggi untuk kartu kredit</li>
                  </ul>
                </div>
              </div>
              <Separator className="my-3" />
              <p className="text-xs text-muted-foreground">
                Kedua gateway dapat aktif bersamaan. Pilih gateway per transaksi berdasarkan metode pembayaran yang dipilih jamaah.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Invoice ─────────────────────────────────────────────── */}
        <TabsContent value="invoice" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Invoice Xendit (Recommended)
              </CardTitle>
              <CardDescription>
                Xendit Invoice adalah metode paling fleksibel — jamaah mendapat link pembayaran yang mendukung semua metode sekaligus (VA, QRIS, e-wallet, kartu kredit).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Kode Booking</Label>
                  <Input
                    className="mt-1"
                    value={demoForm.booking_code}
                    onChange={e => setDemoForm(p => ({ ...p, booking_code: e.target.value }))}
                    placeholder="UMRH-2025-001"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label className="text-xs">Nominal (IDR)</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    min="10000"
                    value={demoForm.amount}
                    onChange={e => setDemoForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="25000000"
                  />
                </div>
                <div>
                  <Label className="text-xs">Nama Jamaah</Label>
                  <Input
                    className="mt-1"
                    value={demoForm.customer_name}
                    onChange={e => setDemoForm(p => ({ ...p, customer_name: e.target.value }))}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label className="text-xs">Email Jamaah</Label>
                  <Input
                    className="mt-1"
                    type="email"
                    value={demoForm.customer_email}
                    onChange={e => setDemoForm(p => ({ ...p, customer_email: e.target.value }))}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label className="text-xs">No HP Jamaah</Label>
                  <Input
                    className="mt-1"
                    value={demoForm.customer_phone}
                    onChange={e => setDemoForm(p => ({ ...p, customer_phone: e.target.value }))}
                    autoComplete="off"
                    placeholder="+6281234567890"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs mb-2 block">
                  Batasi Metode Pembayaran (kosongkan = semua metode aktif)
                </Label>
                <div className="flex flex-wrap gap-2">
                  {XENDIT_PAYMENT_METHODS.map(m => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => togglePaymentMethod(m.value)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        demoForm.payment_methods.includes(m.value)
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-background text-muted-foreground border-border hover:border-blue-400"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                {demoForm.payment_methods.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Aktif: {demoForm.payment_methods.join(", ")}
                  </p>
                )}
              </div>

              {demoError && (
                <Alert className="border-red-300 bg-red-50">
                  <AlertDescription className="text-red-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {demoError}
                  </AlertDescription>
                </Alert>
              )}

              {demoResult && !demoError && (
                <Alert className="border-green-300 bg-green-50">
                  <AlertDescription className="text-green-900 space-y-2">
                    <p className="font-medium flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Invoice berhasil dibuat!
                    </p>
                    <div className="space-y-1 text-xs font-mono">
                      {demoResult.invoice_url && (
                        <div className="flex items-center gap-2">
                          <span className="text-green-700">Invoice URL:</span>
                          <a href={demoResult.invoice_url} target="_blank" rel="noreferrer"
                            className="text-blue-700 underline truncate max-w-[280px]">
                            {demoResult.invoice_url}
                          </a>
                          <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0"
                            onClick={() => copyToClipboard(demoResult.invoice_url)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      <div><span className="text-green-700">External ID:</span> {demoResult.external_id}</div>
                      <div><span className="text-green-700">Amount:</span> {formatIDR(demoResult.amount)}</div>
                      <div><span className="text-green-700">Expires:</span> {demoResult.expiry_date ? new Date(demoResult.expiry_date).toLocaleString("id-ID") : "-"}</div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={createDemoInvoice}
                disabled={demoLoading || !demoForm.booking_code || !demoForm.amount}
                className="w-full"
              >
                {demoLoading
                  ? <><RefreshCcw className="h-4 w-4 mr-2 animate-spin" />Membuat Invoice...</>
                  : <><FileText className="h-4 w-4 mr-2" />Buat Xendit Invoice (Test)</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: QRIS & VA ────────────────────────────────────────────── */}
        <TabsContent value="qris-va" className="space-y-4 mt-4">

          {/* QRIS */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                QRIS Dinamis
              </CardTitle>
              <CardDescription>
                Buat QR code unik per transaksi — jamaah scan dengan semua aplikasi (GoPay, OVO, Dana, M-Banking).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Kode Booking</Label>
                  <Input
                    className="mt-1" value={demoForm.booking_code}
                    onChange={e => setDemoForm(p => ({ ...p, booking_code: e.target.value }))}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label className="text-xs">Nominal (IDR)</Label>
                  <Input
                    className="mt-1" type="number" min="10000"
                    value={demoForm.amount}
                    onChange={e => setDemoForm(p => ({ ...p, amount: e.target.value }))}
                  />
                </div>
              </div>

              {demoError && (
                <Alert className="border-red-300 bg-red-50">
                  <AlertDescription className="text-red-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {demoError}
                  </AlertDescription>
                </Alert>
              )}

              {demoResult?.qr_string && (
                <Alert className="border-green-300 bg-green-50">
                  <AlertDescription className="space-y-1 text-xs font-mono text-green-900">
                    <p className="font-semibold text-sm">QRIS berhasil dibuat!</p>
                    <div className="flex items-center gap-2">
                      <span className="text-green-700">QR String:</span>
                      <span className="truncate max-w-[200px]">{demoResult.qr_string}</span>
                      <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0"
                        onClick={() => copyToClipboard(demoResult.qr_string)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div><span className="text-green-700">Amount:</span> {formatIDR(demoResult.amount)}</div>
                    <div><span className="text-green-700">Expires:</span> {demoResult.expires_at ? new Date(demoResult.expires_at).toLocaleString("id-ID") : "-"}</div>
                  </AlertDescription>
                </Alert>
              )}

              <Button onClick={createDemoQRIS} disabled={demoLoading} className="w-full" variant="outline">
                {demoLoading
                  ? <><RefreshCcw className="h-4 w-4 mr-2 animate-spin" />Membuat QRIS...</>
                  : <><QrCode className="h-4 w-4 mr-2" />Buat QRIS Test</>}
              </Button>
            </CardContent>
          </Card>

          {/* Virtual Account */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Virtual Account
              </CardTitle>
              <CardDescription>
                Nomor rekening unik per transaksi — berlaku 24 jam, nominal fixed, single use.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Kode Booking</Label>
                  <Input
                    className="mt-1" value={demoForm.booking_code}
                    onChange={e => setDemoForm(p => ({ ...p, booking_code: e.target.value }))}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label className="text-xs">Nominal (IDR)</Label>
                  <Input
                    className="mt-1" type="number" min="10000"
                    value={demoForm.amount}
                    onChange={e => setDemoForm(p => ({ ...p, amount: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Nama Jamaah</Label>
                  <Input
                    className="mt-1" value={demoForm.customer_name}
                    onChange={e => setDemoForm(p => ({ ...p, customer_name: e.target.value }))}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label className="text-xs">Bank</Label>
                  <Select value={demoForm.bank} onValueChange={v => setDemoForm(p => ({ ...p, bank: v }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {XENDIT_VA_BANKS.map(b => (
                        <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {demoError && (
                <Alert className="border-red-300 bg-red-50">
                  <AlertDescription className="text-red-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {demoError}
                  </AlertDescription>
                </Alert>
              )}

              {demoResult?.account_number && (
                <Alert className="border-green-300 bg-green-50">
                  <AlertDescription className="space-y-1 text-xs font-mono text-green-900">
                    <p className="font-semibold text-sm">Virtual Account berhasil dibuat!</p>
                    <div className="flex items-center gap-2">
                      <span className="text-green-700">No. VA:</span>
                      <span className="font-bold text-base">{demoResult.account_number}</span>
                      <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0"
                        onClick={() => copyToClipboard(demoResult.account_number)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div><span className="text-green-700">Bank:</span> {demoResult.bank_code}</div>
                    <div><span className="text-green-700">Atas Nama:</span> {demoResult.name}</div>
                    <div><span className="text-green-700">Nominal:</span> {formatIDR(demoResult.expected_amount)}</div>
                    <div><span className="text-green-700">Kadaluarsa:</span> {demoResult.expiration_date ? new Date(demoResult.expiration_date).toLocaleString("id-ID") : "-"}</div>
                  </AlertDescription>
                </Alert>
              )}

              <Button onClick={createDemoVA} disabled={demoLoading} className="w-full" variant="outline">
                {demoLoading
                  ? <><RefreshCcw className="h-4 w-4 mr-2 animate-spin" />Membuat VA...</>
                  : <><Building2 className="h-4 w-4 mr-2" />Buat Virtual Account Test</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Webhook ─────────────────────────────────────────────── */}
        <TabsContent value="webhook" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Setup Webhook Notification</CardTitle>
              <CardDescription>
                Xendit mengirim notifikasi otomatis ke URL ini setiap kali ada perubahan status pembayaran.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">

              <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Webhook Endpoint</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono break-all">
                    {API_BASE || "<API_SERVER_URL>"}/api/xendit/notification
                  </code>
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7 shrink-0"
                    onClick={() => copyToClipboard(`${API_BASE}/api/xendit/notification`)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Langkah Setup di Dashboard Xendit:</p>
                <ol className="space-y-2.5 text-sm text-muted-foreground list-decimal list-inside">
                  <li>
                    Login ke{" "}
                    <a href="https://dashboard.xendit.co/settings/developers" target="_blank" rel="noreferrer"
                      className="text-blue-600 underline inline-flex items-center gap-1">
                      Xendit Dashboard → Settings → Developers <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                  <li>Klik <strong>"Webhook"</strong> di sidebar kiri</li>
                  <li>Paste URL webhook di atas ke field <strong>Callback URL</strong></li>
                  <li>Centang event: <strong>Invoice Paid</strong>, <strong>VA Paid</strong>, <strong>QRIS Completed</strong></li>
                  <li>Salin <strong>Webhook Verification Token</strong> yang muncul</li>
                  <li>
                    Set token tersebut sebagai{" "}
                    <code className="bg-muted px-1 rounded">XENDIT_CALLBACK_TOKEN</code>{" "}
                    di Replit Secrets
                  </li>
                </ol>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium">Event webhook yang ditangani:</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { event: "INVOICE PAID", desc: "Invoice lunas" },
                    { event: "VA PAID", desc: "Virtual Account terbayar" },
                    { event: "QRIS COMPLETED", desc: "QRIS sudah discan & lunas" },
                    { event: "INVOICE EXPIRED", desc: "Invoice kedaluwarsa" },
                  ].map(e => (
                    <div key={e.event} className="rounded border p-2.5">
                      <p className="text-xs font-mono font-semibold text-foreground">{e.event}</p>
                      <p className="text-xs text-muted-foreground">{e.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Setiap webhook yang masuk diverifikasi menggunakan <code className="bg-muted px-1 rounded">x-callback-token</code> header.
                  Jika <code className="bg-muted px-1 rounded">XENDIT_CALLBACK_TOKEN</code> belum diset, verifikasi dilewati (tidak aman untuk produksi).
                  Status payment di tabel <code className="bg-muted px-1 rounded">payments</code> diupdate otomatis setelah webhook diterima.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
