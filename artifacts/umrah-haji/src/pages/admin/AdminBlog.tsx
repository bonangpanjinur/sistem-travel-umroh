import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  PenLine, Plus, Search, Trash2, Eye, BookOpen,
  FileText, TrendingUp, Globe, Clock
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const CATEGORIES = ["Tips & Info", "Berita", "Panduan Ibadah", "Inspirasi", "Promo"];

const DEMO_ARTICLES = [
  {
    id: "1", title: "Persiapan Umroh: Checklist Lengkap Sebelum Berangkat",
    slug: "persiapan-umroh-checklist",
    category: "Panduan Ibadah", status: "published",
    excerpt: "Panduan lengkap mempersiapkan perjalanan Umroh agar ibadah berjalan lancar dan khusyuk.",
    cover_image_url: "https://images.unsplash.com/photo-1466442929976-97f336a657be?w=400&q=80",
    views: 1240, published_at: "2026-04-10T08:00:00Z", author: "Admin Vinstour",
  },
  {
    id: "2", title: "5 Doa Wajib yang Perlu Dihafal Sebelum Umroh",
    slug: "doa-wajib-umroh",
    category: "Panduan Ibadah", status: "published",
    excerpt: "Kumpulan doa-doa penting yang harus dikuasai oleh setiap jamaah Umroh.",
    cover_image_url: "https://images.unsplash.com/photo-1564769610726-59cead6a6f8f?w=400&q=80",
    views: 980, published_at: "2026-04-05T08:00:00Z", author: "Ustadz Ahmad",
  },
  {
    id: "3", title: "Promo Paket Umroh Plus Turki Ramadan 2027",
    slug: "promo-umroh-turki-ramadan-2027",
    category: "Promo", status: "published",
    excerpt: "Nikmati perjalanan spiritual sekaligus wisata budaya ke Turki dengan harga spesial.",
    cover_image_url: "https://images.unsplash.com/photo-1527576539890-dfa815648363?w=400&q=80",
    views: 2150, published_at: "2026-03-28T08:00:00Z", author: "Tim Marketing",
  },
  {
    id: "4", title: "Perbedaan Umroh Reguler, Plus, dan VIP",
    slug: "perbedaan-paket-umroh",
    category: "Tips & Info", status: "published",
    excerpt: "Penjelasan lengkap perbedaan fasilitas, hotel, dan layanan tiap jenis paket Umroh.",
    cover_image_url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&q=80",
    views: 760, published_at: "2026-03-15T08:00:00Z", author: "Admin Vinstour",
  },
  {
    id: "5", title: "Panduan Haji 2027: Pendaftaran & Prosedur Terbaru",
    slug: "panduan-haji-2027",
    category: "Berita", status: "draft",
    excerpt: "Update terbaru prosedur pendaftaran Haji reguler dan khusus untuk tahun 2027.",
    cover_image_url: "",
    views: 0, published_at: null, author: "Admin Vinstour",
  },
];

const EMPTY_FORM = {
  title: "", slug: "", category: CATEGORIES[0],
  status: "draft" as "draft" | "published",
  excerpt: "", content: "", cover_image_url: "", author: "",
};

export default function AdminBlog() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "draft">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: articles = DEMO_ARTICLES, isLoading } = useQuery({
    queryKey: ["blog-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("*")
        .order("published_at", { ascending: false });
      if (error || !data?.length) return DEMO_ARTICLES;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        const { error } = await supabase.from("blog_articles").update(payload).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_articles").insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-articles"] });
      toast({ title: "Artikel disimpan" });
      setDialogOpen(false);
    },
    onError: () => toast({ title: "Gagal menyimpan artikel", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-articles"] });
      toast({ title: "Artikel dihapus" });
      setDeleteId(null);
    },
    onError: () => toast({ title: "Gagal menghapus artikel", variant: "destructive" }),
  });

  const filtered = articles.filter((a: any) => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const publishedCount = articles.filter((a: any) => a.status === "published").length;
  const draftCount = articles.filter((a: any) => a.status === "draft").length;
  const totalViews = articles.reduce((sum: number, a: any) => sum + (a.views || 0), 0);

  function openCreate() {
    setEditItem(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  }

  function openEdit(item: any) {
    setEditItem(item);
    setForm({
      title: item.title, slug: item.slug, category: item.category,
      status: item.status, excerpt: item.excerpt, content: item.content || "",
      cover_image_url: item.cover_image_url || "", author: item.author || "",
    });
    setDialogOpen(true);
  }

  function handleSave() {
    const payload = {
      ...form,
      ...(editItem ? { id: editItem.id } : {}),
      published_at: form.status === "published" ? new Date().toISOString() : null,
    };
    saveMutation.mutate(payload);
  }

  function generateSlug(title: string) {
    return title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 80);
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" /> Blog & Artikel
          </h1>
          <p className="text-muted-foreground text-sm">Kelola artikel edukasi dan berita terbaru</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Tulis Artikel
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Artikel", value: articles.length, icon: FileText, color: "text-primary" },
          { label: "Dipublikasikan", value: publishedCount, icon: Globe, color: "text-emerald-600" },
          { label: "Draft", value: draftCount, icon: Clock, color: "text-amber-600" },
          { label: "Total Pembaca", value: totalViews.toLocaleString("id"), icon: TrendingUp, color: "text-blue-600" },
        ].map((s) => (
          <Card key={s.label} className="shadow-sm">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted/60">
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari judul artikel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "published", "draft"] as const).map((s) => (
            <Button
              key={s}
              variant={filterStatus === s ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(s)}
            >
              {s === "all" ? "Semua" : s === "published" ? "Dipublikasi" : "Draft"}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Tidak ada artikel ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Artikel</th>
                    <th className="px-4 py-3 text-left">Kategori</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Tanggal</th>
                    <th className="px-4 py-3 text-right">Pembaca</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((a: any) => (
                    <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {a.cover_image_url ? (
                            <img src={a.cover_image_url} alt="" className="h-10 w-16 rounded object-cover flex-shrink-0" />
                          ) : (
                            <div className="h-10 w-16 rounded bg-muted flex items-center justify-center flex-shrink-0">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold line-clamp-1">{a.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{a.excerpt}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">{a.category}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={a.status === "published" ? "default" : "secondary"}
                          className={a.status === "published" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""}
                        >
                          {a.status === "published" ? "Dipublikasi" : "Draft"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {a.published_at ? format(parseISO(a.published_at), "dd MMM yyyy", { locale: idLocale }) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {(a.views || 0).toLocaleString("id")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(a)}>
                            <PenLine className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon" variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-blue-600"
                            asChild
                          >
                            <a href={`/blog/${a.slug}`} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                          <Button
                            size="icon" variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteId(a.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Artikel" : "Tulis Artikel Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Judul Artikel *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm(f => ({
                    ...f, title: e.target.value,
                    slug: f.slug || generateSlug(e.target.value),
                  }))}
                  placeholder="Judul menarik artikel Anda..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Slug URL</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))}
                  placeholder="url-artikel-anda"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Penulis</Label>
                <Input
                  value={form.author}
                  onChange={(e) => setForm(f => ({ ...f, author: e.target.value }))}
                  placeholder="Nama penulis"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v: any) => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Publikasikan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>URL Gambar Cover</Label>
                <Input
                  value={form.cover_image_url}
                  onChange={(e) => setForm(f => ({ ...f, cover_image_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Ringkasan / Excerpt</Label>
                <Textarea
                  value={form.excerpt}
                  onChange={(e) => setForm(f => ({ ...f, excerpt: e.target.value }))}
                  placeholder="Deskripsi singkat artikel..."
                  rows={2}
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Konten Artikel</Label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Tulis konten lengkap artikel di sini..."
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending || !form.title}>
              {saveMutation.isPending ? "Menyimpan..." : editItem ? "Simpan Perubahan" : "Buat Artikel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Artikel?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Artikel akan dihapus permanen dan tidak dapat dipulihkan.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
