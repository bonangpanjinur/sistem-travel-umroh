import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  AlertCircle, CheckCircle2, Clock, Phone, MapPin, Heart,
  Shield, HelpCircle, RefreshCcw, Eye, MessageSquare, Info,
  AlertTriangle, Wifi, WifiOff, MessageCircle
} from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const EMERGENCY_TYPES: Record<string, { label: string; icon: any; color: string }> = {
  medical:  { label: "Medis/Kesehatan", icon: Heart,        color: "text-red-600" },
  lost:     { label: "Tersesat/Hilang", icon: MapPin,       color: "text-amber-600" },
  security: { label: "Keamanan",        icon: Shield,       color: "text-orange-600" },
  other:    { label: "Lainnya",         icon: HelpCircle,   color: "text-blue-600" },
};

const SOS_STATUS: Record<string, { label: string; variant: any; color: string }> = {
  active:     { label: "Aktif",      variant: "destructive", color: "bg-red-100 text-red-800" },
  responding: { label: "Ditangani",  variant: "default",     color: "bg-amber-100 text-amber-800" },
  resolved:   { label: "Selesai",    variant: "outline",     color: "bg-green-100 text-green-800" },
};

interface SOSAlert {
  id: string;
  customer_id: string;
  booking_code: string | null;
  emergency_type: string;
  message: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  response_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  customer?: { full_name: string; phone: string | null };
}

export default function AdminSOSAlerts() {
  const queryClient   = useQueryClient();
  const [statusFilter, setStatusFilter]       = useState("all");
  const [selectedAlert, setSelectedAlert]     = useState<SOSAlert | null>(null);
  const [responseNote, setResponseNote]       = useState("");
  const [isLive, setIsLive]                   = useState(false);
  const [newAlertFlash, setNewAlertFlash]     = useState(false);

  const { data: alerts = [], isLoading, refetch } = useQuery<SOSAlert[]>({
    queryKey: ["sos-alerts", statusFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from("sos_alerts")
        .select("*, customer:customers(full_name, phone)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      const { data, error } = await query;
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return (data || []) as unknown as SOSAlert[];
    },
  });

  const triggerFlash = useCallback(() => {
    setNewAlertFlash(true);
    setTimeout(() => setNewAlertFlash(false), 4000);
    if ("vibrate" in navigator) navigator.vibrate([300, 100, 300, 100, 300]);
  }, []);

  useEffect(() => {
    const channel = (supabase as any)
      .channel("admin-sos-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sos_alerts" }, (payload: any) => {
        refetch();
        triggerFlash();
        const eType = EMERGENCY_TYPES[payload.new?.emergency_type] || EMERGENCY_TYPES.other;
        toast.error(`🆘 SOS BARU: ${eType.label}`, {
          description: "Ada jamaah membutuhkan bantuan segera!",
          duration: 10000,
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "sos_alerts" }, () => {
        refetch();
      })
      .subscribe((status: string) => {
        setIsLive(status === "SUBSCRIBED");
      });

    return () => { (supabase as any).removeChannel(channel); };
  }, [refetch, triggerFlash]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      const updates: any = { status, response_notes: notes };
      if (status === "resolved") updates.resolved_at = new Date().toISOString();
      const { error } = await (supabase as any).from("sos_alerts").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sos-alerts"] });
      setSelectedAlert(null);
      setResponseNote("");
      toast.success("Status SOS diperbarui");
    },
    onError: (e: any) => toast.error("Gagal: " + e.message),
  });

  const stats = {
    active:     alerts.filter((a) => a.status === "active").length,
    responding: alerts.filter((a) => a.status === "responding").length,
    resolved:   alerts.filter((a) => a.status === "resolved").length,
    total:      alerts.length,
  };

  const openMaps  = (lat: number, lng: number) => window.open(`https://maps.google.com/maps?q=${lat},${lng}`, "_blank");
  const callPhone = (phone: string) => { window.location.href = `tel:${phone}`; };
  const openWA    = (phone: string, name: string) => {
    const msg = encodeURIComponent(`Assalamu'alaikum ${name}, kami dari tim Vinstour merespons laporan SOS Anda. Kami segera membantu.`);
    window.open(`https://wa.me/${phone.replace(/\D/g, "").replace(/^0/, "62")}?text=${msg}`, "_blank");
  };

  return (
    <div className="space-y-6 pb-10">
      <div className={`flex items-center justify-between flex-wrap gap-4 p-4 rounded-xl transition-colors ${newAlertFlash ? "bg-red-50 border-2 border-red-400 animate-pulse" : ""}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${stats.active > 0 ? "bg-red-500/20 animate-pulse" : "bg-red-500/10"}`}>
            <AlertTriangle className={`h-6 w-6 ${stats.active > 0 ? "text-red-600" : "text-red-500"}`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Monitor SOS & Darurat</h1>
            <p className="text-muted-foreground text-sm">Pantau semua laporan darurat dari jamaah secara real-time</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${isLive ? "border-green-300 bg-green-50 text-green-700" : "border-gray-200 bg-gray-50 text-gray-500"}`}>
            {isLive ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {isLive ? "Live" : "Reconnecting..."}
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {newAlertFlash && (
        <Alert className="border-red-400 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 font-bold">
            ⚠️ SOS BARU MASUK — Tindak segera!
          </AlertDescription>
        </Alert>
      )}

      <Alert className={stats.active > 0 ? "border-red-300 bg-red-50" : ""}>
        <AlertCircle className={`h-4 w-4 ${stats.active > 0 ? "text-red-600" : ""}`} />
        <AlertDescription>
          {stats.active > 0
            ? <strong className="text-red-700">⚠️ {stats.active} laporan SOS aktif memerlukan perhatian segera!</strong>
            : <span className="text-muted-foreground">Tidak ada SOS aktif. Sistem memantau secara real-time.</span>
          }
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total SOS",  value: stats.total,     icon: AlertCircle,  color: "text-slate-600",  bg: "" },
          { label: "Aktif",      value: stats.active,    icon: AlertTriangle,color: "text-red-600",    bg: stats.active > 0 ? "border-red-300 bg-red-50" : "" },
          { label: "Ditangani",  value: stats.responding,icon: Clock,        color: "text-amber-600",  bg: "" },
          { label: "Selesai",    value: stats.resolved,  icon: CheckCircle2, color: "text-emerald-600",bg: "" },
        ].map((s) => (
          <Card key={s.label} className={s.bg}>
            <CardContent className="pt-4 flex items-center gap-3">
              <s.icon className={`h-7 w-7 ${s.color} flex-shrink-0`} />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {Object.entries(SOS_STATUS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Jamaah</TableHead>
                <TableHead>Jenis Darurat</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Memuat...</TableCell></TableRow>
              ) : !alerts.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Belum ada laporan SOS. Pastikan tabel sos_alerts sudah dibuat di Supabase.
                  </TableCell>
                </TableRow>
              ) : alerts.map((a) => {
                const EType = EMERGENCY_TYPES[a.emergency_type];
                const EIcon = EType?.icon || HelpCircle;
                return (
                  <TableRow key={a.id} className={a.status === "active" ? "bg-red-50/60" : ""}>
                    <TableCell className="text-xs">
                      <p className="font-medium">{format(parseISO(a.created_at), "dd MMM HH:mm")}</p>
                      <p className="text-muted-foreground">{formatDistanceToNow(parseISO(a.created_at), { locale: idLocale, addSuffix: true })}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{a.customer?.full_name || "-"}</p>
                      <p className="text-xs text-muted-foreground">{a.booking_code || a.customer?.phone || "-"}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <EIcon className={`h-4 w-4 ${EType?.color || "text-muted-foreground"}`} />
                        <span className="text-sm">{EType?.label || a.emergency_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {a.latitude && a.longitude ? (
                        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => openMaps(a.latitude!, a.longitude!)}>
                          <MapPin className="h-3 w-3 mr-1" />Lihat Lokasi
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Tidak tersedia</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={SOS_STATUS[a.status]?.variant || "secondary"} className="text-xs">
                        {SOS_STATUS[a.status]?.label || a.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {a.customer?.phone && (
                          <Button size="sm" variant="ghost" onClick={() => callPhone(a.customer!.phone!)} title="Telepon">
                            <Phone className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {a.customer?.phone && (
                          <Button size="sm" variant="ghost" onClick={() => openWA(a.customer!.phone!, a.customer!.full_name)} title="WhatsApp" className="text-green-600">
                            <MessageCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => { setSelectedAlert(a); setResponseNote(a.response_notes || ""); }}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedAlert} onOpenChange={(v) => { if (!v) setSelectedAlert(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Detail SOS — {selectedAlert?.customer?.full_name}
            </DialogTitle>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm bg-muted p-3 rounded-lg">
                <div><p className="text-xs text-muted-foreground">Jenis</p><p className="font-medium">{EMERGENCY_TYPES[selectedAlert.emergency_type]?.label || selectedAlert.emergency_type}</p></div>
                <div><p className="text-xs text-muted-foreground">Waktu</p><p className="font-medium">{format(parseISO(selectedAlert.created_at), "dd MMM yyyy HH:mm")}</p></div>
                <div><p className="text-xs text-muted-foreground">No. HP</p><p className="font-medium">{selectedAlert.customer?.phone || "-"}</p></div>
                <div><p className="text-xs text-muted-foreground">Kode Booking</p><p className="font-medium font-mono">{selectedAlert.booking_code || "-"}</p></div>
              </div>

              {selectedAlert.message && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Pesan Darurat</p>
                  <p className="text-sm bg-muted p-3 rounded">{selectedAlert.message}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {selectedAlert.latitude && selectedAlert.longitude && (
                  <Button variant="outline" onClick={() => openMaps(selectedAlert.latitude!, selectedAlert.longitude!)}>
                    <MapPin className="h-4 w-4 mr-2" />Lokasi Maps
                  </Button>
                )}
                {selectedAlert.customer?.phone && (
                  <Button variant="outline" onClick={() => callPhone(selectedAlert.customer!.phone!)}>
                    <Phone className="h-4 w-4 mr-2" />Telepon
                  </Button>
                )}
                {selectedAlert.customer?.phone && (
                  <Button variant="outline" className="text-green-700 border-green-300 col-span-full"
                    onClick={() => openWA(selectedAlert.customer!.phone!, selectedAlert.customer!.full_name)}>
                    <MessageCircle className="h-4 w-4 mr-2" />Hubungi via WhatsApp
                  </Button>
                )}
              </div>

              <div>
                <Label>Catatan Penanganan</Label>
                <Textarea value={responseNote} onChange={(e) => setResponseNote(e.target.value)} rows={3} placeholder="Catat tindakan yang diambil..." className="mt-1" />
              </div>

              <div className="flex gap-2">
                {selectedAlert.status !== "responding" && (
                  <Button variant="outline" className="flex-1" disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate({ id: selectedAlert.id, status: "responding", notes: responseNote })}>
                    <Clock className="h-4 w-4 mr-2" /> Tandai Ditangani
                  </Button>
                )}
                {selectedAlert.status !== "resolved" && (
                  <Button className="flex-1" disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate({ id: selectedAlert.id, status: "resolved", notes: responseNote })}>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Tandai Selesai
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
