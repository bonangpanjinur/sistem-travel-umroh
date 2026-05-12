import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ImagePlus, Trash2, Loader2, GripVertical, X, ZoomIn,
  Upload, Images
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PackageGalleryCardProps {
  packageId: string;
}

const supabaseAny = supabase as any;

export function PackageGalleryCard({ packageId }: PackageGalleryCardProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deletePhoto, setDeletePhoto] = useState<any>(null);
  const [previewPhoto, setPreviewPhoto] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const [captions, setCaptions] = useState<Record<string, string>>({});

  const queryKey = ["package-gallery", packageId];

  const { data: photos = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabaseAny
        .from("media_gallery")
        .select("id, title, media_url, order_index, created_at")
        .eq("package_id", packageId)
        .eq("type", "package_gallery")
        .order("order_index", { ascending: true });
      if (error && error.code !== "42P01") throw error;
      return data || [];
    },
    enabled: !!packageId,
  });

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(f => {
      if (!f.type.startsWith("image/")) { toast.error(`${f.name}: hanya file gambar`); return false; }
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name}: maks 10MB`); return false; }
      return true;
    });
    if (validFiles.length === 0) return;

    setUploading(true);
    let success = 0;
    let fail = 0;
    for (const file of validFiles) {
      try {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `package-gallery/${packageId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("trip-photos")
          .upload(path, file, { upsert: false });
        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage.from("trip-photos").getPublicUrl(path);

        const nextIndex = photos.length + success;
        await supabaseAny.from("media_gallery").insert({
          type: "package_gallery",
          package_id: packageId,
          media_url: urlData.publicUrl,
          title: captions[file.name] || file.name.replace(/\.[^.]+$/, ""),
          is_active: true,
          order_index: nextIndex,
        });
        success++;
      } catch {
        fail++;
      }
    }
    setUploading(false);
    if (success > 0) {
      toast.success(`${success} foto berhasil diupload`);
      queryClient.invalidateQueries({ queryKey });
    }
    if (fail > 0) toast.error(`${fail} foto gagal diupload`);
    setCaptions({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [packageId, photos.length, queryClient, captions]);

  const deleteMutation = useMutation({
    mutationFn: async (photo: any) => {
      await supabaseAny.from("media_gallery").delete().eq("id", photo.id);
      const pathMatch = photo.media_url?.match(/trip-photos\/(.+)$/);
      if (pathMatch) {
        const storagePath = decodeURIComponent(pathMatch[1].split("?")[0]);
        await supabase.storage.from("trip-photos").remove([storagePath]);
      }
    },
    onSuccess: () => {
      toast.success("Foto dihapus");
      queryClient.invalidateQueries({ queryKey });
      setDeletePhoto(null);
    },
    onError: () => toast.error("Gagal menghapus foto"),
  });

  const updateCaptionMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      await supabaseAny.from("media_gallery").update({ title }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const moveOrderMutation = useMutation({
    mutationFn: async ({ id, newIndex }: { id: string; newIndex: number }) => {
      await supabaseAny.from("media_gallery").update({ order_index: newIndex }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) uploadFiles(files);
  }, [uploadFiles]);

  const handleMoveLeft = (index: number) => {
    if (index === 0) return;
    const photo = photos[index];
    const prev = photos[index - 1];
    moveOrderMutation.mutate({ id: photo.id, newIndex: index - 1 });
    moveOrderMutation.mutate({ id: prev.id, newIndex: index });
  };

  const handleMoveRight = (index: number) => {
    if (index >= photos.length - 1) return;
    const photo = photos[index];
    const next = photos[index + 1];
    moveOrderMutation.mutate({ id: photo.id, newIndex: index + 1 });
    moveOrderMutation.mutate({ id: next.id, newIndex: index });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Images className="h-5 w-5 text-primary" />
              Galeri Foto Paket
              {photos.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground">({photos.length} foto)</span>
              )}
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="gap-2 rounded-xl"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {uploading ? "Mengupload..." : "Tambah Foto"}
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => e.target.files && uploadFiles(e.target.files)}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop Zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/30"
            )}
          >
            <Upload className={cn("h-8 w-8 mx-auto mb-2", dragOver ? "text-primary" : "text-muted-foreground/40")} />
            <p className="text-sm text-muted-foreground">
              Drag & drop foto ke sini, atau <span className="text-primary font-medium">klik untuk browse</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP • Maks 10MB per foto • Multiple upload didukung</p>
          </div>

          {/* Photo Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          ) : photos.length === 0 ? (
            <div className="text-center py-6">
              <Images className="h-10 w-10 mx-auto text-muted-foreground/20 mb-2" />
              <p className="text-sm text-muted-foreground">Belum ada foto. Upload foto pertama untuk galeri paket ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {photos.map((photo: any, index: number) => (
                <div key={photo.id} className="group relative">
                  <div className="aspect-square rounded-xl overflow-hidden bg-muted border border-border/50">
                    <img
                      src={photo.media_url}
                      alt={photo.title || `Foto ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {/* Overlay actions */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-xl">
                      <button
                        onClick={() => setPreviewPhoto(photo)}
                        className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white transition-colors"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletePhoto(photo)}
                        className="h-8 w-8 rounded-full bg-red-500/70 hover:bg-red-500 flex items-center justify-center text-white transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Order controls */}
                  <div className="flex items-center justify-between mt-1.5 gap-1">
                    <button
                      disabled={index === 0 || moveOrderMutation.isPending}
                      onClick={() => handleMoveLeft(index)}
                      className="text-[10px] text-muted-foreground hover:text-primary disabled:opacity-30 px-1 transition-colors"
                      title="Geser kiri"
                    >
                      ←
                    </button>
                    <span className="text-[10px] text-muted-foreground truncate flex-1 text-center" title={photo.title}>
                      {photo.title || `Foto ${index + 1}`}
                    </span>
                    <button
                      disabled={index >= photos.length - 1 || moveOrderMutation.isPending}
                      onClick={() => handleMoveRight(index)}
                      className="text-[10px] text-muted-foreground hover:text-primary disabled:opacity-30 px-1 transition-colors"
                      title="Geser kanan"
                    >
                      →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <button
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white"
            onClick={() => setPreviewPhoto(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={previewPhoto.media_url}
            alt={previewPhoto.title}
            className="max-h-[85vh] max-w-full rounded-xl shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
          {previewPhoto.title && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-4 py-2 rounded-full">
              {previewPhoto.title}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirm */}
      <AlertDialog open={!!deletePhoto} onOpenChange={() => setDeletePhoto(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Foto?</AlertDialogTitle>
            <AlertDialogDescription>
              Foto <span className="font-semibold">{deletePhoto?.title}</span> akan dihapus permanen dari galeri dan storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePhoto && deleteMutation.mutate(deletePhoto)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
