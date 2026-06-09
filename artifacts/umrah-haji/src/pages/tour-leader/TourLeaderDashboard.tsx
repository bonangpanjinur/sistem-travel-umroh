import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  Radio, Users, AlertTriangle, MessageSquare, CalendarCheck,
  ChevronRight, Send, Megaphone, ClipboardList, MapPin, Mic
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const supabase: any = supabaseRaw;

const MSG_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  info:           { label: "Info",           color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
  warning:        { label: "Perhatian",      color: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
  emergency:      { label: "Darurat",        color: "text-red-700",     bg: "bg-red-50 border-red-200" },
  program_update: { label: "Update Program", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
};

export default function TourLeaderDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [quickMsg, setQuickMsg] = useState("");
  const [quickType, setQuickType] = useState("info");
  const [sending, setSending] = useState(false);

  // Get departure for this tour leader
  const { data: departure, isLoading: depLoading } = useQuery({
    queryKey: ["tl-departure", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select("id, departure_date, return_date, package:packages(name), booked_count, quota")
        .eq("tour_leader_user_id", user!.id)
        .in("status", ["active", "departed", "open"])
        .order("departure_date", { ascending: false })
        .limit(1)
        .single();
      return data;
    },
  });

  const depId = departure?.id;

  // Stats: jamaah
  const { data: stats } = useQuery({
    queryKey: ["tl-stats", depId],
    enabled: !!depId,
    refetchInterval: 30000,
    queryFn: async () => {
      const [sosRes, broadcastsRes, sessionsRes] = await Promise.all([
        supabase.from("sos_alerts").select("id", { count: "exact" }).eq("departure_id", depId).eq("status", "active"),
        fetch(`/api/v1/guide/broadcasts/${depId}`, { headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` } }).then(r => r.json()),
        fetch(`/api/v1/guide/sessions/${depId}`, { headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` } }).then(r => r.json()),
      ]);
      return {
        sosActive: sosRes.count || 0,
        broadcasts: broadcastsRes.broadcasts || [],
        sessions: sessionsRes.sessions || [],
      };
    },
  });

  const sendQuickBroadcast = async () => {
    if (!quickMsg.trim() || !depId) return;
    setSending(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch("/api/v1/guide/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ departure_id: depId, message_type: quickType, body: quickMsg, sender_role: "tour_leader" }),
      });
      if (!res.ok) throw new Error("Gagal mengirim");
      toast.success("Transmisi berhasil dikirim ke seluruh jamaah");
      setQuickMsg("");
      qc.invalidateQueries({ queryKey: ["tl-stats", depId] });
    } catch {
      toast.error("Gagal mengirim transmisi");
    } finally {
      setSending(false);
    }
  };

  const todaySessions = (stats?.sessions || []).filter((s: any) => {
    const created = new Date(s.created_at);
    const today = new Date();
    return created.toDateString() === today.toDateString();
  });

  const recentBroadcasts = (stats?.broadcasts || []).slice(0, 3);

  if (depLoading) return (
    <div className="p-6 space-y-4 max-w-2xl mx-auto">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
    </div>
  );

  if (!departure) return (
    <div className="p-6 text-center text-slate-500 max-w-lg mx-auto mt-20">
      <Radio className="h-12 w-12 mx-auto mb-4 text-slate-300" />
      <h2 className="text-lg font-semibold text-slate-700 mb-2">Tidak Ada Rombongan Aktif</h2>
      <p className="text-sm">Anda belum ditugaskan sebagai Tour Leader pada keberangkatan manapun saat ini.</p>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-emerald-100 rounded-xl">
          <Radio className="h-6 w-6 text-emerald-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">Portal Tour Leader</h1>
          <p className="text-sm text-slate-500">{(departure.package as any)?.name || "Rombongan Umroh/Haji"}</p>
          {departure.departure_date && (
            <p className="text-xs text-slate-400 mt-0.5">
              {format(parseISO(departure.departure_date), "d MMMM yyyy", { locale: idLocale })}
            </p>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm bg-emerald-50">
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-emerald-700">{departure.booked_count || 0}</div>
            <div className="text-xs text-emerald-600">Total Jamaah</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-red-50">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-red-600">{stats?.sosActive || 0}</div>
            <div className="text-xs text-red-500">SOS Aktif</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-blue-50">
          <CardContent className="p-4 text-center">
            <CalendarCheck className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-blue-700">{todaySessions.length}</div>
            <div className="text-xs text-blue-600">Sesi Hari Ini</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Broadcast */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-emerald-600" />
            Kirim Transmisi Cepat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={quickType} onValueChange={setQuickType}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(MSG_TYPE_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Tulis pesan untuk seluruh jamaah rombongan..."
            value={quickMsg}
            onChange={e => setQuickMsg(e.target.value)}
            className="resize-none"
            rows={3}
          />
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            onClick={sendQuickBroadcast}
            disabled={!quickMsg.trim() || sending}
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? "Mengirim..." : "Kirim ke Seluruh Jamaah"}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Broadcasts */}
      {recentBroadcasts.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center justify-between">
              <span className="flex items-center gap-2"><MessageSquare className="h-4 w-4" />Transmisi Terakhir</span>
              <Link to="/tour-leader/broadcast" className="text-emerald-600 text-xs flex items-center gap-1">
                Semua <ChevronRight className="h-3 w-3" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentBroadcasts.map((b: any) => {
              const cfg = MSG_TYPE_CONFIG[b.message_type] || MSG_TYPE_CONFIG.info;
              return (
                <div key={b.id} className={`p-3 rounded-lg border text-sm ${cfg.bg}`}>
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className={`text-xs ${cfg.color} border-current`}>{cfg.label}</Badge>
                    <span className="text-xs text-slate-400">{b.read_count} dibaca</span>
                  </div>
                  <p className={`${cfg.color} line-clamp-2`}>{b.body}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { to: "/tour-leader/broadcast", icon: Megaphone, label: "Transmisi", color: "text-blue-600 bg-blue-50" },
          { to: "/tour-leader/attendance", icon: ClipboardList, label: "Absensi Sesi", color: "text-purple-600 bg-purple-50" },
          { to: "/tour-leader/siaran", icon: Mic, label: "Siaran Audio", color: "text-emerald-600 bg-emerald-50" },
          { to: "/jamaah/rombongan", icon: Users, label: "Daftar Jamaah", color: "text-orange-600 bg-orange-50" },
        ].map(item => (
          <Link key={item.to} to={item.to}>
            <Card className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${item.color}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-slate-700">{item.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
