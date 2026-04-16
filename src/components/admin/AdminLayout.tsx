import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUdacPermissions } from "@/hooks/useUdacPermissions";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { AppRole } from "@/types/database";
import { sortRoles } from "@/lib/constants";
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
  permission: string;
  superAdminOnly?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/admin', permission: 'dashboard.view' },
      { label: 'Analytics', icon: BarChart3, path: '/admin/analytics', permission: 'analytics.view' },
    ]
  },
  {
    label: 'Sales & CRM',
    items: [
      { label: 'CRM Leads', icon: Target, path: '/admin/leads', permission: 'leads.view' },
      { label: 'Kupon', icon: Gift, path: '/admin/coupons', permission: 'marketing.view' },
      { label: 'Landing Page', icon: Layout, path: '/admin/landing-pages', permission: 'settings.manage' },
    ]
  },
  {
    label: 'Produk & Operasional',
    items: [
      { label: 'Paket', icon: Package, path: '/admin/packages', permission: 'packages.view' },
      { label: 'Keberangkatan', icon: Plane, path: '/admin/departures', permission: 'departures.view' },
      { label: 'Booking', icon: Calendar, path: '/admin/bookings', permission: 'bookings.view_own' },
      { label: 'Perlengkapan', icon: Box, path: '/admin/equipment', permission: 'operational.view' },
      { label: 'Template Itinerary', icon: MapPin, path: '/admin/itinerary-templates', permission: 'itinerary.view' },
      { label: 'Tabungan', icon: Wallet, path: '/admin/savings', permission: 'packages.view' },
      { label: 'Kamar', icon: BedDouble, path: '/admin/room-assignments', permission: 'operational.rooms.view' },
    ]
  },
  {
    label: 'Keuangan & Akuntansi',
    items: [
      { label: 'Pembayaran', icon: CreditCard, path: '/admin/payments', permission: 'payments.view_own' },
      { label: 'Kas & Bank', icon: Wallet, path: '/admin/finance-cash', permission: 'payments.view_own' },
      { label: 'Piutang Jamaah', icon: FileText, path: '/admin/finance/ar', permission: 'payments.view_all' },
      { label: 'Hutang Vendor', icon: Truck, path: '/admin/finance/ap', permission: 'payments.view_all' },
      { label: 'Laporan Laba Rugi', icon: DollarSign, path: '/admin/finance', permission: 'finance.reports' },
    ]
  },
  {
    label: 'Jamaah & Agent',
    items: [
      { label: 'Jamaah', icon: Users, path: '/admin/customers', permission: 'customers.view' },
      { label: 'Agent', icon: UserCheck, path: '/admin/agents', permission: 'agents.view' },
      { label: 'Cabang', icon: Building2, path: '/admin/branches', permission: 'settings.view' },
      { label: 'Loyalty', icon: Gift, path: '/admin/loyalty', permission: 'marketing.view' },
      { label: 'Referral', icon: Share2, path: '/admin/referrals', permission: 'marketing.view' },
      { label: 'Haji', icon: BookOpen, path: '/admin/haji', permission: 'operational.view' },
      { label: 'Manasik', icon: Calendar, path: '/admin/manasik', permission: 'operational.manasik.view' },
      { label: 'Visa', icon: FileCheck, path: '/admin/visa', permission: 'departures.visa.view' },
    ]
  },
  {
    label: 'SDM (HR)',
    items: [
      { label: 'Data Karyawan', icon: UserCog, path: '/admin/hr', permission: 'hr.employees.view' },
      { label: 'Penggajian / Payroll', icon: Banknote, path: '/admin/hr/payroll', permission: 'hr.payroll.view' },
    ]
  },
  {
    label: 'Support & Komunikasi',
    items: [
      { label: 'Tiket Support', icon: HeadphonesIcon, path: '/admin/support', permission: 'support.tickets.view' },
      { label: 'WhatsApp', icon: MessageSquare, path: '/admin/whatsapp', permission: 'whatsapp.view' },
      { label: 'Materi Promosi', icon: FileText, path: '/admin/marketing-materials', permission: 'marketing_materials.view' },
    ]
  },
  {
    label: 'Dokumen & Surat',
    items: [
      { label: 'Verifikasi Dokumen', icon: FileCheck, path: '/admin/document-verification', permission: 'documents.verification.view' },
      { label: 'Generate Surat', icon: FileText, path: '/admin/documents-generator', permission: 'documents.generator.view' },
      { label: 'Konten Offline', icon: BookOpen, path: '/admin/offline-content', permission: 'offline_content.view' },
    ]
  },
  {
    label: 'Laporan',
    items: [
      { label: 'Laporan', icon: FileBarChart, path: '/admin/reports', permission: 'reports.view' },
    ]
  },
  {
    label: 'Pengaturan',
    items: [
      { label: 'Users', icon: Shield, path: '/admin/users', permission: 'users.view' },
      { label: 'Security Audit', icon: ShieldCheck, path: '/admin/security-audit', permission: 'settings.manage' },
      { label: '2FA Settings', icon: Key, path: '/admin/2fa', permission: 'settings.manage' },
      { label: 'Tampilan', icon: Palette, path: '/admin/appearance', permission: 'settings.manage' },
      { label: 'Halaman Statis', icon: FileType, path: '/admin/static-pages', permission: 'settings.manage' },
      { label: 'Testimoni', icon: Star, path: '/admin/testimonials', permission: 'settings.manage' },
      { label: 'Tipe Paket', icon: Settings2, path: '/admin/package-types', permission: 'packages.view' },
      { label: 'Pengaturan', icon: Settings, path: '/admin/settings', permission: 'settings.manage' },
    ]
  },
];

function AdminLayout() {
  const { user, profile, signOut, isAdmin, roles, isLoading: authLoading } = useAuth();
  const { hasPermission, isLoading: permsLoading } = useUdacPermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Overview', 'Sales & CRM', 'Produk & Operasional']));
  const [searchQuery, setSearchQuery] = useState('');
  
  const isLoading = authLoading || permsLoading;

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
      
      // Auto-open sidebar on desktop, auto-close on mobile
      if (isLargeScreen) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    // Set initial state
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

  // Filter NAV_GROUPS based on permissions and super admin requirements
  const isSuperAdmin = roles?.includes('super_admin') || false;
  
  const filteredNavGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => {
      // If item requires super admin, check that first
      if (item.superAdminOnly && !isSuperAdmin) {
        return false;
      }
      
      // UDAC Sync Fix: Jika user adalah staff/admin (bukan customer), berikan akses dashboard minimal
      // Ini memastikan semua role staf bisa melihat menu dasar meskipun permission belum sempurna di DB
      if (item.permission === 'dashboard.view' && isAdmin()) {
        return true;
      }
      
      // Enhanced permission check:
      // Some roles use granular permissions like view_branch or view_all instead of view_own
      // We check for any of these variants if the base permission is a 'view' permission
      if (item.permission.endsWith('.view_own')) {
        const base = item.permission.replace('.view_own', '');
        return hasPermission(item.permission) || 
               hasPermission(`${base}.view_branch`) || 
               hasPermission(`${base}.view_all`) ||
               hasPermission(`${base}.view`);
      }

      // Default check
      return hasPermission(item.permission);
    })
  })).filter(group => group.items.length > 0);

  // Filter groups based on search query
  const filteredGroupsWithSearch = useMemo(() => {
    if (!searchQuery) return filteredNavGroups;
    
    return filteredNavGroups.map(group => ({
      ...group,
      items: group.items.filter(item => 
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(group => group.items.length > 0);
  }, [filteredNavGroups, searchQuery]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Memuat Navigasi UDAC...</p>
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
            Anda tidak memiliki akses ke halaman admin.
          </p>
          <Button asChild>
            <Link to="/">Kembali ke Beranda</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Sidebar Overlay */}
      {!isDesktop && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r transition-transform duration-300 ease-in-out flex flex-col",
          !sidebarOpen && "-translate-x-full"
        )}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold">
              U
            </div>
            <span className="font-bold text-lg">Umrah Magic</span>
          </Link>
          {!isDesktop && (
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Sidebar Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>

        {/* Sidebar Content */}
        <ScrollArea className="flex-1 py-4">
          <nav className="px-2 space-y-4">
            {filteredGroupsWithSearch.map((group) => (
              <div key={group.label} className="space-y-1">
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                >
                  {group.label}
                  <ChevronDown className={cn(
                    "h-3 w-3 transition-transform",
                    isGroupExpanded(group.label) ? "rotate-0" : "-rotate-90"
                  )} />
                </button>
                
                {isGroupExpanded(group.label) && (
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isPathActive(item.path);
                      
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => !isDesktop && setSidebarOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                            active 
                              ? "bg-primary text-primary-foreground" 
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Sidebar Footer */}
        <div className="p-4 border-t space-y-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-medium">
              {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {profile?.full_name || 'Admin'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            {!isDesktop && (
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <AdminBreadcrumb />
          </div>
          
          <div className="flex items-center gap-2 lg:gap-4">
            <CommandPalette />
            <NotificationBell />
            <div className="h-8 w-px bg-border mx-1 hidden sm:block" />
            <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
              <Link to="/" target="_blank" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Lihat Situs
              </Link>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
