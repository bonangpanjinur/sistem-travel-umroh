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
  Mail, MapPin, Edit, Smartphone, ChevronRight, Save, Settings
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import ChangePassword from "@/components/settings/ChangePassword";
import ProfileForm from "@/components/settings/ProfileForm";
import { DocumentSettingsForm } from "@/components/admin/DocumentSettingsForm";
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
  | "notifications" | "appearance" | "sidebar" | "security" | "danger";

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

  const handleResetDatabase = async () => {
    if (resetConfirm !== "RESET DATABASE SEKARANG") return;
    setIsResetting(true);
    try {
      await resetDatabase(resetConfirm);
      setIsResetDialogOpen(false);
      setResetConfirm("");
    } catch (err) { console.error(err); }
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
        <div className="max-w-2xl space-y-6">

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
              <DocumentSettingsForm />
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

              <Separator />
              <SectionHead icon={FileText} title="Desain Dokumen PDF" desc="Konfigurasi tampilan invoice, e-tiket, manifest, dan sertifikat" />
              <DocumentSettingsForm />
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
