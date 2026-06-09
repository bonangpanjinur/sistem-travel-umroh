import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Radio, CheckCheck, Pin, Clock, AlertTriangle, Info, Zap, CalendarClock } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const supabase: any = supabaseRaw;

const MSG_CONFIG: Record<string, { label: string; icon: any; cardCls: string; iconCls: string; badgeCls: string }> = {
  info:           { label: "Info",           icon: Info,          cardCls: "border-blue-200 bg-blue-50",    iconCls: "text-blue-600 bg-blue-100",    badgeCls: "bg-blue-100 text-blue-700" },
  warning:        { label: "Perhatian",      icon: AlertTriangle, cardCls: "border-amber-200 bg-amber-50",  iconCls: "text-amber-600 bg-amber-100",  badgeCls: "bg-amber-100 text-amber-700" },
  emergency:      { label: "DARURAT",        icon: Zap,           cardCls: "border-red-300 bg-red-50 shadow-md", iconCls: "text-red-600 bg-red-100",      badgeCls: "bg-red-100 text-red-700" },
  program_update: { label: "Update Program", icon: CalendarClock, cardCls: "border-emerald-200 bg-emerald-50", iconCls: "text-emerald-600 bg-emerald-100", badgeCls: "bg-emerald-100 text-emerald-700" },
};

async function getToken() {
  return (await supabaseRaw.auth.getSession()).data.session?.access_token || "";
}

export default function JamaahTransmisi() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Get departure for this jamaah
  const { data: booking } = useQuery({
    queryKey: ["jamaah-active-booking", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, departure_id, departure:departures(id, departure_date, package:packages(name))")
        .eq("booking_status", "confirmed")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      return data;
    },
  });

  const depId = (booking?.departure as any)?.id;

  const { data: broadcastsData, isLoading } = useQuery({
    queryKey: ["jamaah-broadcasts", depId],
    enabled: !!depId,
    refetchInterval: 15000,
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/v1/guide/broadcasts/${depId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
  });

  const broadcasts = broadcastsData?.broadcasts || [];
  const unreadCount = broadcasts.filter((b: any) => !b.is_read).length;

  const markRead = async (broadcastId: string) => {
    const token = await getToken();
    await fetch(`/api/v1/guide/broadcasts/${broadcastId}/read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    qc.invalidateQueries({ queryKey: ["jamaah-broadcasts", depId] });
  };

  const markAllRead = async () => {
    if (!depId) return;
    const token = await getToken();
    await fetch("/api/v1/guide/broadcasts/read-all", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ departure_id: depId }),
    });
    qc.invalidateQueries({ queryKey: ["jamaah-broadcasts", depId] });
    toast.success("Semua transmisi telah ditandai dibaca");
  };

  // Auto-mark emergency messages as read when viewed
  useEffect(() => {
    const emergencies = broadcasts.filter((b: any) => b.message_type === "emergency" && !b.is_read);
    emergencies.forEach((b: any) => markRead(b.id));
  }, [broadcasts.length]);

  if (!booking) return (
    <div className="p-6 text-center text-slate-500 max-w-md mx-auto mt-20">
      <Radio className="h-12 w-12 mx-auto mb-4 text-slate-300" />
      <h2 className="text-lg font-semibold text-slate-700 mb-2">Tidak Ada Rombongan Aktif</h2>
      <p className="text-sm">Transmisi hanya tersedia untuk jamaah dengan booking yang dikonfirmasi.</p>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-lg mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-xl">
            <Radio className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Transmisi Rombongan</h1>
            <p className="text-xs text-slate-400">{(booking.departure as any)?.package?.name || "Rombongan"}</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="ghost" className="text-xs text-emerald-600" onClick={markAllRead}>
            <CheckCheck className="h-3.5 w-3.5 mr-1" />
            Tandai Semua
          </Button>
        )}
      </div>

      {/* Unread badge */}
      {unreadCount > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
          <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-sm text-emerald-700 font-medium">{unreadCount} pesan baru dari pemandu</span>
        </div>
      )}

      {/* Broadcasts */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      )}

      {!isLoading && broadcasts.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Radio className="h-10 w-10 mx-auto mb-3 text-slate-200" />
          <p className="text-sm">Belum ada transmisi dari pemandu.</p>
          <p className="text-xs mt-1 text-slate-300">Halaman ini otomatis diperbarui setiap 15 detik.</p>
        </div>
      )}

      <div className="space-y-3">
        {broadcasts.map((b: any) => {
          const cfg = MSG_CONFIG[b.message_type] || MSG_CONFIG.info;
          const Icon = cfg.icon;
          return (
            <div
              key={b.id}
              className={`rounded-xl border p-4 transition-all ${cfg.cardCls} ${!b.is_read ? "ring-2 ring-offset-1 ring-emerald-400" : ""}`}
              onClick={() => !b.is_read && markRead(b.id)}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg flex-shrink-0 ${cfg.iconCls}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`text-xs border-0 ${cfg.badgeCls}`}>{cfg.label}</Badge>
                      {b.is_pinned && <Pin className="h-3 w-3 text-slate-400" />}
                      {!b.is_read && <div className="h-2 w-2 bg-emerald-500 rounded-full" />}
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0">
                      {formatDistanceToNow(parseISO(b.created_at), { addSuffix: true, locale: idLocale })}
                    </span>
                  </div>
                  {b.title && <p className="text-sm font-semibold text-slate-800 mb-1">{b.title}</p>}
                  <p className="text-sm text-slate-700 leading-relaxed">{b.body}</p>
                  <p className="text-[10px] text-slate-400 mt-2">dari {b.sender_name || "Pemandu"}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
