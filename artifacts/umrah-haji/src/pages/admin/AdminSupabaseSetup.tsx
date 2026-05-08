import { useState } from 'react';
import { supabaseConfigSource } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  CheckCircle2, XCircle, Loader2, Copy, ExternalLink, Database,
  Key, Server, Table2, RefreshCw, AlertTriangle, ChevronDown, ChevronRight,
  Zap, Shield, Package, Users, BookOpen, Megaphone, Webhook,
} from 'lucide-react';

/* ── Helpers ─────────────────────────────────────────────────────────── */
function copyText(t: string) { navigator.clipboard.writeText(t).then(() => toast.success('Disalin!')); }

const isConfigured = supabaseConfigSource.urlSource === 'env' && supabaseConfigSource.keySource === 'env';

/* ── SQL MIGRATIONS ──────────────────────────────────────────────────── */
const SQL_GROUPS = [
  {
    id: 'core',
    label: 'Pengaturan Aplikasi',
    icon: Server,
    color: 'blue',
    required: true,
    sql: `-- Website / App Settings
create table if not exists public.website_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text,
  updated_at timestamptz default now()
);
alter table public.website_settings enable row level security;
create policy "Public read settings" on public.website_settings for select using (true);
create policy "Auth manage settings" on public.website_settings for all using (auth.role() = 'authenticated');

-- Insert default settings
insert into public.website_settings (key, value) values
  ('site_name', 'UmrohTravel'),
  ('site_tagline', 'Perjalanan Suci Anda'),
  ('primary_color', 'emerald'),
  ('whatsapp_number', '6281234567890')
on conflict (key) do nothing;`,
  },
  {
    id: 'packages',
    label: 'Paket & Keberangkatan',
    icon: Package,
    color: 'emerald',
    required: true,
    sql: `-- Package Types
create table if not exists public.package_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now()
);
alter table public.package_types enable row level security;
create policy "Public read package_types" on public.package_types for select using (true);
create policy "Auth manage package_types" on public.package_types for all using (auth.role() = 'authenticated');

insert into public.package_types (name, slug, sort_order) values
  ('Umroh Reguler', 'umroh_reguler', 1),
  ('Umroh Plus', 'umroh_plus', 2),
  ('Umroh VIP', 'umroh_vip', 3),
  ('Haji Reguler', 'haji_reguler', 4),
  ('Haji Plus', 'haji_plus', 5)
on conflict (slug) do nothing;

-- Packages
create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  package_type text not null,
  duration_days integer not null default 9,
  price_quad numeric not null default 0,
  price_triple numeric,
  price_double numeric,
  price_single numeric,
  description text,
  facilities text[],
  highlights text[],
  is_active boolean default true,
  is_featured boolean default false,
  quota integer default 40,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.packages enable row level security;
create policy "Public read packages" on public.packages for select using (is_active = true);
create policy "Auth manage packages" on public.packages for all using (auth.role() = 'authenticated');

-- Departures
create table if not exists public.departures (
  id uuid primary key default gen_random_uuid(),
  package_id uuid references public.packages(id) on delete cascade,
  departure_date date not null,
  return_date date,
  quota integer not null default 40,
  booked_count integer default 0,
  status text not null default 'open',
  price_quad numeric,
  price_triple numeric,
  price_double numeric,
  price_single numeric,
  notes text,
  created_at timestamptz default now()
);
alter table public.departures enable row level security;
create policy "Public read departures" on public.departures for select using (status = 'open');
create policy "Auth manage departures" on public.departures for all using (auth.role() = 'authenticated');`,
  },
  {
    id: 'customers',
    label: 'Pelanggan & Jamaah',
    icon: Users,
    color: 'purple',
    required: true,
    sql: `-- Customer Profiles (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'customer',
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Auth read all profiles" on public.profiles for select using (auth.role() = 'authenticated');

-- Trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'customer');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();`,
  },
  {
    id: 'bookings',
    label: 'Booking & Pembayaran',
    icon: BookOpen,
    color: 'amber',
    required: false,
    sql: `-- Bookings
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_number text unique not null default 'BK-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6),
  customer_id uuid references public.profiles(id),
  package_id uuid references public.packages(id),
  departure_id uuid references public.departures(id),
  status text not null default 'pending',
  pax integer not null default 1,
  room_type text not null default 'quad',
  total_price numeric not null default 0,
  paid_amount numeric not null default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.bookings enable row level security;
create policy "Customers read own bookings" on public.bookings for select using (customer_id = auth.uid());
create policy "Auth manage bookings" on public.bookings for all using (auth.role() = 'authenticated');

-- Payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade,
  amount numeric not null,
  payment_method text,
  status text not null default 'pending',
  proof_url text,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.payments enable row level security;
create policy "Auth manage payments" on public.payments for all using (auth.role() = 'authenticated');`,
  },
  {
    id: 'leads',
    label: 'Leads & CRM',
    icon: Zap,
    color: 'green',
    required: false,
    sql: `-- Leads
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  package_id uuid references public.packages(id),
  source text default 'website',
  status text not null default 'new',
  notes text,
  assigned_to uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.leads enable row level security;
create policy "Auth manage leads" on public.leads for all using (auth.role() = 'authenticated');`,
  },
  {
    id: 'content',
    label: 'Konten & Pengumuman',
    icon: Megaphone,
    color: 'rose',
    required: false,
    sql: `-- Banners
create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text,
  link_url text,
  link_text text,
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now()
);
alter table public.banners enable row level security;
create policy "Public read banners" on public.banners for select using (is_active = true);
create policy "Auth manage banners" on public.banners for all using (auth.role() = 'authenticated');

-- Announcements
create table if not exists public.announcements (
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
create policy "Public read announcements" on public.announcements for select using (true);
create policy "Auth manage announcements" on public.announcements for all using (auth.role() = 'authenticated');`,
  },
  {
    id: 'api',
    label: 'API Keys & Webhooks',
    icon: Webhook,
    color: 'gray',
    required: false,
    sql: `-- API Keys
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
create policy "Auth manage api_keys" on public.api_keys for all using (auth.role() = 'authenticated');

-- Webhook Endpoints
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
create policy "Auth manage webhooks" on public.webhook_endpoints for all using (auth.role() = 'authenticated');`,
  },
  {
    id: 'security',
    label: 'Admin & Keamanan',
    icon: Shield,
    color: 'red',
    required: false,
    sql: `-- Menu Permissions (RBAC)
create table if not exists public.menu_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  menu_key text not null,
  is_allowed boolean not null default true,
  created_at timestamptz default now(),
  unique (user_id, menu_key)
);
alter table public.menu_permissions enable row level security;
create policy "Auth manage menu_permissions" on public.menu_permissions for all using (auth.role() = 'authenticated');

-- Update your super admin role (replace YOUR_USER_ID with actual UUID from auth.users)
-- update public.profiles set role = 'super_admin' where id = 'YOUR_USER_ID';`,
  },
];

const COLOR_ICON: Record<string, string> = {
  blue:    'bg-blue-100 text-blue-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  purple:  'bg-purple-100 text-purple-600',
  amber:   'bg-amber-100 text-amber-600',
  green:   'bg-green-100 text-green-600',
  rose:    'bg-rose-100 text-rose-600',
  gray:    'bg-gray-100 text-gray-600',
  red:     'bg-red-100 text-red-600',
};

/* ── Live Tester ─────────────────────────────────────────────────────── */
function ConnectionTester() {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [detail, setDetail] = useState('');

  const test = async () => {
    if (!url || !key) { toast.error('Isi URL dan Anon Key terlebih dahulu'); return; }
    setStatus('testing');
    setDetail('');
    try {
      const cleanUrl = url.replace(/\/$/, '');
      const res = await fetch(`${cleanUrl}/rest/v1/`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok || res.status === 404 || res.status === 401) {
        // 401 means key auth WORKED but might be wrong key type — check content
        const text = await res.text();
        if (res.status === 401 && text.includes('Invalid API key')) {
          setStatus('fail'); setDetail('API key tidak valid — pastikan Anda menggunakan "anon public" key.');
        } else {
          setStatus('ok'); setDetail(`Koneksi berhasil! Status ${res.status} — Supabase URL valid dan key diterima.`);
        }
      } else {
        setStatus('fail'); setDetail(`Server merespons HTTP ${res.status}. Periksa URL project Supabase Anda.`);
      }
    } catch (e: any) {
      setStatus('fail');
      if (e?.name === 'TimeoutError') setDetail('Koneksi timeout — periksa URL Supabase Anda.');
      else if (e?.message?.includes('Failed to fetch')) setDetail('Tidak bisa menjangkau server. Periksa URL atau koneksi internet.');
      else setDetail(e?.message || 'Koneksi gagal.');
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1">
          <Label htmlFor="test-url" className="text-xs">Supabase Project URL</Label>
          <Input id="test-url" value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://abcdefghijklm.supabase.co" className="font-mono text-sm" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="test-key" className="text-xs">Anon / Public Key</Label>
          <Input id="test-key" value={key} onChange={e => setKey(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." className="font-mono text-sm" />
        </div>
      </div>

      <Button onClick={test} disabled={status === 'testing'} className="w-full" size="sm">
        {status === 'testing'
          ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Menguji Koneksi...</>
          : <><RefreshCw className="h-4 w-4 mr-2" />Uji Koneksi Sekarang</>}
      </Button>

      {status === 'ok' && (
        <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-green-800">{detail}</p>
        </div>
      )}
      {status === 'fail' && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-800">{detail}</p>
        </div>
      )}
    </div>
  );
}

/* ── SQL Group Card ───────────────────────────────────────────────────── */
function SqlCard({ group, done, onToggle }: {
  group: typeof SQL_GROUPS[0];
  done: boolean;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const Icon = group.icon;
  const iconCls = COLOR_ICON[group.color] ?? COLOR_ICON.gray;

  return (
    <Card className={done ? 'border-green-200 bg-green-50/40' : ''}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconCls}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm">{group.label}</p>
              {group.required && <Badge variant="secondary" className="text-xs">Wajib</Badge>}
              {done && <Badge className="bg-green-100 text-green-700 border-green-200 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Selesai</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { copyText(group.sql); }}>
              <Copy className="h-3 w-3 mr-1" />SQL
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setOpen(o => !o)}>
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {open && (
        <CardContent className="pt-0 px-4 pb-4 space-y-3">
          <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {group.sql}
          </pre>
          <div className="flex items-center gap-2">
            <Checkbox id={`done-${group.id}`} checked={done} onCheckedChange={onToggle} />
            <label htmlFor={`done-${group.id}`} className="text-sm cursor-pointer select-none">
              Saya sudah menjalankan SQL ini di Supabase
            </label>
          </div>
        </CardContent>
      )}

      {!open && (
        <CardContent className="pt-0 px-4 pb-3">
          <div className="flex items-center gap-2">
            <Checkbox id={`done-c-${group.id}`} checked={done} onCheckedChange={onToggle} />
            <label htmlFor={`done-c-${group.id}`} className="text-sm cursor-pointer select-none text-muted-foreground">
              Sudah dijalankan
            </label>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/* ── Main Component ────────────────────────────────────────────────────── */
export default function AdminSupabaseSetup() {
  const [doneSql, setDoneSql] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('supabase_setup_done') || '[]')); }
    catch { return new Set(); }
  });

  const toggleDone = (id: string) => {
    setDoneSql(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem('supabase_setup_done', JSON.stringify([...next]));
      return next;
    });
  };

  const doneCount = doneSql.size;
  const totalCount = SQL_GROUPS.length;
  const progressPct = Math.round((doneCount / totalCount) * 100);

  const REPLIT_SECRETS_URL = 'https://docs.replit.com/replit-workspace/workspace-features/secrets';

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panduan Koneksi Supabase</h1>
        <p className="text-muted-foreground">
          Ikuti langkah-langkah di bawah untuk menghubungkan aplikasi ini ke database Supabase Anda
        </p>
      </div>

      {/* Status Banner */}
      {isConfigured ? (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="py-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800">Supabase sudah terhubung!</p>
              <p className="text-sm text-green-700">
                URL: <code className="bg-green-100 px-1 rounded">{supabaseConfigSource.url}</code>
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-800">Supabase belum dikonfigurasi</p>
              <p className="text-sm text-amber-700">Ikuti langkah-langkah di bawah untuk mengaktifkan database dan autentikasi.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 1 ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
            <div>
              <CardTitle className="text-base">Buat Project Supabase</CardTitle>
              <CardDescription>Daftar gratis di supabase.com dan buat project baru</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <ol className="space-y-2 text-sm text-muted-foreground list-none">
            {[
              'Buka supabase.com → klik "Start your project"',
              'Login dengan GitHub atau buat akun baru (gratis)',
              'Klik "New project" → pilih organisasi → beri nama project',
              'Pilih region terdekat (Singapore untuk Indonesia)',
              'Buat password database yang kuat → klik "Create new project"',
              'Tunggu ±2 menit hingga project selesai dibuat',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <Button asChild size="sm" className="mt-2">
            <a href="https://supabase.com/dashboard/new/project" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-2" />
              Buka Supabase Dashboard
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* ── Step 2 ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</div>
            <div>
              <CardTitle className="text-base">Salin Kredensial Project</CardTitle>
              <CardDescription>Temukan URL dan API Key dari dashboard Supabase</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
            <p className="font-medium">Di dashboard Supabase, navigasi ke:</p>
            <div className="flex items-center gap-2">
              <code className="bg-gray-900 text-gray-100 px-2 py-1 rounded text-xs">Project Settings → API</code>
              <span className="text-muted-foreground text-xs">atau klik ikon roda gigi (⚙️) di sidebar kiri</span>
            </div>
            <p>Salin dua nilai berikut:</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded border bg-background px-3 py-2">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project URL</p>
                  <code className="text-xs text-muted-foreground">https://xyzabcdefg.supabase.co</code>
                </div>
                <Key className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between rounded border bg-background px-3 py-2">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">anon / public key</p>
                  <code className="text-xs text-muted-foreground">eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</code>
                </div>
                <Key className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Uji koneksi sebelum lanjut:</p>
            <ConnectionTester />
          </div>
        </CardContent>
      </Card>

      {/* ── Step 3 ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</div>
            <div>
              <CardTitle className="text-base">Tambahkan ke Replit Secrets</CardTitle>
              <CardDescription>Simpan kredensial secara aman di environment variables Replit</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
            <p className="font-medium mb-3">Di Replit, buka panel <strong>Secrets</strong> (ikon gembok 🔒 di sidebar kiri), lalu tambahkan:</p>
            {[
              { name: 'VITE_SUPABASE_URL', value: 'https://xyzabcdefg.supabase.co', desc: 'Project URL dari langkah 2' },
              { name: 'VITE_SUPABASE_PUBLISHABLE_KEY', value: 'eyJhbGciOiJIUzI1...', desc: 'Anon/public key dari langkah 2' },
            ].map(s => (
              <div key={s.name} className="rounded border bg-background p-3 flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono font-bold">{s.name}</code>
                    <Button size="sm" variant="ghost" className="h-5 px-1.5 text-xs" onClick={() => copyText(s.name)}>
                      <Copy className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                  <code className="text-xs text-muted-foreground">{s.value}</code>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 flex gap-2">
            <Database className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              Setelah menambah secrets, <strong>aplikasi akan otomatis restart</strong> dan membaca nilai baru. Refresh browser Anda.
            </p>
          </div>

          <Button asChild size="sm" variant="outline">
            <a href={REPLIT_SECRETS_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-2" />
              Panduan Replit Secrets
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* ── Step 4 ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">4</div>
            <div>
              <CardTitle className="text-base">Inisialisasi Tabel Database</CardTitle>
              <CardDescription>
                Jalankan SQL migrations di <strong>Supabase SQL Editor</strong> (Project → SQL Editor → New query)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress migrasi</span>
              <span className="font-medium">{doneCount} / {totalCount} selesai</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <Button asChild size="sm" variant="outline">
            <a href="https://supabase.com/dashboard/project/_/sql/new" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-2" />
              Buka SQL Editor Supabase
            </a>
          </Button>

          <div className="space-y-3">
            {SQL_GROUPS.map(g => (
              <SqlCard key={g.id} group={g} done={doneSql.has(g.id)} onToggle={() => toggleDone(g.id)} />
            ))}
          </div>

          {doneCount === totalCount && (
            <Card className="border-green-300 bg-green-50">
              <CardContent className="py-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-800">Semua migrasi selesai!</p>
                  <p className="text-sm text-green-700">Database Anda sudah siap. Mulai gunakan semua fitur portal.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* ── Step 5: Super Admin ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">5</div>
            <div>
              <CardTitle className="text-base">Set Role Super Admin</CardTitle>
              <CardDescription>Atur akun pertama Anda sebagai super admin setelah mendaftar</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <ol className="space-y-2 text-sm text-muted-foreground list-none">
            {[
              'Daftarkan akun pertama Anda melalui halaman /register',
              'Di Supabase dashboard, buka Table Editor → tabel profiles',
              'Temukan baris dengan email Anda',
              'Ubah kolom role menjadi super_admin',
              'Simpan → refresh aplikasi → login kembali',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
            <p className="text-xs font-mono flex-1">update public.profiles set role = 'super_admin' where email = 'your@email.com';</p>
            <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => copyText("update public.profiles set role = 'super_admin' where email = 'your@email.com';")}>
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Help */}
      <Card className="border-dashed">
        <CardContent className="py-4 text-center text-sm text-muted-foreground">
          <Table2 className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
          Butuh bantuan? Lihat dokumentasi lengkap Supabase di{' '}
          <a href="https://supabase.com/docs" target="_blank" rel="noopener noreferrer"
            className="text-primary hover:underline">supabase.com/docs</a>
        </CardContent>
      </Card>
    </div>
  );
}
