import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  Megaphone, Send, ChevronLeft, Pin, Clock, CheckCheck, Loader2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const supabase: any = supabaseRaw;

const MSG_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  info:           { label: "Info",           color: "text-blue-700",    bg: "bg-blue-50 border-blue-200",    emoji: "ℹ️" },
  warning:        { label: "Perhatian",      color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",  emoji: "⚠️" },
  emergency:      { label: "Darurat",        color: "text-red-700",     bg: "bg-red-50 border-red-200",      emoji: "🚨" },
  program_update: { label: "Update Program", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", emoji: "📋" },
};

interface Broadcast {
  id: string;
  title?: string;
  body: string;
  message_type: string;
  sender_name?: string;
  is_pinned: boolean;
  read_count: number;
  created_at: string;
}

export default function MuthawifBroadcast() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [msgType, setMsgType] = useState("info");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isPinned, setIsPinned] = useState(false);

  const { data: muthawifData } = useQuery({
    queryKey: ["muthawif-departure", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select("id, departure_date, package:packages(name)")
        .eq("muthawif_user_id", user!.id)
        .in("status", ["active", "departed", "open"])
        .order("departure_date", { ascending: false })
        .limit(1).single();
      return data;
    },
  });

  const depId = muthawifData?.id;

  const { data: broadcastData, isLoading } = useQuery({
    queryKey: ["muthawif-broadcasts", depId],
    enabled: !!depId,
    refetchInterval: 30000,
    queryFn: async () => {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(`/api/v1/guide/broadcasts/${depId}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      return res.json();
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!body.trim()) throw new Error("Pesan tidak boleh kosong");
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch("/api/v1/guide/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          departure_id: depId,
          sender_role: "muthawif",
          message_type: msgType,
          title: title.trim() || undefined,
          body: body.trim(),
          is_pinned: isPinned,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Gagal kirim");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["muthawif-broadcasts", depId] });
      setBody("");
      setTitle("");
      setIsPinned(false);
      toast.success("Transmisi berhasil dikirim");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const broadcasts: Broadcast[] = broadcastData?.broadcasts || [];

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/muthawif/dashboard" className="text-slate-500 hover:text-slate-700">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-semibold text-slate-800">Transmisi Muthawif</h1>
            <p className="text-xs text-slate-500">{muthawifData?.package?.name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Compose */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-emerald-600" />Kirim Transmisi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Tipe Pesan</label>
                <Select value={msgType} onValueChange={setMsgType}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MSG_TYPE_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setIsPinned(!isPinned)}
                  className={`w-full h-9 rounded-md border text-sm font-medium flex items-center justify-center gap-2 transition-all ${isPinned ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-white border-slate-200 text-slate-500"}`}
                >
                  <Pin className="w-4 h-4" />{isPinned ? "Disematkan" : "Sematkan?"}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Judul (opsional)</label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Judul singkat pesan..."
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Isi Pesan *</label>
              <Textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Tulis pesan untuk jamaah rombongan Anda..."
                className="min-h-[80px] text-sm"
              />
            </div>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending || !body.trim() || !depId}
            >
              {sendMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Kirim ke Jamaah
            </Button>
          </CardContent>
        </Card>

        {/* Broadcast history */}
        <div>
          <h2 className="text-sm font-semibold text-slate-600 mb-3">Riwayat Transmisi Hari Ini</h2>
          {isLoading ? (
            <div className="space-y-2">
              {[1,2].map(i => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}
            </div>
          ) : broadcasts.length === 0 ? (
            <Card className="text-center p-6">
              <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Belum ada transmisi.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {broadcasts.map(b => {
                const cfg = MSG_TYPE_CONFIG[b.message_type] || MSG_TYPE_CONFIG.info;
                return (
                  <Card key={b.id} className={`border ${cfg.bg}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs">{cfg.emoji}</span>
                            <Badge className={`text-xs px-2 py-0 h-5 ${cfg.bg} ${cfg.color} border-0`}>{cfg.label}</Badge>
                            {b.is_pinned && <Pin className="w-3 h-3 text-amber-500" />}
                          </div>
                          {b.title && <p className="text-sm font-semibold text-slate-800">{b.title}</p>}
                          <p className="text-sm text-slate-700 mt-0.5">{b.body}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(new Date(b.created_at), { addSuffix: true, locale: idLocale })}
                            </span>
                            <span className="flex items-center gap-1">
                              <CheckCheck className="w-3 h-3" />{b.read_count} dibaca
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
