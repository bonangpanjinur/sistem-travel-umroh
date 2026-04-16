import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotificationBell } from "./NotificationBell";
import { CommandPalette } from "./CommandPalette";
import { AdminBreadcrumb } from "./AdminBreadcrumb";
import { 
  LayoutDashboard, Package, Users, Calendar, CreditCard, 
  Settings, LogOut, Menu, X, Shield, UserCheck,
  FileBarChart, BarChart3, Target, KeyRound, BedDouble, Plane, Box,
  Wallet, FileCheck, Building2, DollarSign, Truck, Gift,
  Banknote, Clock, Briefcase, Smartphone,
  HeadphonesIcon, Palette, ShieldCheck, Key, MessageSquare,
  UserCog, BookOpen, MapPin, TrendingUp, FileText, Share2, Search,
  FileType, Star, ExternalLink, ChevronDown, Hotel, Plane as PlaneIcon,
  Settings2, Layout
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";

// Grouped navigation for better organization
interface NavItem {
  label: string;
  icon: any;
  path: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
      { label: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
    ]
  },
  {
    label: 'Sales & CRM',
    items: [
      { label: 'CRM Leads', icon: Target, path: '/admin/leads' },
      { label: 'Kupon', icon: Gift, path: '/admin/coupons' },
      { label: 'Landing Page', icon: Layout, path: '/admin/landing-pages' },
    ]
  },
  {
    label: 'Produk & Operasional',
    items: [
      { label: 'Paket', icon: Package, path: '/admin/packages' },
      { label: 'Keberangkatan', icon: Plane, path: '/admin/departures' },
      { label: 'Booking', icon: Calendar, path: '/admin/bookings' },
      { label: 'Perlengkapan', icon: Box, path: '/admin/equipment' },
      { label: 'Template Itinerary', icon: MapPin, path: '/admin/itinerary-templates' },
      { label: 'Tabungan', icon: Wallet, path: '/admin/savings' },
      { label: 'Kamar', icon: BedDouble, path: '/admin/room-assignments' },
    ]
  },
  {
    label: 'Keuangan & Akuntansi',
    items: [
      { label: 'Pembayaran', icon: CreditCard, path: '/admin/payments' },
      { label: 'Kas & Bank', icon: Wallet, path: '/admin/finance-cash' },
      { label: 'Piutang Jamaah', icon: FileText, path: '/admin/finance/ar' },
      { label: 'Hutang Vendor', icon: Truck, path: '/admin/finance/ap' },
      { label: 'Laporan Laba Rugi', icon: DollarSign, path: '/admin/finance' },
    ]
  },
  {
    label: 'Jamaah & Agent',
    items: [
      { label: 'Jamaah', icon: Users, path: '/admin/customers' },
      { label: 'Agent', icon: UserCheck, path: '/admin/agents' },
      { label: 'Cabang', icon: Building2, path: '/admin/branches' },
      { label: 'Loyalty', icon: Gift, path: '/admin/loyalty' },
      { label: 'Referral', icon: Share2, path: '/admin/referrals' },
      { label: 'Haji', icon: BookOpen, path: '/admin/haji' },
      { label: 'Manasik', icon: Calendar, path: '/admin/manasik' },
      { label: 'Visa', icon: FileCheck, path: '/admin/visa' },
    ]
  },
  {
    label: 'SDM (HR)',
    items: [
      { label: 'Data Karyawan', icon: UserCog, path: '/admin/hr' },
      { label: 'Penggajian / Payroll', icon: Banknote, path: '/admin/hr/payroll' },
    ]
  },
  {
    label: 'Support & Komunikasi',
    items: [
      { label: 'Tiket Support', icon: HeadphonesIcon, path: '/admin/support' },
      { label: 'WhatsApp', icon: MessageSquare, path: '/admin/whatsapp' },
      { label: 'Materi Promosi', icon: FileText, path: '/admin/marketing-materials' },
    ]
  },
  {
    label: 'Dokumen & Surat',
    items: [
      { label: 'Verifikasi Dokumen', icon: FileCheck, path: '/admin/document-verification' },
      { label: 'Generate Surat', icon: FileText, path: '/admin/documents-generator' },
      { label: 'Konten Offline', icon: BookOpen, path: '/admin/offline-content' },
    ]
  },
  {
    label: 'Laporan',
    items: [
      { label: 'Laporan', icon: FileBarChart, path: '/admin/reports' },
    ]
  },
  {
    label: 'Pengaturan',
    items: [
      { label: 'Users', icon: Shield, path: '/admin/users' },
      { label: 'Security Audit', icon: ShieldCheck, path: '/admin/security-audit' },
      { label: '2FA Settings', icon: Key, path: '/admin/2fa' },
      { label: 'Tampilan', icon: Palette, path: '/admin/appearance' },
      { label: 'Halaman Statis', icon: FileType, path: '/admin/static-pages' },
      { label: 'Testimoni', icon: Star, path: '/admin/testimonials' },
      { label: 'Tipe Paket', icon: Settings2, path: '/admin/package-types' },
      { label: 'Pengaturan', icon: Settings, path: '/admin/settings' },
    ]
  },
];

function AdminLayout() {
  const { user, profile, signOut, isAdmin, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Overview', 'Sales & CRM', 'Produk & Operasional']));
  const [searchQuery, setSearchQuery] = useState('');
  
  const isLoading = authLoading;

  const {
    notifications = [],
    unreadCount = 0,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useAdminNotifications();

  // Handle responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      const isLargeScreen = window.innerWidth >= 1024;
      setIsDesktop(isLargeScreen);
      
      if (isLargeScreen) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const toggleGroup = (groupLabel: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupLabel)) {
      newExpanded.delete(groupLabel);
    } else {
      newExpanded.add(groupLabel);
    }
    setExpandedGroups(newExpanded);
  };

  const isGroupExpanded = (groupLabel: string) => {
    return expandedGroups.has(groupLabel);
  };

  const isPathActive = (path: string) => {
    return location.pathname === path || 
      (path !== '/admin' && location.pathname.startsWith(path));
  };

  // Filter groups based on search query
  const filteredGroupsWithSearch = useMemo(() => {
    if (!searchQuery) return NAV_GROUPS;
    
    return NAV_GROUPS.map(group => ({
      ...group,
      items: group.items.filter(item => 
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(group => group.items.length > 0);
  }, [searchQuery]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Akses Ditolak</h1>
          <p className="text-muted-foreground mb-4">
            Anda tidak memiliki akses ke halaman ini.
          </p>
          <Button onClick={() => navigate('/')}>Kembali ke Beranda</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar Overlay for Mobile */}
      {!isDesktop && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-card border-r transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-6 border-b flex items-center justify-between">
            <Link to="/admin" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl tracking-tight">Admin Panel</span>
            </Link>
            {!isDesktop && (
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>

          {/* Search in Sidebar */}
          <div className="px-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Cari menu..." 
                className="pl-9 bg-muted/50 border-none h-9 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-4 pb-6">
            <nav className="space-y-6">
              {filteredGroupsWithSearch.map((group) => (
                <div key={group.label} className="space-y-1">
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                  >
                    {group.label}
                    <ChevronDown className={cn(
                      "w-3 h-3 transition-transform duration-200",
                      isGroupExpanded(group.label) ? "rotate-0" : "-rotate-90"
                    )} />
                  </button>
                  
                  {isGroupExpanded(group.label) && (
                    <div className="space-y-1 mt-1">
                      {group.items.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                            isPathActive(item.path)
                              ? "bg-primary text-primary-foreground shadow-md"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                          onClick={() => !isDesktop && setSidebarOpen(false)}
                        >
                          <item.icon className={cn(
                            "w-4 h-4",
                            isPathActive(item.path) ? "text-primary-foreground" : "text-muted-foreground"
                          )} />
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </ScrollArea>

          {/* Sidebar Footer */}
          <div className="p-4 border-t bg-muted/30">
            <div className="flex items-center gap-3 px-2 py-2 mb-2">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {profile?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile?.full_name || 'Admin User'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Keluar
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            {!isDesktop && (
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
            )}
            <AdminBreadcrumb />
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            <CommandPalette />
            <NotificationBell 
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onClearAll={clearAll}
            />
            <div className="h-8 w-px bg-border mx-1 hidden sm:block" />
            <Button variant="outline" size="sm" className="hidden sm:flex gap-2" asChild>
              <Link to="/" target="_blank">
                <ExternalLink className="w-4 h-4" />
                Lihat Situs
              </Link>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;
