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
import { toast } from "sonner";
import { Plus, Edit, Trash2, Package, Search } from "lucide-react";

interface EquipmentItem {
  id: string;
  name: string;
  description: string | null;
  stock_quantity: number | null;
  created_at: string | null;
}

export default function AdminEquipmentMaster() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<EquipmentItem | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", stock_quantity: 0 });

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
      if (editingItem) {
        const { error } = await supabase
          .from("equipment_items")
          .update({ name: formData.name, description: formData.description || null, stock_quantity: formData.stock_quantity })
          .eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("equipment_items")
          .insert({ name: formData.name, description: formData.description || null, stock_quantity: formData.stock_quantity });
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
      setFormData({ name: item.name, description: item.description || "", stock_quantity: item.stock_quantity || 0 });
    } else {
      setEditingItem(null);
      setFormData({ name: "", description: "", stock_quantity: 0 });
    }
    setIsFormOpen(true);
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setEditingItem(null);
    setFormData({ name: "", description: "", stock_quantity: 0 });
  };

  const filtered = items?.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari perlengkapan..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
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
              <TableHead>Nama</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead className="text-center">Stok</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered?.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    {item.name}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                  {item.description || "-"}
                </TableCell>
                <TableCell className="text-center font-semibold">{item.stock_quantity || 0}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={(item.stock_quantity || 0) > 0 ? "default" : "destructive"}>
                    {(item.stock_quantity || 0) > 0 ? "Tersedia" : "Habis"}
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
            ))}
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
            <div className="space-y-2">
              <Label>Nama Perlengkapan *</Label>
              <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Contoh: Koper, Ihram, Mukena..." />
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
