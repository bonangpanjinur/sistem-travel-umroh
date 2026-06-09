import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft, Megaphone, Users, ClipboardList, MapPin, RefreshCw,
  Send, AlertTriangle, CheckCircle2, Clock, Radio, BarChart2, Pin
} from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

async function getToken() {
  return (await supabaseRaw.auth.getSession()).data.session?.access_token || "";
}
async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = await getToken();
  const res = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  });
  if (!res.ok) { const e = await res.json(); throw e; }
  return res.json();
}

const MSG_TYPES = [
  { value: "info",           label: "📢 Info",           color: "bg-blue-50 border-blue-200 text-blue-800" },
  { value: "warning",        label: "⚠️ Perhatian",      color: "bg-amber-50 border-amber-200 text-amber-800" },
  { value: "emergency",      label: "🚨 Darurat",        color: "bg-red-50 border-red-200 text-red-800" },
  { value: "program_update", label: "📅 Update Program", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
];

function getMsgStyle(type: string) {
  return MSG_TYPES.find(m => m.value === type)?.color || MSG_TYPES[0].color;
}

// ─── Tab: Transmisi ───────────────────────────────────────────────────────────
function TransmisiTab({ depId, broadcasts, refetch }: { depId: string; broadcasts: any[]; refetch: () => void }) {
  const [form, setForm] = useState({ title: "", body: "", message_type: "info", is_pinned: false });
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!form.body.trim()) return;
    setSending(true);
    try {
      await apiFetch("/api/v1/guide/broadcasts", {
        method: "POST",
        body: JSON.stringify({ departure_id: depId, channel_id: null, ...form }),
      });
      toast.success("Broadcast terkirim ke rombongan");
      setForm({ title: "", body: "", message_type: "info", is_pinned: false });
      refetch();
    } catch (e: any) {
      toast.error(e?.error || "Gagal mengirim broadcast");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Form Kirim Broadcast */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Kirim Broadcast dari Kantor</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tipe Pesan</Label>
              <Select value={form.message_type} onValueChange={v => setForm(f => ({ ...f, message_type: v }))}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MSG_TYPES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Judul (opsional)</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="h-8 text-xs mt-1" placeholder="Judul broadcast..." />
            </div>
          </div>
          <div>
            <Label className="text-xs">Isi Pesan</Label>
            <Textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={3} className="text-sm mt-1" placeholder="Tulis pesan untuk jamaah..." />
          </div>
          <Button onClick={send} disabled={!form.body.trim() || sending} className="gap-2 w-full">
            <Send className="h-4 w-4" />{sending ? "Mengirim..." : "Kirim ke Semua Jamaah"}
          </Button>
        </CardContent>
      </Card>

      {/* Riwayat Broadcast */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-muted-foreground">{broadcasts.length} broadcast tersimpan</p>
        {broadcasts.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Belum ada broadcast untuk rombongan ini</CardContent></Card>
        ) : (
          broadcasts.map((b: any) => (
            <div key={b.id} className={`p-3 rounded-lg border ${getMsgStyle(b.message_type)}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  {b.title && <p className="font-semibold text-sm">{b.title}</p>}
                  <p className="text-sm mt-0.5">{b.body}</p>
                </div>
                {b.is_pinned && <Pin className="h-3 w-3 flex-shrink-0 mt-0.5" />}
              </div>
              <p className="text-xs opacity-60 mt-1.5">
                {b.created_at ? formatDistanceToNow(parseISO(b.created_at), { locale: idLocale, addSuffix: true }) : ""}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Tab: Absensi ─────────────────────────────────────────────────────────────
function AbsensiTab({ sessions }: { sessions: any[] }) {
  if (sessions.length === 0) {
    return <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Belum ada sesi absensi yang dibuat</CardContent></Card>;
  }
  return (
    <div className="space-y-3">
      {sessions.map((s: any) => {
        const pct = Number(s.total_registered) > 0
          ? Math.round(100 * Number(s.present_count) / Number(s.total_registered))
          : null;
        return (
          <Card key={s.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-sm">{s.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.session_type} {s.location ? `• ${s.location}` : ""}
                    {s.started_at ? ` • ${format(parseISO(s.started_at), "d MMM HH:mm", { locale: idLocale })}` : ""}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  {pct !== null ? (
                    <p className={`text-xl font-bold ${pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-600"}`}>{pct}%</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Belum ada data</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {s.present_count ?? 0} hadir / {s.total_registered ?? 0} terdaftar
                  </p>
                </div>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-gray-200">
                <div
                  className={`h-1.5 rounded-full ${pct == null ? "w-0" : pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${pct ?? 0}%` }}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Attendance analytics chart */}
      {sessions.length >= 2 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Tren Kehadiran</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={sessions.slice().reverse().map((s: any) => ({
                name: s.title?.slice(0, 12) || "Sesi",
                hadir: Number(s.present_count || 0),
                absen: Number(s.absent_count || 0),
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="hadir" fill="#22c55e" name="Hadir" />
                <Bar dataKey="absen" fill="#f87171" name="Absen" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Tab: Lokasi Guide ────────────────────────────────────────────────────────
function LokasiTab({ locations }: { locations: any[] }) {
  if (locations.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <MapPin className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">Guide belum membagikan lokasi saat ini</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {locations.map((loc: any) => (
        <Card key={loc.id}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-sm">{loc.role === "tour_leader" ? "Tour Leader" : "Muthawif"}</p>
                {loc.label && <p className="text-sm text-muted-foreground mt-0.5">"{loc.label}"</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  Koordinat: {Number(loc.latitude).toFixed(6)}, {Number(loc.longitude).toFixed(6)}
                </p>
                {loc.updated_at && (
                  <p className="text-xs text-muted-foreground">
                    Diperbarui {formatDistanceToNow(parseISO(loc.updated_at), { locale: idLocale, addSuffix: true })}
                  </p>
                )}
              </div>
              <a
                href={`https://maps.google.com/?q=${loc.latitude},${loc.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="outline" className="text-xs h-7">Buka Maps</Button>
              </a>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Tab: Analytics ───────────────────────────────────────────────────────────
function AnalyticsTab({ broadcasts, sessions }: { broadcasts: any[]; sessions: any[] }) {
  const broadcastByType = MSG_TYPES.map(m => ({
    name: m.label.replace(/^[^\w]+ /, ""),
    total: broadcasts.filter(b => b.message_type === m.value).length,
  })).filter(x => x.total > 0);

  const avgAttendance = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => {
        const t = Number(s.total_registered);
        const p = Number(s.present_count);
        return sum + (t > 0 ? (p / t) * 100 : 0);
      }, 0) / sessions.length)
    : null;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Total Broadcast", value: broadcasts.length, icon: Megaphone, color: "text-blue-600" },
          { label: "Total Sesi Absensi", value: sessions.length, icon: ClipboardList, color: "text-purple-600" },
          { label: "Rata-rata Kehadiran", value: avgAttendance != null ? `${avgAttendance}%` : "—", icon: Users, color: "text-emerald-600" },
          { label: "Broadcast Darurat", value: broadcasts.filter(b => b.message_type === "emergency").length, icon: AlertTriangle, color: "text-red-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 flex items-center gap-2.5">
              <s.icon className={`h-6 w-6 ${s.color} flex-shrink-0`} />
              <div>
                <p className="text-xl font-bold leading-none">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Broadcast by type chart */}
      {broadcastByType.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Distribusi Tipe Broadcast</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={broadcastByType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total" fill="#3b82f6" name="Jumlah" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Attendance per session chart */}
      {sessions.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Kehadiran per Sesi</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={sessions.slice().reverse().map((s: any) => {
                const t = Number(s.total_registered || 0);
                return {
                  name: s.title?.slice(0, 10) || "Sesi",
                  pct: t > 0 ? Math.round(100 * Number(s.present_count) / t) : 0,
                };
              })}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                <Tooltip formatter={(v: any) => `${v}%`} />
                <Bar dataKey="pct" fill="#22c55e" name="% Hadir" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminLapanganDetail() {
  const { departureId } = useParams<{ departureId: string }>();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-lapangan-detail", departureId],
    enabled: !!departureId,
    refetchInterval: 20_000,
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/v1/guide/admin/${departureId}/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Gagal memuat detail rombongan");
      return res.json();
    },
  });

  const dep        = data?.departure;
  const broadcasts: any[] = data?.broadcasts || [];
  const sessions:   any[] = data?.sessions   || [];
  const locations:  any[] = data?.locations  || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/admin/lapangan" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Radio className="h-5 w-5 text-emerald-600" />
            {dep?.package_name || "Detail Rombongan"}
          </h1>
          {dep && (
            <p className="text-sm text-muted-foreground">
              {dep.departure_date ? format(parseISO(dep.departure_date), "d MMM yyyy", { locale: idLocale }) : ""}
              {" · "}{dep.booked_count ?? 0} jamaah
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">Memuat data rombongan...</div>
      ) : (
        <Tabs defaultValue="transmisi">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="transmisi" className="gap-1 text-xs">
              <Megaphone className="h-3 w-3" />
              Transmisi
              {broadcasts.length > 0 && <Badge variant="secondary" className="h-4 min-w-4 text-[10px] p-0 justify-center">{broadcasts.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="absensi" className="gap-1 text-xs">
              <ClipboardList className="h-3 w-3" />
              Absensi
            </TabsTrigger>
            <TabsTrigger value="lokasi" className="gap-1 text-xs">
              <MapPin className="h-3 w-3" />
              Lokasi
              {locations.length > 0 && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1 text-xs">
              <BarChart2 className="h-3 w-3" />
              Analytics
            </TabsTrigger>
          </TabsList>
          <TabsContent value="transmisi" className="mt-4">
            <TransmisiTab depId={departureId!} broadcasts={broadcasts} refetch={refetch} />
          </TabsContent>
          <TabsContent value="absensi" className="mt-4">
            <AbsensiTab sessions={sessions} />
          </TabsContent>
          <TabsContent value="lokasi" className="mt-4">
            <LokasiTab locations={locations} />
          </TabsContent>
          <TabsContent value="analytics" className="mt-4">
            <AnalyticsTab broadcasts={broadcasts} sessions={sessions} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
