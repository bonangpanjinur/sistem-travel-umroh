import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users, MapPin, MessageSquare, CheckCircle2, Phone,
  CalendarDays, AlertCircle, Search, Star, RefreshCcw,
  Navigation, Heart, Shield, HelpCircle, ChevronDown,
  ChevronRight, UserCheck, XCircle, Clock, BellRing,
  CheckCheck, Siren, X, FileBarChart, Hash,
  Bell, BellOff, BellDot, UserX, AlertTriangle
} from "lucide-react";
import { format, parseISO, formatDistanceToNow, subDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useMuthawifNotifications } from "@/hooks/useMuthawifNotifications";

// ─── Constants ──────────────────────────────────────────────────────────────

const SESSION_TYPES = [
  { value: "keberangkatan", label: "Check-in Keberangkatan" },
  { value: "sholat_berjamaah", label: "Sholat Berjamaah" },
  { value: "ziarah", label: "Ziarah & City Tour" },
  { value: "bus", label: "Naik Bus" },
  { value: "makan", label: "Makan Bersama" },
  { value: "lainnya", label: "Sesi Lainnya" },
];

const EMERGENCY_TYPES: Record<string, { label: string; icon: any; color: string }> = {
  medical:  { label: "Medis",    icon: Heart,       color: "text-red-600" },
  lost:     { label: "Tersesat", icon: MapPin,       color: "text-amber-600" },
  security: { label: "Keamanan", icon: Shield,       color: "text-orange-600" },
  other:    { label: "Lainnya",  icon: HelpCircle,  color: "text-blue-600" },
};

type AttendanceStatus = "hadir" | "absen" | "terlambat" | "izin";

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; cls: string; icon: any }> = {
  hadir:     { label: "Hadir",     cls: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
  absen:     { label: "Absen",     cls: "bg-red-100 text-red-800 border-red-200",             icon: XCircle },
  terlambat: { label: "Terlambat", cls: "bg-amber-100 text-amber-800 border-amber-200",       icon: Clock },
  izin:      { label: "Izin",      cls: "bg-blue-100 text-blue-800 border-blue-200",          icon: AlertCircle },
};

const ROOM_TYPE_LABELS: Record<string, string> = {
  quad:   "Quad (4 orang)",
  triple: "Triple (3 orang)",
  double: "Double (2 orang)",
  single: "Single (1 orang)",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function groupByRoomType(passengers: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};
  for (const p of passengers) {
    const key = p.roomType || "lainnya";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  }
  return grouped;
}

// ─── GlobalSearch ─────────────────────────────────────────────────────────────

const RECENT_KEY = "muthawif_recent_searches";
const MAX_RECENT  = 5;

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

interface SearchResult {
  customerId: string;
  name: string;
  phone: string | null;
  gender: string | null;
  bookingCode: string | null;
  bookingStatus: string | null;
  packageName: string | null;
  departureDate: string | null;
  departureStatus: string | null;
}

function GlobalSearch({ muthawifId }: { muthawifId: string | undefined }) {
  const navigate = useNavigate();
  const [open, setOpen]     = useState(false);
  const [term, setTerm]     = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef            = useRef<HTMLInputElement>(null);
  const listRef             = useRef<HTMLDivElement>(null);
  const debounced           = useDebounce(term.trim(), 280);

  // Recent searches from localStorage
  const [recent, setRecent] = useState<SearchResult[]>(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); }
    catch { return []; }
  });

  const saveRecent = useCallback((item: SearchResult) => {
    setRecent(prev => {
      const next = [item, ...prev.filter(r => r.customerId !== item.customerId)].slice(0, MAX_RECENT);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setCursor(0);
      setTerm("");
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  // Supabase search query — searches across ALL departures of this muthawif
  const { data: results = [], isFetching } = useQuery<SearchResult[]>({
    queryKey: ["muthawif-global-search", muthawifId, debounced],
    enabled: !!muthawifId && debounced.length >= 2,
    staleTime: 10_000,
    queryFn: async () => {
      // First get all departure IDs for this muthawif
      const { data: deps } = await supabase
        .from("departures")
        .select("id, departure_date, status, package:packages(name)")
        .eq("muthawif_id", muthawifId);

      if (!deps?.length) return [];

      const depIds = deps.map((d: any) => d.id);
      const depMap: Record<string, any> = {};
      for (const d of deps) depMap[d.id] = d;

      // Search bookings + customer names
      const isCode = /^[A-Z0-9-]+$/.test(debounced.toUpperCase());
      let query = supabase
        .from("bookings")
        .select(`
          id, booking_code, booking_status, departure_id,
          customer:customers(id, full_name, phone, gender)
        `)
        .in("departure_id", depIds)
        .neq("booking_status", "cancelled")
        .limit(12);

      if (isCode) {
        query = query.ilike("booking_code", `%${debounced}%`);
      } else {
        // filter by customer name via join — use customer full_name
        const { data: customers } = await supabase
          .from("customers")
          .select("id")
          .ilike("full_name", `%${debounced}%`)
          .limit(20);

        if (!customers?.length) return [];
        const cIds = customers.map((c: any) => c.id);
        query = query.in("customer_id", cIds);
      }

      const { data: bookings } = await query;
      if (!bookings?.length) return [];

      return bookings.map((b: any) => {
        const dep = depMap[b.departure_id] || {};
        return {
          customerId:      b.customer?.id   || "",
          name:            b.customer?.full_name || "-",
          phone:           b.customer?.phone,
          gender:          b.customer?.gender,
          bookingCode:     b.booking_code,
          bookingStatus:   b.booking_status,
          packageName:     dep.package?.name || null,
          departureDate:   dep.departure_date || null,
          departureStatus: dep.status || null,
        } as SearchResult;
      });
    },
  });

  const displayed: SearchResult[] = debounced.length >= 2 ? results : recent;
  const showingRecent             = debounced.length < 2;

  // Arrow-key + Enter navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, displayed.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
      if (e.key === "Enter" && displayed[cursor]) {
        e.preventDefault();
        handleSelect(displayed[cursor]);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, cursor, displayed]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${cursor}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  const handleSelect = (item: SearchResult) => {
    saveRecent(item);
    setOpen(false);
    navigate(`/muthawif/jamaah/${item.customerId}`);
  };

  const statusColor = (s: string | null) => {
    if (s === "ongoing")   return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (s === "scheduled") return "bg-blue-100 text-blue-800 border-blue-200";
    if (s === "completed") return "bg-gray-100 text-gray-700 border-gray-200";
    return "bg-muted text-muted-foreground border-border";
  };

  const statusLabel = (s: string | null) => {
    if (s === "ongoing")   return "Berlangsung";
    if (s === "scheduled") return "Terjadwal";
    if (s === "completed") return "Selesai";
    return s || "-";
  };

  return (
    <>
      {/* Trigger button */}
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-2 text-xs text-muted-foreground px-2.5 hidden sm:flex"
        onClick={() => setOpen(true)}
      >
        <Search className="h-3.5 w-3.5" />
        Cari jamaah…
        <kbd className="ml-1 px-1 py-0.5 text-[10px] bg-muted border rounded font-mono">⌘K</kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 sm:hidden"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
      </Button>

      {/* Search modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden top-[10vh] translate-y-0 sm:top-[15vh]">
          {/* Input row */}
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            {isFetching
              ? <RefreshCcw className="h-4 w-4 text-muted-foreground animate-spin shrink-0" />
              : <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            }
            <input
              ref={inputRef}
              value={term}
              onChange={e => { setTerm(e.target.value); setCursor(0); }}
              placeholder="Ketik nama jamaah atau kode booking…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoComplete="off"
              spellCheck={false}
            />
            {term && (
              <button onClick={() => setTerm("")} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <kbd
              className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] bg-muted border rounded font-mono text-muted-foreground cursor-pointer"
              onClick={() => setOpen(false)}
            >
              Esc
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="overflow-y-auto max-h-[65vh]">

            {/* Section heading */}
            {displayed.length > 0 && (
              <p className="px-4 pt-3 pb-1 text-[10px] uppercase font-semibold tracking-wide text-muted-foreground">
                {showingRecent ? "Pencarian terakhir" : `${displayed.length} hasil ditemukan`}
              </p>
            )}

            {/* No results */}
            {debounced.length >= 2 && !isFetching && results.length === 0 && (
              <div className="py-10 text-center">
                <Users className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Tidak ada jamaah yang cocok dengan</p>
                <p className="text-sm font-medium mt-0.5">"{debounced}"</p>
              </div>
            )}

            {/* Loading skeleton */}
            {isFetching && results.length === 0 && (
              <div className="p-4 space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
              </div>
            )}

            {/* Hint when empty */}
            {debounced.length < 2 && recent.length === 0 && (
              <div className="py-10 text-center space-y-1 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto opacity-25 mb-2" />
                <p className="text-sm">Ketik minimal 2 huruf untuk mulai mencari</p>
                <p className="text-xs">Cari berdasarkan nama lengkap atau kode booking</p>
              </div>
            )}

            {/* Result items */}
            {displayed.map((item, idx) => {
              const isActive = idx === cursor;
              return (
                <button
                  key={`${item.customerId}-${idx}`}
                  data-idx={idx}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setCursor(idx)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-colors ${
                    isActive ? "bg-primary/8 border-l-2 border-l-primary" : "hover:bg-muted/50 border-l-2 border-l-transparent"
                  }`}
                >
                  {/* Avatar circle */}
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    item.gender === "female" || item.gender === "perempuan"
                      ? "bg-pink-100 text-pink-700"
                      : "bg-blue-100 text-blue-700"
                  }`}>
                    {item.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium truncate max-w-[160px]">{item.name}</span>
                      {item.gender && (
                        <Badge variant="outline" className={`text-[9px] px-1 py-0 shrink-0 ${
                          item.gender === "female" || item.gender === "perempuan"
                            ? "border-pink-300 text-pink-700"
                            : "border-blue-300 text-blue-700"
                        }`}>
                          {item.gender === "female" || item.gender === "perempuan" ? "P" : "L"}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {item.bookingCode && (
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground font-mono">
                          <Hash className="h-2.5 w-2.5" />{item.bookingCode}
                        </span>
                      )}
                      {item.packageName && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                          {item.packageName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: departure badge */}
                  <div className="shrink-0 text-right space-y-1">
                    {item.departureStatus && (
                      <Badge className={`text-[9px] border px-1.5 py-0 ${statusColor(item.departureStatus)}`}>
                        {statusLabel(item.departureStatus)}
                      </Badge>
                    )}
                    {item.departureDate && (
                      <p className="text-[10px] text-muted-foreground">
                        {format(parseISO(item.departureDate), "MMM yyyy", { locale: idLocale })}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}

            {/* Clear recent */}
            {showingRecent && recent.length > 0 && (
              <div className="px-4 py-3 border-t">
                <button
                  onClick={() => {
                    setRecent([]);
                    localStorage.removeItem(RECENT_KEY);
                  }}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Hapus riwayat pencarian
                </button>
              </div>
            )}

            {/* Footer hint */}
            <div className="px-4 py-2.5 border-t bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 border rounded font-mono bg-white text-[9px]">↑↓</kbd> navigasi
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 border rounded font-mono bg-white text-[9px]">↵</kbd> buka profil
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">Semua keberangkatan</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── SOS Banner ──────────────────────────────────────────────────────────────

interface SOSAlert {
  id: string;
  customer_id: string;
  booking_code: string | null;
  emergency_type: string;
  message: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  created_at: string;
  customer?: { full_name: string; phone: string | null };
}

function SOSPanel({
  departureId,
  notify,
}: {
  departureId: string;
  notify: (title: string, body: string, opts?: any) => void;
}) {
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: activeAlerts = [] } = useQuery<SOSAlert[]>({
    queryKey: ["muthawif-sos", departureId],
    queryFn: async () => {
      const { data } = await supabase
        .from("sos_alerts")
        .select("*, customer:profiles(full_name, phone)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(10);
      return (data || []) as SOSAlert[];
    },
    refetchInterval: 15000,
  });

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("muthawif-sos-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "sos_alerts",
      }, (payload: any) => {
        queryClient.invalidateQueries({ queryKey: ["muthawif-sos", departureId] });
        toast.error("🚨 SOS BARU! Ada jamaah yang membutuhkan bantuan segera.", {
          duration: 10000,
          important: true,
        });
        if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
        // Browser / OS notification
        const p = payload.new as any;
        const name  = p?.customer?.full_name || "Jamaah";
        const etype = EMERGENCY_TYPES[p?.emergency_type]?.label || "Darurat";
        notify(
          `🚨 SOS — ${etype}`,
          `${name}: ${p?.message || "Membutuhkan bantuan segera!"}`,
          { url: "/muthawif/dashboard", tag: `sos-${p?.id}`, vibrate: true, dedup: `sos-${p?.id}` }
        );
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [departureId, queryClient, notify]);

  const respondMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from("sos_alerts")
        .update({ status: "responding", response_notes: "Muthawif sedang menangani." })
        .eq("id", id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["muthawif-sos", departureId] });
      toast.success("Status SOS diperbarui: Sedang Ditangani");
    },
  });

  const visibleAlerts = activeAlerts.filter(a => !dismissed.has(a.id));
  if (visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {visibleAlerts.map(alert => {
        const et = EMERGENCY_TYPES[alert.emergency_type] || EMERGENCY_TYPES.other;
        const EIcon = et.icon;
        return (
          <Alert key={alert.id} className="border-red-400 bg-red-50 animate-pulse">
            <Siren className="h-4 w-4 text-red-600 shrink-0" />
            <AlertDescription className="w-full">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-red-800 text-sm">SOS — {et.label}</span>
                    <Badge className="bg-red-600 text-white text-[10px] border-0 py-0">
                      {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: idLocale })}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-red-900 mt-0.5">
                    {alert.customer?.full_name || "Jamaah tidak dikenal"}
                  </p>
                  {alert.message && (
                    <p className="text-xs text-red-700 mt-0.5 line-clamp-2">{alert.message}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-red-600 hover:bg-red-700"
                      onClick={() => respondMutation.mutate(alert.id)}
                      disabled={respondMutation.isPending}
                    >
                      <CheckCheck className="h-3 w-3 mr-1" /> Saya Tangani
                    </Button>
                    {alert.customer?.phone && (
                      <Button size="sm" variant="outline" className="h-7 text-xs border-red-300" asChild>
                        <a href={`tel:${alert.customer.phone}`}>
                          <Phone className="h-3 w-3 mr-1" /> Telepon
                        </a>
                      </Button>
                    )}
                    {alert.latitude && alert.longitude && (
                      <Button size="sm" variant="outline" className="h-7 text-xs border-red-300" asChild>
                        <a href={`https://maps.google.com/?q=${alert.latitude},${alert.longitude}`} target="_blank" rel="noopener noreferrer">
                          <MapPin className="h-3 w-3 mr-1" /> Lihat Lokasi
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
                  className="text-red-400 hover:text-red-600 p-1 shrink-0"
                  aria-label="Tutup"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}

// ─── Notification Permission Banner ──────────────────────────────────────────

function NotificationPermissionBanner({
  permission,
  isRequesting,
  onRequest,
}: {
  permission: string;
  isRequesting: boolean;
  onRequest: () => void;
}) {
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem("notif_banner_dismissed") === "1"
  );

  if (permission === "granted" || permission === "unsupported" || dismissed) return null;

  if (permission === "denied") {
    return (
      <Alert className="border-amber-300 bg-amber-50">
        <BellOff className="h-4 w-4 text-amber-600 shrink-0" />
        <AlertDescription className="text-amber-800 text-sm">
          Notifikasi SOS diblokir browser. Aktifkan izin notifikasi di pengaturan browser untuk menerima peringatan darurat.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-blue-300 bg-blue-50">
      <Bell className="h-4 w-4 text-blue-600 shrink-0" />
      <AlertDescription className="w-full">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-blue-900 text-sm">Aktifkan notifikasi push</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Terima peringatan SOS dan absen berturut-turut meskipun layar HP terkunci.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
              onClick={onRequest}
              disabled={isRequesting}
            >
              {isRequesting
                ? <RefreshCcw className="h-3 w-3 animate-spin mr-1" />
                : <Bell className="h-3 w-3 mr-1" />
              }
              Aktifkan
            </Button>
            <button
              onClick={() => {
                setDismissed(true);
                localStorage.setItem("notif_banner_dismissed", "1");
              }}
              className="text-blue-400 hover:text-blue-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}

// ─── Absen Alert Panel ────────────────────────────────────────────────────────

function AbsenAlertPanel({
  departureId,
  passengers,
  notify,
}: {
  departureId: string;
  passengers: any[];
  notify: (title: string, body: string, opts?: any) => void;
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const notifiedRef = useRef<Set<string>>(new Set());

  const since = format(subDays(new Date(), 7), "yyyy-MM-dd");

  const { data: recentAtt = [] } = useQuery({
    queryKey: ["muthawif-absen-alert", departureId, since],
    enabled: !!departureId && passengers.length > 0,
    refetchInterval: 5 * 60 * 1000, // re-check every 5 min
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("customer_id, status, attendance_date, session_type, checked_at")
        .eq("departure_id", departureId)
        .gte("attendance_date", since)
        .order("attendance_date", { ascending: false })
        .order("checked_at", { ascending: false });
      return data || [];
    },
  });

  // Find customers with 2+ consecutive "absen" as their most recent records
  const absenBerturut = (() => {
    const byCustomer: Record<string, any[]> = {};
    for (const r of (recentAtt as any[])) {
      if (!byCustomer[r.customer_id]) byCustomer[r.customer_id] = [];
      byCustomer[r.customer_id].push(r);
    }

    const flagged: Array<{ customerId: string; name: string; phone: string | null; count: number; lastDate: string }> = [];

    for (const [cid, records] of Object.entries(byCustomer)) {
      // Records are already sorted desc by date
      let consecutiveAbsen = 0;
      for (const r of records) {
        if (r.status === "absen") consecutiveAbsen++;
        else break;
      }
      if (consecutiveAbsen >= 2) {
        const p = passengers.find(px => px.customerId === cid);
        if (p) {
          flagged.push({
            customerId: cid,
            name: p.name || "—",
            phone: p.phone || null,
            count: consecutiveAbsen,
            lastDate: records[0]?.attendance_date || "",
          });
        }
      }
    }
    return flagged.sort((a, b) => b.count - a.count);
  })();

  // Send one-time notification per flagged customer per session
  useEffect(() => {
    for (const f of absenBerturut) {
      const key = `absen-${f.customerId}-${f.count}`;
      if (!notifiedRef.current.has(key)) {
        notifiedRef.current.add(key);
        notify(
          `⚠️ Absen Berturut-turut`,
          `${f.name} absen ${f.count}x berturut-turut — perlu perhatian segera.`,
          { url: `/muthawif/jamaah/${f.customerId}`, tag: key, dedup: key }
        );
      }
    }
  }, [absenBerturut.length]);

  const visible = absenBerturut.filter(f => !dismissed.has(f.customerId));
  if (visible.length === 0) return null;

  return (
    <Card className="border-amber-300">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Absen Berturut-turut
          <Badge className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] ml-1">
            {visible.length} jamaah
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pt-0 pb-0">
        <div className="divide-y">
          {visible.map(f => (
            <div key={f.customerId} className="flex items-center gap-3 px-4 py-2.5">
              <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <UserX className="h-4 w-4 text-amber-700" />
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  to={`/muthawif/jamaah/${f.customerId}`}
                  className="text-sm font-medium hover:text-primary hover:underline transition-colors truncate block"
                >
                  {f.name}
                </Link>
                <p className="text-xs text-amber-700">
                  Absen <span className="font-bold">{f.count}×</span> berturut-turut
                  {f.lastDate ? ` — terakhir ${format(parseISO(f.lastDate + "T00:00:00"), "d MMM", { locale: idLocale })}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {f.phone && (
                  <a
                    href={`https://wa.me/${f.phone.replace(/\D/g,"").replace(/^0/,"62")}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-[11px] border border-green-200 text-green-700 rounded px-1.5 py-0.5 hover:bg-green-50"
                  >
                    WA
                  </a>
                )}
                <button
                  onClick={() => setDismissed(prev => new Set([...prev, f.customerId]))}
                  className="text-muted-foreground hover:text-foreground p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Quick Attendance Panel ───────────────────────────────────────────────────

function QuickAbsensi({
  passengers,
  departureId,
}: {
  passengers: any[];
  departureId: string;
}) {
  const queryClient = useQueryClient();
  const [sessionType, setSessionType] = useState("keberangkatan");
  const [sessionDate, setSessionDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const { data: attendanceRecords = [], isLoading: loadingAtt } = useQuery({
    queryKey: ["muthawif-absensi", departureId, sessionType, sessionDate],
    enabled: !!departureId,
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("*")
        .eq("departure_id", departureId)
        .eq("session_type", sessionType)
        .eq("attendance_date", sessionDate);
      return data || [];
    },
  });

  const passengersWithAtt = passengers.map((p: any) => {
    const rec = (attendanceRecords as any[]).find(r => r.customer_id === p.customerId);
    return { ...p, attendance: rec || null, attStatus: rec?.status as AttendanceStatus | null };
  });

  const grouped = groupByRoomType(passengersWithAtt);

  const hadirCount = passengersWithAtt.filter(p => p.attStatus === "hadir").length;
  const totalCount = passengers.length;

  const toggleGroup = (key: string) =>
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));

  const updateAttendance = useCallback(async (customerId: string, status: AttendanceStatus) => {
    setUpdatingId(customerId);
    try {
      const existing = (attendanceRecords as any[]).find(r => r.customer_id === customerId);
      if (existing) {
        await supabase.from("attendance").update({ status, checked_at: new Date().toISOString() }).eq("id", existing.id);
      } else {
        await supabase.from("attendance").insert({
          customer_id: customerId,
          departure_id: departureId,
          session_type: sessionType,
          attendance_date: sessionDate,
          status,
          checked_at: new Date().toISOString(),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["muthawif-absensi", departureId, sessionType, sessionDate] });
    } catch {
      toast.error("Gagal memperbarui absensi");
    } finally {
      setUpdatingId(null);
    }
  }, [attendanceRecords, departureId, sessionType, sessionDate, queryClient]);

  const markAllHadir = async () => {
    for (const p of passengers) {
      const existing = (attendanceRecords as any[]).find(r => r.customer_id === p.customerId);
      if (!existing || existing.status !== "hadir") {
        if (existing) {
          await supabase.from("attendance").update({ status: "hadir", checked_at: new Date().toISOString() }).eq("id", existing.id);
        } else {
          await supabase.from("attendance").insert({
            customer_id: p.customerId,
            departure_id: departureId,
            session_type: sessionType,
            attendance_date: sessionDate,
            status: "hadir",
            checked_at: new Date().toISOString(),
          });
        }
      }
    }
    queryClient.invalidateQueries({ queryKey: ["muthawif-absensi", departureId, sessionType, sessionDate] });
    toast.success(`Semua ${totalCount} jamaah ditandai hadir`);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-emerald-600" />
            Absensi Cepat
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {hadirCount}/{totalCount} Hadir
          </Badge>
        </div>

        {/* Session selector */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Select value={sessionType} onValueChange={setSessionType}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SESSION_TYPES.map(s => (
                <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={sessionDate}
            onChange={e => setSessionDate(e.target.value)}
            className="h-8 text-xs"
          />
        </div>

        {/* Progress bar */}
        <div className="mt-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{SESSION_TYPES.find(s => s.value === sessionType)?.label}</span>
            <span>{totalCount > 0 ? Math.round((hadirCount / totalCount) * 100) : 0}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: totalCount > 0 ? `${(hadirCount / totalCount) * 100}%` : "0%" }}
            />
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs mt-2 w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          onClick={markAllHadir}
        >
          <CheckCheck className="h-3.5 w-3.5 mr-1.5" /> Tandai Semua Hadir
        </Button>
      </CardHeader>

      {/* Grouped by rombongan (room_type) */}
      <CardContent className="p-0">
        {loadingAtt ? (
          <div className="p-4 space-y-2">
            {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          Object.entries(grouped).map(([roomType, members]) => {
            const isOpen = expandedGroups[roomType] !== false;
            const groupHadir = members.filter(m => m.attStatus === "hadir").length;
            return (
              <div key={roomType} className="border-t first:border-t-0">
                <button
                  onClick={() => toggleGroup(roomType)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <span className="text-sm font-medium">
                      {ROOM_TYPE_LABELS[roomType] || `Tipe: ${roomType}`}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {groupHadir}/{members.length}
                  </Badge>
                </button>

                {isOpen && (
                  <div className="divide-y">
                    {members.map((p: any, i: number) => {
                      const isUpdating = updatingId === p.customerId;
                      const status = p.attStatus as AttendanceStatus | null;
                      const cfg = status ? STATUS_CONFIG[status] : null;
                      return (
                        <div key={p.bookingId} className="flex items-center gap-2 px-4 py-2.5">
                          <span className="text-xs text-muted-foreground w-5 flex-shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <Link
                              to={`/muthawif/jamaah/${p.customerId}`}
                              className="text-sm font-medium truncate block hover:text-primary hover:underline underline-offset-2 transition-colors"
                            >
                              {p.name || "-"}
                            </Link>
                            <p className="text-[11px] text-muted-foreground truncate">{p.phone || "—"}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Quick hadir/absen toggles */}
                            <button
                              disabled={isUpdating}
                              onClick={() => updateAttendance(p.customerId, status === "hadir" ? "absen" : "hadir")}
                              className={`h-7 w-7 rounded-full flex items-center justify-center transition-all border ${
                                status === "hadir"
                                  ? "bg-emerald-500 border-emerald-500 text-white"
                                  : "bg-white border-gray-300 text-gray-400 hover:border-emerald-400 hover:text-emerald-500"
                              }`}
                              title={status === "hadir" ? "Tandai Absen" : "Tandai Hadir"}
                            >
                              {isUpdating ? (
                                <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                            {/* Status badge */}
                            {cfg && (
                              <Badge className={`text-[10px] border ${cfg.cls} px-1.5 py-0`}>
                                {cfg.label}
                              </Badge>
                            )}
                            {/* WA link */}
                            {p.phone && (
                              <a
                                href={`https://wa.me/${p.phone.replace(/\D/g,"").replace(/^0/,"62")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-700 p-0.5"
                              >
                                <Phone className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function MuthawifDashboard() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const { permission, isGranted, isRequesting, requestPermission, notify } = useMuthawifNotifications();

  const { data: muthawif } = useQuery({
    queryKey: ["muthawif-profile", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const { data } = await supabase
        .from("muthawifs")
        .select("*")
        .eq("email", user!.email)
        .maybeSingle();
      return data;
    },
  });

  const { data: departures = [], isLoading: loadingDep, refetch } = useQuery({
    queryKey: ["muthawif-departures", muthawif?.id],
    enabled: !!muthawif?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select(`
          id, departure_date, return_date, flight_number, status,
          package:packages(name),
          hotel_makkah:hotels!departures_hotel_makkah_id_fkey(name),
          bookings:bookings(
            id, booking_code, booking_status, room_type,
            customer:profiles(id, full_name, phone, gender)
          )
        `)
        .eq("muthawif_id", muthawif.id)
        .order("departure_date", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const activeDeparture = departures.find(
    (d: any) => d.status === "ongoing" || d.status === "scheduled"
  ) as any;

  const passengers = (activeDeparture?.bookings || [])
    .filter((b: any) => b.booking_status !== "cancelled")
    .map((b: any) => ({
      bookingId: b.id,
      bookingCode: b.booking_code,
      customerId: b.customer?.id,
      name: b.customer?.full_name,
      phone: b.customer?.phone,
      gender: b.customer?.gender,
      roomType: b.room_type || "lainnya",
    }));

  const filteredPassengers = search
    ? passengers.filter((p: any) =>
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.phone?.includes(search)
      )
    : passengers;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-card border-b px-4 py-3 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-base font-bold leading-tight">Dashboard Muthawif</h1>
            <p className="text-xs text-muted-foreground truncate">{muthawif?.name || user?.email || "..."}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <GlobalSearch muthawifId={muthawif?.id} />
            {/* Notification bell */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 relative"
              onClick={isGranted ? undefined : requestPermission}
              title={isGranted ? "Notifikasi aktif" : "Aktifkan notifikasi"}
            >
              {isGranted
                ? <Bell className="h-4 w-4 text-emerald-600" />
                : permission === "denied"
                  ? <BellOff className="h-4 w-4 text-muted-foreground" />
                  : <BellDot className="h-4 w-4 text-blue-500" />
              }
            </Button>
            <Badge variant={muthawif?.is_active ? "default" : "secondary"} className="text-[10px] hidden sm:inline-flex">
              {muthawif?.is_active ? "Aktif" : "Nonaktif"}
            </Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">

        {/* ── Notification Permission Banner ─────────────────────────── */}
        <NotificationPermissionBanner
          permission={permission}
          isRequesting={isRequesting}
          onRequest={requestPermission}
        />

        {/* ── SOS Real-time Panel ───────────────────────────────────── */}
        {activeDeparture && (
          <SOSPanel departureId={activeDeparture.id} notify={notify} />
        )}

        {/* ── Absen Berturut-turut Alert ────────────────────────────── */}
        {activeDeparture && passengers.length > 0 && (
          <AbsenAlertPanel
            departureId={activeDeparture.id}
            passengers={passengers}
            notify={notify}
          />
        )}

        {/* ── Profile Card ──────────────────────────────────────────── */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl border border-primary/20 flex-shrink-0">
                {muthawif?.name?.charAt(0) || "M"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg">{muthawif?.name || "-"}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Star className="h-3.5 w-3.5" /> {muthawif?.experience_years || 0} tahun pengalaman
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{muthawif?.phone || muthawif?.email || "-"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total Tugas</p>
                <p className="text-2xl font-bold">{departures.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Active Departure ──────────────────────────────────────── */}
        {loadingDep ? (
          <Skeleton className="h-36 w-full" />
        ) : activeDeparture ? (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Keberangkatan Aktif
                </CardTitle>
                <Badge className={
                  activeDeparture.status === "ongoing"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-blue-100 text-blue-800 border border-blue-200"
                }>
                  {activeDeparture.status === "ongoing" ? "Sedang Berlangsung" : "Terjadwal"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-lg">{activeDeparture.package?.name}</p>
              <div className="flex flex-wrap gap-4 mt-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Berangkat</p>
                  <p className="font-medium">
                    {activeDeparture.departure_date
                      ? format(parseISO(activeDeparture.departure_date), "dd MMM yyyy", { locale: idLocale })
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Kembali</p>
                  <p className="font-medium">
                    {activeDeparture.return_date
                      ? format(parseISO(activeDeparture.return_date), "dd MMM yyyy", { locale: idLocale })
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Hotel Makkah</p>
                  <p className="font-medium">{activeDeparture.hotel_makkah?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Jamaah</p>
                  <p className="font-medium">{passengers.length} orang</p>
                </div>
              </div>

              {/* Quick action buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                <Button size="sm" variant="outline" className="h-9 text-xs" asChild>
                  <Link to="/muthawif/laporan-harian">
                    <FileBarChart className="h-3.5 w-3.5 mr-1.5" /> Laporan Harian
                  </Link>
                </Button>
                <Button size="sm" variant="outline" className="h-9 text-xs" asChild>
                  <Link to="/admin/manifest">
                    <Users className="h-3.5 w-3.5 mr-1.5" /> Manifest
                  </Link>
                </Button>
                <Button size="sm" variant="outline" className="h-9 text-xs" asChild>
                  <Link to="/jamaah/chat">
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Chat
                  </Link>
                </Button>
                <Button size="sm" variant="outline" className="h-9 text-xs" asChild>
                  <Link to="/admin/wa-blast">
                    <Navigation className="h-3.5 w-3.5 mr-1.5" /> WA Blast
                  </Link>
                </Button>
                <Button size="sm" variant="outline" className="h-9 text-xs" asChild>
                  <Link to="/admin/sos-alerts">
                    <BellRing className="h-3.5 w-3.5 mr-1.5" /> Monitor SOS
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Tidak ada keberangkatan aktif saat ini</p>
            </CardContent>
          </Card>
        )}

        {/* ── Quick Absensi dengan Rombongan ────────────────────────── */}
        {activeDeparture && passengers.length > 0 && (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari jamaah berdasarkan nama atau no HP..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>

            <QuickAbsensi
              passengers={search ? filteredPassengers : passengers}
              departureId={activeDeparture.id}
            />
          </>
        )}

        {/* ── Departure History ─────────────────────────────────────── */}
        {departures.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Riwayat Keberangkatan</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paket</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Jamaah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departures.map((dep: any) => (
                    <TableRow key={dep.id}>
                      <TableCell className="text-sm font-medium max-w-[120px] truncate">
                        {dep.package?.name || "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {dep.departure_date
                          ? format(parseISO(dep.departure_date), "dd MMM yy", { locale: idLocale })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] border ${
                          dep.status === "completed" ? "bg-gray-100 text-gray-600 border-gray-200" :
                          dep.status === "ongoing"   ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                          dep.status === "cancelled" ? "bg-red-100 text-red-700 border-red-200" :
                                                       "bg-blue-100 text-blue-700 border-blue-200"
                        }`}>
                          {dep.status === "completed" ? "Selesai" :
                           dep.status === "ongoing"   ? "Berlangsung" :
                           dep.status === "cancelled" ? "Dibatalkan" : "Terjadwal"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {dep.bookings?.filter((b: any) => b.booking_status !== "cancelled").length || 0}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
