import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2, Clock, XCircle, FileText, Loader2,
  AlertCircle, ArrowLeft, Plane, CalendarDays, Hash,
  Shield, Wifi, WifiOff, History, ChevronDown, ChevronUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { LoadingState } from "@/components/shared/LoadingState";
import { toast } from "sonner";

type VisaStatus = "pending" | "submitted" | "processing" | "approved" | "rejected";

const STATUS_CONFIG: Record<VisaStatus, {
  label: string; color: string; bg: string; icon: React.ReactNode; desc: string;
}> = {
  pending: {
    label: "Menunggu",
    color: "text-gray-600",
    bg: "bg-gray-100",
    icon: <Clock className="h-4 w-4" />,
    desc: "Permohonan visa belum diproses",
  },
  submitted: {
    label: "Terkirim",
    color: "text-blue-600",
    bg: "bg-blue-100",
    icon: <FileText className="h-4 w-4" />,
    desc: "Dokumen sedang dikirim ke kedutaan",
  },
  processing: {
    label: "Diproses",
    color: "text-amber-600",
    bg: "bg-amber-100",
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    desc: "Visa sedang diproses oleh kedutaan",
  },
  approved: {
    label: "Disetujui",
    color: "text-green-600",
    bg: "bg-green-100",
    icon: <CheckCircle2 className="h-4 w-4" />,
    desc: "Visa telah disetujui",
  },
  rejected: {
    label: "Ditolak",
    color: "text-red-600",
    bg: "bg-red-100",
    icon: <XCircle className="h-4 w-4" />,
    desc: "Permohonan visa ditolak",
  },
};

const VISA_STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu", documents_collected: "Dokumen Lengkap",
  submitted: "Diajukan", processing: "Diproses",
  approved: "Disetujui", rejected: "Ditolak", expired: "Expired",
};

const TIMELINE_STEPS: { status: VisaStatus; label: string }[] = [
  { status: "pending",    label: "Pengajuan" },
  { status: "submitted",  label: "Dokumen Terkirim" },
  { status: "processing", label: "Diproses Kedutaan" },
  { status: "approved",   label: "Visa Disetujui" },
];

const STATUS_ORDER: VisaStatus[] = ["pending", "submitted", "processing", "approved"];

function getStepIndex(status: VisaStatus): number {
  if (status === "rejected") return -1;
  return STATUS_ORDER.indexOf(status);
}

export default function JamaahVisaTracker() {
  const { user }    = useAuth();
  const queryClient = useQueryClient();
  const [isLive, setIsLive]       = useState(false);
  const [flashUpdate, setFlash]   = useState(false);
  const [showHistory, setShowHistory] = useState<Record<string, boolean>>({});

  const { data: customer } = useQuery({
    queryKey: ["jamaah-customer-visa", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("customers")
        .select("id, full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: visaApps = [], isLoading, refetch } = useQuery({
    queryKey: ["jamaah-visa-applications", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await supabase
        .from("visa_applications")
        .select(`
          *,
          departure:departures(
            departure_date, return_date, flight_number,
            package:packages(name)
          )
        `)
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("[visa] tabel belum ada atau error:", error.message);
        return [];
      }
      return data ?? [];
    },
    enabled: !!customer?.id,
  });

  const { data: visaHistory = [] } = useQuery({
    queryKey: ["jamaah-visa-history", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await supabase
        .from("visa_status_logs")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) {
        if (error.code === "42P01") return [];
        return [];
      }
      return data ?? [];
    },
    enabled: !!customer?.id,
  });

  useEffect(() => {
    if (!customer?.id) return;

    const channel = supabase
      .channel(`jamaah-visa-${customer.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "visa_applications",
        filter: `customer_id=eq.${customer.id}`,
      }, (payload: any) => {
        refetch();
        queryClient.invalidateQueries({ queryKey: ["jamaah-visa-history", customer.id] });
        setFlash(true);
        setTimeout(() => setFlash(false), 4000);

        const newStatus  = payload.new?.status as VisaStatus;
        const statusCfg  = STATUS_CONFIG[newStatus];
        if (newStatus === "approved") {
          toast.success("Visa Anda telah DISETUJUI! 🎉", { description: "Selamat, permohonan visa Anda berhasil.", duration: 8000 });
        } else if (newStatus === "rejected") {
          toast.error("Permohonan Visa Ditolak", { description: "Silakan hubungi staff kami untuk informasi lebih lanjut.", duration: 8000 });
        } else {
          toast.info(`Status visa diperbarui: ${statusCfg?.label || newStatus}`, { duration: 5000 });
        }
      })
      .subscribe((status: string) => {
        setIsLive(status === "SUBSCRIBED");
      });

    return () => { supabase.removeChannel(channel); };
  }, [customer?.id, refetch, queryClient]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link to="/jamaah">
            <Button variant="ghost" size="icon" className="text-primary-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-semibold">Status Visa</h1>
            <p className="text-xs opacity-80">Pantau proses visa Anda secara real-time</p>
          </div>
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isLive ? "bg-white/20" : "bg-white/10"}`}>
            {isLive ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5 opacity-60" />}
            <span className="opacity-80">{isLive ? "Live" : "Offline"}</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {flashUpdate && (
          <Alert className="border-green-400 bg-green-50 animate-pulse">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 font-medium">
              Status visa Anda baru saja diperbarui!
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <LoadingState />
        ) : visaApps.length === 0 ? (
          <Card className="text-center py-10">
            <CardContent>
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-muted-foreground">Belum ada permohonan visa</p>
              <p className="text-sm text-muted-foreground mt-1">
                Hubungi staff kami untuk informasi lebih lanjut
              </p>
            </CardContent>
          </Card>
        ) : (
          visaApps.map((visa: any) => {
            const status    = (visa.status ?? "pending") as VisaStatus;
            const cfg       = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
            const stepIdx   = getStepIndex(status);
            const isRejected = status === "rejected";
            const historyForVisa = visaHistory.filter((h: any) => true);

            return (
              <Card key={visa.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">
                        {visa.departure?.package?.name || "Umroh / Haji"}
                      </CardTitle>
                      {visa.departure?.departure_date && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Plane className="h-3 w-3" />
                          {format(new Date(visa.departure.departure_date), "d MMMM yyyy", { locale: localeId })}
                        </p>
                      )}
                    </div>
                    <Badge className={`${cfg.bg} ${cfg.color} border-0 gap-1`}>
                      {cfg.icon}
                      {cfg.label}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {!isRejected ? (
                    <div className="relative">
                      <div className="flex justify-between relative z-10">
                        {TIMELINE_STEPS.map((step, idx) => {
                          const done    = idx <= stepIdx;
                          const current = idx === stepIdx;
                          return (
                            <div key={step.status} className="flex flex-col items-center gap-1 flex-1">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                                done
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "bg-background border-muted-foreground/30 text-muted-foreground"
                              } ${current ? "ring-2 ring-primary/30" : ""}`}>
                                {done && idx < stepIdx ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                              </div>
                              <span className={`text-[9px] text-center leading-tight ${done ? "text-primary font-medium" : "text-muted-foreground"}`}>
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="absolute top-3.5 left-[14px] right-[14px] h-0.5 bg-muted -z-0">
                        <div className="h-full bg-primary transition-all"
                          style={{ width: `${Math.max(0, (stepIdx / (TIMELINE_STEPS.length - 1)) * 100)}%` }} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                      <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-700">Visa Ditolak</p>
                        {visa.rejection_reason && (
                          <p className="text-xs text-red-600 mt-0.5">{visa.rejection_reason}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {cfg.desc}
                  </p>

                  {status === "approved" && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1.5">
                      <p className="text-xs font-semibold text-green-700 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Detail Visa
                      </p>
                      {visa.visa_number && (
                        <div className="flex items-center gap-1.5 text-xs text-green-800">
                          <Hash className="h-3 w-3" />
                          <span className="font-mono font-medium">{visa.visa_number}</span>
                        </div>
                      )}
                      {visa.visa_expiry && (
                        <div className="flex items-center gap-1.5 text-xs text-green-800">
                          <CalendarDays className="h-3 w-3" />
                          Berlaku hingga {format(new Date(visa.visa_expiry), "d MMMM yyyy", { locale: localeId })}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs border-t pt-3">
                    <div>
                      <p className="text-muted-foreground">Tipe Visa</p>
                      <p className="font-medium capitalize">{visa.visa_type || "Umroh"}</p>
                    </div>
                    {visa.passport_number && (
                      <div>
                        <p className="text-muted-foreground">No. Paspor</p>
                        <p className="font-medium font-mono">{visa.passport_number}</p>
                      </div>
                    )}
                    {visa.submitted_at && (
                      <div>
                        <p className="text-muted-foreground">Tanggal Pengajuan</p>
                        <p className="font-medium">{format(new Date(visa.submitted_at), "d MMM yyyy", { locale: localeId })}</p>
                      </div>
                    )}
                    {visa.approved_at && (
                      <div>
                        <p className="text-muted-foreground">Tanggal Disetujui</p>
                        <p className="font-medium text-green-700">{format(new Date(visa.approved_at), "d MMM yyyy", { locale: localeId })}</p>
                      </div>
                    )}
                  </div>

                  {visa.notes && (
                    <div className="text-xs bg-muted/50 rounded p-2 text-muted-foreground">
                      <span className="font-medium">Catatan: </span>{visa.notes}
                    </div>
                  )}

                  {visaHistory.length > 0 && (
                    <div className="border-t pt-3">
                      <Button variant="ghost" size="sm" className="text-xs w-full justify-between"
                        onClick={() => setShowHistory(h => ({ ...h, [visa.id]: !h[visa.id] }))}>
                        <span className="flex items-center gap-1.5">
                          <History className="h-3.5 w-3.5" />
                          Riwayat Perubahan ({visaHistory.length})
                        </span>
                        {showHistory[visa.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>

                      {showHistory[visa.id] && (
                        <div className="mt-2 space-y-2">
                          {visaHistory.map((log: any) => (
                            <div key={log.id} className="flex items-start gap-2 text-xs p-2 bg-muted/40 rounded">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-muted-foreground">{VISA_STATUS_LABELS[log.old_status] || log.old_status || "—"}</span>
                                  <span className="text-muted-foreground">→</span>
                                  <span className="font-medium">{VISA_STATUS_LABELS[log.new_status] || log.new_status}</span>
                                </div>
                                <p className="text-muted-foreground mt-0.5">{format(new Date(log.created_at), "dd MMM yyyy, HH:mm")}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <JamaahBottomNav />
    </div>
  );
}
