import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Key, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, Save,
  Send, Zap, CreditCard, Mail, Bot, ExternalLink, Info, Shield,
} from "lucide-react";

const API = "/api/v1/settings/integrations";

interface IntegrationData {
  settings: Record<string, string>;
  isSet: Record<string, boolean>;
  envStatus: Record<string, boolean>;
}

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
  saving: boolean;
}

function ServiceCard({
  title, description, icon, fields, testService, docLink,
  values, isSet, envStatus, onChange, onSave, saving,
}: ServiceCardProps) {
  const [showMap, setShowMap] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const configuredCount = fields.filter(f => isSet[f.key]).length;
  const isConfigured = configuredCount === fields.length;
  const isPartial = configuredCount > 0 && !isConfigured;

  async function handleTest() {
    if (!testService) return;
    setTesting(true);
    setTestResult(null);
    try {
      const r = await fetch(`${API}/test/${testService}`, { method: "POST" });
      const d = await r.json();
      setTestResult({ ok: d.ok, message: d.message || d.error || "Selesai" });
      if (d.ok) toast.success(`${title} terhubung!`);
      else toast.error(`Test gagal: ${d.error}`);
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message });
      toast.error(`Test gagal: ${e.message}`);
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
          {testService && (
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

export default function AdminIntegrationSettings() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery<IntegrationData>({
    queryKey: ["integration-settings"],
    queryFn: () => fetch(API).then(r => r.json()),
    staleTime: 30_000,
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
      refetch();
    } catch (e: any) {
      toast.error(`Gagal: ${e.message}`);
    }
    setSaving(null);
  }

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
