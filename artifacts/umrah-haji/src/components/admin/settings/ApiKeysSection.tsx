import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, CreditCard, Database, Globe, Info, Key, Loader2, Mail, Save, Smartphone } from "lucide-react";
import { SectionHead } from "./SectionHead";
import { ApiKeyGroup } from "./ApiKeyGroup";
import { SmtpTestDialog } from "./SmtpTestDialog";
import { buildApiKeyTests } from "./useApiKeyTests";
import { useCompanySettings } from "@/hooks/useCompanySettings";

const API_KEY_FIELDS = [
  "integration_supabase_url", "integration_supabase_anon_key",
  "integration_vapid_public_key",
  "integration_midtrans_client_key",
  "integration_fonnte_api_key", "integration_fonnte_sender",
  "integration_smtp_host", "integration_smtp_port", "integration_smtp_user",
] as const;

export function ApiKeysSection() {
  const { getSetting, updateMultipleSettings, isLoading, isUpdating } = useCompanySettings();

  const [values, setValues] = useState<Record<string, string>>({});
  const [showFields, setShowFields] = useState<Record<string, boolean>>({});
  const [smtpDialogOpen, setSmtpDialogOpen] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      const vals: Record<string, string> = {};
      API_KEY_FIELDS.forEach(k => { vals[k] = getSetting(k) || ""; });
      setValues(vals);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const tests = useMemo(() => buildApiKeyTests(values), [values]);

  const onChange = (k: string, v: string) => setValues(p => ({ ...p, [k]: v }));
  const onToggleShow = (k: string) => setShowFields(p => ({ ...p, [k]: !p[k] }));

  const handleSave = () => {
    const updates = Object.entries(values)
      .filter(([, v]) => v !== undefined)
      .map(([key, value]) => ({ key, value }));
    updateMultipleSettings(updates);
  };

  return (
    <>
      <SectionHead icon={Key} title="Integrasi & API Keys" desc="Konfigurasi koneksi layanan eksternal: Supabase, push notification, pembayaran, dan komunikasi" />

      <div className="flex gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <p className="font-semibold">Penyimpanan API Keys</p>
          <p>Hanya kunci publik (URL, Anon Key, VAPID Public, Midtrans Client Key, dst.) yang disimpan di sini karena aman dipakai di frontend.</p>
          <p><strong>Kunci sensitif</strong> — Service Role Key, VAPID Private Key, Midtrans Server Key, SMTP Password — <strong>tidak lagi diinput dari UI</strong>. Kunci tsb dikelola sebagai <em>Edge Function Secret</em> di backend agar tidak bocor ke database. Hubungi developer/admin untuk menambah/mengubah secret backend.</p>
        </div>
      </div>

      <ApiKeyGroup
        title="Supabase (publik)" icon={Database} color="blue"
        description="Koneksi database & autentikasi utama aplikasi"
        fields={[
          { key: "integration_supabase_url",      label: "Supabase URL",           placeholder: "https://xxxx.supabase.co", secret: false, hint: "VITE_SUPABASE_URL" },
          { key: "integration_supabase_anon_key", label: "Anon / Publishable Key", placeholder: "eyJhbGciOiJ...",          secret: true,  hint: "VITE_SUPABASE_PUBLISHABLE_KEY" },
        ]}
        values={values} showFields={showFields}
        onChange={onChange} onToggleShow={onToggleShow}
        onTest={tests.testSupabase}
      />

      <ApiKeyGroup
        title="Push Notification (VAPID Public)" icon={Bell} color="purple"
        description="Public key dipakai browser jamaah untuk subscribe push notification. Private key dikelola di backend secret."
        fields={[
          { key: "integration_vapid_public_key", label: "VAPID Public Key", placeholder: "BNJ...", secret: false, hint: "VAPID_PUBLIC_KEY" },
        ]}
        values={values} showFields={showFields}
        onChange={onChange} onToggleShow={onToggleShow}
        onTest={tests.testVapid}
        extra={
          <div className="px-4 pb-3">
            <p className="text-xs text-muted-foreground">Generate key baru: <code className="bg-muted px-1 rounded font-mono">npx web-push generate-vapid-keys</code>. Simpan <strong>Private Key</strong> sebagai backend secret <code>VAPID_PRIVATE_KEY</code>, public key boleh disimpan di sini.</p>
          </div>
        }
      />

      <ApiKeyGroup
        title="Midtrans (Client Key)" icon={CreditCard} color="green"
        description="Hanya client key yang disimpan di sini. Server Key dikelola di backend secret untuk mencegah kebocoran."
        fields={[
          { key: "integration_midtrans_client_key", label: "Client Key (untuk frontend)", placeholder: "SB-Mid-client-...", secret: false, hint: "MIDTRANS_CLIENT_KEY" },
        ]}
        values={values} showFields={showFields}
        onChange={onChange} onToggleShow={onToggleShow}
        onTest={tests.testMidtrans}
        extra={
          <div className="px-4 pb-3">
            <a href="https://dashboard.midtrans.com" target="_blank" rel="noopener noreferrer"
               className="text-xs text-primary hover:underline flex items-center gap-1">
              <Globe className="h-3 w-3" />Buka Midtrans Dashboard
            </a>
            <p className="text-xs text-muted-foreground mt-2">Simpan <strong>Server Key</strong> sebagai backend secret <code>MIDTRANS_SERVER_KEY</code>.</p>
          </div>
        }
      />

      <ApiKeyGroup
        title="WhatsApp (Fonnte)" icon={Smartphone} color="emerald"
        description="Kirim notifikasi WhatsApp otomatis ke jamaah"
        fields={[
          { key: "integration_fonnte_api_key", label: "Fonnte API Key", placeholder: "xxxxxxxxxxxxxxxxxx", secret: true,  hint: "FONNTE_API_KEY" },
          { key: "integration_fonnte_sender",  label: "Nomor Pengirim", placeholder: "6281234567890",      secret: false, hint: "Nomor WhatsApp aktif" },
        ]}
        values={values} showFields={showFields}
        onChange={onChange} onToggleShow={onToggleShow}
        onTest={tests.testFonnte}
        extra={
          <div className="px-4 pb-3">
            <a href="https://fonnte.com" target="_blank" rel="noopener noreferrer"
               className="text-xs text-primary hover:underline flex items-center gap-1">
              <Globe className="h-3 w-3" />Daftar / login Fonnte
            </a>
          </div>
        }
      />

      <ApiKeyGroup
        title="SMTP Email (host & user)" icon={Mail} color="amber"
        description="Detail koneksi non-rahasia. Password SMTP dikelola di backend secret."
        fields={[
          { key: "integration_smtp_host", label: "SMTP Host",        placeholder: "smtp.gmail.com", secret: false, hint: "SMTP_HOST" },
          { key: "integration_smtp_port", label: "SMTP Port",        placeholder: "587",            secret: false, hint: "SMTP_PORT" },
          { key: "integration_smtp_user", label: "Username / Email", placeholder: "no-reply@...",   secret: false, hint: "SMTP_USER" },
        ]}
        values={values} showFields={showFields}
        onChange={onChange} onToggleShow={onToggleShow}
        onTest={tests.testSmtp}
        extra={
          <div className="px-4 pb-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Port umum: 587 (TLS), 465 (SSL), 25. Password disimpan sebagai backend secret <code>SMTP_PASS</code>.</p>
            <Button
              type="button" size="sm" variant="secondary"
              className="h-7 text-xs gap-1.5"
              disabled={!values["integration_smtp_host"] || !values["integration_smtp_user"]}
              onClick={() => setSmtpDialogOpen(true)}
            >
              <Mail className="h-3 w-3" />Kirim Email Test
            </Button>
          </div>
        }
      />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isUpdating} size="lg">
          {isUpdating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Menyimpan...</> : <><Save className="h-4 w-4 mr-2" />Simpan Semua API Keys</>}
        </Button>
      </div>

      <SmtpTestDialog open={smtpDialogOpen} onOpenChange={setSmtpDialogOpen} values={values} />
    </>
  );
}