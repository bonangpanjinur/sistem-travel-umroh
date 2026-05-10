import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  AlertTriangle, CheckCircle2, Clock, Heart, HelpCircle,
  Loader2, MapPin, Phone, Shield, Wifi, WifiOff, MessageSquare,
  Plane, Package, Users, Bell, BellOff, BellDot,
} from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useMuthawifPushSubscription } from "@/hooks/useMuthawifPushSubscription";

const EMERGENCY_TYPES: Record<string, { label: string; icon: any; color: string }> = {
  medical:  { label: "Medis/Kesehatan", icon: Heart,      color: "text-red-600" },
  lost:     { label: "Tersesat/Hilang", icon: MapPin,     color: "text-amber-600" },
  security: { label: "Keamanan",        icon: Shield,     color: "text-orange-600" },
  other:    { label: "Lainnya",         icon: HelpCircle, color: "text-blue-600" },
};

const SOS_STATUS: Record<string, { label: string; cls: string }> = {
  active:     { label: "Aktif",      cls: "bg-red-100 text-red-800 border-red-300" },
  responding: { label: "Ditangani",  cls: "bg-amber-100 text-amber-800 border-amber-300" },
  resolved:   { label: "Selesai",    cls: "bg-green-100 text-green-800 border-green-300" },
};

interface SOSAlert {
  id: string;
  customer_id: string;
  departure_id: string | null;
  emergency_type: string;
  message: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  response_notes: string | null;
  booking_code: string | null;
  created_at: string;
  resolved_at: string | null;
  customer?: { full_name: string; phone: string | null };
}

interface Departure {
  id: string;
  departure_date: string;
  status: string;
  package?: { name: string };
}

export default function MuthawifSOS() {
  const { user }    = useAuth();
  const queryClient = useQueryClient();
  const [isLive, setIsLive]               = useState(false);
  const [newAlert, setNewAlert]           = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<SOSAlert | null>(null);
  const [responseNote, setResponseNote]   = useState("");
  const [statusFilter, setStatusFilter]   = useState<"all" | "active" | "responding" | "resolved">("active");
  const [selectedDepId, setSelectedDepId] = useState<string>("all");

  // ── 0. Push notification subscription ────────────────────────────────────
  // (loaded after muthawif profile is fetched — see below)
  const [muthawifIdForPush, setMuthawifIdForPush] = useState<string | undefined>(undefined);

  // ── 1. Load muthawif profile (matched by email) ──────────────────────────
  const { data: muthawif } = useQuery({
    queryKey: ["muthawif-sos-profile", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const { data } = await supabase
        .from("muthawifs")
        .select("id, name, phone")
        .eq("email", user!.email)
        .maybeSingle();
      if (data?.id) setMuthawifIdForPush(data.id);
      return data;
    },
  });

  // ── Push subscription (auto-subscribes if permission already granted) ──
  const push = useMuthawifPushSubscription({
    muthawifId:    muthawifIdForPush,
    userId:        user?.id,
    autoSubscribe: true,
  });

  // ── 2. Load departures assigned to this muthawif ────────────────────────
  const { data: departures = [] } = useQuery<Departure[]>({
    queryKey: ["muthawif-sos-departures", muthawif?.id],
    enabled: !!muthawif?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select("id, departure_date, status, package:packages(name)")
        .eq("muthawif_id", muthawif!.id)
        .order("departure_date", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const depIds = departures.map((d: Departure) => d.id);

  // ── 3. SOS alerts filtered by this muthawif's departure groups ──────────
  const { data: alerts = [], isLoading, refetch } = useQuery<SOSAlert[]>({
    queryKey: ["muthawif-sos-alerts", depIds, statusFilter, selectedDepId],
    enabled: depIds.length > 0 || !muthawif, // also run when muthawif not found (shows empty state)
    queryFn: async () => {
      if (depIds.length === 0) return [];

      let q = supabase
        .from("sos_alerts")
        .select("*, customer:customers(full_name, phone)")
        .order("created_at", { ascending: false })
        .limit(100);

      // Filter by muthawif's departure groups
      if (selectedDepId !== "all") {
        q = q.eq("departure_id", selectedDepId);
      } else {
        q = q.in("departure_id", depIds);
      }

      if (statusFilter !== "all") q = q.eq("status", statusFilter);

      const { data, error } = await q;
      if (error) {
        if (error.code === "42P01" || error.code === "42703") return [];
        throw error;
      }
      return (data || []) as SOSAlert[];
    },
  });

  // ── 4. Realtime subscription (scoped per departure group) ────────────────
  useEffect(() => {
    if (depIds.length === 0) return;

    const channel = supabase
      .channel(`muthawif-sos-${muthawif?.id || "anon"}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "sos_alerts",
      }, (payload: any) => {
        // Only react if it belongs to this muthawif's departures
        if (!depIds.includes(payload.new?.departure_id)) return;
        refetch();
        setNewAlert(true);
        const eType = EMERGENCY_TYPES[payload.new?.emergency_type] || EMERGENCY_TYPES.other;
        toast.error(`🆘 SOS Baru dari Rombongan: ${eType.label}`, {
          description: "Ada jamaah di rombongan Anda membutuhkan pertolongan!",
          duration: 8000,
        });
        if ("vibrate" in navigator) navigator.vibrate([400, 100, 400, 100, 400]);
        setTimeout(() => setNewAlert(false), 5000);
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "sos_alerts",
      }, () => refetch())
      .subscribe((status: string) => {
        setIsLive(status === "SUBSCRIBED");
      });

    return () => { supabase.removeChannel(channel); };
  }, [depIds.join(","), muthawif?.id, refetch]);

  // ── 5. Mutations ──────────────────────────────────────────────────────────
  const updateStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      const updates: any = { status, response_notes: notes };
      if (status === "resolved") updates.resolved_at = new Date().toISOString();
      const { error } = await supabase.from("sos_alerts").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["muthawif-sos-alerts"] });
      setSelectedAlert(null);
      setResponseNote("");
      toast.success("Status SOS diperbarui");
    },
    onError: (e: any) => toast.error("Gagal: " + e.message),
  });

  const activeCount     = alerts.filter(a => a.status === "active").length;
  const respondingCount = alerts.filter(a => a.status === "responding").length;

  const getDepartureName = (depId: string | null) => {
    if (!depId) return null;
    const d = departures.find((x: Departure) => x.id === depId) as Departure | undefined;
    if (!d) return null;
    return `${(d as any).package?.name || "Paket"} · ${format(parseISO(d.departure_date), "d MMM yyyy", { locale: idLocale })}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className={`text-white p-4 sticky top-0 z-50 transition-colors ${newAlert ? "bg-red-700 animate-pulse" : "bg-red-600"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-semibold">Monitor SOS</h1>
              <p className="text-xs opacity-80">
                {muthawif?.name ? `Muthawif: ${muthawif.name}` : "Panel Respons Darurat Muthawif"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Push notification toggle */}
            {push.isSupported && (
              push.permission === "denied" ? (
                <div
                  className="flex items-center gap-1.5 text-xs bg-white/10 px-2 py-1 rounded-full opacity-60 cursor-not-allowed"
                  title="Izin notifikasi ditolak di browser"
                >
                  <BellOff className="h-3.5 w-3.5" />
                </div>
              ) : push.isSubscribed ? (
                <button
                  className="flex items-center gap-1.5 text-xs bg-white/20 px-2 py-1 rounded-full hover:bg-white/30 transition-colors"
                  onClick={() => push.unsubscribe()}
                  disabled={push.isLoading}
                  title="Push notifikasi aktif — klik untuk matikan"
                >
                  {push.isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellDot className="h-3.5 w-3.5 text-green-300" />}
                  <span className="hidden sm:inline">Push aktif</span>
                </button>
              ) : (
                <button
                  className="flex items-center gap-1.5 text-xs bg-amber-400/90 text-amber-900 px-2 py-1 rounded-full hover:bg-amber-300 transition-colors font-medium"
                  onClick={() => push.subscribe()}
                  disabled={push.isLoading || !muthawifIdForPush}
                  title="Aktifkan push notifikasi agar SOS terkirim saat app di background"
                >
                  {push.isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
                  <span>Aktifkan Push</span>
                </button>
              )
            )}
            <div className="flex items-center gap-1.5 text-xs bg-white/20 px-2 py-1 rounded-full">
              {isLive ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5 opacity-60" />}
              <span>{isLive ? "Live" : "Offline"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* No departures assigned */}
        {!isLoading && muthawif && departures.length === 0 && (
          <Alert className="border-amber-300 bg-amber-50">
            <Plane className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-sm">
              Anda belum ditugaskan ke keberangkatan mana pun. Hubungi admin untuk penugasan.
            </AlertDescription>
          </Alert>
        )}

        {/* No muthawif profile found */}
        {!isLoading && !muthawif && (
          <Alert className="border-amber-300 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-sm">
              Profil muthawif tidak ditemukan untuk akun ini. Pastikan email Anda terdaftar di data muthawif.
            </AlertDescription>
          </Alert>
        )}

        {/* New alert flash */}
        {newAlert && (
          <Alert className="border-red-400 bg-red-50 animate-bounce">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 font-bold">
              ⚠️ SOS BARU dari rombongan Anda — Segera tangani!
            </AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Aktif",     value: activeCount,     color: "text-red-600",   bg: "bg-red-50 border-red-200" },
            { label: "Ditangani", value: respondingCount, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
            { label: "Total",     value: alerts.length,   color: "text-slate-600", bg: "" },
          ].map(s => (
            <Card key={s.label} className={s.bg}>
              <CardContent className="pt-3 pb-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Departure filter — only shown if more than 1 departure assigned */}
        {departures.length > 1 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <Plane className="h-3.5 w-3.5" />FILTER KEBERANGKATAN
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm" variant={selectedDepId === "all" ? "default" : "outline"}
                onClick={() => setSelectedDepId("all")} className="text-xs h-8"
              >
                <Users className="h-3.5 w-3.5 mr-1" />Semua Rombongan
              </Button>
              {departures.map((d: Departure) => (
                <Button
                  key={d.id} size="sm"
                  variant={selectedDepId === d.id ? "default" : "outline"}
                  onClick={() => setSelectedDepId(d.id)}
                  className="text-xs h-8"
                >
                  <Package className="h-3.5 w-3.5 mr-1" />
                  {(d as any).package?.name || "Paket"} · {format(parseISO(d.departure_date), "d MMM", { locale: idLocale })}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Status filter */}
        <div className="flex gap-2 flex-wrap">
          {(["active", "responding", "all", "resolved"] as const).map(f => (
            <Button
              key={f} size="sm"
              variant={statusFilter === f ? "default" : "outline"}
              onClick={() => setStatusFilter(f)}
              className="text-xs"
            >
              {f === "active" ? "Aktif" : f === "responding" ? "Ditangani" : f === "resolved" ? "Selesai" : "Semua"}
            </Button>
          ))}
        </div>

        {/* Alert list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-red-500" />
          </div>
        ) : alerts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="font-medium">
                {statusFilter === "active" ? "Tidak ada SOS aktif" : "Tidak ada data SOS"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {statusFilter === "active" ? "Semua jamaah di rombongan Anda dalam kondisi aman" : "Tidak ada riwayat SOS"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {alerts.map((a) => {
              const eType = EMERGENCY_TYPES[a.emergency_type] || EMERGENCY_TYPES.other;
              const EIcon = eType.icon;
              const sSt   = SOS_STATUS[a.status] || { label: a.status, cls: "" };
              const depName = getDepartureName(a.departure_id);
              return (
                <Card key={a.id} className={`border ${a.status === "active" ? "border-red-300 bg-red-50/50" : ""}`}>
                  <CardContent className="py-4 px-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <EIcon className={`h-5 w-5 flex-shrink-0 ${eType.color}`} />
                        <div>
                          <p className="font-medium text-sm">{a.customer?.full_name || "Jamaah"}</p>
                          <p className="text-xs text-muted-foreground">{eType.label}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${sSt.cls}`}>{sSt.label}</span>
                    </div>

                    {/* Departure group label */}
                    {depName && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <Plane className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{depName}</span>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground mb-3">
                      {formatDistanceToNow(parseISO(a.created_at), { locale: idLocale, addSuffix: true })}
                      {" · "}{format(parseISO(a.created_at), "HH:mm")}
                    </p>

                    {a.message && (
                      <p className="text-sm bg-background border rounded p-2 mb-3 line-clamp-2">{a.message}</p>
                    )}

                    {a.response_notes && a.status !== "active" && (
                      <p className="text-xs bg-emerald-50 border border-emerald-200 rounded p-2 mb-3 text-emerald-800">
                        ✓ {a.response_notes}
                      </p>
                    )}

                    <div className="flex gap-2">
                      {a.customer?.phone && (
                        <Button size="sm" variant="outline" className="flex-1 text-xs" asChild>
                          <a href={`tel:${a.customer.phone}`}><Phone className="h-3.5 w-3.5 mr-1" />Telepon</a>
                        </Button>
                      )}
                      {a.latitude && a.longitude && (
                        <Button size="sm" variant="outline" className="flex-1 text-xs"
                          onClick={() => window.open(`https://maps.google.com/maps?q=${a.latitude},${a.longitude}`, "_blank")}>
                          <MapPin className="h-3.5 w-3.5 mr-1" />Lokasi
                        </Button>
                      )}
                      {a.status !== "resolved" && (
                        <Button size="sm" className="flex-1 text-xs"
                          onClick={() => { setSelectedAlert(a); setResponseNote(a.response_notes || ""); }}>
                          <MessageSquare className="h-3.5 w-3.5 mr-1" />Respons
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Response dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={v => { if (!v) setSelectedAlert(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Respons SOS — {selectedAlert?.customer?.full_name}
            </DialogTitle>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm bg-muted p-3 rounded-lg">
                <div><p className="text-xs text-muted-foreground">Jenis</p><p className="font-medium">{EMERGENCY_TYPES[selectedAlert.emergency_type]?.label}</p></div>
                <div><p className="text-xs text-muted-foreground">Status</p><p className="font-medium">{SOS_STATUS[selectedAlert.status]?.label}</p></div>
                <div><p className="text-xs text-muted-foreground">No. HP</p><p className="font-medium">{selectedAlert.customer?.phone || "–"}</p></div>
                <div><p className="text-xs text-muted-foreground">Waktu</p><p className="font-medium">{format(parseISO(selectedAlert.created_at), "HH:mm")}</p></div>
              </div>
              {getDepartureName(selectedAlert.departure_id) && (
                <div className="flex items-center gap-2 text-sm bg-muted p-2 rounded-lg">
                  <Plane className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{getDepartureName(selectedAlert.departure_id)}</span>
                </div>
              )}
              {selectedAlert.message && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Pesan Darurat</p>
                  <p className="text-sm bg-muted p-3 rounded">{selectedAlert.message}</p>
                </div>
              )}
              <div>
                <Label>Catatan Penanganan</Label>
                <Textarea
                  value={responseNote}
                  onChange={e => setResponseNote(e.target.value)}
                  rows={3}
                  placeholder="Catat tindakan yang Anda ambil..."
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                {selectedAlert.status !== "responding" && (
                  <Button variant="outline" className="flex-1" disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate({ id: selectedAlert.id, status: "responding", notes: responseNote })}>
                    <Clock className="h-4 w-4 mr-1" />Saya Tangani
                  </Button>
                )}
                {selectedAlert.status !== "resolved" && (
                  <Button className="flex-1" disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate({ id: selectedAlert.id, status: "resolved", notes: responseNote })}>
                    <CheckCircle2 className="h-4 w-4 mr-1" />Selesai
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
