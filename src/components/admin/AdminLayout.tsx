import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { AppRole } from "@/types/database";
import { Button } from "@/components/ui/button";
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
  Settings2
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from 'lucide-react';

// Grouped navigation for better organization
const NAV_GROUPS = [
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
      { label: 'Perlengkapan', icon: Box, path: '/admin/equipment', permission: 'equipment.inventory' },
      { label: 'Template Itinerary', icon: MapPin, path: '/admin/itinerary-templates', permission: 'packages.view' },
      { label: 'Tabungan', icon: Wallet, path: '/admin/savings', permission: 'packages.view' },
      { label: 'Kamar', icon: BedDouble, path: '/admin/room-assignments', permission: 'operational.manage' },
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
      { label: 'Manasik', icon: Calendar, path: '/admin/manasik', permission: 'operational.view' },
      { label: 'Visa', icon: FileCheck, path: '/admin/visa', permission: 'operational.visa' },
    ]
  },
  {
    label: 'SDM (HR)',
    items: [
      { label: 'Data Karyawan', icon: UserCog, path: '/admin/hr?tab=employees', permission: 'hr.employees.view' },
      { label: 'Absensi', icon: Clock, path: '/admin/hr?tab=attendance', permission: 'hr.attendance.view' },
      { label: 'Penggajian / Payroll', icon: Banknote, path: '/admin/hr/payroll', permission: 'hr.payroll.view' },
      { label: 'Slip Gaji', icon: FileText, path: '/admin/finance-cash?tab=salary', permission: 'hr.payroll.view' },
      { label: 'Departemen', icon: Building2, path: '/admin/hr?tab=departments', permission: 'hr.departments.view' },
      { label: 'Posisi', icon: Briefcase, path: '/admin/hr?tab=positions', permission: 'hr.positions.view' },
      { label: 'Jadwal Kerja', icon: Calendar, path: '/admin/hr?tab=schedules', permission: 'hr.schedules.view' },
      { label: 'Perangkat', icon: Smartphone, path: '/admin/hr?tab=devices', permission: 'hr.devices.view' },
      { label: 'Pengaturan HR', icon: Settings, path: '/admin/hr?tab=settings', permission: 'hr.settings.view' },
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
    label: 'Master Data',
    items: [
      { label: 'Master Data', icon: Settings, path: '/admin/master-data', permission: 'master_data.view' },
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
      { label: 'Laporan Lanjutan', icon: TrendingUp, path: '/admin/advanced-reports', permission: 'reports.view' },
      { label: 'Laporan Terjadwal', icon: Calendar, path: '/admin/scheduled-reports', permission: 'reports.view' },
    ]
  },
  {
    label: 'Pengaturan',
    items: [
      { label: 'Users', icon: Shield, path: '/admin/users', permission: 'users.view' },
      { label: 'Hak Akses', icon: KeyRound, path: '/admin/permissions', permission: 'users.view' },
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
  const { hasPermission, isLoading: permsLoading } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Overview', 'Sales & CRM', 'Produk & Operasional']));
  
  const isLoading = authLoading || permsLoading;

  const {
    notifications,
    unreadCount,
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

  // Filter NAV_GROUPS based on permissions
  const filteredNavGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => hasPermission(item.permission))
  })).filter(group => group.items.length > 0);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Memuat Navigasi...</p>
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
    <div className="min-h-screen bg-muted/30">
      <CommandPalette />

      {/* Desktop Header - Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 h-14 sm:h-16 bg-background border-b z-40 flex items-center justify-between px-3 sm:px-6">
        {/* Left side - Logo and Toggle */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
            title={sidebarOpen ? "Tutup sidebar" : "Buka sidebar"}
          >
            {sidebarOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Menu className="h-4 w-4 sm:h-5 sm:w-5" />}
          </Button>
          <Link to="/admin" className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs sm:text-sm flex-shrink-0">
              U
            </div>
            <span className="font-semibold hidden xs:inline text-sm sm:text-base truncate">UmrohTravel</span>
          </Link>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-10 sm:w-10 hidden sm:flex"
            onClick={() => {
              const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
              document.dispatchEvent(event);
            }}
            title="Cari halaman (Ctrl+K)"
          >
            <Search className="h-4 w-4" />
          </Button>
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
            onClearAll={clearAll}
          />
          <div className="flex items-center gap-2 pl-2 border-l ml-1 sm:ml-2">
            <div className="hidden sm:flex flex-col items-end text-xs mr-2">
              <span className="font-medium truncate max-w-[120px]">{profile?.full_name || user.email}</span>
              <span className="text-muted-foreground capitalize">{roles[0]?.replace('_', ' ')}</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              className="h-8 w-8 sm:h-9 sm:w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
              title="Keluar"
            >
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] overflow-hidden mt-14 sm:mt-16">
        {/* Sidebar Navigation */}
        <aside 
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 bg-background border-r transform transition-transform duration-200 ease-in-out lg:relative lg:inset-0 lg:translate-x-0 shrink-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
            !sidebarOpen && "lg:hidden",
            !isDesktop && "shadow-xl pt-14 sm:pt-16"
          )}
        >
          <div className="h-full flex flex-col overflow-hidden">
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
              {filteredNavGroups.map((group) => (
                <div key={group.label} className="space-y-1">
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors group"
                  >
                    <span>{group.label}</span>
                    <ChevronDown className={cn(
                      "h-3 w-3 transition-transform duration-200",
                      isGroupExpanded(group.label) ? "transform rotate-0" : "transform -rotate-90"
                    )} />
                  </button>
                  
                  {isGroupExpanded(group.label) && (
                    <div className="space-y-1 mt-1">
                      {group.items.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                            isPathActive(item.path)
                              ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                          onClick={() => !isDesktop && setSidebarOpen(false)}
                        >
                          <item.icon className={cn(
                            "h-4 w-4 flex-shrink-0 transition-colors",
                            isPathActive(item.path) ? "text-primary" : "group-hover:text-primary"
                          )} />
                          <span className="truncate">{item.label}</span>
                          {isPathActive(item.path) && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* Bottom Sidebar Info */}
            <div className="p-4 border-t bg-muted/20">
              <div className="flex items-center gap-3 px-2 py-1.5">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                  {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{profile?.full_name || 'User'}</p>
                  <p className="text-xs text-muted-foreground truncate capitalize">{roles[0]?.replace('_', ' ')}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className={cn(
          "flex-1 flex flex-col min-w-0 bg-muted/10 relative transition-all duration-200 overflow-y-auto",
        )}>
          {/* Overlay for mobile sidebar */}
          {sidebarOpen && !isDesktop && (
            <div 
              className="fixed inset-0 bg-black/60 z-50 transition-opacity duration-200 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <div className="p-3 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full min-h-full flex flex-col">
            <AdminBreadcrumb />
            <div className="mt-4 sm:mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1">
              <Outlet />
            </div>
            
            {/* Footer */}
            <footer className="mt-8 py-6 border-t bg-transparent text-center text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Umroh & Haji Magic. All rights reserved.
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
