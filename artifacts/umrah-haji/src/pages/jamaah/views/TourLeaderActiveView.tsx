import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, AlertTriangle, Megaphone, Calendar, ChevronRight,
  CheckCircle2, Radio, Map, Send, X, BookOpen, Loader2, Clock, History,
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
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const MAKKAH = { lat: 21.3891, lng: 39.8579 };

interface Props { ctx: PortalContext }

// ── S19-04: Broadcast form component ──────────────────────────────────────
function BroadcastForm({
  departureId,
  onClose,
}: {
  departureId: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");

  const broadcast = useMutation({
    mutationFn: async (msg: string) => {
      // 1. Get all customer_ids in this departure
      const { data: bookings, error: bErr } = await (supabase as any)
        .from("bookings")
        .select("customer_id, customers(id, user_id)")
        .eq("departure_id", departureId)
        .eq("booking_status", "confirmed");
      if (bErr) throw bErr;

      if (!bookings?.length) throw new Error("Tidak ada jamaah aktif");

      // 2. Insert customer_notifications for each jamaah
      const notifs = bookings
        .filter((b: any) => b.customers?.id)
        .map((b: any) => ({
          customer_id: b.customers.id,
          title: "📢 Pengumuman Tour Leader",
          message: msg,
          type: "announcement",
          is_read: false,
          created_at: new Date().toISOString(),
        }));

      const { error: nErr } = await (supabase as any)
        .from("customer_notifications")
        .insert(notifs);
      if (nErr) throw nErr;

      return notifs.length;
    },
    onSuccess: (count) => {
      toast.success(`✅ Pesan terkirim ke ${count} jamaah`);
      setMessage("");
      onClose();
      queryClient.invalidateQueries({ queryKey: ["broadcast-history", departureId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal mengirim broadcast");
    },
  });

  return (
    <div className="rounded-2xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-violet-600" />
          <p className="font-semibold text-sm">Kirim Pengumuman</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Tulis pesan untuk seluruh jamaah... (cth: 'Mohon berkumpul di lobby jam 08.00 untuk persiapan tawaf')"
        className="w-full rounded-xl border bg-muted/40 px-3 py-2.5 text-sm resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-violet-500/50"
        maxLength={500}
      />

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{message.length}/500 karakter</span>
        <button
          onClick={() => message.trim() && broadcast.mutate(message.trim())}
          disabled={!message.trim() || broadcast.isPending}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-violet-700 transition-colors active:scale-95"
        >
          {broadcast.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Kirim ke Semua Jamaah
        </button>
      </div>
    </div>
  );
}

// ── Broadcast History Log — last 5 unique announcements ───────────────────
function BroadcastHistoryLog({ departureId }: { departureId: string }) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["broadcast-history", departureId],
    queryFn: async () => {
      // Fetch recent announcements for any jamaah in this departure
      const { data: bookings } = await (supabase as any)
        .from("bookings")
        .select("customer_id")
        .eq("departure_id", departureId)
        .eq("booking_status", "confirmed")
        .limit(200);

      if (!bookings?.length) return [];

      const customerIds = bookings.map((b: any) => b.customer_id).filter(Boolean);

      const { data: notifs } = await (supabase as any)
        .from("customer_notifications")
        .select("id, message, created_at")
        .in("customer_id", customerIds)
        .eq("type", "announcement")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!notifs?.length) return [];

      // Deduplicate: same message sent to multiple jamaah at ~same time
      // Keep first occurrence of each unique (message + minute bucket)
      const seen = new Set<string>();
      const unique: Array<{ id: string; message: string; created_at: string }> = [];
      for (const n of notifs) {
        const minute = n.created_at?.slice(0, 16); // "2025-01-15T08:30"
        const key = `${minute}::${n.message}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(n);
          if (unique.length === 5) break;
        }
      }
      return unique;
    },
    staleTime: 30_000,
    enabled: !!departureId,
  });

  if (isLoading) return null;
  if (!history.length) return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Riwayat Broadcast
        </p>
      </div>
      <p className="text-xs text-muted-foreground text-center py-3">
        Belum ada pengumuman yang dikirim.
      </p>
    </div>
  );

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-violet-600" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Riwayat Broadcast
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground">{history.length} terakhir</span>
      </div>
      <div className="space-y-2.5">
        {history.map((item, idx) => (
          <div
            key={item.id}
            className={`flex gap-3 p-3 rounded-xl ${
              idx === 0
                ? "bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-800/50"
                : "bg-muted/40"
            }`}
          >
            <div className="mt-0.5 shrink-0">
              <div className={`w-2 h-2 rounded-full ${idx === 0 ? "bg-violet-500" : "bg-muted-foreground/40"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] leading-relaxed text-foreground line-clamp-2">
                {item.message}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(item.created_at), "d MMM, HH:mm", { locale: id })}
                </p>
                {idx === 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/50 text-[9px] font-semibold text-violet-700 dark:text-violet-300">
                    Terbaru
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── S19-05: Contextual ibadah guide based on today's itinerary ────────────
function ContextualGuideCard({ guideKey }: { guideKey: string }) {
  const { data: guide } = useQuery({
    queryKey: ["ibadah-guide", guideKey],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("ibadah_guides")
        .select("id, guide_key, title, translation, steps")
        .eq("guide_key", guideKey)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    staleTime: 30 * 60 * 1000,
  });

  if (!guide) return null;

  return (
    <div className="rounded-2xl border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 p-4">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="h-4 w-4 text-emerald-600" />
        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
          Panduan: {guide.title}
        </p>
      </div>
      <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-3">
        {guide.translation}
      </p>
      <Link
        to={`/jamaah/panduan-ibadah?guide=${guideKey}`}
        className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5"
      >
        Lihat panduan lengkap <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

export function TourLeaderActiveView({ ctx }: Props) {
  const dep = ctx.activeDeparture!;
  const queryClient = useQueryClient();
  const [showBroadcastForm, setShowBroadcastForm] = useState(false);

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

  // ── Realtime SOS subscribe (S19-03 equivalent for TL) ─────────────────
  useEffect(() => {
    if (!dep?.id) return;
    const channel = (supabase as any)
      .channel(`sos-tl-${dep.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "sos_alerts",
        filter: `departure_id=eq.${dep.id}`,
      }, (payload: any) => {
        queryClient.invalidateQueries({ queryKey: ["sos-alerts-tl", dep.id] });
        toast.error("🆘 SOS Baru! Jamaah butuh bantuan segera.", {
          duration: 10000,
          action: { label: "Lihat", onClick: () => window.location.href = "/jamaah/sos-status" },
        });
      })
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [dep?.id, queryClient]);

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

  // ── S19-05: Find contextual guide key from today's itinerary ───────────
  const contextualGuideKey = itinerary.find((i: any) => i.guide_key)?.guide_key ?? null;

  const hasSOS = sosAlerts.length > 0;

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
        {/* SOS Banner — realtime */}
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
            { action: "broadcast",        icon: Megaphone,     label: "Broadcast",  color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/40" },
            { to: "/jamaah/sos-status",   icon: AlertTriangle, label: "SOS",        color: "text-red-600",    bg: "bg-red-50 dark:bg-red-950/40"       },
            { to: "/jamaah/transmisi",    icon: CheckCircle2,  label: "Absensi",    color: "text-green-600",  bg: "bg-green-50 dark:bg-green-950/40"   },
            { to: "/jamaah/itinerary",    icon: Calendar,      label: "Itinerary",  color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-950/40"   },
            { to: "/jamaah/peta-lokasi",  icon: Map,           label: "Peta",       color: "text-teal-600",   bg: "bg-teal-50 dark:bg-teal-950/40"     },
          ].map((item: any) => {
            if (item.action === "broadcast") {
              return (
                <button
                  key="broadcast"
                  onClick={() => setShowBroadcastForm(v => !v)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all active:scale-95",
                    showBroadcastForm
                      ? "bg-violet-600 text-white ring-2 ring-violet-400"
                      : "bg-violet-50 dark:bg-violet-950/40",
                  )}
                >
                  <item.icon className={cn("h-5 w-5", showBroadcastForm ? "text-white" : "text-violet-600")} />
                  <p className={cn("text-[11px] font-semibold", showBroadcastForm ? "text-white" : "text-violet-600")}>
                    Broadcast
                  </p>
                </button>
              );
            }
            return (
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
            );
          })}
        </div>

        {/* S19-04: Broadcast form (inline, toggle) */}
        {showBroadcastForm && dep?.id && (
          <BroadcastForm
            departureId={dep.id}
            onClose={() => setShowBroadcastForm(false)}
          />
        )}

        {/* Broadcast history log — last 5 unique announcements */}
        {dep?.id && <BroadcastHistoryLog departureId={dep.id} />}

        {/* Today's itinerary */}
        <TodayItineraryCard items={itinerary} dayNumber={dep.dayNumber} isLoading={itinLoading} />

        {/* S19-05: Contextual ibadah guide from itinerary guide_key */}
        {contextualGuideKey && <ContextualGuideCard guideKey={contextualGuideKey} />}

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
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Detail Keberangkatan
          </p>
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
