import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Send, Megaphone, CheckCheck, Clock, Pin, AlertTriangle, Info, RefreshCcw, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const supabase: any = supabaseRaw;

const MSG_TYPES = [
  { value: "info",           label: "📢 Info",           color: "bg-blue-100 text-blue-800 border-blue-200",    badge: "bg-blue-100 text-blue-700" },
  { value: "warning",        label: "⚠️ Perhatian",      color: "bg-amber-100 text-amber-800 border-amber-200", badge: "bg-amber-100 text-amber-700" },
  { value: "emergency",      label: "🚨 Darurat",        color: "bg-red-100 text-red-800 border-red-200",       badge: "bg-red-100 text-red-700" },
  { value: "program_update", label: "📅 Update Program", color: "bg-emerald-100 text-emerald-800 border-emerald-200", badge: "bg-emerald-100 text-emerald-700" },
];

async function getToken() {
  return (await supabaseRaw.auth.getSession()).data.session?.access_token || "";
}

export default function TourLeaderBroadcast() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [form, setForm] = useState({ title: "", body: "", message_type: "info", is_pinned: false, expires_minutes: "" });
  const [sending, setSending] = useState(false);

  const { data: departure } = useQuery({
    queryKey: ["tl-departure", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select("id, departure_date, package:packages(name)")
        .eq("tour_leader_user_id", user!.id)
        .in("status", ["active", "departed", "open"])
        .order("departure_date", { ascending: false })
        .limit(1)
        .single();
      return data;
    },
  });

  const depId = departure?.id;

  const { data: broadcastsData, isLoading } = useQuery({
    queryKey: ["tl-broadcasts", depId],
    enabled: !!depId,
    refetchInterval: 20000,
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/v1/guide/broadcasts/${depId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
  });

  const broadcasts = broadcastsData?.broadcasts || [];

  const sendBroadcast = async () => {
    if (!form.body.trim() || !depId) return;
    setSending(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/v1/guide/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          departure_id: depId,
          message_type: form.message_type,
          title: form.title || null,
          body: form.body,
          is_pinned: form.is_pinned,
          expires_minutes: form.expires_minutes ? parseInt(form.expires_minutes) : null,
          sender_role: "tour_leader",
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Transmisi berhasil dikirim!");
      setForm({ title: "", body: "", message_type: "info", is_pinned: false, expires_minutes: "" });
      qc.invalidateQueries({ queryKey: ["tl-broadcasts", depId] });
    } catch {
      toast.error("Gagal mengirim transmisi");
    } finally {
      setSending(false);
    }
  };

  const getMsgCfg = (type: string) => MSG_TYPES.find(t => t.value === type) || MSG_TYPES[0];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/tour-leader">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-emerald-600" />
            Transmisi
          </h1>
          <p className="text-xs text-slate-400">{(departure?.package as any)?.name || "Rombongan"}</p>
        </div>
      </div>

      {/* Form Broadcast */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Kirim Transmisi Baru</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-slate-500 mb-1.5 block">Tipe Pesan</Label>
            <div className="grid grid-cols-2 gap-2">
              {MSG_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setForm(f => ({ ...f, message_type: t.value }))}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                    form.message_type === t.value ? t.color + " ring-2 ring-offset-1 ring-current" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs text-slate-500 mb-1.5 block">Judul (opsional)</Label>
            <Input
              placeholder="Judul pesan..."
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="h-9"
            />
          </div>

          <div>
            <Label className="text-xs text-slate-500 mb-1.5 block">Isi Pesan <span className="text-red-500">*</span></Label>
            <Textarea
              placeholder="Tulis pesan untuk seluruh jamaah rombongan..."
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={form.is_pinned} onCheckedChange={v => setForm(f => ({ ...f, is_pinned: v }))} />
              <Label className="text-xs text-slate-600 flex items-center gap-1">
                <Pin className="h-3 w-3" /> Pin pesan
              </Label>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <Input
                type="number"
                placeholder="Kedaluwarsa (menit)"
                value={form.expires_minutes}
                onChange={e => setForm(f => ({ ...f, expires_minutes: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            onClick={sendBroadcast}
            disabled={!form.body.trim() || sending || !depId}
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? "Mengirim..." : "Kirim Transmisi"}
          </Button>
        </CardContent>
      </Card>

      {/* Histori Broadcast */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <RefreshCcw className="h-4 w-4 text-slate-400" />
          Histori Transmisi ({broadcasts.length})
        </h2>

        {isLoading && <Skeleton className="h-32 w-full rounded-xl" />}

        {!isLoading && broadcasts.length === 0 && (
          <div className="text-center text-slate-400 py-10 text-sm">
            Belum ada transmisi. Kirim pesan pertama ke rombongan.
          </div>
        )}

        <div className="space-y-3">
          {broadcasts.map((b: any) => {
            const cfg = getMsgCfg(b.message_type);
            return (
              <div key={b.id} className={`p-4 rounded-xl border ${cfg.color} transition-all`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-xs border-0 ${cfg.badge}`}>{cfg.label}</Badge>
                    {b.is_pinned && <Badge variant="outline" className="text-xs gap-1"><Pin className="h-2.5 w-2.5" />Pin</Badge>}
                    {b.expires_at && <Badge variant="outline" className="text-xs gap-1 text-slate-500"><Clock className="h-2.5 w-2.5" />Kedaluwarsa</Badge>}
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {formatDistanceToNow(parseISO(b.created_at), { addSuffix: true, locale: idLocale })}
                  </span>
                </div>
                {b.title && <p className="text-sm font-semibold mb-1">{b.title}</p>}
                <p className="text-sm">{b.body}</p>
                <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                  <CheckCheck className="h-3.5 w-3.5" />
                  {b.read_count || 0} jamaah sudah membaca
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
