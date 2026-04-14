import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PackageTypeForm } from "@/components/admin/forms/PackageTypeForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Edit, Trash2, Settings2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminPackageSettings() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: packageTypes, isLoading } = useQuery({
    queryKey: ["admin-package-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("package_types")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("package_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tipe paket berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["admin-package-types"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal menghapus tipe paket");
    },
  });

  const filtered = packageTypes?.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (type: any) => {
    if (confirm(`Apakah Anda yakin ingin menghapus tipe paket "${type.name}"?`)) {
      deleteMutation.mutate(type.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pengaturan Paket</h1>
          <p className="text-muted-foreground">Kelola tipe paket dan konfigurasi dinamis lainnya</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Cari tipe..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="pl-10 w-64" 
            />
          </div>
          <Button onClick={() => { setEditingType(null); setIsFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Tipe
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Daftar Tipe Paket
          </CardTitle>
          <CardDescription>
            Tipe paket yang aktif akan muncul sebagai pilihan saat membuat paket baru.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Urutan</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead>Nama Tipe</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Memuat data...</TableCell>
                </TableRow>
              ) : filtered?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada data ditemukan</TableCell>
                </TableRow>
              ) : (
                filtered?.map(type => (
                  <TableRow key={type.id}>
                    <TableCell>{type.display_order}</TableCell>
                    <TableCell className="font-mono text-xs">{type.code}</TableCell>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{type.description || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={type.is_active ? "default" : "secondary"}>
                        {type.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => { setEditingType(type); setIsFormOpen(true); }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => handleDelete(type)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingType ? "Edit" : "Tambah"} Tipe Paket</DialogTitle>
          </DialogHeader>
          <PackageTypeForm 
            packageTypeData={editingType} 
            onSuccess={() => setIsFormOpen(false)} 
            onCancel={() => setIsFormOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
