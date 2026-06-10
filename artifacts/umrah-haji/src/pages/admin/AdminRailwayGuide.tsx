import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Server, Globe, Database, Mail, MessageSquare, CreditCard,
  Bell, Bot, Key, Copy, Check, ChevronDown, ChevronRight,
  ExternalLink, AlertTriangle, Info, Terminal, Zap
} from 'lucide-react';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      title="Salin"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-gray-500" />}
    </button>
  );
}

function EnvRow({ name, value, desc, required = false }: {
  name: string; value?: string; desc: string; required?: boolean;
}) {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800">
      <td className="py-2 pr-3 align-top">
        <div className="flex items-center gap-1">
          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono">{name}</code>
          <CopyButton text={name} />
          {required && <Badge variant="destructive" className="text-[10px] px-1 py-0">wajib</Badge>}
        </div>
      </td>
      <td className="py-2 pr-3 align-top text-xs text-gray-500 dark:text-gray-400">{desc}</td>
      {value && (
        <td className="py-2 align-top">
          <div className="flex items-center">
            <code className="text-xs text-blue-600 dark:text-blue-400">{value}</code>
            <CopyButton text={value} />
          </div>
        </td>
      )}
    </tr>
  );
}

function Step({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(num <= 2);
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
      >
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-600 text-white text-sm font-bold flex items-center justify-center">
          {num}
        </span>
        <span className="font-medium text-sm flex-1">{title}</span>
        {open ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
      </button>
      {open && <div className="px-4 py-4 space-y-3 text-sm">{children}</div>}
    </div>
  );
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative bg-gray-900 rounded-md overflow-hidden">
      {label && <div className="text-xs text-gray-400 px-3 pt-2">{label}</div>}
      <pre className="p-3 text-xs text-gray-100 font-mono overflow-x-auto whitespace-pre-wrap">{code}</pre>
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="absolute top-2 right-2 p-1.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
        title="Salin kode"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5 text-gray-300" />}
      </button>
    </div>
  );
}

export default function AdminRailwayGuide() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
          <Server className="h-8 w-8 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Deployment API Server ke Railway</h1>
          <p className="text-gray-500 mt-1">
            Panduan lengkap menghubungkan API Server ke Railway agar semua fitur (WhatsApp, Email, PDF, Pembayaran, Cron) berjalan di production.
          </p>
        </div>
      </div>

      {/* Architecture Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
            <Info className="h-4 w-4" /> Arsitektur Production
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-0 text-sm">
            {[
              { icon: Globe, label: 'Browser', sub: 'User / Admin' },
              null,
              { icon: Globe, label: 'Vercel', sub: 'Frontend (React)', color: 'text-blue-600' },
              null,
              { icon: Database, label: 'Supabase', sub: 'Database + Auth', color: 'text-green-600' },
            ].map((item, i) =>
              item === null ? (
                <div key={i} className="text-gray-400 font-bold mx-2 hidden md:block">→</div>
              ) : (
                <div key={i} className={`flex flex-col items-center gap-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 min-w-[110px]`}>
                  <item.icon className={`h-6 w-6 ${item.color ?? 'text-gray-600'}`} />
                  <span className="font-semibold text-xs">{item.label}</span>
                  <span className="text-[10px] text-gray-500 text-center">{item.sub}</span>
                </div>
              )
            )}
          </div>
          <div className="flex justify-center mt-2">
            <div className="flex flex-col items-center gap-1 text-gray-400 text-xs font-bold">
              <span className="md:hidden">↓ juga terhubung ke ↓</span>
              <span className="hidden md:block">↘ juga terhubung ke ↙</span>
            </div>
          </div>
          <div className="flex justify-center mt-1">
            <div className="flex flex-col items-center gap-1 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg px-6 py-3">
              <Server className="h-6 w-6 text-purple-600" />
              <span className="font-semibold text-xs">Railway</span>
              <span className="text-[10px] text-gray-500 text-center">API Server (Express)<br/>WhatsApp · Email · PDF · Cron</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center mt-3">
            Frontend di Vercel memanggil Railway via <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">VITE_API_URL</code> untuk fitur yang butuh backend
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="railway">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="railway">
            <Server className="h-4 w-4 mr-1.5" /> Railway Setup
          </TabsTrigger>
          <TabsTrigger value="envvars">
            <Key className="h-4 w-4 mr-1.5" /> Env Variables
          </TabsTrigger>
          <TabsTrigger value="vercel">
            <Globe className="h-4 w-4 mr-1.5" /> Vercel Config
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: Railway Setup ── */}
        <TabsContent value="railway" className="space-y-3 mt-4">
          <Step num={1} title="Buat akun Railway dan project baru">
            <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li>
                Buka{' '}
                <a href="https://railway.app" target="_blank" rel="noreferrer" className="text-blue-600 underline inline-flex items-center gap-1">
                  railway.app <ExternalLink className="h-3 w-3" />
                </a>{' '}
                → Sign up dengan GitHub
              </li>
              <li>Klik <strong>New Project</strong></li>
              <li>Pilih <strong>Deploy from GitHub repo</strong></li>
              <li>Pilih repository ini (pastikan sudah di-push ke GitHub)</li>
            </ol>
          </Step>

          <Step num={2} title="Konfigurasi Build & Start Command di Railway">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Railway harus build dari root monorepo, bukan dari folder <code>artifacts/api-server</code>. Biarkan <strong>Root Directory</strong> kosong.
              </AlertDescription>
            </Alert>
            <div className="space-y-3 mt-3">
              <div>
                <p className="text-xs text-gray-500 mb-1 font-medium">Settings → Build → Build Command:</p>
                <CodeBlock
                  code="pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server run build"
                  label="Build Command"
                />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1 font-medium">Settings → Deploy → Start Command:</p>
                <CodeBlock
                  code="node --enable-source-maps artifacts/api-server/dist/index.mjs"
                  label="Start Command"
                />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1 font-medium">Settings → Deploy → Health Check Path:</p>
                <CodeBlock code="/api/healthz" label="Health Check" />
              </div>
            </div>
          </Step>

          <Step num={3} title="Tambahkan PostgreSQL via Supabase (DATABASE_URL)">
            <p className="text-gray-700 dark:text-gray-300">
              Railway menggunakan database Supabase Anda — <strong>bukan</strong> database Railway sendiri.
            </p>
            <ol className="list-decimal list-inside space-y-2 mt-2 text-gray-700 dark:text-gray-300">
              <li>
                Buka{' '}
                <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-blue-600 underline inline-flex items-center gap-1">
                  Supabase Dashboard <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>Pilih project Anda → <strong>Project Settings → Database</strong></li>
              <li>Scroll ke <strong>Connection string</strong>, pilih tab <strong>URI</strong></li>
              <li>Salin connection string, <strong>ganti <code>[YOUR-PASSWORD]</code></strong> dengan password database Anda</li>
              <li>Tambahkan <code>?sslmode=require</code> di akhir URL</li>
            </ol>
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1">Format DATABASE_URL yang benar:</p>
              <CodeBlock
                code="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres?sslmode=require"
                label="DATABASE_URL"
              />
            </div>
            <Alert className="mt-2">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Gunakan <strong>Direct connection</strong> (port 5432), bukan Pooled connection (port 6543). 
                Direct connection lebih stabil untuk server yang terus berjalan.
              </AlertDescription>
            </Alert>
          </Step>

          <Step num={4} title="Set semua Environment Variables di Railway">
            <p className="text-gray-700 dark:text-gray-300">
              Di Railway: buka service → tab <strong>Variables</strong> → tambahkan semua variabel dari tab <strong>Env Variables</strong> di atas.
            </p>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Minimal yang wajib diisi:</p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1 mt-1">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">DATABASE_URL</code> — dari Supabase (langkah 3)</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">APP_JWT_SECRET</code> — string acak panjang</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">NODE_ENV</code> = <code className="text-green-600">production</code></li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">FRONTEND_URL</code> — URL Vercel Anda (e.g. https://vinstour.vercel.app)</li>
            </ul>
          </Step>

          <Step num={5} title="Deploy dan dapatkan Railway URL">
            <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li>Klik <strong>Deploy</strong> — Railway akan build dan start server</li>
              <li>Tunggu hingga status <Badge className="bg-green-100 text-green-700 text-xs">Active</Badge></li>
              <li>
                Buka tab <strong>Settings → Networking → Public Domain</strong> — generate domain seperti:
              </li>
            </ol>
            <CodeBlock code="https://vinstour-api-production.up.railway.app" label="Railway URL (contoh)" />
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Simpan URL ini — akan dipakai di langkah berikutnya sebagai <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">VITE_API_URL</code>.
            </p>
          </Step>

          <Step num={6} title="Verifikasi API Server berjalan">
            <p className="text-gray-700 dark:text-gray-300">Test health check dengan membuka di browser atau curl:</p>
            <CodeBlock code="curl https://your-railway-app.up.railway.app/api/healthz" label="Health Check" />
            <p className="mt-2 text-gray-600 dark:text-gray-400">Response yang diharapkan:</p>
            <CodeBlock code={`{"status":"ok"}`} label="Expected Response" />
          </Step>
        </TabsContent>

        {/* ── TAB 2: Env Variables ── */}
        <TabsContent value="envvars" className="space-y-4 mt-4">
          <Alert>
            <Terminal className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Semua variabel ini diset di <strong>Railway → service → Variables</strong>. Untuk local dev, buat file <code>.env</code> di root repo.
              Template tersedia di <code>artifacts/api-server/.env.example</code>.
            </AlertDescription>
          </Alert>

          {/* Required */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="h-4 w-4 text-red-500" />
                Wajib (Required)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm px-4">
                <tbody className="px-4">
                  <tr><td className="px-4 py-1" colSpan={3}>
                    <EnvRow name="DATABASE_URL" required desc="Connection string PostgreSQL ke Supabase (port 5432, ?sslmode=require)" value="postgresql://postgres:PWD@db.REF.supabase.co:5432/postgres?sslmode=require" />
                  </td></tr>
                  <tr><td className="px-4 py-1" colSpan={3}>
                    <EnvRow name="APP_JWT_SECRET" required desc="Secret JWT untuk auth — string acak min 32 karakter (generate via openssl rand -hex 48)" />
                  </td></tr>
                  <tr><td className="px-4 py-1" colSpan={3}>
                    <EnvRow name="NODE_ENV" required desc="Environment production" value="production" />
                  </td></tr>
                  <tr><td className="px-4 py-1" colSpan={3}>
                    <EnvRow name="FRONTEND_URL" required desc="URL frontend di Vercel (untuk redirect setelah pembayaran)" value="https://your-app.vercel.app" />
                  </td></tr>
                  <tr><td className="px-4 py-1" colSpan={3}>
                    <EnvRow name="VITE_SUPABASE_URL" required desc="URL project Supabase (untuk sitemap & health check)" value="https://xxxx.supabase.co" />
                  </td></tr>
                  <tr><td className="px-4 py-1" colSpan={3}>
                    <EnvRow name="VITE_SUPABASE_PUBLISHABLE_KEY" required desc="Anon/public key Supabase" />
                  </td></tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* WhatsApp */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-green-500" />
                WhatsApp — Fonnte
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm px-4">
                <tbody>
                  <tr><td className="px-4 py-1" colSpan={3}>
                    <EnvRow name="FONNTE_TOKEN" desc="Token API Fonnte dari https://fonnte.com → Akun → Token. Jika dikosongkan, admin bisa isi via UI Admin → Pengaturan → WhatsApp." />
                  </td></tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Email */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-500" />
                Email — SMTP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-gray-500 mb-3 space-y-1">
                <p>Pilih salah satu provider SMTP:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li><strong>Gmail:</strong> SMTP_HOST=smtp.gmail.com, PORT=587, gunakan App Password (bukan password Gmail biasa)</li>
                  <li><strong>Brevo (Sendinblue):</strong> SMTP_HOST=smtp-relay.brevo.com, PORT=587 — gratis 300 email/hari</li>
                  <li><strong>Resend:</strong> SMTP_HOST=smtp.resend.com, PORT=465 — gratis 100 email/hari</li>
                </ul>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  <EnvRow name="SMTP_HOST" desc="Hostname server SMTP" value="smtp.gmail.com" />
                  <EnvRow name="SMTP_PORT" desc="Port SMTP (587 untuk TLS, 465 untuk SSL)" value="587" />
                  <EnvRow name="SMTP_USER" desc="Username / email akun pengirim" />
                  <EnvRow name="SMTP_PASS" desc="Password / App Password akun email" />
                  <EnvRow name="SMTP_FROM" desc="Nama dan email pengirim yang tampil di inbox" value="Vinstour Travel <noreply@yourdomain.com>" />
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-amber-500" />
                Pembayaran — Midtrans & Xendit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500 mb-3">
                Kunci ada di <a href="https://dashboard.midtrans.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">Midtrans Dashboard</a> → Settings → Access Keys
              </p>
              <table className="w-full text-sm">
                <tbody>
                  <EnvRow name="MIDTRANS_SERVER_KEY" desc="Server Key Midtrans (dimulai SB-Mid-server- untuk sandbox)" />
                  <EnvRow name="MIDTRANS_CLIENT_KEY" desc="Client Key Midtrans (dimulai SB-Mid-client- untuk sandbox)" />
                  <EnvRow name="MIDTRANS_ENV" desc="'sandbox' untuk testing, 'production' untuk live" value="sandbox" />
                  <Separator className="my-2" />
                  <EnvRow name="XENDIT_SECRET_KEY" desc="Secret Key Xendit dari dashboard.xendit.co (opsional)" />
                  <EnvRow name="XENDIT_CALLBACK_TOKEN" desc="Callback verification token Xendit (opsional)" />
                  <EnvRow name="XENDIT_ENV" desc="'development' atau 'production'" value="development" />
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Push Notifications */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bell className="h-4 w-4 text-purple-500" />
                Push Notifications — VAPID Keys
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Generate VAPID keys sekali saja — simpan hasilnya karena tidak bisa di-generate ulang dengan nilai yang sama.
              </p>
              <CodeBlock
                code="npx web-push generate-vapid-keys"
                label="Generate VAPID Keys (jalankan di terminal lokal)"
              />
              <table className="w-full text-sm mt-3">
                <tbody>
                  <EnvRow name="VAPID_PUBLIC_KEY" desc="Public key dari output perintah di atas" />
                  <EnvRow name="VAPID_PRIVATE_KEY" desc="Private key dari output perintah di atas (RAHASIA)" />
                  <EnvRow name="VAPID_EMAIL" desc="Email kontak untuk VAPID" value="mailto:admin@yourdomain.com" />
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* AI */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="h-4 w-4 text-teal-500" />
                AI / Chatbot (Opsional)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <tbody>
                  <EnvRow name="GEMINI_API_KEY" desc="API key Google Gemini dari https://aistudio.google.com/app/apikey" />
                  <EnvRow name="OPENAI_API_KEY" desc="API key OpenAI (opsional fallback)" />
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* App Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-gray-500" />
                Info Aplikasi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <tbody>
                  <EnvRow name="APP_NAME" desc="Nama travel agent yang tampil di email & notifikasi" value="Vinstour Travel" />
                  <EnvRow name="APP_URL" desc="URL public Railway API server itu sendiri" value="https://your-railway-app.up.railway.app" />
                  <EnvRow name="LOG_LEVEL" desc="Level log server (error/warn/info/debug)" value="info" />
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 3: Vercel Config ── */}
        <TabsContent value="vercel" className="space-y-4 mt-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Setelah Railway API server berjalan, Anda perlu menambahkan <strong>1 env var</strong> di Vercel agar frontend tahu di mana API server berada.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Tambahkan di Vercel → Project → Settings → Environment Variables</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <table className="w-full text-sm border rounded-lg overflow-hidden">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Nama</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Nilai</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">VITE_SUPABASE_URL</code>
                        <CopyButton text="VITE_SUPABASE_URL" />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">URL project Supabase Anda</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">VITE_SUPABASE_PUBLISHABLE_KEY</code>
                        <CopyButton text="VITE_SUPABASE_PUBLISHABLE_KEY" />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">Anon/public key Supabase</td>
                  </tr>
                  <tr className="border-t bg-purple-50 dark:bg-purple-900/10">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-purple-100 dark:bg-purple-900/30 px-1.5 py-0.5 rounded text-purple-700">VITE_API_URL</code>
                        <CopyButton text="VITE_API_URL" />
                        <Badge className="bg-purple-100 text-purple-700 text-[10px] px-1">BARU</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <code className="text-purple-600">https://your-railway-app.up.railway.app</code>
                      <p className="text-gray-500 mt-0.5">URL Railway API server (tanpa trailing slash)</p>
                    </td>
                  </tr>
                </tbody>
              </table>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Setelah menambahkan env var di Vercel, Anda harus <strong>Redeploy</strong> (Deployments → klik 3 titik → Redeploy) agar perubahan efektif. Vercel tidak otomatis redeploy saat env var diubah.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Vercel webhook untuk Midtrans & Xendit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p>Setelah Railway berjalan, daftarkan URL webhook payment gateway ke Railway (bukan ke Vercel):</p>
              <table className="w-full text-xs border rounded-lg overflow-hidden mt-2">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Gateway</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">URL Webhook</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Di mana isi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-medium">Midtrans</td>
                    <td className="px-3 py-2"><code className="text-purple-600">https://your-railway.up.railway.app/api/midtrans/webhook</code></td>
                    <td className="px-3 py-2">Midtrans Dashboard → Settings → Payment Notification</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-medium">Xendit</td>
                    <td className="px-3 py-2"><code className="text-purple-600">https://your-railway.up.railway.app/api/xendit/webhook</code></td>
                    <td className="px-3 py-2">Xendit Dashboard → Settings → Callbacks</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Ringkasan Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {[
                  'Push repository ke GitHub',
                  'Jalankan SQL migrations di Supabase SQL Editor',
                  'Buat Railway project → Deploy from GitHub',
                  'Set Build Command & Start Command di Railway',
                  'Isi semua Environment Variables di Railway (minimal: DATABASE_URL, APP_JWT_SECRET, NODE_ENV, FRONTEND_URL)',
                  'Generate Railway public domain (Settings → Networking)',
                  'Tambahkan VITE_SUPABASE_URL & VITE_SUPABASE_PUBLISHABLE_KEY di Vercel',
                  'Tambahkan VITE_API_URL = Railway URL di Vercel',
                  'Redeploy Vercel',
                  'Test health check: Railway-URL/api/healthz',
                  'Daftarkan webhook Midtrans & Xendit ke Railway URL',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs flex items-center justify-center font-medium mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="flex gap-3 flex-wrap">
        <Button variant="outline" size="sm" asChild>
          <a href="https://railway.app" target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4 mr-1.5" /> Buka Railway
          </a>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4 mr-1.5" /> Buka Supabase
          </a>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4 mr-1.5" /> Buka Vercel
          </a>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href="https://fonnte.com" target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4 mr-1.5" /> Fonnte (WhatsApp)
          </a>
        </Button>
      </div>
    </div>
  );
}
