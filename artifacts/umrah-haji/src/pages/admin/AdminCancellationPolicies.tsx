/**
 * AdminCancellationPolicies.tsx
 * Halaman manajemen aturan pembatalan.
 * Aturan bisa bersifat GLOBAL (berlaku untuk semua paket) atau per-paket.
 * Aturan dapat ditautkan ke Form Transaksi / Invoice PDF secara otomatis.
 *
 * ─── MIGRATION SQL (jalankan di Supabase SQL Editor) ─────────────────────────
 * CREATE TABLE IF NOT EXISTS cancellation_policies (
 *   id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   name        text NOT NULL,
 *   is_global   boolean NOT NULL DEFAULT false,
 *   package_id  uuid REFERENCES packages(id) ON DELETE SET NULL,
 *   sections    jsonb NOT NULL DEFAULT '[]',
 *   created_at  timestamptz NOT NULL DEFAULT now(),
 *   updated_at  timestamptz NOT NULL DEFAULT now()
 * );
 * ALTER TABLE cancellation_policies ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "staff_all" ON cancellation_policies FOR ALL TO authenticated USING (true) WITH CHECK (true);
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Globe, Package, ChevronDown, ChevronUp, X, GripVertical, Info, FileText, Loader2,
} from "lucide-react";
import {
  generateTransactionForm,
  DEFAULT_TEMPLATE,
} from "@/lib/transaction-form-generator";

interface PolicySection {
  title: string;
  items: string[];
}

interface CancellationPolicy {
  id: string;
  name: string;
  is_global: boolean;
  package_id: string | null;
  sections: PolicySection[];
  created_at: string;
  package?: { name: string };
}

interface PolicyForm {
  name: string;
  is_global: boolean;
  package_id: string;
  sections: PolicySection[];
}

const EMPTY_FORM: PolicyForm = {
  name: "",
  is_global: true,
  package_id: "",
  sections: [
    { title: "PEMBAYARAN", items: [""] },
    { title: "PEMBATALAN", items: [""] },
    { title: "PINDAH PAKET, PINDAH TANGGAL, GANTI NAMA", items: [""] },
  ],
};

export default function AdminCancellationPolicies() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<PolicyForm>(EMPTY_FORM);
  const [expandedPreview, setExpandedPreview] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  async function handlePreviewPDF(p: CancellationPolicy) {
    setPreviewingId(p.id);
    try {
      const sampleDate = new Date();
      const departureDate = new Date(sampleDate);
      departureDate.setMonth(departureDate.getMonth() + 3);
      const returnDate = new Date(departureDate);
      returnDate.setDate(returnDate.getDate() + 9);

      const doc = await generateTransactionForm(
        {
          transactionCode: "TRA-PREVIEW",
          customerCode: "JMH-PREVIEW",
          transactionDate: sampleDate,
          customerName: "CONTOH JAMAAH",
          customerAddress: "Jl. Contoh No. 1, Jakarta Selatan",
          customerPhone: "08123456789",
          packageName: "UMRAH REGULER 1448 H",
          packageType: "UMRAH 9 HARI",
          umrahSeason: "1448 H",
          programDays: "9 HARI",
          departureDate,
          returnDate,
          hotelMakkah: "Hotel Contoh Makkah ★★★★",
          hotelMadinah: "Hotel Contoh Madinah ★★★★",
          airline: "Maskapai Contoh",
          airport: "Soekarno-Hatta (CGK)",
          roomCombinations: [
            { roomType: "Triple", pricePerPax: 29500000, paxCount: 1, roomCount: 1 },
          ],
          totalPrice: 29500000,
          passengers: [
            {
              name: "CONTOH JAMAAH",
              roomType: "Triple",
              basePrice: 29500000,
              discount: 0,
              totalBill: 29500000,
            },
          ],
        },
        {
          name: "VINSTOUR TRAVEL",
          address: "Jl. Travel Islami No. 99, Jakarta",
          phone: "(021) 99999999",
          email: "info@vinstour.id",
        },
        {
          ...DEFAULT_TEMPLATE,
          cancellationPolicy: {
            id: p.id,
            name: p.name,
            sections: p.sections,
          },
        }
      );
      doc.output("dataurlnewwindow");
    } catch (err: any) {
      toast.error("Gagal membuat pratinjau PDF: " + (err?.message ?? "error"));
    } finally {
      setPreviewingId(null);
    }
  }

  const { data: policies = [], isLoading } = useQuery<CancellationPolicy[]>({
    queryKey: ["cancellation-policies"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("cancellation_policies")
        .select("*, package:packages(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: packages = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["packages-list-simple"],
    queryFn: async () => {
      const { data } = await supabase.from("packages").select("id, name").order("name");
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        is_global: form.is_global,
        package_id: form.is_global ? null : (form.package_id || null),
        sections: form.sections.map(s => ({
          title: s.title.trim(),
          items: s.items.filter(i => i.trim() !== ""),
        })).filter(s => s.title),
        updated_at: new Date().toISOString(),
      };
      if (editingId) {
        const { error } = await (supabase as any)
          .from("cancellation_policies")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("cancellation_policies")
          .insert({ ...payload, created_at: new Date().toISOString() });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Aturan pembatalan diperbarui" : "Aturan pembatalan ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["cancellation-policies"] });
      setShowDialog(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    },
    onError: (e: any) => toast.error(e.message || "Gagal menyimpan aturan"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("cancellation_policies")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aturan pembatalan dihapus");
      queryClient.invalidateQueries({ queryKey: ["cancellation-policies"] });
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.message || "Gagal menghapus aturan"),
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowDialog(true);
  }

  function openEdit(p: CancellationPolicy) {
    setForm({
      name: p.name,
      is_global: p.is_global,
      package_id: p.package_id ?? "",
      sections: p.sections.length > 0
        ? p.sections.map(s => ({ title: s.title, items: s.items.length > 0 ? [...s.items, ""] : [""] }))
        : [{ title: "", items: [""] }],
    });
    setEditingId(p.id);
    setShowDialog(true);
  }

  // ── Section helpers ────────────────────────────────────────────────────────

  function addSection() {
    setForm(f => ({ ...f, sections: [...f.sections, { title: "", items: [""] }] }));
  }

  function removeSection(si: number) {
    setForm(f => ({ ...f, sections: f.sections.filter((_, i) => i !== si) }));
  }

  function updateSectionTitle(si: number, val: string) {
    setForm(f => {
      const sections = [...f.sections];
      sections[si] = { ...sections[si], title: val };
      return { ...f, sections };
    });
  }

  function moveSection(si: number, dir: -1 | 1) {
    setForm(f => {
      const sections = [...f.sections];
      const target = si + dir;
      if (target < 0 || target >= sections.length) return f;
      [sections[si], sections[target]] = [sections[target], sections[si]];
      return { ...f, sections };
    });
  }

  function addItem(si: number) {
    setForm(f => {
      const sections = [...f.sections];
      sections[si] = { ...sections[si], items: [...sections[si].items, ""] };
      return { ...f, sections };
    });
  }

  function updateItem(si: number, ii: number, val: string) {
    setForm(f => {
      const sections = [...f.sections];
      const items = [...sections[si].items];
      items[ii] = val;
      sections[si] = { ...sections[si], items };
      return { ...f, sections };
    });
  }

  function removeItem(si: number, ii: number) {
    setForm(f => {
      const sections = [...f.sections];
      const items = sections[si].items.filter((_, i) => i !== ii);
      sections[si] = { ...sections[si], items: items.length > 0 ? items : [""] };
      return { ...f, sections };
    });
  }

  const isValid = form.name.trim().length > 0 && (form.is_global || !!form.package_id);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Aturan Pembatalan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola syarat & ketentuan pembayaran dan pembatalan. Aturan ini otomatis muncul di Form Transaksi PDF.
          </p>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Tambah Aturan
        </Button>
      </div>

      {/* Info Banner */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4 flex gap-3 items-start">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <p><strong>Cara kerja:</strong> Saat mencetak Form Transaksi dari halaman detail booking, sistem akan otomatis mencari aturan yang spesifik untuk paket tersebut. Jika tidak ada, akan menggunakan aturan <strong>Global</strong>.</p>
            <p>Jika tidak ada aturan sama sekali, sistem menggunakan teks syarat & ketentuan dari <strong>Template Invoice</strong>.</p>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Daftar Aturan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Memuat...</div>
          ) : policies.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-muted-foreground text-sm">Belum ada aturan pembatalan.</p>
              <Button variant="outline" size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Buat Aturan Pertama
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Aturan</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Berlaku Untuk</TableHead>
                  <TableHead className="text-center">Seksi</TableHead>
                  <TableHead className="w-24">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map(p => (
                  <>
                    <TableRow
                      key={p.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => setExpandedPreview(expandedPreview === p.id ? null : p.id)}
                    >
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        {p.is_global ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                            <Globe className="h-3 w-3 mr-1" />
                            Global
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <Package className="h-3 w-3 mr-1" />
                            Per Paket
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.is_global ? "Semua paket (fallback)" : (p.package?.name ?? "—")}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{p.sections.length} seksi</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700"
                            title="Pratinjau PDF"
                            onClick={e => { e.stopPropagation(); handlePreviewPDF(p); }}
                            disabled={previewingId === p.id}
                          >
                            {previewingId === p.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <FileText className="h-3.5 w-3.5" />
                            }
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); openEdit(p); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={e => { e.stopPropagation(); setDeleteId(p.id); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedPreview === p.id && (
                      <TableRow key={`${p.id}-preview`}>
                        <TableCell colSpan={5} className="bg-muted/20 p-4">
                          <div className="font-mono text-xs text-muted-foreground space-y-3 max-h-64 overflow-y-auto">
                            <p className="font-bold text-foreground">{p.name.toUpperCase()}</p>
                            {p.sections.map((s, si) => (
                              <div key={si}>
                                <p className="font-semibold text-foreground">{s.title.toUpperCase()}:</p>
                                {s.items.map((item, ii) => (
                                  <p key={ii} className="pl-4">• {item}</p>
                                ))}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={open => { if (!open) { setShowDialog(false); setEditingId(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Aturan Pembatalan" : "Tambah Aturan Pembatalan"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label>Nama Aturan *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Syarat & Ketentuan Pembayaran dan Pembatalan 1448 H"
              />
              <p className="text-xs text-muted-foreground">Nama ini muncul sebagai judul di PDF</p>
            </div>

            {/* Global toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium text-sm">Berlaku Global</p>
                <p className="text-xs text-muted-foreground">Digunakan untuk semua paket yang tidak punya aturan sendiri</p>
              </div>
              <Switch
                checked={form.is_global}
                onCheckedChange={v => setForm(f => ({ ...f, is_global: v, package_id: v ? "" : f.package_id }))}
              />
            </div>

            {/* Package selector */}
            {!form.is_global && (
              <div className="space-y-1.5">
                <Label>Paket *</Label>
                <Select value={form.package_id} onValueChange={v => setForm(f => ({ ...f, package_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih paket..." />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map(pkg => (
                      <SelectItem key={pkg.id} value={pkg.id}>{pkg.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Separator />

            {/* Sections */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Seksi / Bagian</Label>
                <Button variant="outline" size="sm" onClick={addSection}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Tambah Seksi
                </Button>
              </div>

              {form.sections.map((section, si) => (
                <div key={si} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                  {/* Section header */}
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                      className="font-semibold text-sm h-8"
                      value={section.title}
                      onChange={e => updateSectionTitle(si, e.target.value)}
                      placeholder="Judul seksi, mis: PEMBAYARAN"
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => moveSection(si, -1)} disabled={si === 0}>
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => moveSection(si, 1)} disabled={si === form.sections.length - 1}>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                    {form.sections.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" onClick={() => removeSection(si)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Items */}
                  <div className="pl-6 space-y-1.5">
                    {section.items.map((item, ii) => (
                      <div key={ii} className="flex gap-1.5">
                        <span className="text-muted-foreground text-xs mt-2">•</span>
                        <Input
                          className="h-7 text-xs"
                          value={item}
                          onChange={e => updateItem(si, ii, e.target.value)}
                          placeholder={`Poin ${ii + 1}...`}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); addItem(si); }
                          }}
                        />
                        {section.items.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground" onClick={() => removeItem(si, ii)}>
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground pl-4" onClick={() => addItem(si)}>
                      <Plus className="h-3 w-3 mr-1" />
                      Tambah poin
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Preview */}
            {form.name && form.sections.some(s => s.title) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm">Pratinjau PDF</Label>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 font-mono text-xs space-y-3 max-h-48 overflow-y-auto border">
                    <p className="font-bold">{form.name.toUpperCase()}</p>
                    {form.sections.filter(s => s.title).map((s, si) => (
                      <div key={si}>
                        <p className="font-bold text-primary">{s.title.toUpperCase()}:</p>
                        {s.items.filter(i => i.trim()).map((item, ii) => (
                          <p key={ii} className="pl-4 text-muted-foreground">      {item}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setEditingId(null); }}>Batal</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!isValid || saveMutation.isPending}>
              {saveMutation.isPending ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Tambah Aturan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Aturan Pembatalan?</AlertDialogTitle>
            <AlertDialogDescription>
              Aturan ini akan dihapus permanen. Booking yang sudah dibuat sebelumnya tidak terpengaruh.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
