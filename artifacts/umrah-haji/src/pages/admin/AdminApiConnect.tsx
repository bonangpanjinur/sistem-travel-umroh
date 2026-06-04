import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Plus, Trash2, Loader2, Copy, Eye, EyeOff, Key,
  Webhook, CheckCircle2, Info, Zap, Globe, BookOpen, Lock,
  FlaskConical, Send, Clock, ChevronDown, ChevronUp, RotateCcw,
  AlertCircle, CheckCircle, XCircle, History, ShieldAlert, Activity,
  Timer, TrendingDown,
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

interface TestResult {
  id: string;
  timestamp: Date;
  endpoint: string;
  method: string;
  status: number | null;
  latencyMs: number | null;
  responseBody: any;
  error: string | null;
  keyPrefix: string;
  rateLimit: { limit: number; remaining: number; resetInSec: number } | null;
}

interface RateLimitBucket {
  limit: number;
  remaining: number;
  resetAt: Date;
  label: string;
  windowSec: number;
  updatedAt: Date;
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

const TEST_ENDPOINTS = [
  {
    id: 'health',
    label: 'Health Check',
    method: 'GET',
    path: '/health',
    permission: null,
    requiresKey: false,
    bodyTemplate: null,
    desc: 'Periksa apakah API server aktif dan berjalan',
  },
  {
    id: 'packages-list',
    label: 'GET /v1/packages',
    method: 'GET',
    path: '/v1/packages',
    permission: 'packages.read',
    requiresKey: true,
    bodyTemplate: null,
    desc: 'Daftar paket Umroh & Haji aktif',
  },
  {
    id: 'departures-list',
    label: 'GET /v1/departures',
    method: 'GET',
    path: '/v1/departures',
    permission: 'departures.read',
    requiresKey: true,
    bodyTemplate: null,
    desc: 'Jadwal keberangkatan mendatang',
  },
  {
    id: 'leads-post',
    label: 'POST /v1/leads',
    method: 'POST',
    path: '/v1/leads',
    permission: 'leads.write',
    requiresKey: true,
    bodyTemplate: JSON.stringify({
      name: 'Ahmad Test',
      phone: '081234567890',
      email: 'test@example.com',
      message: 'Ingin informasi paket umroh',
      source: 'api',
    }, null, 2),
    desc: 'Buat lead / calon jamaah baru',
  },
] as const;

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

function StatusBadge({ status }: { status: number | null }) {
  if (status === null) return null;
  const isSuccess = status >= 200 && status < 300;
  const isClientErr = status >= 400 && status < 500;
  const isServerErr = status >= 500;
  const cls = isSuccess
    ? 'bg-green-100 text-green-700 border-green-200'
    : isClientErr
    ? 'bg-amber-100 text-amber-700 border-amber-200'
    : isServerErr
    ? 'bg-red-100 text-red-700 border-red-200'
    : 'bg-gray-100 text-gray-700 border-gray-200';
  const Icon = isSuccess ? CheckCircle : isClientErr || isServerErr ? XCircle : AlertCircle;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold border ${cls}`}>
      <Icon className="h-3.5 w-3.5" />
      {status}
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

  // Test API state
  const [testEndpointId, setTestEndpointId] = useState<string>('health');
  const [testApiKey, setTestApiKey] = useState('');
  const [testBody, setTestBody] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  // Rate limit monitor state
  const [rlGeneral, setRlGeneral] = useState<RateLimitBucket | null>(null);
  const [rlLeads, setRlLeads]     = useState<RateLimitBucket | null>(null);
  const [rlCountdown, setRlCountdown] = useState<{ general: number; leads: number }>({ general: 0, leads: 0 });

  // Live countdown — ticks every second
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setRlCountdown({
        general: rlGeneral ? Math.max(0, Math.ceil((rlGeneral.resetAt.getTime() - now) / 1000)) : 0,
        leads:   rlLeads   ? Math.max(0, Math.ceil((rlLeads.resetAt.getTime()   - now) / 1000)) : 0,
      });
    }, 1000);
    return () => clearInterval(id);
  }, [rlGeneral, rlLeads]);

  const selectedEndpoint = TEST_ENDPOINTS.find(e => e.id === testEndpointId) ?? TEST_ENDPOINTS[0];

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

  // When endpoint changes, reset body to template
  const handleEndpointChange = (id: string) => {
    setTestEndpointId(id);
    const ep = TEST_ENDPOINTS.find(e => e.id === id);
    setTestBody(ep?.bodyTemplate ?? '');
  };

  const sendTestRequest = async () => {
    if (selectedEndpoint.requiresKey && !testApiKey.trim()) {
      toast.error('Masukkan API key terlebih dahulu');
      return;
    }

    setTestLoading(true);
    const start = performance.now();
    const resultId = crypto.randomUUID();

    try {
      const url = `${window.location.origin}/api${selectedEndpoint.path}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (testApiKey.trim()) {
        headers['X-API-Key'] = testApiKey.trim();
      }

      const fetchOptions: RequestInit = {
        method: selectedEndpoint.method,
        headers,
      };

      if (selectedEndpoint.method === 'POST' && testBody.trim()) {
        try {
          JSON.parse(testBody);
          fetchOptions.body = testBody;
        } catch {
          toast.error('Request body bukan JSON yang valid');
          setTestLoading(false);
          return;
        }
      }

      const res = await fetch(url, fetchOptions);
      const latencyMs = Math.round(performance.now() - start);
      let responseBody: any;
      try {
        responseBody = await res.json();
      } catch {
        responseBody = { raw: await res.text() };
      }

      // ── Parse rate-limit headers (RFC 9440 / draft-7 format) ──────────────
      const rlLimit     = parseInt(res.headers.get('RateLimit-Limit')     || res.headers.get('X-RateLimit-Limit')     || '0', 10);
      const rlRemaining = parseInt(res.headers.get('RateLimit-Remaining') || res.headers.get('X-RateLimit-Remaining') || '0', 10);
      const rlResetRaw  = res.headers.get('RateLimit-Reset') || res.headers.get('X-RateLimit-Reset') || '';
      const rlPolicy    = res.headers.get('RateLimit-Policy') || '';

      let rlResetInSec = 0;
      if (rlResetRaw) {
        const parsed = Number(rlResetRaw);
        // draft-7: delta-seconds; legacy: epoch seconds
        rlResetInSec = parsed > 1_000_000_000 ? Math.ceil((parsed - Date.now() / 1000)) : parsed;
        rlResetInSec = Math.max(0, rlResetInSec);
      }

      const rlInfo = rlLimit > 0 ? { limit: rlLimit, remaining: rlRemaining, resetInSec: rlResetInSec } : null;

      // Detect which bucket this falls into (leads vs general) from the policy header
      // leads window = 3600s, general = 900s
      const isLeadsBucket = rlPolicy.includes('w=3600') || selectedEndpoint.path === '/v1/leads';
      if (rlLimit > 0) {
        const bucket: RateLimitBucket = {
          limit: rlLimit,
          remaining: rlRemaining,
          resetAt: new Date(Date.now() + rlResetInSec * 1000),
          label: isLeadsBucket ? 'Leads (per jam)' : 'General (per 15 menit)',
          windowSec: isLeadsBucket ? 3600 : 900,
          updatedAt: new Date(),
        };
        if (isLeadsBucket) setRlLeads(bucket);
        else setRlGeneral(bucket);
      }
      // ─────────────────────────────────────────────────────────────────────

      const result: TestResult = {
        id: resultId,
        timestamp: new Date(),
        endpoint: `${selectedEndpoint.method} ${selectedEndpoint.path}`,
        method: selectedEndpoint.method,
        status: res.status,
        latencyMs,
        responseBody,
        error: null,
        keyPrefix: testApiKey ? testApiKey.slice(0, 12) + '···' : '(tanpa key)',
        rateLimit: rlInfo,
      };

      setTestResults(prev => [result, ...prev].slice(0, 10));
      setExpandedResult(resultId);

      if (res.ok) {
        toast.success(`${res.status} — Berhasil dalam ${latencyMs}ms`);
      } else {
        toast.error(`${res.status} — ${responseBody?.error ?? 'Request gagal'}`);
      }

      setTimeout(() => responseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      const result: TestResult = {
        id: resultId,
        timestamp: new Date(),
        endpoint: `${selectedEndpoint.method} ${selectedEndpoint.path}`,
        method: selectedEndpoint.method,
        status: null,
        latencyMs,
        responseBody: null,
        error: err.message ?? 'Network error',
        keyPrefix: testApiKey ? testApiKey.slice(0, 12) + '···' : '(tanpa key)',
        rateLimit: null,
      };
      setTestResults(prev => [result, ...prev].slice(0, 10));
      setExpandedResult(resultId);
      toast.error('Gagal terhubung ke server: ' + err.message);
    } finally {
      setTestLoading(false);
    }
  };

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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="keys" className="gap-2"><Key className="h-4 w-4" />API Keys</TabsTrigger>
          <TabsTrigger value="test" className="gap-2"><FlaskConical className="h-4 w-4" />Test API</TabsTrigger>
          <TabsTrigger value="docs" className="gap-2"><BookOpen className="h-4 w-4" />Dokumentasi</TabsTrigger>
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
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setTestApiKey(createdKey);
                      setCreatedKey(null);
                      toast.success('Key dipindahkan ke tab Test API');
                    }}
                  >
                    <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
                    Test sekarang
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setCreatedKey(null)}>
                    Saya sudah menyimpan key ini
                  </Button>
                </div>
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

        {/* ── TEST API TAB ──────────────────────────────────────────── */}
        <TabsContent value="test" className="space-y-4">
          <Card className="border-blue-100 bg-blue-50/50">
            <CardContent className="py-3 flex gap-3">
              <FlaskConical className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                Kirim request langsung ke API server dari browser ini. Cocok untuk memverifikasi API key dan melihat response sesungguhnya.
              </div>
            </CardContent>
          </Card>

          {/* ── Rate Limit Monitor ─────────────────────────────────── */}
          {(rlGeneral || rlLeads) && (
            <Card className="border-violet-100 bg-violet-50/40">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-violet-800">
                  <ShieldAlert className="h-4 w-4" />
                  Rate Limit Monitor
                  <span className="ml-auto text-xs font-normal text-violet-500 flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    Live
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className={`grid gap-4 ${rlGeneral && rlLeads ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
                  {[
                    rlGeneral ? { bucket: rlGeneral, countdown: rlCountdown.general } : null,
                    rlLeads   ? { bucket: rlLeads,   countdown: rlCountdown.leads   } : null,
                  ].filter(Boolean).map(({ bucket, countdown }: any) => {
                    const pct = bucket.limit > 0 ? Math.round((bucket.remaining / bucket.limit) * 100) : 0;
                    const used = bucket.limit - bucket.remaining;
                    const isLow = pct <= 20;
                    const isWarn = pct > 20 && pct <= 50;
                    const barColor = isLow ? 'bg-red-500' : isWarn ? 'bg-amber-500' : 'bg-green-500';
                    const textColor = isLow ? 'text-red-700' : isWarn ? 'text-amber-700' : 'text-green-700';
                    const resetMin = Math.floor(countdown / 60);
                    const resetSec = countdown % 60;
                    return (
                      <div key={bucket.label} className="bg-white rounded-lg border border-violet-100 p-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">{bucket.label}</span>
                          {isLow && (
                            <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
                              <TrendingDown className="h-3 w-3" />
                              Hampir habis
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-baseline justify-between">
                            <span className={`text-2xl font-bold ${textColor}`}>{bucket.remaining}</span>
                            <span className="text-xs text-muted-foreground">/ {bucket.limit} request</span>
                          </div>
                          <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground pt-0.5">
                            <span>{used} terpakai</span>
                            <span>{pct}% tersisa</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1 border-t border-violet-50">
                          <Timer className="h-3.5 w-3.5 text-violet-400" />
                          <span className="text-xs text-muted-foreground">Reset dalam:</span>
                          {countdown > 0 ? (
                            <span className="text-xs font-mono font-semibold text-violet-700">
                              {resetMin > 0 ? `${resetMin}m ` : ''}{resetSec}s
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-green-600">Sudah reset</span>
                          )}
                          <span className="ml-auto text-xs text-muted-foreground">
                            diupdate {bucket.updatedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {/* ── Request Builder ── */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Request Builder
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Endpoint selector */}
                  <div className="space-y-1.5">
                    <Label>Endpoint</Label>
                    <Select value={testEndpointId} onValueChange={handleEndpointChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEST_ENDPOINTS.map((ep) => (
                          <SelectItem key={ep.id} value={ep.id}>
                            <div className="flex items-center gap-2">
                              <MethodBadge method={ep.method} />
                              <span className="font-mono text-sm">{ep.path}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{selectedEndpoint.desc}</p>
                    {selectedEndpoint.permission && (
                      <div className="flex items-center gap-1.5">
                        <Lock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Butuh permission:</span>
                        <Badge variant="outline" className="text-xs py-0">{selectedEndpoint.permission}</Badge>
                      </div>
                    )}
                  </div>

                  {/* API Key input */}
                  {selectedEndpoint.requiresKey && (
                    <div className="space-y-1.5">
                      <Label>
                        API Key <span className="text-destructive">*</span>
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          value={testApiKey}
                          onChange={(e) => setTestApiKey(e.target.value)}
                          placeholder="sk_live_..."
                          type="password"
                          className="font-mono text-sm"
                        />
                        {testApiKey && (
                          <Button
                            size="icon"
                            variant="outline"
                            className="shrink-0"
                            onClick={() => setTestApiKey('')}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      {apiKeys.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Atau pilih dari key yang tersimpan:</p>
                          <div className="flex flex-wrap gap-1">
                            {apiKeys.filter(k => k.is_active).map((k) => (
                              <button
                                key={k.id}
                                className="text-xs bg-muted hover:bg-muted/80 border rounded px-2 py-0.5 font-mono transition-colors"
                                onClick={() => {
                                  toast.info(
                                    'Key tersimpan hanya menampilkan prefix. Masukkan key lengkap secara manual.',
                                    { duration: 4000 }
                                  );
                                }}
                              >
                                {k.name}: {k.key_prefix}···
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground/70">
                            Untuk keamanan, key lengkap tidak disimpan di database. Salin dari saat key dibuat.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Request body (POST only) */}
                  {selectedEndpoint.method === 'POST' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label>Request Body (JSON)</Label>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={() => setTestBody(selectedEndpoint.bodyTemplate ?? '')}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Reset template
                        </Button>
                      </div>
                      <Textarea
                        value={testBody}
                        onChange={(e) => setTestBody(e.target.value)}
                        className="font-mono text-sm min-h-[160px] resize-y"
                        placeholder={selectedEndpoint.bodyTemplate ?? '{}'}
                        spellCheck={false}
                      />
                    </div>
                  )}

                  <Button
                    className="w-full"
                    onClick={sendTestRequest}
                    disabled={testLoading}
                  >
                    {testLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Mengirim...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Kirim Request
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* ── Response Panel ── */}
            <div ref={responseRef} className="space-y-3">
              {testResults.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                      <FlaskConical className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-muted-foreground">Belum ada test</p>
                    <p className="text-sm text-muted-foreground/70">Pilih endpoint dan klik "Kirim Request"</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <History className="h-4 w-4 text-muted-foreground" />
                      Riwayat Request ({testResults.length})
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={() => setTestResults([])}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Hapus semua
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {testResults.map((result) => {
                      const isExpanded = expandedResult === result.id;
                      return (
                        <Card
                          key={result.id}
                          className={`overflow-hidden transition-all ${
                            result.error ? 'border-red-200' :
                            result.status && result.status < 300 ? 'border-green-200' :
                            result.status && result.status < 500 ? 'border-amber-200' :
                            'border-red-200'
                          }`}
                        >
                          <button
                            className="w-full text-left"
                            onClick={() => setExpandedResult(isExpanded ? null : result.id)}
                          >
                            <CardHeader className="py-3 px-4">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <MethodBadge method={result.method} />
                                  <code className="text-xs font-mono truncate text-foreground">
                                    {result.endpoint}
                                  </code>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {result.error ? (
                                    <Badge variant="destructive" className="text-xs">Network Error</Badge>
                                  ) : (
                                    <StatusBadge status={result.status} />
                                  )}
                                  {result.latencyMs !== null && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {result.latencyMs}ms
                                    </span>
                                  )}
                                  {isExpanded
                                    ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                    : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  }
                                </div>
                              </div>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <span className="text-xs text-muted-foreground">
                                  {result.timestamp.toLocaleTimeString('id-ID')}
                                </span>
                                <span className="text-xs text-muted-foreground font-mono">
                                  key: {result.keyPrefix}
                                </span>
                                {result.rateLimit && (() => {
                                  const rl = result.rateLimit;
                                  const pct = rl.limit > 0 ? (rl.remaining / rl.limit) * 100 : 100;
                                  const dotColor = pct <= 20 ? 'bg-red-500' : pct <= 50 ? 'bg-amber-400' : 'bg-green-500';
                                  const textColor = pct <= 20 ? 'text-red-600' : pct <= 50 ? 'text-amber-600' : 'text-green-600';
                                  return (
                                    <span className={`inline-flex items-center gap-1 text-xs font-mono font-medium ${textColor}`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                                      {rl.remaining}/{rl.limit} quota
                                    </span>
                                  );
                                })()}
                              </div>
                            </CardHeader>
                          </button>

                          {isExpanded && (
                            <CardContent className="pt-0 px-4 pb-4 border-t bg-muted/20 space-y-3">
                              {result.error ? (
                                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-sm font-medium text-red-800">Network Error</p>
                                    <p className="text-xs text-red-700 mt-0.5">{result.error}</p>
                                    <p className="text-xs text-red-600 mt-1">
                                      Pastikan API server berjalan di port 8080 dan tidak ada masalah jaringan.
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {result.rateLimit && (() => {
                                    const rl = result.rateLimit;
                                    const used = rl.limit - rl.remaining;
                                    const pct = rl.limit > 0 ? Math.round((rl.remaining / rl.limit) * 100) : 0;
                                    const barColor = pct <= 20 ? 'bg-red-500' : pct <= 50 ? 'bg-amber-400' : 'bg-green-500';
                                    const labelColor = pct <= 20 ? 'text-red-700' : pct <= 50 ? 'text-amber-700' : 'text-green-700';
                                    const resetMin = Math.floor(rl.resetInSec / 60);
                                    const resetSec = rl.resetInSec % 60;
                                    return (
                                      <div className="bg-violet-50 border border-violet-100 rounded-lg p-3 space-y-2">
                                        <p className="text-xs font-semibold text-violet-700 uppercase tracking-wider flex items-center gap-1.5">
                                          <ShieldAlert className="h-3.5 w-3.5" />
                                          Rate Limit saat request ini dikirim
                                        </p>
                                        <div className="grid grid-cols-3 gap-3">
                                          <div className="text-center">
                                            <p className={`text-lg font-bold ${labelColor}`}>{rl.remaining}</p>
                                            <p className="text-xs text-muted-foreground">tersisa</p>
                                          </div>
                                          <div className="text-center">
                                            <p className="text-lg font-bold text-foreground">{used}</p>
                                            <p className="text-xs text-muted-foreground">terpakai</p>
                                          </div>
                                          <div className="text-center">
                                            <p className="text-lg font-bold text-foreground">{rl.limit}</p>
                                            <p className="text-xs text-muted-foreground">limit</p>
                                          </div>
                                        </div>
                                        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                                          <div
                                            className={`h-full rounded-full ${barColor}`}
                                            style={{ width: `${pct}%` }}
                                          />
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                          <span>{pct}% tersisa</span>
                                          {rl.resetInSec > 0 && (
                                            <span className="flex items-center gap-1">
                                              <Timer className="h-3 w-3" />
                                              reset {resetMin > 0 ? `${resetMin}m ` : ''}{resetSec}s
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                      Response Body
                                    </p>
                                    <Button
                                      size="sm" variant="ghost" className="h-6 px-2 text-xs"
                                      onClick={() => copyText(JSON.stringify(result.responseBody, null, 2), 'Response disalin!')}
                                    >
                                      <Copy className="h-3 w-3 mr-1" />Salin
                                    </Button>
                                  </div>
                                  <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 text-xs overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap break-all">
                                    {JSON.stringify(result.responseBody, null, 2)}
                                  </pre>
                                </>
                              )}
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
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
