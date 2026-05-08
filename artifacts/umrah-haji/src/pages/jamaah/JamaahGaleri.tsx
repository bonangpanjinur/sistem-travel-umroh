import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft, Camera, Upload, Image, Loader2,
  X, Download, Share2, Trash2, Heart, User, Calendar
} from "lucide-react";
import { Link } from "react-router-dom";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface TripPhoto {
  id: string;
  url: string;
  caption?: string;
  uploader_name: string;
  uploader_id: string;
  created_at: string;
  departure_id: string;
  likes?: number;
}

export default function JamaahGaleri() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<TripPhoto | null>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");

  const { data: customer } = useQuery({
    queryKey: ["jamaah-customer", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from("customers").select("*").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: booking } = useQuery({
    queryKey: ["jamaah-booking-galeri", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return null;
      const { data, error } = await supabase
        .from("bookings")
        .select(`*, departure:departures(*, package:packages(name))`)
        .eq("customer_id", customer.id)
        .in("booking_status", ["confirmed", "completed"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id,
  });

  const departureId = (booking as any)?.departure_id;

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ["trip-photos", departureId],
    queryFn: async () => {
      if (!departureId) return [];
      const { data, error } = await (supabase as any)
        .from("trip_photos")
        .select("*")
        .eq("departure_id", departureId)
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data ?? []) as TripPhoto[];
    },
    enabled: !!departureId,
  });

  const [likedPhotos, setLikedPhotos] = useState<Set<string>>(new Set());

  const deleteMutation = useMutation({
    mutationFn: async (photo: TripPhoto) => {
      await (supabase as any).from("trip_photos").delete().eq("id", photo.id);
      const path = photo.url.split("/trip-photos/")[1];
      if (path) await supabase.storage.from("trip-photos").remove([path]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-photos", departureId] });
      setSelectedPhoto(null);
      toast.success("Foto dihapus");
    },
    onError: () => toast.error("Gagal menghapus foto"),
  });

  const likeMutation = useMutation({
    mutationFn: async ({ photoId, currentLikes, isLiked }: { photoId: string; currentLikes: number; isLiked: boolean }) => {
      const newLikes = isLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;
      const { error } = await (supabase as any).from("trip_photos").update({ likes: newLikes }).eq("id", photoId);
      if (error) throw error;
      return { photoId, isLiked, newLikes };
    },
    onSuccess: ({ photoId, isLiked }) => {
      setLikedPhotos(prev => {
        const next = new Set(prev);
        if (isLiked) next.delete(photoId); else next.add(photoId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["trip-photos", departureId] });
    },
    onError: () => toast.error("Gagal memberi like"),
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !departureId || !customer) return;
    if (!file.type.startsWith("image/")) { toast.error("Hanya file gambar yang diizinkan"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Ukuran foto maksimal 10MB"); return; }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${departureId}/${user!.id}_${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("trip-photos")
        .upload(fileName, file, { upsert: false });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("trip-photos").getPublicUrl(fileName);

      await (supabase as any).from("trip_photos").insert({
        departure_id: departureId,
        url: urlData.publicUrl,
        uploader_id: user!.id,
        uploader_name: customer.full_name || user!.email,
        caption: caption || null,
      });

      queryClient.invalidateQueries({ queryKey: ["trip-photos", departureId] });
      setCaption("");
      toast.success("Foto berhasil diupload!");
    } catch {
      toast.error("Gagal mengupload foto. Coba lagi.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleShare = async (photo: TripPhoto) => {
    if (navigator.share) {
      try {
        await navigator.share({ url: photo.url, title: "Foto Perjalanan Umroh/Haji" });
      } catch { }
    } else {
      await navigator.clipboard.writeText(photo.url);
      toast.success("Link foto disalin!");
    }
  };

  const myPhotos = photos.filter(p => p.uploader_id === user?.id);
  const packageName = (booking as any)?.departure?.package?.name;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/jamaah" className="p-1 -ml-1 rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" />
              <span className="font-semibold text-gray-900">Galeri Perjalanan</span>
            </div>
            {packageName && <p className="text-xs text-muted-foreground mt-0.5">{packageName}</p>}
          </div>
          <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5">
            {photos.length} Foto
          </Badge>
        </div>
      </div>

      {/* No booking state */}
      {!booking && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Camera className="h-8 w-8 text-gray-400" />
          </div>
          <p className="font-semibold text-gray-700">Belum Ada Rombongan</p>
          <p className="text-sm text-muted-foreground mt-1">Galeri tersedia setelah booking dikonfirmasi.</p>
        </div>
      )}

      {booking && (
        <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
          {/* Upload Card */}
          <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
            <CardContent className="pt-4 pb-4">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Camera className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">Bagikan Momen Ibadahmu</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Upload foto untuk dilihat seluruh rombongan</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="gap-2"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? "Mengupload..." : "Pilih Foto"}
                </Button>
                <p className="text-[11px] text-muted-foreground">Maksimal 10MB per foto</p>
              </div>
            </CardContent>
          </Card>

          {/* Gallery Grid */}
          {isLoading ? (
            <div className="grid grid-cols-3 gap-1">
              {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="aspect-square rounded-md" />)}
            </div>
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Image className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm text-muted-foreground">Belum ada foto. Jadilah yang pertama upload!</p>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="flex gap-3 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{myPhotos.length} foto saya</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Image className="h-4 w-4" />
                  <span>{photos.length} total foto rombongan</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1">
                {photos.map(photo => {
                  const isLiked = likedPhotos.has(photo.id);
                  const likeCount = photo.likes ?? 0;
                  return (
                    <div key={photo.id} className="aspect-square relative overflow-hidden rounded-md bg-gray-100 group">
                      <button
                        onClick={() => setSelectedPhoto(photo)}
                        className="absolute inset-0 w-full h-full"
                      >
                        <img
                          src={photo.url}
                          alt={photo.caption ?? "Foto perjalanan"}
                          className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                          loading="lazy"
                        />
                      </button>
                      {photo.uploader_id === user?.id && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center pointer-events-none">
                          <User className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); likeMutation.mutate({ photoId: photo.id, currentLikes: likeCount, isLiked }); }}
                        className={cn(
                          "absolute bottom-1 left-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold transition-all",
                          isLiked ? "bg-red-500 text-white" : "bg-black/50 text-white"
                        )}
                      >
                        <Heart className={cn("h-2.5 w-2.5", isLiked && "fill-white")} />
                        {likeCount > 0 && <span>{likeCount}</span>}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Photo Detail Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                {selectedPhoto?.uploader_name}
              </span>
              <span className="text-xs text-muted-foreground font-normal">
                {selectedPhoto?.created_at && format(new Date(selectedPhoto.created_at), "d MMM yyyy", { locale: localeId })}
              </span>
            </DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <>
              <div className="bg-black">
                <img src={selectedPhoto.url} alt={selectedPhoto.caption ?? ""} className="w-full max-h-80 object-contain" />
              </div>
              {selectedPhoto.caption && (
                <p className="px-4 py-2 text-sm text-gray-700">{selectedPhoto.caption}</p>
              )}
              <div className="flex gap-2 px-4 pb-4 pt-2">
                <Button
                  variant={likedPhotos.has(selectedPhoto.id) ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => likeMutation.mutate({ photoId: selectedPhoto.id, currentLikes: selectedPhoto.likes ?? 0, isLiked: likedPhotos.has(selectedPhoto.id) })}
                  disabled={likeMutation.isPending}
                >
                  <Heart className={cn("h-3.5 w-3.5", likedPhotos.has(selectedPhoto.id) && "fill-current")} />
                  {(selectedPhoto.likes ?? 0) > 0 && <span>{selectedPhoto.likes}</span>}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => handleShare(selectedPhoto)}
                >
                  <Share2 className="h-3.5 w-3.5" /> Bagikan
                </Button>
                <a href={selectedPhoto.url} download target="_blank" rel="noreferrer" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full gap-1.5">
                    <Download className="h-3.5 w-3.5" /> Unduh
                  </Button>
                </a>
                {selectedPhoto.uploader_id === user?.id && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => deleteMutation.mutate(selectedPhoto)}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <JamaahBottomNav />
    </div>
  );
}
