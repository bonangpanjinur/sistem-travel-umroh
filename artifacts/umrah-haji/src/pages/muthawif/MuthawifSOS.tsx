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
  Loader2, MapPin, Phone, Shield, Wifi, WifiOff, MessageSquare
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
  responding: { label: "Ditangani", cls: "bg-amber-100 text-amber-800 border-amber-300" },
  resolved:   { label: "Selesai",   cls: "bg-green-100 text-green-800 border-green-300" },
};

interface SOSAlert {
  id: string;
  customer_id: string;
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

export default function MuthawifSOS() {
  const { user }        = useAuth();
  const queryClient     = useQueryClient();
  const [isLive, setIsLive]                   = useState(false);
  const [newAlert, setNewAlert]               = useState(false);
  const [selectedAlert, setSelectedAlert]     = useState<SOSAlert | null>(null);
  const [responseNote, setResponseNote]       = useState("");
  const [statusFilter, setStatusFilter]       = useState<"all" | "active" | "responding" | "resolved">("active");

  const { data: alerts = [], isLoading, refetch } = useQuery<SOSAlert[]>({
    queryKey: ["muthawif-sos", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("sos_alerts")
        .select("*, customer:customers(full_name, phone)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return (data || []) as unknown as SOSAlert[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("muthawif-sos-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sos_alerts" }, (payload: any) => {
        refetch();
        setNewAlert(true);
        const eType = EMERGENCY_TYPES[payload.new?.emergency_type] || EMERGENCY_TYPES.other;
        toast.error(`🆘 SOS Baru: ${eType.label}`, {
          description: "Ada jamaah membutuhkan pertolongan segera!",
          duration: 8000,
        });
        if ("vibrate" in navigator) navigator.vibrate([400, 100, 400, 100, 400]);
        setTimeout(() => setNewAlert(false), 5000);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "sos_alerts" }, () => {
        refetch();
      })
      .subscribe((status: string) => {
        setIsLive(status === "SUBSCRIBED");
      });

    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      const updates: any = { status, response_notes: notes };
      if (status === "resolved") updates.resolved_at = new Date().toISOString();
      const { error } = await supabase.from("sos_alerts").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["muthawif-sos"] });
      setSelectedAlert(null);
      setResponseNote("");
      toast.success("Status SOS diperbarui");
    },
    onError: (e: any) => toast.error("Gagal: " + e.message),
  });

  const activeCount     = alerts.filter(a => a.status === "active").length;
  const respondingCount = alerts.filter(a => a.status === "responding").length;

  return (
    <div className="min-h-screen bg-background">
      <div className={`text-white p-4 sticky top-0 z-50 ${newAlert ? "bg-red-700 animate-pulse" : "bg-red-600"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-semibold">Monitor SOS</h1>
              <p className="text-xs opacity-80">Panel Respons Darurat Muthawif</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs bg-white/20 px-2 py-1 rounded-full">
            {isLive ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5 opacity-60" />}
            <span>{isLive ? "Live" : "Offline"}</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {newAlert && (
          <Alert className="border-red-400 bg-red-50 animate-bounce">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 font-bold">
              ⚠️ SOS BARU MASUK — Segera tangani!
            </AlertDescription>
          </Alert>
        )}

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

        <div className="flex gap-2 flex-wrap">
          {(["active", "responding", "all", "resolved"] as const).map(f => (
            <Button key={f} size="sm" variant={statusFilter === f ? "default" : "outline"} onClick={() => setStatusFilter(f)} className="text-xs">
              {f === "active" ? "Aktif" : f === "responding" ? "Ditangani" : f === "resolved" ? "Selesai" : "Semua"}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-red-500" />
          </div>
        ) : alerts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="font-medium">Tidak ada SOS aktif</p>
              <p className="text-sm text-muted-foreground mt-1">Semua jamaah dalam kondisi aman</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {alerts.map((a) => {
              const eType = EMERGENCY_TYPES[a.emergency_type] || EMERGENCY_TYPES.other;
              const EIcon = eType.icon;
              const sSt   = SOS_STATUS[a.status] || { label: a.status, cls: "" };
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

                    <p className="text-xs text-muted-foreground mb-3">
                      {formatDistanceToNow(parseISO(a.created_at), { locale: idLocale, addSuffix: true })}
                      {" · "}{format(parseISO(a.created_at), "HH:mm")}
                    </p>

                    {a.message && (
                      <p className="text-sm bg-background border rounded p-2 mb-3 line-clamp-2">{a.message}</p>
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
                      <Button size="sm" className="flex-1 text-xs" onClick={() => { setSelectedAlert(a); setResponseNote(a.response_notes || ""); }}>
                        <MessageSquare className="h-3.5 w-3.5 mr-1" />Respons
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

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
                <div><p className="text-xs text-muted-foreground">No. HP</p><p className="font-medium">{selectedAlert.customer?.phone || "-"}</p></div>
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
                <Textarea value={responseNote} onChange={e => setResponseNote(e.target.value)} rows={3} placeholder="Catat tindakan yang Anda ambil..." className="mt-1" />
              </div>

              <div className="flex gap-2">
                {selectedAlert.status !== "responding" && (
                  <Button variant="outline" className="flex-1"
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate({ id: selectedAlert.id, status: "responding", notes: responseNote })}>
                    <Clock className="h-4 w-4 mr-1" /> Saya Tangani
                  </Button>
                )}
                {selectedAlert.status !== "resolved" && (
                  <Button className="flex-1"
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate({ id: selectedAlert.id, status: "resolved", notes: responseNote })}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Selesai
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
