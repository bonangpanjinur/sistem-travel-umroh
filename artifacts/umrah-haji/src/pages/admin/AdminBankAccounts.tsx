import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Landmark, Plus, Pencil, Trash2, Star, Check, RefreshCw,
  Loader2, Building2, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const API = "/api/v1/payments";

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  branch: string | null;
  is_primary: boolean;
  is_active: boolean;
  notes: string | null;
  logo_url: string | null;
  created_at: string;
}

const EMPTY: Partial<BankAccount> = {
  bank_name: "", account_number: "", account_name: "",
  branch: "", is_primary: false, is_active: true, notes: "",
};

export default function AdminBankAccounts() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [form, setForm] = useState<Partial<BankAccount>>(EMPTY);

  const { data: accounts = [], isLoading, refetch } = useQuery<BankAccount[]>({
    queryKey: ["bank-accounts-admin"],
    queryFn: async () => {
      const r = await fetch(`${API}/bank-accounts/admin`);
      const d = await r.json();
      return d.accounts || [];
    },
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(acc: BankAccount) {
    setEditing(acc);
    setForm({ ...acc });
    setOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = editing ? `${API}/bank-accounts/${editing.id}` : `${API}/bank-accounts`;
      const method = editing ? "PUT" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan");
      return d;
    },
    onSuccess: () => {
      toast.success(editing ? "Rekening diperbarui" : "Rekening ditambahkan");
      qc.invalidateQueries({ queryKey: ["bank-accounts-admin"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`${API}/bank-accounts/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Gagal menghapus");
    },
    onSuccess: () => {
      toast.success("Rekening dihapus");
      qc.invalidateQueries({ queryKey: ["bank-accounts-admin"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const fieldChange = (k: keyof BankAccount, v: any) =>
    setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Landmark className="h-6 w-6 text-emerald-600" />
            Rekening Bank
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Kelola rekening tujuan transfer pembayaran jamaah
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-1.5" /> Tambah Rekening
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Memuat...
        </div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Belum ada rekening bank yang dikonfigurasi.</p>
            <p className="text-xs mt-1">Tambahkan rekening agar jamaah bisa melakukan transfer.</p>
            <Button onClick={openCreate} className="mt-4 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-1.5" /> Tambah Rekening Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {accounts.map(acc => (
            <Card key={acc.id} className={cn(
              "border-2 transition-all",
              acc.is_primary ? "border-emerald-300 bg-emerald-50/20" : "border-border",
              !acc.is_active && "opacity-60"
            )}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg shrink-0">
                      {acc.bank_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{acc.bank_name}</span>
                        {acc.is_primary && (
                          <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200 border">
                            <Star className="h-2.5 w-2.5 mr-0.5" /> Utama
                          </Badge>
                        )}
                        {!acc.is_active && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">Nonaktif</Badge>
                        )}
                      </div>
                      {(acc.branch_name || acc.branch) && <p className="text-xs text-muted-foreground">Cabang {acc.branch_name || acc.branch}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(acc)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus Rekening?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Rekening {acc.bank_name} — {acc.account_number} akan dihapus permanen.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deleteMutation.mutate(acc.id)}
                          >
                            Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div className="mt-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xl font-bold tracking-wider">{acc.account_number}</p>
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6"
                      onClick={() => { navigator.clipboard.writeText(acc.account_number); toast.success("Disalin"); }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">a/n <span className="font-medium text-foreground">{acc.account_name}</span></p>
                  {acc.notes && <p className="text-xs text-muted-foreground mt-1 italic">{acc.notes}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Rekening" : "Tambah Rekening Bank"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nama Bank *</Label>
                <Input
                  className="h-9"
                  placeholder="BCA, BNI, Mandiri..."
                  value={form.bank_name || ""}
                  onChange={e => fieldChange("bank_name", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cabang / Kota</Label>
                <Input
                  className="h-9"
                  placeholder="Solo, Jakarta..."
                  value={form.branch || ""}
                  onChange={e => fieldChange("branch", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nomor Rekening *</Label>
              <Input
                className="h-9 font-mono"
                placeholder="1234567890"
                value={form.account_number || ""}
                onChange={e => fieldChange("account_number", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nama Pemilik Rekening *</Label>
              <Input
                className="h-9"
                placeholder="PT Vinstour Travel"
                value={form.account_name || ""}
                onChange={e => fieldChange("account_name", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Catatan (opsional)</Label>
              <Textarea
                className="h-16 resize-none text-sm"
                placeholder="Informasi tambahan..."
                value={form.notes || ""}
                onChange={e => fieldChange("notes", e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="is-primary"
                  checked={!!form.is_primary}
                  onCheckedChange={v => fieldChange("is_primary", v)}
                />
                <Label htmlFor="is-primary" className="text-sm cursor-pointer">
                  Rekening Utama
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is-active"
                  checked={form.is_active !== false}
                  onCheckedChange={v => fieldChange("is_active", v)}
                />
                <Label htmlFor="is-active" className="text-sm cursor-pointer">Aktif</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !form.bank_name || !form.account_number || !form.account_name}
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              {editing ? "Simpan Perubahan" : "Tambahkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
