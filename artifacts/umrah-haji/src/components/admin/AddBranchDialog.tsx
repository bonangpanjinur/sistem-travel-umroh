import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Building2, UserPlus, KeyRound, MessageCircle, Copy, CheckCircle2, Loader2 } from "lucide-react";

interface AddBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CreatedResult {
  branchCode: string;
  managerEmail?: string;
  tempPassword?: string;
  waSent: boolean;
  waError?: string | null;
}

export default function AddBranchDialog({ open, onOpenChange }: AddBranchDialogProps) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<CreatedResult | null>(null);

  const [form, setForm] = useState({
    name: "",
    code: "",
    slug: "",
    city: "",
    province: "",
    address: "",
    phone: "",
    email: "",
    isActive: true,
    managerName: "",
    managerEmail: "",
    managerPhone: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.name || !form.code) throw new Error("Nama dan kode cabang wajib diisi");
      if (form.managerEmail && !form.managerName)
        throw new Error("Nama manager wajib diisi jika email manager diisi");

      const res = await fetch("/api/branches/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          code: form.code.toUpperCase(),
          slug: form.slug || null,
          city: form.city || null,
          province: form.province || null,
          address: form.address || null,
          phone: form.phone || null,
          email: form.email || null,
          isActive: form.isActive,
          managerName: form.managerName || null,
          managerEmail: form.managerEmail || null,
          managerPhone: form.managerPhone || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Gagal membuat cabang");
      return data as CreatedResult & { branchId: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-branches"] });
      setResult(data);
      if (data.managerEmail) {
        toast.success(`Cabang ${data.branchCode} + akun manager berhasil dibuat!`);
      } else {
        toast.success(`Cabang ${data.branchCode} berhasil dibuat`);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleClose = () => {
    setResult(null);
    setForm({
      name: "", code: "", slug: "", city: "", province: "",
      address: "", phone: "", email: "", isActive: true,
      managerName: "", managerEmail: "", managerPhone: "",
    });
    onOpenChange(false);
  };

  const copyCredentials = () => {
    if (!result?.tempPassword) return;
    const text = `Email: ${result.managerEmail}\nPassword: ${result.tempPassword}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Tambah Cabang Baru
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 py-2">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Cabang <strong>{result.branchCode}</strong> berhasil dibuat!
              </AlertDescription>
            </Alert>

            {result.managerEmail && result.tempPassword && (
              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  Kredensial Branch Manager
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-mono font-medium">{result.managerEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Password Sementara</span>
                    <span className="font-mono font-medium">{result.tempPassword}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={copyCredentials} className="flex-1">
                    {copied ? <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" /> : <Copy className="h-3 w-3 mr-1" />}
                    {copied ? "Tersalin" : "Salin Kredensial"}
                  </Button>
                  {result.waSent ? (
                    <span className="text-xs flex items-center gap-1 text-green-700">
                      <MessageCircle className="h-3 w-3" />
                      WA terkirim
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600 flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      WA gagal — kirim manual
                    </span>
                  )}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Manager harus mengganti password setelah login pertama.
            </p>

            <DialogFooter>
              <Button onClick={handleClose}>Selesai</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Data Cabang
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nama Cabang <span className="text-destructive">*</span></Label>
                  <Input value={form.name} onChange={set("name")} placeholder="Cabang Jakarta" />
                </div>
                <div className="space-y-1.5">
                  <Label>Kode <span className="text-destructive">*</span></Label>
                  <Input value={form.code} onChange={set("code")} placeholder="JKT" className="uppercase" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Subdomain Website</Label>
                <Input value={form.slug} onChange={set("slug")} placeholder="jakarta" />
                {form.slug && (
                  <p className="text-xs text-muted-foreground font-mono">
                    {window.location.origin}/b/{form.slug}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Kota</Label>
                  <Input value={form.city} onChange={set("city")} placeholder="Jakarta" />
                </div>
                <div className="space-y-1.5">
                  <Label>Provinsi</Label>
                  <Input value={form.province} onChange={set("province")} placeholder="DKI Jakarta" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>No. Telepon</Label>
                  <Input value={form.phone} onChange={set("phone")} placeholder="021-xxx" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email Cabang</Label>
                  <Input type="email" value={form.email} onChange={set("email")} placeholder="cabang@..." />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={v => setForm(prev => ({ ...prev, isActive: v }))}
                />
                <Label>Aktif</Label>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Akun Branch Manager
                </p>
                <span className="text-xs text-muted-foreground">(opsional)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Jika diisi, akun login akan dibuat otomatis dan kredensial dikirim via WhatsApp.
              </p>
              <div className="space-y-1.5">
                <Label>Nama Manager</Label>
                <Input value={form.managerName} onChange={set("managerName")} placeholder="Nama lengkap manager" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Email Login Manager</Label>
                  <Input type="email" value={form.managerEmail} onChange={set("managerEmail")} placeholder="manager@..." />
                </div>
                <div className="space-y-1.5">
                  <Label>No. HP (untuk WA)</Label>
                  <Input value={form.managerPhone} onChange={set("managerPhone")} placeholder="08xx" />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Batal</Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !form.name || !form.code}
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Buat Cabang
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
