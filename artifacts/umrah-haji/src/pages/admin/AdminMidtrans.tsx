import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  CreditCard, CheckCircle2, AlertCircle, RefreshCcw, Eye, EyeOff,
  Settings, History, TrendingUp, DollarSign, ShieldCheck, Info,
  ExternalLink, Copy, Globe, Lock, Terminal, Key, Zap, AlertTriangle
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";

const PAYMENT_METHODS = [
  { id: "credit_card",   label: "Kartu Kredit / Debit",              icon: "💳", enabled: true  },
  { id: "bank_transfer", label: "Transfer Bank (Virtual Account)",    icon: "🏦", enabled: true  },
  { id: "bca_va",        label: "BCA Virtual Account",               icon: "🏦", enabled: true  },
  { id: "bni_va",        label: "BNI Virtual Account",               icon: "🏦", enabled: true  },
  { id: "bri_va",        label: "BRI Virtual Account",               icon: "🏦", enabled: true  },
  { id: "mandiri_va",    label: "Mandiri Bill",                      icon: "🏦", enabled: true  },
  { id: "gopay",         label: "GoPay",                             icon: "💚", enabled: true  },
  { id: "shopeepay",     label: "ShopeePay",                         icon: "🧡", enabled: true  },
  { id: "qris",          label: "QRIS",                              icon: "📱", enabled: true  },
  { id: "indomaret",     label: "Indomaret",                         icon: "🏪", enabled: false },
  { id: "alfamart",      label: "Alfamart",                          icon: "🏪", enabled: false },
];

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

type EnvStatus = {
  server_key_configured: boolean;
  client_key_configured: boolean;
  environment: "sandbox" | "production";
  ready: boolean;
  server_key_hint: string | null;
  client_key_hint: string | null;
};

export default function AdminMidtrans() {
  const queryClient = useQueryClient();
  const [showServerKey, setShowServerKey] = useState(false);
  const [showClientKey, setShowClientKey] = useState(false);
  const [testKey, setTestKey] = useState("");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sandboxMode, setSandboxMode] = useState(true);

  // UI-only config (client_key stored in DB for frontend Snap.js loading, server_key NEVER stored)
  const [uiConfig, setUiConfig] = useState<{ client_key: string; merchant_id: string; enabled: boolean }>({
    client_key: "",
    merchant_id: "",
    enabled: false,
  });
  const [methods, setMethods] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    PAYMENT_METHODS.forEach(m => { defaults[m.id] = m.enabled; });
    return defaults;
  });

  // Check env var status from backend
  const { data: envStatus, refetch: refetchEnvStatus } = useQuery<EnvStatus>({
    queryKey: ["midtrans-env-status"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/midtrans/config-status`);
      if (!res.ok) throw new Error("Gagal cek status");
      return res.json();
    },
    retry: false,
    staleTime: 30_000,
  });

  // Load UI config from DB
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("key,value")
          .in("key", ["midtrans_config", "midtrans_methods", "midtrans_sandbox"]);
        for (const row of (data || [])) {
          const val = JSON.parse(row.value);
          if (row.key === "midtrans_config") setUiConfig(v => ({ ...v, ...val }));
          if (row.key === "midtrans_methods") {
            const merged: Record<string, boolean> = {};
            PAYMENT_METHODS.forEach(m => { merged[m.id] = val[m.id] ?? m.enabled; });
            setMethods(merged);
          }
          if (row.key === "midtrans_sandbox") setSandboxMode(val === true || val === "true");
        }
      } catch {}
    })();
  }, []);

  // Transactions
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["midtrans-transactions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select(`id, amount, status, payment_method, created_at, booking:bookings(booking_code, customer:profiles(full_name))`)
        .not("payment_method", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  // Save UI config (client_key + methods) to DB
  async function saveUiConfig() {
    setSaving(true);
    try {
      await supabase.from("app_settings").upsert([
        { key: "midtrans_config",  value: JSON.stringify({ ...uiConfig, is_production: !sandboxMode }), updated_at: new Date().toISOString() },
        { key: "midtrans_methods", value: JSON.stringify(methods), updated_at: new Date().toISOString() },
        { key: "midtrans_sandbox", value: JSON.stringify(sandboxMode), updated_at: new Date().toISOString() },
      ], { onConflict: "key" });
      toast.success("Konfigurasi UI Midtrans berhasil disimpan");
    } catch {
      toast.error("Gagal menyimpan — pastikan tabel app_settings tersedia");
    } finally {
      setSaving(false);
    }
  }

  // Real connection test via backend
  async function testConnection() {
    if (!testKey && !envStatus?.server_key_configured) {
      toast.error("Masukkan Server Key untuk diuji, atau set MIDTRANS_SERVER_KEY di Replit Secrets.");
      return;
    }
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/midtrans/test-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ server_key: testKey || undefined, sandbox: sandboxMode }),
      });
      const data = await res.json();
      setTestResult(data);
      if (data.success) toast.success(data.message);
      else toast.error(data.message);
    } catch {
      const msg = "Gagal menghubungi API server";
      setTestResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setTestLoading(false);
    }
  }

  const notifUrl = `${window.location.protocol}//${window.location.host.replace(/:\d+$/, "")}:3000/api/midtrans/notification`;
  const webhookDisplay = `[API Server]/api/midtrans/notification`;

  const totalRevenue = (transactions as any[]).filter(t => t.status === "verified" || t.status === "confirmed").reduce((s: number, t: any) => s + (t.amount || 0), 0);
  const pendingCount = (transactions as any[]).filter(t => t.status === "pending").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-blue-500" />
            Payment Gateway — Midtrans
          </h1>
          <p className="text-muted-foreground mt-1">Integrasi pembayaran online Midtrans Snap & QRIS untuk portal jamaah</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {envStatus?.ready ? (
            <Badge className="gap-1 bg-green-100 text-green-700 border-0">
              <CheckCircle2 className="h-3 w-3" /> Server Key Aktif
            </Badge>
          ) : (
            <Badge className="gap-1 bg-red-100 text-red-700 border-0">
              <AlertTriangle className="h-3 w-3" /> Server Key Belum Set
            </Badge>
          )}
          <Badge className={`gap-1 border-0 ${sandboxMode ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
            {sandboxMode ? "⚙️ Sandbox" : "🟢 Production"}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 bg-green-100 rounded-lg"><DollarSign className="h-5 w-5 text-green-600" /></div>
          <div><p className="text-sm text-muted-foreground">Total Berhasil</p><p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 rounded-lg"><TrendingUp className="h-5 w-5 text-blue-600" /></div>
          <div><p className="text-sm text-muted-foreground">Total Transaksi</p><p className="text-xl font-bold">{(transactions as any[]).length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 rounded-lg"><RefreshCcw className="h-5 w-5 text-amber-600" /></div>
          <div><p className="text-sm text-muted-foreground">Menunggu</p><p className="text-xl font-bold">{pendingCount}</p></div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="setup">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="setup"><Terminal className="h-4 w-4 mr-1" />Setup Secrets</TabsTrigger>
          <TabsTrigger value="config"><Settings className="h-4 w-4 mr-1" />Konfigurasi UI</TabsTrigger>
          <TabsTrigger value="methods"><CreditCard className="h-4 w-4 mr-1" />Metode</TabsTrigger>
          <TabsTrigger value="transactions"><History className="h-4 w-4 mr-1" />Transaksi</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Setup Secrets ── */}
        <TabsContent value="setup" className="space-y-4 mt-4">

          {/* Env status card */}
          <Card className={`border-2 ${envStatus?.ready ? "border-green-300 bg-green-50 dark:bg-green-950/20" : "border-red-300 bg-red-50 dark:bg-red-950/20"}`}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                {envStatus?.ready
                  ? <CheckCircle2 className="h-8 w-8 text-green-600 flex-shrink-0" />
                  : <AlertTriangle className="h-8 w-8 text-red-500 flex-shrink-0" />
                }
                <div className="flex-1">
                  <p className="font-semibold">
                    {envStatus?.ready
                      ? `✅ MIDTRANS_SERVER_KEY terkonfigurasi (${envStatus.server_key_hint})`
                      : "❌ MIDTRANS_SERVER_KEY belum di-set di Replit Secrets"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {envStatus?.ready
                      ? `Mode: ${envStatus.environment} • Client Key: ${envStatus.client_key_configured ? "✅" : "❌"}`
                      : "Server Key wajib ada di environment agar transaksi bisa dibuat"}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => refetchEnvStatus()}>
                  <RefreshCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Step-by-step guide */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Terminal className="h-4 w-4" /> Cara Setup API Keys di Replit Secrets
              </CardTitle>
              <CardDescription>
                Server Key <strong>tidak boleh</strong> disimpan di database — harus di environment variable yang aman.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="space-y-3">
                {[
                  {
                    step: "1",
                    title: "Login ke Midtrans Dashboard",
                    content: <>Kunjungi <a href="https://dashboard.midtrans.com" target="_blank" rel="noreferrer" className="text-blue-500 underline inline-flex items-center gap-0.5">dashboard.midtrans.com <ExternalLink className="h-3 w-3" /></a> dan login sebagai Merchant.</>
                  },
                  {
                    step: "2",
                    title: "Ambil API Keys",
                    content: <>Masuk ke <strong>Settings → Access Keys</strong>. Salin <strong>Server Key</strong> dan <strong>Client Key</strong>. Untuk sandbox gunakan keys yang diawali dengan <code className="bg-muted px-1 rounded text-xs">SB-Mid-</code>, untuk production gunakan <code className="bg-muted px-1 rounded text-xs">Mid-</code>.</>
                  },
                  {
                    step: "3",
                    title: "Set Replit Secrets",
                    content: <>Di panel Replit kiri, klik <strong>🔒 Secrets</strong> dan tambahkan:<br />
                      <div className="mt-2 space-y-1.5 font-mono text-xs">
                        {[
                          ["MIDTRANS_SERVER_KEY", "SB-Mid-server-xxxx... (atau Mid-server-xxx untuk production)"],
                          ["MIDTRANS_CLIENT_KEY", "SB-Mid-client-xxxx... (atau Mid-client-xxx untuk production)"],
                          ["MIDTRANS_ENV", "sandbox   (atau production)"],
                        ].map(([k, v]) => (
                          <div key={k} className="bg-muted rounded p-2">
                            <span className="text-blue-600">{k}</span>
                            <span className="text-muted-foreground"> = </span>
                            <span className="text-green-600">{v}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  },
                  {
                    step: "4",
                    title: "Restart API Server",
                    content: "Setelah menambah Secrets, restart workflow API Server agar env vars ter-load. Kemudian klik tombol Refresh Status di atas."
                  },
                  {
                    step: "5",
                    title: "Set Notification URL di Midtrans",
                    content: <>Masuk ke <strong>Settings → Configuration</strong> dan set:<br />
                      <div className="mt-1.5 bg-muted rounded p-2 font-mono text-xs flex items-center justify-between gap-2">
                        <span>{webhookDisplay}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6 flex-shrink-0"
                          onClick={() => { navigator.clipboard.writeText(`${API_BASE}/api/midtrans/notification`); toast.success("URL disalin"); }}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  },
                ].map(({ step, title, content }) => (
                  <div key={step} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{step}</div>
                    <div>
                      <p className="font-semibold text-sm">{title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Real connection test */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4" /> Test Koneksi Real
              </CardTitle>
              <CardDescription>Uji koneksi nyata ke Midtrans API dari backend server</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Server Key untuk diuji (opsional — gunakan jika belum set di Secrets)</Label>
                <div className="relative mt-1">
                  <Input
                    type={showServerKey ? "text" : "password"}
                    placeholder="SB-Mid-server-xxxx (hanya untuk test, tidak disimpan)"
                    value={testKey}
                    onChange={e => setTestKey(e.target.value)}
                    className="pr-10"
                  />
                  <Button size="icon" variant="ghost" className="absolute right-1 top-1 h-7 w-7" onClick={() => setShowServerKey(!showServerKey)}>
                    {showServerKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Key ini hanya digunakan untuk test — tidak disimpan ke database manapun</p>
              </div>

              {testResult && (
                <Alert className={testResult.success ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}>
                  <AlertDescription className={`flex items-center gap-2 ${testResult.success ? "text-green-800" : "text-red-800"}`}>
                    {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {testResult.message}
                  </AlertDescription>
                </Alert>
              )}

              <Button onClick={testConnection} disabled={testLoading} className="w-full">
                {testLoading
                  ? <><RefreshCcw className="h-4 w-4 mr-2 animate-spin" /> Testing...</>
                  : <><Globe className="h-4 w-4 mr-2" /> Test Koneksi ke Midtrans</>
                }
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: UI Config ── */}
        <TabsContent value="config" className="space-y-4 mt-4">
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription>
              <strong>Client Key aman disimpan di database</strong> — digunakan frontend untuk memuat Snap.js. Server Key harus selalu di Replit Secrets (tab Setup di atas).
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" />Konfigurasi Frontend</CardTitle>
              <CardDescription>
                Dapatkan Client Key dari{" "}
                <a href="https://dashboard.midtrans.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-0.5">
                  dashboard.midtrans.com → Settings → Access Keys <ExternalLink className="h-3 w-3" />
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div>
                  <p className="text-sm font-medium">Mode Sandbox</p>
                  <p className="text-xs text-muted-foreground">Aktifkan untuk testing tanpa transaksi nyata</p>
                </div>
                <Switch checked={sandboxMode} onCheckedChange={setSandboxMode} />
              </div>

              <div className="space-y-2">
                <Label>Client Key <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    type={showClientKey ? "text" : "password"}
                    placeholder={sandboxMode ? "SB-Mid-client-xxxx" : "Mid-client-xxxx"}
                    value={uiConfig.client_key}
                    onChange={e => setUiConfig(c => ({ ...c, client_key: e.target.value }))}
                    className="pr-10"
                  />
                  <Button size="icon" variant="ghost" className="absolute right-1 top-1 h-7 w-7" onClick={() => setShowClientKey(!showClientKey)}>
                    {showClientKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Digunakan di frontend untuk menampilkan Snap payment popup</p>
              </div>

              <div className="space-y-2">
                <Label>Merchant ID</Label>
                <Input
                  placeholder="G-xxxxxxxx"
                  value={uiConfig.merchant_id}
                  onChange={e => setUiConfig(c => ({ ...c, merchant_id: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">Aktifkan Midtrans di Portal Jamaah</p>
                  <p className="text-xs text-muted-foreground">Tombol "Bayar via Midtrans" akan muncul di halaman pembayaran</p>
                </div>
                <Switch checked={uiConfig.enabled} onCheckedChange={v => setUiConfig(c => ({ ...c, enabled: v }))} />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Notification URL (Webhook)</Label>
                <div className="flex gap-2">
                  <Input value={`${API_BASE}/api/midtrans/notification`} readOnly className="bg-muted text-sm font-mono" />
                  <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(`${API_BASE}/api/midtrans/notification`); toast.success("URL disalin"); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Masukkan URL ini di Midtrans Dashboard → Settings → Configuration → Payment Notification URL</p>
              </div>

              <Button onClick={saveUiConfig} disabled={saving} className="w-full">
                {saving ? <><RefreshCcw className="h-4 w-4 mr-1 animate-spin" /> Menyimpan...</> : <><CheckCircle2 className="h-4 w-4 mr-1" /> Simpan Konfigurasi</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Payment Methods ── */}
        <TabsContent value="methods" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metode Pembayaran yang Diizinkan</CardTitle>
              <CardDescription>Pilih metode pembayaran yang tersedia untuk jamaah saat checkout Snap</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {PAYMENT_METHODS.map(method => (
                <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{method.icon}</span>
                    <span className="text-sm font-medium">{method.label}</span>
                  </div>
                  <Switch
                    checked={methods[method.id] ?? method.enabled}
                    onCheckedChange={val => setMethods(m => ({ ...m, [method.id]: val }))}
                  />
                </div>
              ))}
              <Button className="mt-2 w-full" onClick={saveUiConfig}>Simpan Pilihan Metode</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 4: Transactions ── */}
        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Riwayat Pembayaran Online
                <Button size="sm" variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["midtrans-transactions"] })}>
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center py-8 text-muted-foreground text-sm">Memuat transaksi...</p>
              ) : (transactions as any[]).length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>Belum ada transaksi payment gateway</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jamaah</TableHead>
                      <TableHead>Booking</TableHead>
                      <TableHead>Jumlah</TableHead>
                      <TableHead>Metode</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tanggal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(transactions as any[]).map(tx => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm">{tx.booking?.customer?.full_name || "—"}</TableCell>
                        <TableCell className="text-sm font-mono">{tx.booking?.booking_code || "—"}</TableCell>
                        <TableCell className="text-sm font-medium">{formatCurrency(tx.amount)}</TableCell>
                        <TableCell className="text-sm capitalize">{tx.payment_method || "—"}</TableCell>
                        <TableCell>
                          {tx.status === "verified" || tx.status === "confirmed" ? (
                            <Badge className="bg-green-100 text-green-700 border-0 text-[10px]">Sukses</Badge>
                          ) : tx.status === "pending" ? (
                            <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">Pending</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 border-0 text-[10px]">{tx.status}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {tx.created_at ? format(parseISO(tx.created_at), "dd MMM yyyy", { locale: idLocale }) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
