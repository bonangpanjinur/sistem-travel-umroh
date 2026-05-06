import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit2, Trash2, Save, X, Star, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

interface Testimonial {
  id: string;
  name: string;
  location: string | null;
  package_name: string | null;
  content: string;
  rating: number;
  photo_url: string | null;
  is_featured: boolean;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface FormData {
  name: string;
  location: string;
  package_name: string;
  content: string;
  rating: number;
  photo_url: string;
  is_featured: boolean;
  is_published: boolean;
}

const INITIAL_FORM: FormData = {
  name: "",
  location: "",
  package_name: "",
  content: "",
  rating: 5,
  photo_url: "",
  is_featured: false,
  is_published: true,
};

export function TestimonialEditor() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<string | null>(null);

  // Fetch testimonials
  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .order("sort_order");

      if (error) throw error;
      setTestimonials(data || []);
    } catch (error: any) {
      toast.error("Gagal memuat testimonial");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (testimonial?: Testimonial) => {
    if (testimonial) {
      setEditingId(testimonial.id);
      setFormData({
        name: testimonial.name,
        location: testimonial.location || "",
        package_name: testimonial.package_name || "",
        content: testimonial.content,
        rating: testimonial.rating,
        photo_url: testimonial.photo_url || "",
        is_featured: testimonial.is_featured,
        is_published: testimonial.is_published,
      });
    } else {
      setEditingId(null);
      setFormData(INITIAL_FORM);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData(INITIAL_FORM);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileName = `testimonial-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("website-assets")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("website-assets")
        .getPublicUrl(fileName);

      setFormData((prev) => ({ ...prev, photo_url: publicUrl }));
      toast.success("Foto berhasil diupload");
    } catch (error: any) {
      toast.error(`Gagal upload foto: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.content.trim()) {
      toast.error("Nama dan konten testimonial tidak boleh kosong");
      return;
    }

    try {
      const dataToSave = {
        ...formData,
        sort_order: editingId
          ? testimonials.find((t) => t.id === editingId)?.sort_order || 0
          : testimonials.length,
      };

      if (editingId) {
        const { error } = await supabase
          .from("testimonials")
          .update(dataToSave)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Testimonial berhasil diperbarui");
      } else {
        const { error } = await supabase
          .from("testimonials")
          .insert([dataToSave]);

        if (error) throw error;
        toast.success("Testimonial berhasil ditambahkan");
      }

      handleCloseDialog();
      fetchTestimonials();
    } catch (error: any) {
      toast.error(`Gagal menyimpan: ${error.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("testimonials")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Testimonial berhasil dihapus");
      setSelectedForDelete(null);
      setIsDeleteDialogOpen(false);
      fetchTestimonials();
    } catch (error: any) {
      toast.error(`Gagal menghapus: ${error.message}`);
    }
  };

  const handleToggleFeatured = async (id: string, isFeatured: boolean) => {
    try {
      const { error } = await supabase
        .from("testimonials")
        .update({ is_featured: !isFeatured })
        .eq("id", id);

      if (error) throw error;
      toast.success(isFeatured ? "Testimonial dihapus dari featured" : "Testimonial ditambahkan ke featured");
      fetchTestimonials();
    } catch (error: any) {
      toast.error(`Gagal mengubah status: ${error.message}`);
    }
  };

  const handleTogglePublished = async (id: string, isPublished: boolean) => {
    try {
      const { error } = await supabase
        .from("testimonials")
        .update({ is_published: !isPublished })
        .eq("id", id);

      if (error) throw error;
      toast.success(isPublished ? "Testimonial disembunyikan" : "Testimonial dipublikasikan");
      fetchTestimonials();
    } catch (error: any) {
      toast.error(`Gagal mengubah status: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Manajemen Testimonial</CardTitle>
            <CardDescription>Kelola testimonial pelanggan yang ditampilkan di website</CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Testimonial
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : testimonials.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Belum ada testimonial. Tambahkan yang pertama sekarang!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {testimonials.map((testimonial) => (
                <div
                  key={testimonial.id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{testimonial.name}</h4>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${
                                i < testimonial.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {testimonial.location && (
                        <p className="text-xs text-muted-foreground">{testimonial.location}</p>
                      )}
                      {testimonial.package_name && (
                        <p className="text-xs text-muted-foreground">Paket: {testimonial.package_name}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleFeatured(testimonial.id, testimonial.is_featured)}
                        title={testimonial.is_featured ? "Hapus dari featured" : "Tambah ke featured"}
                      >
                        <Star
                          className={`h-4 w-4 ${
                            testimonial.is_featured
                              ? "fill-amber-400 text-amber-400"
                              : "text-gray-300"
                          }`}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(testimonial)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedForDelete(testimonial.id);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{testimonial.content}</p>
                  <div className="flex gap-2 text-xs">
                    {testimonial.is_published ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded">Dipublikasikan</span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">Disembunyikan</span>
                    )}
                    {testimonial.is_featured && (
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded">Featured</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Tambah/Edit */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Testimonial" : "Tambah Testimonial Baru"}
            </DialogTitle>
            <DialogDescription>
              Isi formulir di bawah untuk {editingId ? "memperbarui" : "menambahkan"} testimonial
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Photo */}
            <div className="space-y-2">
              <Label>Foto Profil</Label>
              {formData.photo_url && (
                <div className="relative w-20 h-20 mx-auto">
                  <img
                    src={formData.photo_url}
                    alt="Preview"
                    className="w-full h-full rounded-full object-cover border"
                  />
                  <button
                    onClick={() => setFormData((prev) => ({ ...prev, photo_url: "" }))}
                    className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={isUploading}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted/50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Mengupload...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Pilih Foto
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nama *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nama pelanggan"
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Lokasi</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="Kota/Provinsi"
              />
            </div>

            {/* Package Name */}
            <div className="space-y-2">
              <Label htmlFor="package_name">Nama Paket</Label>
              <Input
                id="package_name"
                value={formData.package_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, package_name: e.target.value }))}
                placeholder="Umroh Reguler 9 Hari"
              />
            </div>

            {/* Rating */}
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setFormData((prev) => ({ ...prev, rating: star }))}
                    className="p-1"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        star <= formData.rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">Testimonial *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                placeholder="Tuliskan testimonial pelanggan..."
                className="min-h-[100px] resize-none"
              />
            </div>

            {/* Checkboxes */}
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData((prev) => ({ ...prev, is_featured: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Tampilkan di featured section</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) => setFormData((prev) => ({ ...prev, is_published: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Publikasikan testimonial ini</span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Batal
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Testimonial?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda yakin ingin menghapus testimonial ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction
            onClick={() => selectedForDelete && handleDelete(selectedForDelete)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Hapus
          </AlertDialogAction>
          <AlertDialogCancel>Batal</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
