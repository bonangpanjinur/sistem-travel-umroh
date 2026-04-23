import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Edit, Trash2, Package, Search, AlertTriangle } from "lucide-react";

interface EquipmentItem {
  id: string;
  name: string;
  description: string | null;
  stock_quantity: number | null;
  category: string;
  low_stock_threshold: number | null;
  created_at: string | null;
}

export default function AdminEquipmentMaster() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<EquipmentItem | null>(null);
  const [formData, setFormData] = useState({ 
    name: "", 
    description: "", 
    stock_quantity: 0,
    category: "general",
    low_stock_threshold: 10
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ["equipment-items-master"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_items")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as EquipmentItem[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { 
        name: formData.name, 
        description: formData.description || null, 
        stock_quantity: formData.stock_quantity,
        category: formData.category,
        low_stock_threshold: formData.low_stock_threshold
      };

      if (editingItem) {
        const { error } = await supabase
          .from("equipment_items")
          .update(payload)
          .eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("equipment_items")
          .insert(payload);
        if (error) throw error;
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
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipment_items").delete().eq("id", id);
      if (error) throw error;
    },
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
        description: item.description || "", 
        stock_quantity: item.stock_quantity || 0,
        category: item.category || "general",
        low_stock_threshold: item.low_stock_threshold || 10
      });
    } else {
      setEditingItem(null);
      setFormData({ 
        name: "", 
        description: "", 
        stock_quantity: 0,
        category: "general",
        low_stock_threshold: 10
      });
    }
    setIsFormOpen(true);
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setEditingItem(null);
  };

  const filtered = items?.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari nama atau kategori..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Button onClick={() => handleOpen()}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Perlengkapan
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama & Kategori</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead className="text-center">Stok</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered?.map(item => {
              const threshold = item.low_stock_threshold || 10;
              const isLow = (item.stock_quantity || 0) <= threshold;
              const isOut = (item.stock_quantity || 0) === 0;

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
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <span className={`font-semibold ${isLow ? 'text-destructive' : ''}`}>
                        {item.stock_quantity || 0}
                      </span>
                      <span className="text-[10px] text-muted-foreground">Min: {threshold}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={isOut ? "destructive" : isLow ? "secondary" : "default"}>
                      {isOut ? "Habis" : isLow ? "Menipis" : "Tersedia"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
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
            {!filtered?.length && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "Tidak ditemukan" : "Belum ada data perlengkapan"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Perlengkapan" : "Tambah Perlengkapan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Nama Perlengkapan *</Label>
                <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Contoh: Koper, Ihram, Mukena..." />
              </div>
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={formData.category} onValueChange={v => setFormData(p => ({ ...p, category: v }))}>
                  <SelectTrigger>
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
                <Label>Batas Stok Minimal</Label>
                <Input type="number" min={0} value={formData.low_stock_threshold} onChange={e => setFormData(p => ({ ...p, low_stock_threshold: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Deskripsi opsional..." />
            </div>
            <div className="space-y-2">
              <Label>Jumlah Stok</Label>
              <Input type="number" min={0} value={formData.stock_quantity} onChange={e => setFormData(p => ({ ...p, stock_quantity: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Batal</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!formData.name || saveMutation.isPending}>
              {editingItem ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
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
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteItem && deleteMutation.mutate(deleteItem.id)}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
