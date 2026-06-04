import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CreditCard, Plus, Trash2, Loader2, Edit } from "lucide-react";
import { SectionHead } from "./SectionHead";
import { useBankAccounts, type BankAccount } from "@/hooks/useCompanySettings";

const bankSchema = z.object({
  bank_name: z.string().min(2, "Nama bank minimal 2 karakter"),
  account_number: z.string().min(5, "Nomor rekening minimal 5 karakter").regex(/^[0-9]+$/, "Hanya angka"),
  account_name: z.string().min(3, "Nama pemilik minimal 3 karakter"),
  branch_name: z.string().optional().or(z.literal("")),
  is_primary: z.boolean().default(false),
});
type BankFormData = z.infer<typeof bankSchema>;

export function BankSection() {
  const { accounts, createAccount, updateAccount, deleteAccount, isLoading } = useBankAccounts();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);

  const form = useForm<BankFormData>({
    resolver: zodResolver(bankSchema),
    defaultValues: { bank_name: "", account_number: "", account_name: "", branch_name: "", is_primary: false },
  });

  useEffect(() => {
    if (editing) {
      form.reset({
        bank_name: editing.bank_name, account_number: editing.account_number,
        account_name: editing.account_name, branch_name: editing.branch_name || "",
        is_primary: editing.is_primary || false,
      });
    } else {
      form.reset({ bank_name: "", account_number: "", account_name: "", branch_name: "", is_primary: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const onSubmit = (data: BankFormData) => {
    const payload = { ...data, branch_name: data.branch_name || null, is_active: true };
    if (editing) updateAccount({ id: editing.id, ...payload });
    else createAccount(payload as Parameters<typeof createAccount>[0]);
    setIsDialogOpen(false);
    setEditing(null);
  };

  const openAdd = () => { setEditing(null); setIsDialogOpen(true); };

  return (
    <>
      <SectionHead icon={CreditCard} title="Rekening Bank" desc="Rekening yang muncul di invoice dan instruksi pembayaran jamaah" />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Daftar Rekening</CardTitle>
            <CardDescription>Tambahkan rekening bank perusahaan</CardDescription>
          </div>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" />Tambah
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />Memuat rekening...
            </div>
          ) : accounts.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground border-2 border-dashed rounded-xl">
              <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Belum ada rekening bank</p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={openAdd}>
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
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(acc); setIsDialogOpen(true); }}>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Rekening Bank" : "Tambah Rekening Bank"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="bank_name" render={({ field }) => (
                <FormItem><FormLabel>Nama Bank</FormLabel><FormControl><Input placeholder="BCA, Mandiri, BSI, BRI..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="account_number" render={({ field }) => (
                <FormItem><FormLabel>Nomor Rekening</FormLabel><FormControl><Input placeholder="1234567890" inputMode="numeric" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="account_name" render={({ field }) => (
                <FormItem><FormLabel>Nama Pemilik Rekening</FormLabel><FormControl><Input placeholder="Sesuai buku tabungan" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="branch_name" render={({ field }) => (
                <FormItem><FormLabel>Cabang (Opsional)</FormLabel><FormControl><Input placeholder="Cabang Jakarta Selatan" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="is_primary" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div><FormLabel>Rekening Utama</FormLabel><p className="text-xs text-muted-foreground">Pilihan utama untuk pembayaran jamaah</p></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                <Button type="submit">{editing ? "Simpan Perubahan" : "Tambah Rekening"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}