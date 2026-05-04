import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Info, Eye, EyeOff, Megaphone } from 'lucide-react';

const db = supabase as any;

interface Announcement {
  id: string;
  message: string;
  bg_color: string;
  text_color: string;
  link_url: string | null;
  link_text: string | null;
  is_active: boolean;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string | null;
}

interface AnnouncementForm {
  message: string;
  bg_color: string;
  text_color: string;
  link_url: string;
  link_text: string;
  is_active: boolean;
  sort_order: number;
}

const EMPTY_FORM: AnnouncementForm = {
  message: '',
  bg_color: 'emerald',
  text_color: 'white',
  link_url: '',
  link_text: '',
  is_active: true,
  sort_order: 0,
};

const COLOR_OPTIONS = [
  { value: 'emerald', label: 'Hijau Emerald', preview: 'bg-emerald-600' },
  { value: 'green',   label: 'Hijau',         preview: 'bg-green-600' },
  { value: 'blue',    label: 'Biru',           preview: 'bg-blue-600' },
  { value: 'amber',   label: 'Amber / Kuning', preview: 'bg-amber-500' },
  { value: 'red',     label: 'Merah',          preview: 'bg-red-600' },
  { value: 'purple',  label: 'Ungu',           preview: 'bg-purple-600' },
  { value: 'gray',    label: 'Abu-abu',        preview: 'bg-gray-700' },
  { value: 'dark',    label: 'Gelap',          preview: 'bg-gray-900' },
];

export default function AdminAnnouncements() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AnnouncementForm>(EMPTY_FORM);

  const { data: announcements = [], isLoading, error } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: async (): Promise<Announcement[]> => {
      const { data, error } = await db
        .from('announcements')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: AnnouncementForm) => {
      if (!payload.message.trim()) throw new Error('Pesan pengumuman wajib diisi');
      const body = {
        message: payload.message,
        bg_color: payload.bg_color,
        text_color: payload.text_color,
        link_url: payload.link_url || null,
        link_text: payload.link_text || null,
        is_active: payload.is_active,
        sort_order: payload.sort_order,
      };
      if (editingId) {
        const { error } = await db.from('announcements').update(body).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await db.from('announcements').insert(body);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['public-announcement'] });
      toast.success(editingId ? 'Pengumuman diperbarui' : 'Pengumuman ditambahkan');
      closeDialog();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('announcements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['public-announcement'] });
      toast.success('Pengumuman dihapus');
      setDeleteId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await db.from('announcements').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['public-announcement'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, sort_order: announcements.length });
    setDialogOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setEditingId(a.id);
    setForm({
      message: a.message,
      bg_color: a.bg_color,
      text_color: a.text_color,
      link_url: a.link_url ?? '',
      link_text: a.link_text ?? '',
      is_active: a.is_active,
      sort_order: a.sort_order,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const tableNotFound = error && (error as any)?.code === '42P01';
  const previewColor = COLOR_OPTIONS.find(c => c.value === form.bg_color);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengumuman</h1>
          <p className="text-muted-foreground">
            Kelola banner pengumuman yang tampil di bagian atas setiap halaman publik
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Pengumuman
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
              Jalankan SQL berikut di Supabase SQL Editor:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap">
{`create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  bg_color text not null default 'emerald',
  text_color text not null default 'white',
  link_url text,
  link_text text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz default now()
);

alter table public.announcements enable row level security;
create policy "Public read announcements" on public.announcements
  for select using (true);
create policy "Authenticated manage announcements" on public.announcements
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
          ) : announcements.length === 0 && !tableNotFound ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <Megaphone className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="font-medium text-muted-foreground">Belum ada pengumuman</p>
              <Button size="sm" onClick={openAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Pengumuman
              </Button>
            </div>
          ) : announcements.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pesan</TableHead>
                  <TableHead>Warna</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((a) => {
                  const col = COLOR_OPTIONS.find(c => c.value === a.bg_color);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="max-w-xs">
                        <p className="text-sm font-medium truncate">{a.message}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full ${col?.preview ?? 'bg-emerald-600'}`} />
                          <span className="text-sm capitalize">{col?.label ?? a.bg_color}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {a.link_text ? (
                          <Badge variant="outline" className="text-xs">{a.link_text}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={a.is_active}
                            onCheckedChange={(checked) =>
                              toggleMutation.mutate({ id: a.id, is_active: checked })
                            }
                          />
                          {a.is_active
                            ? <Eye className="h-4 w-4 text-green-600" />
                            : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(a)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon" variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(a.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Pengumuman' : 'Tambah Pengumuman Baru'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Preview */}
            {form.message && (
              <div className={`rounded-lg px-4 py-2.5 text-sm font-medium text-center ${previewColor?.preview ?? 'bg-emerald-600'} text-white`}>
                {form.message}
                {form.link_text && (
                  <span className="ml-2 underline opacity-80">{form.link_text}</span>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="ann-msg">Pesan Pengumuman <span className="text-destructive">*</span></Label>
              <Textarea
                id="ann-msg"
                rows={2}
                value={form.message}
                onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Promo Ramadan: Diskon 15% untuk semua paket Umroh!"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Warna Latar</Label>
              <Select value={form.bg_color} onValueChange={(v) => setForm(f => ({ ...f, bg_color: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${c.preview}`} />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ann-link-text">Teks Tombol (opsional)</Label>
                <Input
                  id="ann-link-text"
                  value={form.link_text}
                  onChange={(e) => setForm(f => ({ ...f, link_text: e.target.value }))}
                  placeholder="Pelajari Selengkapnya"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ann-link-url">URL Link</Label>
                <Input
                  id="ann-link-url"
                  value={form.link_url}
                  onChange={(e) => setForm(f => ({ ...f, link_url: e.target.value }))}
                  placeholder="/packages"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ann-order">Urutan</Label>
                <Input
                  id="ann-order"
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
              disabled={saveMutation.isPending || !form.message.trim()}
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? 'Simpan Perubahan' : 'Tambah Pengumuman'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengumuman?</AlertDialogTitle>
            <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
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
