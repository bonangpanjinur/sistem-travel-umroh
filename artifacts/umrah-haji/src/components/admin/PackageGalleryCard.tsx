import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ImagePlus, Trash2, Loader2, X, ZoomIn,
  Upload, Images, Play, Star, ChevronLeft, ChevronRight, Video,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PackageGalleryCardProps {
  packageId: string;
  mainImageUrl?: string | null;
}

interface GalleryItem {
  id: string;
  title: string;
  media_url: string;
  media_type: "image" | "video";
  order_index: number;
  created_at: string;
}

const supabaseAny = supabase as any;

function isVideoUrl(url: string): boolean {
  const lower = (url || "").toLowerCase().split("?")[0];
  return /\.(mp4|webm|ogg|mov|avi|mkv|m4v)$/.test(lower);
}

function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/");
}

function MediaThumb({
  item,
  isMain,
  onClick,
}: {
  item: GalleryItem;
  isMain: boolean;
  onClick: () => void;
}) {
  const isVideo = item.media_type === "video";
  return (
    <div
      className={cn(
        "relative aspect-square rounded-xl overflow-hidden bg-muted border-2 cursor-pointer group transition-all duration-200",
        isMain
          ? "border-amber-400 ring-2 ring-amber-300"
          : "border-border/50 hover:border-primary/50"
      )}
      onClick={onClick}
    >
      {isVideo ? (
        <video
          src={item.media_url}
          className="w-full h-full object-cover"
          muted
          preload="metadata"
        />
      ) : (
        <img
          src={item.media_url}
          alt={item.title || "Galeri"}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      )}

      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="h-10 w-10 rounded-full bg-white/80 flex items-center justify-center">
            <Play className="h-5 w-5 text-gray-800 ml-0.5" />
          </div>
        </div>
      )}

      {isMain && (
        <div className="absolute top-1.5 left-1.5">
          <Badge className="bg-amber-400 text-amber-900 text-[9px] px-1.5 py-0 gap-0.5 border-0">
            <Star className="h-2.5 w-2.5 fill-amber-900" /> Utama
          </Badge>
        </div>
      )}

      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 rounded-xl">
        <button
          onClick={e => { e.stopPropagation(); onClick(); }}
          className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white"
          title="Lihat penuh"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function PackageGalleryCard({ packageId, mainImageUrl }: PackageGalleryCardProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteItem, setDeleteItem] = useState<GalleryItem | null>(null);
  const [slideshowIndex, setSlideshowIndex] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const queryKey = ["package-gallery", packageId];

  const { data: items = [], isLoading } = useQuery<GalleryItem[]>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabaseAny
        .from("media_gallery")
        .select("id, title, media_url, media_type, order_index, created_at")
        .eq("package_id", packageId)
        .eq("type", "package_gallery")
        .order("order_index", { ascending: true });
      if (error && error.code !== "42P01") throw error;
      return (data || []).map((d: any) => ({
        ...d,
        media_type: d.media_type || (isVideoUrl(d.media_url || "") ? "video" : "image"),
      }));
    },
    enabled: !!packageId,
  });

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const validFiles = Array.from(files).filter(f => {
        const isImg = f.type.startsWith("image/");
        const isVid = f.type.startsWith("video/");
        if (!isImg && !isVid) { toast.error(`${f.name}: hanya gambar atau video`); return false; }
        const maxSize = isVid ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
        if (f.size > maxSize) {
          toast.error(`${f.name}: terlalu besar (maks ${isVid ? "100MB" : "10MB"})`);
          return false;
        }
        return true;
      });
      if (validFiles.length === 0) return;

      setUploading(true);
      let success = 0, fail = 0;

      for (const file of validFiles) {
        try {
          const ext = file.name.split(".").pop() || "bin";
          const mediaType = isVideoFile(file) ? "video" : "image";
          const path = `package-gallery/${packageId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

          const { error: uploadErr } = await supabase.storage
            .from("trip-photos")
            .upload(path, file, { upsert: false });

          if (uploadErr) throw uploadErr;

          const { data: urlData } = supabase.storage
            .from("trip-photos")
            .getPublicUrl(path);

          await supabaseAny.from("media_gallery").insert({
            type: "package_gallery",
            package_id: packageId,
            media_url: urlData.publicUrl,
            media_type: mediaType,
            title: file.name.replace(/\.[^.]+$/, ""),
            is_active: true,
            order_index: items.length + success,
          });

          success++;
        } catch {
          fail++;
        }
      }

      setUploading(false);
      if (success > 0) {
        toast.success(`${success} file berhasil diupload`);
        queryClient.invalidateQueries({ queryKey });
      }
      if (fail > 0) toast.error(`${fail} file gagal diupload`);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [packageId, items.length, queryClient]
  );

  const deleteMutation = useMutation({
    mutationFn: async (item: GalleryItem) => {
      await supabaseAny.from("media_gallery").delete().eq("id", item.id);
      const pathMatch = item.media_url?.match(/trip-photos\/(.+?)(\?|$)/);
      if (pathMatch) {
        const storagePath = decodeURIComponent(pathMatch[1]);
        await supabase.storage.from("trip-photos").remove([storagePath]);
      }
    },
    onSuccess: () => {
      toast.success("Item dihapus dari galeri");
      queryClient.invalidateQueries({ queryKey });
      setDeleteItem(null);
    },
    onError: () => toast.error("Gagal menghapus item"),
  });

  const setMainImageMutation = useMutation({
    mutationFn: async (url: string) => {
      const { error } = await supabaseAny
        .from("packages")
        .update({ photo_url: url })
        .eq("id", packageId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Gambar utama berhasil diperbarui");
      queryClient.invalidateQueries({ queryKey: ["admin-package", packageId] });
    },
    onError: () => toast.error("Gagal mengatur gambar utama"),
  });

  const moveOrderMutation = useMutation({
    mutationFn: async ({ id, newIndex }: { id: string; newIndex: number }) => {
      await supabaseAny.from("media_gallery").update({ order_index: newIndex }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
    },
    [uploadFiles]
  );

  const handleMoveLeft = (index: number) => {
    if (index === 0) return;
    moveOrderMutation.mutate({ id: items[index].id, newIndex: index - 1 });
    moveOrderMutation.mutate({ id: items[index - 1].id, newIndex: index });
  };
  const handleMoveRight = (index: number) => {
    if (index >= items.length - 1) return;
    moveOrderMutation.mutate({ id: items[index].id, newIndex: index + 1 });
    moveOrderMutation.mutate({ id: items[index + 1].id, newIndex: index });
  };

  const currentSlide = slideshowIndex !== null ? items[slideshowIndex] : null;
  const goPrev = () => {
    if (slideshowIndex === null) return;
    setSlideshowIndex((slideshowIndex - 1 + items.length) % items.length);
  };
  const goNext = () => {
    if (slideshowIndex === null) return;
    setSlideshowIndex((slideshowIndex + 1) % items.length);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <Images className="h-5 w-5 text-primary" />
              Galeri Paket
              {items.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({items.filter(i => i.media_type === "image").length} foto,{" "}
                  {items.filter(i => i.media_type === "video").length} video)
                </span>
              )}
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="gap-2 rounded-xl"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
              {uploading ? "Mengupload..." : "Tambah Foto/Video"}
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={e => e.target.files && uploadFiles(e.target.files)}
          />

          {mainImageUrl && (
            <div className="flex items-center gap-2 mt-1">
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
              <span className="text-xs text-muted-foreground">
                Gambar utama paket sudah diatur — klik foto di bawah lalu "Jadikan Utama" untuk menggantinya
              </span>
            </div>
          )}
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
              dragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/30"
            )}
          >
            <Upload className={cn("h-8 w-8 mx-auto mb-2", dragOver ? "text-primary" : "text-muted-foreground/40")} />
            <p className="text-sm text-muted-foreground">
              Drag & drop foto/video ke sini, atau{" "}
              <span className="text-primary font-medium">klik untuk browse</span>
            </p>
            <div className="flex items-center justify-center gap-5 mt-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Images className="h-3 w-3" /> PNG, JPG, WebP • maks 10MB
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Video className="h-3 w-3" /> MP4, WebM, MOV • maks 100MB
              </span>
            </div>
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="aspect-square rounded-xl" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8">
              <Images className="h-10 w-10 mx-auto text-muted-foreground/20 mb-2" />
              <p className="text-sm text-muted-foreground">
                Belum ada foto atau video. Upload media pertama untuk galeri paket ini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {items.map((item, index) => {
                const isMain = !!mainImageUrl && item.media_url === mainImageUrl;
                return (
                  <div key={item.id} className="space-y-1.5">
                    <MediaThumb
                      item={item}
                      isMain={isMain}
                      onClick={() => setSlideshowIndex(index)}
                    />

                    {/* Reorder controls */}
                    <div className="flex items-center justify-between gap-0.5">
                      <button
                        disabled={index === 0 || moveOrderMutation.isPending}
                        onClick={() => handleMoveLeft(index)}
                        className="text-[10px] text-muted-foreground hover:text-primary disabled:opacity-30 px-1"
                      >
                        ←
                      </button>
                      <span
                        className="text-[10px] text-muted-foreground truncate flex-1 text-center"
                        title={item.title}
                      >
                        {item.media_type === "video" ? "🎬" : "🖼"}{" "}
                        {item.title || `Media ${index + 1}`}
                      </span>
                      <button
                        disabled={index >= items.length - 1 || moveOrderMutation.isPending}
                        onClick={() => handleMoveRight(index)}
                        className="text-[10px] text-muted-foreground hover:text-primary disabled:opacity-30 px-1"
                      >
                        →
                      </button>
                    </div>

                    {/* Action row */}
                    <div className="flex gap-1">
                      {item.media_type === "image" && !isMain && (
                        <button
                          onClick={() => setMainImageMutation.mutate(item.media_url)}
                          disabled={setMainImageMutation.isPending}
                          className="flex-1 text-[10px] py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors flex items-center justify-center gap-1"
                          title="Jadikan gambar utama paket"
                        >
                          <Star className="h-2.5 w-2.5" /> Jadikan Utama
                        </button>
                      )}
                      {isMain && (
                        <span className="flex-1 text-[10px] py-1 rounded-lg bg-amber-100 text-amber-700 border border-amber-300 flex items-center justify-center gap-1">
                          <Star className="h-2.5 w-2.5 fill-amber-600" /> Gambar Utama
                        </span>
                      )}
                      {item.media_type === "video" && !isMain && (
                        <span className="flex-1 text-[10px] py-1 rounded-lg bg-gray-50 text-gray-400 border border-gray-200 flex items-center justify-center gap-1">
                          <Play className="h-2.5 w-2.5" /> Video
                        </span>
                      )}
                      <button
                        onClick={() => setDeleteItem(item)}
                        className="h-6 w-6 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 flex items-center justify-center text-red-500 transition-colors shrink-0"
                        title="Hapus"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {items.length > 0 && (
            <p className="text-[11px] text-muted-foreground text-center pt-1">
              Klik thumbnail untuk membuka slideshow penuh • Foto berbintang = gambar utama paket
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Full-screen Slideshow ──────────────────────────────────────────────── */}
      {currentSlide && (
        <div
          className="fixed inset-0 z-50 bg-black/92 flex flex-col"
          onKeyDown={e => {
            if (e.key === "Escape") setSlideshowIndex(null);
            if (e.key === "ArrowLeft") goPrev();
            if (e.key === "ArrowRight") goNext();
          }}
          tabIndex={0}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-black/30 backdrop-blur-sm">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-white/60 text-sm shrink-0">
                {(slideshowIndex ?? 0) + 1} / {items.length}
              </span>
              <span className="text-white font-medium truncate">
                {currentSlide.title}
              </span>
              {currentSlide.media_type === "video" && (
                <Badge variant="outline" className="text-white/80 border-white/30 text-[10px] shrink-0">
                  <Play className="h-2.5 w-2.5 mr-1" /> Video
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-3">
              {currentSlide.media_type === "image" &&
                mainImageUrl !== currentSlide.media_url && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5 border-amber-400/50 text-amber-300 hover:bg-amber-400/20 hover:text-amber-200"
                    onClick={() => setMainImageMutation.mutate(currentSlide.media_url)}
                    disabled={setMainImageMutation.isPending}
                  >
                    <Star className="h-3 w-3" />
                    Jadikan Gambar Utama
                  </Button>
                )}
              {mainImageUrl === currentSlide.media_url && (
                <Badge className="bg-amber-400 text-amber-900 gap-1">
                  <Star className="h-3 w-3 fill-amber-800" /> Gambar Utama
                </Badge>
              )}
              <button
                onClick={() => { setDeleteItem(currentSlide); setSlideshowIndex(null); }}
                className="h-8 w-8 rounded-full bg-red-500/20 hover:bg-red-500/50 flex items-center justify-center text-red-300 transition-colors"
                title="Hapus"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setSlideshowIndex(null)}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Media area */}
          <div className="flex-1 flex items-center justify-center relative min-h-0 px-16">
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors disabled:opacity-20"
              onClick={goPrev}
              disabled={items.length <= 1}
            >
              <ChevronLeft className="h-7 w-7" />
            </button>

            {currentSlide.media_type === "video" ? (
              <video
                key={currentSlide.id}
                src={currentSlide.media_url}
                controls
                autoPlay
                className="max-h-full max-w-full rounded-xl shadow-2xl"
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <img
                key={currentSlide.id}
                src={currentSlide.media_url}
                alt={currentSlide.title}
                className="max-h-full max-w-full rounded-xl shadow-2xl object-contain"
              />
            )}

            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors disabled:opacity-20"
              onClick={goNext}
              disabled={items.length <= 1}
            >
              <ChevronRight className="h-7 w-7" />
            </button>
          </div>

          {/* Thumbnail strip */}
          <div className="shrink-0 flex items-center gap-2 px-4 py-3 overflow-x-auto bg-black/30">
            {items.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setSlideshowIndex(idx)}
                className={cn(
                  "shrink-0 h-14 w-14 rounded-lg overflow-hidden border-2 transition-all",
                  idx === slideshowIndex
                    ? "border-white scale-110"
                    : "border-white/20 hover:border-white/50 opacity-60 hover:opacity-100"
                )}
              >
                {item.media_type === "video" ? (
                  <div className="h-full w-full bg-gray-700 flex items-center justify-center">
                    <Play className="h-5 w-5 text-white" />
                  </div>
                ) : (
                  <img src={item.media_url} alt="" className="h-full w-full object-cover" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Hapus {deleteItem?.media_type === "video" ? "Video" : "Foto"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteItem?.title}</strong> akan dihapus permanen dari galeri dan storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteItem && deleteMutation.mutate(deleteItem)}
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
