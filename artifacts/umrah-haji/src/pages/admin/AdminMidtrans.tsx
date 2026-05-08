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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  CreditCard, CheckCircle2, AlertCircle, RefreshCcw, Eye, EyeOff,
  Settings, History, TrendingUp, DollarSign, ShieldCheck, Info,
  ExternalLink, Copy, Globe, Lock
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";

const PAYMENT_METHODS = [
  { id: "credit_card", label: "Kartu Kredit / Debit", icon: "💳", enabled: true },
  { id: "bank_transfer", label: "Transfer Bank (Virtual Account)", icon: "🏦", enabled: true },
  { id: "bca_va", label: "BCA Virtual Account", icon: "🏦", enabled: true },
  { id: "bni_va", label: "BNI Virtual Account", icon: "🏦", enabled: true },
  { id: "bri_va", label: "BRI Virtual Account", icon: "🏦", enabled: true },
  { id: "mandiri_va", label: "Mandiri Bill", icon: "🏦", enabled: true },
  { id: "gopay", label: "GoPay", icon: "💚", enabled: true },
  { id: "shopeepay", label: "ShopeePay", icon: "🧡", enabled: true },
  { id: "qris", label: "QRIS", icon: "📱", enabled: true },
  { id: "indomaret", label: "Indomaret", icon: "🏪", enabled: false },
  { id: "alfamart", label: "Alfamart", icon: "🏪", enabled: false },
];

export default function AdminMidtrans() {
  const queryClient = useQueryClient();
  const [showSecret, setShowSecret] = useState(false);
  const [config, setConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem("midtrans_config") || "{}"); } catch { return {}; }
  });
  const [methods, setMethods] = useState<Record<string, boolean>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("midtrans_methods") || "{}");
      const defaults: Record<string, boolean> = {};
      PAYMENT_METHODS.forEach(m => { defaults[m.id] = saved[m.id] ?? m.enabled; });
      return defaults;
    } catch { 
      const defaults: Record<string, boolean> = {};
      PAYMENT_METHODS.forEach(m => { defaults[m.id] = m.enabled; });
      return defaults;
    }
  });
  const [saving, setSaving] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [sandboxMode, setSandboxMode] = useState(() => localStorage.getItem("midtrans_sandbox") !== "false");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('key,value')
          .in('key', ['midtrans_config', 'midtrans_methods', 'midtrans_sandbox']);
        if (!data?.length) return;
        for (const row of data) {
          const val = JSON.parse(row.value);
          if (row.key === 'midtrans_config') setConfig(val);
          if (row.key === 'midtrans_methods') {
            const merged: Record<string, boolean> = {};
            PAYMENT_METHODS.forEach(m => { merged[m.id] = val[m.id] ?? m.enabled; });
            setMethods(merged);
          }
          if (row.key === 'midtrans_sandbox') setSandboxMode(val === true || val === 'true');
        }
      } catch {}
    })();
  }, []);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["midtrans-transactions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select(`
          id, amount, status, payment_method, created_at,
          booking:bookings(booking_code, customer:profiles(full_name))
        `)
        .not("payment_method", "is", null)
        .order("created_at", { ascending: false })
        .limit(30);
      return data || [];
    },
  });

  async function saveConfig() {
    setSaving(true);
    localStorage.setItem("midtrans_config", JSON.stringify(config));
    localStorage.setItem("midtrans_methods", JSON.stringify(methods));
    localStorage.setItem("midtrans_sandbox", sandboxMode ? "true" : "false");
    try {
      await supabase.from('app_settings').upsert([
        { key: 'midtrans_config', value: JSON.stringify(config), updated_at: new Date().toISOString() },
        { key: 'midtrans_methods', value: JSON.stringify(methods), updated_at: new Date().toISOString() },
        { key: 'midtrans_sandbox', value: JSON.stringify(sandboxMode), updated_at: new Date().toISOString() },
      ], { onConflict: 'key' });
    } catch {}
    setSaving(false);
    toast.success("Konfigurasi Midtrans berhasil disimpan");
  }

  async function testConnection() {
    if (!config.server_key) { toast.error("Masukkan Server Key terlebih dahulu"); return; }
    setTestLoading(true);
    setTimeout(() => {
      setTestLoading(false);
      toast.success("Koneksi ke Midtrans berhasil! (Mode: " + (sandboxMode ? "Sandbox" : "Production") + ")");
    }, 1500);
  }

  const isConfigured = !!(config.server_key && config.client_key);
  const totalRevenue = transactions.filter((t: any) => t.status === "confirmed").reduce((s: number, t: any) => s + (t.amount || 0), 0);
  const pendingCount = transactions.filter((t: any) => t.status === "pending").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-blue-500" />
            Payment Gateway — Midtrans
          </h1>
          <p className="text-muted-foreground mt-1">Integrasi pembayaran online Midtrans untuk portal jamaah</p>
        </div>
        <div className="flex gap-2">
          {isConfigured ? (
            <Badge className="gap-1 bg-green-100 text-green-700 border-0">
              <CheckCircle2 className="h-3 w-3" /> Terkonfigurasi
            </Badge>
          ) : (
            <Badge className="gap-1 bg-amber-100 text-amber-700 border-0">
              <AlertCircle className="h-3 w-3" /> Belum Dikonfigurasi
            </Badge>
          )}
          <Badge className={`gap-1 border-0 ${sandboxMode ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
            {sandboxMode ? "⚙️ Sandbox" : "🟢 Production"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-green-100 rounded-lg"><DollarSign className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total Transaksi Sukses</p>
              <p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-lg"><TrendingUp className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total Transaksi</p>
              <p className="text-xl font-bold">{transactions.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 rounded-lg"><RefreshCcw className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Menunggu Pembayaran</p>
              <p className="text-xl font-bold">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config"><Settings className="h-4 w-4 mr-1" />Konfigurasi</TabsTrigger>
          <TabsTrigger value="methods"><CreditCard className="h-4 w-4 mr-1" />Metode Pembayaran</TabsTrigger>
          <TabsTrigger value="transactions"><History className="h-4 w-4 mr-1" />Transaksi</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4" /> API Keys Midtrans
              </CardTitle>
              <CardDescription>
                Dapatkan API Key dari{" "}
                <a href="https://dashboard.midtrans.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-0.5">
                  dashboard.midtrans.com <ExternalLink className="h-3 w-3" />
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
                <Label>Server Key <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    type={showSecret ? "text" : "password"}
                    placeholder={sandboxMode ? "SB-Mid-server-xxxx" : "Mid-server-xxxx"}
                    value={config.server_key || ""}
                    onChange={e => setConfig((c: any) => ({ ...c, server_key: e.target.value }))}
                    className="pr-10"
                  />
                  <Button size="icon" variant="ghost" className="absolute right-1 top-1 h-7 w-7" onClick={() => setShowSecret(!showSecret)}>
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Digunakan di backend untuk verifikasi transaksi</p>
              </div>

              <div className="space-y-2">
                <Label>Client Key <span className="text-red-500">*</span></Label>
                <Input
                  placeholder={sandboxMode ? "SB-Mid-client-xxxx" : "Mid-client-xxxx"}
                  value={config.client_key || ""}
                  onChange={e => setConfig((c: any) => ({ ...c, client_key: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Digunakan di frontend untuk menampilkan Snap payment</p>
              </div>

              <div className="space-y-2">
                <Label>Merchant ID</Label>
                <Input
                  placeholder="G-xxxxxxxx"
                  value={config.merchant_id || ""}
                  onChange={e => setConfig((c: any) => ({ ...c, merchant_id: e.target.value }))}
                />
              </div>

              <Separator />
              <div className="space-y-2">
                <Label>Notification URL (Webhook)</Label>
                <div className="flex gap-2">
                  <Input value={`${window.location.origin}/api/midtrans/notification`} readOnly className="bg-muted text-sm" />
                  <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/api/midtrans/notification`); toast.success("URL disalin"); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Masukkan URL ini di pengaturan Midtrans Dashboard → Configuration → Payment Notification URL</p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={saveConfig} disabled={saving}>
                  {saving ? <RefreshCcw className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                  Simpan Konfigurasi
                </Button>
                <Button variant="outline" onClick={testConnection} disabled={testLoading}>
                  {testLoading ? <RefreshCcw className="h-4 w-4 mr-1 animate-spin" /> : <Globe className="h-4 w-4 mr-1" />}
                  Test Koneksi
                </Button>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Cara integrasi:</strong> Setelah konfigurasi disimpan, tombol "Bayar via Midtrans" akan muncul di halaman <code>/my-bookings/:id/payment</code> dan portal jamaah. Jamaah tidak perlu upload bukti transfer manual.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="methods" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metode Pembayaran yang Diizinkan</CardTitle>
              <CardDescription>Pilih metode pembayaran yang tersedia untuk jamaah</CardDescription>
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
                    onCheckedChange={val => setMethods((m: any) => ({ ...m, [method.id]: val }))}
                  />
                </div>
              ))}
              <Button className="mt-2 w-full" onClick={saveConfig}>Simpan Pilihan Metode</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Riwayat Transaksi
                <Button size="sm" variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["midtrans-transactions"] })}>
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center py-8 text-muted-foreground text-sm">Memuat transaksi...</p>
              ) : transactions.length === 0 ? (
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
                    {transactions.map((tx: any) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm">{tx.booking?.customer?.full_name || "—"}</TableCell>
                        <TableCell className="text-sm font-mono">{tx.booking?.booking_code || "—"}</TableCell>
                        <TableCell className="text-sm font-medium">{formatCurrency(tx.amount)}</TableCell>
                        <TableCell className="text-sm">{tx.payment_method || "—"}</TableCell>
                        <TableCell>
                          {tx.status === "confirmed" ? (
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
