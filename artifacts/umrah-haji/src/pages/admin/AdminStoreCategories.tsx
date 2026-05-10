import { useState, useMemo } from "react";
import { useStoreCategories, useStoreCategoryMutations } from "@/hooks/useStore";
import type { StoreCategory } from "@/hooks/useStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit, Trash2, Tag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}

const EMPTY: Partial<StoreCategory> = { name: "", slug: "", description: "", image_url: "", is_active: true, sort_order: 0 };

export default function AdminStoreCategories() {
  const [search, setSearch]   = useState("");
  const [isOpen, setIsOpen]   = useState(false);
  const [editing, setEditing] = useState<Partial<StoreCategory>>(EMPTY);
  const [isNew, setIsNew]     = useState(true);

  const { data: categories = [], isLoading } = useStoreCategories();
  const { upsert, remove }                   = useStoreCategoryMutations();

  const filtered = useMemo(() => {
    if (!search) return categories;
    const t = search.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(t));
  }, [categories, search]);

  const openNew  = () => { setEditing({ ...EMPTY }); setIsNew(true);  setIsOpen(true); };
  const openEdit = (c: StoreCategory) => { setEditing({ ...c }); setIsNew(false); setIsOpen(true); };

  const handleSave = () => {
    if (!editing.name) return;
    upsert.mutate(
      { ...editing, slug: editing.slug || slugify(editing.name!) } as Partial<StoreCategory>,
      { onSuccess: () => setIsOpen(false) }
    );
  };

  const handleDelete = (c: StoreCategory) => {
    if (!confirm(`Hapus kategori "${c.name}"? Produk di dalamnya tidak akan terhapus.`)) return;
    remove.mutate(c.id);
  };

  const setField = (k: keyof StoreCategory, v: any) => setEditing((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kategori Produk</h1>
          <p className="text-muted-foreground text-sm mt-1">Kelola kategori untuk mengorganisir produk toko</p>
        </div>
        <Button onClick={openNew} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />Tambah Kategori
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Cari kategori..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Belum ada kategori</p>
              <p className="text-sm mt-1">Tambahkan kategori untuk mengorganisir produk</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">Urutan</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="text-center text-muted-foreground">{cat.sort_order}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {cat.image_url ? (
                          <img src={cat.image_url} alt={cat.name} className="h-8 w-8 rounded object-cover border" />
                        ) : (
                          <div className="h-8 w-8 bg-primary/10 rounded flex items-center justify-center">
                            <Tag className="h-3 w-3 text-primary" />
                          </div>
                        )}
                        <span className="font-medium">{cat.name}</span>
                      </div>
                    </TableCell>
                    <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{cat.slug}</code></TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{cat.description ?? "-"}</TableCell>
                    <TableCell>
                      <Badge className={cat.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                        {cat.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(cat)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(cat)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isNew ? "Tambah Kategori" : "Edit Kategori"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Nama Kategori *</Label>
              <Input
                value={editing.name ?? ""}
                onChange={(e) => { setField("name", e.target.value); if (isNew) setField("slug", slugify(e.target.value)); }}
                placeholder="Perlengkapan Ibadah"
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={editing.slug ?? ""} onChange={(e) => setField("slug", e.target.value)} placeholder="perlengkapan-ibadah" />
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Textarea
                value={editing.description ?? ""}
                onChange={(e) => setField("description", e.target.value)}
                rows={3}
                placeholder="Deskripsi singkat kategori..."
              />
            </div>
            <div>
              <Label>URL Gambar</Label>
              <Input
                value={editing.image_url ?? ""}
                onChange={(e) => setField("image_url", e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div>
              <Label>Urutan Tampil</Label>
              <Input
                type="number"
                value={editing.sort_order ?? 0}
                onChange={(e) => setField("sort_order", Number(e.target.value))}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setField("is_active", v)} id="cat_active" />
              <Label htmlFor="cat_active">Kategori Aktif</Label>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
              <Button onClick={handleSave} disabled={upsert.isPending}>
                {upsert.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
