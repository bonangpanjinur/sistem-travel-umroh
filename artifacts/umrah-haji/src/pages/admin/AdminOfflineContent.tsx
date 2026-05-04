import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Book, Plus, Edit, Trash2, Search, BookOpen,
  Languages, Music, Image
} from "lucide-react";

interface OfflineContent {
  id: string;
  category: string;
  title: string;
  arabic_text?: string;
  latin_text?: string;
  translation?: string;
  content?: string;
  audio_url?: string;
  image_url?: string;
  sort_order: number;
  is_active: boolean;
}

export default function AdminOfflineContent() {
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState("doa");
  const [searchTerm, setSearchTerm] = useState("");
  const [formDialog, setFormDialog] = useState(false);
  const [editingContent, setEditingContent] = useState<OfflineContent | null>(null);
  
  const [formData, setFormData] = useState({
    category: "doa",
    title: "",
    arabic_text: "",
    latin_text: "",
    translation: "",
    content: "",
    audio_url: "",
    image_url: "",
    sort_order: 0,
    is_active: true,
  });

  // Fetch content
  const { data: contents, isLoading } = useQuery({
    queryKey: ["offline-content", activeCategory],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offline_content")
        .select("*")
        .eq("category", activeCategory)
        .order("sort_order");
      if (error) throw error;
      return data as unknown as OfflineContent[];
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingContent) {
        const { error } = await supabase
          .from("offline_content")
          .update(formData)
          .eq("id", editingContent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("offline_content")
          .insert(formData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingContent ? "Konten berhasil diupdate" : "Konten berhasil ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["offline-content"] });
      setFormDialog(false);
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("offline_content")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Konten berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["offline-content"] });
    },
  });

  // Toggle active
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("offline_content")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offline-content"] });
    },
  });

  const resetForm = () => {
    setFormData({
      category: activeCategory,
      title: "",
      arabic_text: "",
      latin_text: "",
      translation: "",
      content: "",
      audio_url: "",
      image_url: "",
      sort_order: 0,
      is_active: true,
    });
    setEditingContent(null);
  };

  const openEditDialog = (content: OfflineContent) => {
    setEditingContent(content);
    setFormData({
      category: content.category,
      title: content.title,
      arabic_text: content.arabic_text || "",
      latin_text: content.latin_text || "",
      translation: content.translation || "",
      content: content.content || "",
      audio_url: content.audio_url || "",
      image_url: content.image_url || "",
      sort_order: content.sort_order,
      is_active: content.is_active,
    });
    setFormDialog(true);
  };

  const filteredContents = contents?.filter(c =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categoryLabels: Record<string, string> = {
    doa: "Doa-doa",
    panduan: "Panduan Ibadah",
    manasik: "Materi Manasik",
    tips: "Tips Perjalanan",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Konten Offline</h1>
          <p className="text-muted-foreground">Kelola konten doa dan panduan untuk jamaah (PWA offline)</p>
        </div>
        <Button onClick={() => { resetForm(); setFormData(f => ({ ...f, category: activeCategory })); setFormDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Konten
        </Button>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList>
          <TabsTrigger value="doa" className="gap-2">
            <Book className="h-4 w-4" />
            Doa
          </TabsTrigger>
          <TabsTrigger value="panduan" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Panduan
          </TabsTrigger>
          <TabsTrigger value="manasik" className="gap-2">
            <Languages className="h-4 w-4" />
            Manasik
          </TabsTrigger>
          <TabsTrigger value="tips" className="gap-2">
            <Book className="h-4 w-4" />
            Tips
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari konten..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Judul</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContents?.map((content) => (
                  <TableRow key={content.id}>
                    <TableCell className="font-mono text-muted-foreground">
                      {content.sort_order}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{content.title}</p>
                        {content.arabic_text && (
                          <p className="text-sm text-muted-foreground font-arabic truncate max-w-xs" dir="rtl">
                            {content.arabic_text.substring(0, 50)}...
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {content.audio_url && (
                          <Badge variant="outline" className="gap-1">
                            <Music className="h-3 w-3" />
                            Audio
                          </Badge>
                        )}
                        {content.image_url && (
                          <Badge variant="outline" className="gap-1">
                            <Image className="h-3 w-3" />
                            Gambar
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={content.is_active}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({ id: content.id, is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(content)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(content.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!filteredContents?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? "Tidak ada hasil" : `Belum ada konten ${categoryLabels[activeCategory]}`}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={formDialog} onOpenChange={setFormDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingContent ? "Edit" : "Tambah"} Konten {categoryLabels[formData.category]}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="doa">Doa</SelectItem>
                    <SelectItem value="panduan">Panduan</SelectItem>
                    <SelectItem value="manasik">Manasik</SelectItem>
                    <SelectItem value="tips">Tips</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Urutan</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Judul *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Doa Niat Umrah"
              />
            </div>

            {(formData.category === "doa" || formData.category === "manasik") && (
              <>
                <div className="space-y-2">
                  <Label>Teks Arab</Label>
                  <Textarea
                    value={formData.arabic_text}
                    onChange={(e) => setFormData({ ...formData, arabic_text: e.target.value })}
                    placeholder="اللَّهُمَّ..."
                    className="font-arabic text-lg text-right"
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teks Latin</Label>
                  <Textarea
                    value={formData.latin_text}
                    onChange={(e) => setFormData({ ...formData, latin_text: e.target.value })}
                    placeholder="Allahumma..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Terjemahan</Label>
                  <Textarea
                    value={formData.translation}
                    onChange={(e) => setFormData({ ...formData, translation: e.target.value })}
                    placeholder="Ya Allah..."
                  />
                </div>
              </>
            )}

            {(formData.category === "panduan" || formData.category === "tips") && (
              <div className="space-y-2">
                <Label>Konten</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Tulis konten panduan di sini..."
                  rows={6}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>URL Audio (opsional)</Label>
                <Input
                  value={formData.audio_url}
                  onChange={(e) => setFormData({ ...formData, audio_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>URL Gambar (opsional)</Label>
                <Input
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormDialog(false)}>
              Batal
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!formData.title || saveMutation.isPending}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}