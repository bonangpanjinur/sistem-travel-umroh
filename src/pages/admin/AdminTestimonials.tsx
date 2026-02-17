import { useState } from "react";
import { useAllTestimonials, Testimonial } from "@/hooks/useTestimonials";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Star, Trash2 } from "lucide-react";
import { LoadingState } from "@/components/shared/LoadingState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

export default function AdminTestimonials() {
  const { data: testimonials, isLoading } = useAllTestimonials();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", location: "", package_name: "", content: "", rating: "5", photo_url: "", is_featured: true, is_published: true });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form & { id?: string }) => {
      const payload = { 
        name: data.name, location: data.location || null, package_name: data.package_name || null, 
        content: data.content, rating: parseInt(data.rating), photo_url: data.photo_url || null, 
        is_featured: data.is_featured, is_published: data.is_published 
      };
      if (data.id) {
        const { error } = await supabase.from("testimonials").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("testimonials").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonials-all"] });
      toast.success("Testimoni berhasil disimpan");
      setIsDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("testimonials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonials-all"] });
      toast.success("Testimoni dihapus");
      setDeleteId(null);
    },
  });

  const openEdit = (t: Testimonial) => {
    setEditing(t);
    setForm({ name: t.name, location: t.location || "", package_name: t.package_name || "", content: t.content, rating: String(t.rating), photo_url: t.photo_url || "", is_featured: t.is_featured, is_published: t.is_published });
    setIsDialogOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", location: "", package_name: "", content: "", rating: "5", photo_url: "", is_featured: true, is_published: true });
    setIsDialogOpen(true);
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Testimoni</h1>
          <p className="text-muted-foreground">Kelola testimoni jamaah yang ditampilkan di website</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Tambah Testimoni</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Tambah"} Testimoni</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nama</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Kota</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
                <div><Label>Paket</Label><Input value={form.package_name} onChange={(e) => setForm({ ...form, package_name: e.target.value })} /></div>
              </div>
              <div><Label>Testimoni</Label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Rating</Label>
                  <Select value={form.rating} onValueChange={(v) => setForm({ ...form, rating: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[5, 4, 3, 2, 1].map((r) => <SelectItem key={r} value={String(r)}>{r} Bintang</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>URL Foto</Label><Input value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} /></div>
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2"><Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} /><Label>Featured</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} /><Label>Published</Label></div>
              </div>
              <Button className="w-full" onClick={() => saveMutation.mutate({ ...form, id: editing?.id })} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {testimonials?.map((t) => (
          <Card key={t.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.location}{t.package_name ? ` • ${t.package_name}` : ""}</p>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="h-3 w-3 fill-accent text-accent" />)}
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3">"{t.content}"</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {t.is_featured && <Badge variant="default">Featured</Badge>}
                  <Badge variant={t.is_published ? "outline" : "secondary"}>{t.is_published ? "Published" : "Draft"}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmDialog 
        open={!!deleteId} 
        onOpenChange={() => setDeleteId(null)} 
        title="Hapus Testimoni" 
        description="Yakin ingin menghapus testimoni ini?" 
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} 
      />
    </div>
  );
}
