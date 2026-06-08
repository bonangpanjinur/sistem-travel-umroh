import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Bell, Send, Users, CheckCircle2, XCircle, Clock, Loader2,
  Info, ShieldCheck, Key, Save, RotateCcw, ExternalLink,
  Smartphone, RefreshCw, Filter, BellRing, Building2, UserCheck,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { usePWAConfig, DEFAULT_VAPID_CONFIG, type PushVapidConfig } from "@/hooks/usePWAConfig";

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTIF_TYPES = [
  { value: "info",    label: "Informasi",       color: "bg-blue-100 text-blue-800",   hex: "#3b82f6" },
  { value: "warning", label: "Peringatan",       color: "bg-amber-100 text-amber-800", hex: "#f59e0b" },
  { value: "success", label: "Sukses",           color: "bg-green-100 text-green-800", hex: "#10b981" },
  { value: "urgent",  label: "Penting/Mendesak", color: "bg-red-100 text-red-800",     hex: "#ef4444" },
];

const STAFF_ROLES = [
  { value: "super_admin",    label: "Super Admin",    icon: "🛡️" },
  { value: "owner",          label: "Owner",          icon: "👑" },
  { value: "branch_manager", label: "Manajer Cabang", icon: "🏢" },
  { value: "finance",        label: "Keuangan",        icon: "💰" },
  { value: "sales",          label: "Sales",           icon: "📊" },
  { value: "marketing",      label: "Marketing",       icon: "📣" },
  { value: "agent",          label: "Agen",            icon: "🤝" },
  { value: "sub_agent",      label: "Sub Agen",        icon: "🔗" },
];

const RECIPIENT_TYPES = [
  { value: "all",       label: "Semua Jamaah" },
  { value: "departure", label: "Per Keberangkatan" },
  { value: "custom",    label: "Pilih Manual" },
];

// ─── Phone Notification Preview ───────────────────────────────────────────────

function PhonePreview({ title, body, type }: { title: string; body: string; type: string }) {
  const typeInfo = NOTIF_TYPES.find((t) => t.value === type) ?? NOTIF_TYPES[0];
  const now = new Date();
  const timeStr = format(now, "HH:mm");

  return (
    <div className="flex flex-col items-center">
      <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Preview Notifikasi</p>

      {/* Phone frame */}
      <div className="relative w-64 rounded-[2rem] border-4 border-gray-800 bg-gray-900 shadow-2xl overflow-hidden">
        {/* Status bar */}
        <div className="bg-gray-900 px-5 pt-3 pb-1 flex items-center justify-between">
          <span className="text-white text-[10px] font-semibold">{timeStr}</span>
          <div className="w-16 h-4 bg-black rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
          <div className="flex gap-1 items-center">
            <svg className="w-3 h-3 text-white fill-white" viewBox="0 0 24 24"><path d="M1.5 8.5C5.5 4 10.5 2 12 2s6.5 2 10.5 6.5L21 11c-3-3.5-5.5-5.5-9-5.5S6 7.5 3 11L1.5 8.5z"/><path d="M4.5 11.5C7 8.5 9.5 7 12 7s5 1.5 7.5 4.5L18 13.5C16 11 14 10 12 10s-4 1-6 3.5L4.5 11.5z"/><circle cx="12" cy="18" r="2"/></svg>
            <div className="text-white text-[10px]">🔋</div>
          </div>
        </div>

        {/* Lock screen / notification area */}
        <div className="bg-gradient-to-b from-gray-800 to-gray-700 px-3 py-3 min-h-[240px]">
          {/* Notification card */}
          <div
            className="rounded-2xl p-3 shadow-lg"
            style={{ backgroundColor: "rgba(255,255,255,0.95)" }}
          >
            {/* App header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ backgroundColor: typeInfo.hex }}
                >
                  V
                </div>
                <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                  Vinstour Travel
                </span>
              </div>
              <span className="text-[10px] text-gray-400">sekarang</span>
            </div>

            {/* Content */}
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-gray-900 leading-tight">
                {title || <span className="text-gray-400 italic font-normal">Judul notifikasi…</span>}
              </p>
              <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                {body || <span className="text-gray-400 italic">Isi pesan…</span>}
              </p>
            </div>
          </div>

          {/* Second blurred card hint */}
          <div className="mt-2 rounded-xl bg-white/20 h-8 mx-2 blur-[1px]" />
        </div>

        {/* Home indicator */}
        <div className="bg-gray-900 py-2 flex justify-center">
          <div className="w-24 h-1 bg-gray-600 rounded-full" />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Smartphone className="h-3.5 w-3.5" />
        <span>Tampilan di perangkat penerima</span>
      </div>
    </div>
  );
}

// ─── Subscriber Stats Bar ──────────────────────────────────────────────────────

function SubscriberBar({
  stats,
  selectedRoles,
  selectedBranches,
}: {
  stats: { total: number; byRole: { role: string; count: number }[] };
  selectedRoles: Set<string>;
  selectedBranches: Set<string>;
}) {
  const targetCount = useMemo(() => {
    if (selectedRoles.size === 0) {
      return stats.total;
    }
    return stats.byRole
      .filter((r) => selectedRoles.has(r.role))
      .reduce((sum, r) => sum + r.count, 0);
  }, [stats, selectedRoles, selectedBranches]);

  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
      <UserCheck className="h-5 w-5 text-emerald-600 shrink-0" />
      <div>
        <p className="text-sm font-semibold text-emerald-900">
          {targetCount} subscriber akan menerima
        </p>
        <p className="text-xs text-emerald-700">
          {selectedRoles.size === 0 ? "Semua role staf" : `${selectedRoles.size} role dipilih`}
          {selectedBranches.size > 0 ? ` · ${selectedBranches.size} cabang dipilih` : ""}
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AdminPushNotifications() {
  const { vapidConfig, saveVapidConfig, isSaving } = usePWAConfig();
  const [vapidDraft, setVapidDraft] = useState<PushVapidConfig>(DEFAULT_VAPID_CONFIG);

  useEffect(() => {
    setVapidDraft(vapidConfig);
  }, [vapidConfig.publicKey, vapidConfig.subject, vapidConfig.enabled]);

  // ── Staff Broadcast State ──
  const [staffForm, setStaffForm] = useState({ title: "", body: "", type: "info", url: "/admin" });
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(new Set());
  const [isSendingStaff, setIsSendingStaff] = useState(false);

  // ── Jamaah Notification State ──
  const [recipientType, setRecipientType] = useState("all");
  const [selectedDeparture, setSelectedDeparture] = useState("");
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [jamaahForm, setJamaahForm] = useState({ title: "", message: "", type: "info" });
  const [customerSearch, setCustomerSearch] = useState("");
  const [isSendingJamaah, setIsSendingJamaah] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);

  // ── Subscriber stats ──
  const { data: subStats = { total: 0, byRole: [], byBranch: [] }, refetch: refetchStats } = useQuery({
    queryKey: ["push-subscriber-stats"],
    queryFn: async () => {
      const res = await fetch("/api/push/subscriber-stats");
      if (!res.ok) throw new Error("Gagal memuat statistik");
      return res.json();
    },
    refetchInterval: 30000,
  });

  // ── Branches ──
  const { data: branches = [] } = useQuery({
    queryKey: ["branches-push"],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("id, name, code").eq("is_active", true).order("name");
      return data || [];
    },
  });

  // ── Departures for jamaah tab ──
  const { data: departures = [] } = useQuery({
    queryKey: ["departures-notif"],
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select("id, departure_date, package:packages(name)")
        .order("departure_date", { ascending: false })
        .limit(30);
      return data || [];
    },
  });

  // ── Customers for jamaah tab ──
  const { data: customers = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ["customers-notif", selectedDeparture, recipientType],
    queryFn: async () => {
      if (recipientType === "departure" && selectedDeparture) {
        const { data } = await supabase
          .from("booking_passengers")
          .select("customer:customers(id, full_name, phone)")
          .eq("booking.departure_id" as any, selectedDeparture)
          .limit(500);
        const seen = new Set<string>();
        const list: any[] = [];
        (data || []).forEach((row: any) => {
          if (row.customer && !seen.has(row.customer.id)) {
            seen.add(row.customer.id);
            list.push(row.customer);
          }
        });
        return list;
      }
      const { data } = await supabase
        .from("customers")
        .select("id, full_name, phone")
        .order("full_name")
        .limit(500);
      return data || [];
    },
    enabled: recipientType !== "departure" || !!selectedDeparture,
  });

  const { data: notifications = [], refetch: refetchNotifs } = useQuery({
    queryKey: ["customer-notifications-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_notifications" as any)
        .select("*, customer:customers(full_name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return (data || []) as any[];
    },
  });

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter((c: any) =>
      c.full_name?.toLowerCase().includes(q) || c.phone?.includes(q)
    );
  }, [customers, customerSearch]);

  const notifStats = useMemo(() => ({
    total:  notifications.length,
    read:   notifications.filter((n: any) => n.is_read).length,
    unread: notifications.filter((n: any) => !n.is_read).length,
  }), [notifications]);

  // ── Handlers ──

  const toggleRole = (role: string) =>
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      next.has(role) ? next.delete(role) : next.add(role);
      return next;
    });

  const toggleBranch = (id: string) =>
    setSelectedBranches((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleSendStaff = async () => {
    if (!staffForm.title || !staffForm.body) {
      toast.error("Judul dan pesan wajib diisi");
      return;
    }
    setIsSendingStaff(true);
    try {
      const res = await fetch("/api/push/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:      staffForm.title,
          body:       staffForm.body,
          type:       staffForm.type,
          url:        staffForm.url || "/admin",
          roles:      selectedRoles.size > 0 ? Array.from(selectedRoles) : undefined,
          branch_ids: selectedBranches.size > 0 ? Array.from(selectedBranches) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Gagal mengirim");
        return;
      }
      toast.success(
        `Push terkirim ke ${data.sent} subscriber` +
        (data.failed > 0 ? ` · ${data.failed} gagal` : "") +
        (data.cleaned > 0 ? ` · ${data.cleaned} expired dibersihkan` : "")
      );
      setStaffForm({ title: "", body: "", type: "info", url: "/admin" });
      refetchStats();
    } catch (e: any) {
      toast.error("Gagal: " + e.message);
    } finally {
      setIsSendingStaff(false);
    }
  };

  const getJamaahTargets = () => {
    if (recipientType === "all") return customers;
    if (recipientType === "departure") return customers;
    return customers.filter((c: any) => selectedCustomers.has(c.id));
  };

  const handleSendJamaah = async () => {
    const targets = getJamaahTargets();
    if (!targets.length) { toast.error("Tidak ada penerima"); return; }
    if (!jamaahForm.title || !jamaahForm.message) { toast.error("Judul dan pesan harus diisi"); return; }

    setIsSendingJamaah(true);
    setSendProgress(0);
    let success = 0;

    try {
      const rows = targets.map((c: any) => ({
        customer_id: c.id,
        title:   jamaahForm.title,
        message: jamaahForm.message,
        type:    jamaahForm.type,
        is_read: false,
      }));

      const chunkSize = 50;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        await supabase.from("customer_notifications" as any).insert(chunk as any);
        success += chunk.length;
        setSendProgress(Math.round((success / rows.length) * 100));
      }

      toast.success(`Notifikasi berhasil dikirim ke ${success} jamaah`);
      refetchNotifs();
      setJamaahForm({ title: "", message: "", type: "info" });
      setSelectedCustomers(new Set());
    } catch (e: any) {
      toast.error("Gagal mengirim: " + e.message);
    } finally {
      setIsSendingJamaah(false);
      setSendProgress(0);
    }
  };

  const toggleCustomer = (id: string) => {
    setSelectedCustomers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 rounded-xl">
            <BellRing className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Push Notifikasi</h1>
            <p className="text-muted-foreground text-sm">Broadcast manual ke staf & jamaah</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-2xl font-bold text-emerald-600">{subStats.total}</p>
            <p className="text-xs text-muted-foreground">total subscriber staf</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => refetchStats()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="staf" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="staf" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Broadcast Staf
          </TabsTrigger>
          <TabsTrigger value="jamaah" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" /> Notifikasi Jamaah
          </TabsTrigger>
          <TabsTrigger value="subscriber" className="gap-1.5">
            <UserCheck className="h-3.5 w-3.5" /> Subscriber
          </TabsTrigger>
          <TabsTrigger value="vapid" className="gap-1.5">
            <Key className="h-3.5 w-3.5" /> Konfigurasi VAPID
          </TabsTrigger>
        </TabsList>

        {/* ═══ TAB 1: BROADCAST STAF ═════════════════════════════════════════ */}
        <TabsContent value="staf" className="space-y-4">
          {subStats.total === 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Belum ada subscriber staf. Staf perlu login dan mengizinkan notifikasi di browser mereka — izin diminta otomatis setelah login.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* ── Compose ── */}
            <div className="xl:col-span-2 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Send className="h-4 w-4 text-emerald-600" />
                    Tulis Pesan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <Label>Judul Notifikasi *</Label>
                      <Input
                        value={staffForm.title}
                        onChange={(e) => setStaffForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="Contoh: Booking baru memerlukan konfirmasi"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Pesan *</Label>
                      <Textarea
                        value={staffForm.body}
                        onChange={(e) => setStaffForm((f) => ({ ...f, body: e.target.value }))}
                        rows={3}
                        placeholder="Isi pesan yang singkat dan jelas…"
                      />
                    </div>
                    <div>
                      <Label>Tipe</Label>
                      <Select value={staffForm.type} onValueChange={(v) => setStaffForm((f) => ({ ...f, type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {NOTIF_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${t.color}`}>
                                {t.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>URL Tujuan</Label>
                      <Input
                        value={staffForm.url}
                        onChange={(e) => setStaffForm((f) => ({ ...f, url: e.target.value }))}
                        placeholder="/admin/bookings"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Halaman yang dibuka saat klik notifikasi</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ── Filter Penerima ── */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Filter className="h-4 w-4 text-amber-600" />
                    Filter Penerima
                    {(selectedRoles.size > 0 || selectedBranches.size > 0) && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {selectedRoles.size + selectedBranches.size} filter aktif
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Role checkboxes */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">Berdasarkan Role</Label>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost" size="sm" className="h-7 px-2 text-xs"
                          onClick={() => setSelectedRoles(new Set(STAFF_ROLES.map((r) => r.value)))}
                        >Semua</Button>
                        <Button
                          variant="ghost" size="sm" className="h-7 px-2 text-xs"
                          onClick={() => setSelectedRoles(new Set())}
                        >Reset</Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {STAFF_ROLES.map((role) => {
                        const roleCount = subStats.byRole?.find((r: any) => r.role === role.value)?.count ?? 0;
                        return (
                          <label
                            key={role.value}
                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                              selectedRoles.has(role.value)
                                ? "border-emerald-400 bg-emerald-50"
                                : "border-border hover:bg-muted/50"
                            }`}
                          >
                            <Checkbox
                              checked={selectedRoles.has(role.value)}
                              onCheckedChange={() => toggleRole(role.value)}
                              className="shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">
                                {role.icon} {role.label}
                              </p>
                              <p className="text-[10px] text-muted-foreground">{roleCount} sub</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    {selectedRoles.size === 0 && (
                      <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                        <Info className="h-3 w-3" /> Tidak ada role dipilih = broadcast ke semua staf
                      </p>
                    )}
                  </div>

                  {/* Branch filter */}
                  {branches.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm font-medium flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5" /> Filter Cabang
                          </Label>
                          {selectedBranches.size > 0 && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setSelectedBranches(new Set())}>
                              Reset
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {branches.map((b: any) => (
                            <label
                              key={b.id}
                              className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                                selectedBranches.has(b.id)
                                  ? "border-blue-400 bg-blue-50"
                                  : "border-border hover:bg-muted/50"
                              }`}
                            >
                              <Checkbox
                                checked={selectedBranches.has(b.id)}
                                onCheckedChange={() => toggleBranch(b.id)}
                                className="shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate">{b.name}</p>
                                {b.code && <p className="text-[10px] text-muted-foreground">{b.code}</p>}
                              </div>
                            </label>
                          ))}
                        </div>
                        {selectedBranches.size === 0 && (
                          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                            <Info className="h-3 w-3" /> Tidak ada cabang dipilih = semua cabang
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {/* Target count */}
                  <SubscriberBar
                    stats={subStats}
                    selectedRoles={selectedRoles}
                    selectedBranches={selectedBranches}
                  />

                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    size="lg"
                    onClick={handleSendStaff}
                    disabled={isSendingStaff || !staffForm.title || !staffForm.body}
                  >
                    {isSendingStaff
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Mengirim…</>
                      : <><Send className="h-4 w-4 mr-2" />Kirim Push Notifikasi</>}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* ── Phone Preview ── */}
            <div className="flex flex-col items-center justify-start pt-2">
              <PhonePreview
                title={staffForm.title}
                body={staffForm.body}
                type={staffForm.type}
              />

              {/* Type badge legend */}
              <div className="mt-4 w-full space-y-1.5">
                {NOTIF_TYPES.map((t) => (
                  <div
                    key={t.value}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all ${
                      staffForm.type === t.value
                        ? t.color + " ring-2 ring-offset-1"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted"
                    }`}
                    onClick={() => setStaffForm((f) => ({ ...f, type: t.value }))}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.hex }} />
                    {t.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ═══ TAB 2: NOTIFIKASI JAMAAH ══════════════════════════════════════ */}
        <TabsContent value="jamaah" className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Notifikasi tampil di portal jamaah (<code className="bg-muted px-1 rounded text-xs">/jamaah</code>). Notifikasi ini disimpan ke database, bukan browser push.
            </AlertDescription>
          </Alert>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Terkirim", value: notifStats.total, icon: Bell, color: "text-primary" },
              { label: "Sudah Dibaca", value: notifStats.read, icon: CheckCircle2, color: "text-emerald-500" },
              { label: "Belum Dibaca", value: notifStats.unread, icon: Clock, color: "text-amber-500" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-4 flex items-center gap-3">
                  <s.icon className={`h-6 w-6 ${s.color}`} />
                  <div>
                    <p className="text-xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compose */}
            <Card>
              <CardHeader><CardTitle className="text-base">Tulis Notifikasi</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Judul *</Label>
                  <Input
                    value={jamaahForm.title}
                    onChange={(e) => setJamaahForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Pengingat keberangkatan…"
                  />
                </div>
                <div>
                  <Label>Pesan *</Label>
                  <Textarea
                    value={jamaahForm.message}
                    onChange={(e) => setJamaahForm((f) => ({ ...f, message: e.target.value }))}
                    rows={4}
                    placeholder="Isi pesan…"
                  />
                </div>
                <div>
                  <Label>Tipe</Label>
                  <Select value={jamaahForm.type} onValueChange={(v) => setJamaahForm((f) => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {NOTIF_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {(jamaahForm.title || jamaahForm.message) && (
                  <div className={`p-3 rounded-lg border ${jamaahForm.type === "urgent" ? "border-red-200 bg-red-50" : jamaahForm.type === "warning" ? "border-amber-200 bg-amber-50" : jamaahForm.type === "success" ? "border-green-200 bg-green-50" : "border-blue-200 bg-blue-50"}`}>
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Preview</p>
                    <p className="font-semibold text-sm">{jamaahForm.title || "(Judul)"}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{jamaahForm.message || "(Pesan)"}</p>
                  </div>
                )}

                {isSendingJamaah && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Mengirim… {sendProgress}%</p>
                    <Progress value={sendProgress} />
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={handleSendJamaah}
                  disabled={isSendingJamaah || !jamaahForm.title || !jamaahForm.message}
                >
                  {isSendingJamaah
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Mengirim…</>
                    : <><Send className="h-4 w-4 mr-2" />Kirim ke {getJamaahTargets().length} Jamaah</>}
                </Button>
              </CardContent>
            </Card>

            {/* Recipients */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pilih Penerima</CardTitle>
                <Select value={recipientType} onValueChange={(v) => { setRecipientType(v); setSelectedCustomers(new Set()); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RECIPIENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="space-y-3">
                {recipientType === "departure" && (
                  <Select value={selectedDeparture} onValueChange={setSelectedDeparture}>
                    <SelectTrigger><SelectValue placeholder="Pilih keberangkatan" /></SelectTrigger>
                    <SelectContent>
                      {departures.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.package?.name} — {format(new Date(d.departure_date), "dd MMM yyyy")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {recipientType === "custom" && (
                  <>
                    <div className="flex gap-2">
                      <Input
                        className="flex-1 h-9"
                        placeholder="Cari jamaah…"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                      />
                      <Button variant="outline" size="sm" onClick={() => setSelectedCustomers(new Set(filteredCustomers.map((c: any) => c.id)))}>Semua</Button>
                      <Button variant="outline" size="sm" onClick={() => setSelectedCustomers(new Set())}>Reset</Button>
                    </div>
                    <ScrollArea className="h-[260px] border rounded-md">
                      <div className="p-2 space-y-1">
                        {loadingCustomers
                          ? <p className="text-sm text-center py-4 text-muted-foreground">Memuat…</p>
                          : filteredCustomers.map((c: any) => (
                              <div
                                key={c.id}
                                className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer"
                                onClick={() => toggleCustomer(c.id)}
                              >
                                <Checkbox checked={selectedCustomers.has(c.id)} onCheckedChange={() => toggleCustomer(c.id)} />
                                <div>
                                  <p className="text-sm font-medium">{c.full_name}</p>
                                  <p className="text-xs text-muted-foreground">{c.phone || "-"}</p>
                                </div>
                              </div>
                            ))}
                      </div>
                    </ScrollArea>
                    <p className="text-xs text-muted-foreground">{selectedCustomers.size} dipilih dari {filteredCustomers.length}</p>
                  </>
                )}

                {recipientType !== "custom" && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm">
                      {loadingCustomers ? "Memuat…" : `${customers.length} jamaah akan menerima notifikasi`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* History */}
          <Card>
            <CardHeader><CardTitle className="text-base">Riwayat Notifikasi</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jamaah</TableHead>
                    <TableHead>Judul</TableHead>
                    <TableHead>Pesan</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Waktu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!notifications.length
                    ? <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Belum ada riwayat</TableCell></TableRow>
                    : notifications.slice(0, 100).map((n: any) => (
                        <TableRow key={n.id}>
                          <TableCell className="font-medium text-sm">{n.customer?.full_name || "-"}</TableCell>
                          <TableCell className="font-medium text-sm">{n.title}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{n.message}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${NOTIF_TYPES.find((t) => t.value === n.type)?.color || ""}`}>
                              {NOTIF_TYPES.find((t) => t.value === n.type)?.label || n.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {n.is_read
                              ? <Badge variant="outline" className="text-xs text-emerald-600"><CheckCircle2 className="h-3 w-3 mr-1" />Dibaca</Badge>
                              : <Badge variant="secondary" className="text-xs"><Clock className="h-3 w-3 mr-1" />Belum</Badge>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {n.created_at ? format(parseISO(n.created_at), "dd MMM HH:mm", { locale: id }) : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB 3: SUBSCRIBER STATS ════════════════════════════════════════ */}
        <TabsContent value="subscriber" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* By Role */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Subscriber per Role
                </CardTitle>
              </CardHeader>
              <CardContent>
                {subStats.byRole?.length === 0
                  ? <p className="text-sm text-muted-foreground text-center py-6">Belum ada subscriber staf</p>
                  : (
                    <div className="space-y-3">
                      {STAFF_ROLES.map((role) => {
                        const count = subStats.byRole?.find((r: any) => r.role === role.value)?.count ?? 0;
                        const pct = subStats.total > 0 ? Math.round((count / subStats.total) * 100) : 0;
                        return (
                          <div key={role.value} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">{role.icon} {role.label}</span>
                              <span className="text-muted-foreground">{count} subscriber</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* By Branch */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Subscriber per Cabang
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!subStats.byBranch?.length
                  ? <p className="text-sm text-muted-foreground text-center py-6">Belum ada data cabang</p>
                  : (
                    <div className="space-y-2">
                      {subStats.byBranch.map((b: any) => (
                        <div key={b.branch_id ?? "pusat"} className="flex items-center justify-between py-2 border-b last:border-b-0">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{b.branch_name}</span>
                          </div>
                          <Badge variant="secondary">{b.count} sub</Badge>
                        </div>
                      ))}
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>

          {/* Total card */}
          <Card className="border-emerald-200 bg-emerald-50/40">
            <CardContent className="pt-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-100">
                <UserCheck className="h-6 w-6 text-emerald-700" />
              </div>
              <div>
                <p className="text-3xl font-bold text-emerald-700">{subStats.total}</p>
                <p className="text-sm text-muted-foreground">Total subscriber staf aktif</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-muted-foreground">Data diperbarui otomatis setiap 30 detik</p>
                <Button variant="outline" size="sm" className="mt-1" onClick={() => refetchStats()}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB 4: KONFIGURASI VAPID ══════════════════════════════════════ */}
        <TabsContent value="vapid" className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              VAPID Keys diperlukan untuk Web Push Notifications. Generate sepasang key lalu set di Replit Secrets:{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">VAPID_PUBLIC_KEY</code> dan{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">VAPID_PRIVATE_KEY</code>.{" "}
              <a href="https://vapidkeys.com/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                Generator online <ExternalLink className="h-3 w-3" />
              </a>
              {" atau: "}
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">npx web-push generate-vapid-keys</code>
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Konfigurasi VAPID
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div>
                  <p className="text-sm font-semibold">Aktifkan Web Push</p>
                  <p className="text-xs text-muted-foreground">Jika nonaktif, staf & jamaah tidak dapat subscribe</p>
                </div>
                <Checkbox
                  checked={vapidDraft.enabled}
                  onCheckedChange={(v) => setVapidDraft((d) => ({ ...d, enabled: !!v }))}
                />
              </div>

              <div>
                <Label>Subject (mailto)</Label>
                <Input
                  value={vapidDraft.subject}
                  onChange={(e) => setVapidDraft((d) => ({ ...d, subject: e.target.value }))}
                  placeholder="mailto:admin@vinstour.com"
                />
                <p className="text-xs text-muted-foreground mt-1">Email kontak admin (format mailto:)</p>
              </div>

              <div>
                <Label>VAPID Public Key</Label>
                <Textarea
                  value={vapidDraft.publicKey}
                  onChange={(e) => setVapidDraft((d) => ({ ...d, publicKey: e.target.value.trim() }))}
                  rows={2}
                  className="font-mono text-xs"
                  placeholder="BKcM…IgGo"
                />
                <p className="text-xs text-muted-foreground mt-1">~87 karakter base64url. Aman untuk publik.</p>
              </div>

              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
                <p className="font-semibold">🔒 Private key TIDAK disimpan di database.</p>
                <p>Set sebagai secret <code className="bg-amber-100 px-1 rounded">VAPID_PRIVATE_KEY</code> langsung di Replit Secrets — server membacanya otomatis dari environment variable.</p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={() => saveVapidConfig(vapidDraft)} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Simpan Konfigurasi
                </Button>
                <Button variant="outline" onClick={() => setVapidDraft(DEFAULT_VAPID_CONFIG)}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>

              {vapidConfig.publicKey && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-900">
                    <CheckCircle2 className="h-4 w-4" />
                    Status: {vapidConfig.enabled ? "Aktif & terkonfigurasi" : "Terkonfigurasi (belum aktif)"}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
