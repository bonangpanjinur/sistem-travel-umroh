import { Link } from 'react-router-dom';
import {
  Package, Calculator, DollarSign, Calendar, PiggyBank,
  BookOpen, Phone, Star, MapPin, Heart, FileText, Search,
  Plane, Clock, BookMarked, Users, Scroll, GraduationCap,
  ChevronRight, Shield, HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface QuickMenuItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ElementType;
  to: string;
  color: string;
  bg: string;
  border: string;
  auth?: boolean;
}

const PUBLIC_MENU: QuickMenuItem[] = [
  {
    id: 'paket',
    label: 'Paket Umroh',
    sublabel: 'Lihat semua paket',
    icon: Package,
    to: '/packages',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
  {
    id: 'jadwal',
    label: 'Jadwal',
    sublabel: 'Keberangkatan',
    icon: Calendar,
    to: '/departures',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
  },
  {
    id: 'kalkulator',
    label: 'Kalkulator',
    sublabel: 'Estimasi biaya',
    icon: Calculator,
    to: '/kalkulator',
    color: 'text-violet-700',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
  },
  {
    id: 'kurs',
    label: 'Kurs SAR',
    sublabel: 'Nilai tukar real‑time',
    icon: DollarSign,
    to: '/kurs',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
  },
  {
    id: 'tabungan',
    label: 'Tabungan',
    sublabel: 'Cicil biaya umroh',
    icon: PiggyBank,
    to: '/savings',
    color: 'text-pink-700',
    bg: 'bg-pink-50',
    border: 'border-pink-100',
  },
  {
    id: 'blog',
    label: 'Artikel',
    sublabel: 'Panduan ibadah',
    icon: BookOpen,
    to: '/blog',
    color: 'text-teal-700',
    bg: 'bg-teal-50',
    border: 'border-teal-100',
  },
  {
    id: 'cek-booking',
    label: 'Cek Booking',
    sublabel: 'Status pemesanan',
    icon: Search,
    to: '/cek-booking',
    color: 'text-sky-700',
    bg: 'bg-sky-50',
    border: 'border-sky-100',
  },
  {
    id: 'testimoni',
    label: 'Testimoni',
    sublabel: 'Ulasan jamaah',
    icon: Star,
    to: '/testimonials',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-100',
  },
];

const JAMAAH_MENU: QuickMenuItem[] = [
  {
    id: 'portal',
    label: 'Portal Saya',
    sublabel: 'Dashboard jamaah',
    icon: Heart,
    to: '/jamaah',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    auth: true,
  },
  {
    id: 'dokumen',
    label: 'Dokumen',
    sublabel: 'Surat & berkas',
    icon: FileText,
    to: '/jamaah/documents',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
    auth: true,
  },
  {
    id: 'panduan',
    label: 'Panduan Ibadah',
    sublabel: 'Tata cara & doa',
    icon: BookMarked,
    to: '/jamaah/panduan-ibadah',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
  {
    id: 'manasik',
    label: 'Manasik Digital',
    sublabel: 'Materi persiapan',
    icon: GraduationCap,
    to: '/jamaah/manasik',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    auth: true,
  },
  {
    id: 'peta',
    label: 'Peta Lokasi',
    sublabel: 'Tempat suci & hotel',
    icon: MapPin,
    to: '/jamaah/peta-lokasi',
    color: 'text-cyan-700',
    bg: 'bg-cyan-50',
    border: 'border-cyan-100',
    auth: true,
  },
  {
    id: 'doa',
    label: 'Panduan Doa',
    sublabel: 'Doa & dzikir lengkap',
    icon: Scroll,
    to: '/jamaah/doa-panduan',
    color: 'text-violet-700',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
  },
  {
    id: 'sholat',
    label: 'Waktu Sholat',
    sublabel: 'Jadwal sholat & kiblat',
    icon: Clock,
    to: '/jamaah/waktu-sholat',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
  },
  {
    id: 'rombongan',
    label: 'Rombongan',
    sublabel: 'Anggota grup saya',
    icon: Users,
    to: '/jamaah/rombongan',
    color: 'text-pink-700',
    bg: 'bg-pink-50',
    border: 'border-pink-100',
    auth: true,
  },
];

const INFO_MENU: QuickMenuItem[] = [
  {
    id: 'tentang',
    label: 'Tentang Kami',
    sublabel: 'Profil perusahaan',
    icon: Shield,
    to: '/about',
    color: 'text-slate-700',
    bg: 'bg-slate-50',
    border: 'border-slate-100',
  },
  {
    id: 'kontak',
    label: 'Hubungi Kami',
    sublabel: 'CS & WhatsApp',
    icon: Phone,
    to: '/contact',
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-100',
  },
  {
    id: 'faq',
    label: 'FAQ',
    sublabel: 'Pertanyaan umum',
    icon: HelpCircle,
    to: '/faq',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-100',
  },
  {
    id: 'penerbangan',
    label: 'Maskapai',
    sublabel: 'Info penerbangan',
    icon: Plane,
    to: '/packages?type=umroh',
    color: 'text-sky-700',
    bg: 'bg-sky-50',
    border: 'border-sky-100',
  },
];

function MenuCard({ item }: { item: QuickMenuItem }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={cn(
        'flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-200',
        'hover:scale-105 hover:shadow-md active:scale-95',
        item.bg,
        item.border,
      )}
    >
      <div className={cn('flex items-center justify-center w-12 h-12 rounded-xl shadow-sm', item.bg)}>
        <Icon className={cn('h-6 w-6', item.color)} />
      </div>
      <div className="text-center min-w-0 w-full">
        <p className={cn('text-xs font-semibold leading-tight truncate', item.color)}>{item.label}</p>
        {item.sublabel && (
          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">{item.sublabel}</p>
        )}
      </div>
    </Link>
  );
}

interface QuickMenuGridProps {
  settings?: { template?: string };
}

export function QuickMenuGrid({ settings }: QuickMenuGridProps) {
  const { user, isCustomer } = useAuth();
  const isRoyal = settings?.template === 'royal';

  return (
    <section className={cn('py-10', isRoyal ? 'bg-[#0a0a0a]' : 'bg-background')}>
      <div className="container mx-auto px-4 space-y-8">

        {/* ── Layanan Utama ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className={cn('text-base font-bold', isRoyal ? 'text-white' : 'text-foreground')}>
                Layanan Utama
              </h2>
              <p className="text-xs text-muted-foreground">Temukan paket & informasi perjalanan</p>
            </div>
            <Link to="/packages" className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
              Semua <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-2 sm:gap-3">
            {PUBLIC_MENU.map((item) => (
              <MenuCard key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* ── Portal Jamaah ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className={cn('text-base font-bold', isRoyal ? 'text-white' : 'text-foreground')}>
                Portal Jamaah
              </h2>
              <p className="text-xs text-muted-foreground">
                {user ? 'Akses fitur perjalanan ibadah Anda' : 'Login untuk fitur lengkap'}
              </p>
            </div>
            <Link to="/jamaah-info" className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
              {user ? 'Buka Portal' : 'Pelajari'} <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-2 sm:gap-3">
            {JAMAAH_MENU.map((item) => (
              <MenuCard
                key={item.id}
                item={item.auth && !user ? { ...item, to: '/auth/login' } : item}
              />
            ))}
          </div>
          {!user && (
            <div className={cn(
              'mt-3 rounded-xl border p-3 flex items-center justify-between gap-3',
              isRoyal ? 'bg-amber-500/10 border-amber-500/30' : 'bg-primary/5 border-primary/20'
            )}>
              <div>
                <p className={cn('text-sm font-semibold', isRoyal ? 'text-amber-400' : 'text-primary')}>
                  Sudah terdaftar sebagai jamaah?
                </p>
                <p className="text-xs text-muted-foreground">Login untuk akses dokumen, panduan, dan fitur lengkap.</p>
              </div>
              <Link
                to="/auth/login"
                className={cn(
                  'flex-shrink-0 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap',
                  isRoyal
                    ? 'bg-amber-500 text-black hover:bg-amber-400'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                Masuk
              </Link>
            </div>
          )}
        </div>

        {/* ── Informasi ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className={cn('text-base font-bold', isRoyal ? 'text-white' : 'text-foreground')}>
                Informasi
              </h2>
              <p className="text-xs text-muted-foreground">Hubungi kami & pelajari lebih lanjut</p>
            </div>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-4 gap-2 sm:gap-3 max-w-sm md:max-w-none">
            {INFO_MENU.map((item) => (
              <MenuCard key={item.id} item={item} />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
