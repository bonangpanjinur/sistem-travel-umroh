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
  CheckCheck, Siren, X, FileBarChart
} from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { toast } from "sonner";

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

function SOSPanel({ departureId }: { departureId: string }) {
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
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [departureId, queryClient]);

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
                            <p className="text-sm font-medium truncate">{p.name || "-"}</p>
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
      <div className="bg-card border-b px-4 py-4 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Dashboard Muthawif</h1>
            <p className="text-xs text-muted-foreground">{muthawif?.name || user?.email || "..."}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={muthawif?.is_active ? "default" : "secondary"} className="text-[10px]">
              {muthawif?.is_active ? "Aktif" : "Nonaktif"}
            </Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">

        {/* ── SOS Real-time Panel ───────────────────────────────────── */}
        {activeDeparture && (
          <SOSPanel departureId={activeDeparture.id} />
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
