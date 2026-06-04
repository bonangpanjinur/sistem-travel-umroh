import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Image, Plus, Edit, Trash2, Play, MapPin, Eye,
  Star, Video, Globe, ExternalLink, ChevronDown
} from "lucide-react";
import { format } from "date-fns";

const MEDIA_TYPES = [
  { value: "video_testimonial", label: "Video Testimoni", icon: Video },
  { value: "virtual_tour",      label: "Virtual Tour 360°", icon: Globe },
  { value: "hotel_photo",       label: "Foto Hotel", icon: Image },
];

const EMPTY_FORM = {
  type: "video_testimonial", title: "", description: "", media_url: "",
  thumbnail_url: "", hotel_id: "", package_id: "", jamaah_name: "",
  departure_year: "", duration_seconds: "", is_active: true, order_index: "0",
};

function getYouTubeEmbed(url: string) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
}

export default function AdminMediaGallery() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab]     = useState("video_testimonial");
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [form, setForm]               = useState({ ...EMPTY_FORM });

  const { data: hotels = [] } = useQuery({
    queryKey: ["hotels-for-gallery"],
    queryFn: async () => {
      const { data } = await supabase.from("hotels").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: packages = [] } = useQuery({
    queryKey: ["packages-for-gallery"],
    queryFn: async () => {
      const { data } = await supabase.from("packages").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: allMedia = [], isLoading } = useQuery({
    queryKey: ["media-gallery"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_gallery")
        .select("*, hotel:hotels(name), package:packages(name)")
        .order("order_index");
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data || [];
    },
  });

  const filtered = allMedia.filter((m: any) => m.type === activeTab);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        type: form.type, title: form.title || null, description: form.description || null,
        media_url: form.media_url, thumbnail_url: form.thumbnail_url || null,
        hotel_id: form.hotel_id || null, package_id: form.package_id || null,
        jamaah_name: form.jamaah_name || null,
        departure_year: form.departure_year ? parseInt(form.departure_year) : null,
        duration_seconds: form.duration_seconds ? parseInt(form.duration_seconds) : null,
        is_active: form.is_active, order_index: parseInt(form.order_index) || 0,
      };
      if (editingId) {
        const { error } = await supabase.from("media_gallery").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("media_gallery").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-gallery"] });
      setDialogOpen(false); setEditingId(null); setForm({ ...EMPTY_FORM });
      toast.success(editingId ? "Media diperbarui" : "Media baru ditambahkan");
    },
    onError: (e: any) => toast.error("Gagal: " + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("media_gallery").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["media-gallery"] }); toast.success("Media dihapus"); },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, val }: { id: string; val: boolean }) => {
      const { error } = await supabase.from("media_gallery").update({ is_active: val }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["media-gallery"] }),
  });

  const openEdit = (m: any) => {
    setEditingId(m.id);
    setForm({
      type: m.type, title: m.title || "", description: m.description || "",
      media_url: m.media_url, thumbnail_url: m.thumbnail_url || "",
      hotel_id: m.hotel_id || "", package_id: m.package_id || "",
      jamaah_name: m.jamaah_name || "", departure_year: m.departure_year?.toString() || "",
      duration_seconds: m.duration_seconds?.toString() || "",
      is_active: m.is_active, order_index: m.order_index?.toString() || "0",
    });
    setDialogOpen(true);
  };

  const openNew = (type: string) => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, type });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-pink-500/10 rounded-xl">
            <Image className="h-6 w-6 text-pink-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Media Gallery</h1>
            <p className="text-muted-foreground text-sm">Kelola video testimoni, virtual tour, dan foto hotel untuk website publik</p>
          </div>
        </div>
        <Button onClick={() => openNew(activeTab)}>
          <Plus className="h-4 w-4 mr-2" /> Tambah Media
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {MEDIA_TYPES.map(t => {
          const count = allMedia.filter((m: any) => m.type === t.value).length;
          const MIcon = t.icon;
          return (
            <Card key={t.value} className={`cursor-pointer hover:border-pink-300 transition-colors ${activeTab === t.value ? "border-pink-400 bg-pink-50/30" : ""}`}
              onClick={() => setActiveTab(t.value)}>
              <CardContent className="pt-4 pb-3 text-center">
                <MIcon className="h-6 w-6 mx-auto mb-1 text-pink-500" />
                <p className="text-xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{t.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Memuat...</div>
      ) : !filtered.length ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          <Image className="h-10 w-10 mx-auto mb-2 opacity-30" />
          Belum ada {MEDIA_TYPES.find(t => t.value === activeTab)?.label}. Pastikan tabel media_gallery sudah dibuat di Supabase.
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m: any) => (
            <Card key={m.id} className={`relative overflow-hidden ${!m.is_active ? "opacity-60" : ""}`}>
              {m.thumbnail_url ? (
                <div className="aspect-video bg-muted">
                  <img src={m.thumbnail_url} alt={m.title || ""} className="w-full h-full object-cover" />
                </div>
              ) : m.type === "video_testimonial" && m.media_url?.includes("youtube") ? (
                <div className="aspect-video bg-black flex items-center justify-center">
                  <Play className="h-10 w-10 text-white opacity-60" />
                </div>
              ) : (
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <Globe className="h-10 w-10 text-muted-foreground opacity-40" />
                </div>
              )}
              <CardContent className="pt-3 pb-3">
                <p className="font-medium text-sm line-clamp-1">{m.title || m.jamaah_name || "Tanpa Judul"}</p>
                {m.jamaah_name && <p className="text-xs text-muted-foreground">{m.jamaah_name}</p>}
                {m.hotel?.name && <p className="text-xs text-muted-foreground">{m.hotel.name}</p>}
                {m.departure_year && <p className="text-xs text-muted-foreground">Tahun {m.departure_year}</p>}
                <div className="flex items-center justify-between mt-2">
                  <Switch checked={m.is_active} onCheckedChange={v => toggleActive.mutate({ id: m.id, val: v })} />
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setPreviewItem(m)}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(m)}><Edit className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => deleteMutation.mutate(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edit Media" : "Tambah Media Baru"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tipe</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MEDIA_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Judul</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>URL Media *</Label><Input value={form.media_url} onChange={e => setForm(f => ({ ...f, media_url: e.target.value }))} placeholder="https://youtube.com/... atau URL 360°" /></div>
            <div><Label>URL Thumbnail</Label><Input value={form.thumbnail_url} onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))} /></div>
            {form.type === "video_testimonial" && (
              <>
                <div><Label>Nama Jamaah</Label><Input value={form.jamaah_name} onChange={e => setForm(f => ({ ...f, jamaah_name: e.target.value }))} /></div>
                <div><Label>Tahun Keberangkatan</Label><Input type="number" value={form.departure_year} onChange={e => setForm(f => ({ ...f, departure_year: e.target.value }))} /></div>
                <div>
                  <Label>Paket</Label>
                  <Select value={form.package_id} onValueChange={v => setForm(f => ({ ...f, package_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Pilih paket" /></SelectTrigger>
                    <SelectContent>{packages.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </>
            )}
            {(form.type === "virtual_tour" || form.type === "hotel_photo") && (
              <div>
                <Label>Hotel</Label>
                <Select value={form.hotel_id} onValueChange={v => setForm(f => ({ ...f, hotel_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih hotel" /></SelectTrigger>
                  <SelectContent>{hotels.map((h: any) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Deskripsi</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Urutan</Label><Input type="number" value={form.order_index} onChange={e => setForm(f => ({ ...f, order_index: e.target.value }))} /></div>
              <div className="flex items-center gap-2 pt-5">
                <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                <Label>Tampilkan di Website</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.media_url}>
              {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewItem} onOpenChange={v => { if (!v) setPreviewItem(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Preview: {previewItem?.title || previewItem?.jamaah_name}</DialogTitle></DialogHeader>
          {previewItem && (
            <div>
              {previewItem.type === "video_testimonial" && previewItem.media_url?.includes("youtube") ? (
                <div className="aspect-video"><iframe className="w-full h-full rounded-lg" src={getYouTubeEmbed(previewItem.media_url)} allowFullScreen /></div>
              ) : (
                <Button className="w-full" onClick={() => window.open(previewItem.media_url, "_blank")}>
                  <ExternalLink className="h-4 w-4 mr-2" /> Buka di Tab Baru
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
