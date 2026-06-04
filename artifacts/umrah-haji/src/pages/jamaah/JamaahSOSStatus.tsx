import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowLeft, CheckCircle2, Clock, Heart,
  HelpCircle, Loader2, MapPin, MessageSquare, Phone,
  RefreshCcw, Shield, Wifi, WifiOff
} from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const EMERGENCY_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  medical:  { label: "Medis / Kesehatan", icon: Heart,       color: "text-red-600 bg-red-100" },
  lost:     { label: "Tersesat / Hilang", icon: MapPin,      color: "text-amber-600 bg-amber-100" },
  security: { label: "Keamanan",          icon: Shield,      color: "text-orange-600 bg-orange-100" },
  other:    { label: "Lainnya",           icon: HelpCircle,  color: "text-blue-600 bg-blue-100" },
};

const STATUS_STEPS = [
  { key: "active",     label: "SOS Terkirim",         desc: "Tim kami sudah menerima laporan darurat Anda",  icon: AlertTriangle, color: "text-red-600" },
  { key: "responding", label: "Sedang Ditangani",      desc: "Petugas sedang dalam perjalanan membantu Anda", icon: Clock,         color: "text-amber-600" },
  { key: "resolved",  label: "Selesai Ditangani",      desc: "Situasi darurat telah berhasil ditangani",      icon: CheckCircle2,  color: "text-green-600" },
];

export default function JamaahSOSStatus() {
  const { user } = useAuth();
  const [isLive, setIsLive]       = useState(false);
  const [flashNew, setFlashNew]   = useState(false);

  const { data: customer } = useQuery({
    queryKey: ["jamaah-sos-customer", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("customers").select("id, full_name, phone").eq("user_id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: alerts = [], isLoading, refetch } = useQuery({
    queryKey: ["jamaah-sos-alerts", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await supabase
        .from("sos_alerts")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data ?? [];
    },
    enabled: !!customer?.id,
  });

  useEffect(() => {
    if (!customer?.id) return;
    const channel = supabase
      .channel(`jamaah-sos-${customer.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "sos_alerts",
        filter: `customer_id=eq.${customer.id}`,
      }, (payload: any) => {
        refetch();
        setFlashNew(true);
        const newStatus = payload.new?.status;
        if (newStatus === "responding") {
          toast.success("Petugas sedang menuju lokasi Anda!", { duration: 6000 });
        } else if (newStatus === "resolved") {
          toast.success("SOS Anda telah selesai ditangani. Terima kasih!", { duration: 6000 });
        }
        setTimeout(() => setFlashNew(false), 3000);
      })
      .subscribe((status: string) => {
        setIsLive(status === "SUBSCRIBED");
      });

    return () => { supabase.removeChannel(channel); };
  }, [customer?.id, refetch]);

  const activeAlert = alerts.find((a: any) => a.status !== "resolved");
  const latestAlert = alerts[0];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-red-600 text-white p-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link to="/jamaah">
            <Button variant="ghost" size="icon" className="text-white hover:bg-red-700">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-semibold">Status SOS Darurat</h1>
            <p className="text-xs opacity-80">Pantau penanganan laporan darurat Anda</p>
          </div>
          <div className="flex items-center gap-1 text-xs">
            {isLive ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5 opacity-60" />}
            <span className="opacity-80">{isLive ? "Live" : "Offline"}</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {flashNew && (
          <Alert className="border-green-400 bg-green-50 animate-pulse">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 font-medium">Status laporan Anda baru saja diperbarui!</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-red-500" />
          </div>
        ) : alerts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="font-medium text-muted-foreground">Belum Ada Laporan SOS</p>
              <p className="text-sm text-muted-foreground mt-1">Tombol SOS ada di halaman utama portal Anda</p>
              <Link to="/jamaah">
                <Button className="mt-4" variant="outline">Kembali ke Portal</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {activeAlert && (
              <Alert className="border-red-400 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Ada laporan SOS aktif.</strong> Tim kami sedang memantau situasi Anda. Tetap tenang.
                </AlertDescription>
              </Alert>
            )}

            {latestAlert && (
              <Card className={`border-2 ${latestAlert.status === "active" ? "border-red-400" : latestAlert.status === "responding" ? "border-amber-400" : "border-green-400"}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {(() => {
                        const eType = EMERGENCY_LABELS[latestAlert.emergency_type] || EMERGENCY_LABELS.other;
                        const EIcon = eType.icon;
                        return (
                          <>
                            <span className={`p-1.5 rounded-full ${eType.color}`}>
                              <EIcon className="h-4 w-4" />
                            </span>
                            {eType.label}
                          </>
                        );
                      })()}
                    </CardTitle>
                    <Badge className={
                      latestAlert.status === "active" ? "bg-red-600 text-white" :
                      latestAlert.status === "responding" ? "bg-amber-500 text-white" :
                      "bg-green-600 text-white"
                    }>
                      {latestAlert.status === "active" ? "Aktif" : latestAlert.status === "responding" ? "Ditangani" : "Selesai"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(parseISO(latestAlert.created_at), { locale: idLocale, addSuffix: true })} ·{" "}
                    {format(parseISO(latestAlert.created_at), "dd MMM yyyy, HH:mm")}
                  </p>
                </CardHeader>

                <CardContent className="space-y-4">
                  {latestAlert.message && (
                    <div className="bg-muted p-3 rounded-lg text-sm">
                      <p className="text-muted-foreground text-xs mb-1">Pesan Anda</p>
                      <p>{latestAlert.message}</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {STATUS_STEPS.map((step, idx) => {
                      const currentIdx = STATUS_STEPS.findIndex(s => s.key === latestAlert.status);
                      const isDone    = idx <= currentIdx;
                      const isCurrent = idx === currentIdx;
                      const SIcon     = step.icon;
                      return (
                        <div key={step.key} className="flex items-start gap-3">
                          <div className={`mt-0.5 p-1.5 rounded-full flex-shrink-0 ${isDone ? "bg-green-100" : "bg-muted"}`}>
                            <SIcon className={`h-4 w-4 ${isDone ? step.color : "text-muted-foreground"}`} />
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${isCurrent ? "text-foreground" : isDone ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
                              {step.label}
                              {isCurrent && <span className="ml-2 text-xs font-normal text-muted-foreground animate-pulse">● saat ini</span>}
                            </p>
                            {isDone && <p className="text-xs text-muted-foreground">{step.desc}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {latestAlert.response_notes && (
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                      <p className="text-xs text-blue-600 font-medium mb-1 flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> Catatan dari Tim
                      </p>
                      <p className="text-sm">{latestAlert.response_notes}</p>
                    </div>
                  )}

                  {latestAlert.latitude && latestAlert.longitude && (
                    <Button variant="outline" className="w-full" onClick={() =>
                      window.open(`https://maps.google.com/maps?q=${latestAlert.latitude},${latestAlert.longitude}`, "_blank")
                    }>
                      <MapPin className="h-4 w-4 mr-2" /> Lokasi yang Dilaporkan
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {alerts.length > 1 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground px-1">Riwayat SOS</p>
                {alerts.slice(1).map((a: any) => (
                  <Card key={a.id} className="opacity-70">
                    <CardContent className="py-3 px-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{EMERGENCY_LABELS[a.emergency_type]?.label || a.emergency_type}</p>
                        <p className="text-xs text-muted-foreground">{format(parseISO(a.created_at), "dd MMM yyyy, HH:mm")}</p>
                      </div>
                      <Badge variant="outline" className="text-xs text-green-700 border-green-300">Selesai</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => refetch()}>
                <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
              </Button>
              <Button variant="destructive" className="flex-1" asChild>
                <a href="tel:+62112">
                  <Phone className="h-4 w-4 mr-2" /> Darurat 112
                </a>
              </Button>
            </div>
          </>
        )}
      </div>
      <JamaahBottomNav />
    </div>
  );
}
