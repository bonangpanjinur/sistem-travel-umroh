import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { WebsiteSettings } from '@/hooks/useWebsiteSettings';
import {
  Menu, X, User, ChevronDown, LogOut, LayoutDashboard, Wallet, Calendar,
  Moon, Sun, BookOpen, Compass, Cloud, Target, Beaker, ShoppingBag,
  Package, Calculator, DollarSign, PiggyBank, Search, Star,
  Heart, FileText, BookMarked, GraduationCap, MapPin, Scroll, Clock, Users,
  ChevronRight, Plane, Shield, Phone, HelpCircle,
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
import { cn } from '@/lib/utils';

interface NavLink {
  href: string;
  label: string;
}

const defaultNavLinks: NavLink[] = [
  { href: '/departures', label: 'Jadwal' },
  { href: '/blog', label: 'Artikel' },
  { href: '/about', label: 'Tentang Kami' },
  { href: '/contact', label: 'Hubungi Kami' },
];

const LAYANAN_NAV = [
  { href: '/packages', label: 'Paket Umroh', icon: Package, desc: 'Lihat semua paket perjalanan', color: 'text-emerald-600' },
  { href: '/departures', label: 'Jadwal Keberangkatan', icon: Calendar, desc: 'Tanggal & kuota tersedia', color: 'text-blue-600' },
  { href: '/kalkulator', label: 'Kalkulator Biaya', icon: Calculator, desc: 'Estimasi biaya umroh', color: 'text-violet-600' },
  { href: '/kurs', label: 'Kurs SAR', icon: DollarSign, desc: 'Nilai tukar real-time', color: 'text-amber-600' },
  { href: '/savings', label: 'Tabungan Umroh', icon: PiggyBank, desc: 'Cicil biaya perjalanan', color: 'text-pink-600' },
  { href: '/cek-booking', label: 'Cek Booking', icon: Search, desc: 'Status pemesanan Anda', color: 'text-sky-600' },
  { href: '/testimonials', label: 'Testimoni', icon: Star, desc: 'Ulasan alumni jamaah', color: 'text-orange-600' },
  { href: '/toko', label: 'Toko Umroh', icon: ShoppingBag, desc: 'Perlengkapan ibadah', color: 'text-rose-600' },
];

const JAMAAH_NAV = [
  { href: '/jamaah', label: 'Portal Jamaah', icon: Heart, desc: 'Dashboard perjalanan saya', color: 'text-rose-600' },
  { href: '/jamaah/documents', label: 'Dokumen', icon: FileText, desc: 'Surat & berkas perjalanan', color: 'text-indigo-600' },
  { href: '/jamaah/panduan-ibadah', label: 'Panduan Ibadah', icon: BookMarked, desc: 'Tata cara & doa lengkap', color: 'text-emerald-600' },
  { href: '/jamaah/manasik', label: 'Manasik Digital', icon: GraduationCap, desc: 'Materi & kuis persiapan', color: 'text-amber-600' },
  { href: '/jamaah/peta-lokasi', label: 'Peta Lokasi', icon: MapPin, desc: 'Tempat suci & hotel', color: 'text-cyan-600' },
  { href: '/jamaah/doa-panduan', label: 'Panduan Doa', icon: Scroll, desc: 'Doa & dzikir lengkap', color: 'text-violet-600' },
  { href: '/jamaah/waktu-sholat', label: 'Waktu Sholat', icon: Clock, desc: 'Jadwal sholat & kiblat', color: 'text-blue-600' },
  { href: '/jamaah/rombongan', label: 'Rombongan', icon: Users, desc: 'Anggota grup saya', color: 'text-pink-600' },
];

const ISLAMI_NAV = [
  { href: '/sholat', label: 'Jadwal Sholat', icon: Moon, desc: 'Waktu sholat & hitung mundur', color: 'text-indigo-600' },
  { href: '/alquran', label: 'Al-Quran', icon: BookOpen, desc: 'Baca & dengar murottal', color: 'text-emerald-600' },
  { href: '/kiblat', label: 'Arah Kiblat', icon: Compass, desc: 'Kompas Ka\'bah GPS', color: 'text-teal-600' },
  { href: '/cuaca', label: 'Cuaca Mekah', icon: Cloud, desc: 'Prakiraan 7 hari Tanah Suci', color: 'text-sky-600' },
  { href: '/tracker-ibadah', label: 'Tracker Ibadah', icon: Target, desc: 'Pantau amalan harian', color: 'text-violet-600' },
  { href: '/kalkulator-islami', label: 'Kalkulator Islami', icon: Beaker, desc: 'Zakat, fidyah, cicilan', color: 'text-amber-600' },
  { href: '/tasbih', label: 'Tasbih Digital', icon: Moon, desc: 'Dzikir & hitung tasbih', color: 'text-rose-600' },
  { href: '/toko', label: 'Toko Umroh', icon: ShoppingBag, desc: 'Perlengkapan ibadah', color: 'text-orange-600' },
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
  items: { href: string; label: string; icon: React.ElementType; desc: string; color: string }[];
  isRoyal: boolean;
  onClose: () => void;
  loginRequired?: boolean;
  loginHref?: string;
}

function MegaDropdown({ label, icon: TriggerIcon, items, isRoyal, onClose, loginRequired, loginHref }: MegaDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative group" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        className={cn(
          'flex items-center gap-1 text-sm font-medium transition-colors py-1',
          isRoyal ? 'text-gray-400 hover:text-amber-500' : 'text-muted-foreground hover:text-primary',
        )}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {TriggerIcon && <TriggerIcon className="h-3.5 w-3.5" />}
        {label}
        <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className={cn(
          'absolute top-full left-1/2 -translate-x-1/2 mt-1 w-[520px] rounded-2xl border shadow-2xl z-50 p-3',
          isRoyal ? 'bg-[#111] border-amber-500/20' : 'bg-background border-border',
        )}>
          <div className="grid grid-cols-2 gap-1.5">
            {items.map((item) => {
              const Icon = item.icon;
              const href = loginRequired && loginHref ? loginHref : item.href;
              return (
                <Link
                  key={item.href}
                  to={href}
                  onClick={() => { setOpen(false); onClose(); }}
                  className={cn(
                    'flex items-start gap-3 p-2.5 rounded-xl transition-all duration-150 group/item',
                    isRoyal ? 'hover:bg-white/5' : 'hover:bg-accent',
                  )}
                >
                  <div className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    isRoyal ? 'bg-white/5' : 'bg-accent',
                  )}>
                    <Icon className={cn('h-4 w-4', item.color)} />
                  </div>
                  <div>
                    <p className={cn('text-xs font-semibold leading-tight', isRoyal ? 'text-gray-200' : 'text-foreground')}>{item.label}</p>
                    <p className={cn('text-[10px] leading-tight mt-0.5', isRoyal ? 'text-gray-500' : 'text-muted-foreground')}>{item.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
          {loginRequired && (
            <div className={cn(
              'mt-2 rounded-xl p-3 flex items-center justify-between gap-2 border',
              isRoyal ? 'bg-amber-500/10 border-amber-500/30' : 'bg-primary/5 border-primary/20',
            )}>
              <p className={cn('text-xs', isRoyal ? 'text-amber-400' : 'text-primary')}>
                Login untuk akses penuh semua fitur jamaah
              </p>
              <Link
                to="/auth/login"
                onClick={() => { setOpen(false); onClose(); }}
                className={cn(
                  'shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold',
                  isRoyal ? 'bg-amber-500 text-black' : 'bg-primary text-primary-foreground',
                )}
              >
                Masuk
              </Link>
            </div>
          )}
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
  const navLinks = ((settings?.nav_links as unknown as NavLink[] | null) || defaultNavLinks) as NavLink[];

  const customSections = settings?.custom_sections as unknown as CustomSectionsData | null;
  const headerMode: HeaderDisplayMode = customSections?.headerDisplayMode || 'logo_name_tagline';

  const renderLogo = () => {
    const logoImg = logoUrl ? (
      <img src={logoUrl} alt={companyName} className="h-10 w-auto object-contain" />
    ) : (
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <span className="font-display text-xl font-bold">{companyName.charAt(0)}</span>
      </div>
    );
    const nameBlock = (
      <div className="hidden sm:block">
        <h1 className={`text-lg font-bold ${isRoyal ? 'text-white font-serif' : 'text-foreground'}`}>{companyName}</h1>
        <p className={`text-xs ${isRoyal ? 'text-amber-500/70' : 'text-muted-foreground'}`}>{tagline}</p>
      </div>
    );
    switch (headerMode) {
      case 'logo_only':
        return <Link to="/" className="flex items-center gap-2">{logoImg}</Link>;
      case 'name_tagline_only':
        return <Link to="/" className="flex items-center gap-2"><div><h1 className={`text-lg font-bold ${isRoyal ? 'text-white font-serif' : 'text-foreground'}`}>{companyName}</h1><p className={`text-xs ${isRoyal ? 'text-amber-500/70' : 'text-muted-foreground'}`}>{tagline}</p></div></Link>;
      default:
        return <Link to="/" className="flex items-center gap-2">{logoImg}{nameBlock}</Link>;
    }
  };

  const toggleMobile = (section: string) => {
    setMobileSection(prev => prev === section ? null : section);
  };

  return (
    <nav className={`sticky top-0 z-50 border-b transition-all duration-500 ${isRoyal ? 'bg-[#0a0a0a]/80 backdrop-blur-xl border-amber-500/20' : 'glass'}`}>
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {renderLogo()}

          {/* Desktop Navigation */}
          <div className="hidden lg:flex lg:items-center lg:gap-1">
            {/* Layanan Utama Mega Dropdown */}
            <MegaDropdown
              label="Layanan"
              items={LAYANAN_NAV}
              isRoyal={isRoyal}
              onClose={() => setIsOpen(false)}
            />

            {/* Portal Jamaah Mega Dropdown */}
            <MegaDropdown
              label="Portal Jamaah"
              items={JAMAAH_NAV}
              isRoyal={isRoyal}
              onClose={() => setIsOpen(false)}
              loginRequired={!user}
              loginHref="/auth/login"
            />

            {/* Fitur Islami Mega Dropdown */}
            <MegaDropdown
              label="Islami"
              icon={Moon}
              items={ISLAMI_NAV}
              isRoyal={isRoyal}
              onClose={() => setIsOpen(false)}
            />

            {/* Extra nav links */}
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`px-3 py-1 text-sm font-medium transition-colors rounded-lg ${isRoyal ? 'text-gray-400 hover:text-amber-500' : 'text-muted-foreground hover:text-primary hover:bg-accent'}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side: dark mode + auth */}
          <div className="hidden lg:flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDark}
              aria-label={isDark ? "Mode terang" : "Mode gelap"}
              className={isRoyal ? 'text-gray-400 hover:text-amber-500 hover:bg-white/5' : ''}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className={`flex items-center gap-2 ${isRoyal ? 'text-white hover:bg-white/5' : ''}`}>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isRoyal ? 'bg-amber-500 text-black' : 'bg-primary text-primary-foreground'}`}>
                      <User className="h-4 w-4" />
                    </div>
                    <span className="max-w-[100px] truncate">{profile?.full_name || 'User'}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to={getDashboardLink()} className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" />Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-bookings" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />Booking Saya
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/customer/my-savings" className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" />Tabungan Saya
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 text-destructive">
                    <LogOut className="h-4 w-4" />Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" asChild className={isRoyal ? 'text-white hover:bg-white/5' : ''}>
                  <Link to="/login">Masuk</Link>
                </Button>
                <Button asChild className={isRoyal ? 'bg-amber-500 hover:bg-amber-400 text-black font-bold' : ''}>
                  <Link to="/register">Daftar</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className={`lg:hidden ${isRoyal ? 'text-white hover:bg-white/10' : ''}`}
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Tutup menu" : "Buka menu"}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className={`border-t py-3 lg:hidden ${isRoyal ? 'border-amber-500/20' : ''}`}>
            <div className="flex flex-col gap-0.5">

              {/* Layanan section */}
              <button
                onClick={() => toggleMobile('layanan')}
                className={cn('flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors w-full text-left',
                  isRoyal ? 'text-gray-300 hover:bg-white/5' : 'text-foreground hover:bg-accent')}
              >
                <span className="flex items-center gap-2"><Package className="h-4 w-4 text-emerald-600" />Layanan Utama</span>
                <ChevronDown className={cn('h-4 w-4 transition-transform', mobileSection === 'layanan' && 'rotate-180')} />
              </button>
              {mobileSection === 'layanan' && (
                <div className="ml-4 pl-4 border-l-2 border-emerald-200 space-y-0.5 mb-1">
                  {LAYANAN_NAV.map(item => (
                    <Link key={item.href} to={item.href} onClick={() => setIsOpen(false)}
                      className={cn('flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                        isRoyal ? 'text-gray-400 hover:text-amber-500 hover:bg-white/5' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
                      <item.icon className={cn('h-3.5 w-3.5', item.color)} />{item.label}
                    </Link>
                  ))}
                </div>
              )}

              {/* Portal Jamaah section */}
              <button
                onClick={() => toggleMobile('jamaah')}
                className={cn('flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors w-full text-left',
                  isRoyal ? 'text-gray-300 hover:bg-white/5' : 'text-foreground hover:bg-accent')}
              >
                <span className="flex items-center gap-2"><Heart className="h-4 w-4 text-rose-600" />Portal Jamaah</span>
                <ChevronDown className={cn('h-4 w-4 transition-transform', mobileSection === 'jamaah' && 'rotate-180')} />
              </button>
              {mobileSection === 'jamaah' && (
                <div className="ml-4 pl-4 border-l-2 border-rose-200 space-y-0.5 mb-1">
                  {JAMAAH_NAV.map(item => (
                    <Link key={item.href} to={user ? item.href : '/auth/login'} onClick={() => setIsOpen(false)}
                      className={cn('flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                        isRoyal ? 'text-gray-400 hover:text-amber-500 hover:bg-white/5' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
                      <item.icon className={cn('h-3.5 w-3.5', item.color)} />{item.label}
                    </Link>
                  ))}
                </div>
              )}

              {/* Fitur Islami section */}
              <button
                onClick={() => toggleMobile('islami')}
                className={cn('flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors w-full text-left',
                  isRoyal ? 'text-gray-300 hover:bg-white/5' : 'text-foreground hover:bg-accent')}
              >
                <span className="flex items-center gap-2"><Moon className="h-4 w-4 text-indigo-600" />Fitur Islami</span>
                <ChevronDown className={cn('h-4 w-4 transition-transform', mobileSection === 'islami' && 'rotate-180')} />
              </button>
              {mobileSection === 'islami' && (
                <div className="ml-4 pl-4 border-l-2 border-indigo-200 space-y-0.5 mb-1">
                  {ISLAMI_NAV.map(item => (
                    <Link key={item.href} to={item.href} onClick={() => setIsOpen(false)}
                      className={cn('flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                        isRoyal ? 'text-gray-400 hover:text-amber-500 hover:bg-white/5' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
                      <item.icon className={cn('h-3.5 w-3.5', item.color)} />{item.label}
                    </Link>
                  ))}
                </div>
              )}

              {/* Extra nav links */}
              {navLinks.map((link) => (
                <Link key={link.href} to={link.href} onClick={() => setIsOpen(false)}
                  className={cn('rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                    isRoyal ? 'text-gray-400 hover:bg-white/5 hover:text-amber-500' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
                  {link.label}
                </Link>
              ))}

              {/* Dark mode toggle */}
              <button onClick={toggleDark}
                className={cn('rounded-lg px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-2',
                  isRoyal ? 'text-gray-400 hover:bg-white/5 hover:text-amber-500' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {isDark ? 'Mode Terang' : 'Mode Gelap'}
              </button>

              <hr className={`my-2 ${isRoyal ? 'border-amber-500/20' : ''}`} />

              {user ? (
                <>
                  <div className="px-4 py-2 flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isRoyal ? 'bg-amber-500 text-black' : 'bg-primary text-primary-foreground'}`}>
                      <User className="h-4 w-4" />
                    </div>
                    <span className={`text-sm font-medium ${isRoyal ? 'text-white' : ''}`}>{profile?.full_name || 'User'}</span>
                  </div>
                  <Link to={getDashboardLink()} onClick={() => setIsOpen(false)}
                    className={cn('rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2',
                      isRoyal ? 'text-gray-400 hover:bg-white/5 hover:text-amber-500' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
                    <LayoutDashboard className="h-4 w-4" />Dashboard
                  </Link>
                  <Link to="/my-bookings" onClick={() => setIsOpen(false)}
                    className={cn('rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2',
                      isRoyal ? 'text-gray-400 hover:bg-white/5 hover:text-amber-500' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
                    <Calendar className="h-4 w-4" />Booking Saya
                  </Link>
                  <Link to="/customer/my-savings" onClick={() => setIsOpen(false)}
                    className={cn('rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2',
                      isRoyal ? 'text-gray-400 hover:bg-white/5 hover:text-amber-500' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
                    <Wallet className="h-4 w-4" />Tabungan Saya
                  </Link>
                  <button onClick={() => { handleSignOut(); setIsOpen(false); }}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 flex items-center gap-2 text-left w-full">
                    <LogOut className="h-4 w-4" />Keluar
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setIsOpen(false)}
                    className={cn('rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                      isRoyal ? 'text-gray-400 hover:bg-white/5 hover:text-amber-500' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
                    Masuk
                  </Link>
                  <Link to="/register" onClick={() => setIsOpen(false)}
                    className={cn('rounded-lg px-4 py-2.5 text-sm font-bold transition-colors',
                      isRoyal ? 'text-amber-500 hover:bg-amber-500/10' : 'text-primary hover:bg-primary/10')}>
                    Daftar Sekarang
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
