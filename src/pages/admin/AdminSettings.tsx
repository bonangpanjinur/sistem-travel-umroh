import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, CreditCard, Bell, Plus, Trash2, Loader2, Database, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import ChangePassword from "@/components/settings/ChangePassword";
import ProfileForm from "@/components/settings/ProfileForm";
import { useCompanySettings, useBankAccounts, BankAccount } from "@/hooks/useCompanySettings";

export default function AdminSettings() {
  const { getSetting, updateMultipleSettings, resetDatabase, isLoading, isUpdating } = useCompanySettings();
  const { accounts, createAccount, updateAccount, deleteAccount, isLoading: loadingAccounts } = useBankAccounts();
  
  const [resetConfirm, setResetConfirm] = useState("");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const [companyForm, setCompanyForm] = useState({
    company_name: "",
    company_phone: "",
    company_email: "",
    company_address: "",
  });
  const [formInitialized, setFormInitialized] = useState(false);
  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);

  // Initialize form when settings load
  if (!isLoading && !formInitialized) {
    setCompanyForm({
      company_name: getSetting("company_name") || "",
      company_phone: getSetting("company_phone") || "",
      company_email: getSetting("company_email") || "",
      company_address: getSetting("company_address") || "",
    });
    setFormInitialized(true);
  }

  const handleSaveCompany = () => {
    updateMultipleSettings([
      { key: "company_name", value: companyForm.company_name },
      { key: "company_phone", value: companyForm.company_phone },
      { key: "company_email", value: companyForm.company_email },
      { key: "company_address", value: companyForm.company_address },
    ]);
  };

  const handleSaveBank = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      bank_name: formData.get("bank_name") as string,
      account_number: formData.get("account_number") as string,
      account_name: formData.get("account_name") as string,
      branch_name: (formData.get("branch_name") as string) || null,
      is_active: true,
      is_primary: formData.get("is_primary") === "on",
    };

    if (editingBank) {
      updateAccount({ id: editingBank.id, ...data });
    } else {
      createAccount(data);
    }
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

      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Informasi Perusahaan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Memuat...
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="company_name">Nama Perusahaan</Label>
                <Input
                  id="company_name"
                  value={companyForm.company_name}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, company_name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="company_phone">No. Telepon</Label>
                <Input
                  id="company_phone"
                  value={companyForm.company_phone}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, company_phone: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="company_email">Email</Label>
                <Input
                  id="company_email"
                  type="email"
                  value={companyForm.company_email}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, company_email: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="company_address">Alamat</Label>
                <Input
                  id="company_address"
                  value={companyForm.company_address}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, company_address: e.target.value }))}
                />
              </div>
              <Button onClick={handleSaveCompany} disabled={isUpdating}>
                {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Simpan Perubahan
              </Button>
            </>
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
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Memuat...
            </div>
          ) : accounts.length === 0 ? (
            <p className="text-muted-foreground">Belum ada rekening bank</p>
          ) : (
            accounts.map((acc) => (
              <div
                key={acc.id}
                className="p-4 border rounded-lg flex items-start justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{acc.bank_name}</p>
                    {acc.is_primary && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        Utama
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-mono">{acc.account_number}</p>
                  <p className="text-sm text-muted-foreground">a.n. {acc.account_name}</p>
                  {acc.branch_name && (
                    <p className="text-xs text-muted-foreground">Cabang: {acc.branch_name}</p>
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
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteAccount(acc.id)}
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
          <p className="text-muted-foreground">
            Pengaturan notifikasi email dan WhatsApp akan tersedia segera.
          </p>
        </CardContent>
      </Card>

      {/* Database Reset - Super Admin Only UI */}
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-destructive">
            <Database className="h-5 w-5" />
            Zona Bahaya: Reset Database
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Fitur ini akan menghapus **semua data transaksi** termasuk semua booking, pembayaran, data jamaah per booking, dan leads. Data master seperti paket, hotel, dan maskapai tetap aman.
          </p>
          <Button 
            variant="destructive" 
            onClick={() => setIsResetDialogOpen(true)}
          >
            Bersihkan Semua Data Transaksi
          </Button>
        </CardContent>
      </Card>

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
              Reset Database
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bank Account Dialog */}
      <Dialog open={isBankDialogOpen} onOpenChange={setIsBankDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBank ? "Edit Rekening" : "Tambah Rekening"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveBank} className="space-y-4">
            <div>
              <Label htmlFor="bank_name">Nama Bank *</Label>
              <Input
                id="bank_name"
                name="bank_name"
                defaultValue={editingBank?.bank_name || ""}
                required
              />
            </div>
            <div>
              <Label htmlFor="account_number">No. Rekening *</Label>
              <Input
                id="account_number"
                name="account_number"
                defaultValue={editingBank?.account_number || ""}
                required
              />
            </div>
            <div>
              <Label htmlFor="account_name">Atas Nama *</Label>
              <Input
                id="account_name"
                name="account_name"
                defaultValue={editingBank?.account_name || ""}
                required
              />
            </div>
            <div>
              <Label htmlFor="branch_name">Cabang (Opsional)</Label>
              <Input
                id="branch_name"
                name="branch_name"
                defaultValue={editingBank?.branch_name || ""}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="is_primary"
                name="is_primary"
                defaultChecked={editingBank?.is_primary || false}
              />
              <Label htmlFor="is_primary">Jadikan rekening utama</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsBankDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
