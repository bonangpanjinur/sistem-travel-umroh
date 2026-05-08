import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Webhook, Plus, Trash2, Edit2, Send, CheckCircle,
  XCircle, Clock, AlertCircle, Copy, RefreshCw, Eye, EyeOff,
  Zap, Globe, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  lastTriggered?: string;
  lastStatus?: "success" | "failed" | "pending";
  successCount: number;
  failCount: number;
}

interface WebhookLog {
  id: string;
  webhookId: string;
  event: string;
  status: "success" | "failed";
  statusCode: number;
  timestamp: string;
  duration: number;
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

const DEFAULT_WEBHOOKS: WebhookConfig[] = [
  {
    id: "wh-demo-1",
    name: "ERP Akuntansi",
    url: "https://erp.contoh.com/api/webhooks/vinstour",
    secret: "sk_wh_demo123456",
    events: ["payment.received", "payment.verified", "booking.created"],
    isActive: true,
    createdAt: "2025-01-15",
    lastTriggered: "2025-05-07T14:32:00Z",
    lastStatus: "success",
    successCount: 142,
    failCount: 3,
  },
  {
    id: "wh-demo-2",
    name: "Notifikasi Slack Internal",
    url: "https://hooks.slack.com/services/xxx/yyy/zzz",
    secret: "sk_wh_slack789",
    events: ["sos.alert", "booking.cancelled", "lead.created"],
    isActive: false,
    createdAt: "2025-02-20",
    lastTriggered: "2025-04-12T09:15:00Z",
    lastStatus: "failed",
    successCount: 67,
    failCount: 12,
  },
];

const DEMO_LOGS: WebhookLog[] = [
  { id: "log-1", webhookId: "wh-demo-1", event: "payment.received", status: "success", statusCode: 200, timestamp: "2025-05-07T14:32:00Z", duration: 234 },
  { id: "log-2", webhookId: "wh-demo-1", event: "booking.created", status: "success", statusCode: 200, timestamp: "2025-05-07T13:10:00Z", duration: 189 },
  { id: "log-3", webhookId: "wh-demo-2", event: "lead.created", status: "failed", statusCode: 503, timestamp: "2025-04-12T09:15:00Z", duration: 5000 },
  { id: "log-4", webhookId: "wh-demo-1", event: "payment.verified", status: "success", statusCode: 200, timestamp: "2025-05-06T11:22:00Z", duration: 312 },
];

function StatusBadge({ status }: { status: "success" | "failed" | "pending" | undefined }) {
  if (!status) return <Badge variant="outline" className="text-xs">Belum pernah</Badge>;
  if (status === "success") return <Badge className="gap-1 bg-green-100 text-green-700 border-green-200 text-xs"><CheckCircle className="h-3 w-3" />Berhasil</Badge>;
  if (status === "failed") return <Badge className="gap-1 bg-red-100 text-red-700 border-red-200 text-xs"><XCircle className="h-3 w-3" />Gagal</Badge>;
  return <Badge className="gap-1 bg-yellow-100 text-yellow-700 border-yellow-200 text-xs"><Clock className="h-3 w-3" />Pending</Badge>;
}

export default function AdminWebhooks() {
  const [webhooks, setWebhooks] = useLocalStorage<WebhookConfig[]>("admin-webhooks", DEFAULT_WEBHOOKS);
  const [logs] = useState<WebhookLog[]>(DEMO_LOGS);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<WebhookConfig | null>(null);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", url: "", secret: "", events: [] as string[], isActive: true });

  function openCreate() {
    setEditing(null);
    setForm({ name: "", url: "", secret: generateSecret(), events: [], isActive: true });
    setShowDialog(true);
  }

  function openEdit(wh: WebhookConfig) {
    setEditing(wh);
    setForm({ name: wh.name, url: wh.url, secret: wh.secret, events: [...wh.events], isActive: wh.isActive });
    setShowDialog(true);
  }

  function generateSecret() {
    return "sk_wh_" + Math.random().toString(36).slice(2, 18);
  }

  function toggleEvent(event: string) {
    setForm(f => ({
      ...f,
      events: f.events.includes(event) ? f.events.filter(e => e !== event) : [...f.events, event],
    }));
  }

  function saveWebhook() {
    if (!form.name.trim() || !form.url.trim()) {
      toast.error("Nama dan URL wajib diisi");
      return;
    }
    if (!/^https?:\/\/.+/.test(form.url)) {
      toast.error("URL harus valid (dimulai dengan http:// atau https://)");
      return;
    }
    if (form.events.length === 0) {
      toast.error("Pilih minimal satu event");
      return;
    }

    if (editing) {
      setWebhooks(prev => prev.map(w => w.id === editing.id ? { ...w, ...form } : w));
      toast.success("Webhook diperbarui");
    } else {
      const newWh: WebhookConfig = {
        id: "wh-" + Date.now(),
        ...form,
        createdAt: new Date().toISOString().split("T")[0],
        successCount: 0,
        failCount: 0,
      };
      setWebhooks(prev => [...prev, newWh]);
      toast.success("Webhook ditambahkan");
    }
    setShowDialog(false);
  }

  function deleteWebhook(id: string) {
    setWebhooks(prev => prev.filter(w => w.id !== id));
    toast.success("Webhook dihapus");
  }

  function toggleActive(id: string) {
    setWebhooks(prev => prev.map(w => w.id === id ? { ...w, isActive: !w.isActive } : w));
  }

  async function testWebhook(id: string) {
    setTesting(id);
    await new Promise(r => setTimeout(r, 1500));
    setTesting(null);
    toast.success("Ping terkirim! Periksa server tujuan untuk konfirmasi.");
  }

  function copySecret(secret: string) {
    navigator.clipboard.writeText(secret).then(() => toast.success("Secret disalin"));
  }

  const webhookLogs = (id: string) => logs.filter(l => l.webhookId === id);

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
          { label: "Total Webhook", value: webhooks.length, icon: Webhook, color: "text-primary" },
          { label: "Aktif", value: webhooks.filter(w => w.isActive).length, icon: CheckCircle, color: "text-green-600" },
          { label: "Total Berhasil", value: webhooks.reduce((a, w) => a + w.successCount, 0), icon: Zap, color: "text-blue-600" },
          { label: "Total Gagal", value: webhooks.reduce((a, w) => a + w.failCount, 0), icon: XCircle, color: "text-red-500" },
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
        {webhooks.length === 0 && (
          <Card className="py-12 text-center">
            <Webhook className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Belum ada webhook. Klik "Tambah Webhook" untuk memulai.</p>
          </Card>
        )}
        {webhooks.map(wh => (
          <Card key={wh.id} className={!wh.isActive ? "opacity-60" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base">{wh.name}</CardTitle>
                    <Badge variant={wh.isActive ? "default" : "secondary"} className="text-xs">
                      {wh.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                    <StatusBadge status={wh.lastStatus} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    <span className="truncate">{wh.url}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch checked={wh.isActive} onCheckedChange={() => toggleActive(wh.id)} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Secret */}
              <div>
                <p className="text-xs font-medium mb-1 flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Webhook Secret</p>
                <div className="flex gap-2">
                  <Input
                    value={showSecret[wh.id] ? wh.secret : "•".repeat(wh.secret.length)}
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
                  <p className="text-lg font-bold text-green-600">{wh.successCount}</p>
                  <p className="text-[10px] text-muted-foreground">Berhasil</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-lg font-bold text-red-500">{wh.failCount}</p>
                  <p className="text-[10px] text-muted-foreground">Gagal</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-sm font-bold text-muted-foreground">
                    {wh.lastTriggered ? new Date(wh.lastTriggered).toLocaleDateString("id-ID") : "—"}
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
                        <span className="shrink-0">HTTP {log.statusCode}</span>
                        <span className="shrink-0">{log.duration}ms</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1" onClick={() => testWebhook(wh.id)} disabled={testing === wh.id}>
                  {testing === wh.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Test Ping
                </Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => openEdit(wh)}>
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive" onClick={() => deleteWebhook(wh.id)}>
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
              <p className="text-xs opacity-80">Payload dikirim dalam format JSON. Retry otomatis 3x jika server tujuan tidak merespons (timeout 10 detik).</p>
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
              <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} id="wh-active" />
              <Label htmlFor="wh-active">Webhook Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
            <Button onClick={saveWebhook}>{editing ? "Simpan Perubahan" : "Tambah Webhook"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
