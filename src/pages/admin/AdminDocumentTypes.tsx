import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";

type DocumentType = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_required: boolean;
  is_active: boolean;
  max_file_size_mb: number;
  allowed_extensions: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type FormState = {
  id?: string;
  code: string;
  name: string;
  description: string;
  is_required: boolean;
  is_active: boolean;
  max_file_size_mb: number;
  allowed_extensions: string;
  sort_order: number;
};

const emptyForm: FormState = {
  code: "",
  name: "",
  description: "",
  is_required: false,
  is_active: true,
  max_file_size_mb: 5,
  allowed_extensions: "jpg, jpeg, png, pdf",
  sort_order: 0,
};

export default function AdminDocumentTypes() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: items, isLoading } = useQuery({
    queryKey: ["admin-document-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_types")
        .select("*")
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return (data ?? []) as DocumentType[];
    },
  });

  const openCreate = () => {
    const nextOrder = items && items.length ? Math.max(...items.map((i) => i.sort_order)) + 10 : 10;
    setForm({ ...emptyForm, sort_order: nextOrder });
    setDialogOpen(true);
  };

  const openEdit = (it: DocumentType) => {
    setForm({
      id: it.id,
      code: it.code,
      name: it.name,
      description: it.description ?? "",
      is_required: it.is_required,
      is_active: it.is_active,
      max_file_size_mb: it.max_file_size_mb,
      allowed_extensions: (it.allowed_extensions ?? []).join(", "),
      sort_order: it.sort_order,
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: FormState) => {
      const exts = payload.allowed_extensions
        .split(",")
        .map((s) => s.trim().toLowerCase().replace(/^\./, ""))
        .filter(Boolean);
      if (exts.length === 0) {
        throw new Error("Minimal satu ekstensi file diizinkan");
      }
      if (payload.max_file_size_mb < 1 || payload.max_file_size_mb > 50) {
        throw new Error("Ukuran file harus antara 1–50 MB");
      }
      if (!payload.code.match(/^[a-z0-9_]+$/)) {
        throw new Error("Kode hanya boleh huruf kecil, angka, dan underscore");
      }

      const data = {
        code: payload.code.trim(),
        name: payload.name.trim(),
        description: payload.description.trim() || null,
        is_required: payload.is_required,
        is_active: payload.is_active,
        max_file_size_mb: payload.max_file_size_mb,
        allowed_extensions: exts,
        sort_order: payload.sort_order,
      };

      if (payload.id) {
        const { error } = await supabase
          .from("document_types")
          .update(data)
          .eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("document_types").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(form.id ? "Jenis dokumen diperbarui" : "Jenis dokumen ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["admin-document-types"] });
      queryClient.invalidateQueries({ queryKey: ["document-types"] });
      setDialogOpen(false);
      setForm(emptyForm);
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menyimpan jenis dokumen");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("document_types").delete().eq("id", id);
      if (error) {
        if (error.code === "23503") {
          throw new Error("Tidak bisa dihapus karena masih dipakai dokumen jamaah. Nonaktifkan saja.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Jenis dokumen dihapus");
      queryClient.invalidateQueries({ queryKey: ["admin-document-types"] });
      queryClient.invalidateQueries({ queryKey: ["document-types"] });
    },
    onError: (err: any) => toast.error(err.message || "Gagal menghapus"),
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ id, newOrder }: { id: string; newOrder: number }) => {
      const { error } = await supabase
        .from("document_types")
        .update({ sort_order: newOrder })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-document-types"] });
      queryClient.invalidateQueries({ queryKey: ["document-types"] });
    },
  });

  const handleMove = async (idx: number, dir: -1 | 1) => {
    if (!items) return;
    const target = items[idx + dir];
    const current = items[idx];
    if (!target || !current) return;
    await Promise.all([
      reorderMutation.mutateAsync({ id: current.id, newOrder: target.sort_order }),
      reorderMutation.mutateAsync({ id: target.id, newOrder: current.sort_order }),
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveMutation.mutateAsync(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-primary" />
            Jenis Dokumen
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola aturan upload dokumen jamaah (wajib/opsional, batas file, urutan tampil)
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Jenis Dokumen
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Jenis Dokumen</CardTitle>
          <CardDescription>
            Urutan menentukan bagaimana dokumen ditampilkan di formulir upload jamaah.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <LoadingState />
            </div>
          ) : !items || items.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={FileText}
                title="Belum ada jenis dokumen"
                description="Tambahkan jenis dokumen pertama untuk memulai"
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Urutan</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Kode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Batas File</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it, idx) => (
                    <TableRow key={it.id} className={!it.is_active ? "opacity-60" : ""}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            disabled={idx === 0 || reorderMutation.isPending}
                            onClick={() => handleMove(idx, -1)}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            disabled={idx === items.length - 1 || reorderMutation.isPending}
                            onClick={() => handleMove(idx, 1)}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{it.name}</p>
                          {it.description && (
                            <p className="text-xs text-muted-foreground">{it.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{it.code}</code>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {it.is_required ? (
                            <Badge variant="destructive" className="text-xs">Wajib</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Opsional</Badge>
                          )}
                          {!it.is_active && (
                            <Badge variant="secondary" className="text-xs">Nonaktif</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{it.max_file_size_mb} MB</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {(it.allowed_extensions ?? []).map((ext) => (
                            <Badge key={ext} variant="outline" className="text-xs">
                              .{ext}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEdit(it)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus jenis dokumen?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  "{it.name}" akan dihapus permanen. Jika sudah dipakai oleh dokumen
                                  jamaah, gunakan tombol Nonaktifkan saja melalui Edit.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => deleteMutation.mutate(it.id)}
                                >
                                  Hapus
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit" : "Tambah"} Jenis Dokumen</DialogTitle>
            <DialogDescription>
              Konfigurasi aturan upload yang berlaku untuk semua jamaah.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="name">Nama *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Misal: KTP"
                  required
                  maxLength={100}
                />
              </div>
              <div>
                <Label htmlFor="code">Kode *</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })
                  }
                  placeholder="ktp"
                  required
                  disabled={!!form.id}
                  maxLength={50}
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Huruf kecil, angka, underscore. Tidak dapat diubah.
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="Petunjuk untuk jamaah"
                maxLength={500}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="size">Batas File (MB) *</Label>
                <Input
                  id="size"
                  type="number"
                  min={1}
                  max={50}
                  value={form.max_file_size_mb}
                  onChange={(e) =>
                    setForm({ ...form, max_file_size_mb: Number(e.target.value) || 5 })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="order">Urutan Tampil *</Label>
                <Input
                  id="order"
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="exts">Format Diizinkan *</Label>
              <Input
                id="exts"
                value={form.allowed_extensions}
                onChange={(e) => setForm({ ...form, allowed_extensions: e.target.value })}
                placeholder="jpg, png, pdf"
                required
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Pisahkan dengan koma. Contoh: jpg, jpeg, png, pdf
              </p>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <Label htmlFor="required" className="cursor-pointer">Wajib Diunggah</Label>
                <p className="text-xs text-muted-foreground">
                  Jamaah harus mengunggah dokumen ini
                </p>
              </div>
              <Switch
                id="required"
                checked={form.is_required}
                onCheckedChange={(c) => setForm({ ...form, is_required: c })}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <Label htmlFor="active" className="cursor-pointer">Aktif</Label>
                <p className="text-xs text-muted-foreground">
                  Tampilkan di formulir upload jamaah
                </p>
              </div>
              <Switch
                id="active"
                checked={form.is_active}
                onCheckedChange={(c) => setForm({ ...form, is_active: c })}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
