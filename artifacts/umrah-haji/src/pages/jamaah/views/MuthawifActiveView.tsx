import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users, CheckCircle, AlertTriangle, Megaphone, FileText,
  ChevronRight, Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { JamaahAppShell } from "@/components/jamaah/shell/JamaahAppShell";
import { SholatCountdownWidget } from "@/components/jamaah/SholatCountdownWidget";
import type { PortalContext } from "@/hooks/usePortalContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MAKKAH = { lat: 21.3891, lng: 39.8579 };

interface Props { ctx: PortalContext }

export function MuthawifActiveView({ ctx }: Props) {
  const dep = ctx.activeDeparture!;
  const queryClient = useQueryClient();

  // Fetch SOS alerts — polling fallback
  const { data: sosAlerts = [] } = useQuery({
    queryKey: ["sos-alerts-muthawif", dep?.id],
    queryFn: async () => {
      if (!dep?.id) return [];
      const { data } = await (supabase as any)
        .from("sos_alerts")
        .select("id, customer_id, message, created_at, status, customers(full_name, phone)")
        .eq("departure_id", dep.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!dep?.id,
    refetchInterval: 15000,
  });

  // ── S19-03: Realtime SOS subscribe ────────────────────────────────────────
  useEffect(() => {
    if (!dep?.id) return;

    const channel = (supabase as any)
      .channel(`sos-muthawif-${dep.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sos_alerts",
          filter: `departure_id=eq.${dep.id}`,
        },
        (payload: any) => {
          queryClient.invalidateQueries({ queryKey: ["sos-alerts-muthawif", dep.id] });
          toast.error(`🆘 SOS Baru! Jamaah membutuhkan bantuan segera.`, {
            duration: 10000,
            action: {
              label: "Lihat",
              onClick: () => window.location.href = "/jamaah/sos-status",
            },
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sos_alerts",
          filter: `departure_id=eq.${dep.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["sos-alerts-muthawif", dep.id] });
        },
      )
      .subscribe();

    return () => { (supabase as any).removeChannel(channel); };
  }, [dep?.id, queryClient]);

  // Fetch today's sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ["guide-sessions-today", dep?.id],
    queryFn: async () => {
      if (!dep?.id) return [];
      const today = new Date().toISOString().split("T")[0];
      const { data } = await (supabase as any)
        .from("guide_sessions")
        .select("id, session_name, session_type, start_time")
        .eq("departure_id", dep.id)
        .gte("start_time", `${today}T00:00:00`)
        .lte("start_time", `${today}T23:59:59`)
        .order("start_time");
      return data ?? [];
    },
    enabled: !!dep?.id,
    refetchInterval: 60000,
  });

  const hasSOS = sosAlerts.length > 0;
  const todayLabel = format(new Date(), "EEEE, d MMMM", { locale: id });

  return (
    <JamaahAppShell>
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-600 text-white px-4 pt-5 pb-4">
        <p className="text-[11px] opacity-75 uppercase tracking-wider">Muthawif</p>
        <p className="font-bold text-xl leading-tight">{ctx.profile?.full_name ?? "Ustadz/Ustadzah"}</p>
        <div className="flex items-center gap-3 mt-2">
          <div className="bg-white/15 rounded-lg px-3 py-1.5">
            <p className="text-[10px] opacity-75">Jamaah</p>
            <p className="font-bold text-lg leading-none">{dep.bookingCount}</p>
          </div>
          <div className="bg-white/15 rounded-lg px-3 py-1.5">
            <p className="text-[10px] opacity-75">Hari ke</p>
            <p className="font-bold text-lg leading-none">{dep.dayNumber}</p>
          </div>
          <div className="bg-white/15 rounded-lg px-3 py-1.5">
            <p className="text-[10px] opacity-75">Sisa</p>
            <p className="font-bold text-lg leading-none">{dep.daysLeft}h</p>
          </div>
          {hasSOS && (
            <div className="bg-red-500/80 rounded-lg px-3 py-1.5 animate-pulse">
              <p className="text-[10px]">SOS</p>
              <p className="font-bold text-lg leading-none">{sosAlerts.length}</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-32">
        {/* SOS Alert Banner — realtime */}
        {hasSOS && (
          <Link to="/jamaah/sos-status">
            <div className="rounded-2xl bg-red-600 text-white p-4 flex items-center gap-3 animate-pulse shadow-lg shadow-red-600/30">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-sm">⚠️ {sosAlerts.length} Jamaah Butuh Bantuan</p>
                {sosAlerts[0]?.customers?.full_name && (
                  <p className="text-xs opacity-90 mt-0.5">Terbaru: {sosAlerts[0].customers.full_name}</p>
                )}
                <p className="text-xs opacity-90 mt-0.5">Tap untuk melihat detail SOS</p>
              </div>
              <ChevronRight className="h-5 w-5" />
            </div>
          </Link>
        )}

        {/* Sholat widget */}
        <SholatCountdownWidget lat={MAKKAH.lat} lng={MAKKAH.lng} cityLabel="Makkah" compact />

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { to: "/jamaah/transmisi",          icon: CheckCircle,   label: "Absensi",   color: "text-green-600",  bg: "bg-green-50 dark:bg-green-950/40"   },
            { to: "/jamaah/rombongan",           icon: Users,         label: "Jamaah",    color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-950/40"     },
            { to: "/jamaah/sos-status",          icon: AlertTriangle, label: "SOS",       color: "text-red-600",    bg: "bg-red-50 dark:bg-red-950/40"       },
            { to: "/jamaah/broadcast-muthawif",  icon: Megaphone,     label: "Umumkan",   color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-950/40"   },
            { to: "/jamaah/laporan-harian",      icon: FileText,      label: "Laporan",   color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/40" },
            { to: "/jamaah/itinerary",           icon: Calendar,      label: "Itinerary", color: "text-teal-600",   bg: "bg-teal-50 dark:bg-teal-950/40"     },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all active:scale-95",
                item.bg,
              )}
            >
              <item.icon className={cn("h-5 w-5", item.color)} />
              <p className={cn("text-[11px] font-semibold", item.color)}>{item.label}</p>
            </Link>
          ))}
        </div>

        {/* Today's sessions */}
        {sessions.length > 0 && (
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm">Sesi Absensi Hari Ini</p>
              <p className="text-[11px] text-muted-foreground">{todayLabel}</p>
            </div>
            <div className="space-y-2">
              {sessions.map((s: any) => (
                <Link
                  key={s.id}
                  to="/jamaah/transmisi"
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 hover:bg-muted transition-colors"
                >
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{s.session_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {s.start_time ? format(new Date(s.start_time), "HH:mm") : "–"} · {s.session_type}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Departure info */}
        <div className="rounded-2xl border bg-card p-4 space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Info Keberangkatan
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-[10px] text-muted-foreground">Paket</p>
              <p className="font-semibold text-[12px] leading-tight">{dep.package?.name ?? "–"}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Berangkat</p>
              <p className="font-semibold text-[12px]">
                {dep.departure_date
                  ? format(new Date(dep.departure_date), "d MMM yyyy", { locale: id })
                  : "–"}
              </p>
            </div>
          </div>
        </div>

        {/* Link to full dashboard */}
        <Link
          to="/muthawif/dashboard"
          className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-colors"
        >
          <span className="text-sm font-semibold">Buka Dashboard Lengkap</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </JamaahAppShell>
  );
}
