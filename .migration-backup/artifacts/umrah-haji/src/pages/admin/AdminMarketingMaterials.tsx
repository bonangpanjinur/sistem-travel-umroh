import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Download, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatBytes } from "@/lib/format";

interface MarketingMaterial {
  id: string;
  name: string;
  description: string;
  material_type: string;
  category: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  is_active: boolean;
  available_for_agents: boolean;
  available_for_customers: boolean;
  download_count: number;
  tags: string[];
  created_at: string;
}

export default function AdminMarketingMaterials() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MarketingMaterial | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    material_type: "brochure" as const,
    category: "",
    file_url: "",
    file_name: "",
    file_size: 0,
    file_type: "",
    is_active: true,
    available_for_agents: true,
    available_for_customers: false,
    tags: [] as string[],
  });
  const [tagsInput, setTagsInput] = useState("");

  // Fetch materials
  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["admin-marketing-materials"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("marketing_materials")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Save material mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const materialData = {
        ...formData,
        tags: tagsInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };

      if (editingMaterial?.id) {
        const { error } = await (supabase as any)
          .from("marketing_materials")
          .update(materialData)
          .eq("id", editingMaterial.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("marketing_materials")
          .insert(materialData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-marketing-materials"] });
      toast.success(
        editingMaterial
          ? "Material berhasil diperbarui"
          : "Material berhasil ditambahkan"
      );
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error("Gagal menyimpan material: " + error.message);
    },
  });

  // Delete material mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("marketing_materials")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-marketing-materials"] });
      toast.success("Material berhasil dihapus");
    },
    onError: (error: any) => {
      toast.error("Gagal menghapus material: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      material_type: "brochure",
      category: "",
      file_url: "",
      file_name: "",
      file_size: 0,
      file_type: "",
      is_active: true,
      available_for_agents: true,
      available_for_customers: false,
      tags: [],
    });
    setTagsInput("");
    setEditingMaterial(null);
  };

  const handleEdit = (material: MarketingMaterial) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name,
      description: material.description || "",
      material_type: material.material_type as any,
      category: material.category || "",
      file_url: material.file_url,
      file_name: material.file_name,
      file_size: material.file_size,
      file_type: material.file_type,
      is_active: material.is_active,
      available_for_agents: material.available_for_agents,
      available_for_customers: material.available_for_customers,
      tags: material.tags || [],
    });
    setTagsInput((material.tags || []).join(", "));
    setIsDialogOpen(true);
  };

  const handleOpenDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketing Materials</h1>
          <p className="text-muted-foreground">
            Kelola materi promosi untuk agen dan pelanggan
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Material
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingMaterial ? "Edit Material" : "Tambah Material Baru"}
              </DialogTitle>
              <DialogDescription>
                Isi informasi material promosi di bawah ini
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Nama Material *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Contoh: Brosur Umrah 2024"
                  />
                </div>
                <div>
                  <Label>Tipe Material *</Label>
                  <Select
                    value={formData.material_type}
                    onValueChange={(v) =>
                      setFormData({ ...formData, material_type: v as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brochure">Brosur</SelectItem>
                      <SelectItem value="flyer">Flyer</SelectItem>
                      <SelectItem value="banner">Banner</SelectItem>
                      <SelectItem value="poster">Poster</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="template">Template</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Kategori</Label>
                  <Input
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    placeholder="Contoh: umrah, hajj, general"
                  />
                </div>
                <div>
                  <Label>Tipe File</Label>
                  <Input
                    value={formData.file_type}
                    onChange={(e) =>
                      setFormData({ ...formData, file_type: e.target.value })
                    }
                    placeholder="Contoh: pdf, image, video"
                  />
                </div>
              </div>

              <div>
                <Label>Deskripsi</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Deskripsi singkat tentang material ini"
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>URL File *</Label>
                  <Input
                    value={formData.file_url}
                    onChange={(e) =>
                      setFormData({ ...formData, file_url: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>Nama File *</Label>
                  <Input
                    value={formData.file_name}
                    onChange={(e) =>
                      setFormData({ ...formData, file_name: e.target.value })
                    }
                    placeholder="brochure.pdf"
                  />
                </div>
              </div>

              <div>
                <Label>Ukuran File (bytes)</Label>
                <Input
                  type="number"
                  value={formData.file_size}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      file_size: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div>
                <Label>Tags (pisahkan dengan koma)</Label>
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="promosi, umrah, 2024"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Aktif</Label>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(v) =>
                      setFormData({ ...formData, is_active: v })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Tersedia untuk Agen</Label>
                  <Switch
                    checked={formData.available_for_agents}
                    onCheckedChange={(v) =>
                      setFormData({ ...formData, available_for_agents: v })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Tersedia untuk Pelanggan</Label>
                  <Switch
                    checked={formData.available_for_customers}
                    onCheckedChange={(v) =>
                      setFormData({ ...formData, available_for_customers: v })
                    }
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Batal
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !formData.name}
              >
                {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Materials Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Material</CardTitle>
          <CardDescription>
            Total: {materials.length} material
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : materials.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Belum ada material</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Ukuran</TableHead>
                    <TableHead>Downloads</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((material: any) => (
                    <TableRow key={material.id}>
                      <TableCell className="font-medium max-w-xs truncate">
                        {material.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{material.material_type}</Badge>
                      </TableCell>
                      <TableCell>{material.category || "-"}</TableCell>
                      <TableCell>{formatBytes(material.file_size)}</TableCell>
                      <TableCell>{material.download_count}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {material.is_active && (
                            <Badge variant="default" className="text-xs">
                              Aktif
                            </Badge>
                          )}
                          {material.available_for_agents && (
                            <Badge variant="secondary" className="text-xs">
                              Agen
                            </Badge>
                          )}
                          {material.available_for_customers && (
                            <Badge variant="secondary" className="text-xs">
                              Pelanggan
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(material)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteMutation.mutate(material.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
