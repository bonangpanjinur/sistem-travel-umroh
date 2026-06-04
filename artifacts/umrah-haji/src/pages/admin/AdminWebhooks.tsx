import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Webhook, Plus, Trash2, Edit2, Send, CheckCircle,
  XCircle, Clock, AlertCircle, Copy, RefreshCw, Eye, EyeOff,
  Zap, Globe, ShieldCheck, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const supabaseAny = supabase as any;

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  success_count: number;
  fail_count: number;
  last_triggered_at: string | null;
  last_status: "success" | "failed" | "pending" | null;
  created_at: string;
}

interface WebhookLog {
  id: string;
  webhook_id: string;
  event: string;
  status: "success" | "failed";
  status_code: number | null;
  duration_ms: number | null;
  error_msg: string | null;
  created_at: string;
}

const AVAILABLE_EVENTS = [
  { value: "booking.created", label: "Booking Dibuat", group: "Booking" },
  { value: "booking.confirmed", label: "Booking Dikonfirmasi", group: "Booking" },
  { value: "booking.cancelled", label: "Booking Dibatalkan", group: "Booking" },
  { value: "payment.received", label: "Pembayaran Diterima", group: "Pembayaran" },
  { value: "payment.verified", label: "Pembayaran Diverifikasi", group: "Pembayaran" },
  { value: "customer.registered", label: "Customer Baru Terdaftar", group: "Customer" },
  { value: "lead.created", label: "Lead Baru Masuk", group: "CRM" },
  { value: "lead.converted", label: "Lead Dikonversi", group: "CRM" },
  { value: "departure.checkin", label: "Check-in Keberangkatan", group: "Operasional" },
  { value: "sos.alert", label: "SOS Alert Jamaah", group: "Operasional" },
];

const EVENT_GROUPS = Array.from(new Set(AVAILABLE_EVENTS.map(e => e.group)));

function StatusBadge({ status }: { status: "success" | "failed" | "pending" | null | undefined }) {
  if (!status) return <Badge variant="outline" className="text-xs">Belum pernah</Badge>;
  if (status === "success") return <Badge className="gap-1 bg-green-100 text-green-700 border-green-200 text-xs"><CheckCircle className="h-3 w-3" />Berhasil</Badge>;
  if (status === "failed") return <Badge className="gap-1 bg-red-100 text-red-700 border-red-200 text-xs"><XCircle className="h-3 w-3" />Gagal</Badge>;
  return <Badge className="gap-1 bg-yellow-100 text-yellow-700 border-yellow-200 text-xs"><Clock className="h-3 w-3" />Pending</Badge>;
}

const EMPTY_FORM = { name: "", url: "", secret: "", events: [] as string[], is_active: true };

export default function AdminWebhooks() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<WebhookConfig | null>(null);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // ── Fetch webhooks ───────────────────────────────────────────────────────
  const { data: webhooks = [], isLoading } = useQuery<WebhookConfig[]>({
    queryKey: ["webhook_configs"],
    queryFn: async () => {
      const { data, error } = await supabaseAny
        .from("webhook_configs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data ?? [];
    },
  });

  // ── Fetch logs ───────────────────────────────────────────────────────────
  const { data: logs = [] } = useQuery<WebhookLog[]>({
    queryKey: ["webhook_logs"],
    queryFn: async () => {
      const { data, error } = await supabaseAny
        .from("webhook_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data ?? [];
    },
  });

  // ── Save (create/update) ─────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabaseAny
          .from("webhook_configs")
          .update({ name: form.name, url: form.url, secret: form.secret, events: form.events, is_active: form.is_active })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabaseAny
          .from("webhook_configs")
          .insert({ name: form.name, url: form.url, secret: form.secret, events: form.events, is_active: form.is_active });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook_configs"] });
      toast.success(editing ? "Webhook diperbarui" : "Webhook ditambahkan");
      setShowDialog(false);
    },
    onError: (e: any) => toast.error("Gagal menyimpan: " + e.message),
  });

  // ── Delete ───────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseAny.from("webhook_configs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook_configs"] });
      queryClient.invalidateQueries({ queryKey: ["webhook_logs"] });
      toast.success("Webhook dihapus");
    },
    onError: (e: any) => toast.error("Gagal menghapus: " + e.message),
  });

  // ── Toggle active ────────────────────────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabaseAny.from("webhook_configs").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhook_configs"] }),
    onError: (e: any) => toast.error("Gagal mengubah status: " + e.message),
  });

  // ── Test webhook (actually send HTTP POST to the URL) ────────────────────
  async function testWebhook(wh: WebhookConfig) {
    setTestingId(wh.id);
    const startMs = Date.now();
    const payload = {
      event: "webhook.test",
      timestamp: new Date().toISOString(),
      webhook_id: wh.id,
      data: { message: "Test ping dari Vinstour" },
    };

    let statusCode = 0;
    let status: "success" | "failed" = "failed";
    let errorMsg: string | null = null;

    try {
      const res = await fetch("/api/v1/webhook-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_url: wh.url, secret: wh.secret, payload }),
      });
      statusCode = res.status;
      status = res.ok ? "success" : "failed";
      if (!res.ok) errorMsg = `HTTP ${res.status}`;
    } catch (e: any) {
      status = "failed";
      errorMsg = e.message;
    }

    const durationMs = Date.now() - startMs;

    // Simpan log ke Supabase
    await supabaseAny.from("webhook_logs").insert({
      webhook_id: wh.id,
      event: "webhook.test",
      status,
      status_code: statusCode || null,
      duration_ms: durationMs,
      error_msg: errorMsg,
      payload,
    });

    // Update stats di webhook config
    await supabaseAny.from("webhook_configs").update({
      last_triggered_at: new Date().toISOString(),
      last_status: status,
      success_count: status === "success" ? (wh.success_count + 1) : wh.success_count,
      fail_count: status === "failed" ? (wh.fail_count + 1) : wh.fail_count,
    }).eq("id", wh.id);

    queryClient.invalidateQueries({ queryKey: ["webhook_configs"] });
    queryClient.invalidateQueries({ queryKey: ["webhook_logs"] });
    setTestingId(null);

    if (status === "success") {
      toast.success(`Test berhasil! Server merespons HTTP ${statusCode} dalam ${durationMs}ms`);
    } else {
      toast.error(`Test gagal: ${errorMsg || "Tidak dapat terhubung ke " + wh.url}`);
    }
  }

  function generateSecret() {
    return "sk_wh_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, secret: generateSecret() });
    setShowDialog(true);
  }

  function openEdit(wh: WebhookConfig) {
    setEditing(wh);
    setForm({ name: wh.name, url: wh.url, secret: wh.secret, events: [...wh.events], is_active: wh.is_active });
    setShowDialog(true);
  }

  function toggleEvent(event: string) {
    setForm(f => ({
      ...f,
      events: f.events.includes(event) ? f.events.filter(e => e !== event) : [...f.events, event],
    }));
  }

  function handleSave() {
    if (!form.name.trim() || !form.url.trim()) { toast.error("Nama dan URL wajib diisi"); return; }
    if (!/^https?:\/\/.+/.test(form.url)) { toast.error("URL harus valid (dimulai dengan http:// atau https://)"); return; }
    if (form.events.length === 0) { toast.error("Pilih minimal satu event"); return; }
    saveMutation.mutate();
  }

  function copySecret(secret: string) {
    navigator.clipboard.writeText(secret).then(() => toast.success("Secret disalin"));
  }

  const webhookLogs = (id: string) => logs.filter(l => l.webhook_id === id);

  const stats = {
    total: webhooks.length,
    active: webhooks.filter(w => w.is_active).length,
    totalSuccess: webhooks.reduce((a, w) => a + w.success_count, 0),
    totalFail: webhooks.reduce((a, w) => a + w.fail_count, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Webhook className="h-6 w-6 text-primary" />
            Webhook Outgoing
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kirim notifikasi otomatis ke sistem eksternal (ERP, CRM, Slack, dll) saat terjadi event di Vinstour.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Tambah Webhook
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Webhook", value: stats.total, icon: Webhook, color: "text-primary" },
          { label: "Aktif", value: stats.active, icon: CheckCircle, color: "text-green-600" },
          { label: "Total Berhasil", value: stats.totalSuccess, icon: Zap, color: "text-blue-600" },
          { label: "Total Gagal", value: stats.totalFail, icon: XCircle, color: "text-red-500" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold">{s.value}</p>
                </div>
                <s.icon className={`h-8 w-8 ${s.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Webhook List */}
      <div className="space-y-4">
        {isLoading && (
          <Card className="py-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto text-muted-foreground animate-spin mb-2" />
            <p className="text-muted-foreground text-sm">Memuat webhook...</p>
          </Card>
        )}
        {!isLoading && webhooks.length === 0 && (
          <Card className="py-12 text-center">
            <Webhook className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Belum ada webhook. Klik "Tambah Webhook" untuk memulai.</p>
          </Card>
        )}
        {webhooks.map(wh => (
          <Card key={wh.id} className={!wh.is_active ? "opacity-60" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base">{wh.name}</CardTitle>
                    <Badge variant={wh.is_active ? "default" : "secondary"} className="text-xs">
                      {wh.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                    <StatusBadge status={wh.last_status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    <span className="truncate">{wh.url}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch
                    checked={wh.is_active}
                    onCheckedChange={(v) => toggleMutation.mutate({ id: wh.id, is_active: v })}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Secret */}
              <div>
                <p className="text-xs font-medium mb-1 flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Webhook Secret</p>
                <div className="flex gap-2">
                  <Input
                    value={showSecret[wh.id] ? wh.secret : "•".repeat(Math.min(wh.secret.length, 32))}
                    readOnly
                    className="font-mono text-xs h-8"
                  />
                  <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => setShowSecret(p => ({ ...p, [wh.id]: !p[wh.id] }))}>
                    {showSecret[wh.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => copySecret(wh.secret)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Events */}
              <div>
                <p className="text-xs font-medium mb-1.5">Events ({wh.events.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {wh.events.map(ev => (
                    <Badge key={ev} variant="outline" className="text-xs">{ev}</Badge>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-lg font-bold text-green-600">{wh.success_count}</p>
                  <p className="text-[10px] text-muted-foreground">Berhasil</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-lg font-bold text-red-500">{wh.fail_count}</p>
                  <p className="text-[10px] text-muted-foreground">Gagal</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-sm font-bold text-muted-foreground">
                    {wh.last_triggered_at
                      ? format(parseISO(wh.last_triggered_at), "dd MMM HH:mm", { locale: idLocale })
                      : "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Terakhir aktif</p>
                </div>
              </div>

              {/* Recent Logs */}
              {webhookLogs(wh.id).length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1.5">Log Terbaru</p>
                  <div className="space-y-1">
                    {webhookLogs(wh.id).slice(0, 3).map(log => (
                      <div key={log.id} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1">
                        {log.status === "success"
                          ? <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                          : <XCircle className="h-3 w-3 text-red-500 shrink-0" />}
                        <span className="flex-1 truncate">{log.event}</span>
                        {log.status_code ? <span className="shrink-0">HTTP {log.status_code}</span> : null}
                        {log.duration_ms ? <span className="shrink-0">{log.duration_ms}ms</span> : null}
                        {log.error_msg ? <span className="shrink-0 text-red-400 truncate max-w-[120px]">{log.error_msg}</span> : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => testWebhook(wh)}
                  disabled={testingId === wh.id}
                >
                  {testingId === wh.id
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Testing...</>
                    : <><Send className="h-3.5 w-3.5" /> Test Ping</>}
                </Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => openEdit(wh)}>
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-destructive hover:text-destructive"
                  onClick={() => deleteMutation.mutate(wh.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Hapus
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <p className="font-semibold">Cara Kerja Webhook</p>
              <p>Setiap kali event terjadi (mis. booking baru), Vinstour akan mengirim HTTP POST ke URL tujuan dengan payload JSON berisi detail event. Gunakan <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded font-mono text-xs">X-Vinstour-Signature</code> header untuk verifikasi keaslian request menggunakan secret Anda.</p>
              <p className="text-xs opacity-80">Data disimpan ke database — webhook dan riwayat log tidak hilang saat refresh. Test Ping benar-benar mengirim HTTP POST ke URL tujuan.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Webhook" : "Tambah Webhook Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nama Webhook *</Label>
              <Input placeholder="mis. ERP Akuntansi" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>URL Endpoint *</Label>
              <Input placeholder="https://erp.perusahaan.com/webhook" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} className="mt-1 font-mono text-sm" />
            </div>
            <div>
              <Label className="flex items-center justify-between">
                Secret Key
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setForm(f => ({ ...f, secret: generateSecret() }))}>
                  <RefreshCw className="h-3 w-3 mr-1" /> Generate baru
                </Button>
              </Label>
              <Input value={form.secret} onChange={e => setForm(f => ({ ...f, secret: e.target.value }))} className="mt-1 font-mono text-sm" />
            </div>
            <div>
              <Label>Events yang Dipantau *</Label>
              <div className="mt-2 space-y-3">
                {EVENT_GROUPS.map(group => (
                  <div key={group}>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">{group}</p>
                    <div className="space-y-1.5">
                      {AVAILABLE_EVENTS.filter(e => e.group === group).map(ev => (
                        <label key={ev.value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.events.includes(ev.value)}
                            onChange={() => toggleEvent(ev.value)}
                            className="rounded"
                          />
                          <span className="text-sm">{ev.label}</span>
                          <code className="text-xs text-muted-foreground font-mono">{ev.value}</code>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} id="wh-active" />
              <Label htmlFor="wh-active">Webhook Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Menyimpan...</> : (editing ? "Simpan Perubahan" : "Tambah Webhook")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
