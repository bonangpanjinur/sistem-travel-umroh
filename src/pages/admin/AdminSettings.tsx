import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, CreditCard, Bell, Plus, Trash2, Loader2, Database, AlertTriangle, FileText, Plane } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import ChangePassword from "@/components/settings/ChangePassword";
import ProfileForm from "@/components/settings/ProfileForm";
import { DocumentSettingsForm } from "@/components/admin/DocumentSettingsForm";
import { useCompanySettings, useBankAccounts, BankAccount } from "@/hooks/useCompanySettings";
import { useAuth } from "@/hooks/useAuth";
import { useDynamicMenus } from "@/hooks/useDynamicMenus";

const companySchema = z.object({
  company_name: z.string().min(3, "Nama perusahaan minimal 3 karakter"),
  company_phone: z.string().min(10, "Nomor telepon minimal 10 digit").regex(/^[0-9+]+$/, "Nomor telepon tidak valid"),
  company_email: z.string().email("Format email tidak valid"),
  company_address: z.string().min(5, "Alamat minimal 5 karakter"),
});

type CompanyFormData = z.infer<typeof companySchema>;

const bankSchema = z.object({
  bank_name: z.string().min(2, "Nama bank minimal 2 karakter"),
  account_number: z.string().min(5, "Nomor rekening minimal 5 karakter").regex(/^[0-9]+$/, "Nomor rekening hanya boleh berisi angka"),
  account_name: z.string().min(3, "Nama pemilik rekening minimal 3 karakter"),
  branch_name: z.string().optional().or(z.literal("")),
  is_primary: z.boolean().default(false),
});

type BankFormData = z.infer<typeof bankSchema>;

const certificateSchema = z.object({
  certificate_cost_per_owner: z.preprocess(
    (val) => Number(String(val).replace(/[^0-9]/g, "")),
    z.number().min(0, "Biaya sertifikat tidak boleh negatif").optional()
  ),
});

type CertificateFormData = z.infer<typeof certificateSchema>;



export default function AdminSettings() {
  const { getSetting, updateMultipleSettings, resetDatabase, isLoading, isUpdating } = useCompanySettings();
  const { accounts, createAccount, updateAccount, deleteAccount, isLoading: loadingAccounts } = useBankAccounts();
  const { revokedKeys } = useDynamicMenus();
  
  const [resetConfirm, setResetConfirm] = useState("");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);

  const { isSuperAdmin, hasRole } = useAuth();
  


  const companyForm = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      company_name: "",
      company_phone: "",
      company_email: "",
      company_address: "",
    },
  });

  const bankForm = useForm<BankFormData>({
    resolver: zodResolver(bankSchema),
    defaultValues: {
      bank_name: "",
      account_number: "",
      account_name: "",
      branch_name: "",
      is_primary: false,
    },
  });

  const certificateForm = useForm<CertificateFormData>({
    resolver: zodResolver(certificateSchema),
    defaultValues: {
      certificate_cost_per_owner: 0,
    },
  });



  // Initialize company form when settings load (deps must be stable to avoid infinite loop)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isLoading) {
      companyForm.reset({
        company_name: getSetting("company_name") || "",
        company_phone: getSetting("company_phone") || "",
        company_email: getSetting("company_email") || "",
        company_address: getSetting("company_address") || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // Initialize bank form when editing
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (editingBank) {
      bankForm.reset({
        bank_name: editingBank.bank_name,
        account_number: editingBank.account_number,
        account_name: editingBank.account_name,
        branch_name: editingBank.branch_name || "",
        is_primary: editingBank.is_primary || false,
      });
    } else {
      bankForm.reset({
        bank_name: "",
        account_number: "",
        account_name: "",
        branch_name: "",
        is_primary: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingBank]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isLoading) {
      certificateForm.reset({
        certificate_cost_per_owner: parseFloat(getSetting("certificate_cost_per_owner")) || 0,
      });

    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const onSaveCompany = (data: CompanyFormData) => {
    updateMultipleSettings([
      { key: "company_name", value: data.company_name },
      { key: "company_phone", value: data.company_phone },
      { key: "company_email", value: data.company_email },
      { key: "company_address", value: data.company_address },
    ]);
  };

  const onSaveBank = (data: BankFormData) => {
    const bankData = {
      ...data,
      branch_name: data.branch_name || null,
      is_active: true,
    };

    if (editingBank) {
      updateAccount({ id: editingBank.id, ...bankData });
    } else {
      createAccount(bankData as any);
    }
    setIsBankDialogOpen(false);
    setEditingBank(null);
  };

  const onSaveCertificate = (data: CertificateFormData) => {
    updateMultipleSettings([
      { key: "certificate_cost_per_owner", value: data.certificate_cost_per_owner },
    ]);
  };



  const handleResetDatabase = async () => {
    if (resetConfirm !== "RESET DATABASE SEKARANG") return;
    
    setIsResetting(true);
    try {
      await resetDatabase(resetConfirm);
      setIsResetDialogOpen(false);
      setResetConfirm("");
    } catch (error) {
      console.error(error);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Pengaturan</h1>
        <p className="text-muted-foreground">Kelola pengaturan sistem dan akun</p>
      </div>

      {/* User Profile */}
      <ProfileForm />

      {/* Change Password */}
      <ChangePassword />

      {/* Document & Letterhead Settings */}
      <DocumentSettingsForm />

      {/* Certificate Settings (Super Admin Only) */}
      {isSuperAdmin() && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Pengaturan Sertifikat
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memuat pengaturan...
              </div>
            ) : (
              <Form {...certificateForm}>
                <form onSubmit={certificateForm.handleSubmit(onSaveCertificate)} className="space-y-4">
                  <FormField
                    control={certificateForm.control}
                    name="certificate_cost_per_owner"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Biaya per-sertifikat untuk Owner</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isUpdating}>
                    {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Simpan Perubahan
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Informasi Perusahaan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Memuat pengaturan...
            </div>
          ) : (
            <Form {...companyForm}>
              <form onSubmit={companyForm.handleSubmit(onSaveCompany)} className="space-y-4">
                <FormField
                  control={companyForm.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Perusahaan</FormLabel>
                      <FormControl>
                        <Input placeholder="Nama perusahaan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={companyForm.control}
                  name="company_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>No. Telepon</FormLabel>
                      <FormControl>
                        <Input placeholder="Contoh: 0211234567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={companyForm.control}
                  name="company_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@perusahaan.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={companyForm.control}
                  name="company_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alamat</FormLabel>
                      <FormControl>
                        <Input placeholder="Alamat lengkap perusahaan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Simpan Perubahan
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      {/* Bank Accounts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Rekening Bank
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingBank(null);
                setIsBankDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Tambah
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingAccounts ? (
            <div className="flex items-center gap-2 text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Memuat data bank...
            </div>
          ) : accounts.length === 0 ? (
            <p className="text-muted-foreground py-2">Belum ada rekening bank yang terdaftar.</p>
          ) : (
            accounts.map((acc) => (
              <div
                key={acc.id}
                className="p-4 border rounded-lg flex items-start justify-between hover:bg-muted/30 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{acc.bank_name}</p>
                    {acc.is_primary && (
                      <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded uppercase tracking-wider">
                        Utama
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-mono font-semibold tracking-tight">{acc.account_number}</p>
                  <p className="text-sm text-muted-foreground">a.n. {acc.account_name}</p>
                  {acc.branch_name && (
                    <p className="text-xs text-muted-foreground mt-1 italic">Cabang: {acc.branch_name}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingBank(acc);
                      setIsBankDialogOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm("Apakah Anda yakin ingin menghapus rekening ini?")) {
                        deleteAccount(acc.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifikasi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground text-center">
              Pengaturan notifikasi email dan WhatsApp akan tersedia segera.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Database Reset */}
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-destructive">
            <Database className="h-5 w-5" />
            Zona Bahaya
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="font-medium text-destructive">Reset Database</p>
            <p className="text-sm text-muted-foreground">
              Fitur ini akan menghapus **semua data transaksi** termasuk semua booking, pembayaran, data jamaah per booking, dan leads. Data master seperti paket, hotel, dan maskapai tetap aman.
            </p>
          </div>
          <Button 
            variant="destructive" 
            onClick={() => setIsResetDialogOpen(true)}
          >
            Bersihkan Semua Data Transaksi
          </Button>
        </CardContent>
      </Card>

      {/* Bank Account Dialog */}
      <Dialog open={isBankDialogOpen} onOpenChange={setIsBankDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBank ? "Edit Rekening Bank" : "Tambah Rekening Bank"}</DialogTitle>
          </DialogHeader>
          <Form {...bankForm}>
            <form onSubmit={bankForm.handleSubmit(onSaveBank)} className="space-y-4">
              <FormField
                control={bankForm.control}
                name="bank_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Bank</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: BCA, Mandiri, BSI" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={bankForm.control}
                name="account_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomor Rekening</FormLabel>
                    <FormControl>
                      <Input placeholder="Masukkan nomor rekening" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={bankForm.control}
                name="account_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Pemilik Rekening</FormLabel>
                    <FormControl>
                      <Input placeholder="Nama sesuai di buku tabungan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={bankForm.control}
                name="branch_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cabang (Opsional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Nama kantor cabang" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={bankForm.control}
                name="is_primary"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Rekening Utama</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Tampilkan rekening ini sebagai pilihan utama pembayaran
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsBankDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit">
                  {editingBank ? "Simpan Perubahan" : "Tambah Rekening"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Reset Database Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Konfirmasi Reset Database
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
              <strong>Peringatan:</strong> Tindakan ini tidak dapat dibatalkan. Semua data booking dan pembayaran akan hilang selamanya.
            </div>
            <div className="space-y-2">
              <Label>Ketik <strong>RESET DATABASE SEKARANG</strong> untuk mengonfirmasi:</Label>
              <Input 
                value={resetConfirm}
                onChange={(e) => setResetConfirm(e.target.value)}
                placeholder="RESET DATABASE SEKARANG"
                className="border-destructive"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetDialogOpen(false)} disabled={isResetting}>
              Batal
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleResetDatabase}
              disabled={resetConfirm !== "RESET DATABASE SEKARANG" || isResetting}
            >
              {isResetting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Hapus Semua Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
