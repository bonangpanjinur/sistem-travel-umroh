import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Bell, BellOff, Play, RefreshCw, Settings, MessageCircle, Mail,
  CheckCircle2, XCircle, Clock, AlertCircle, Send, BarChart3,
  GraduationCap, Zap, Calendar,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────
interface NotifSettings {
  id?: string;
  channels: string[];
  notify_on_assignment: boolean;
  reminder_days_before: number[];
  notify_on_overdue: boolean;
  overdue_repeat_days: number;
  is_active: boolean;
}

interface LogEntry {
  id: string;
  employee_name: string;
  employee_code: string;
  module_title: string;
  notification_type: string;
  channel: string;
  status: string;
  recipient_phone?: string;
  recipient_email?: string;
  message_preview?: string;
  error_message?: string;
  sent_at: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const NOTIF_TYPE_CFG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  new_assignment: { label: "Modul Baru",       color: "bg-blue-100 text-blue-700",    icon: <GraduationCap className="h-3 w-3" /> },
  deadline_3d:    { label: "Deadline 3 Hari",  color: "bg-amber-100 text-amber-700",  icon: <Clock className="h-3 w-3" /> },
  deadline_1d:    { label: "Deadline Besok",   color: "bg-orange-100 text-orange-700",icon: <AlertCircle className="h-3 w-3" /> },
  overdue:        { label: "Terlambat",        color: "bg-red-100 text-red-700",      icon: <XCircle className="h-3 w-3" /> },
};

const CHANNEL_CFG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  whatsapp: { label: "WhatsApp", icon: <MessageCircle className="h-3.5 w-3.5" />, color: "text-green-600" },
  email:    { label: "Email",    icon: <Mail className="h-3.5 w-3.5" />,           color: "text-blue-600" },
};

// ─── API helpers ─────────────────────────────────────────────────────────────
async function fetchSettings(): Promise<NotifSettings> {
  const r = await fetch("/api/v1/training/notification-settings");
  const d = await r.json();
  if (!d.ok) throw new Error(d.error ?? "Gagal mengambil pengaturan");
  return d.settings;
}

async function saveSettings(s: NotifSettings): Promise<void> {
  const r = await fetch("/api/v1/training/notification-settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(s),
  });
  const d = await r.json();
  if (!d.ok) throw new Error(d.error ?? "Gagal menyimpan pengaturan");
}

async function fetchLogs(limit = 100): Promise<LogEntry[]> {
  const r = await fetch(`/api/v1/training/notification-logs?limit=${limit}`);
  const d = await r.json();
  if (!d.ok) throw new Error(d.error ?? "Gagal mengambil log");
  return d.logs;
}

async function runNotifications(): Promise<{ sent: number; candidates: number; results: any[] }> {
  const r = await fetch("/api/v1/training/run-notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const d = await r.json();
  if (!d.ok) throw new Error(d.error ?? "Gagal menjalankan notifikasi");
  return d;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminTrainingNotif() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("settings");
  const [reminderInput, setReminderInput] = useState("");
  const [lastRunResult, setLastRunResult] = useState<{ sent: number; candidates: number } | null>(null);

  // ─── Queries ─────────────────────────────────────────────────────────────
  const { data: settings, isLoading: loadingSettings } = useQuery<NotifSettings>({
    queryKey: ["training-notif-settings"],
    queryFn: fetchSettings,
  });

  const [localSettings, setLocalSettings] = useState<NotifSettings | null>(null);
  const effectiveSettings = localSettings ?? settings ?? null;

  const { data: logs = [], isLoading: loadingLogs, refetch: refetchLogs } = useQuery<LogEntry[]>({
    queryKey: ["training-notif-logs"],
    queryFn: () => fetchLogs(200),
    staleTime: 30_000,
  });

  // Sync localSettings when settings loaded
  if (settings && localSettings === null) {
    // Initialize local once
    setTimeout(() => setLocalSettings(settings), 0);
  }

  // ─── Mutations ────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () => saveSettings(effectiveSettings!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training-notif-settings"] });
      toast.success("Pengaturan notifikasi disimpan");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const runMutation = useMutation({
    mutationFn: runNotifications,
    onSuccess: (result) => {
      setLastRunResult({ sent: result.sent, candidates: result.candidates });
      qc.invalidateQueries({ queryKey: ["training-notif-logs"] });
      if (result.sent > 0) {
        toast.success(`${result.sent} notifikasi berhasil dikirim ke ${result.candidates} karyawan`);
      } else {
        toast.info(`Tidak ada notifikasi baru yang perlu dikirim (${result.candidates} kandidat diperiksa)`);
      }
      setTab("logs");
    },
    onError: (e: any) => toast.error("Gagal: " + e.message),
  });

  // ─── Log stats ────────────────────────────────────────────────────────────
  const logStats = useMemo(() => {
    const today = new Date().toDateString();
    const todayLogs = logs.filter(l => new Date(l.sent_at).toDateString() === today);
    return {
      totalToday: todayLogs.length,
      sentToday: todayLogs.filter(l => l.status === "sent").length,
      failedToday: todayLogs.filter(l => l.status === "failed").length,
      waSentToday: todayLogs.filter(l => l.status === "sent" && l.channel === "whatsapp").length,
      emailSentToday: todayLogs.filter(l => l.status === "sent" && l.channel === "email").length,
      lastSent: logs.find(l => l.status === "sent")?.sent_at,
    };
  }, [logs]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function toggleChannel(ch: string) {
    if (!effectiveSettings) return;
    const has = effectiveSettings.channels.includes(ch);
    setLocalSettings({
      ...effectiveSettings,
      channels: has ? effectiveSettings.channels.filter(c => c !== ch) : [...effectiveSettings.channels, ch],
    });
  }

  function addReminderDay() {
    const d = parseInt(reminderInput);
    if (!d || d < 1 || d > 30) { toast.error("Masukkan angka antara 1-30"); return; }
    if (!effectiveSettings) return;
    if (effectiveSettings.reminder_days_before.includes(d)) { toast.error("Hari sudah ada"); return; }
    setLocalSettings({ ...effectiveSettings, reminder_days_before: [...effectiveSettings.reminder_days_before, d].sort((a, b) => b - a) });
    setReminderInput("");
  }

  function removeReminderDay(d: number) {
    if (!effectiveSettings) return;
    setLocalSettings({ ...effectiveSettings, reminder_days_before: effectiveSettings.reminder_days_before.filter(x => x !== d) });
  }

  function typeBadge(type: string) {
    const cfg = NOTIF_TYPE_CFG[type] ?? { label: type, color: "bg-slate-100 text-slate-600", icon: <Bell className="h-3 w-3" /> };
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
        {cfg.icon}{cfg.label}
      </span>
    );
  }

  function statusBadge(status: string) {
    if (status === "sent")   return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs"><CheckCircle2 className="h-3 w-3 mr-0.5" />Terkirim</Badge>;
    if (status === "failed") return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs"><XCircle className="h-3 w-3 mr-0.5" />Gagal</Badge>;
    return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Notifikasi Training Otomatis
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kirim pengingat WhatsApp/email ke karyawan saat modul baru ditugaskan atau deadline mendekat
          </p>
        </div>
        <Button
          onClick={() => runMutation.mutate()}
          disabled={runMutation.isPending}
          className="gap-2"
        >
          {runMutation.isPending
            ? <><RefreshCw className="h-4 w-4 animate-spin" />Mengirim...</>
            : <><Zap className="h-4 w-4" />Kirim Notifikasi Sekarang</>}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100"><Send className="h-5 w-5 text-green-600" /></div>
            <div><p className="text-xs text-muted-foreground">Terkirim Hari Ini</p><p className="text-2xl font-bold">{logStats.sentToday}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-50"><MessageCircle className="h-5 w-5 text-green-600" /></div>
            <div><p className="text-xs text-muted-foreground">WhatsApp</p><p className="text-2xl font-bold">{logStats.waSentToday}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100"><Mail className="h-5 w-5 text-blue-600" /></div>
            <div><p className="text-xs text-muted-foreground">Email</p><p className="text-2xl font-bold">{logStats.emailSentToday}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-100"><XCircle className="h-5 w-5 text-red-500" /></div>
            <div><p className="text-xs text-muted-foreground">Gagal Hari Ini</p><p className="text-2xl font-bold">{logStats.failedToday}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Last run result */}
      {lastRunResult && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            <p className="text-sm text-green-800">
              Notifikasi selesai dijalankan — <strong>{lastRunResult.sent} notifikasi</strong> terkirim dari {lastRunResult.candidates} kandidat yang diperiksa.
            </p>
            <Button size="sm" variant="ghost" className="ml-auto text-xs" onClick={() => setLastRunResult(null)}>Tutup</Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-1" />Pengaturan</TabsTrigger>
          <TabsTrigger value="logs"><BarChart3 className="h-4 w-4 mr-1" />Log Notifikasi</TabsTrigger>
        </TabsList>

        {/* ── Tab: Settings ─────────────────────────────────────────────────── */}
        <TabsContent value="settings" className="space-y-4 mt-4">
          {loadingSettings ? (
            <p className="text-sm text-muted-foreground text-center py-10">Memuat pengaturan...</p>
          ) : effectiveSettings && (
            <>
              {/* Master switch */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {effectiveSettings.is_active
                        ? <Bell className="h-5 w-5 text-green-600" />
                        : <BellOff className="h-5 w-5 text-muted-foreground" />}
                      <div>
                        <p className="font-medium">Status Notifikasi</p>
                        <p className="text-sm text-muted-foreground">
                          Aktifkan atau nonaktifkan semua notifikasi training otomatis
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={effectiveSettings.is_active}
                      onCheckedChange={v => setLocalSettings({ ...effectiveSettings, is_active: v })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Channel settings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />Saluran Notifikasi
                  </CardTitle>
                  <CardDescription>Pilih saluran yang digunakan untuk mengirim pengingat</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { key: "whatsapp", label: "WhatsApp",   icon: <MessageCircle className="h-4 w-4 text-green-600" />, desc: "Kirim via Fonnte/WA provider aktif" },
                    { key: "email",    label: "Email (SMTP)",icon: <Mail className="h-4 w-4 text-blue-600" />,          desc: "Kirim via SMTP yang dikonfigurasi" },
                  ].map(({ key, label, icon, desc }) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        {icon}
                        <div>
                          <p className="font-medium text-sm">{label}</p>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                      </div>
                      <Switch
                        checked={effectiveSettings.channels.includes(key)}
                        onCheckedChange={() => toggleChannel(key)}
                        disabled={!effectiveSettings.is_active}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Notification triggers */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bell className="h-4 w-4" />Kapan Notifikasi Dikirim
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* On assignment */}
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <GraduationCap className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="font-medium text-sm">Modul Baru Ditugaskan</p>
                        <p className="text-xs text-muted-foreground">Kirim saat karyawan mendapat modul training baru</p>
                      </div>
                    </div>
                    <Switch
                      checked={effectiveSettings.notify_on_assignment}
                      onCheckedChange={v => setLocalSettings({ ...effectiveSettings, notify_on_assignment: v })}
                      disabled={!effectiveSettings.is_active}
                    />
                  </div>

                  {/* Deadline reminders */}
                  <div className="p-3 rounded-lg border space-y-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <p className="font-medium text-sm">Pengingat Sebelum Deadline</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Kirim pengingat X hari sebelum tenggat waktu modul</p>
                    <div className="flex flex-wrap gap-2">
                      {effectiveSettings.reminder_days_before.map(d => (
                        <span key={d} className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-1 rounded-full">
                          {d} hari sebelum
                          <button
                            className="ml-1 hover:text-red-600 transition-colors"
                            onClick={() => removeReminderDay(d)}
                            disabled={!effectiveSettings.is_active}
                          >×</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="number" min="1" max="30" placeholder="Tambah hari..."
                        value={reminderInput}
                        onChange={e => setReminderInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addReminderDay()}
                        className="w-36 h-8 text-sm"
                        disabled={!effectiveSettings.is_active}
                      />
                      <Button size="sm" variant="outline" onClick={addReminderDay} disabled={!effectiveSettings.is_active}>
                        Tambah
                      </Button>
                    </div>
                  </div>

                  {/* Overdue */}
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <div>
                        <p className="font-medium text-sm">Notifikasi Terlambat (Overdue)</p>
                        <p className="text-xs text-muted-foreground">Kirim pengingat saat modul melewati deadline</p>
                      </div>
                    </div>
                    <Switch
                      checked={effectiveSettings.notify_on_overdue}
                      onCheckedChange={v => setLocalSettings({ ...effectiveSettings, notify_on_overdue: v })}
                      disabled={!effectiveSettings.is_active}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Jadwal otomatis */}
              <Card className="border-slate-200 bg-slate-50/50">
                <CardContent className="p-4 flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-slate-500 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Jadwal Otomatis</p>
                    <p className="text-xs text-muted-foreground">Notifikasi dikirim otomatis setiap hari pukul 09:00 WIB oleh sistem. Atau klik "Kirim Notifikasi Sekarang" untuk memicu manual.</p>
                  </div>
                </CardContent>
              </Card>

              {/* Save button */}
              <div className="flex justify-end">
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="gap-2"
                >
                  {saveMutation.isPending ? <><RefreshCw className="h-4 w-4 animate-spin" />Menyimpan...</> : "Simpan Pengaturan"}
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Tab: Logs ─────────────────────────────────────────────────────── */}
        <TabsContent value="logs" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {logs.length} entri terakhir
              {logStats.lastSent && (
                <> · Terakhir dikirim: {formatDistanceToNow(new Date(logStats.lastSent), { locale: localeId, addSuffix: true })}</>
              )}
            </p>
            <Button size="sm" variant="outline" onClick={() => refetchLogs()}>
              <RefreshCw className="h-4 w-4 mr-1" />Muat Ulang
            </Button>
          </div>

          {loadingLogs ? (
            <p className="text-sm text-muted-foreground text-center py-10">Memuat log...</p>
          ) : logs.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Belum ada notifikasi terkirim</p>
              <p className="text-sm mt-1">Klik "Kirim Notifikasi Sekarang" untuk mengirim pengingat pertama.</p>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Karyawan</TableHead>
                      <TableHead>Modul</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Saluran</TableHead>
                      <TableHead>Penerima</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Waktu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map(log => (
                      <TableRow key={log.id} className="hover:bg-muted/40">
                        <TableCell>
                          <p className="font-medium text-sm">{log.employee_name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground font-mono">{log.employee_code}</p>
                        </TableCell>
                        <TableCell className="max-w-[180px]">
                          <p className="text-sm truncate" title={log.module_title}>{log.module_title ?? "—"}</p>
                        </TableCell>
                        <TableCell>{typeBadge(log.notification_type)}</TableCell>
                        <TableCell>
                          {log.channel === "whatsapp"
                            ? <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</span>
                            : <span className="inline-flex items-center gap-1 text-xs text-blue-700 font-medium"><Mail className="h-3.5 w-3.5" />Email</span>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {log.recipient_phone || log.recipient_email || "—"}
                        </TableCell>
                        <TableCell>
                          {statusBadge(log.status)}
                          {log.error_message && (
                            <p className="text-xs text-red-500 mt-0.5 max-w-[140px] truncate" title={log.error_message}>{log.error_message}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.sent_at), "dd MMM HH:mm", { locale: localeId })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
