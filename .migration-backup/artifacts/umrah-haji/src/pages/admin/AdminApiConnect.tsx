import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Plus, Trash2, Loader2, Copy, Eye, EyeOff, Key, Code2,
  Webhook, CheckCircle2, Info, Zap, Globe, BookOpen, Lock,
} from 'lucide-react';

const db = supabase as any;

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  permissions: string[];
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
}

interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}

const ALL_PERMISSIONS = [
  { key: 'packages.read',    label: 'Baca Paket',        desc: 'GET /v1/packages' },
  { key: 'departures.read',  label: 'Baca Keberangkatan', desc: 'GET /v1/departures' },
  { key: 'leads.write',      label: 'Buat Lead',          desc: 'POST /v1/leads' },
  { key: 'bookings.read',    label: 'Baca Booking',       desc: 'GET /v1/bookings' },
  { key: 'bookings.write',   label: 'Buat Booking',       desc: 'POST /v1/bookings' },
];

const ALL_EVENTS = [
  'booking.created', 'booking.confirmed', 'booking.cancelled',
  'payment.received', 'payment.verified',
  'lead.created',
  'departure.updated',
];

const API_ENDPOINTS = [
  {
    method: 'GET', path: '/api/v1/packages', permission: 'packages.read',
    desc: 'Mendapatkan daftar paket Umroh & Haji yang aktif',
    response: `[{ "id": "uuid", "name": "Paket Reguler", "package_type": "umroh_reguler", "price_quad": 25000000, "duration_days": 9 }]`,
  },
  {
    method: 'GET', path: '/api/v1/packages/:id', permission: 'packages.read',
    desc: 'Detail satu paket berdasarkan ID',
    response: `{ "id": "uuid", "name": "...", "description": "...", "price_quad": 25000000 }`,
  },
  {
    method: 'GET', path: '/api/v1/departures', permission: 'departures.read',
    desc: 'Jadwal keberangkatan mendatang yang masih tersedia',
    response: `[{ "id": "uuid", "departure_date": "2025-03-01", "quota": 40, "booked_count": 12 }]`,
  },
  {
    method: 'POST', path: '/api/v1/leads', permission: 'leads.write',
    desc: 'Mengirimkan data lead / calon jamaah',
    body: `{ "name": "Ahmad", "phone": "081234567890", "email": "ahmad@email.com", "package_interest": "uuid" }`,
    response: `{ "id": "uuid", "status": "new" }`,
  },
];

function copyText(text: string, label = 'Disalin!') {
  navigator.clipboard.writeText(text).then(() => toast.success(label));
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-blue-100 text-blue-700 border-blue-200',
    POST: 'bg-green-100 text-green-700 border-green-200',
    PUT: 'bg-amber-100 text-amber-700 border-amber-200',
    DELETE: 'bg-red-100 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold border ${colors[method] ?? 'bg-gray-100 text-gray-700'}`}>
      {method}
    </span>
  );
}

export default function AdminApiConnect() {
  const queryClient = useQueryClient();
  const apiBase = `${window.location.origin}/api`;

  const [newKeyDialog, setNewKeyDialog] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPerms, setNewKeyPerms] = useState<string[]>(['packages.read', 'departures.read']);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [visibleEndpoint, setVisibleEndpoint] = useState<number | null>(null);

  const [webhookDialog, setWebhookDialog] = useState(false);
  const [webhookForm, setWebhookForm] = useState({ name: '', url: '', events: [] as string[] });
  const [deleteWebhookId, setDeleteWebhookId] = useState<string | null>(null);

  const { data: apiKeys = [], isLoading: keysLoading, error: keysError } = useQuery({
    queryKey: ['admin-api-keys'],
    queryFn: async (): Promise<ApiKey[]> => {
      const { data, error } = await db.from('api_keys').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: webhooks = [], isLoading: webhooksLoading, error: webhooksError } = useQuery({
    queryKey: ['admin-webhooks'],
    queryFn: async (): Promise<WebhookEndpoint[]> => {
      const { data, error } = await db.from('webhook_endpoints').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const generateKey = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return 'sk_live_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const createKeyMutation = useMutation({
    mutationFn: async () => {
      if (!newKeyName.trim()) throw new Error('Nama API key wajib diisi');
      if (newKeyPerms.length === 0) throw new Error('Pilih minimal satu permission');
      const rawKey = generateKey();
      const prefix = rawKey.slice(0, 16);
      const { error } = await db.from('api_keys').insert({
        name: newKeyName.trim(),
        key_hash: rawKey,
        key_prefix: prefix,
        permissions: newKeyPerms,
        is_active: true,
      });
      if (error) throw error;
      return rawKey;
    },
    onSuccess: (rawKey) => {
      queryClient.invalidateQueries({ queryKey: ['admin-api-keys'] });
      setCreatedKey(rawKey);
      setNewKeyDialog(false);
      setNewKeyName('');
      setNewKeyPerms(['packages.read', 'departures.read']);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const revokeKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('api_keys').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-api-keys'] });
      toast.success('API key dihapus');
      setRevokeId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createWebhookMutation = useMutation({
    mutationFn: async () => {
      if (!webhookForm.name.trim()) throw new Error('Nama webhook wajib diisi');
      if (!webhookForm.url.trim()) throw new Error('URL webhook wajib diisi');
      const { error } = await db.from('webhook_endpoints').insert({
        name: webhookForm.name,
        url: webhookForm.url,
        events: webhookForm.events,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-webhooks'] });
      toast.success('Webhook ditambahkan');
      setWebhookDialog(false);
      setWebhookForm({ name: '', url: '', events: [] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('webhook_endpoints').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-webhooks'] });
      toast.success('Webhook dihapus');
      setDeleteWebhookId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const tableNotFound = keysError && (keysError as any)?.code === '42P01';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">API Connect ke Aplikasi</h1>
        <p className="text-muted-foreground">
          Hubungkan aplikasi pihak ketiga, mobile app, atau sistem eksternal ke portal ini via REST API
        </p>
      </div>

      {/* Base URL card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Globe className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">API Base URL</p>
              <code className="text-sm font-mono font-semibold text-foreground">{apiBase}</code>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => copyText(apiBase, 'Base URL disalin!')}>
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Salin
          </Button>
        </CardContent>
      </Card>

      {tableNotFound && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800 flex items-center gap-2">
              <Info className="h-5 w-5" />
              Setup Database Diperlukan
            </CardTitle>
            <CardDescription className="text-amber-700">
              Jalankan SQL berikut di Supabase SQL Editor untuk mengaktifkan fitur API:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap">
{`-- Tabel API Keys
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key_hash text not null unique,
  key_prefix text not null,
  permissions text[] not null default '{}',
  is_active boolean not null default true,
  last_used_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  expires_at timestamptz
);
alter table public.api_keys enable row level security;
create policy "Authenticated manage api_keys" on public.api_keys
  for all using (auth.role() = 'authenticated');

-- Tabel Webhook Endpoints
create table if not exists public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  events text[] not null default '{}',
  is_active boolean not null default true,
  secret text,
  created_at timestamptz default now()
);
alter table public.webhook_endpoints enable row level security;
create policy "Authenticated manage webhooks" on public.webhook_endpoints
  for all using (auth.role() = 'authenticated');`}
            </pre>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="keys">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="keys" className="gap-2"><Key className="h-4 w-4" />API Keys</TabsTrigger>
          <TabsTrigger value="docs" className="gap-2"><BookOpen className="h-4 w-4" />Dokumentasi API</TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-2"><Webhook className="h-4 w-4" />Webhooks</TabsTrigger>
        </TabsList>

        {/* ── API KEYS TAB ─────────────────────────────────────────── */}
        <TabsContent value="keys" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Buat API key untuk diberikan ke aplikasi eksternal. Key hanya ditampilkan sekali saat dibuat.
            </p>
            <Button size="sm" onClick={() => setNewKeyDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Buat API Key
            </Button>
          </div>

          {createdKey && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-green-800 flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-5 w-5" />
                  API Key Berhasil Dibuat — Simpan Sekarang!
                </CardTitle>
                <CardDescription className="text-green-700">
                  Key ini hanya ditampilkan sekali. Pastikan Anda menyalinnya ke tempat aman.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 bg-white border border-green-200 rounded-lg px-3 py-2">
                  <code className="flex-1 font-mono text-sm break-all text-gray-800">{createdKey}</code>
                  <Button size="sm" variant="ghost" onClick={() => copyText(createdKey, 'API key disalin!')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button size="sm" variant="outline" className="w-full" onClick={() => setCreatedKey(null)}>
                  Saya sudah menyimpan key ini
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              {keysLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                    <Key className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-muted-foreground">Belum ada API key</p>
                  <Button size="sm" onClick={() => setNewKeyDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />Buat API Key
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Key Prefix</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Terakhir Digunakan</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell className="font-medium">{k.name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                            {k.key_prefix}···
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(k.permissions || []).map((p) => (
                              <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {k.is_active
                            ? <Badge className="bg-green-100 text-green-700 border-green-200">Aktif</Badge>
                            : <Badge variant="secondary">Nonaktif</Badge>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString('id-ID') : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon" variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setRevokeId(k.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── API DOCS TAB ─────────────────────────────────────────── */}
        <TabsContent value="docs" className="space-y-4">
          <Card className="border-blue-100 bg-blue-50/50">
            <CardContent className="py-4 flex gap-3">
              <Lock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                Semua endpoint memerlukan header <code className="bg-blue-100 px-1 rounded font-mono">X-API-Key: &lt;your_key&gt;</code>.
                Buat API Key di tab <strong>API Keys</strong> terlebih dahulu.
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {API_ENDPOINTS.map((ep, idx) => (
              <Card key={idx} className="overflow-hidden">
                <CardHeader className="py-3 px-4 cursor-pointer" onClick={() => setVisibleEndpoint(visibleEndpoint === idx ? null : idx)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MethodBadge method={ep.method} />
                      <code className="text-sm font-mono text-foreground">{ep.path}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs"><Lock className="h-2.5 w-2.5 mr-1" />{ep.permission}</Badge>
                      {visibleEndpoint === idx ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{ep.desc}</p>
                </CardHeader>

                {visibleEndpoint === idx && (
                  <CardContent className="pt-0 px-4 pb-4 space-y-3 border-t bg-muted/20">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contoh Request (cURL)</p>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => {
                          const curl = `curl -X ${ep.method} "${apiBase}/v1${ep.path.replace('/api/v1','')}"  \\\n  -H "X-API-Key: sk_live_your_key_here"${ep.body ? `  \\\n  -H "Content-Type: application/json" \\\n  -d '${ep.body}'` : ''}`;
                          copyText(curl, 'cURL disalin!');
                        }}>
                          <Copy className="h-3 w-3 mr-1" />Salin
                        </Button>
                      </div>
                      <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 text-xs overflow-x-auto">
{`curl -X ${ep.method} "${apiBase}/v1${ep.path.replace('/api/v1', '')}" \\
  -H "X-API-Key: sk_live_your_key_here"${ep.body ? `  \\
  -H "Content-Type: application/json" \\
  -d '${ep.body}'` : ''}`}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Contoh Response</p>
                      <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 text-xs overflow-x-auto">{ep.response}</pre>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── WEBHOOKS TAB ─────────────────────────────────────────── */}
        <TabsContent value="webhooks" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Kirim notifikasi otomatis ke URL eksternal saat event tertentu terjadi.
            </p>
            <Button size="sm" onClick={() => setWebhookDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Webhook
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {webhooksLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : webhooks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                    <Zap className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-muted-foreground">Belum ada webhook</p>
                  <Button size="sm" onClick={() => setWebhookDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />Tambah Webhook
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Events</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhooks.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="font-medium">{w.name}</TableCell>
                        <TableCell>
                          <code className="text-xs text-muted-foreground">{w.url}</code>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(w.events || []).map((e) => (
                              <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon" variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteWebhookId(w.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Key Dialog */}
      <Dialog open={newKeyDialog} onOpenChange={setNewKeyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Buat API Key Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="key-name">Nama API Key <span className="text-destructive">*</span></Label>
              <Input
                id="key-name"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Mobile App v1 / Partner Portal XYZ"
              />
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="space-y-2 rounded-lg border p-3">
                {ALL_PERMISSIONS.map((p) => (
                  <div key={p.key} className="flex items-start gap-2.5">
                    <Checkbox
                      id={p.key}
                      checked={newKeyPerms.includes(p.key)}
                      onCheckedChange={(checked) => {
                        setNewKeyPerms(prev =>
                          checked ? [...prev, p.key] : prev.filter(x => x !== p.key)
                        );
                      }}
                    />
                    <div className="leading-tight">
                      <label htmlFor={p.key} className="text-sm font-medium cursor-pointer">{p.label}</label>
                      <p className="text-xs text-muted-foreground font-mono">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="py-3 flex gap-2">
                <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800">Key lengkap hanya ditampilkan sekali setelah dibuat. Pastikan disimpan di tempat aman.</p>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewKeyDialog(false)}>Batal</Button>
            <Button onClick={() => createKeyMutation.mutate()} disabled={createKeyMutation.isPending || !newKeyName.trim()}>
              {createKeyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Buat Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Webhook Dialog */}
      <Dialog open={webhookDialog} onOpenChange={setWebhookDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Webhook</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nama Webhook</Label>
              <Input
                value={webhookForm.name}
                onChange={(e) => setWebhookForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Notifikasi Booking ke CRM"
              />
            </div>
            <div className="space-y-1.5">
              <Label>URL Endpoint <span className="text-destructive">*</span></Label>
              <Input
                value={webhookForm.url}
                onChange={(e) => setWebhookForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://your-app.com/webhook"
              />
            </div>
            <div className="space-y-2">
              <Label>Events</Label>
              <div className="space-y-2 rounded-lg border p-3">
                {ALL_EVENTS.map((ev) => (
                  <div key={ev} className="flex items-center gap-2.5">
                    <Checkbox
                      id={ev}
                      checked={webhookForm.events.includes(ev)}
                      onCheckedChange={(checked) =>
                        setWebhookForm(f => ({
                          ...f,
                          events: checked ? [...f.events, ev] : f.events.filter(x => x !== ev),
                        }))
                      }
                    />
                    <label htmlFor={ev} className="text-sm font-mono cursor-pointer">{ev}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWebhookDialog(false)}>Batal</Button>
            <Button onClick={() => createWebhookMutation.mutate()} disabled={createWebhookMutation.isPending}>
              {createWebhookMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Tambah Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Key confirm */}
      <AlertDialog open={!!revokeId} onOpenChange={(open) => { if (!open) setRevokeId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus API Key?</AlertDialogTitle>
            <AlertDialogDescription>Key ini akan dihapus permanen. Aplikasi yang menggunakannya akan kehilangan akses.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => revokeId && revokeKeyMutation.mutate(revokeId)}
            >
              {revokeKeyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Hapus Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete webhook confirm */}
      <AlertDialog open={!!deleteWebhookId} onOpenChange={(open) => { if (!open) setDeleteWebhookId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Webhook?</AlertDialogTitle>
            <AlertDialogDescription>Endpoint ini tidak akan menerima notifikasi lagi.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteWebhookId && deleteWebhookMutation.mutate(deleteWebhookId)}
            >
              {deleteWebhookMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
