import { useState, useMemo } from "react";
import { useStoreProducts, useStoreCategories, useStoreProductMutations } from "@/hooks/useStore";
import type { StoreProduct } from "@/hooks/useStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Edit, Trash2, Package, Star } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

const EMPTY: Partial<StoreProduct> = {
  name: "", slug: "", description: "", price: 0, original_price: undefined,
  stock: 0, weight_gram: 0, is_active: true, is_featured: false,
  category_id: undefined, sku: "", images: [],
};

export default function AdminStoreProducts() {
  const [search, setSearch]           = useState("");
  const [catFilter, setCatFilter]     = useState("all");
  const [isOpen, setIsOpen]           = useState(false);
  const [editing, setEditing]         = useState<Partial<StoreProduct>>(EMPTY);
  const [isNew, setIsNew]             = useState(true);

  const { data: products = [], isLoading } = useStoreProducts();
  const { data: categories = [] }          = useStoreCategories();
  const { upsert, remove, toggleActive }   = useStoreProductMutations();

  const filtered = useMemo(() => {
    let list = products;
    if (catFilter !== "all") list = list.filter((p) => p.category_id === catFilter);
    if (search) {
      const t = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(t) || p.sku?.toLowerCase().includes(t));
    }
    return list;
  }, [products, search, catFilter]);

  const openNew  = () => { setEditing({ ...EMPTY }); setIsNew(true);  setIsOpen(true); };
  const openEdit = (p: StoreProduct) => { setEditing({ ...p }); setIsNew(false); setIsOpen(true); };

  const handleSave = () => {
    if (!editing.name || !editing.price) return;
    const payload = {
      ...editing,
      slug: editing.slug || slugify(editing.name!),
    };
    upsert.mutate(payload as Partial<StoreProduct>, { onSuccess: () => setIsOpen(false) });
  };

  const handleDelete = (p: StoreProduct) => {
    if (!confirm(`Hapus produk "${p.name}"?`)) return;
    remove.mutate(p.id!);
  };

  const setField = (k: keyof StoreProduct, v: any) =>
    setEditing((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produk Toko</h1>
          <p className="text-muted-foreground text-sm mt-1">Kelola katalog produk yang dijual kepada jamaah</p>
        </div>
        <Button onClick={openNew} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />Tambah Produk
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari produk atau SKU..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Semua Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1,2,3,4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Belum ada produk</p>
              <p className="text-sm mt-1">Klik "Tambah Produk" untuk mulai berjualan</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Harga</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead className="text-right">Terjual</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={p.name} className="h-10 w-10 rounded-md object-cover border" />
                        ) : (
                          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="font-medium text-sm">{p.name}</p>
                            {p.is_featured && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                          </div>
                          {p.sku && <p className="text-xs text-muted-foreground">SKU: {p.sku}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{(p as any).category?.name ?? "-"}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        <p className="font-semibold text-sm">{formatCurrency(p.price)}</p>
                        {p.original_price && p.original_price > p.price && (
                          <p className="text-xs text-muted-foreground line-through">{formatCurrency(p.original_price)}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={p.stock === 0 ? "destructive" : p.stock <= 5 ? "secondary" : "outline"}>
                        {p.stock === 0 ? "Habis" : `${p.stock} pcs`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">{p.sold_count}</TableCell>
                    <TableCell>
                      <Switch
                        checked={p.is_active}
                        onCheckedChange={(v) => toggleActive.mutate({ id: p.id, is_active: v })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(p)}>
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

      {/* Dialog Form */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? "Tambah Produk Baru" : "Edit Produk"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div className="sm:col-span-2">
              <Label>Nama Produk *</Label>
              <Input
                value={editing.name ?? ""}
                onChange={(e) => {
                  setField("name", e.target.value);
                  if (isNew) setField("slug", slugify(e.target.value));
                }}
                placeholder="Contoh: Kain Ihram Premium"
              />
            </div>
            <div>
              <Label>Slug (URL)</Label>
              <Input value={editing.slug ?? ""} onChange={(e) => setField("slug", e.target.value)} placeholder="kain-ihram-premium" />
            </div>
            <div>
              <Label>SKU</Label>
              <Input value={editing.sku ?? ""} onChange={(e) => setField("sku", e.target.value)} placeholder="IHR-001" />
            </div>
            <div>
              <Label>Kategori</Label>
              <Select value={editing.category_id ?? ""} onValueChange={(v) => setField("category_id", v)}>
                <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Harga Jual (Rp) *</Label>
              <Input
                type="number"
                value={editing.price ?? 0}
                onChange={(e) => setField("price", Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Harga Coret / Asli (Rp)</Label>
              <Input
                type="number"
                value={editing.original_price ?? ""}
                onChange={(e) => setField("original_price", e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
            <div>
              <Label>Stok</Label>
              <Input type="number" value={editing.stock ?? 0} onChange={(e) => setField("stock", Number(e.target.value))} />
            </div>
            <div>
              <Label>Berat (gram)</Label>
              <Input type="number" value={editing.weight_gram ?? 0} onChange={(e) => setField("weight_gram", Number(e.target.value))} />
            </div>
            <div className="sm:col-span-2">
              <Label>Deskripsi</Label>
              <Textarea
                rows={4}
                value={editing.description ?? ""}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Deskripsi lengkap produk..."
              />
            </div>
            <div className="sm:col-span-2">
              <Label>URL Gambar (pisahkan dengan koma)</Label>
              <Input
                value={(editing.images as string[] ?? []).join(", ")}
                onChange={(e) => setField("images", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                placeholder="https://example.com/img1.jpg, https://..."
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setField("is_active", v)} id="is_active" />
              <Label htmlFor="is_active">Produk Aktif</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={editing.is_featured ?? false} onCheckedChange={(v) => setField("is_featured", v)} id="is_featured" />
              <Label htmlFor="is_featured">Produk Unggulan</Label>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>
              {upsert.isPending ? "Menyimpan..." : "Simpan Produk"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
