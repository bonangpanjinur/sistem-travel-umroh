import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { WebsiteSettings } from '@/hooks/useWebsiteSettings';
import { Menu, X, User, ChevronDown, LogOut, LayoutDashboard, Wallet, Calendar, Moon, BookOpen, Compass, Cloud, Target, Calculator, Beaker, ShoppingBag } from 'lucide-react';
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

interface NavLink {
  href: string;
  label: string;
}

const defaultNavLinks: NavLink[] = [
  { href: '/', label: 'Beranda' },
  { href: '/packages', label: 'Paket Umroh' },
  { href: '/departures', label: 'Jadwal' },
  { href: '/savings', label: 'Tabungan' },
  { href: '/toko', label: 'Toko' },
  { href: '/about', label: 'Tentang Kami' },
  { href: '/contact', label: 'Hubungi Kami' },
];

const ISLAMI_NAV = [
  { href: '/sholat', label: 'Jadwal Sholat', icon: Moon, desc: 'Waktu sholat & arah kiblat' },
  { href: '/alquran', label: 'Al-Quran', icon: BookOpen, desc: 'Baca & dengar murottal' },
  { href: '/kiblat', label: 'Arah Kiblat', icon: Compass, desc: 'Kompas Ka\'bah GPS' },
  { href: '/cuaca', label: 'Cuaca Mekah', icon: Cloud, desc: 'Prakiraan cuaca Tanah Suci' },
  { href: '/tracker-ibadah', label: 'Tracker Ibadah', icon: Target, desc: 'Pantau amalan harian' },
  { href: '/kalkulator-islami', label: 'Kalkulator Islami', icon: Beaker, desc: 'Zakat, fidyah, cicilan' },
  { href: '/tasbih', label: 'Tasbih Digital', icon: Moon, desc: 'Dzikir & hitung tasbih' },
  { href: '/toko', label: 'Toko Umroh', icon: ShoppingBag, desc: 'Perlengkapan ibadah' },
];

export type HeaderDisplayMode = 'logo_only' | 'logo_name_tagline' | 'name_tagline_only';

interface CustomSectionsData {
  headerDisplayMode?: HeaderDisplayMode;
}

interface DynamicNavbarProps {
  tenantSettings?: WebsiteSettings | null;
}

export function DynamicNavbar({ tenantSettings }: DynamicNavbarProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, profile, isAdmin, signOut } = useAuth();
  const { data: mainSettings } = useWebsiteSettings();
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

  // Get header display mode from custom_sections
  const customSections = settings?.custom_sections as unknown as CustomSectionsData | null;
  const headerMode: HeaderDisplayMode = customSections?.headerDisplayMode || 'logo_name_tagline';

  const renderLogo = () => {
    switch (headerMode) {
      case 'logo_only':
        return (
          <Link to="/" className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} className="h-10 w-auto object-contain" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <span className="font-display text-xl font-bold">{companyName.charAt(0)}</span>
              </div>
            )}
          </Link>
        );
      case 'name_tagline_only':
        return (
          <Link to="/" className="flex items-center gap-2">
            <div>
              <h1 className={`text-lg font-bold ${isRoyal ? 'text-white font-serif' : 'text-foreground'}`}>{companyName}</h1>
              <p className={`text-xs ${isRoyal ? 'text-amber-500/70' : 'text-muted-foreground'}`}>{tagline}</p>
            </div>
          </Link>
        );
      case 'logo_name_tagline':
      default:
        return (
          <Link to="/" className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} className="h-10 w-auto object-contain" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <span className="font-display text-xl font-bold">{companyName.charAt(0)}</span>
              </div>
            )}
            <div className="hidden sm:block">
              <h1 className={`text-lg font-bold ${isRoyal ? 'text-white font-serif' : 'text-foreground'}`}>{companyName}</h1>
              <p className={`text-xs ${isRoyal ? 'text-amber-500/70' : 'text-muted-foreground'}`}>{tagline}</p>
            </div>
          </Link>
        );
    }
  };

  return (
    <nav className={`sticky top-0 z-50 border-b transition-all duration-500 ${
      isRoyal 
        ? 'bg-[#0a0a0a]/80 backdrop-blur-xl border-amber-500/20' 
        : 'glass'
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / Brand */}
          {renderLogo()}

          {/* Desktop Navigation */}
          <div className="hidden lg:flex lg:items-center lg:gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-sm font-medium transition-colors ${
                  isRoyal 
                    ? 'text-gray-400 hover:text-amber-500' 
                    : 'text-muted-foreground hover:text-primary'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {/* Islami Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`flex items-center gap-1 text-sm font-medium transition-colors ${isRoyal ? 'text-gray-400 hover:text-amber-500' : 'text-muted-foreground hover:text-primary'}`}>
                  <Moon className="h-4 w-4" />
                  Islami
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-72 p-2 grid grid-cols-2 gap-1">
                {ISLAMI_NAV.map(item => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link to={item.href} className="flex items-start gap-2 p-2 rounded-lg hover:bg-accent">
                      <item.icon className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold leading-tight">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{item.desc}</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Desktop Auth (hidden on mobile) */}
          <div className="hidden lg:flex items-center gap-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className={`flex items-center gap-2 ${isRoyal ? 'text-white hover:bg-white/5' : ''}`} aria-label={`Menu pengguna: ${profile?.full_name || 'User'}`} aria-haspopup="true">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isRoyal ? 'bg-amber-500 text-black' : 'bg-primary text-primary-foreground'}`} aria-hidden="true">
                      <User className="h-4 w-4" />
                    </div>
                    <span>{profile?.full_name || 'User'}</span>
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to={getDashboardLink()} className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-bookings" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Booking Saya
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/customer/my-savings" className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      Tabungan Saya
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="flex items-center gap-2 text-destructive"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Keluar
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

          {/* Mobile Menu Button only */}
          <Button
            variant="ghost"
            size="icon"
            className={`lg:hidden ${isRoyal ? 'text-white hover:bg-white/10' : ''}`}
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
            aria-expanded={isOpen}
            aria-controls="mobile-navigation"
            title={isOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Navigation - includes user menu items */}
        {isOpen && (
          <div className={`border-t py-4 lg:hidden ${isRoyal ? 'border-amber-500/20' : ''}`} id="mobile-navigation" role="navigation" aria-label="Menu navigasi mobile">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isRoyal 
                      ? 'text-gray-400 hover:bg-white/5 hover:text-amber-500' 
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              {/* Islami section in mobile menu */}
              <div className="px-4 pt-2 pb-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Fitur Islami</p>
              </div>
              {ISLAMI_NAV.map(item => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${isRoyal ? 'text-gray-400 hover:bg-white/5 hover:text-amber-500' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon className="h-4 w-4 text-emerald-600" />
                  {item.label}
                </Link>
              ))}

              <hr className={`my-2 ${isRoyal ? 'border-amber-500/20' : ''}`} />

              {user ? (
                <>
                  {/* User info */}
                  <div className="px-4 py-2 flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      isRoyal ? 'bg-amber-500 text-black' : 'bg-primary text-primary-foreground'
                    }`}>
                      <User className="h-4 w-4" />
                    </div>
                    <span className={`text-sm font-medium ${isRoyal ? 'text-white' : ''}`}>{profile?.full_name || 'User'}</span>
                  </div>
                  <Link
                    to={getDashboardLink()}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                      isRoyal 
                        ? 'text-gray-400 hover:bg-white/5 hover:text-amber-500' 
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                  <Link
                    to="/my-bookings"
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                      isRoyal 
                        ? 'text-gray-400 hover:bg-white/5 hover:text-amber-500' 
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <Calendar className="h-4 w-4" />
                    Booking Saya
                  </Link>
                  <Link
                    to="/customer/my-savings"
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                      isRoyal 
                        ? 'text-gray-400 hover:bg-white/5 hover:text-amber-500' 
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <Wallet className="h-4 w-4" />
                    Tabungan Saya
                  </Link>
                  <button
                    onClick={() => { handleSignOut(); setIsOpen(false); }}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 flex items-center gap-2 text-left w-full"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Keluar
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      isRoyal 
                        ? 'text-gray-400 hover:bg-white/5 hover:text-amber-500' 
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    Masuk
                  </Link>
                  <Link
                    to="/register"
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      isRoyal 
                        ? 'text-amber-500 font-bold hover:bg-amber-500/10' 
                        : 'text-primary font-semibold hover:bg-primary/10'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    Daftar
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
