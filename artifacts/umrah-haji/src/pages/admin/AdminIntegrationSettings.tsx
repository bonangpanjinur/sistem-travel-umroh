import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Key, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, Save,
  Zap, CreditCard, Mail, Bot, ExternalLink, Info, Shield,
  Activity, RefreshCw, XCircle, HelpCircle, Radio,
} from "lucide-react";

const API = "/api/v1/settings/integrations";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IntegrationData {
  settings: Record<string, string>;
  isSet: Record<string, boolean>;
  envStatus: Record<string, boolean>;
}

interface ServiceHealth {
  status: "ok" | "error" | "unconfigured" | "unknown";
  lastTested: string | null;
  message: string;
  configured: boolean;
}

interface HealthData {
  services: Record<string, ServiceHealth>;
}

// ─── Health Dashboard ─────────────────────────────────────────────────────────

const SERVICE_META: Record<string, { label: string; icon: React.ReactNode }> = {
  gemini: { label: "Google Gemini AI", icon: <Bot className="h-4 w-4" /> },
  midtrans: { label: "Midtrans Payment", icon: <CreditCard className="h-4 w-4" /> },
};

function StatusDot({ status }: { status: ServiceHealth["status"] }) {
  if (status === "ok") return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-50" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
    </span>
  );
  if (status === "error") return <span className="inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />;
  if (status === "unconfigured") return <span className="inline-flex rounded-full h-2.5 w-2.5 bg-slate-300" />;
  return <span className="inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />;
}

function StatusBadge({ status }: { status: ServiceHealth["status"] }) {
  if (status === "ok") return (
    <Badge className="bg-green-100 text-green-700 border-0 gap-1 text-xs">
      <CheckCircle2 className="h-3 w-3" /> Terhubung
    </Badge>
  );
  if (status === "error") return (
    <Badge className="bg-red-100 text-red-700 border-0 gap-1 text-xs">
      <XCircle className="h-3 w-3" /> Error
    </Badge>
  );
  if (status === "unconfigured") return (
    <Badge className="bg-slate-100 text-slate-500 border-0 gap-1 text-xs">
      <AlertCircle className="h-3 w-3" /> Belum dikonfigurasi
    </Badge>
  );
  return (
    <Badge className="bg-amber-100 text-amber-600 border-0 gap-1 text-xs">
      <HelpCircle className="h-3 w-3" /> Belum ditest
    </Badge>
  );
}

function HealthDashboard({
  healthData,
  healthLoading,
  onRefresh,
  onTestService,
}: {
  healthData: HealthData | undefined;
  healthLoading: boolean;
  onRefresh: () => void;
  onTestService: (svc: string) => Promise<void>;
}) {
  const [testingAll, setTestingAll] = useState(false);
  const [testingService, setTestingService] = useState<string | null>(null);

  const services = healthData?.services ?? {};
  const allOk = Object.values(services).length > 0 && Object.values(services).every(s => s.status === "ok");
  const hasError = Object.values(services).some(s => s.status === "error");
  const configuredCount = Object.values(services).filter(s => s.configured).length;

  async function testAll() {
    setTestingAll(true);
    for (const svc of Object.keys(SERVICE_META)) {
      if (services[svc]?.configured) {
        setTestingService(svc);
        await onTestService(svc);
      }
    }
    setTestingService(null);
    setTestingAll(false);
    onRefresh();
  }

  async function testOne(svc: string) {
    setTestingService(svc);
    await onTestService(svc);
    setTestingService(null);
    onRefresh();
  }

  const summaryColor = allOk
    ? "border-green-200 bg-green-50"
    : hasError
    ? "border-red-200 bg-red-50"
    : "border-border bg-muted/30";

  return (
    <Card className={`${summaryColor} transition-colors`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Status Koneksi
          </CardTitle>
          <div className="flex items-center gap-2">
            {configuredCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={testAll}
                disabled={testingAll || configuredCount === 0}
                className="gap-1.5 h-7 text-xs"
              >
                {testingAll
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Radio className="h-3 w-3" />}
                Test Semua ({configuredCount})
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={onRefresh}
              disabled={healthLoading}
              className="h-7 w-7 p-0"
              title="Refresh status"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${healthLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
        <CardDescription className="text-xs">
          {allOk
            ? "Semua integrasi aktif dan terhubung"
            : hasError
            ? "Terdapat integrasi yang gagal — periksa konfigurasi"
            : "Klik \"Test\" pada masing-masing layanan untuk verifikasi koneksi"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(SERVICE_META).map(([svc, meta]) => {
            const health = services[svc];
            const isTesting = testingService === svc;
            const canTest = !!health?.configured;

            return (
              <div
                key={svc}
                className="flex items-center justify-between rounded-lg border bg-background p-3 gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <StatusDot status={health?.status ?? "unknown"} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      {meta.icon}
                      <span className="truncate">{meta.label}</span>
                    </div>
                    {health?.lastTested ? (
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        Terakhir ditest:{" "}
                        {formatDistanceToNow(new Date(health.lastTested), {
                          addSuffix: true,
                          locale: idLocale,
                        })}
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground mt-0.5">Belum pernah ditest</p>
                    )}
                    {health?.status === "error" && health.message && (
                      <p className="text-[11px] text-red-600 mt-0.5 truncate" title={health.message}>
                        {health.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <StatusBadge status={health?.status ?? "unknown"} />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => testOne(svc)}
                    disabled={isTesting || !canTest || testingAll}
                    className="h-6 text-[11px] px-2 gap-1"
                    title={!canTest ? "Konfigurasi dulu API key-nya" : "Test koneksi sekarang"}
                  >
                    {isTesting
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Zap className="h-3 w-3" />}
                    Test
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Service Card ─────────────────────────────────────────────────────────────

interface ServiceCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  fields: {
    key: string;
    label: string;
    placeholder: string;
    sensitive?: boolean;
    type?: "text" | "select";
    options?: { value: string; label: string }[];
  }[];
  testService?: string;
  docLink?: string;
  values: Record<string, string>;
  isSet: Record<string, boolean>;
  envStatus: Record<string, boolean>;
  onChange: (key: string, val: string) => void;
  onSave: (keys: string[]) => void;
  onTest?: (svc: string) => Promise<void>;
  saving: boolean;
}

function ServiceCard({
  title, description, icon, fields, testService, docLink,
  values, isSet, envStatus, onChange, onSave, onTest, saving,
}: ServiceCardProps) {
  const [showMap, setShowMap] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const configuredCount = fields.filter(f => isSet[f.key]).length;
  const isConfigured = configuredCount === fields.length;
  const isPartial = configuredCount > 0 && !isConfigured;

  async function handleTest() {
    if (!testService || !onTest) return;
    setTesting(true);
    setTestResult(null);
    try {
      await onTest(testService);
      setTestResult({ ok: true, message: "Berhasil — lihat dashboard status" });
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message });
    }
    setTesting(false);
  }

  return (
    <Card className={isConfigured ? "border-green-200" : isPartial ? "border-amber-200" : "border-border"}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {envStatus[fields[0]?.key] && (
              <Badge className="bg-blue-100 text-blue-700 border-0 text-xs gap-1">
                <Shield className="h-3 w-3" /> Env Secret
              </Badge>
            )}
            {isConfigured ? (
              <Badge className="bg-green-100 text-green-700 border-0 text-xs gap-1">
                <CheckCircle2 className="h-3 w-3" /> Terkonfigurasi
              </Badge>
            ) : isPartial ? (
              <Badge className="bg-amber-100 text-amber-700 border-0 text-xs gap-1">
                <AlertCircle className="h-3 w-3" /> Sebagian
              </Badge>
            ) : (
              <Badge className="bg-muted text-muted-foreground border-0 text-xs gap-1">
                <AlertCircle className="h-3 w-3" /> Belum dikonfigurasi
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="flex items-center justify-between">
          <span>{description}</span>
          {docLink && (
            <a href={docLink} target="_blank" rel="noopener noreferrer"
              className="text-xs text-primary flex items-center gap-1 hover:underline ml-2 shrink-0">
              Dokumentasi <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {fields.map(f => (
          <div key={f.key} className="space-y-1.5">
            <Label htmlFor={f.key} className="text-sm">
              {f.label}
              {isSet[f.key] && (
                <span className="ml-2 text-xs text-green-600 font-normal">
                  <CheckCircle2 className="inline h-3 w-3 mr-0.5" />
                  {envStatus[f.key] ? "Dari Env Secret" : "Tersimpan"}
                </span>
              )}
            </Label>
            {f.type === "select" && f.options ? (
              <Select value={values[f.key] || "sandbox"} onValueChange={v => onChange(f.key, v)}>
                <SelectTrigger id={f.key} className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {f.options.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="relative">
                <Input
                  id={f.key}
                  type={f.sensitive && !showMap[f.key] ? "password" : "text"}
                  value={values[f.key] || ""}
                  onChange={e => onChange(f.key, e.target.value)}
                  placeholder={isSet[f.key] ? "••••••••• (tersimpan — kosongkan untuk tidak mengubah)" : f.placeholder}
                  className="text-sm pr-10"
                />
                {f.sensitive && (
                  <button
                    type="button"
                    onClick={() => setShowMap(p => ({ ...p, [f.key]: !p[f.key] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showMap[f.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => onSave(fields.map(f => f.key))}
            disabled={saving}
            className="gap-1.5"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Simpan
          </Button>
          {testService && onTest && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleTest}
              disabled={testing || !isSet[fields[0]?.key]}
              className="gap-1.5"
            >
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              Test Koneksi
            </Button>
          )}
          {testResult && (
            <span className={`text-xs flex items-center gap-1 ${testResult.ok ? "text-green-600" : "text-red-600"}`}>
              {testResult.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
              {testResult.message}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminIntegrationSettings() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const { data, isLoading, refetch: refetchSettings } = useQuery<IntegrationData>({
    queryKey: ["integration-settings"],
    queryFn: () => fetch(API).then(r => r.json()),
    staleTime: 30_000,
  });

  const { data: healthData, isLoading: healthLoading, refetch: refetchHealth } = useQuery<HealthData>({
    queryKey: ["integration-health"],
    queryFn: () => fetch(`${API}/health`).then(r => r.json()),
    staleTime: 0,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (data?.settings) {
      setValues(data.settings);
    }
  }, [data]);

  async function handleSave(keys: string[]) {
    setSaving(keys[0]);
    try {
      const payload: Record<string, string> = {};
      for (const k of keys) payload[k] = values[k] ?? "";
      const r = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan");
      toast.success(`Konfigurasi berhasil disimpan (${d.saved} item)`);
      refetchSettings();
    } catch (e: any) {
      toast.error(`Gagal: ${e.message}`);
    }
    setSaving(null);
  }

  const handleTest = useCallback(async (svc: string) => {
    const r = await fetch(`${API}/test/${svc}`, { method: "POST" });
    const d = await r.json();
    if (d.ok) {
      toast.success(`${svc}: Koneksi berhasil!`);
    } else {
      toast.error(`${svc}: ${d.error || "Test gagal"}`);
      throw new Error(d.error || "Test gagal");
    }
    refetchHealth();
  }, [refetchHealth]);

  const onChange = (key: string, val: string) => setValues(p => ({ ...p, [key]: val }));
  const isSet = data?.isSet ?? {};
  const envStatus = data?.envStatus ?? {};

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Key className="h-6 w-6 text-primary" />
          Pengaturan Integrasi
        </h1>
        <p className="text-muted-foreground mt-1">
          Kelola API key layanan eksternal dari panel admin — tersimpan aman di database, tidak perlu akses server.
        </p>
      </div>

      {/* Health Dashboard */}
      <HealthDashboard
        healthData={healthData}
        healthLoading={healthLoading}
        onRefresh={() => { refetchHealth(); refetchSettings(); }}
        onTestService={handleTest}
      />

      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          <strong>Prioritas:</strong> API key yang disimpan di sini akan digunakan jika Environment Secret tidak dikonfigurasi.
          Environment Secret selalu diutamakan. Nilai sensitif ditampilkan sebagai <code>••••</code> demi keamanan.
        </AlertDescription>
      </Alert>

      {/* Gemini AI */}
      <ServiceCard
        title="Google Gemini AI"
        description="Chatbot AI untuk website publik dan portal jamaah"
        icon={<Bot className="h-4 w-4 text-purple-500" />}
        docLink="https://aistudio.google.com/apikey"
        testService="gemini"
        fields={[
          {
            key: "integration_gemini_api_key",
            label: "Gemini API Key",
            placeholder: "AIzaSy...",
            sensitive: true,
          },
        ]}
        values={values}
        isSet={isSet}
        envStatus={envStatus}
        onChange={onChange}
        onSave={handleSave}
        onTest={handleTest}
        saving={saving === "integration_gemini_api_key"}
      />

      <Separator />

      {/* OpenAI */}
      <ServiceCard
        title="OpenAI"
        description="Fallback AI jika Gemini tidak tersedia (opsional)"
        icon={<Zap className="h-4 w-4 text-emerald-500" />}
        docLink="https://platform.openai.com/api-keys"
        fields={[
          {
            key: "integration_openai_api_key",
            label: "OpenAI API Key",
            placeholder: "sk-...",
            sensitive: true,
          },
        ]}
        values={values}
        isSet={isSet}
        envStatus={envStatus}
        onChange={onChange}
        onSave={handleSave}
        saving={saving === "integration_openai_api_key"}
      />

      <Separator />

      {/* Midtrans */}
      <ServiceCard
        title="Midtrans Payment Gateway"
        description="Gateway pembayaran online (kartu kredit, GoPay, QRIS, virtual account)"
        icon={<CreditCard className="h-4 w-4 text-blue-500" />}
        docLink="https://dashboard.midtrans.com/settings/config_info"
        testService="midtrans"
        fields={[
          {
            key: "integration_midtrans_mode",
            label: "Mode",
            placeholder: "",
            type: "select",
            options: [
              { value: "sandbox", label: "Sandbox (Testing)" },
              { value: "production", label: "Production (Live)" },
            ],
          },
          {
            key: "integration_midtrans_server_key",
            label: "Server Key (Rahasia)",
            placeholder: "SB-Mid-server-... / Mid-server-...",
            sensitive: true,
          },
          {
            key: "integration_midtrans_client_key",
            label: "Client Key (Publik)",
            placeholder: "SB-Mid-client-... / Mid-client-...",
          },
        ]}
        values={values}
        isSet={isSet}
        envStatus={envStatus}
        onChange={onChange}
        onSave={keys => handleSave(keys)}
        onTest={handleTest}
        saving={saving === "integration_midtrans_server_key"}
      />

      <Separator />

      {/* SMTP Email */}
      <ServiceCard
        title="SMTP Email"
        description="Server email untuk notifikasi booking, invoice, dan reminder"
        icon={<Mail className="h-4 w-4 text-amber-500" />}
        fields={[
          { key: "integration_smtp_host", label: "SMTP Host", placeholder: "smtp.gmail.com" },
          { key: "integration_smtp_port", label: "SMTP Port", placeholder: "587" },
          { key: "integration_smtp_user", label: "Username / Email", placeholder: "noreply@vinstour.com" },
          { key: "integration_smtp_pass", label: "Password / App Password", placeholder: "••••••••", sensitive: true },
          { key: "integration_smtp_from", label: "Dari (From Address)", placeholder: "Vinstour Travel <noreply@vinstour.com>" },
        ]}
        values={values}
        isSet={isSet}
        envStatus={envStatus}
        onChange={onChange}
        onSave={handleSave}
        saving={saving === "integration_smtp_host"}
      />

      <div className="pb-6 text-xs text-muted-foreground text-center">
        Konfigurasi WhatsApp (Fonnte) dikelola di menu <strong>WhatsApp → Konfigurasi Provider</strong>.
      </div>
    </div>
  );
}
