import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { WebsiteSettings } from '@/hooks/useWebsiteSettings';
import {
  Menu, X, User, ChevronDown, LogOut, LayoutDashboard, Wallet, Calendar,
  Moon, Sun, BookOpen, Compass, Cloud, Target, Beaker, ShoppingBag,
  Package, Calculator, DollarSign, PiggyBank, Search, Star,
  Heart, FileText, BookMarked, GraduationCap, MapPin, Scroll, Clock, Users,
  ChevronRight, Shield, Phone, HelpCircle,
} from 'lucide-react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { usePWAConfig } from '@/hooks/usePWAConfig';
import { cn } from '@/lib/utils';

interface NavLink {
  href: string;
  label: string;
}

const defaultNavLinks: NavLink[] = [
  { href: '/departures', label: 'Jadwal' },
  { href: '/blog', label: 'Artikel' },
  { href: '/about', label: 'Tentang' },
  { href: '/contact', label: 'Kontak' },
];

const LAYANAN_NAV = [
  { href: '/packages', label: 'Paket Umroh', icon: Package, desc: 'Lihat semua paket perjalanan', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { href: '/departures', label: 'Jadwal Keberangkatan', icon: Calendar, desc: 'Tanggal & kuota tersedia', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  { href: '/kalkulator', label: 'Kalkulator Biaya', icon: Calculator, desc: 'Estimasi biaya umroh', color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30' },
  { href: '/kurs', label: 'Kurs SAR', icon: DollarSign, desc: 'Nilai tukar real-time', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  { href: '/savings', label: 'Tabungan Umroh', icon: PiggyBank, desc: 'Cicil biaya perjalanan', color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-950/30' },
  { href: '/cek-booking', label: 'Cek Booking', icon: Search, desc: 'Status pemesanan Anda', color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-950/30' },
  { href: '/testimonials', label: 'Testimoni', icon: Star, desc: 'Ulasan alumni jamaah', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30' },
  { href: '/store', label: 'Toko Umroh', icon: ShoppingBag, desc: 'Perlengkapan ibadah', color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/30' },
];

const JAMAAH_NAV = [
  { href: '/jamaah', label: 'Portal Jamaah', icon: Heart, desc: 'Dashboard perjalanan saya', color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/30' },
  { href: '/jamaah/documents', label: 'Dokumen', icon: FileText, desc: 'Surat & berkas perjalanan', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
  { href: '/jamaah/panduan-ibadah', label: 'Panduan Ibadah', icon: BookMarked, desc: 'Tata cara & doa lengkap', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { href: '/jamaah/manasik', label: 'Manasik Digital', icon: GraduationCap, desc: 'Materi & kuis persiapan', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  { href: '/jamaah/peta-lokasi', label: 'Peta Lokasi', icon: MapPin, desc: 'Tempat suci & hotel', color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-950/30' },
  { href: '/jamaah/doa-panduan', label: 'Panduan Doa', icon: Scroll, desc: 'Doa & dzikir lengkap', color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30' },
  { href: '/jamaah/waktu-sholat', label: 'Waktu Sholat', icon: Clock, desc: 'Jadwal sholat & kiblat', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  { href: '/jamaah/rombongan', label: 'Rombongan', icon: Users, desc: 'Anggota grup saya', color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-950/30' },
];

const ISLAMI_NAV = [
  { href: '/sholat', label: 'Jadwal Sholat', icon: Moon, desc: 'Waktu sholat & hitung mundur', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
  { href: '/alquran', label: 'Al-Quran', icon: BookOpen, desc: 'Baca & dengar murottal', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { href: '/kiblat', label: 'Arah Kiblat', icon: Compass, desc: 'Kompas Ka\'bah GPS', color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-950/30' },
  { href: '/cuaca', label: 'Cuaca Mekah', icon: Cloud, desc: 'Prakiraan 7 hari Tanah Suci', color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-950/30' },
  { href: '/tracker-ibadah', label: 'Tracker Ibadah', icon: Target, desc: 'Pantau amalan harian', color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30' },
  { href: '/kalkulator-islami', label: 'Kalkulator Islami', icon: Beaker, desc: 'Zakat, fidyah, cicilan', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  { href: '/tasbih', label: 'Tasbih Digital', icon: Moon, desc: 'Dzikir & hitung tasbih', color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/30' },
];

export type HeaderDisplayMode = 'logo_only' | 'logo_name_tagline' | 'name_tagline_only';

interface CustomSectionsData {
  headerDisplayMode?: HeaderDisplayMode;
}

interface DynamicNavbarProps {
  tenantSettings?: WebsiteSettings | null;
}

interface MegaDropdownProps {
  label: string;
  icon?: React.ElementType;
  items: { href: string; label: string; icon: React.ElementType; desc: string; color: string; bg: string }[];
  isRoyal: boolean;
  onClose: () => void;
  loginRequired?: boolean;
}

function MegaDropdown({ label, icon: TriggerIcon, items, isRoyal, onClose, loginRequired }: MegaDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150',
          isRoyal
            ? 'text-gray-300 hover:text-amber-400 hover:bg-white/5'
            : 'text-foreground/70 hover:text-foreground hover:bg-accent',
          open && (isRoyal ? 'text-amber-400 bg-white/5' : 'text-foreground bg-accent'),
        )}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {TriggerIcon && <TriggerIcon className="h-3.5 w-3.5 opacity-70" />}
        <span>{label}</span>
        <ChevronDown className={cn('h-3 w-3 opacity-60 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className={cn(
          'absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[480px] rounded-2xl border shadow-xl z-50 overflow-hidden',
          isRoyal ? 'bg-[#111] border-amber-500/20 shadow-black/60' : 'bg-popover border-border shadow-lg',
        )}>
          {loginRequired && (
            <div className={cn(
              'px-4 py-2.5 border-b flex items-center justify-between gap-3',
              isRoyal ? 'bg-amber-500/10 border-amber-500/20' : 'bg-primary/5 border-primary/10',
            )}>
              <p className={cn('text-xs', isRoyal ? 'text-amber-300' : 'text-primary/80')}>
                Login untuk akses penuh semua fitur jamaah
              </p>
              <Link
                to="/auth/login"
                onClick={() => { setOpen(false); onClose(); }}
                className={cn(
                  'flex-shrink-0 px-3 py-1 rounded-lg text-xs font-bold',
                  isRoyal ? 'bg-amber-500 text-black' : 'bg-primary text-primary-foreground',
                )}
              >
                Masuk
              </Link>
            </div>
          )}
          <div className="p-3 grid grid-cols-2 gap-1">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => { setOpen(false); onClose(); }}
                  className={cn(
                    'flex items-center gap-3 p-2.5 rounded-xl transition-all duration-150',
                    isRoyal ? 'hover:bg-white/5' : 'hover:bg-accent',
                  )}
                >
                  <div className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    isRoyal ? 'bg-white/8' : item.bg,
                  )}>
                    <Icon className={cn('h-4 w-4', item.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className={cn('text-xs font-semibold leading-tight truncate', isRoyal ? 'text-gray-200' : 'text-foreground')}>{item.label}</p>
                    <p className={cn('text-[10px] leading-tight mt-0.5 truncate', isRoyal ? 'text-gray-500' : 'text-muted-foreground')}>{item.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function DynamicNavbar({ tenantSettings }: DynamicNavbarProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const { user, profile, isAdmin, signOut } = useAuth();
  const { data: mainSettings } = useWebsiteSettings();
  const { activeHeaderLinks } = usePWAConfig();
  const { isDark, toggle: toggleDark } = useDarkMode();
  const settings = tenantSettings || mainSettings;
  const navigate = useNavigate();
  const isRoyal = settings?.template === 'royal';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getDashboardLink = () => {
    if (isAdmin()) return '/admin';
    return '/my-bookings';
  };

  const companyName = settings?.company_name || 'UmrohTravel';
  const tagline = settings?.tagline || 'Perjalanan Suci Anda';
  const logoUrl = settings?.logo_url;
  // Use PWA-configurable header links (falls back to defaultNavLinks via usePWAConfig)
  const navLinks: NavLink[] = activeHeaderLinks.length > 0
    ? activeHeaderLinks.map((l) => ({ href: l.href, label: l.label }))
    : defaultNavLinks;
  const customSections = settings?.custom_sections as unknown as CustomSectionsData | null;
  const headerMode: HeaderDisplayMode = customSections?.headerDisplayMode || 'logo_name_tagline';

  const renderLogo = () => {
    const logoImg = logoUrl ? (
      <img src={logoUrl} alt={companyName} className="h-9 w-auto object-contain" />
    ) : (
      <div className={cn(
        'flex h-9 w-9 items-center justify-center rounded-xl font-bold text-lg shadow-sm',
        isRoyal ? 'bg-amber-500 text-black' : 'bg-primary text-primary-foreground',
      )}>
        {companyName.charAt(0)}
      </div>
    );

    const nameBlock = (
      <div className="hidden sm:block leading-none">
        <p className={cn('text-sm font-bold leading-tight', isRoyal ? 'text-white' : 'text-foreground')}>{companyName}</p>
        <p className={cn('text-[10px] leading-tight mt-0.5', isRoyal ? 'text-amber-400/70' : 'text-muted-foreground')}>{tagline}</p>
      </div>
    );

    switch (headerMode) {
      case 'logo_only':
        return <Link to="/" className="flex items-center gap-2.5">{logoImg}</Link>;
      case 'name_tagline_only':
        return <Link to="/" className="flex items-center gap-2.5">{nameBlock}</Link>;
      default:
        return <Link to="/" className="flex items-center gap-2.5">{logoImg}{nameBlock}</Link>;
    }
  };

  const toggleMobile = (section: string) => {
    setMobileSection(prev => prev === section ? null : section);
  };

  return (
    <nav className={cn(
      'sticky top-0 z-50 border-b transition-all duration-300',
      isRoyal
        ? 'bg-[#0a0a0a]/90 backdrop-blur-xl border-amber-500/15'
        : 'bg-background/95 backdrop-blur-md border-border/60 supports-[backdrop-filter]:bg-background/80',
    )}>
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between gap-4">

          {/* Logo */}
          {renderLogo()}

          {/* Desktop center nav */}
          <div className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
            <MegaDropdown
              label="Layanan"
              items={LAYANAN_NAV}
              isRoyal={isRoyal}
              onClose={() => setIsOpen(false)}
            />
            <MegaDropdown
              label="Portal Jamaah"
              icon={Heart}
              items={JAMAAH_NAV}
              isRoyal={isRoyal}
              onClose={() => setIsOpen(false)}
              loginRequired={!user}
            />
            <MegaDropdown
              label="Islami"
              icon={Moon}
              items={ISLAMI_NAV}
              isRoyal={isRoyal}
              onClose={() => setIsOpen(false)}
            />
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150',
                  isRoyal
                    ? 'text-gray-300 hover:text-amber-400 hover:bg-white/5'
                    : 'text-foreground/70 hover:text-foreground hover:bg-accent',
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop right side */}
          <div className="hidden lg:flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDark}
              aria-label={isDark ? 'Mode terang' : 'Mode gelap'}
              className={cn(
                'h-9 w-9 rounded-lg',
                isRoyal ? 'text-gray-400 hover:text-amber-400 hover:bg-white/5' : '',
              )}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      'flex items-center gap-2 h-9 px-2.5 rounded-lg',
                      isRoyal ? 'text-white hover:bg-white/5' : 'hover:bg-accent',
                    )}
                  >
                    <div className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                      isRoyal ? 'bg-amber-500 text-black' : 'bg-primary text-primary-foreground',
                    )}>
                      {(profile?.full_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="max-w-[90px] truncate text-sm">{profile?.full_name || 'User'}</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-lg">
                  <div className="px-3 py-2 border-b">
                    <p className="text-xs font-semibold truncate">{profile?.full_name || 'User'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link to={getDashboardLink()} className="flex items-center gap-2.5 rounded-lg">
                      <LayoutDashboard className="h-4 w-4" />Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-bookings" className="flex items-center gap-2.5 rounded-lg">
                      <Calendar className="h-4 w-4" />Booking Saya
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/customer/my-savings" className="flex items-center gap-2.5 rounded-lg">
                      <Wallet className="h-4 w-4" />Tabungan Saya
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/store/orders" className="flex items-center gap-2.5 rounded-lg">
                      <ShoppingBag className="h-4 w-4" />Pesanan Toko
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="flex items-center gap-2.5 text-destructive focus:text-destructive rounded-lg"
                  >
                    <LogOut className="h-4 w-4" />Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className={cn('h-9 rounded-lg text-sm', isRoyal ? 'text-gray-300 hover:text-white hover:bg-white/5' : '')}
                >
                  <Link to="/login">Masuk</Link>
                </Button>
                <Button
                  size="sm"
                  asChild
                  className={cn('h-9 rounded-lg text-sm font-semibold', isRoyal ? 'bg-amber-500 hover:bg-amber-400 text-black' : '')}
                >
                  <Link to="/register">Daftar</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn('lg:hidden h-9 w-9 rounded-lg', isRoyal ? 'text-white hover:bg-white/10' : '')}
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? 'Tutup menu' : 'Buka menu'}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation drawer */}
      {isOpen && (
        <div className={cn(
          'border-t lg:hidden',
          isRoyal ? 'border-amber-500/15 bg-[#0d0d0d]' : 'border-border bg-background',
        )}>
          <div className="container mx-auto px-4 py-3 flex flex-col gap-0.5">

            {/* Mobile user info */}
            {user && (
              <div className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-xl mb-1',
                isRoyal ? 'bg-white/5' : 'bg-accent/50',
              )}>
                <div className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full font-bold text-sm flex-shrink-0',
                  isRoyal ? 'bg-amber-500 text-black' : 'bg-primary text-primary-foreground',
                )}>
                  {(profile?.full_name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className={cn('text-sm font-semibold truncate', isRoyal ? 'text-white' : 'text-foreground')}>{profile?.full_name || 'User'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
            )}

            {/* Accordion sections */}
            {[
              { key: 'layanan', label: 'Layanan Utama', icon: Package, color: 'text-emerald-500', items: LAYANAN_NAV },
              { key: 'jamaah', label: 'Portal Jamaah', icon: Heart, color: 'text-rose-500', items: JAMAAH_NAV },
              { key: 'islami', label: 'Fitur Islami', icon: Moon, color: 'text-indigo-500', items: ISLAMI_NAV },
            ].map(({ key, label, icon: Icon, color, items }) => (
              <div key={key}>
                <button
                  onClick={() => toggleMobile(key)}
                  className={cn(
                    'flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                    isRoyal ? 'text-gray-200 hover:bg-white/5' : 'text-foreground hover:bg-accent',
                    mobileSection === key && (isRoyal ? 'bg-white/5' : 'bg-accent'),
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className={cn('h-4 w-4', color)} />{label}
                  </span>
                  <ChevronDown className={cn('h-4 w-4 opacity-50 transition-transform', mobileSection === key && 'rotate-180')} />
                </button>
                {mobileSection === key && (
                  <div className={cn(
                    'ml-3 mt-0.5 mb-1 pl-3 border-l-2 grid grid-cols-1 gap-0.5',
                    isRoyal ? 'border-amber-500/20' : 'border-border',
                  )}>
                    {items.map(item => (
                      <Link
                        key={item.href}
                        to={key === 'jamaah' && !user ? '/auth/login' : item.href}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors',
                          isRoyal ? 'text-gray-400 hover:text-amber-400 hover:bg-white/5' : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                        )}
                      >
                        <item.icon className={cn('h-3.5 w-3.5 flex-shrink-0', item.color)} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Extra nav links */}
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isRoyal ? 'text-gray-400 hover:bg-white/5 hover:text-amber-400' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            ))}

            <div className={cn('my-1 border-t', isRoyal ? 'border-white/10' : 'border-border')} />

            {/* Dark mode */}
            <button
              onClick={toggleDark}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isRoyal ? 'text-gray-400 hover:bg-white/5 hover:text-amber-400' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {isDark ? 'Mode Terang' : 'Mode Gelap'}
            </button>

            {/* Auth actions */}
            {user ? (
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Link
                  to={getDashboardLink()}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    isRoyal ? 'bg-white/8 text-gray-200 hover:bg-white/12' : 'bg-accent text-foreground hover:bg-accent/80',
                  )}
                >
                  <LayoutDashboard className="h-4 w-4" />Dashboard
                </Link>
                <Link
                  to="/store/orders"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    isRoyal ? 'bg-white/8 text-gray-200 hover:bg-white/12' : 'bg-accent text-foreground hover:bg-accent/80',
                  )}
                >
                  <ShoppingBag className="h-4 w-4" />Pesanan Toko
                </Link>
                <button
                  onClick={() => { handleSignOut(); setIsOpen(false); }}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive bg-destructive/10 hover:bg-destructive/15 transition-colors col-span-2"
                >
                  <LogOut className="h-4 w-4" />Keluar
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center justify-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors border',
                    isRoyal ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10' : 'border-border text-foreground hover:bg-accent',
                  )}
                >
                  Masuk
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center justify-center px-3 py-2.5 rounded-xl text-sm font-bold transition-colors',
                    isRoyal ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-primary text-primary-foreground hover:bg-primary/90',
                  )}
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
