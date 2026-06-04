import { Link } from 'react-router-dom';
import { useTheme } from '@/lib/themes/useTheme';
import {
  Package, Calculator, DollarSign, Calendar, PiggyBank,
  BookOpen, Phone, Star, MapPin, Heart, FileText, Search,
  Plane, Clock, BookMarked, Users, Scroll, GraduationCap,
  ChevronRight, Shield, HelpCircle, Moon, Compass, Cloud,
  Target, ShoppingBag, Beaker, LogIn
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
  iconBg: string;
  auth?: boolean;
}

const PUBLIC_MENU: QuickMenuItem[] = [
  { id: 'paket',    label: 'Paket Umroh', sublabel: 'Semua paket',     icon: Package,    to: '/packages',    color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40',  iconBg: 'bg-emerald-100 dark:bg-emerald-900/60' },
  { id: 'jadwal',   label: 'Jadwal',      sublabel: 'Keberangkatan',    icon: Calendar,   to: '/departures',  color: 'text-blue-700 dark:text-blue-400',       bg: 'bg-blue-50 dark:bg-blue-950/40',        iconBg: 'bg-blue-100 dark:bg-blue-900/60' },
  { id: 'kalkulator',label:'Kalkulator',  sublabel: 'Estimasi biaya',   icon: Calculator, to: '/kalkulator',  color: 'text-violet-700 dark:text-violet-400',   bg: 'bg-violet-50 dark:bg-violet-950/40',    iconBg: 'bg-violet-100 dark:bg-violet-900/60' },
  { id: 'kurs',     label: 'Kurs SAR',    sublabel: 'Nilai tukar',      icon: DollarSign, to: '/kurs',        color: 'text-amber-700 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-950/40',      iconBg: 'bg-amber-100 dark:bg-amber-900/60' },
  { id: 'tabungan', label: 'Tabungan',    sublabel: 'Cicil biaya',      icon: PiggyBank,  to: '/savings',     color: 'text-pink-700 dark:text-pink-400',       bg: 'bg-pink-50 dark:bg-pink-950/40',        iconBg: 'bg-pink-100 dark:bg-pink-900/60' },
  { id: 'blog',     label: 'Artikel',     sublabel: 'Panduan ibadah',   icon: BookOpen,   to: '/blog',        color: 'text-teal-700 dark:text-teal-400',       bg: 'bg-teal-50 dark:bg-teal-950/40',        iconBg: 'bg-teal-100 dark:bg-teal-900/60' },
  { id: 'cek-booking',label:'Cek Booking',sublabel: 'Status pemesanan', icon: Search,     to: '/cek-booking', color: 'text-sky-700 dark:text-sky-400',         bg: 'bg-sky-50 dark:bg-sky-950/40',          iconBg: 'bg-sky-100 dark:bg-sky-900/60' },
  { id: 'testimoni',label: 'Testimoni',   sublabel: 'Ulasan jamaah',    icon: Star,       to: '/testimonials',color: 'text-orange-700 dark:text-orange-400',   bg: 'bg-orange-50 dark:bg-orange-950/40',    iconBg: 'bg-orange-100 dark:bg-orange-900/60' },
];

const JAMAAH_MENU: QuickMenuItem[] = [
  { id: 'portal',   label: 'Portal Saya',     sublabel: 'Dashboard',       icon: Heart,        to: '/jamaah',                color: 'text-rose-700 dark:text-rose-400',     bg: 'bg-rose-50 dark:bg-rose-950/40',    iconBg: 'bg-rose-100 dark:bg-rose-900/60',   auth: true },
  { id: 'dokumen',  label: 'Dokumen',          sublabel: 'Surat & berkas',  icon: FileText,     to: '/jamaah/documents',      color: 'text-indigo-700 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40',iconBg: 'bg-indigo-100 dark:bg-indigo-900/60',auth:true},
  { id: 'panduan',  label: 'Panduan Ibadah',   sublabel: 'Tata cara & doa', icon: BookMarked,   to: '/jamaah/panduan-ibadah', color: 'text-emerald-700 dark:text-emerald-400',bg:'bg-emerald-50 dark:bg-emerald-950/40',iconBg:'bg-emerald-100 dark:bg-emerald-900/60'},
  { id: 'manasik',  label: 'Manasik Digital',  sublabel: 'Materi persiapan',icon: GraduationCap,to: '/jamaah/manasik',        color: 'text-amber-700 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-950/40',  iconBg: 'bg-amber-100 dark:bg-amber-900/60', auth: true },
  { id: 'peta',     label: 'Peta Lokasi',      sublabel: 'Tempat suci',     icon: MapPin,       to: '/jamaah/peta-lokasi',    color: 'text-cyan-700 dark:text-cyan-400',     bg: 'bg-cyan-50 dark:bg-cyan-950/40',    iconBg: 'bg-cyan-100 dark:bg-cyan-900/60',   auth: true },
  { id: 'doa',      label: 'Panduan Doa',      sublabel: 'Doa & dzikir',    icon: Scroll,       to: '/jamaah/doa-panduan',    color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/40',iconBg: 'bg-violet-100 dark:bg-violet-900/60'},
  { id: 'sholat',   label: 'Waktu Sholat',     sublabel: 'Jadwal & kiblat', icon: Clock,        to: '/jamaah/waktu-sholat',   color: 'text-blue-700 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-950/40',    iconBg: 'bg-blue-100 dark:bg-blue-900/60' },
  { id: 'rombongan',label: 'Rombongan',         sublabel: 'Anggota grup',    icon: Users,        to: '/jamaah/rombongan',      color: 'text-pink-700 dark:text-pink-400',     bg: 'bg-pink-50 dark:bg-pink-950/40',    iconBg: 'bg-pink-100 dark:bg-pink-900/60',   auth: true },
];

const ISLAMI_MENU: QuickMenuItem[] = [
  { id: 'sholat',   label: 'Jadwal Sholat',  sublabel: 'Waktu & kiblat',   icon: Moon,      to: '/sholat',          color: 'text-indigo-700 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40', iconBg: 'bg-indigo-100 dark:bg-indigo-900/60' },
  { id: 'alquran',  label: 'Al-Quran',       sublabel: 'Baca & dengarkan', icon: BookMarked,to: '/alquran',         color: 'text-emerald-700 dark:text-emerald-400',bg:'bg-emerald-50 dark:bg-emerald-950/40',iconBg:'bg-emerald-100 dark:bg-emerald-900/60'},
  { id: 'kiblat',   label: 'Arah Kiblat',    sublabel: 'Kompas Ka\'bah',   icon: Compass,   to: '/kiblat',          color: 'text-teal-700 dark:text-teal-400',     bg: 'bg-teal-50 dark:bg-teal-950/40',    iconBg: 'bg-teal-100 dark:bg-teal-900/60' },
  { id: 'cuaca',    label: 'Cuaca Mekah',    sublabel: 'Prakiraan cuaca',  icon: Cloud,     to: '/cuaca',           color: 'text-sky-700 dark:text-sky-400',       bg: 'bg-sky-50 dark:bg-sky-950/40',      iconBg: 'bg-sky-100 dark:bg-sky-900/60' },
  { id: 'tracker',  label: 'Tracker Ibadah', sublabel: 'Pantau amalan',    icon: Target,    to: '/tracker-ibadah',  color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/40',iconBg: 'bg-violet-100 dark:bg-violet-900/60' },
  { id: 'kalkislami',label:'Kalkulator',     sublabel: 'Zakat, fidyah…',   icon: Beaker,    to: '/kalkulator-islami',color:'text-amber-700 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-950/40',  iconBg: 'bg-amber-100 dark:bg-amber-900/60' },
  { id: 'tasbih',   label: 'Tasbih Digital', sublabel: 'Dzikir & hitung',  icon: Scroll,    to: '/tasbih',          color: 'text-rose-700 dark:text-rose-400',     bg: 'bg-rose-50 dark:bg-rose-950/40',    iconBg: 'bg-rose-100 dark:bg-rose-900/60' },
  { id: 'toko',     label: 'Toko Umroh',     sublabel: 'Perlengkapan',     icon: ShoppingBag,to:'/store',           color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/40',iconBg: 'bg-orange-100 dark:bg-orange-900/60' },
];

const INFO_MENU: QuickMenuItem[] = [
  { id: 'tentang', label: 'Tentang Kami',  sublabel: 'Profil perusahaan', icon: Shield,    to: '/about',   color: 'text-slate-700 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-900/40', iconBg: 'bg-slate-100 dark:bg-slate-800/60' },
  { id: 'kontak',  label: 'Hubungi Kami',  sublabel: 'CS & WhatsApp',    icon: Phone,     to: '/contact', color: 'text-green-700 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/40', iconBg: 'bg-green-100 dark:bg-green-900/60' },
  { id: 'faq',     label: 'FAQ',           sublabel: 'Pertanyaan umum',  icon: HelpCircle,to: '/faq',     color: 'text-orange-700 dark:text-orange-400',bg:'bg-orange-50 dark:bg-orange-950/40',iconBg:'bg-orange-100 dark:bg-orange-900/60' },
  { id: 'penerbangan',label:'Maskapai',    sublabel: 'Info penerbangan',  icon: Plane,     to: '/packages?type=umroh', color:'text-sky-700 dark:text-sky-400', bg:'bg-sky-50 dark:bg-sky-950/40', iconBg:'bg-sky-100 dark:bg-sky-900/60' },
];

function MenuCard({ item, isRoyal }: { item: QuickMenuItem; isRoyal: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={cn(
        'group flex flex-col items-center gap-2.5 p-3 rounded-2xl transition-all duration-200',
        'hover:scale-[1.05] hover:shadow-lg active:scale-[0.96]',
        'border border-transparent hover:border-white/60',
        isRoyal
          ? 'bg-white/5 hover:bg-white/10'
          : cn(item.bg, 'hover:shadow-md')
      )}
    >
      <div
        className={cn(
          'relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200',
          'group-hover:scale-110 group-hover:shadow-md',
          isRoyal ? 'bg-white/10' : item.iconBg
        )}
      >
        <Icon className={cn('h-5 w-5 transition-colors', isRoyal ? 'text-amber-400' : item.color)} />
      </div>
      <div className="text-center min-w-0 w-full">
        <p className={cn(
          'text-[11px] font-semibold leading-tight',
          isRoyal ? 'text-white/90' : item.color
        )}>
          {item.label}
        </p>
        {item.sublabel && (
          <p className={cn(
            'text-[9px] leading-tight mt-0.5 truncate',
            isRoyal ? 'text-white/40' : 'text-muted-foreground'
          )}>
            {item.sublabel}
          </p>
        )}
      </div>
    </Link>
  );
}

function SectionHeader({
  title,
  subtitle,
  linkTo,
  linkLabel,
  isRoyal,
}: {
  title: string;
  subtitle?: string;
  linkTo?: string;
  linkLabel?: string;
  isRoyal: boolean;
}) {
  return (
    <div className="flex items-start justify-between mb-3">
      <div>
        <h2 className={cn(
          'text-sm font-bold tracking-tight',
          isRoyal ? 'text-white' : 'text-foreground'
        )}>
          {title}
        </h2>
        {subtitle && (
          <p className={cn('text-[11px] mt-0.5', isRoyal ? 'text-white/40' : 'text-muted-foreground')}>
            {subtitle}
          </p>
        )}
      </div>
      {linkTo && linkLabel && (
        <Link
          to={linkTo}
          className={cn(
            'flex items-center gap-0.5 text-[11px] font-semibold transition-colors shrink-0 mt-0.5',
            isRoyal ? 'text-amber-400 hover:text-amber-300' : 'text-primary hover:text-primary/80'
          )}
        >
          {linkLabel}
          <ChevronRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

interface QuickMenuGridProps {
  settings?: { template?: string };
}

export function QuickMenuGrid({ settings }: QuickMenuGridProps) {
  const { user } = useAuth();
  const { isDark } = useTheme(settings);
  const isRoyal = isDark;

  return (
    <section className={cn('py-6 md:py-10', isRoyal ? 'bg-[#0a0a0a]' : 'bg-background')}>
      <div className="container mx-auto px-4 space-y-6 md:space-y-8">

        {/* ── Layanan Utama ── */}
        <div>
          <SectionHeader
            title="Layanan Utama"
            subtitle="Paket, jadwal & informasi perjalanan"
            linkTo="/packages"
            linkLabel="Semua"
            isRoyal={isRoyal}
          />
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {PUBLIC_MENU.map((item) => (
              <MenuCard key={item.id} item={item} isRoyal={isRoyal} />
            ))}
          </div>
        </div>

        {/* ── Portal Jamaah ── */}
        <div>
          <SectionHeader
            title="Portal Jamaah"
            subtitle={user ? 'Akses fitur perjalanan ibadah Anda' : 'Login untuk fitur lengkap'}
            linkTo={user ? '/jamaah' : '/jamaah-info'}
            linkLabel={user ? 'Buka Portal' : 'Pelajari'}
            isRoyal={isRoyal}
          />
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {JAMAAH_MENU.map((item) => (
              <MenuCard
                key={item.id}
                item={item.auth && !user ? { ...item, to: '/auth/login' } : item}
                isRoyal={isRoyal}
              />
            ))}
          </div>

          {/* Login CTA banner — only when not logged in */}
          {!user && (
            <div className={cn(
              'mt-3 rounded-2xl border p-4 flex items-center justify-between gap-3',
              isRoyal
                ? 'bg-amber-500/8 border-amber-500/20'
                : 'bg-primary/5 border-primary/15'
            )}>
              <div className="min-w-0">
                <p className={cn('text-sm font-semibold leading-tight', isRoyal ? 'text-amber-400' : 'text-primary')}>
                  Sudah terdaftar sebagai jamaah?
                </p>
                <p className={cn('text-xs mt-0.5', isRoyal ? 'text-white/50' : 'text-muted-foreground')}>
                  Login untuk akses dokumen, panduan & itinerary perjalanan.
                </p>
              </div>
              <Link
                to="/auth/login"
                className={cn(
                  'flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95',
                  isRoyal
                    ? 'bg-amber-500 text-black hover:bg-amber-400'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                <LogIn className="h-3.5 w-3.5" />
                Masuk
              </Link>
            </div>
          )}
        </div>

        {/* ── Fitur Islami ── */}
        <div>
          <SectionHeader
            title="Fitur Islami"
            subtitle="Jadwal sholat, Al-Quran, kiblat & lebih"
            linkTo="/sholat"
            linkLabel="Jelajahi"
            isRoyal={isRoyal}
          />
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {ISLAMI_MENU.map((item) => (
              <MenuCard key={item.id} item={item} isRoyal={isRoyal} />
            ))}
          </div>
        </div>

        {/* ── Informasi ── */}
        <div>
          <SectionHeader
            title="Informasi"
            subtitle="Hubungi kami & pelajari lebih lanjut"
            isRoyal={isRoyal}
          />
          <div className="grid grid-cols-4 gap-2 max-w-xs md:max-w-none">
            {INFO_MENU.map((item) => (
              <MenuCard key={item.id} item={item} isRoyal={isRoyal} />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
