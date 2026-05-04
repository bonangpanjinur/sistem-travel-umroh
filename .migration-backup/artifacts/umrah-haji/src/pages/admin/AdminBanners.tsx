import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Image as ImageIcon, Loader2, GripVertical, Eye, EyeOff, ExternalLink, Info } from 'lucide-react';

const db = supabase as any;

interface Banner {
  id: string;
  title: string | null;
  subtitle: string | null;
  cta_text: string | null;
  cta_url: string | null;
  image_url: string;
  sort_order: number;
  is_active: boolean;
  created_at: string | null;
}

interface BannerForm {
  title: string;
  subtitle: string;
  cta_text: string;
  cta_url: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
}

const EMPTY_FORM: BannerForm = {
  title: '',
  subtitle: '',
  cta_text: '',
  cta_url: '',
  image_url: '',
  sort_order: 0,
  is_active: true,
};

export default function AdminBanners() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BannerForm>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);

  const { data: banners = [], isLoading, error } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: async (): Promise<Banner[]> => {
      const { data, error } = await db
        .from('banners')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: BannerForm) => {
      if (!payload.image_url) throw new Error('URL gambar wajib diisi');
      if (editingId) {
        const { error } = await db
          .from('banners')
          .update({
            title: payload.title || null,
            subtitle: payload.subtitle || null,
            cta_text: payload.cta_text || null,
            cta_url: payload.cta_url || null,
            image_url: payload.image_url,
            sort_order: payload.sort_order,
            is_active: payload.is_active,
          })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await db
          .from('banners')
          .insert({
            title: payload.title || null,
            subtitle: payload.subtitle || null,
            cta_text: payload.cta_text || null,
            cta_url: payload.cta_url || null,
            image_url: payload.image_url,
            sort_order: payload.sort_order,
            is_active: payload.is_active,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      queryClient.invalidateQueries({ queryKey: ['public-banners'] });
      toast.success(editingId ? 'Banner diperbarui' : 'Banner ditambahkan');
      setDialogOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('banners').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      queryClient.invalidateQueries({ queryKey: ['public-banners'] });
      toast.success('Banner dihapus');
      setDeleteId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await db
        .from('banners')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      queryClient.invalidateQueries({ queryKey: ['public-banners'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `banner-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from('public-assets')
        .getPublicUrl(fileName);
      setForm(f => ({ ...f, image_url: urlData.publicUrl }));
      toast.success('Gambar berhasil diunggah');
    } catch (err: any) {
      toast.error('Gagal unggah gambar: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, sort_order: banners.length });
    setDialogOpen(true);
  };

  const openEdit = (b: Banner) => {
    setEditingId(b.id);
    setForm({
      title: b.title ?? '',
      subtitle: b.subtitle ?? '',
      cta_text: b.cta_text ?? '',
      cta_url: b.cta_url ?? '',
      image_url: b.image_url,
      sort_order: b.sort_order,
      is_active: b.is_active,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const tableNotFound = error && (error as any)?.code === '42P01';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Banner Carousel</h1>
          <p className="text-muted-foreground">
            Kelola banner yang tampil di halaman utama website
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Banner
        </Button>
      </div>

      {tableNotFound && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800 flex items-center gap-2">
              <Info className="h-5 w-5" />
              Setup Diperlukan
            </CardTitle>
            <CardDescription className="text-amber-700">
              Tabel <code className="font-mono bg-amber-100 px-1 rounded">banners</code> belum ada.
              Jalankan SQL berikut di Supabase SQL Editor:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap">
{`create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text,
  subtitle text,
  cta_text text,
  cta_url text,
  image_url text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

alter table public.banners enable row level security;

create policy "Public read banners" on public.banners
  for select using (true);

create policy "Authenticated manage banners" on public.banners
  for all using (auth.role() = 'authenticated');`}
            </pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : banners.length === 0 && !tableNotFound ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <ImageIcon className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="font-medium text-muted-foreground">Belum ada banner</p>
              <p className="text-sm text-muted-foreground">
                Klik "Tambah Banner" untuk membuat banner carousel pertama
              </p>
              <Button size="sm" onClick={openAdd} className="mt-1">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Banner
              </Button>
            </div>
          ) : banners.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Gambar</TableHead>
                  <TableHead>Judul / Subjudul</TableHead>
                  <TableHead>Tombol CTA</TableHead>
                  <TableHead className="text-center">Urutan</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {banners.map((banner) => (
                  <TableRow key={banner.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell>
                      <div className="w-24 h-14 rounded overflow-hidden bg-muted border">
                        <img
                          src={banner.image_url}
                          alt={banner.title ?? 'Banner'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">
                        {banner.title || <span className="text-muted-foreground italic">Tanpa judul</span>}
                      </p>
                      {banner.subtitle && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {banner.subtitle}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {banner.cta_text ? (
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-xs">{banner.cta_text}</Badge>
                          {banner.cta_url && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a href={banner.cta_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                                </a>
                              </TooltipTrigger>
                              <TooltipContent>{banner.cta_url}</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm font-mono">{banner.sort_order}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={banner.is_active}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({ id: banner.id, is_active: checked })
                          }
                        />
                        {banner.is_active
                          ? <Eye className="h-4 w-4 text-green-600" />
                          : <EyeOff className="h-4 w-4 text-muted-foreground" />
                        }
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(banner)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(banner.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Banner' : 'Tambah Banner Baru'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Image */}
            <div className="space-y-2">
              <Label>
                Gambar Banner <span className="text-destructive">*</span>
              </Label>
              {form.image_url ? (
                <div className="relative group rounded-lg overflow-hidden border bg-muted h-36">
                  <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => document.getElementById('banner-img-input')?.click()}
                    >
                      Ganti Gambar
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed rounded-lg h-36 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => document.getElementById('banner-img-input')?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Klik untuk unggah gambar</p>
                      <p className="text-xs text-muted-foreground">Rekomendasi: 1920×640 px</p>
                    </>
                  )}
                </div>
              )}
              <input
                id="banner-img-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                  e.target.value = '';
                }}
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">atau URL:</span>
                <Input
                  value={form.image_url}
                  onChange={(e) => setForm(f => ({ ...f, image_url: e.target.value }))}
                  placeholder="https://..."
                  className="h-7 text-xs"
                />
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="b-title">Judul</Label>
                <Input
                  id="b-title"
                  value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Paket Umrah Terbaik 2025"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-subtitle">Subjudul</Label>
                <Input
                  id="b-subtitle"
                  value={form.subtitle}
                  onChange={(e) => setForm(f => ({ ...f, subtitle: e.target.value }))}
                  placeholder="Berangkat bersama kami, ibadah lebih tenang"
                />
              </div>
            </div>

            {/* CTA */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="b-cta-text">Teks Tombol CTA</Label>
                <Input
                  id="b-cta-text"
                  value={form.cta_text}
                  onChange={(e) => setForm(f => ({ ...f, cta_text: e.target.value }))}
                  placeholder="Daftar Sekarang"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-cta-url">URL Tombol CTA</Label>
                <Input
                  id="b-cta-url"
                  value={form.cta_url}
                  onChange={(e) => setForm(f => ({ ...f, cta_url: e.target.value }))}
                  placeholder="/packages"
                />
              </div>
            </div>

            {/* Order & Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="b-order">Urutan</Label>
                <Input
                  id="b-order"
                  type="number"
                  min={0}
                  value={form.sort_order}
                  onChange={(e) => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <div className="flex items-center gap-2 pt-2">
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))}
                  />
                  <span className="text-sm">{form.is_active ? 'Aktif' : 'Nonaktif'}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Batal</Button>
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending || !form.image_url}
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? 'Simpan Perubahan' : 'Tambah Banner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Banner?</AlertDialogTitle>
            <AlertDialogDescription>
              Banner ini akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
