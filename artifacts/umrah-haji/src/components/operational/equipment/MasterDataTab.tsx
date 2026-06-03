import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit2, Trash2, Package, AlertCircle, Loader2, AlertTriangle, Ruler, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { EquipmentItem } from "@/pages/operational/EquipmentPage";

interface MasterDataTabProps {
  items: EquipmentItem[] | undefined;
}

export function MasterDataTab({ items }: MasterDataTabProps) {
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "general",
    low_stock_threshold: 10,
    has_sizes: false,
    available_sizes: [] as string[],
  });
  const [sizeInput, setSizeInput] = useState("");

  const handleAddNew = () => {
    setSelectedItem(null);
    setFormData({
      name: "",
      description: "",
      category: "general",
      low_stock_threshold: 10,
      has_sizes: false,
      available_sizes: [],
    });
    setSizeInput("");
    setEditDialogOpen(true);
  };

  const handleEdit = (item: EquipmentItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      category: item.category || "general",
      low_stock_threshold: item.low_stock_threshold || 10,
      has_sizes: item.has_sizes || false,
      available_sizes: item.available_sizes || [],
    });
    setSizeInput("");
    setDeleteMode(false);
    setEditDialogOpen(true);
  };

  const handleAddSize = () => {
    const s = sizeInput.trim().toUpperCase();
    if (!s) return;
    if (formData.available_sizes.includes(s)) {
      toast.error("Ukuran sudah ada");
      return;
    }
    setFormData(prev => ({ ...prev, available_sizes: [...prev.available_sizes, s] }));
    setSizeInput("");
  };

  const handleRemoveSize = (size: string) => {
    setFormData(prev => ({ ...prev, available_sizes: prev.available_sizes.filter(s => s !== size) }));
  };

  const handleDelete = (item: EquipmentItem) => {
    setSelectedItem(item);
    setDeleteMode(true);
    setEditDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        category: formData.category,
        low_stock_threshold: formData.low_stock_threshold,
        has_sizes: formData.has_sizes,
        available_sizes: formData.has_sizes ? formData.available_sizes : [],
      };

      if (selectedItem) {
        const { error } = await supabase
          .from("equipment_items")
          .update(payload)
          .eq("id", selectedItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("equipment_items")
          .insert({ ...payload, stock_quantity: 0 });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(selectedItem ? "✅ Item berhasil diperbarui" : "✅ Item berhasil ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["equipment-items"] });
      setEditDialogOpen(false);
      setDeleteMode(false);
    },
    onError: (err: Error) => toast.error(`Gagal menyimpan: ${err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedItem) return;
      const { error } = await supabase
        .from("equipment_items")
        .delete()
        .eq("id", selectedItem.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("✅ Item berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["equipment-items"] });
      setEditDialogOpen(false);
      setDeleteMode(false);
    },
    onError: (err: Error) => toast.error(`Gagal menghapus: ${err.message}`),
  });

  const handleSaveEdit = () => {
    if (!formData.name.trim()) {
      toast.error("Nama item tidak boleh kosong");
      return;
    }
    saveMutation.mutate();
  };

  const handleConfirmDelete = () => {
    deleteMutation.mutate();
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Master Data Perlengkapan</h2>
          <p className="text-sm text-muted-foreground">
            Kelola item, kategori, dan batas stok minimal
          </p>
        </div>
        <Button onClick={handleAddNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Tambah Item
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Admin Only</p>
              <p>
                Tab ini khusus untuk administrator. Fungsi CRUD perlengkapan,
                penentuan batas stok minimal, dan manajemen kategori dilakukan di sini.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items && items.length > 0 ? (
          items.map((item) => {
            const threshold = item.low_stock_threshold || 10;
            const isLowStock = (item.stock_quantity || 0) <= threshold;
            const isOutStock = (item.stock_quantity || 0) === 0;

            return (
              <Card
                key={item.id}
                className="hover:shadow-lg transition-shadow duration-200 flex flex-col"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm leading-tight truncate">
                          {item.name}
                        </CardTitle>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant="outline" className="text-[10px] h-4">
                            {item.category || 'general'}
                          </Badge>
                          {item.has_sizes && (
                            <Badge variant="outline" className="text-[10px] h-4 gap-0.5 border-blue-200 text-blue-700 bg-blue-50">
                              <Ruler className="h-2.5 w-2.5" /> Ukuran
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  {/* Available sizes */}
                  {item.has_sizes && item.available_sizes && item.available_sizes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.available_sizes.map(s => (
                        <Badge key={s} variant="secondary" className="text-[10px] h-4 px-1.5">{s}</Badge>
                      ))}
                    </div>
                  )}

                  {/* Stock Status */}
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Stok Saat Ini</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-lg font-bold ${isLowStock ? 'text-destructive' : 'text-primary'}`}>
                        {item.stock_quantity}
                      </span>
                      <Badge
                        variant={
                          isOutStock
                            ? "destructive"
                            : isLowStock
                            ? "secondary"
                            : "default"
                        }
                      >
                        {isOutStock
                          ? "Habis"
                          : isLowStock
                          ? "Menipis"
                          : "Aman"}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Batas minimal: {threshold}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleEdit(item)}
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleDelete(item)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Hapus
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-4">
              Belum ada item perlengkapan
            </p>
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Item Pertama
            </Button>
          </div>
        )}
      </div>

      {/* Edit/Add/Delete Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setDeleteMode(false);
        }
        setEditDialogOpen(open);
      }}>
        <DialogContent>
          {deleteMode ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Apakah Anda yakin?
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Tindakan ini tidak dapat dibatalkan. Item <strong>"{selectedItem?.name}"</strong> akan dihapus permanen dari sistem.
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteMode(false)}
                  disabled={deleteMutation.isPending}
                >
                  Batal
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Hapus Item
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{selectedItem ? `Edit Item: ${selectedItem.name}` : "Tambah Item Baru"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nama Item *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Contoh: Koper, Ihram, Mukena..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Deskripsi</Label>
                  <Input
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Deskripsi opsional..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Kategori</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger id="edit-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Umum (Semua)</SelectItem>
                      <SelectItem value="male_only">Laki-laki Saja</SelectItem>
                      <SelectItem value="female_only">Perempuan Saja</SelectItem>
                      <SelectItem value="child_only">Anak-anak Saja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-threshold">Batas Stok Minimal</Label>
                  <Input
                    id="edit-threshold"
                    type="number"
                    min="0"
                    value={formData.low_stock_threshold}
                    onChange={(e) =>
                      setFormData({ ...formData, low_stock_threshold: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>

                {/* E2: Has Sizes toggle */}
                <div className="space-y-3 pt-1 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="flex items-center gap-2">
                        <Ruler className="h-4 w-4 text-muted-foreground" />
                        Item Butuh Ukuran
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Aktifkan untuk baju, koper, dll yang perlu pilihan ukuran
                      </p>
                    </div>
                    <Switch
                      checked={formData.has_sizes}
                      onCheckedChange={(v) => setFormData({ ...formData, has_sizes: v })}
                    />
                  </div>

                  {formData.has_sizes && (
                    <div className="space-y-2 pl-6">
                      <Label className="text-xs">Ukuran Tersedia</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Contoh: S, M, L, XL..."
                          value={sizeInput}
                          onChange={(e) => setSizeInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSize())}
                          className="h-8 text-sm"
                        />
                        <Button type="button" size="sm" onClick={handleAddSize} className="h-8 px-3">
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      {formData.available_sizes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {formData.available_sizes.map((s) => (
                            <Badge
                              key={s}
                              variant="secondary"
                              className="text-xs gap-1 cursor-pointer hover:bg-destructive/10"
                            >
                              {s}
                              <button type="button" onClick={() => handleRemoveSize(s)}>
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      {formData.available_sizes.length === 0 && (
                        <p className="text-xs text-amber-600">
                          ⚠ Tambah minimal 1 ukuran (contoh: S M L XL XXL)
                        </p>
                      )}
                      <div className="flex gap-1 flex-wrap mt-1">
                        {["S","M","L","XL","XXL"].map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              if (!formData.available_sizes.includes(s)) {
                                setFormData(prev => ({ ...prev, available_sizes: [...prev.available_sizes, s] }));
                              }
                            }}
                            className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                              formData.available_sizes.includes(s)
                                ? "bg-primary/10 border-primary/30 text-primary"
                                : "border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/40"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                        <span className="text-[10px] text-muted-foreground self-center ml-1">preset cepat</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  disabled={saveMutation.isPending}
                >
                  Batal
                </Button>
                <Button onClick={handleSaveEdit} disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {selectedItem ? "Simpan Perubahan" : "Tambah Item"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
