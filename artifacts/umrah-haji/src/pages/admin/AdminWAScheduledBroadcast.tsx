import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format, parseISO, addDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  CalendarClock, Plus, RefreshCw, Play, Trash2, Users,
  Send, Clock, CheckCircle2, XCircle, Loader2, ChevronRight,
  ChevronLeft, FileText, Tag, Plane, MessageSquare, BarChart3,
  Eye, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = "/api/v1/whatsapp";

interface ScheduledBroadcast {
  id: string;
  name: string;
  message: string | null;
  template_id: string | null;
  template_name: string | null;
  target_type: "all" | "tags" | "departure";
  target_tags: string[];
  departure_id: string | null;
  departure_name: string | null;
  departure_date: string | null;
  offset_days: number;
  scheduled_at: string;
  status: "pending" | "running" | "done" | "cancelled" | "failed";
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  log_count: number;
  created_at: string;
  executed_at: string | null;
  error_msg: string | null;
}

interface Departure { id: string; name: string; departure_date: string }
interface WATemplate { id: string; name: string; content: string }

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  pending:   { label: "Menunggu",    className: "bg-amber-100 text-amber-700 border-amber-200",  icon: <Clock    className="h-3 w-3" /> },
  running:   { label: "Berjalan",   className: "bg-blue-100  text-blue-700  border-blue-200",   icon: <Loader2  className="h-3 w-3 animate-spin" /> },
  done:      { label: "Selesai",    className: "bg-green-100 text-green-700 border-green-200",  icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { label: "Dibatalkan", className: "bg-gray-100  text-gray-500  border-gray-200",   icon: <XCircle  className="h-3 w-3" /> },
  failed:    { label: "Gagal",      className: "bg-red-100   text-red-700   border-red-200",    icon: <AlertCircle className="h-3 w-3" /> },
};

const TARGET_LABELS: Record<string, string> = {
  all:       "Semua kontak aktif",
  tags:      "Filter tag",
  departure: "Per keberangkatan",
};

// ─── Wizard step type ─────────────────────────────────────────────────────────
type Step = 1 | 2 | 3;
interface WizardForm {
  name: string;
  target_type: "all" | "tags" | "departure";
  target_tags: string;
  departure_id: string;
  offset_days: number | null;       // null = gunakan scheduled_at manual
  message: string;
  template_id: string;
  use_template: boolean;
  scheduled_at_date: string;
  scheduled_at_time: string;
}

const DEFAULT_FORM: WizardForm = {
  name: "",
  target_type: "all",
  target_tags: "",
  departure_id: "",
  offset_days: null,
  message: "",
  template_id: "",
  use_template: false,
  scheduled_at_date: format(new Date(), "yyyy-MM-dd"),
  scheduled_at_time: "08:00",
};

// ─── Broadcast send logs dialog ───────────────────────────────────────────────
function BroadcastLogsDialog({
  broadcast, open, onClose,
}: { broadcast: ScheduledBroadcast | null; open: boolean; onClose: () => void }) {
  const { data, isLoading } = useQuery<{ logs: any[] }>({
    queryKey: ["wa-sched-logs", broadcast?.id],
    queryFn: () => fetch(`${API}/scheduled-broadcasts/${broadcast!.id}/logs`).then(r => r.json()),
    enabled: !!broadcast && open,
  });
  const logs = data?.logs ?? [];

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-teal-600" />
            Log Pengiriman — {broadcast?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="flex gap-6 text-sm mb-3">
          <span className="text-green-600 font-semibold">✓ Terkirim: {broadcast?.sent_count}</span>
          <span className="text-red-600  font-semibold">✗ Gagal: {broadcast?.failed_count}</span>
          <span className="text-gray-500">Total: {broadcast?.recipient_count}</span>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /></div>
        ) : logs.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">Belum ada log</p>
        ) : (
          <ScrollArea className="h-72">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor WA</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-xs">+{l.phone}</TableCell>
                    <TableCell className="text-sm">{l.name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs", l.status === "sent" ? "text-green-700 border-green-200" : l.status === "failed" ? "text-red-700 border-red-200" : "text-gray-500")}>
                        {l.status === "sent" ? "Terkirim" : l.status === "failed" ? "Gagal" : "Menunggu"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {l.sent_at ? format(parseISO(l.sent_at), "dd MMM HH:mm", { locale: idLocale }) : "-"}
                    </TableCell>
                    <TableCell className="text-xs text-red-600">{l.error_msg || ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function AdminWAScheduledBroadcast() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [step, setStep]             = useState<Step>(1);
  const [form, setForm]             = useState<WizardForm>(DEFAULT_FORM);
  const [logsTarget, setLogsTarget] = useState<ScheduledBroadcast | null>(null);
  const [showLogs, setShowLogs]     = useState(false);

  const { data, isLoading, refetch } = useQuery<{ total: number; broadcasts: ScheduledBroadcast[] }>({
    queryKey: ["wa-scheduled-broadcasts"],
    queryFn: () => fetch(`${API}/scheduled-broadcasts?pageSize=50`).then(r => r.json()),
    refetchInterval: 15000,
  });

  const { data: depData } = useQuery<{ departures: Departure[] }>({
    queryKey: ["wa-sched-departures"],
    queryFn: () => fetch(`${API}/scheduled-broadcasts/departures`).then(r => r.json()),
    enabled: showCreate,
  });

  const { data: tmplData } = useQuery<{ templates: WATemplate[] }>({
    queryKey: ["wa-sched-templates"],
    queryFn: () => fetch(`${API}/scheduled-broadcasts/templates`).then(r => r.json()),
    enabled: showCreate,
  });

  const broadcasts = data?.broadcasts ?? [];
  const departures = depData?.departures ?? [];
  const templates  = tmplData?.templates ?? [];

  // Summary counts
  const pending  = broadcasts.filter(b => b.status === "pending").length;
  const running  = broadcasts.filter(b => b.status === "running").length;
  const done     = broadcasts.filter(b => b.status === "done").length;
  const failed   = broadcasts.filter(b => b.status === "failed").length;

  // Resolve scheduled_at from form state
  function computeScheduledAt(): string | null {
    if (form.target_type === "departure" && form.departure_id && form.offset_days !== null) {
      const dep = departures.find(d => d.id === form.departure_id);
      if (!dep) return null;
      const depDate = parseISO(dep.departure_date);
      const sendDate = addDays(depDate, form.offset_days);
      return `${format(sendDate, "yyyy-MM-dd")}T${form.scheduled_at_time}:00`;
    }
    if (!form.scheduled_at_date || !form.scheduled_at_time) return null;
    return `${form.scheduled_at_date}T${form.scheduled_at_time}:00`;
  }

  const createMut = useMutation({
    mutationFn: async () => {
      const scheduled_at = computeScheduledAt();
      if (!scheduled_at) throw new Error("Waktu pengiriman tidak valid");
      const payload: any = {
        name:        form.name.trim(),
        target_type: form.target_type,
        target_tags: form.target_type === "tags"
          ? form.target_tags.split(",").map(t => t.trim()).filter(Boolean)
          : [],
        departure_id: form.target_type === "departure" ? form.departure_id || null : null,
        offset_days:  form.offset_days ?? 0,
        scheduled_at,
      };
      if (form.use_template && form.template_id) {
        payload.template_id = form.template_id;
      } else {
        payload.message = form.message.trim();
      }
      const resp = await fetch(`${API}/scheduled-broadcasts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await resp.json();
      if (!resp.ok) throw new Error(d.error || "Gagal membuat jadwal");
      return d;
    },
    onSuccess: () => {
      toast.success("Jadwal broadcast berhasil dibuat");
      setShowCreate(false);
      setStep(1);
      setForm(DEFAULT_FORM);
      qc.invalidateQueries({ queryKey: ["wa-scheduled-broadcasts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const executeMut = useMutation({
    mutationFn: (id: string) =>
      fetch(`${API}/scheduled-broadcasts/${id}/execute`, { method: "POST" }).then(r => r.json()),
    onSuccess: (d) => {
      toast.success(`Terkirim: ${d.sent}, Gagal: ${d.failed}`);
      qc.invalidateQueries({ queryKey: ["wa-scheduled-broadcasts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) =>
      fetch(`${API}/scheduled-broadcasts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      }).then(r => r.json()),
    onSuccess: () => {
      toast.success("Broadcast dibatalkan");
      qc.invalidateQueries({ queryKey: ["wa-scheduled-broadcasts"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      fetch(`${API}/scheduled-broadcasts/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => {
      toast.success("Broadcast dihapus");
      qc.invalidateQueries({ queryKey: ["wa-scheduled-broadcasts"] });
    },
  });

  function setF(patch: Partial<WizardForm>) { setForm(p => ({ ...p, ...patch })); }

  // Validate per step
  function canNext(): boolean {
    if (step === 1) return form.name.trim().length > 0
      && (form.target_type !== "tags" || form.target_tags.trim().length > 0)
      && (form.target_type !== "departure" || !!form.departure_id);
    if (step === 2) return form.use_template ? !!form.template_id : form.message.trim().length > 0;
    return true;
  }

  const scheduledPreview = computeScheduledAt();
  const selectedDep = departures.find(d => d.id === form.departure_id);

  // ── Preset H-N options for departure-linked broadcasts ──────────────────
  const offsetOptions = [
    { label: "H-7 (seminggu sebelum)", value: -7 },
    { label: "H-3 (3 hari sebelum)",   value: -3 },
    { label: "H-1 (sehari sebelum)",   value: -1 },
    { label: "H-0 (hari keberangkatan)", value: 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-teal-600" />
            Broadcast Terjadwal WA
          </h1>
          <p className="text-muted-foreground mt-1">
            Jadwalkan pengiriman WA otomatis — pilih penerima, pesan, dan waktu kirim
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => { setShowCreate(true); setStep(1); setForm(DEFAULT_FORM); }}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Plus className="h-4 w-4 mr-1" /> Buat Jadwal Baru
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Menunggu",    count: pending,  color: "text-amber-600"  },
          { label: "Berjalan",   count: running,  color: "text-blue-600"   },
          { label: "Selesai",    count: done,     color: "text-green-600"  },
          { label: "Gagal",      count: failed,   color: "text-red-500"    },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4">
              <div className={cn("text-2xl font-bold", s.color)}>{s.count}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Broadcast table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Jadwal Broadcast</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /></div>
          ) : broadcasts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarClock className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Belum ada broadcast terjadwal</p>
              <p className="text-xs mt-1">Klik "Buat Jadwal Baru" untuk mulai</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Broadcast</TableHead>
                    <TableHead>Penerima</TableHead>
                    <TableHead>Pesan</TableHead>
                    <TableHead>Waktu Kirim</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Hasil</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {broadcasts.map(b => {
                    const cfg = STATUS_CONFIG[b.status];
                    return (
                      <TableRow key={b.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{b.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Dibuat {format(parseISO(b.created_at), "dd MMM yyyy", { locale: idLocale })}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1">
                            {b.target_type === "all"       && <><Users className="h-3.5 w-3.5 text-blue-500" /> Semua aktif</>}
                            {b.target_type === "tags"      && <><Tag   className="h-3.5 w-3.5 text-purple-500" /> Tag: {(b.target_tags || []).join(", ")}</>}
                            {b.target_type === "departure" && (
                              <span className="flex items-center gap-1">
                                <Plane className="h-3.5 w-3.5 text-teal-500" />
                                <span>{b.departure_name}</span>
                                {b.offset_days !== 0 && (
                                  <Badge variant="outline" className="text-xs ml-1">
                                    H{b.offset_days < 0 ? b.offset_days : `+${b.offset_days}`}
                                  </Badge>
                                )}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[180px]">
                          {b.template_name ? (
                            <Badge variant="outline" className="text-xs">
                              <FileText className="h-3 w-3 mr-1" />{b.template_name}
                            </Badge>
                          ) : (
                            <p className="text-xs text-muted-foreground truncate">{b.message}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {format(parseISO(b.scheduled_at), "dd MMM yyyy HH:mm", { locale: idLocale })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-xs flex items-center gap-1 w-fit", cfg.className)}>
                            {cfg.icon}{cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {b.log_count > 0 ? (
                            <span className="text-xs">
                              <span className="text-green-600 font-medium">{b.sent_count}✓</span>
                              {" / "}
                              <span className="text-red-500">{b.failed_count}✗</span>
                              {" / "}
                              <span className="text-gray-500">{b.recipient_count}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {b.log_count > 0 && (
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7"
                                title="Lihat log"
                                onClick={() => { setLogsTarget(b); setShowLogs(true); }}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {b.status === "pending" && (
                              <>
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7 text-teal-600 hover:text-teal-700"
                                  title="Kirim sekarang"
                                  onClick={() => executeMut.mutate(b.id)}
                                  disabled={executeMut.isPending}
                                >
                                  <Play className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7 text-amber-600"
                                  title="Batalkan"
                                  onClick={() => cancelMut.mutate(b.id)}
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                            {(b.status === "cancelled" || b.status === "failed") && (
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                                title="Hapus"
                                onClick={() => deleteMut.mutate(b.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Log dialog ──────────────────────────────────────────────────────── */}
      <BroadcastLogsDialog
        broadcast={logsTarget}
        open={showLogs}
        onClose={() => setShowLogs(false)}
      />

      {/* ── Create wizard dialog ─────────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={v => { if (!v) { setShowCreate(false); setStep(1); setForm(DEFAULT_FORM); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-teal-600" />
              Buat Jadwal Broadcast Baru
            </DialogTitle>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-2 py-1">
            {([1, 2, 3] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 flex-shrink-0",
                  step === s ? "bg-teal-600 border-teal-600 text-white"
                    : step > s ? "bg-teal-100 border-teal-400 text-teal-700"
                    : "bg-muted border-border text-muted-foreground",
                )}>
                  {s}
                </div>
                <span className={cn("text-xs hidden sm:block", step === s ? "font-medium" : "text-muted-foreground")}>
                  {["Penerima", "Pesan", "Jadwal"][i]}
                </span>
                {s < 3 && <div className={cn("flex-1 h-px", step > s ? "bg-teal-400" : "bg-border")} />}
              </div>
            ))}
          </div>

          <Separator />

          <ScrollArea className="max-h-[55vh]">
            <div className="space-y-4 px-1 py-2">

              {/* ── STEP 1: Penerima ─────────────────────────────────────── */}
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <Label className="font-semibold">Nama Broadcast *</Label>
                    <Input
                      placeholder="cth: Reminder H-3 Umroh Jan 2025"
                      value={form.name}
                      onChange={e => setF({ name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-semibold">Pilih Penerima *</Label>
                    <RadioGroup
                      value={form.target_type}
                      onValueChange={v => setF({ target_type: v as WizardForm["target_type"], target_tags: "", departure_id: "", offset_days: null })}
                      className="space-y-2"
                    >
                      {[
                        { value: "all",       icon: <Users className="h-4 w-4 text-blue-500" />,   label: "Semua kontak aktif (opt-in)", desc: "Kirim ke semua kontak yang tidak opt-out" },
                        { value: "tags",      icon: <Tag   className="h-4 w-4 text-purple-500" />, label: "Filter berdasarkan tag",       desc: "Hanya kontak dengan tag tertentu" },
                        { value: "departure", icon: <Plane className="h-4 w-4 text-teal-500" />,   label: "Per keberangkatan",           desc: "Jamaah yang booking confirmed untuk keberangkatan tertentu" },
                      ].map(opt => (
                        <label key={opt.value} className={cn(
                          "flex items-start gap-3 border rounded-lg p-3 cursor-pointer hover:bg-muted/40 transition-colors",
                          form.target_type === opt.value && "border-teal-500 bg-teal-50/50",
                        )}>
                          <RadioGroupItem value={opt.value} className="mt-0.5" />
                          <div className="flex items-start gap-2">
                            {opt.icon}
                            <div>
                              <p className="font-medium text-sm">{opt.label}</p>
                              <p className="text-xs text-muted-foreground">{opt.desc}</p>
                            </div>
                          </div>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  {form.target_type === "tags" && (
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Tags (pisah koma) *</Label>
                      <Input
                        placeholder="cth: VIP, umroh-2025, cianjur"
                        value={form.target_tags}
                        onChange={e => setF({ target_tags: e.target.value })}
                      />
                    </div>
                  )}

                  {form.target_type === "departure" && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Pilih Keberangkatan *</Label>
                        <Select value={form.departure_id} onValueChange={v => setF({ departure_id: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="— Pilih keberangkatan —" />
                          </SelectTrigger>
                          <SelectContent>
                            {departures.map(d => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.name} — {format(parseISO(d.departure_date), "dd MMM yyyy", { locale: idLocale })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Preset Waktu Pengiriman</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {offsetOptions.map(o => (
                            <button
                              key={o.value}
                              type="button"
                              onClick={() => setF({ offset_days: o.value })}
                              className={cn(
                                "text-left border rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/50",
                                form.offset_days === o.value && "border-teal-500 bg-teal-50 font-medium text-teal-700",
                              )}
                            >
                              {o.label}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => setF({ offset_days: null })}
                          className={cn(
                            "w-full text-left border rounded-lg px-3 py-2 text-sm mt-1 transition-colors hover:bg-muted/50",
                            form.offset_days === null && "border-teal-500 bg-teal-50 font-medium text-teal-700",
                          )}
                        >
                          Tentukan tanggal manual
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── STEP 2: Pesan ────────────────────────────────────────── */}
              {step === 2 && (
                <>
                  <div className="space-y-2">
                    <Label className="font-semibold">Sumber Pesan</Label>
                    <RadioGroup
                      value={form.use_template ? "template" : "text"}
                      onValueChange={v => setF({ use_template: v === "template", message: "", template_id: "" })}
                      className="flex gap-4"
                    >
                      <label className={cn(
                        "flex items-center gap-2 border rounded-lg px-4 py-2 cursor-pointer flex-1",
                        !form.use_template && "border-teal-500 bg-teal-50",
                      )}>
                        <RadioGroupItem value="text" />
                        <div className="flex items-center gap-1.5 text-sm">
                          <MessageSquare className="h-4 w-4 text-teal-600" />
                          <span className="font-medium">Tulis Pesan</span>
                        </div>
                      </label>
                      <label className={cn(
                        "flex items-center gap-2 border rounded-lg px-4 py-2 cursor-pointer flex-1",
                        form.use_template && "border-teal-500 bg-teal-50",
                      )}>
                        <RadioGroupItem value="template" />
                        <div className="flex items-center gap-1.5 text-sm">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">Pilih Template</span>
                        </div>
                      </label>
                    </RadioGroup>
                  </div>

                  {!form.use_template ? (
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Pesan *</Label>
                      <Textarea
                        className="min-h-[140px] text-sm"
                        placeholder={"Halo {nama}, ini adalah pengingat keberangkatan Anda...\n\nGunakan {nama} untuk nama kontak, {phone} untuk nomor."}
                        value={form.message}
                        onChange={e => setF({ message: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Variabel: <code className="bg-muted px-1 rounded">{"{nama}"}</code> → nama kontak,{" "}
                        <code className="bg-muted px-1 rounded">{"{phone}"}</code> → nomor WA
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Pilih Template *</Label>
                      {templates.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Belum ada template aktif</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {templates.map(t => (
                            <label key={t.id} className={cn(
                              "flex items-start gap-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/40",
                              form.template_id === t.id && "border-teal-500 bg-teal-50",
                            )}>
                              <input
                                type="radio"
                                name="template"
                                checked={form.template_id === t.id}
                                onChange={() => setF({ template_id: t.id })}
                                className="mt-0.5"
                              />
                              <div>
                                <p className="font-medium text-sm">{t.name}</p>
                                <p className="text-xs text-muted-foreground line-clamp-2">{t.content}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* ── STEP 3: Jadwal ────────────────────────────────────────── */}
              {step === 3 && (
                <>
                  {/* If departure + preset offset, show computed date */}
                  {form.target_type === "departure" && form.departure_id && form.offset_days !== null && selectedDep ? (
                    <div className="rounded-lg bg-teal-50 border border-teal-200 p-4 space-y-2">
                      <p className="text-sm font-semibold text-teal-800 flex items-center gap-2">
                        <Plane className="h-4 w-4" /> Jadwal otomatis dari keberangkatan
                      </p>
                      <p className="text-sm text-teal-700">
                        Keberangkatan: <strong>{selectedDep.name}</strong> —{" "}
                        {format(parseISO(selectedDep.departure_date), "dd MMMM yyyy", { locale: idLocale })}
                      </p>
                      <p className="text-sm text-teal-700">
                        Offset: <strong>H{form.offset_days <= 0 ? form.offset_days : `+${form.offset_days}`}</strong>
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <Label className="text-sm w-16 shrink-0">Jam kirim</Label>
                        <Input
                          type="time"
                          value={form.scheduled_at_time}
                          onChange={e => setF({ scheduled_at_time: e.target.value })}
                          className="w-36"
                        />
                      </div>
                      {scheduledPreview && (
                        <p className="text-xs text-teal-600 font-medium">
                          → Akan dikirim:{" "}
                          {format(new Date(scheduledPreview), "EEEE, dd MMMM yyyy 'pukul' HH:mm", { locale: idLocale })} WIB
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Label className="font-semibold">Tanggal & Waktu Pengiriman *</Label>
                      <div className="flex gap-3">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs text-muted-foreground">Tanggal</Label>
                          <Input
                            type="date"
                            value={form.scheduled_at_date}
                            min={format(new Date(), "yyyy-MM-dd")}
                            onChange={e => setF({ scheduled_at_date: e.target.value })}
                          />
                        </div>
                        <div className="w-32 space-y-1">
                          <Label className="text-xs text-muted-foreground">Jam (WIB)</Label>
                          <Input
                            type="time"
                            value={form.scheduled_at_time}
                            onChange={e => setF({ scheduled_at_time: e.target.value })}
                          />
                        </div>
                      </div>
                      {scheduledPreview && (
                        <p className="text-sm text-teal-700 font-medium">
                          → Akan dikirim:{" "}
                          {format(new Date(scheduledPreview), "EEEE, dd MMMM yyyy 'pukul' HH:mm", { locale: idLocale })} WIB
                        </p>
                      )}
                    </div>
                  )}

                  {/* Review summary */}
                  <div className="rounded-lg bg-muted/50 border p-4 space-y-2 text-sm">
                    <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">Ringkasan</p>
                    <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-xs">
                      <span className="text-muted-foreground">Nama:</span>
                      <span className="col-span-2 font-medium">{form.name}</span>

                      <span className="text-muted-foreground">Penerima:</span>
                      <span className="col-span-2">
                        {TARGET_LABELS[form.target_type]}
                        {form.target_type === "tags" && ` — ${form.target_tags}`}
                        {form.target_type === "departure" && selectedDep && ` — ${selectedDep.name}`}
                      </span>

                      <span className="text-muted-foreground">Pesan:</span>
                      <span className="col-span-2">
                        {form.use_template
                          ? `Template: ${templates.find(t => t.id === form.template_id)?.name}`
                          : form.message.slice(0, 60) + (form.message.length > 60 ? "…" : "")}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          <Separator />

          {/* Footer navigation */}
          <DialogFooter className="gap-2 flex-row justify-between">
            <Button
              variant="outline"
              onClick={() => step === 1 ? (setShowCreate(false)) : setStep(s => (s - 1) as Step)}
            >
              {step === 1 ? "Batal" : <><ChevronLeft className="h-4 w-4 mr-1" />Kembali</>}
            </Button>
            {step < 3 ? (
              <Button
                onClick={() => setStep(s => (s + 1) as Step)}
                disabled={!canNext()}
                className="bg-teal-600 hover:bg-teal-700"
              >
                Lanjut <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={() => createMut.mutate()}
                disabled={createMut.isPending || !scheduledPreview}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {createMut.isPending
                  ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Menyimpan...</>
                  : <><Send className="h-4 w-4 mr-1" />Simpan Jadwal</>
                }
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
