import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Users, AlertTriangle, Megaphone, Calendar, ChevronRight,
  CheckCircle2, Radio, Map,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { JamaahAppShell } from "@/components/jamaah/shell/JamaahAppShell";
import { SholatCountdownWidget } from "@/components/jamaah/SholatCountdownWidget";
import { TodayItineraryCard } from "@/components/jamaah/trip/TodayItineraryCard";
import { useTodayItinerary } from "@/hooks/useTodayItinerary";
import type { PortalContext } from "@/hooks/usePortalContext";
import { cn } from "@/lib/utils";

const MAKKAH = { lat: 21.3891, lng: 39.8579 };

interface Props { ctx: PortalContext }

export function TourLeaderActiveView({ ctx }: Props) {
  const dep = ctx.activeDeparture!;

  const { data: itinerary = [], isLoading: itinLoading } = useTodayItinerary(
    dep?.id, dep?.departure_date,
  );

  const { data: sosAlerts = [] } = useQuery({
    queryKey: ["sos-alerts-tl", dep?.id],
    queryFn: async () => {
      if (!dep?.id) return [];
      const { data } = await (supabase as any)
        .from("sos_alerts")
        .select("id, message, created_at, customers(full_name)")
        .eq("departure_id", dep.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!dep?.id,
    refetchInterval: 10000,
  });

  const { data: subgroups = [] } = useQuery({
    queryKey: ["subgroups-tl", dep?.id],
    queryFn: async () => {
      if (!dep?.id) return [];
      const { data } = await (supabase as any)
        .from("guide_subgroups")
        .select("id, name, color")
        .eq("departure_id", dep.id)
        .order("name");
      return data ?? [];
    },
    enabled: !!dep?.id,
  });

  const hasSOS = sosAlerts.length > 0;
  const todayLabel = format(new Date(), "EEEE, d MMMM", { locale: id });

  return (
    <JamaahAppShell>
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-700 via-violet-600 to-purple-600 text-white px-4 pt-5 pb-4">
        <div className="flex items-center gap-1.5 mb-1">
          <Radio className="h-3.5 w-3.5 opacity-80" />
          <p className="text-[11px] opacity-75 uppercase tracking-wider">Tour Leader</p>
        </div>
        <p className="font-bold text-xl leading-tight">{ctx.profile?.full_name ?? "Tour Leader"}</p>
        <p className="text-[12px] opacity-80 mt-0.5">{dep.package?.name}</p>
        <div className="flex items-center gap-3 mt-2.5">
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
        {/* SOS Banner */}
        {hasSOS && (
          <Link to="/jamaah/sos-status">
            <div className="rounded-2xl bg-red-600 text-white p-4 flex items-center gap-3 animate-pulse shadow-lg shadow-red-500/30">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-sm">⚠️ {sosAlerts.length} Jamaah Butuh Bantuan!</p>
                {sosAlerts[0]?.customers?.full_name && (
                  <p className="text-xs opacity-90 mt-0.5">Terbaru: {sosAlerts[0].customers.full_name}</p>
                )}
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
            { to: "/jamaah/rombongan",    icon: Users,         label: "Jamaah",     color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-950/40"     },
            { to: "/jamaah/chat",         icon: Megaphone,     label: "Broadcast",  color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/40" },
            { to: "/jamaah/sos-status",   icon: AlertTriangle, label: "SOS",        color: "text-red-600",    bg: "bg-red-50 dark:bg-red-950/40"       },
            { to: "/jamaah/transmisi",    icon: CheckCircle2,  label: "Absensi",    color: "text-green-600",  bg: "bg-green-50 dark:bg-green-950/40"   },
            { to: "/jamaah/itinerary",    icon: Calendar,      label: "Itinerary",  color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-950/40"   },
            { to: "/jamaah/peta-lokasi",  icon: Map,           label: "Peta",       color: "text-teal-600",   bg: "bg-teal-50 dark:bg-teal-950/40"     },
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

        {/* Today's itinerary */}
        <TodayItineraryCard items={itinerary} dayNumber={dep.dayNumber} isLoading={itinLoading} />

        {/* Subgroups overview */}
        {subgroups.length > 0 && (
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm">Rombongan / Bus</p>
              <Link to="/jamaah/rombongan" className="text-[11px] text-primary flex items-center gap-0.5">
                Detail <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {subgroups.slice(0, 4).map((sg: any) => (
                <div key={sg.id} className="flex items-center gap-2 p-2 rounded-xl bg-muted/40">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: sg.color || "#6366f1" }}
                  />
                  <p className="text-sm font-medium">{sg.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Departure info */}
        <div className="rounded-2xl border bg-card p-4 space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Detail Keberangkatan</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground">Berangkat</p>
              <p className="font-semibold text-[12px]">
                {format(new Date(dep.departure_date), "d MMM yyyy", { locale: id })}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Kembali</p>
              <p className="font-semibold text-[12px]">
                {format(new Date(dep.return_date), "d MMM yyyy", { locale: id })}
              </p>
            </div>
          </div>
        </div>

        {/* Full dashboard link */}
        <Link
          to="/tour-leader/dashboard"
          className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
        >
          <span className="text-sm font-semibold">Buka Dashboard Lengkap</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </JamaahAppShell>
  );
}
