import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Building2, CreditCard, Bell, Plus, Trash2, Loader2, Database, AlertTriangle,
  FileText, User, ShieldAlert, Palette, Menu, Lock, Eye, Globe, Phone,
  Mail, MapPin, Edit, Smartphone, ChevronRight, Save, Settings,
  Key, EyeOff, CheckCircle2, XCircle, Info, Copy, Zap, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import ChangePassword from "@/components/settings/ChangePassword";
import ProfileForm from "@/components/settings/ProfileForm";
import { DocumentLayoutEditor } from "@/components/admin/appearance/DocumentLayoutEditor";
import { DocumentSettingsFormExtended } from "@/components/admin/DocumentSettingsForm.extended";
import { SidebarManager } from "@/components/admin/SidebarManager";
import { useCompanySettings, useBankAccounts, BankAccount } from "@/hooks/useCompanySettings";
import { useAuth } from "@/hooks/useAuth";

const companySchema = z.object({
  company_name: z.string().min(3, "Nama perusahaan minimal 3 karakter"),
  company_phone: z.string().min(10, "Nomor telepon minimal 10 digit"),
  company_email: z.string().email("Format email tidak valid"),
  company_address: z.string().min(5, "Alamat minimal 5 karakter"),
  company_city: z.string().optional(),
  company_website: z.string().optional(),
  company_tagline: z.string().optional(),
  company_license: z.string().optional(),
});
type CompanyFormData = z.infer<typeof companySchema>;

const bankSchema = z.object({
  bank_name: z.string().min(2, "Nama bank minimal 2 karakter"),
  account_number: z.string().min(5, "Nomor rekening minimal 5 karakter").regex(/^[0-9]+$/, "Hanya angka"),
  account_name: z.string().min(3, "Nama pemilik minimal 3 karakter"),
  branch_name: z.string().optional().or(z.literal("")),
  is_primary: z.boolean().default(false),
});
type BankFormData = z.infer<typeof bankSchema>;

type SettingsSection =
  | "profile" | "company" | "bank" | "documents"
  | "notifications" | "appearance" | "sidebar" | "security" | "apikeys" | "danger";

interface NavItem {
  id: SettingsSection;
  label: string;
  icon: React.ElementType;
  description: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "profile",       label: "Profil & Akun",       icon: User,        description: "Data pribadi & password" },
  { id: "company",       label: "Data Perusahaan",      icon: Building2,   description: "Nama, alamat, lisensi" },
  { id: "bank",          label: "Rekening Bank",        icon: CreditCard,  description: "Rekening pembayaran" },
  { id: "documents",     label: "Dokumen & Surat",      icon: FileText,    description: "Template & tampilan dokumen" },
  { id: "notifications", label: "Notifikasi",           icon: Bell,        description: "WhatsApp, email & reminder" },
  { id: "appearance",    label: "Tampilan",             icon: Palette,     description: "Warna tema & branding" },
  { id: "sidebar",       label: "Menu Sidebar",         icon: Menu,        description: "Susunan & urutan menu", adminOnly: true },
  { id: "security",      label: "Keamanan",             icon: Lock,        description: "Autentikasi & sesi aktif" },
  { id: "apikeys",       label: "Integrasi & API Keys", icon: Key,         description: "Supabase, VAPID, Midtrans, SMTP", adminOnly: true },
  { id: "danger",        label: "Zona Bahaya",          icon: ShieldAlert, description: "Reset & tindakan berbahaya", adminOnly: true },
];

export default function AdminSettings() {
  const { getSetting, updateMultipleSettings, resetDatabase, isLoading, isUpdating } = useCompanySettings();
  const { accounts, createAccount, updateAccount, deleteAccount, isLoading: loadingAccounts } = useBankAccounts();
  const { isSuperAdmin } = useAuth();

  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");
  const [resetConfirm, setResetConfirm]   = useState("");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting]     = useState(false);
  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
  const [editingBank, setEditingBank]     = useState<BankAccount | null>(null);
  const [notifSettings, setNotifSettings] = useState({
    whatsapp_booking: true, whatsapp_payment: true, whatsapp_departure: true,
    email_booking: false, email_payment: false,
  });

  const API_KEY_FIELDS = [
    "integration_supabase_url", "integration_supabase_anon_key",
    "integration_vapid_public_key",
    "integration_midtrans_client_key",
    "integration_fonnte_api_key", "integration_fonnte_sender",
    "integration_smtp_host", "integration_smtp_port", "integration_smtp_user",
  ] as const;

  const [apiKeyValues, setApiKeyValues] = useState<Record<string, string>>({});
  const [showFields, setShowFields] = useState<Record<string, boolean>>({});
  const [isSmtpTestOpen, setIsSmtpTestOpen] = useState(false);
  const [smtpTestEmail, setSmtpTestEmail] = useState("");
  const [smtpTestLoading, setSmtpTestLoading] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const companyForm = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      company_name: "", company_phone: "", company_email: "", company_address: "",
      company_city: "", company_website: "", company_tagline: "", company_license: "",
    },
  });

  const bankForm = useForm<BankFormData>({
    resolver: zodResolver(bankSchema),
    defaultValues: { bank_name: "", account_number: "", account_name: "", branch_name: "", is_primary: false },
  });

  useEffect(() => {
    if (!isLoading) {
      const vals: Record<string, string> = {};
      API_KEY_FIELDS.forEach(k => { vals[k] = getSetting(k) || ""; });
      setApiKeyValues(vals);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading) {
      companyForm.reset({
        company_name:    getSetting("company_name")    || "",
        company_phone:   getSetting("company_phone")   || "",
        company_email:   getSetting("company_email")   || "",
        company_address: getSetting("company_address") || "",
        company_city:    getSetting("company_city")    || "",
        company_website: getSetting("company_website") || "",
        company_tagline: getSetting("company_tagline") || "",
        company_license: getSetting("company_license") || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  useEffect(() => {
    if (editingBank) {
      bankForm.reset({
        bank_name: editingBank.bank_name, account_number: editingBank.account_number,
        account_name: editingBank.account_name, branch_name: editingBank.branch_name || "",
        is_primary: editingBank.is_primary || false,
      });
    } else {
      bankForm.reset({ bank_name: "", account_number: "", account_name: "", branch_name: "", is_primary: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingBank]);

  const onSaveCompany = (data: CompanyFormData) => {
    updateMultipleSettings([
      { key: "company_name",    value: data.company_name },
      { key: "company_phone",   value: data.company_phone },
      { key: "company_email",   value: data.company_email },
      { key: "company_address", value: data.company_address },
      { key: "company_city",    value: data.company_city    || "" },
      { key: "company_website", value: data.company_website || "" },
      { key: "company_tagline", value: data.company_tagline || "" },
      { key: "company_license", value: data.company_license || "" },
    ]);
  };

  const onSaveBank = (data: BankFormData) => {
    const payload = { ...data, branch_name: data.branch_name || null, is_active: true };
    if (editingBank) updateAccount({ id: editingBank.id, ...payload });
    else createAccount(payload as any);
    setIsBankDialogOpen(false);
    setEditingBank(null);
  };

  const handleSaveApiKeys = () => {
    const updates = Object.entries(apiKeyValues)
      .filter(([, v]) => v !== undefined)
      .map(([key, value]) => ({ key, value }));
    updateMultipleSettings(updates);
  };

  const testSupabase = async () => {
    const url = apiKeyValues["integration_supabase_url"]?.trim();
    const key = apiKeyValues["integration_supabase_anon_key"]?.trim();
    if (!url || !key) return { ok: false, message: "Isi Supabase URL dan Anon Key terlebih dahulu." };
    try {
      const res = await fetch(`${url}/rest/v1/`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok || res.status === 404 || res.status === 200) {
        return { ok: true, message: `Koneksi Supabase berhasil! (HTTP ${res.status}) URL dan kunci valid.` };
      }
      if (res.status === 401 || res.status === 403) {
        return { ok: false, message: `Autentikasi gagal (HTTP ${res.status}). Periksa Anon Key Anda.` };
      }
      return { ok: false, message: `Supabase merespons HTTP ${res.status}. Periksa konfigurasi.` };
    } catch (e: any) {
      return { ok: false, message: `Tidak dapat terhubung ke Supabase: ${e?.message ?? "Network error"}` };
    }
  };

  const testVapid = async () => {
    const pub  = apiKeyValues["integration_vapid_public_key"]?.trim();
    const priv = apiKeyValues["integration_vapid_private_key"]?.trim();
    if (!pub && !priv) return { ok: false, message: "Masukkan VAPID Public Key dan Private Key." };
    const b64url = /^[A-Za-z0-9\-_]+$/;
    if (pub && (pub.length < 80 || pub.length > 96 || !pub.startsWith("B"))) {
      return { ok: false, warn: true, message: "VAPID Public Key terlihat tidak valid. Harus diawali 'B' dan panjang ~88 karakter (base64url)." };
    }
    if (priv && (priv.length < 38 || priv.length > 50 || !b64url.test(priv))) {
      return { ok: false, warn: true, message: "VAPID Private Key terlihat tidak valid. Harus ~43 karakter base64url." };
    }
    const msgs: string[] = [];
    if (pub)  msgs.push(`Public Key: ${pub.slice(0, 8)}...${pub.slice(-4)} (${pub.length} karakter) ✓`);
    if (priv) msgs.push(`Private Key: ***...${priv.slice(-4)} (${priv.length} karakter) ✓`);
    return { ok: true, message: `Format VAPID terlihat valid.\n${msgs.join("\n")}` };
  };

  const testMidtrans = async () => {
    const serverKey = apiKeyValues["integration_midtrans_server_key"]?.trim();
    const clientKey = apiKeyValues["integration_midtrans_client_key"]?.trim();
    if (!serverKey && !clientKey) return { ok: false, message: "Masukkan Server Key atau Client Key Midtrans." };
    const isSandboxServer = serverKey?.startsWith("SB-Mid-server-");
    const isProdServer    = serverKey?.startsWith("Mid-server-");
    const isSandboxClient = clientKey?.startsWith("SB-Mid-client-");
    const isProdClient    = clientKey?.startsWith("Mid-client-");
    if (serverKey && !isSandboxServer && !isProdServer) {
      return { ok: false, warn: true, message: "Server Key tidak dikenali. Format yang benar: 'SB-Mid-server-...' (sandbox) atau 'Mid-server-...' (produksi)." };
    }
    if (clientKey && !isSandboxClient && !isProdClient) {
      return { ok: false, warn: true, message: "Client Key tidak dikenali. Format yang benar: 'SB-Mid-client-...' (sandbox) atau 'Mid-client-...' (produksi)." };
    }
    const env  = (isSandboxServer || isSandboxClient) ? "Sandbox" : "Produksi";
    const msgs = [];
    if (serverKey) msgs.push(`Server Key: ${serverKey.slice(0, 14)}...***`);
    if (clientKey) msgs.push(`Client Key: ${clientKey.slice(0, 14)}...***`);
    return { ok: true, message: `Format Midtrans valid — mode ${env}.\n${msgs.join("\n")}` };
  };

  const testFonnte = async () => {
    const apiKey = apiKeyValues["integration_fonnte_api_key"]?.trim();
    const sender = apiKeyValues["integration_fonnte_sender"]?.trim();
    if (!apiKey) return { ok: false, message: "Masukkan Fonnte API Key terlebih dahulu." };
    try {
      const res = await fetch("https://api.fonnte.com/get-devices", {
        method: "GET",
        headers: { Authorization: apiKey },
        signal: AbortSignal.timeout(8000),
      });
      const json = await res.json().catch(() => ({}));
      if (json.status === true || res.ok) {
        const deviceInfo = Array.isArray(json.data) && json.data.length > 0
          ? `Perangkat terhubung: ${json.data.map((d: any) => d.name || d.device).join(", ")}`
          : "API Key valid. Belum ada perangkat terhubung.";
        return { ok: true, message: `Koneksi Fonnte berhasil! ${deviceInfo}${sender ? `\nNomor pengirim: ${sender}` : ""}` };
      }
      if (json.reason === "authorization failed") {
        return { ok: false, message: "API Key Fonnte tidak valid. Periksa kembali kunci Anda di dashboard Fonnte." };
      }
      return { ok: false, message: `Fonnte merespons: ${json.reason || JSON.stringify(json)}` };
    } catch (e: any) {
      return { ok: false, message: `Tidak dapat terhubung ke Fonnte: ${e?.message ?? "Network error"}` };
    }
  };

  const testSmtp = async () => {
    const host = apiKeyValues["integration_smtp_host"]?.trim();
    const port = apiKeyValues["integration_smtp_port"]?.trim();
    const user = apiKeyValues["integration_smtp_user"]?.trim();
    const pass = apiKeyValues["integration_smtp_pass"]?.trim();
    if (!host) return { ok: false, message: "Masukkan SMTP Host terlebih dahulu." };
    const portNum = parseInt(port || "");
    if (port && (isNaN(portNum) || portNum < 1 || portNum > 65535)) {
      return { ok: false, warn: true, message: "SMTP Port tidak valid. Gunakan port 25, 465, 587, atau 2525." };
    }
    const commonPorts = [25, 465, 587, 2525];
    const portNote = port && !commonPorts.includes(portNum) ? ` (port tidak umum, biasanya 587)` : "";
    const msgs = [
      `Host: ${host}`,
      `Port: ${port || "tidak diset"}${portNote}`,
      `Username: ${user || "tidak diset"}`,
      `Password: ${pass ? "***diset***" : "tidak diset"}`,
    ];
    const allSet = host && port && user && pass;
    return {
      ok: !!allSet,
      warn: !allSet,
      message: allSet
        ? `Konfigurasi SMTP lengkap dan terlihat valid.\n${msgs.join("\n")}\nGunakan tombol "Kirim Email Test" untuk mengirim email sungguhan.`
        : `Konfigurasi SMTP belum lengkap:\n${msgs.join("\n")}`,
    };
  };

  const sendSmtpTest = async () => {
    setSmtpTestLoading(true);
    setSmtpTestResult(null);
    try {
      const res = await fetch("/api/v1/test-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: apiKeyValues["integration_smtp_host"],
          port: apiKeyValues["integration_smtp_port"],
          user: apiKeyValues["integration_smtp_user"],
          pass: apiKeyValues["integration_smtp_pass"],
          to: smtpTestEmail,
        }),
      });
      const data = await res.json();
      setSmtpTestResult({
        ok: data.success,
        message: data.success
          ? `Email test berhasil dikirim ke ${smtpTestEmail}! Cek inbox atau folder spam Anda.`
          : (data.error || "Gagal mengirim email."),
      });
    } catch (e: any) {
      setSmtpTestResult({ ok: false, message: `Tidak dapat terhubung ke server: ${e.message}` });
    } finally {
      setSmtpTestLoading(false);
    }
  };

  const handleResetDatabase = async () => {
    if (resetConfirm !== "RESET DATABASE SEKARANG") return;
    setIsResetting(true);
    try {
      await resetDatabase(resetConfirm);
      setIsResetDialogOpen(false);
      setResetConfirm("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mereset database");
    }
    finally { setIsResetting(false); }
  };

  const visible = NAV_ITEMS.filter(n => !n.adminOnly || isSuperAdmin());

  return (
    <div className="flex min-h-[calc(100vh-4rem)] -mx-4 -my-4 md:-mx-6 md:-my-6">
      {/* ── Sidebar ── */}
      <aside className="w-60 shrink-0 border-r bg-muted/20 flex flex-col">
        <div className="px-4 py-4 border-b">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Pengaturan Sistem</span>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {visible.map(item => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                  active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary-foreground" : "text-muted-foreground")} />
                <div className="flex-1 min-w-0">
                  <div className={cn("text-xs font-semibold truncate", active ? "text-primary-foreground" : "")}>{item.label}</div>
                  <div className={cn("text-[10px] truncate", active ? "text-primary-foreground/70" : "text-muted-foreground")}>{item.description}</div>
                </div>
                {active && <ChevronRight className="h-3 w-3 shrink-0 text-primary-foreground/60" />}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Content ── */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className={`space-y-6 ${activeSection === "documents" ? "max-w-4xl" : "max-w-2xl"}`}>

          {/* PROFIL & AKUN */}
          {activeSection === "profile" && (
            <>
              <SectionHead icon={User} title="Profil & Akun" desc="Kelola data pribadi dan keamanan akun Anda" />
              <ProfileForm />
              <ChangePassword />
            </>
          )}

          {/* DATA PERUSAHAAN */}
          {activeSection === "company" && (
            <>
              <SectionHead icon={Building2} title="Data Perusahaan" desc="Informasi yang muncul di kop surat dan dokumen resmi" />
              <Card>
                <CardContent className="pt-6">
                  <Form {...companyForm}>
                    <form onSubmit={companyForm.handleSubmit(onSaveCompany)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={companyForm.control} name="company_name" render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />Nama Perusahaan *</FormLabel>
                            <FormControl><Input placeholder="PT. Umrah Haji Travel Indonesia" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={companyForm.control} name="company_tagline" render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Tagline / Slogan</FormLabel>
                            <FormControl><Input placeholder="Perjalanan Suci Anda, Amanah Kami" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={companyForm.control} name="company_phone" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />Telepon *</FormLabel>
                            <FormControl><Input placeholder="+62 21-1234-5678" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={companyForm.control} name="company_email" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />Email *</FormLabel>
                            <FormControl><Input placeholder="info@perusahaan.com" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={companyForm.control} name="company_city" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Kota</FormLabel>
                            <FormControl><Input placeholder="Jakarta" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={companyForm.control} name="company_website" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />Website</FormLabel>
                            <FormControl><Input placeholder="https://perusahaan.com" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={companyForm.control} name="company_address" render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Alamat Lengkap *</FormLabel>
                            <FormControl><Textarea placeholder="Jl. Raya No. 123, Jakarta Selatan 12345" rows={2} {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={companyForm.control} name="company_license" render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Nomor Izin PPIU / SK</FormLabel>
                            <FormControl><Input placeholder="No. SK. D/223/2020..." {...field} /></FormControl>
                            <p className="text-xs text-muted-foreground mt-1">Muncul di kop surat resmi dokumen</p>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <div className="flex justify-end pt-2 border-t">
                        <Button type="submit" disabled={isUpdating}>
                          {isUpdating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Menyimpan...</> : <><Save className="h-4 w-4 mr-2" />Simpan Data Perusahaan</>}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </>
          )}

          {/* REKENING BANK */}
          {activeSection === "bank" && (
            <>
              <SectionHead icon={CreditCard} title="Rekening Bank" desc="Rekening yang muncul di invoice dan instruksi pembayaran jamaah" />
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-base">Daftar Rekening</CardTitle>
                    <CardDescription>Tambahkan rekening bank perusahaan</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => { setEditingBank(null); setIsBankDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-1" />Tambah
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loadingAccounts ? (
                    <div className="flex items-center gap-2 text-muted-foreground py-6 justify-center">
                      <Loader2 className="h-4 w-4 animate-spin" />Memuat rekening...
                    </div>
                  ) : accounts.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                      <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Belum ada rekening bank</p>
                      <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setEditingBank(null); setIsBankDialogOpen(true); }}>
                        <Plus className="h-4 w-4 mr-1" />Tambah Rekening
                      </Button>
                    </div>
                  ) : accounts.map(acc => (
                    <div key={acc.id} className="flex items-center gap-3 p-4 border rounded-xl hover:bg-muted/30 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{acc.bank_name}</p>
                          {acc.is_primary && <Badge className="text-[10px] h-4 px-1.5">Utama</Badge>}
                        </div>
                        <p className="font-mono text-sm tracking-wider">{acc.account_number}</p>
                        <p className="text-xs text-muted-foreground">a.n. {acc.account_name}{acc.branch_name ? ` · Cab. ${acc.branch_name}` : ""}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingBank(acc); setIsBankDialogOpen(true); }}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => { if (confirm("Hapus rekening ini?")) deleteAccount(acc.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          {/* DOKUMEN & TEMPLATE */}
          {activeSection === "documents" && (
            <>
              <SectionHead icon={FileText} title="Dokumen & Template Surat" desc="Pengaturan kop surat, warna invoice, dan tampilan dokumen PDF" />
              <div className="space-y-8">

                {/* Invoice Template quick-access card */}
                <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/10">
                  <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <p className="font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4 text-amber-600" />
                        Template Form Transaksi Umrah
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Konfigurasi layout PDF, informasi pembayaran dinamis, syarat &amp; ketentuan, dan tanda tangan.
                        Template ini digunakan saat mencetak "Form Transaksi" dari halaman booking.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="shrink-0 border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 gap-2"
                      onClick={() => window.location.href = "/admin/invoice-template"}
                    >
                      <ChevronRight className="h-4 w-4" />
                      Buka Editor Template
                    </Button>
                  </CardContent>
                </Card>

                <DocumentSettingsFormExtended />
                <div className="pt-8 border-t">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Palette className="h-5 w-5 text-primary" />
                    Layout & Preview Per Dokumen
                  </h3>
                  <DocumentLayoutEditor />
                </div>
              </div>
            </>
          )}

          {/* NOTIFIKASI */}
          {activeSection === "notifications" && (
            <>
              <SectionHead icon={Bell} title="Notifikasi" desc="Atur pengiriman pesan otomatis ke jamaah dan admin" />
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Smartphone className="h-4 w-4" />WhatsApp</CardTitle>
                  <CardDescription>Notifikasi otomatis via WhatsApp Business API</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1">
                  {[
                    { key: "whatsapp_booking",   label: "Konfirmasi Booking",   desc: "Saat booking baru berhasil" },
                    { key: "whatsapp_payment",   label: "Konfirmasi Pembayaran", desc: "Saat pembayaran diterima" },
                    { key: "whatsapp_departure", label: "Reminder Keberangkatan", desc: "3 hari sebelum berangkat" },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch
                        checked={notifSettings[item.key as keyof typeof notifSettings]}
                        onCheckedChange={v => setNotifSettings(p => ({ ...p, [item.key]: v }))}
                      />
                    </div>
                  ))}
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Hubungkan WhatsApp Business API melalui menu <strong>Integrasi → WhatsApp</strong> untuk mengaktifkan.
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" />Email</CardTitle>
                  <CardDescription>Notifikasi otomatis via email</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1">
                  {[
                    { key: "email_booking", label: "Invoice Otomatis", desc: "Kirim invoice saat booking dibuat" },
                    { key: "email_payment", label: "Kwitansi Otomatis", desc: "Kirim kwitansi setelah pembayaran" },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch
                        checked={notifSettings[item.key as keyof typeof notifSettings]}
                        onCheckedChange={v => setNotifSettings(p => ({ ...p, [item.key]: v }))}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          {/* TAMPILAN */}
          {activeSection === "appearance" && (
            <>
              <SectionHead icon={Palette} title="Tampilan & Branding" desc="Warna tema, identitas visual, dan desain dokumen" />
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <div>
                    <Label className="text-sm font-semibold mb-3 block">Warna Utama Sistem</Label>
                    <div className="flex gap-3 flex-wrap">
                      {[
                        { name: "Hijau (Default)", hex: "#16a34a" },
                        { name: "Biru",             hex: "#3b82f6" },
                        { name: "Indigo",           hex: "#6366f1" },
                        { name: "Amber",            hex: "#f59e0b" },
                        { name: "Rose",             hex: "#f43f5e" },
                      ].map(c => (
                        <button key={c.hex} title={c.name} className="group flex flex-col items-center gap-1">
                          <div className="w-9 h-9 rounded-full border-2 border-transparent group-hover:border-foreground/40 transition-all shadow-sm"
                            style={{ backgroundColor: c.hex }} />
                          <span className="text-[10px] text-muted-foreground">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-sm font-semibold mb-3 block">Mode Tampilan</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {[{ label: "Terang", emoji: "☀️" }, { label: "Gelap", emoji: "🌙" }, { label: "Ikuti Sistem", emoji: "🖥️" }].map(m => (
                        <button key={m.label} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors text-center">
                          <div className="text-2xl mb-1">{m.emoji}</div>
                          <div className="text-xs font-medium">{m.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">Pengaturan Tampilan Lanjutan</p>
                      <p className="text-xs text-muted-foreground">
                        Logo perusahaan, banner carousel, template landing page, tema custom, font & branding lengkap
                      </p>
                    </div>
                    <Button size="sm" asChild>
                      <a href="/admin/appearance">Buka</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>


            </>
          )}

          {/* MENU SIDEBAR */}
          {activeSection === "sidebar" && isSuperAdmin() && (
            <>
              <SectionHead icon={Menu} title="Susunan Menu Sidebar" desc="Atur urutan, nama, ikon, dan visibilitas menu navigasi" />
              <SidebarManager />
            </>
          )}

          {/* KEAMANAN */}
          {activeSection === "security" && (
            <>
              <SectionHead icon={Lock} title="Keamanan Akun" desc="Autentikasi dua faktor dan manajemen sesi" />
              <Card>
                <CardContent className="pt-6 space-y-3">
                  {[
                    { label: "Autentikasi 2 Faktor (2FA)", desc: "Tambahkan lapisan keamanan ekstra", btnLabel: "Atur 2FA", icon: Lock },
                    { label: "Log Aktivitas",              desc: "Riwayat login dan perubahan akun", btnLabel: "Lihat Log", icon: Eye },
                    { label: "Sesi Aktif",                 desc: "Perangkat yang sedang login",      btnLabel: "Kelola Sesi", icon: Smartphone },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <item.icon className="h-3.5 w-3.5 mr-1.5" />{item.btnLabel}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          {/* INTEGRASI & API KEYS */}
          {activeSection === "apikeys" && isSuperAdmin() && (
            <>
              <SectionHead icon={Key} title="Integrasi & API Keys" desc="Konfigurasi koneksi layanan eksternal: Supabase, push notification, pembayaran, dan komunikasi" />

              {/* Info banner */}
              <div className="flex gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <p className="font-semibold">Penyimpanan API Keys</p>
                  <p>Hanya kunci publik (URL, Anon Key, VAPID Public, Midtrans Client Key, dst.) yang disimpan di sini karena aman dipakai di frontend.</p>
                  <p><strong>Kunci sensitif</strong> — Service Role Key, VAPID Private Key, Midtrans Server Key, SMTP Password — <strong>tidak lagi diinput dari UI</strong>. Kunci tsb dikelola sebagai <em>Edge Function Secret</em> di backend agar tidak bocor ke database. Hubungi developer/admin untuk menambah/mengubah secret backend.</p>
                </div>
              </div>

              {/* Supabase */}
              <ApiKeyGroup
                title="Supabase (publik)" icon={Database} color="blue"
                description="Koneksi database & autentikasi utama aplikasi"
                fields={[
                  { key: "integration_supabase_url",              label: "Supabase URL",              placeholder: "https://xxxx.supabase.co", secret: false, hint: "VITE_SUPABASE_URL" },
                  { key: "integration_supabase_anon_key",         label: "Anon / Publishable Key",    placeholder: "eyJhbGciOiJ...",          secret: true,  hint: "VITE_SUPABASE_PUBLISHABLE_KEY" },
                ]}
                values={apiKeyValues}
                showFields={showFields}
                onChange={(k, v) => setApiKeyValues(p => ({ ...p, [k]: v }))}
                onToggleShow={k => setShowFields(p => ({ ...p, [k]: !p[k] }))}
                onTest={testSupabase}
              />

              {/* VAPID Push */}
              <ApiKeyGroup
                title="Push Notification (VAPID Public)" icon={Bell} color="purple"
                description="Public key dipakai browser jamaah untuk subscribe push notification. Private key dikelola di backend secret."
                fields={[
                  { key: "integration_vapid_public_key",  label: "VAPID Public Key",  placeholder: "BNJ...", secret: false, hint: "VAPID_PUBLIC_KEY" },
                ]}
                values={apiKeyValues}
                showFields={showFields}
                onChange={(k, v) => setApiKeyValues(p => ({ ...p, [k]: v }))}
                onToggleShow={k => setShowFields(p => ({ ...p, [k]: !p[k] }))}
                onTest={testVapid}
                extra={
                  <div className="px-4 pb-3">
                    <p className="text-xs text-muted-foreground">Generate key baru: <code className="bg-muted px-1 rounded font-mono">npx web-push generate-vapid-keys</code>. Simpan <strong>Private Key</strong> sebagai backend secret <code>VAPID_PRIVATE_KEY</code>, public key boleh disimpan di sini.</p>
                  </div>
                }
              />

              {/* Midtrans */}
              <ApiKeyGroup
                title="Midtrans (Client Key)" icon={CreditCard} color="green"
                description="Hanya client key yang disimpan di sini. Server Key dikelola di backend secret untuk mencegah kebocoran."
                fields={[
                  { key: "integration_midtrans_client_key", label: "Client Key (untuk frontend)", placeholder: "SB-Mid-client-...", secret: false, hint: "MIDTRANS_CLIENT_KEY" },
                ]}
                values={apiKeyValues}
                showFields={showFields}
                onChange={(k, v) => setApiKeyValues(p => ({ ...p, [k]: v }))}
                onToggleShow={k => setShowFields(p => ({ ...p, [k]: !p[k] }))}
                onTest={testMidtrans}
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

              {/* WhatsApp / Fonnte */}
              <ApiKeyGroup
                title="WhatsApp (Fonnte)" icon={Smartphone} color="emerald"
                description="Kirim notifikasi WhatsApp otomatis ke jamaah"
                fields={[
                  { key: "integration_fonnte_api_key", label: "Fonnte API Key", placeholder: "xxxxxxxxxxxxxxxxxx", secret: true,  hint: "FONNTE_API_KEY" },
                  { key: "integration_fonnte_sender",  label: "Nomor Pengirim", placeholder: "6281234567890",      secret: false, hint: "Nomor WhatsApp aktif" },
                ]}
                values={apiKeyValues}
                showFields={showFields}
                onChange={(k, v) => setApiKeyValues(p => ({ ...p, [k]: v }))}
                onToggleShow={k => setShowFields(p => ({ ...p, [k]: !p[k] }))}
                onTest={testFonnte}
                extra={
                  <div className="px-4 pb-3">
                    <a href="https://fonnte.com" target="_blank" rel="noopener noreferrer"
                       className="text-xs text-primary hover:underline flex items-center gap-1">
                      <Globe className="h-3 w-3" />Daftar / login Fonnte
                    </a>
                  </div>
                }
              />

              {/* SMTP Email */}
              <ApiKeyGroup
                title="SMTP Email (host & user)" icon={Mail} color="amber"
                description="Detail koneksi non-rahasia. Password SMTP dikelola di backend secret."
                fields={[
                  { key: "integration_smtp_host", label: "SMTP Host",               placeholder: "smtp.gmail.com", secret: false, hint: "SMTP_HOST" },
                  { key: "integration_smtp_port", label: "SMTP Port",               placeholder: "587",            secret: false, hint: "SMTP_PORT" },
                  { key: "integration_smtp_user", label: "Username / Email",        placeholder: "no-reply@...",   secret: false, hint: "SMTP_USER" },
                ]}
                values={apiKeyValues}
                showFields={showFields}
                onChange={(k, v) => setApiKeyValues(p => ({ ...p, [k]: v }))}
                onToggleShow={k => setShowFields(p => ({ ...p, [k]: !p[k] }))}
                onTest={testSmtp}
                extra={
                  <div className="px-4 pb-4 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Port umum: 587 (TLS), 465 (SSL), 25. Password disimpan sebagai backend secret <code>SMTP_PASS</code>.</p>
                    <Button
                      type="button" size="sm" variant="secondary"
                      className="h-7 text-xs gap-1.5"
                      disabled={!apiKeyValues["integration_smtp_host"] || !apiKeyValues["integration_smtp_user"]}
                      onClick={() => { setSmtpTestResult(null); setSmtpTestEmail(""); setIsSmtpTestOpen(true); }}
                    >
                      <Mail className="h-3 w-3" />Kirim Email Test
                    </Button>
                  </div>
                }
              />

              {/* Save button */}
              <div className="flex justify-end">
                <Button onClick={handleSaveApiKeys} disabled={isUpdating} size="lg">
                  {isUpdating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Menyimpan...</> : <><Save className="h-4 w-4 mr-2" />Simpan Semua API Keys</>}
                </Button>
              </div>
            </>
          )}

          {/* ZONA BAHAYA */}
          {activeSection === "danger" && isSuperAdmin() && (
            <>
              <SectionHead icon={ShieldAlert} title="Zona Bahaya" desc="Tindakan yang tidak dapat dibatalkan — gunakan dengan hati-hati" />
              <Card className="border-destructive/40 bg-destructive/5">
                <CardHeader>
                  <CardTitle className="text-base text-destructive flex items-center gap-2">
                    <Database className="h-4 w-4" />Reset Data Transaksi
                  </CardTitle>
                  <CardDescription>
                    Menghapus <strong>semua data transaksi</strong>: booking, pembayaran, leads, dokumen. Data master (paket, hotel, maskapai, karyawan) tetap aman.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="destructive" onClick={() => setIsResetDialogOpen(true)}>
                    <AlertTriangle className="h-4 w-4 mr-2" />Bersihkan Semua Data Transaksi
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

        </div>
      </main>

      {/* ── Dialog SMTP Test ── */}
      <Dialog open={isSmtpTestOpen} onOpenChange={v => { setIsSmtpTestOpen(v); if (!v) { setSmtpTestEmail(""); setSmtpTestResult(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />Kirim Email Test
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-1.5">
              <p className="font-semibold text-foreground/70 mb-1">Konfigurasi yang digunakan:</p>
              <p><strong>Host:</strong> {apiKeyValues["integration_smtp_host"] || "—"}</p>
              <p><strong>Port:</strong> {apiKeyValues["integration_smtp_port"] || "—"}</p>
              <p><strong>Pengirim:</strong> {apiKeyValues["integration_smtp_user"] || "—"}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Kirim ke alamat email:</Label>
              <Input
                type="email"
                placeholder="contoh@email.com"
                value={smtpTestEmail}
                onChange={e => setSmtpTestEmail(e.target.value)}
                disabled={smtpTestLoading}
                onKeyDown={e => { if (e.key === "Enter" && smtpTestEmail && !smtpTestLoading) sendSmtpTest(); }}
              />
            </div>
            {smtpTestResult && (
              <div className={cn(
                "flex items-start gap-2 p-3 rounded-lg border text-sm",
                smtpTestResult.ok
                  ? "bg-green-50 dark:bg-green-950/20 border-green-200 text-green-700 dark:text-green-400"
                  : "bg-red-50 dark:bg-red-950/20 border-red-200 text-red-700 dark:text-red-400"
              )}>
                {smtpTestResult.ok
                  ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                <span>{smtpTestResult.message}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSmtpTestOpen(false)}>Tutup</Button>
            <Button
              onClick={sendSmtpTest}
              disabled={smtpTestLoading || !smtpTestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(smtpTestEmail)}
            >
              {smtpTestLoading
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Mengirim...</>
                : <><Mail className="h-4 w-4 mr-2" />Kirim Test</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Bank ── */}
      <Dialog open={isBankDialogOpen} onOpenChange={setIsBankDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBank ? "Edit Rekening Bank" : "Tambah Rekening Bank"}</DialogTitle>
          </DialogHeader>
          <Form {...bankForm}>
            <form onSubmit={bankForm.handleSubmit(onSaveBank)} className="space-y-4">
              <FormField control={bankForm.control} name="bank_name" render={({ field }) => (
                <FormItem><FormLabel>Nama Bank</FormLabel><FormControl><Input placeholder="BCA, Mandiri, BSI, BRI..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={bankForm.control} name="account_number" render={({ field }) => (
                <FormItem><FormLabel>Nomor Rekening</FormLabel><FormControl><Input placeholder="1234567890" inputMode="numeric" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={bankForm.control} name="account_name" render={({ field }) => (
                <FormItem><FormLabel>Nama Pemilik Rekening</FormLabel><FormControl><Input placeholder="Sesuai buku tabungan" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={bankForm.control} name="branch_name" render={({ field }) => (
                <FormItem><FormLabel>Cabang (Opsional)</FormLabel><FormControl><Input placeholder="Cabang Jakarta Selatan" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={bankForm.control} name="is_primary" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div><FormLabel>Rekening Utama</FormLabel><p className="text-xs text-muted-foreground">Pilihan utama untuk pembayaran jamaah</p></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsBankDialogOpen(false)}>Batal</Button>
                <Button type="submit">{editingBank ? "Simpan Perubahan" : "Tambah Rekening"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Reset ── */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />Konfirmasi Reset Database
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive font-medium">
              Tindakan ini tidak bisa dibatalkan. Semua data booking dan pembayaran akan hilang selamanya.
            </div>
            <div className="space-y-2">
              <Label>Ketik <code className="bg-muted px-1 rounded text-xs">RESET DATABASE SEKARANG</code> untuk konfirmasi:</Label>
              <Input
                value={resetConfirm}
                onChange={e => setResetConfirm(e.target.value)}
                placeholder="RESET DATABASE SEKARANG"
                className="border-destructive/50 font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetDialogOpen(false)} disabled={isResetting}>Batal</Button>
            <Button variant="destructive" onClick={handleResetDatabase}
              disabled={resetConfirm !== "RESET DATABASE SEKARANG" || isResetting}>
              {isResetting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Hapus Semua Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionHead({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h2 className="text-lg font-bold leading-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

interface ApiKeyField {
  key: string;
  label: string;
  placeholder: string;
  secret: boolean;
  hint: string;
}

type TestResult = { status: "idle" | "testing" | "ok" | "warn" | "error"; message: string };

interface ApiKeyGroupProps {
  title: string;
  icon: React.ElementType;
  color: string;
  description: string;
  fields: ApiKeyField[];
  values: Record<string, string>;
  showFields: Record<string, boolean>;
  onChange: (key: string, value: string) => void;
  onToggleShow: (key: string) => void;
  onTest?: () => Promise<Omit<TestResult, "status">& { ok: boolean; warn?: boolean }>;
  extra?: React.ReactNode;
}

const COLOR_MAP: Record<string, string> = {
  blue:    "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
  purple:  "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800",
  green:   "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
  emerald: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800",
  amber:   "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
};

const ICON_COLOR_MAP: Record<string, string> = {
  blue:    "text-blue-600",
  purple:  "text-purple-600",
  green:   "text-green-600",
  emerald: "text-emerald-600",
  amber:   "text-amber-600",
};

function ApiKeyGroup({ title, icon: Icon, color, description, fields, values, showFields, onChange, onToggleShow, onTest, extra }: ApiKeyGroupProps) {
  const configuredCount = fields.filter(f => !!values[f.key]).length;
  const allConfigured   = configuredCount === fields.length;
  const anyConfigured   = configuredCount > 0;

  const [testResult, setTestResult] = useState<TestResult>({ status: "idle", message: "" });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success("Disalin ke clipboard"));
  };

  const handleTest = async () => {
    if (!onTest) return;
    setTestResult({ status: "testing", message: "Menghubungkan..." });
    try {
      const res = await onTest();
      setTestResult({ status: res.warn ? "warn" : res.ok ? "ok" : "error", message: res.message });
    } catch (e: any) {
      setTestResult({ status: "error", message: e?.message || "Terjadi kesalahan" });
    }
  };

  const testBanner = testResult.status !== "idle" && (
    <div className={cn(
      "mx-4 mb-3 flex items-start gap-2 p-3 rounded-lg border text-xs",
      testResult.status === "testing" && "bg-muted border-muted-foreground/20 text-muted-foreground",
      testResult.status === "ok"      && "bg-green-50 dark:bg-green-950/20 border-green-200 text-green-700 dark:text-green-400",
      testResult.status === "warn"    && "bg-amber-50 dark:bg-amber-950/20 border-amber-200 text-amber-700 dark:text-amber-400",
      testResult.status === "error"   && "bg-red-50 dark:bg-red-950/20 border-red-200 text-red-700 dark:text-red-400",
    )}>
      {testResult.status === "testing" && <Loader2 className="h-3.5 w-3.5 shrink-0 mt-0.5 animate-spin" />}
      {testResult.status === "ok"      && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
      {testResult.status === "warn"    && <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
      {testResult.status === "error"   && <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
      <span>{testResult.message}</span>
    </div>
  );

  return (
    <Card className={`border ${COLOR_MAP[color] ?? ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-muted flex items-center justify-center shadow-sm border">
              <Icon className={`h-4 w-4 ${ICON_COLOR_MAP[color] ?? "text-primary"}`} />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              <CardDescription className="text-xs">{description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={allConfigured ? "default" : anyConfigured ? "secondary" : "outline"}
              className={cn("text-[10px]", allConfigured && "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400")}>
              {allConfigured
                ? <><CheckCircle2 className="h-3 w-3 mr-1" />{configuredCount}/{fields.length} Terkonfigurasi</>
                : anyConfigured
                ? <><Info className="h-3 w-3 mr-1" />{configuredCount}/{fields.length} Terkonfigurasi</>
                : <><XCircle className="h-3 w-3 mr-1" />Belum dikonfigurasi</>}
            </Badge>
            {onTest && (
              <Button
                type="button" size="sm" variant="outline"
                className="h-7 text-xs gap-1.5"
                onClick={handleTest}
                disabled={testResult.status === "testing" || !anyConfigured}
              >
                {testResult.status === "testing"
                  ? <><Loader2 className="h-3 w-3 animate-spin" />Testing...</>
                  : <><Zap className="h-3 w-3" />Test Koneksi</>}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pb-3">
        {fields.map(f => {
          const val   = values[f.key] || "";
          const isSet = !!val;
          const shown = showFields[f.key] || false;
          return (
            <div key={f.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  {f.label}
                  {isSet
                    ? <CheckCircle2 className="h-3 w-3 text-green-500" />
                    : <XCircle className="h-3 w-3 text-muted-foreground/50" />}
                </Label>
                <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">{f.hint}</span>
              </div>
              <div className="flex gap-1.5">
                <Input
                  type={f.secret && !shown ? "password" : "text"}
                  value={val}
                  onChange={e => onChange(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="flex-1 font-mono text-xs h-8"
                />
                {f.secret && (
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                    onClick={() => onToggleShow(f.key)} title={shown ? "Sembunyikan" : "Tampilkan"}>
                    {shown ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                )}
                {isSet && (
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                    onClick={() => copyToClipboard(val)} title="Salin">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
      {testBanner}
      {extra}
    </Card>
  );
}
