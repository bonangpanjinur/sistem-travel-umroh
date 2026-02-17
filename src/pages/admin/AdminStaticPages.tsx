import { useState } from "react";
import { useAllStaticPages, StaticPage } from "@/hooks/useStaticPages";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, FileText, Eye, EyeOff } from "lucide-react";
import { LoadingState } from "@/components/shared/LoadingState";

export default function AdminStaticPages() {
  const { data: pages, isLoading } = useAllStaticPages();
  const queryClient = useQueryClient();
  const [editingPage, setEditingPage] = useState<StaticPage | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState({ slug: "", title: "", content: "", meta_title: "", meta_description: "", is_published: false });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase.from("static_pages").update({
          title: data.title,
          content: data.content,
          meta_title: data.meta_title || null,
          meta_description: data.meta_description || null,
          is_published: data.is_published,
        }).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("static_pages").insert({
          slug: data.slug,
          title: data.title,
          content: data.content,
          meta_title: data.meta_title || null,
          meta_description: data.meta_description || null,
          is_published: data.is_published,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["static-pages-all"] });
      toast.success("Halaman berhasil disimpan");
      setIsDialogOpen(false);
      setEditingPage(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase.from("static_pages").update({ is_published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["static-pages-all"] });
      toast.success("Status halaman diperbarui");
    },
  });

  const openEdit = (page: StaticPage) => {
    setEditingPage(page);
    setForm({
      slug: page.slug,
      title: page.title,
      content: page.content,
      meta_title: page.meta_title || "",
      meta_description: page.meta_description || "",
      is_published: page.is_published,
    });
    setIsDialogOpen(true);
  };

  const openNew = () => {
    setEditingPage(null);
    setForm({ slug: "", title: "", content: "", meta_title: "", meta_description: "", is_published: false });
    setIsDialogOpen(true);
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Halaman Statis</h1>
          <p className="text-muted-foreground">Kelola FAQ, Syarat & Ketentuan, Kebijakan Privasi, dll</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Tambah Halaman</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPage ? "Edit Halaman" : "Tambah Halaman Baru"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {!editingPage && (
                <div>
                  <Label>Slug URL</Label>
                  <Input placeholder="contoh: faq" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                  <p className="text-xs text-muted-foreground mt-1">Akan menjadi URL: /{form.slug || "slug"}</p>
                </div>
              )}
              <div>
                <Label>Judul</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>Konten (Markdown)</Label>
                <Textarea className="min-h-[300px] font-mono text-sm" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
              </div>
              <div>
                <Label>Meta Title (SEO)</Label>
                <Input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} />
              </div>
              <div>
                <Label>Meta Description (SEO)</Label>
                <Textarea value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
                <Label>Publikasikan</Label>
              </div>
              <Button className="w-full" onClick={() => saveMutation.mutate({ ...form, id: editingPage?.id })} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {pages?.map((page) => (
          <Card key={page.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{page.title}</p>
                  <p className="text-sm text-muted-foreground">/{page.slug}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={page.is_published ? "default" : "secondary"}>
                  {page.is_published ? "Published" : "Draft"}
                </Badge>
                <Button variant="ghost" size="icon" onClick={() => togglePublish.mutate({ id: page.id, is_published: !page.is_published })}>
                  {page.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => openEdit(page)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
