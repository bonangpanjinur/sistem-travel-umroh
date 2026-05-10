import { useState, useEffect } from "react";
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
  Loader2, MapPin, Phone, Shield, MessageSquare,
  Users, Siren, Wifi, WifiOff,
} from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

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

interface TourLeaderSOSPanelProps {
  customerId: string;
  isTourLeader: boolean;
}

export function TourLeaderSOSPanel({ customerId, isTourLeader }: TourLeaderSOSPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLive, setIsLive] = useState(false);
  const [newAlert, setNewAlert] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<SOSAlert | null>(null);
  const [responseNote, setResponseNote] = useState("");

  // Get the tour leader's departure_id from their active booking
  const { data: myDepartureId } = useQuery<string | null>({
    queryKey: ["tour-leader-departure", customerId],
    enabled: !!customerId && isTourLeader,
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("departure_id")
        .eq("customer_id", customerId)
        .not("booking_status", "in", '("cancelled","refunded")')
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.departure_id ?? null;
    },
  });

  // Departure info for display
  const { data: departureInfo } = useQuery({
    queryKey: ["tour-leader-dep-info", myDepartureId],
    enabled: !!myDepartureId,
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select("id, departure_date, package:packages(name)")
        .eq("id", myDepartureId)
        .maybeSingle();
      return data;
    },
  });

  // Fetch SOS alerts from the same departure group
  const { data: alerts = [], isLoading, refetch } = useQuery<SOSAlert[]>({
    queryKey: ["tour-leader-sos", myDepartureId],
    enabled: !!myDepartureId && isTourLeader,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sos_alerts")
        .select("*, customer:customers(full_name, phone)")
        .eq("departure_id", myDepartureId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        if (error.code === "42P01" || error.code === "42703") return [];
        throw error;
      }
      return (data || []) as SOSAlert[];
    },
  });

  // Realtime subscription for SOS from same departure
  useEffect(() => {
    if (!myDepartureId || !isTourLeader) return;

    const channel = supabase
      .channel(`tour-leader-sos-${myDepartureId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "sos_alerts",
        filter: `departure_id=eq.${myDepartureId}`,
      }, (payload: any) => {
        refetch();
        setNewAlert(true);
        const eType = EMERGENCY_TYPES[payload.new?.emergency_type] || EMERGENCY_TYPES.other;
        toast.error(`🆘 SOS dari anggota rombongan: ${eType.label}`, {
          description: "Salah satu jamaah di rombongan Anda membutuhkan bantuan!",
          duration: 8000,
        });
        if ("vibrate" in navigator) navigator.vibrate([400, 100, 400, 100, 400]);
        setTimeout(() => setNewAlert(false), 6000);
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "sos_alerts",
        filter: `departure_id=eq.${myDepartureId}`,
      }, () => {
        refetch();
      })
      .subscribe((status: string) => {
        setIsLive(status === "SUBSCRIBED");
      });

    return () => { supabase.removeChannel(channel); };
  }, [myDepartureId, isTourLeader, refetch]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      const updates: any = { status, response_notes: notes };
      if (status === "resolved") updates.resolved_at = new Date().toISOString();
      const { error } = await supabase.from("sos_alerts").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tour-leader-sos"] });
      setSelectedAlert(null);
      setResponseNote("");
      toast.success("Status SOS diperbarui");
    },
    onError: (e: any) => toast.error("Gagal: " + e.message),
  });

  if (!isTourLeader) return null;

  const activeCount = alerts.filter(a => a.status === "active").length;
  const packageName = (departureInfo as any)?.package?.name || "Paket Umroh";
  const depDate = (departureInfo as any)?.departure_date
    ? format(parseISO((departureInfo as any).departure_date), "d MMM yyyy", { locale: idLocale })
    : "–";

  return (
    <Card className={`border-2 ${activeCount > 0 ? "border-red-400 bg-red-50/30 dark:bg-red-950/10" : "border-orange-200"}`}>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Siren className="h-4 w-4 text-red-500" />
            Monitor SOS Rombongan
            <Badge className="text-[10px] bg-orange-100 text-orange-700 border-orange-200">Tour Leader</Badge>
          </CardTitle>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {isLive
              ? <><Wifi className="h-3 w-3 text-green-500" /><span className="text-green-600">Live</span></>
              : <><WifiOff className="h-3 w-3" />Offline</>
            }
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <Users className="h-3 w-3 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground">{packageName} · {depDate}</p>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {newAlert && (
          <Alert className="border-red-400 bg-red-50 py-2 animate-pulse">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 font-bold text-xs">
              ⚠️ SOS BARU dari anggota rombongan — Segera tangani!
            </AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Aktif",    value: activeCount,                                      cls: "text-red-600" },
            { label: "Ditangani",value: alerts.filter(a => a.status === "responding").length, cls: "text-amber-600" },
            { label: "Selesai",  value: alerts.filter(a => a.status === "resolved").length,   cls: "text-green-600" },
          ].map(s => (
            <div key={s.label} className="rounded-lg bg-muted/50 py-2">
              <p className={`text-lg font-bold ${s.cls}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-5">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-muted-foreground">Semua anggota rombongan aman</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {alerts.map((a) => {
              const eType = EMERGENCY_TYPES[a.emergency_type] || EMERGENCY_TYPES.other;
              const EIcon = eType.icon;
              const sSt = SOS_STATUS[a.status] || { label: a.status, cls: "" };
              return (
                <div key={a.id}
                  className={`rounded-xl border p-3 ${a.status === "active" ? "border-red-300 bg-red-50/60 dark:bg-red-950/20" : "border-border bg-card"}`}>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <EIcon className={`h-4 w-4 shrink-0 ${eType.color}`} />
                      <div>
                        <p className="text-xs font-semibold">{a.customer?.full_name || "Jamaah"}</p>
                        <p className={`text-[10px] ${eType.color}`}>{eType.label}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${sSt.cls}`}>{sSt.label}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-2">
                    {formatDistanceToNow(parseISO(a.created_at), { locale: idLocale, addSuffix: true })}
                    {" · "}{format(parseISO(a.created_at), "HH:mm")}
                  </p>
                  <div className="flex gap-1.5">
                    {a.customer?.phone && (
                      <Button size="sm" variant="outline" className="flex-1 text-[11px] h-7" asChild>
                        <a href={`tel:${a.customer.phone}`}><Phone className="h-3 w-3 mr-1" />Telepon</a>
                      </Button>
                    )}
                    {a.latitude && a.longitude && (
                      <Button size="sm" variant="outline" className="flex-1 text-[11px] h-7"
                        onClick={() => window.open(`https://maps.google.com/maps?q=${a.latitude},${a.longitude}`, "_blank")}>
                        <MapPin className="h-3 w-3 mr-1" />Lokasi
                      </Button>
                    )}
                    {a.status !== "resolved" && (
                      <Button size="sm" className="flex-1 text-[11px] h-7"
                        onClick={() => { setSelectedAlert(a); setResponseNote(a.response_notes || ""); }}>
                        <MessageSquare className="h-3 w-3 mr-1" />Respons
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

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
    </Card>
  );
}
