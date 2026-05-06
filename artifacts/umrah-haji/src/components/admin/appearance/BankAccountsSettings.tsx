import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, Edit, CreditCard, Building2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useBankAccounts, BankAccount } from '@/hooks/useCompanySettings';
import { toast } from 'sonner';

const bankSchema = z.object({
  bank_name: z.string().min(2, "Nama bank minimal 2 karakter"),
  account_number: z.string().min(5, "Nomor rekening minimal 5 karakter").regex(/^[0-9]+$/, "Nomor rekening hanya boleh berisi angka"),
  account_name: z.string().min(3, "Nama pemilik rekening minimal 3 karakter"),
  branch_name: z.string().optional().or(z.literal("")),
  is_primary: z.boolean().default(false),
});

type BankFormData = z.infer<typeof bankSchema>;

export function BankAccountsSettings() {
  const { accounts, createAccount, updateAccount, deleteAccount, isLoading: loadingAccounts } = useBankAccounts();
  
  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);

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
  }, [editingBank, bankForm]);

  const onSaveBank = (data: BankFormData) => {
    const bankData = {
      ...data,
      branch_name: data.branch_name || null,
      is_active: true,
    };

    if (editingBank) {
      updateAccount({ id: editingBank.id, ...bankData });
      toast.success("Rekening berhasil diperbarui");
    } else {
      createAccount(bankData as any);
      toast.success("Rekening berhasil ditambahkan");
    }
    setIsBankDialogOpen(false);
    setEditingBank(null);
  };

  const handleDeleteBank = (id: string, bankName: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus rekening ${bankName}?`)) {
      deleteAccount(id);
      toast.success("Rekening berhasil dihapus");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Rekening Bank Perusahaan
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
        <p className="text-sm text-muted-foreground mt-1">
          Kelola rekening bank untuk pembayaran dan invoice
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {loadingAccounts ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Memuat data bank...
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <CreditCard className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Belum ada rekening bank yang terdaftar.</p>
            <Button
              variant="link"
              size="sm"
              onClick={() => setIsBankDialogOpen(true)}
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-1" />
              Tambah Rekening Baru
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="p-4 border rounded-lg flex items-start justify-between hover:bg-muted/30 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
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
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteBank(acc.id, acc.bank_name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Bank Account Dialog */}
      <Dialog open={isBankDialogOpen} onOpenChange={setIsBankDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBank ? "Edit Rekening Bank" : "Tambah Rekening Bank Baru"}</DialogTitle>
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
                <Button type="submit" disabled={bankForm.formState.isSubmitting}>
                  {editingBank ? "Simpan Perubahan" : "Tambah Rekening"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}