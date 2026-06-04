import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Plus, Edit2, Trash2, Save, ChevronUp, ChevronDown,
  HelpCircle, Eye, EyeOff, Search, MessageSquare, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = ["Umum", "Pendaftaran", "Dokumen", "Visa", "Paket", "Pembayaran", "Pembatalan", "Lainnya"];

const EMPTY_FORM = { question: "", answer: "", category: "Umum", is_published: true };

export default function AdminFAQManager() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // ─── Fetch ────────────────────────────────────────────────────────────────
  const { data: faqs = [], isLoading } = useQuery<FAQ[]>({
    queryKey: ["admin-faqs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faqs")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // ─── Derived / filtered list ──────────────────────────────────────────────
  const filtered = faqs.filter((f) => {
    const matchSearch =
      !search ||
      f.question.toLowerCase().includes(search.toLowerCase()) ||
      f.answer.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "all" || f.category === filterCat;
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "published" && f.is_published) ||
      (filterStatus === "hidden" && !f.is_published);
    return matchSearch && matchCat && matchStatus;
  });

  const publishedCount = faqs.filter((f) => f.is_published).length;
  const totalCount = faqs.length;

  // ─── Mutations ────────────────────────────────────────────────────────────
  const upsertMutation = useMutation({
    mutationFn: async (payload: Omit<FAQ, "id" | "created_at" | "updated_at"> & { id?: string }) => {
      if (payload.id) {
        const { error } = await supabase.from("faqs").update({
          question: payload.question,
          answer: payload.answer,
          category: payload.category,
          is_published: payload.is_published,
        }).eq("id", payload.id);
        if (error) throw error;
      } else {
        const maxOrder = faqs.length > 0 ? Math.max(...faqs.map((f) => f.sort_order)) + 1 : 0;
        const { error } = await supabase.from("faqs").insert({
          question: payload.question,
          answer: payload.answer,
          category: payload.category,
          is_published: payload.is_published,
          sort_order: maxOrder,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-faqs"] });
      toast.success(vars.id ? "FAQ berhasil diperbarui" : "FAQ berhasil ditambahkan");
      closeDialog();
    },
    onError: (err: any) => toast.error(`Gagal: ${err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("faqs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-faqs"] });
      toast.success("FAQ berhasil dihapus");
      setDeleteId(null);
    },
    onError: (err: any) => toast.error(`Gagal menghapus: ${err.message}`),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase.from("faqs").update({ is_published: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-faqs"] }),
    onError: (err: any) => toast.error(`Gagal: ${err.message}`),
  });

  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      const promises = updates.map(({ id, sort_order }) =>
        supabase.from("faqs").update({ sort_order }).eq("id", id)
      );
      const results = await Promise.all(promises);
      const err = results.find((r) => r.error);
      if (err?.error) throw err.error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-faqs"] }),
    onError: (err: any) => toast.error(`Gagal mengubah urutan: ${err.message}`),
  });

  // ─── Dialog helpers ───────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (faq: FAQ) => {
    setEditingId(faq.id);
    setForm({ question: faq.question, answer: faq.answer, category: faq.category, is_published: faq.is_published });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = () => {
    if (!form.question.trim() || !form.answer.trim()) {
      toast.error("Pertanyaan dan jawaban tidak boleh kosong");
      return;
    }
    upsertMutation.mutate(editingId ? { ...form, id: editingId, sort_order: 0 } : { ...form, sort_order: 0 });
  };

  const handleReorder = useCallback((faq: FAQ, dir: "up" | "down") => {
    const idx = faqs.findIndex((f) => f.id === faq.id);
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === faqs.length - 1) return;
    const other = faqs[dir === "up" ? idx - 1 : idx + 1];
    reorderMutation.mutate([
      { id: faq.id, sort_order: other.sort_order },
      { id: other.id, sort_order: faq.sort_order },
    ]);
  }, [faqs, reorderMutation]);

  // ─── Category colours ─────────────────────────────────────────────────────
  const catColor: Record<string, string> = {
    "Umum": "bg-slate-100 text-slate-700",
    "Pendaftaran": "bg-blue-100 text-blue-700",
    "Dokumen": "bg-purple-100 text-purple-700",
    "Visa": "bg-amber-100 text-amber-700",
    "Paket": "bg-emerald-100 text-emerald-700",
    "Pembayaran": "bg-green-100 text-green-700",
    "Pembatalan": "bg-red-100 text-red-700",
    "Lainnya": "bg-gray-100 text-gray-600",
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-primary" />
            FAQ Manager
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Kelola pertanyaan yang sering ditanyakan — tersimpan di database, tampil di website & chatbot secara real-time.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Tambah FAQ
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total FAQ", value: totalCount, icon: MessageSquare, color: "text-primary" },
          { label: "Ditampilkan", value: publishedCount, icon: Eye, color: "text-emerald-600" },
          { label: "Disembunyikan", value: totalCount - publishedCount, icon: EyeOff, color: "text-muted-foreground" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={cn("h-5 w-5 flex-shrink-0", color)} />
              <div>
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari pertanyaan atau jawaban..."
                className="pl-9"
              />
            </div>
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-full sm:w-44">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="published">Ditampilkan</SelectItem>
                <SelectItem value="hidden">Disembunyikan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* FAQ List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Daftar FAQ
            {filtered.length !== faqs.length && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({filtered.length} dari {faqs.length})
              </span>
            )}
          </CardTitle>
          <CardDescription className="text-xs">
            Urutan ditampilkan sesuai sort_order. Klik panah untuk mengubah urutan tampilan di website.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <HelpCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{faqs.length === 0 ? "Belum ada FAQ" : "Tidak ada FAQ yang cocok"}</p>
              {faqs.length === 0 && (
                <Button onClick={openCreate} variant="outline" className="mt-4 gap-2">
                  <Plus className="h-4 w-4" /> Tambah FAQ Pertama
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((faq, idx) => {
                const isExpanded = expandedId === faq.id;
                const realIdx = faqs.findIndex((f) => f.id === faq.id);
                return (
                  <div key={faq.id} className={cn("transition-colors", !faq.is_published && "bg-muted/30")}>
                    {/* Row header */}
                    <div
                      className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40"
                      onClick={() => setExpandedId(isExpanded ? null : faq.id)}
                    >
                      {/* Sort buttons */}
                      <div className="flex flex-col gap-0.5 mt-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          disabled={realIdx === 0}
                          onClick={() => handleReorder(faq, "up")}
                          className="p-0.5 rounded hover:bg-muted disabled:opacity-25"
                        >
                          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button
                          disabled={realIdx === faqs.length - 1}
                          onClick={() => handleReorder(faq, "down")}
                          className="p-0.5 rounded hover:bg-muted disabled:opacity-25"
                        >
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border-none font-medium", catColor[faq.category] ?? catColor["Lainnya"])}>
                            {faq.category}
                          </Badge>
                          {!faq.is_published && (
                            <span className="text-[10px] text-muted-foreground italic flex items-center gap-0.5">
                              <EyeOff className="h-2.5 w-2.5" /> Disembunyikan
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold leading-snug line-clamp-1">{faq.question}</p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={faq.is_published}
                          onCheckedChange={(v) => togglePublish.mutate({ id: faq.id, value: v })}
                          className="scale-75"
                          title={faq.is_published ? "Sembunyikan" : "Tampilkan"}
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(faq)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(faq.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded answer */}
                    {isExpanded && (
                      <div className="px-12 pb-4 pt-1 border-t bg-muted/20">
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit FAQ" : "Tambah FAQ Baru"}</DialogTitle>
            <DialogDescription>
              FAQ yang ditampilkan akan langsung muncul di halaman website dan digunakan sebagai pengetahuan chatbot.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="faq-category">Kategori</Label>
              <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                <SelectTrigger id="faq-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="faq-q">Pertanyaan <span className="text-destructive">*</span></Label>
              <Input
                id="faq-q"
                value={form.question}
                onChange={(e) => setForm((p) => ({ ...p, question: e.target.value }))}
                placeholder="Contoh: Bagaimana cara mendaftar umroh?"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="faq-a">Jawaban <span className="text-destructive">*</span></Label>
              <Textarea
                id="faq-a"
                value={form.answer}
                onChange={(e) => setForm((p) => ({ ...p, answer: e.target.value }))}
                placeholder="Tuliskan jawaban lengkap. Gunakan baris baru untuk membuat daftar."
                className="min-h-[140px] resize-none"
              />
              <p className="text-[11px] text-muted-foreground">
                Tips: tekan Enter untuk membuat baris baru / daftar langkah-langkah.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Switch
                id="faq-published"
                checked={form.is_published}
                onCheckedChange={(v) => setForm((p) => ({ ...p, is_published: v }))}
              />
              <div>
                <Label htmlFor="faq-published" className="cursor-pointer text-sm font-medium">
                  Tampilkan di website
                </Label>
                <p className="text-xs text-muted-foreground">
                  {form.is_published
                    ? "FAQ ini akan ditampilkan di halaman publik dan chatbot."
                    : "FAQ tersimpan sebagai draft, tidak tampil di publik."}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Batal</Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending} className="gap-2">
              <Save className="h-4 w-4" />
              {upsertMutation.isPending ? "Menyimpan..." : "Simpan FAQ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus FAQ ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. FAQ akan dihapus permanen dari database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Menghapus..." : "Ya, Hapus"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
