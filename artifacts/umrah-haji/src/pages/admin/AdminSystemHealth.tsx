import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Activity, Bot, CreditCard, RefreshCw, Play, CheckCircle2,
  XCircle, HelpCircle, AlertCircle, Clock, Zap, Calendar,
  Bell, BellRing, ChevronRight, Loader2, Shield,
} from "lucide-react";

const API_SYS = "/api/v1/system";
const API_ALERTS_ACK = "/api/v1/settings/integrations/alerts/ack";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceHealth {
  status: "ok" | "error" | "unconfigured" | "unknown";
  lastTested: string | null;
  message: string;
  configured: boolean;
}

interface CronJob {
  name: string;
  schedule: string;
  description: string;
}

interface Alert {
  id: string;
  service: string;
  title: string;
  message: string;
  ts: string;
}

interface SystemHealthData {
  services: Record<string, ServiceHealth>;
  alerts: Alert[];
  cronJobs: CronJob[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SERVICE_META: Record<string, { label: string; icon: React.ReactNode }> = {
  gemini:   { label: "Google Gemini AI",        icon: <Bot className="h-4 w-4 text-purple-500" /> },
  midtrans: { label: "Midtrans Payment Gateway", icon: <CreditCard className="h-4 w-4 text-blue-500" /> },
};

function StatusBadge({ status }: { status: ServiceHealth["status"] }) {
  const cfg = {
    ok:            { label: "Terhubung",          cls: "bg-green-100 text-green-700",  Icon: CheckCircle2 },
    error:         { label: "Error",              cls: "bg-red-100 text-red-700",      Icon: XCircle },
    unconfigured:  { label: "Belum dikonfigurasi",cls: "bg-slate-100 text-slate-500",  Icon: AlertCircle },
    unknown:       { label: "Belum ditest",       cls: "bg-amber-100 text-amber-600",  Icon: HelpCircle },
  }[status] ?? { label: status, cls: "bg-muted text-muted-foreground", Icon: HelpCircle };
  const { label, cls, Icon } = cfg;
  return (
    <Badge className={`${cls} border-0 gap-1 text-xs`}>
      <Icon className="h-3 w-3" /> {label}
    </Badge>
  );
}

function StatusDot({ status }: { status: ServiceHealth["status"] }) {
  if (status === "ok") return (
    <span className="relative flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-50" />
      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
    </span>
  );
  if (status === "error")        return <span className="inline-flex rounded-full h-3 w-3 bg-red-500" />;
  if (status === "unconfigured") return <span className="inline-flex rounded-full h-3 w-3 bg-slate-300" />;
  return <span className="inline-flex rounded-full h-3 w-3 bg-amber-400" />;
}

function ts(iso: string | null) {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "dd MMM yyyy, HH:mm:ss", { locale: idLocale });
  } catch { return iso; }
}

function relTs(iso: string | null) {
  if (!iso) return null;
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: idLocale });
  } catch { return null; }
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminSystemHealth() {
  const qc = useQueryClient();
  const [running, setRunning]         = useState(false);
  const [runResult, setRunResult]     = useState<{ ok: boolean; elapsed: number; services: Record<string, { status: string; lastTested: string | null; message: string }> } | null>(null);
  const [ackingAll, setAckingAll]     = useState(false);

  const { data, isLoading, refetch, dataUpdatedAt } = useQuery<SystemHealthData>({
    queryKey: ["system-health"],
    queryFn:  () => fetch(`${API_SYS}/health`).then(r => r.json()),
    staleTime: 0,
    refetchInterval: 30_000,
  });

  async function runHealthCheck() {
    setRunning(true);
    setRunResult(null);
    try {
      const r = await fetch(`${API_SYS}/health-check/run`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menjalankan health check");
      setRunResult(d);
      toast.success(
        `Health check selesai (${d.elapsed}ms) — ${
          Object.values(d.services).filter((s: any) => s.status === "ok").length
        } service OK`,
      );
      refetch();
      qc.invalidateQueries({ queryKey: ["integration-health"] });
    } catch (e: any) {
      toast.error(`Gagal: ${e.message}`);
      setRunResult({ ok: false, elapsed: 0, services: {} });
    }
    setRunning(false);
  }

  async function ackAllAlerts() {
    setAckingAll(true);
    try {
      await fetch(API_ALERTS_ACK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [] }),
      });
      toast.success("Semua alert telah dihapus");
      refetch();
    } catch {
      toast.error("Gagal menghapus alert");
    }
    setAckingAll(false);
  }

  const services  = data?.services  ?? {};
  const alerts    = data?.alerts    ?? [];
  const cronJobs  = data?.cronJobs  ?? [];
  const allOk     = Object.values(services).every(s => s.status === "ok");
  const hasError  = Object.values(services).some(s => s.status === "error");
  const configured = Object.values(services).filter(s => s.configured).length;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            System Health
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Monitor konektivitas integrasi dan jalankan health check manual kapan saja.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={runHealthCheck}
            disabled={running || configured === 0}
            className="gap-1.5"
            title={configured === 0 ? "Belum ada API key yang dikonfigurasi" : undefined}
          >
            {running
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Play className="h-3.5 w-3.5" />}
            Test Ulang Sekarang
          </Button>
        </div>
      </div>

      {/* Last updated */}
      {dataUpdatedAt > 0 && (
        <p className="text-xs text-muted-foreground -mt-2">
          Terakhir diperbarui: {relTs(new Date(dataUpdatedAt).toISOString())} · Auto-refresh setiap 30 detik
        </p>
      )}

      {/* Run result banner */}
      {runResult && (
        <Card className={runResult.ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <CardContent className="py-3 px-4 flex items-center gap-3 text-sm">
            {runResult.ok
              ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              : <XCircle className="h-4 w-4 text-red-600 shrink-0" />}
            <span className={runResult.ok ? "text-green-800" : "text-red-800"}>
              {runResult.ok
                ? `Health check selesai dalam ${runResult.elapsed}ms.`
                : "Health check gagal dijalankan."}
            </span>
          </CardContent>
        </Card>
      )}

      {/* Service status cards */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Status Integrasi
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(SERVICE_META).map(([svc, meta]) => {
            const h = services[svc];
            const r = runResult?.services?.[svc];
            const displayStatus = (r?.status ?? h?.status ?? "unknown") as ServiceHealth["status"];
            const displayMsg    = r?.message ?? h?.message ?? "";
            const displayTs     = r?.lastTested ?? h?.lastTested ?? null;

            return (
              <Card key={svc} className={
                displayStatus === "ok"    ? "border-green-200" :
                displayStatus === "error" ? "border-red-200"   : "border-border"
              }>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <StatusDot status={displayStatus} />
                      {meta.icon}
                      {meta.label}
                    </span>
                    <StatusBadge status={displayStatus} />
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span>
                      {displayTs
                        ? <>Ditest {relTs(displayTs)} · <span className="font-mono">{ts(displayTs)}</span></>
                        : "Belum pernah ditest"}
                    </span>
                  </div>
                  {displayMsg && (
                    <p className={`text-xs pl-4 ${displayStatus === "error" ? "text-red-600" : "text-muted-foreground"}`}>
                      {displayMsg}
                    </p>
                  )}
                  {!h?.configured && (
                    <div className="flex items-center gap-1 text-xs text-amber-600 pl-4">
                      <AlertCircle className="h-3 w-3" />
                      API key belum dikonfigurasi —{" "}
                      <a href="/admin/integration-settings" className="underline hover:no-underline">
                        Atur di sini
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Alert queue */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            {alerts.length > 0
              ? <BellRing className="h-4 w-4 text-orange-500" />
              : <Bell className="h-4 w-4" />}
            Alert Belum Dibaca ({alerts.length})
          </h2>
          {alerts.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={ackAllAlerts}
              disabled={ackingAll}
              className="gap-1.5 h-7 text-xs text-muted-foreground"
            >
              {ackingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              Hapus semua
            </Button>
          )}
        </div>

        {alerts.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Tidak ada alert — semua integrasi normal</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map(alert => (
              <Card key={alert.id} className="border-orange-200 bg-orange-50">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-3">
                    <Zap className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-orange-900">{alert.title}</p>
                      <p className="text-xs text-orange-700 mt-0.5">{alert.message}</p>
                      <p className="text-[11px] text-orange-500 mt-1 font-mono">{ts(alert.ts)}</p>
                    </div>
                    <Badge className="bg-orange-100 text-orange-700 border-0 text-xs shrink-0">
                      {SERVICE_META[alert.service]?.label ?? alert.service}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Cron job schedule */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Jadwal Cron Job
        </h2>
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {cronJobs.map((job, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{job.name}</p>
                    <p className="text-xs text-muted-foreground">{job.description}</p>
                  </div>
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono shrink-0">
                    {job.schedule}
                  </code>
                  <Badge className="bg-green-100 text-green-700 border-0 text-xs gap-1 shrink-0">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                    </span>
                    Aktif
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info footer */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-3 px-4 flex items-start gap-3">
          <Shield className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800 space-y-1">
            <p>
              <strong>Cara kerja:</strong> Cron job berjalan setiap jam dan memeriksa koneksi ke setiap layanan yang dikonfigurasi.
              Jika status berubah dari <em>Terhubung</em> ke <em>Error</em>, notifikasi otomatis dikirim ke bell admin.
            </p>
            <p>
              <strong>Test Ulang Sekarang</strong> menjalankan pemeriksaan yang sama secara manual tanpa menunggu jadwal berikutnya.
              Hasil tersimpan ke database dan memperbarui dashboard ini.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
