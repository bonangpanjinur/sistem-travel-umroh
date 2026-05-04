import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Search, Edit, Trash2, Phone, Mail } from "lucide-react";

export default function AdminBusProviders() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
  });

  const { data: providers, isLoading } = useQuery({
    queryKey: ["bus-providers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bus_providers")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editingItem) {
        const { error } = await supabase
          .from("bus_providers")
          .update(data)
          .eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("bus_providers").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bus-providers"] });
      toast.success(editingItem ? "Provider bus diperbarui" : "Provider bus ditambahkan");
      handleClose();
    },
    onError: (e: any) => toast.error("Gagal: " + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bus_providers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bus-providers"] });
      toast.success("Provider bus dihapus");
    },
    onError: (e: any) => toast.error("Gagal: " + e.message),
  });

  const handleOpen = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        contact_person: item.contact_person || "",
        phone: item.phone || "",
        email: item.email || "",
      });
    } else {
      setEditingItem(null);
      setFormData({ name: "", contact_person: "", phone: "", email: "" });
    }
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  const filtered = providers?.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari provider bus..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => handleOpen()}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Provider
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kontak</TableHead>
                  <TableHead>Telepon</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.contact_person || "-"}</TableCell>
                    <TableCell>
                      {item.phone ? (
                        <span className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" /> {item.phone}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {item.email ? (
                        <span className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3" /> {item.email}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.is_active ? "default" : "secondary"}>
                        {item.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpen(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Hapus provider ini?")) deleteMutation.mutate(item.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Belum ada data provider bus
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Provider Bus" : "Tambah Provider Bus"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate(formData);
            }}
          >
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nama Provider *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Kontak Person</Label>
                <Input
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telepon</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Batal
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
