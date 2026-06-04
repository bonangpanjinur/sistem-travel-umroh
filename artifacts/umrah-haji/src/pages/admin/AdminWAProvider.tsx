import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  MessageSquare, Settings, CheckCircle2, XCircle, Loader2,
  RefreshCw, Shield, ExternalLink, Wifi, WifiOff, Plus, Trash2,
  Eye, EyeOff, TestTube2, Save, Info
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";

// ─── Provider definitions ─────────────────────────────────────────────────
const PROVIDERS = [
  {
    id: "fonnte",
    name: "Fonnte",
    tagline: "Provider WA terpopuler di Indonesia",
    logo: "🌐",
    color: "emerald",
    docs: "https://fonnte.com",
    fields: [
      { key: "api_key", label: "API Token", placeholder: "Paste token dari dashboard Fonnte", secret: true, help: "Salin dari fonnte.com → Device → Token" },
      { key: "sender_number", label: "Nomor Pengirim", placeholder: "628xxx", secret: false, help: "Nomor WhatsApp yang terdaftar di Fonnte" },
    ],
  },
  {
    id: "wablas",
    name: "Wablas",
    tagline: "Gateway WA lokal dengan domain custom",
    logo: "📡",
    color: "blue",
    docs: "https://wablas.com",
    fields: [
      { key: "api_key", label: "API Token Wablas", placeholder: "Token Wablas Anda", secret: true, help: "Dari panel wablas.com" },
      { key: "provider_config.domain", label: "Domain Server", placeholder: "solo.wablas.com", secret: false, help: "Domain Wablas sesuai server yang Anda pakai" },
      { key: "sender_number", label: "Nomor Pengirim", placeholder: "628xxx", secret: false, help: "Nomor WA aktif di Wablas" },
    ],
  },
  {
    id: "watzap",
    name: "Watzap",
    tagline: "API WhatsApp berbasis cloud Indonesia",
    logo: "⚡",
    color: "orange",
    docs: "https://watzap.id",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "API key dari watzap.id", secret: true, help: "Dari dashboard watzap.id → API Key" },
      { key: "provider_config.phone_no_id", label: "Phone Number ID", placeholder: "ID perangkat WA", secret: false, help: "Phone Number ID dari dashboard Watzap" },
      { key: "sender_number", label: "Nomor Pengirim", placeholder: "628xxx", secret: false, help: "Nomor WA aktif" },
    ],
  },
  {
    id: "ultramsg",
    name: "UltraMsg",
    tagline: "WhatsApp API global yang stabil",
    logo: "🔥",
    color: "purple",
    docs: "https://ultramsg.com",
    fields: [
      { key: "provider_config.instance_id", label: "Instance ID", placeholder: "instance123", secret: false, help: "Instance ID dari dashboard UltraMsg" },
      { key: "api_key", label: "Token", placeholder: "Token UltraMsg", secret: true, help: "Token dari instance UltraMsg Anda" },
      { key: "sender_number", label: "Nomor Pengirim", placeholder: "628xxx", secret: false, help: "Nomor WA yang terhubung" },
    ],
  },
  {
    id: "meta",
    name: "Meta Cloud API",
    tagline: "WhatsApp Business API resmi dari Meta",
    logo: "🏢",
    color: "sky",
    docs: "https://developers.facebook.com/docs/whatsapp",
    fields: [
      { key: "api_key", label: "Access Token", placeholder: "EAAx... (Meta access token)", secret: true, help: "Dari Meta Business → System User → Generate Token" },
      { key: "provider_config.phone_number_id", label: "Phone Number ID", placeholder: "1234567890", secret: false, help: "Phone Number ID dari Meta Business Manager" },
      { key: "provider_config.api_version", label: "API Version", placeholder: "v19.0", secret: false, help: "Versi Graph API (default: v19.0)" },
      { key: "sender_number", label: "Nomor WA Business", placeholder: "628xxx", secret: false, help: "Nomor resmi yang terverifikasi Meta" },
    ],
  },
  {
    id: "custom",
    name: "Custom / Provider Lain",
    tagline: "Hubungkan gateway WA manapun",
    logo: "🔧",
    color: "gray",
    docs: "",
    fields: [
      { key: "provider_config.endpoint_url", label: "Endpoint URL", placeholder: "https://api.yourprovider.com/send", secret: false, help: "URL endpoint POST untuk kirim pesan" },
      { key: "api_key", label: "Authorization Header", placeholder: "Bearer xxx atau API key", secret: true, help: "Value untuk header Authorization" },
      { key: "provider_config.body_template", label: "Body Template (JSON)", placeholder: '{"target":"{phone}","message":"{message}"}', secret: false, help: "Gunakan {phone} dan {message} sebagai placeholder" },
      { key: "sender_number", label: "Nomor Pengirim", placeholder: "628xxx", secret: false, help: "Nomor WA pengirim" },
    ],
  },
] as const;

type ProviderId = (typeof PROVIDERS)[number]["id"];

interface WAConfig {
  id?: string;
  provider: string;
  display_name: string | null;
  sender_number: string | null;
  is_active: boolean;
  provider_config: Record<string, any>;
  api_key_set: boolean;
  api_key_hint: string | null;
  last_tested_at: string | null;
  last_test_ok: boolean | null;
  updated_at: string;
}

type FieldValues = Record<string, string>;

const colorMap: Record<string, string> = {
  emerald: "border-emerald-300 bg-emerald-50 text-emerald-700",
  blue:    "border-blue-300 bg-blue-50 text-blue-700",
  orange:  "border-orange-300 bg-orange-50 text-orange-700",
  purple:  "border-purple-300 bg-purple-50 text-purple-700",
  sky:     "border-sky-300 bg-sky-50 text-sky-700",
  gray:    "border-gray-300 bg-gray-50 text-gray-600",
};

const colorActive: Record<string, string> = {
  emerald: "border-emerald-500 bg-emerald-500",
  blue:    "border-blue-500 bg-blue-500",
  orange:  "border-orange-500 bg-orange-500",
  purple:  "border-purple-500 bg-purple-500",
  sky:     "border-sky-500 bg-sky-500",
  gray:    "border-gray-500 bg-gray-500",
};

export default function AdminWAProvider() {
  const qc = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<ProviderId | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fields, setFields] = useState<FieldValues>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [displayName, setDisplayName] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // ── Fetch configs from DB via Supabase RPC ──
  const { data: configs = [], isLoading, refetch } = useQuery<WAConfig[]>({
    queryKey: ["wa-provider-configs"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_wa_config_safe");
      if (error) throw error;
      return (data || []) as WAConfig[];
    },
  });

  const providerDef = PROVIDERS.find(p => p.id === selectedProvider);

  function getFieldValue(key: string): string {
    return fields[key] ?? "";
  }

  function setFieldValue(key: string, val: string) {
    setFields(prev => ({ ...prev, [key]: val }));
  }

  function startNew(providerId: ProviderId) {
    setSelectedProvider(providerId);
    setEditingId(null);
    setFields({});
    setDisplayName(PROVIDERS.find(p => p.id === providerId)?.name ?? "");
    setIsActive(false);
    setTestResult(null);
  }

  function startEdit(cfg: WAConfig) {
    const prov = PROVIDERS.find(p => p.id === cfg.provider);
    if (!prov) return;
    setSelectedProvider(prov.id);
    setEditingId(cfg.id ?? null);
    const f: FieldValues = {};
    if (cfg.sender_number) f["sender_number"] = cfg.sender_number;
    if (cfg.api_key_hint) f["api_key"] = cfg.api_key_hint; // show hint; real key comes from DB
    for (const [k, v] of Object.entries(cfg.provider_config || {})) {
      f[`provider_config.${k}`] = String(v);
    }
    setFields(f);
    setDisplayName(cfg.display_name || prov.name);
    setIsActive(cfg.is_active);
    setTestResult(null);
  }

  async function handleTest() {
    if (!selectedProvider) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const body = buildSavePayload();
      const resp = await fetch("/api/v1/whatsapp/provider/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (data.success) {
        setTestResult({ success: true, message: data.device ? `Terhubung — ${data.device.name || data.device.status || "OK"}` : "Koneksi berhasil ✅" });
      } else {
        setTestResult({ success: false, message: data.error || "Test gagal" });
      }
    } catch (e: any) {
      // API server down — try direct provider test logic in browser (limited)
      setTestResult({ success: false, message: "API server tidak aktif. Pastikan backend berjalan untuk test koneksi." });
    } finally {
      setIsTesting(false);
    }
  }

  function buildSavePayload() {
    const providerConfig: Record<string, string> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (k.startsWith("provider_config.") && v) {
        providerConfig[k.replace("provider_config.", "")] = v;
      }
    }
    const api_key = (fields["api_key"] && !fields["api_key"].startsWith("••")) ? fields["api_key"] : undefined;
    return {
      id: editingId ?? undefined,
      provider: selectedProvider!,
      display_name: displayName || providerDef?.name,
      api_key,
      sender_number: fields["sender_number"] || undefined,
      is_active: isActive,
      provider_config: providerConfig,
    };
  }

  async function handleSave() {
    if (!selectedProvider) return;
    setIsSaving(true);
    try {
      // Save directly to Supabase (API server optional)
      const providerConfig: Record<string, any> = {};
      for (const [k, v] of Object.entries(fields)) {
        if (k.startsWith("provider_config.") && v) {
          providerConfig[k.replace("provider_config.", "")] = v;
        }
      }
      const api_key = (fields["api_key"] && !fields["api_key"].startsWith("••")) ? fields["api_key"] : undefined;
      const payload: Record<string, any> = {
        provider: selectedProvider,
        display_name: displayName || providerDef?.name,
        sender_number: fields["sender_number"] || null,
        is_active: isActive,
        provider_config: providerConfig,
        updated_at: new Date().toISOString(),
      };
      if (api_key) payload["api_key"] = api_key;

      let result;
      if (editingId) {
        result = await supabase.from("whatsapp_config").update(payload).eq("id", editingId).select("id").single();
      } else {
        result = await supabase.from("whatsapp_config").insert(payload).select("id").single();
      }
      if (result.error) throw result.error;

      // If set as active, deactivate all others
      if (isActive && result.data?.id) {
        await supabase.from("whatsapp_config").update({ is_active: false }).neq("id", result.data.id);
      }

      toast.success(editingId ? "Konfigurasi WA diperbarui" : "Provider WA baru disimpan");
      setSelectedProvider(null);
      setEditingId(null);
      setFields({});
      qc.invalidateQueries({ queryKey: ["wa-provider-configs"] });
    } catch (e: any) {
      toast.error("Gagal menyimpan: " + e.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus konfigurasi WA ini?")) return;
    const { error } = await supabase.from("whatsapp_config").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Konfigurasi dihapus");
    qc.invalidateQueries({ queryKey: ["wa-provider-configs"] });
  }

  async function handleSetActive(id: string) {
    await supabase.from("whatsapp_config").update({ is_active: false });
    const { error } = await supabase.from("whatsapp_config").update({ is_active: true }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Provider aktif diperbarui");
    qc.invalidateQueries({ queryKey: ["wa-provider-configs"] });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-600" />
            Konfigurasi Provider WhatsApp
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola gateway WA yang digunakan seluruh sistem — reminder, notifikasi, dan broadcast
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <Shield className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          Hanya Super Admin, Owner, dan IT yang dapat mengubah konfigurasi ini
        </div>
      </div>

      {/* Existing configs */}
      {configs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Provider Tersimpan</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {configs.map(cfg => {
              const prov = PROVIDERS.find(p => p.id === cfg.provider);
              const colKey = prov?.color ?? "gray";
              return (
                <Card key={cfg.id} className={cn("border-2 transition-all", cfg.is_active ? "border-green-400 shadow-sm" : "border-border")}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start gap-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl border-2", colorMap[colKey])}>
                        {prov?.logo ?? "📱"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{cfg.display_name || prov?.name || cfg.provider}</span>
                          {cfg.is_active && <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Aktif</Badge>}
                          {cfg.last_test_ok === true && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs gap-1"><CheckCircle2 className="h-3 w-3" />Terkoneksi</Badge>}
                          {cfg.last_test_ok === false && <Badge className="bg-red-100 text-red-700 border-red-200 text-xs gap-1"><XCircle className="h-3 w-3" />Gagal</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {cfg.sender_number || "—"} · {cfg.api_key_hint ? `Key: ${cfg.api_key_hint}` : "Key belum diset"}
                        </p>
                        {cfg.last_tested_at && (
                          <p className="text-[11px] text-muted-foreground">
                            Terakhir test: {format(new Date(cfg.last_tested_at), "d MMM yyyy HH:mm", { locale: idLocale })}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {!cfg.is_active && (
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-green-700 border-green-200 hover:bg-green-50"
                            onClick={() => handleSetActive(cfg.id!)}>
                            <Wifi className="h-3 w-3" />Aktifkan
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => startEdit(cfg)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(cfg.id!)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Memuat konfigurasi...
        </div>
      )}

      {/* Provider picker */}
      {!selectedProvider && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tambah Provider Baru</h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {PROVIDERS.map(p => {
              const colKey = p.color as string;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => startNew(p.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-left transition-all hover:shadow-md",
                    "border-border bg-background hover:border-blue-300 hover:bg-blue-50/50",
                  )}
                >
                  <span className="text-3xl">{p.logo}</span>
                  <div className="text-center">
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{p.tagline}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">+ Tambah</Badge>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Config form */}
      {selectedProvider && providerDef && (
        <Card className="border-2 border-blue-300 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-2xl">{providerDef.logo}</span>
                {editingId ? `Edit ${providerDef.name}` : `Konfigurasi ${providerDef.name}`}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedProvider(null); setEditingId(null); setFields({}); }}>
                ✕
              </Button>
            </div>
            <CardDescription className="flex items-center gap-2">
              {providerDef.tagline}
              {providerDef.docs && (
                <a href={providerDef.docs} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs">
                  Dokumentasi <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Display name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Tampilan</Label>
              <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={providerDef.name} />
            </div>

            <Separator />

            {/* Dynamic fields */}
            {providerDef.fields.map(f => {
              const val = getFieldValue(f.key);
              const isSecret = f.secret;
              const shown = showSecrets[f.key];
              const isHint = isSecret && val.startsWith("••");
              return (
                <div key={f.key} className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    {f.label}
                    {isSecret && <span className="text-amber-500 text-[10px]">● RAHASIA</span>}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type={isSecret && !shown ? "password" : "text"}
                      value={val}
                      onChange={e => setFieldValue(f.key, e.target.value)}
                      placeholder={isHint ? "Biarkan kosong untuk tidak mengubah" : f.placeholder}
                      className={isSecret ? "font-mono text-sm" : ""}
                    />
                    {isSecret && (
                      <Button size="sm" variant="ghost" type="button"
                        onClick={() => setShowSecrets(prev => ({ ...prev, [f.key]: !prev[f.key] }))}>
                        {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                  {f.help && <p className="text-[11px] text-muted-foreground">{f.help}</p>}
                </div>
              );
            })}

            <Separator />

            {/* Is active switch */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Jadikan Provider Aktif</p>
                <p className="text-xs text-muted-foreground">Seluruh pengiriman WA sistem akan menggunakan provider ini</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            {/* Test result */}
            {testResult && (
              <Alert className={testResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                <div className="flex items-center gap-2">
                  {testResult.success ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                  <AlertDescription className={testResult.success ? "text-green-800" : "text-red-800"}>
                    {testResult.message}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                disabled={isTesting || isSaving}
                onClick={handleTest}
              >
                {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TestTube2 className="h-3.5 w-3.5" />}
                Test Koneksi
              </Button>
              <Button
                size="sm"
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isSaving || isTesting}
                onClick={handleSave}
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Simpan Konfigurasi
              </Button>
            </div>

            <Alert className="border-amber-200 bg-amber-50">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-xs">
                API key disimpan terenkripsi di database. Staf biasa tidak dapat melihat nilai aslinya — hanya 4 karakter terakhir yang ditampilkan.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* No config yet */}
      {!isLoading && configs.length === 0 && !selectedProvider && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-medium text-muted-foreground">Belum ada provider WA terkonfigurasi</p>
            <p className="text-sm text-muted-foreground mt-1">Pilih provider di atas untuk mulai mengatur koneksi WhatsApp</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
