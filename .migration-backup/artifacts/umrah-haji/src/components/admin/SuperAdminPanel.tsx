/**
 * SuperAdminPanel — quick-access panel shown only to super_admin on the dashboard.
 *
 * Features:
 * - System health pill (Supabase connected vs. placeholder mode)
 * - 6 key stat tiles that use live data when Supabase is configured,
 *   falling back gracefully to "—" with a setup hint
 * - Full shortcut grid to every major admin section, grouped by category
 * - Collapsible so it doesn't dominate the page
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Shield, ChevronDown, ChevronUp,
  Wifi, WifiOff,
  Users, BookOpen, CreditCard, CalendarDays, Package, UserCog,
  UserPlus, BarChart3, Network, Backpack, Award,
  FileSearch, FileCog, FileText, Hotel, Plane, Building, Store,
  MessageSquare, Megaphone, Globe, Share2,
  ShieldAlert, KeyRound, Settings, Palette, ScanSearch, LayoutGrid,
  TrendingUp, PiggyBank, Wallet, Coins,
  MapPin, ListOrdered,
  ArrowRight,
} from 'lucide-react';

// ─── Shortcut sections ───────────────────────────────────────────────────────

interface Shortcut {
  label: string;
  path: string;
  icon: React.ElementType;
  color: string; // Tailwind bg + text classes for the icon chip
}

const SHORTCUT_SECTIONS: { title: string; shortcuts: Shortcut[] }[] = [
  {
    title: 'Penjualan',
    shortcuts: [
      { label: 'Leads',        path: '/admin/leads',         icon: UserPlus,    color: 'bg-sky-100 text-sky-600' },
      { label: 'Booking',      path: '/admin/bookings',      icon: BookOpen,    color: 'bg-blue-100 text-blue-600' },
      { label: 'Paket',        path: '/admin/packages',      icon: Package,     color: 'bg-amber-100 text-amber-600' },
      { label: 'Kupon',        path: '/admin/coupons',       icon: Award,       color: 'bg-pink-100 text-pink-600' },
      { label: 'Landing Page', path: '/admin/landing-pages', icon: Globe,       color: 'bg-indigo-100 text-indigo-600' },
    ],
  },
  {
    title: 'Keberangkatan',
    shortcuts: [
      { label: 'Keberangkatan', path: '/admin/departures',          icon: CalendarDays, color: 'bg-emerald-100 text-emerald-600' },
      { label: 'Kamar',         path: '/admin/room-assignments',    icon: Building,     color: 'bg-teal-100 text-teal-600' },
      { label: 'Perlengkapan',  path: '/admin/equipment',           icon: Backpack,     color: 'bg-orange-100 text-orange-600' },
      { label: 'Haji',          path: '/admin/haji',                icon: MapPin,       color: 'bg-green-100 text-green-600' },
      { label: 'Manasik',       path: '/admin/manasik',             icon: BookOpen,     color: 'bg-lime-100 text-lime-600' },
      { label: 'Itinerary',     path: '/admin/itinerary-templates', icon: ListOrdered,  color: 'bg-cyan-100 text-cyan-600' },
    ],
  },
  {
    title: 'Keuangan',
    shortcuts: [
      { label: 'Pembayaran',      path: '/admin/payments',          icon: CreditCard, color: 'bg-violet-100 text-violet-600' },
      { label: 'Kas & Bank',      path: '/admin/finance-cash',      icon: Coins,      color: 'bg-yellow-100 text-yellow-600' },
      { label: 'P&L',             path: '/admin/finance',           icon: TrendingUp, color: 'bg-rose-100 text-rose-600' },
      { label: 'Tabungan',        path: '/admin/savings',           icon: PiggyBank,  color: 'bg-pink-100 text-pink-600' },
      { label: 'Laporan',         path: '/admin/reports',           icon: BarChart3,  color: 'bg-blue-100 text-blue-600' },
      { label: 'Lap. Lanjutan',   path: '/admin/advanced-reports',  icon: TrendingUp, color: 'bg-sky-100 text-sky-600' },
    ],
  },
  {
    title: 'Jamaah & Agen',
    shortcuts: [
      { label: 'Jamaah',   path: '/admin/customers', icon: Users,     color: 'bg-emerald-100 text-emerald-600' },
      { label: 'Agen',     path: '/admin/agents',    icon: UserCog,   color: 'bg-teal-100 text-teal-600' },
      { label: 'Cabang',   path: '/admin/branches',  icon: Network,   color: 'bg-blue-100 text-blue-600' },
      { label: 'Loyalitas',path: '/admin/loyalty',   icon: Award,     color: 'bg-amber-100 text-amber-600' },
      { label: 'Referral', path: '/admin/referrals', icon: Share2,    color: 'bg-orange-100 text-orange-600' },
      { label: 'Visa',     path: '/admin/visa',      icon: FileText,  color: 'bg-indigo-100 text-indigo-600' },
    ],
  },
  {
    title: 'SDM & Marketing',
    shortcuts: [
      { label: 'SDM / HR',   path: '/admin/hr',                  icon: UserCog,   color: 'bg-stone-100 text-stone-600' },
      { label: 'Penggajian', path: '/admin/hr/payroll',          icon: Wallet,    color: 'bg-green-100 text-green-600' },
      { label: 'Marketing',  path: '/admin/marketing-materials', icon: Megaphone, color: 'bg-pink-100 text-pink-600' },
      { label: 'WhatsApp',   path: '/admin/whatsapp',            icon: MessageSquare, color: 'bg-emerald-100 text-emerald-600' },
    ],
  },
  {
    title: 'Dokumen & Master Data',
    shortcuts: [
      { label: 'Verifikasi',   path: '/admin/document-verification', icon: FileSearch, color: 'bg-blue-100 text-blue-600' },
      { label: 'Jenis Dok.',   path: '/admin/document-types',        icon: FileCog,    color: 'bg-sky-100 text-sky-600' },
      { label: 'Generator',    path: '/admin/documents-generator',   icon: FileText,   color: 'bg-violet-100 text-violet-600' },
      { label: 'Hotel',        path: '/admin/hotels',                icon: Hotel,      color: 'bg-amber-100 text-amber-600' },
      { label: 'Maskapai',     path: '/admin/airlines',              icon: Plane,      color: 'bg-blue-100 text-blue-600' },
      { label: 'Bandara',      path: '/admin/airports',              icon: Building,   color: 'bg-teal-100 text-teal-600' },
      { label: 'Vendor',       path: '/admin/vendors',               icon: Store,      color: 'bg-orange-100 text-orange-600' },
    ],
  },
  {
    title: 'Pengaturan Sistem',
    shortcuts: [
      { label: 'User',           path: '/admin/users',           icon: Users,       color: 'bg-purple-100 text-purple-600' },
      { label: 'Role',           path: '/admin/roles',           icon: Shield,      color: 'bg-purple-100 text-purple-600' },
      { label: 'Akses Dasbor',   path: '/admin/dashboard-access',icon: LayoutGrid,  color: 'bg-indigo-100 text-indigo-600' },
      { label: 'RBAC Tools',     path: '/admin/rbac-tools',      icon: ShieldAlert, color: 'bg-red-100 text-red-600' },
      { label: 'Status RBAC',    path: '/admin/rbac-status',     icon: Shield,      color: 'bg-red-100 text-red-600' },
      { label: 'Audit',          path: '/admin/security-audit',  icon: ScanSearch,  color: 'bg-rose-100 text-rose-600' },
      { label: '2FA',            path: '/admin/2fa',             icon: KeyRound,    color: 'bg-yellow-100 text-yellow-600' },
      { label: 'Tampilan',       path: '/admin/appearance',      icon: Palette,     color: 'bg-pink-100 text-pink-600' },
      { label: 'Pengaturan',     path: '/admin/settings',        icon: Settings,    color: 'bg-slate-100 text-slate-600' },
    ],
  },
];

// ─── Stat tile (key metrics) ─────────────────────────────────────────────────

interface StatTileProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  path: string;
  loading?: boolean;
  placeholder?: boolean;
}

function StatTile({ label, value, icon: Icon, color, path, loading, placeholder }: StatTileProps) {
  return (
    <Link to={path} className="block group">
      <div className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-sm transition-all">
        <div className={cn('p-2 rounded-lg flex-shrink-0', color)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          {loading ? (
            <div className="h-5 w-12 bg-muted animate-pulse rounded mb-0.5" />
          ) : (
            <p className={cn(
              'text-lg font-bold leading-tight',
              placeholder ? 'text-muted-foreground/50' : 'text-foreground'
            )}>
              {placeholder ? '—' : value}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground truncate">{label}</p>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary/50 transition-colors flex-shrink-0" />
      </div>
    </Link>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SuperAdminPanelProps {
  stats?: {
    totalJamaah?: number;
    totalBookings?: number;
    pendingPaymentsCount?: number;
    upcomingDeparturesCount?: number;
    totalPackages?: number;
    totalAgents?: number;
  } | null;
  isLoading?: boolean;
  supabaseConnected?: boolean;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SuperAdminPanel({ stats, isLoading, supabaseConnected = false }: SuperAdminPanelProps) {
  const [open, setOpen] = useState(true);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const ph = !supabaseConnected; // show placeholder state

  const statTiles: StatTileProps[] = [
    {
      label: 'Total Jamaah',
      value: stats?.totalJamaah ?? 0,
      icon: Users,
      color: 'bg-emerald-100 text-emerald-600',
      path: '/admin/customers',
      loading: isLoading,
      placeholder: ph,
    },
    {
      label: 'Total Booking',
      value: stats?.totalBookings ?? 0,
      icon: BookOpen,
      color: 'bg-blue-100 text-blue-600',
      path: '/admin/bookings',
      loading: isLoading,
      placeholder: ph,
    },
    {
      label: 'Pembayaran Pending',
      value: stats?.pendingPaymentsCount ?? 0,
      icon: CreditCard,
      color: 'bg-amber-100 text-amber-600',
      path: '/admin/payments',
      loading: isLoading,
      placeholder: ph,
    },
    {
      label: 'Keberangkatan',
      value: stats?.upcomingDeparturesCount ?? 0,
      icon: CalendarDays,
      color: 'bg-violet-100 text-violet-600',
      path: '/admin/departures',
      loading: isLoading,
      placeholder: ph,
    },
    {
      label: 'Paket Aktif',
      value: stats?.totalPackages ?? 0,
      icon: Package,
      color: 'bg-orange-100 text-orange-600',
      path: '/admin/packages',
      loading: isLoading,
      placeholder: ph,
    },
    {
      label: 'Total Agen',
      value: stats?.totalAgents ?? 0,
      icon: UserCog,
      color: 'bg-purple-100 text-purple-600',
      path: '/admin/agents',
      loading: isLoading,
      placeholder: ph,
    },
  ];

  return (
    <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/80 to-white dark:from-purple-950/30 dark:to-background shadow-sm overflow-hidden">

      {/* Panel header */}
      <button
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900">
            <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-purple-800 dark:text-purple-200 leading-tight">
              Panel Super Admin
            </p>
            <p className="text-[11px] text-purple-500 dark:text-purple-400 leading-tight">
              Akses penuh ke semua fitur &amp; modul sistem
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Connection badge */}
          {supabaseConnected ? (
            <Badge className="gap-1 text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
              <Wifi className="w-2.5 h-2.5" />
              Database Terhubung
            </Badge>
          ) : (
            <Badge className="gap-1 text-[10px] bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
              <WifiOff className="w-2.5 h-2.5" />
              Mode Placeholder
            </Badge>
          )}
          {open
            ? <ChevronUp className="w-4 h-4 text-purple-500" />
            : <ChevronDown className="w-4 h-4 text-purple-500" />
          }
        </div>
      </button>

      {/* Collapsible body */}
      <div className={cn(
        'transition-all duration-300 overflow-hidden',
        open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
      )}>
        <div className="px-5 pb-5 space-y-4 border-t border-purple-100 dark:border-purple-800/50 pt-4">

          {/* Setup hint when not connected */}
          {!supabaseConnected && (
            <div className="flex items-start gap-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 p-3 text-sm text-amber-800 dark:text-amber-300">
              <WifiOff className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Supabase belum terhubung.</strong> Tambahkan{' '}
                <code className="font-mono text-xs bg-amber-100 dark:bg-amber-900 px-1 rounded">
                  VITE_SUPABASE_URL
                </code>{' '}
                dan{' '}
                <code className="font-mono text-xs bg-amber-100 dark:bg-amber-900 px-1 rounded">
                  VITE_SUPABASE_PUBLISHABLE_KEY
                </code>{' '}
                di Replit Secrets agar statistik dan data real tampil di sini.
              </p>
            </div>
          )}

          {/* Stat tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {statTiles.map(tile => (
              <StatTile key={tile.label} {...tile} />
            ))}
          </div>

          {/* Quick shortcuts toggle */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-100/60 gap-1.5 px-2"
              onClick={() => setShortcutsOpen(o => !o)}
            >
              {shortcutsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {shortcutsOpen ? 'Sembunyikan Pintasan' : 'Tampilkan Semua Pintasan Menu'}
            </Button>

            {/* Shortcuts grid */}
            <div className={cn(
              'transition-all duration-300 overflow-hidden',
              shortcutsOpen ? 'max-h-[3000px] opacity-100 mt-3' : 'max-h-0 opacity-0'
            )}>
              <div className="space-y-4">
                {SHORTCUT_SECTIONS.map(section => (
                  <div key={section.title}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400 dark:text-purple-500 mb-1.5 px-0.5">
                      {section.title}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5">
                      {section.shortcuts.map(s => {
                        const Icon = s.icon;
                        return (
                          <Link
                            key={s.path}
                            to={s.path}
                            className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border/50 bg-card hover:border-primary/40 hover:shadow-sm transition-all group"
                          >
                            <div className={cn('p-1 rounded-md flex-shrink-0', s.color)}>
                              <Icon className="w-3 h-3" />
                            </div>
                            <span className="text-[11px] font-medium text-foreground/80 group-hover:text-foreground truncate leading-tight">
                              {s.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
