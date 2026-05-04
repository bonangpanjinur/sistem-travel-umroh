import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Package, Search, Download, QrCode, Printer } from "lucide-react";

import {
  getEquipmentItems,
  getEquipmentCategories,
  createEquipmentItem,
  updateEquipmentItem,
  deleteEquipmentItem,
  logStockChange,
} from "@/features/equipment/queries";
import type { EquipmentItem } from "@/features/equipment/dto";

interface FormState {
  name: string;
  description: string;
  stockQuantity: number;
  category: string;
  lowStockThreshold: number;
  pic: string;
  picType: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  stockQuantity: 0,
  category: "Pakaian Ihram",
  lowStockThreshold: 10,
  pic: "",
  picType: "lainnya",
};

export default function AdminEquipmentMaster() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [picFilter, setPicFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<EquipmentItem | null>(null);
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);

  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedItemQR, setSelectedItemQR] = useState<EquipmentItem | null>(null);

  const { data: items } = useQuery({
    queryKey: ["equipment-items-master"],
    queryFn: getEquipmentItems,
  });

  const { data: categories } = useQuery({
    queryKey: ["equipment-categories"],
    queryFn: getEquipmentCategories,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        stock_quantity: formData.stockQuantity,
        category: formData.category,
        low_stock_threshold: formData.lowStockThreshold,
        pic: formData.pic || null,
        pic_type: formData.picType || null,
      };

      if (editingItem) {
        const previousQty = editingItem.stockQuantity;
        const stockChanged = previousQty !== formData.stockQuantity;
        await updateEquipmentItem(editingItem.id, payload);
        if (stockChanged) {
          const delta = formData.stockQuantity - previousQty;
          await logStockChange({
            equipment_item_id: editingItem.id,
            change_type: delta > 0 ? "in" : "out",
            quantity_change: delta,
            previous_quantity: previousQty,
            new_quantity: formData.stockQuantity,
            notes: "Update dari Master Data",
          });
        }
      } else {
        const created = await createEquipmentItem(payload);
        if (formData.stockQuantity > 0) {
          await logStockChange({
            equipment_item_id: created.id,
            change_type: "in",
            quantity_change: formData.stockQuantity,
            previous_quantity: 0,
            new_quantity: formData.stockQuantity,
            notes: "Stok awal dari Master Data",
          });
        }
      }
    },
    onSuccess: () => {
      toast.success(editingItem ? "Perlengkapan diperbarui" : "Perlengkapan ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["equipment-items-master"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-items"] });
      handleClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEquipmentItem,
    onSuccess: () => {
      toast.success("Perlengkapan dihapus");
      queryClient.invalidateQueries({ queryKey: ["equipment-items-master"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-items"] });
      setDeleteItem(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleOpen = (item?: EquipmentItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        description: item.description ?? "",
        stockQuantity: item.stockQuantity,
        category: item.category,
        lowStockThreshold: item.lowStockThreshold,
        pic: item.pic ?? "",
        picType: item.picType ?? "lainnya",
      });
    } else {
      setEditingItem(null);
      setFormData(EMPTY_FORM);
    }
    setIsFormOpen(true);
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setEditingItem(null);
  };

  const filtered = useMemo(() => {
    return (items ?? []).filter((i) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        i.name.toLowerCase().includes(term) ||
        i.category.toLowerCase().includes(term) ||
        (i.pic?.toLowerCase().includes(term) ?? false);
      const matchesCategory = categoryFilter === "all" || i.category === categoryFilter;
      const matchesPic = picFilter === "all" || i.picType === picFilter;
      const qty = i.stockQuantity;
      const threshold = i.lowStockThreshold;
      let matchesStatus = true;
      if (statusFilter === "available") matchesStatus = qty > threshold;
      else if (statusFilter === "low") matchesStatus = qty > 0 && qty <= threshold;
      else if (statusFilter === "out") matchesStatus = qty === 0;
      return matchesSearch && matchesCategory && matchesPic && matchesStatus;
    });
  }, [items, searchTerm, categoryFilter, picFilter, statusFilter]);

  const handleExport = () => {
    if (!filtered.length) {
      toast.error("Tidak ada data untuk diexport");
      return;
    }
    const headers = ["Nama", "Kategori", "Deskripsi", "Stok", "Batas Minimal", "Status"];
    const rows = filtered.map((i) => [
      i.name,
      i.category,
      i.description ?? "",
      i.stockQuantity,
      i.lowStockThreshold,
      i.stockQuantity === 0
        ? "Habis"
        : i.stockQuantity <= i.lowStockThreshold
          ? "Menipis"
          : "Tersedia",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `perlengkapan_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Data diexport ke CSV");
  };

  const handlePrintQR = (item: EquipmentItem) => {
    setSelectedItemQR(item);
    setShowQRModal(true);
  };

  const printQR = () => {
    const printContent = document.getElementById("qr-print-area");
    if (!printContent) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Cannot open print window");
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Code - ${selectedItemQR?.name ?? ""}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .label { border: 2px solid #000; padding: 15px; margin: 10px; display: inline-block; text-align: center; }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-2 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama, PIC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.name}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={picFilter} onValueChange={setPicFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="PIC" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua PIC</SelectItem>
              <SelectItem value="agent">Agent</SelectItem>
              <SelectItem value="pusat">Pusat</SelectItem>
              <SelectItem value="cabang">Cabang</SelectItem>
              <SelectItem value="lainnya">Lainnya</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="available">Tersedia</SelectItem>
              <SelectItem value="low">Menipis</SelectItem>
              <SelectItem value="out">Habis</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => handleOpen()}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Perlengkapan
          </Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama & Kategori</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead>PIC</TableHead>
              <TableHead className="text-center">Stok</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => {
              const isOut = item.stockQuantity === 0;
              const isLow = item.stockQuantity <= item.lowStockThreshold;
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      <div>
                        <p>{item.name}</p>
                        <Badge variant="outline" className="text-[10px] h-4 px-1 font-normal">
                          {item.category}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                    {item.description || "-"}
                  </TableCell>
                  <TableCell>
                    {item.pic ? (
                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                        {item.pic} ({item.picType ?? "-"})
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <span className={`font-semibold ${isLow ? "text-destructive" : ""}`}>
                        {item.stockQuantity}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Min: {item.lowStockThreshold}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={isOut ? "destructive" : isLow ? "secondary" : "default"}>
                      {isOut ? "Habis" : isLow ? "Menipis" : "Tersedia"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePrintQR(item)} title="Print QR Code">
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpen(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteItem(item)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {!filtered.length && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "Tidak ditemukan" : "Belum ada data perlengkapan"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Perlengkapan" : "Tambah Perlengkapan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Nama Perlengkapan *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Contoh: Koper, Ihram, Mukena..."
                />
              </div>
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData((p) => ({ ...p, category: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Batas Stok Minimal</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.lowStockThreshold}
                  onChange={(e) => setFormData((p) => ({ ...p, lowStockThreshold: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="Deskripsi opsional..."
              />
            </div>
            <div className="space-y-2">
              <Label>Jumlah Stok</Label>
              <Input
                type="number"
                min={0}
                value={formData.stockQuantity}
                onChange={(e) => setFormData((p) => ({ ...p, stockQuantity: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>PIC (Penanggung Jawab)</Label>
                <Input
                  value={formData.pic}
                  onChange={(e) => setFormData((p) => ({ ...p, pic: e.target.value }))}
                  placeholder="Nama PIC..."
                />
              </div>
              <div className="space-y-2">
                <Label>Tipe PIC</Label>
                <Select value={formData.picType} onValueChange={(v) => setFormData((p) => ({ ...p, picType: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="pusat">Pusat</SelectItem>
                    <SelectItem value="cabang">Cabang</SelectItem>
                    <SelectItem value="lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Batal
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!formData.name || saveMutation.isPending}>
              {editingItem ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Perlengkapan?</AlertDialogTitle>
            <AlertDialogDescription>
              Hapus "{deleteItem?.name}"? Data distribusi yang terkait mungkin akan terpengaruh.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR Code - {selectedItemQR?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-4">
            <div id="qr-print-area" className="border-2 border-black p-4 rounded-lg">
              <div className="text-center">
                <div className="w-48 h-48 bg-muted flex items-center justify-center mb-2">
                  <QrCode className="w-24 h-24 text-muted-foreground" />
                </div>
                <p className="font-bold text-sm">{selectedItemQR?.name}</p>
                <p className="text-xs text-muted-foreground">{selectedItemQR?.category}</p>
                <p className="text-xs">Stok: {selectedItemQR?.stockQuantity ?? 0}</p>
                <p className="text-xs">PIC: {selectedItemQR?.pic ?? "-"}</p>
                <p className="text-xs text-muted-foreground">{selectedItemQR?.id?.slice(0, 8)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowQRModal(false)}>
                Tutup
              </Button>
              <Button onClick={printQR}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}