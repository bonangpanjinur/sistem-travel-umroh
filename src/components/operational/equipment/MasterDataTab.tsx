import { useState } from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit2, Trash2, Package, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { EquipmentItem } from "@/pages/operational/EquipmentPage";

interface MasterDataTabProps {
  items: EquipmentItem[] | undefined;
}

export function MasterDataTab({ items }: MasterDataTabProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "accessories",
    lowStockThreshold: "10",
  });

  const handleAddNew = () => {
    setFormData({
      name: "",
      description: "",
      category: "accessories",
      lowStockThreshold: "10",
    });
    setAddDialogOpen(true);
  };

  const handleEdit = (item: EquipmentItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      category: "accessories",
      lowStockThreshold: "10",
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (item: EquipmentItem) => {
    setSelectedItem(item);
    setDeleteAlertOpen(true);
  };

  const handleSaveNew = () => {
    if (!formData.name.trim()) {
      toast.error("Nama item tidak boleh kosong");
      return;
    }
    toast.success("✅ Item baru berhasil ditambahkan");
    setAddDialogOpen(false);
  };

  const handleSaveEdit = () => {
    if (!formData.name.trim()) {
      toast.error("Nama item tidak boleh kosong");
      return;
    }
    toast.success("✅ Item berhasil diperbarui");
    setEditDialogOpen(false);
  };

  const handleConfirmDelete = () => {
    toast.success("✅ Item berhasil dihapus");
    setDeleteAlertOpen(false);
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
          items.map((item) => (
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

                {/* Stock Status */}
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Stok Saat Ini</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">
                      {item.stock_quantity}
                    </span>
                    <Badge
                      variant={
                        item.stock_quantity > 10
                          ? "default"
                          : item.stock_quantity > 0
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {item.stock_quantity > 10
                        ? "Aman"
                        : item.stock_quantity > 0
                        ? "Menipis"
                        : "Habis"}
                    </Badge>
                  </div>
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
          ))
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

      {/* Add Item Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Item Perlengkapan Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Item *</Label>
              <Input
                id="name"
                placeholder="Contoh: Koper Besar, Kain Ihram, Seragam Batik"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Input
                id="description"
                placeholder="Deskripsi singkat item"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Kategori</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="luggage">Tas & Koper</SelectItem>
                  <SelectItem value="clothing">Pakaian</SelectItem>
                  <SelectItem value="accessories">Aksesoris</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="threshold">Batas Stok Minimal</Label>
              <Input
                id="threshold"
                type="number"
                min="1"
                value={formData.lowStockThreshold}
                onChange={(e) =>
                  setFormData({ ...formData, lowStockThreshold: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Sistem akan memberi alert jika stok di bawah angka ini
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
            >
              Batal
            </Button>
            <Button onClick={handleSaveNew}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item: {selectedItem?.name}</DialogTitle>
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
                  <SelectItem value="luggage">Tas & Koper</SelectItem>
                  <SelectItem value="clothing">Pakaian</SelectItem>
                  <SelectItem value="accessories">Aksesoris</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-threshold">Batas Stok Minimal</Label>
              <Input
                id="edit-threshold"
                type="number"
                min="1"
                value={formData.lowStockThreshold}
                onChange={(e) =>
                  setFormData({ ...formData, lowStockThreshold: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              Batal
            </Button>
            <Button onClick={handleSaveEdit}>
              <Edit2 className="h-4 w-4 mr-2" />
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Item?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menghapus item <strong>{selectedItem?.name}</strong>.
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Hapus
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
