import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, AlertTriangle, Megaphone, Calendar, ChevronRight,
  CheckCircle2, Radio, Map, Send, X, BookOpen, Loader2, Clock, History,
  ClipboardList, UserCheck, XCircle, ChevronDown, Plus, ArrowRight,
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

async function getToken(): Promise<string> {
  return (await supabase.auth.getSession()).data.session?.access_token ?? "";
}

const SESSION_TYPES = [
  { value: "bus_boarding",  emoji: "🚌", label: "Naik Bus"          },
  { value: "sholat",        emoji: "🕌", label: "Sholat Berjamaah"  },
  { value: "ziarah",        emoji: "🕋", label: "Ziarah"            },
  { value: "makan",         emoji: "🍽️", label: "Makan Bersama"    },
  { value: "hotel_checkin", emoji: "🏨", label: "Check-in Hotel"    },
  { value: "airport",       emoji: "✈️", label: "Bandara"           },
  { value: "briefing",      emoji: "📋", label: "Briefing"          },
  { value: "custom",        emoji: "📌", label: "Lainnya"           },
];

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
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");

  const broadcast = useMutation({
    mutationFn: (msg: string) => sendBroadcast(departureId, msg),
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

// ── Shared broadcast sender — used by BroadcastForm and resend ────────────
async function sendBroadcast(departureId: string, msg: string): Promise<number> {
  const { data: bookings, error: bErr } = await (supabase as any)
    .from("bookings")
    .select("customer_id, customers(id)")
    .eq("departure_id", departureId)
    .eq("booking_status", "confirmed");
  if (bErr) throw bErr;
  if (!bookings?.length) throw new Error("Tidak ada jamaah aktif");

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
}

// ── Broadcast History Log — last 5 unique announcements ───────────────────
function BroadcastHistoryLog({ departureId }: { departureId: string }) {
  const queryClient = useQueryClient();
  const [resendingId, setResendingId] = useState<string | null>(null);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["broadcast-history", departureId],
    queryFn: async () => {
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

      const seen = new Set<string>();
      const unique: Array<{ id: string; message: string; created_at: string }> = [];
      for (const n of notifs) {
        const minute = n.created_at?.slice(0, 16);
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

  const resend = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) => {
      setResendingId(id);
      return sendBroadcast(departureId, message);
    },
    onSuccess: (count) => {
      toast.success(`✅ Pesan dikirim ulang ke ${count} jamaah`);
      queryClient.invalidateQueries({ queryKey: ["broadcast-history", departureId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal mengirim ulang");
    },
    onSettled: () => setResendingId(null),
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
              <div className={`w-2 h-2 rounded-full mt-1.5 ${idx === 0 ? "bg-violet-500" : "bg-muted-foreground/40"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] leading-relaxed text-foreground line-clamp-2">
                {item.message}
              </p>
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(item.created_at), "d MMM, HH:mm", { locale: id })}
                </p>
                {idx === 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/50 text-[9px] font-semibold text-violet-700 dark:text-violet-300">
                    Terbaru
                  </span>
                )}
              </div>
            </div>
            {/* Resend button */}
            <button
              onClick={() => resend.mutate({ id: item.id, message: item.message })}
              disabled={resend.isPending}
              title="Kirim ulang ke semua jamaah"
              className={cn(
                "shrink-0 self-center flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all active:scale-95",
                resendingId === item.id
                  ? "bg-violet-200 dark:bg-violet-800 text-violet-700 dark:text-violet-300 cursor-wait"
                  : "bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800",
              )}
            >
              {resendingId === item.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
              {resendingId === item.id ? "" : "Kirim"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Attendance Panel — inline check-in / session management ───────────────
function AttendancePanel({
  departureId,
  onClose,
}: {
  departureId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [view, setView] = useState<"sessions" | "attendees">("sessions");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSessionTitle, setActiveSessionTitle] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sessionType, setSessionType] = useState("bus_boarding");
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionLocation, setSessionLocation] = useState("");
  const [markingId, setMarkingId] = useState<string | null>(null);

  // ── Today's sessions ───────────────────────────────────────────────────
  const { data: sessions = [], isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ["tl-panel-sessions", departureId],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/v1/guide/sessions/${departureId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return (json.sessions ?? []).filter((s: any) => {
        return new Date(s.created_at).toDateString() === new Date().toDateString();
      });
    },
    enabled: !!departureId,
    refetchInterval: 15_000,
  });

  // ── Attendee list for selected session ────────────────────────────────
  const { data: attendees = [], isLoading: attendeesLoading, refetch: refetchAttendees } = useQuery({
    queryKey: ["tl-panel-attendance", activeSessionId],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/v1/guide/sessions/${activeSessionId}/attendance`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json.attendance ?? [];
    },
    enabled: !!activeSessionId,
    refetchInterval: 8_000,
  });

  // ── Create a session ──────────────────────────────────────────────────
  const handleCreate = async () => {
    const title = sessionTitle.trim() ||
      (SESSION_TYPES.find(t => t.value === sessionType)?.label ?? "Sesi Baru");
    setCreating(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/v1/guide/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ departure_id: departureId, session_type: sessionType, title, location: sessionLocation }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Sesi "${title}" dibuat`);
      setShowCreate(false);
      setSessionTitle("");
      setSessionLocation("");
      refetchSessions();
      // Go straight to attendee list
      setActiveSessionId(data.session.id);
      setActiveSessionTitle(title);
      setView("attendees");
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat sesi");
    } finally {
      setCreating(false);
    }
  };

  // ── Mark attendance ───────────────────────────────────────────────────
  const markAttendance = async (customerId: string, status: "present" | "late" | "absent") => {
    if (!activeSessionId) return;
    setMarkingId(customerId);
    try {
      const token = await getToken();
      await fetch(`/api/v1/guide/sessions/${activeSessionId}/attendance/${customerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      qc.invalidateQueries({ queryKey: ["tl-panel-attendance", activeSessionId] });
    } catch {
      toast.error("Gagal update kehadiran");
    } finally {
      setMarkingId(null);
    }
  };

  // ── counts ────────────────────────────────────────────────────────────
  const present = attendees.filter((a: any) => a.status === "present").length;
  const late    = attendees.filter((a: any) => a.status === "late").length;
  const absent  = attendees.filter((a: any) => a.status === "absent").length;
  const unmarked = attendees.filter((a: any) => !a.status).length;

  const selectedType = SESSION_TYPES.find(t => t.value === sessionType)!;

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 bg-green-600 text-white">
        <div className="flex items-center gap-2">
          {view === "attendees" ? (
            <button onClick={() => setView("sessions")} className="p-1 -ml-1 rounded-lg hover:bg-white/20">
              <ChevronDown className="h-4 w-4 rotate-90" />
            </button>
          ) : (
            <ClipboardList className="h-4 w-4" />
          )}
          <p className="font-semibold text-sm">
            {view === "sessions" ? "Absensi Sesi" : activeSessionTitle}
          </p>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── SESSIONS VIEW ──────────────────────────────────────────────── */}
      {view === "sessions" && (
        <div className="p-4 space-y-3">
          {/* Quick session type selector */}
          {showCreate ? (
            <div className="space-y-2.5 border rounded-xl p-3 bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Sesi Baru</p>
              {/* Type chips */}
              <div className="flex flex-wrap gap-1.5">
                {SESSION_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setSessionType(t.value)}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors",
                      sessionType === t.value
                        ? "bg-green-600 text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                  >
                    <span>{t.emoji}</span> {t.label}
                  </button>
                ))}
              </div>
              {/* Custom title (optional) */}
              <input
                type="text"
                placeholder={`Nama sesi (opsional, default: ${selectedType.label})`}
                value={sessionTitle}
                onChange={e => setSessionTitle(e.target.value)}
                className="w-full rounded-xl border bg-background px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-green-500/40"
              />
              <input
                type="text"
                placeholder="Lokasi (opsional, cth: Bus 1, Masjidil Haram)"
                value={sessionLocation}
                onChange={e => setSessionLocation(e.target.value)}
                className="w-full rounded-xl border bg-background px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-green-500/40"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2 rounded-xl border text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 py-2 rounded-xl bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  {creating ? "Membuat..." : "Buat & Mulai"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 text-xs font-semibold hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Buat Sesi Baru
            </button>
          )}

          {/* Today's session list */}
          {sessionsLoading && (
            <div className="text-center py-4 text-xs text-muted-foreground">Memuat sesi...</div>
          )}
          {!sessionsLoading && sessions.length === 0 && !showCreate && (
            <p className="text-xs text-muted-foreground text-center py-2">Belum ada sesi hari ini.</p>
          )}
          <div className="space-y-2">
            {sessions.map((s: any) => (
              <button
                key={s.id}
                onClick={() => {
                  setActiveSessionId(s.id);
                  setActiveSessionTitle(s.title);
                  setView("attendees");
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border bg-muted/30 hover:bg-muted/60 text-left transition-colors"
              >
                <span className="text-lg">{SESSION_TYPES.find(t => t.value === s.session_type)?.emoji ?? "📌"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold truncate">{s.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {s.location ? `${s.location} · ` : ""}
                    {s.present_count ?? 0}/{s.total_count ?? "?"} hadir
                    {s.ended_at ? " · Selesai" : " · Aktif"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {!s.ended_at && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>

          {/* Link to full page */}
          <Link
            to="/tour-leader/attendance"
            className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-green-700 dark:text-green-400 font-semibold hover:underline"
          >
            Buka halaman absensi lengkap <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* ── ATTENDEES VIEW ─────────────────────────────────────────────── */}
      {view === "attendees" && activeSessionId && (
        <div className="p-4 space-y-3">
          {/* Summary bar */}
          <div className="flex gap-2">
            {[
              { label: "Hadir",     count: present,  color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"  },
              { label: "Terlambat", count: late,     color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"  },
              { label: "Absen",     count: absent,   color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"          },
              { label: "Belum",     count: unmarked, color: "bg-muted/60 text-muted-foreground"                                     },
            ].map(s => (
              <div key={s.label} className={`flex-1 text-center py-1.5 rounded-xl ${s.color}`}>
                <p className="text-base font-bold leading-none">{s.count}</p>
                <p className="text-[9px] font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Attendee list */}
          {attendeesLoading && (
            <div className="text-center py-4 text-xs text-muted-foreground">Memuat daftar jamaah...</div>
          )}
          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-0.5">
            {attendees.map((a: any) => {
              const isMarking = markingId === a.customer_id;
              return (
                <div
                  key={a.customer_id ?? a.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
                    a.status === "present" ? "bg-green-50 dark:bg-green-950/20"
                    : a.status === "late"  ? "bg-amber-50 dark:bg-amber-950/20"
                    : a.status === "absent"? "bg-red-50 dark:bg-red-950/20"
                    : "bg-muted/30",
                  )}
                >
                  {/* Status dot */}
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full shrink-0",
                    a.status === "present" ? "bg-green-500"
                    : a.status === "late"  ? "bg-amber-500"
                    : a.status === "absent"? "bg-red-500"
                    : "bg-muted-foreground/30",
                  )} />
                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold truncate">{a.customer_name || "Jamaah"}</p>
                    {a.customer_phone && (
                      <p className="text-[10px] text-muted-foreground">{a.customer_phone}</p>
                    )}
                  </div>
                  {/* Action buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isMarking ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <button
                          onClick={() => markAttendance(a.customer_id, "present")}
                          title="Hadir"
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            a.status === "present"
                              ? "bg-green-500 text-white"
                              : "hover:bg-green-100 dark:hover:bg-green-900/40 text-muted-foreground hover:text-green-600",
                          )}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => markAttendance(a.customer_id, "late")}
                          title="Terlambat"
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            a.status === "late"
                              ? "bg-amber-500 text-white"
                              : "hover:bg-amber-100 dark:hover:bg-amber-900/40 text-muted-foreground hover:text-amber-600",
                          )}
                        >
                          <Clock className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => markAttendance(a.customer_id, "absent")}
                          title="Absen"
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            a.status === "absent"
                              ? "bg-red-500 text-white"
                              : "hover:bg-red-100 dark:hover:bg-red-900/40 text-muted-foreground hover:text-red-500",
                          )}
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {attendees.length === 0 && !attendeesLoading && (
            <p className="text-xs text-muted-foreground text-center py-3">
              Daftar jamaah belum tersedia. Jamaah akan muncul setelah mereka scan QR atau TL menambahkan manual.
            </p>
          )}

          {/* Refresh + full page */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => refetchAttendees()}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <UserCheck className="h-3 w-3" /> Refresh daftar
            </button>
            <Link
              to="/tour-leader/attendance"
              className="text-[11px] text-green-700 dark:text-green-400 font-semibold flex items-center gap-1 hover:underline"
            >
              Halaman lengkap <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
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
  const [showAttendancePanel, setShowAttendancePanel] = useState(false);

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
            { to: "/jamaah/rombongan",   icon: Users,         label: "Jamaah",    color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-950/40"     },
            { action: "broadcast",       icon: Megaphone,     label: "Broadcast", color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/40" },
            { to: "/jamaah/sos-status",  icon: AlertTriangle, label: "SOS",       color: "text-red-600",    bg: "bg-red-50 dark:bg-red-950/40"       },
            { action: "attendance",      icon: ClipboardList, label: "Absensi",   color: "text-green-600",  bg: "bg-green-50 dark:bg-green-950/40"   },
            { to: "/jamaah/itinerary",   icon: Calendar,      label: "Itinerary", color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-950/40"   },
            { to: "/jamaah/peta-lokasi", icon: Map,           label: "Peta",      color: "text-teal-600",   bg: "bg-teal-50 dark:bg-teal-950/40"     },
          ].map((item: any) => {
            if (item.action === "broadcast") {
              return (
                <button
                  key="broadcast"
                  onClick={() => { setShowBroadcastForm(v => !v); setShowAttendancePanel(false); }}
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
            if (item.action === "attendance") {
              return (
                <button
                  key="attendance"
                  onClick={() => { setShowAttendancePanel(v => !v); setShowBroadcastForm(false); }}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all active:scale-95",
                    showAttendancePanel
                      ? "bg-green-600 text-white ring-2 ring-green-400"
                      : "bg-green-50 dark:bg-green-950/40",
                  )}
                >
                  <item.icon className={cn("h-5 w-5", showAttendancePanel ? "text-white" : "text-green-600")} />
                  <p className={cn("text-[11px] font-semibold", showAttendancePanel ? "text-white" : "text-green-600")}>
                    Absensi
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

        {/* Attendance panel (inline, toggle) */}
        {showAttendancePanel && dep?.id && (
          <AttendancePanel
            departureId={dep.id}
            onClose={() => setShowAttendancePanel(false)}
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
