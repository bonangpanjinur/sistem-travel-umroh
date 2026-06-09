import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  CalendarDays, Clock, CheckCircle2, Play, AlertTriangle,
  ChevronLeft, MapPin, RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Button } from "@/components/ui/button";

const supabase: any = supabaseRaw;

type LiveStatus = "pending" | "ongoing" | "done" | "delayed";

const STATUS_CONFIG: Record<LiveStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:  { label: "Akan Datang", color: "text-slate-500",   bg: "bg-slate-100",   icon: <Clock className="w-3.5 h-3.5" /> },
  ongoing:  { label: "Sedang",      color: "text-blue-700",    bg: "bg-blue-100",    icon: <Play className="w-3.5 h-3.5" /> },
  done:     { label: "Selesai",     color: "text-emerald-700", bg: "bg-emerald-100", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  delayed:  { label: "Ditunda",     color: "text-amber-700",   bg: "bg-amber-100",   icon: <AlertTriangle className="w-3.5 h-3.5" /> },
};

interface ProgramItem {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  event_time?: string;
  location?: string;
  type: string;
  sort_order: number;
  live_status: LiveStatus;
  delay_minutes: number;
  live_notes?: string;
  location_changed_to?: string;
}

export default function JamaahProgramLive() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: booking } = useQuery({
    queryKey: ["jamaah-departure", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("departure_id, departure:departures(id, departure_date, return_date, package:packages(name), tour_leader_user_id)")
        .eq("customer_id", user!.id)
        .in("status", ["confirmed", "active"])
        .order("created_at", { ascending: false })
        .limit(1).single();
      return data;
    },
  });

  const depId = booking?.departure_id;

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["jamaah-program-live", depId, today],
    enabled: !!depId,
    refetchInterval: 30000,
    queryFn: async () => {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(`/api/v1/guide/program/${depId}?date=${today}`, {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      return res.json();
    },
  });

  const program: ProgramItem[] = data?.program || [];
  const todayItems = program.filter(i => i.event_date === today);
  const tomorrowItems = program.filter(i => i.event_date !== today);

  const ongoingItem = todayItems.find(i => i.live_status === "ongoing");

  if (!depId && !isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-sm text-center p-8">
          <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Belum ada booking aktif untuk melihat program.</p>
          <Link to="/jamaah-info" className="text-emerald-600 text-sm mt-3 block">
            Kembali ke Portal Jamaah
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/jamaah-info" className="text-slate-500 hover:text-slate-700">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-semibold text-slate-800">Program Harian</h1>
              <p className="text-xs text-slate-500">{booking?.departure?.package?.name}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 w-8 p-0 text-slate-400"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-5">
        {/* Sedang berlangsung highlight */}
        {ongoingItem && (
          <Card className="border-blue-300 bg-gradient-to-r from-blue-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Sedang Berlangsung</span>
              </div>
              <p className="font-bold text-slate-800 text-lg">{ongoingItem.title}</p>
              {ongoingItem.location && (
                <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {ongoingItem.location_changed_to || ongoingItem.location}
                </p>
              )}
              {ongoingItem.live_notes && (
                <div className="mt-2 bg-blue-100 text-blue-800 text-xs px-3 py-2 rounded-lg">
                  {ongoingItem.live_notes}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}
          </div>
        ) : program.length === 0 ? (
          <Card className="text-center p-8">
            <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Belum ada program untuk hari ini.</p>
          </Card>
        ) : (
          <>
            {todayItems.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Hari Ini — {format(new Date(today + "T00:00:00"), "EEEE, d MMMM", { locale: idLocale })}
                </h2>
                <div className="space-y-2">
                  {todayItems.map((item, idx) => (
                    <ProgramRow key={item.id} item={item} isLast={idx === todayItems.length - 1} />
                  ))}
                </div>
              </section>
            )}
            {tomorrowItems.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 mt-4">Besok</h2>
                <div className="space-y-2">
                  {tomorrowItems.map((item, idx) => (
                    <ProgramRow key={item.id} item={item} isLast={idx === tomorrowItems.length - 1} dim />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <p className="text-center text-xs text-slate-400">
          Diperbarui otomatis setiap 30 detik oleh tour leader
        </p>
      </div>
    </div>
  );
}

function ProgramRow({ item, isLast, dim }: { item: ProgramItem; isLast: boolean; dim?: boolean }) {
  const status = STATUS_CONFIG[item.live_status] || STATUS_CONFIG.pending;
  const hasChange = item.delay_minutes > 0 || item.live_notes || item.location_changed_to;

  return (
    <div className={`relative flex gap-3 ${dim ? "opacity-60" : ""}`}>
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${status.bg} ${status.color}`}>
          {status.icon}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-slate-200 my-1 min-h-[16px]" />}
      </div>

      {/* Content */}
      <div className={`flex-1 pb-4 ${item.live_status === "ongoing" ? "bg-blue-50 border border-blue-200 rounded-xl p-3 -mt-1" : ""}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {item.event_time && (
                <span className="text-xs font-mono text-slate-500">{item.event_time}</span>
              )}
              <Badge className={`text-xs px-2 py-0 h-5 ${status.bg} ${status.color} border-0`}>
                {status.label}
              </Badge>
              {item.delay_minutes > 0 && (
                <span className="text-xs text-amber-600 font-medium">+{item.delay_minutes} mnt</span>
              )}
            </div>
            <p className={`font-semibold mt-0.5 ${item.live_status === "done" ? "line-through text-slate-400" : "text-slate-800"}`}>
              {item.title}
            </p>
            {item.location && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />
                {item.location_changed_to ? (
                  <><span className="line-through text-slate-400">{item.location}</span><span className="text-amber-600">{item.location_changed_to}</span></>
                ) : item.location}
              </p>
            )}
            {item.live_notes && (
              <div className="mt-1.5 text-xs text-slate-600 bg-yellow-50 border border-yellow-100 px-2 py-1.5 rounded-lg">
                📢 {item.live_notes}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
