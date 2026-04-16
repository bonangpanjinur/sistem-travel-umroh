import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUdacPermissions } from "@/hooks/useUdacPermissions";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { AppRole } from "@/types/database";
import { sortRoles } from "@/lib/constants";
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
  Settings2, Layout
} from "lucide-react";
import { useState, useEffect } from "react";
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

      { label: 'UDAC Management', icon: Shield, path: '/admin/udac', permission: 'users.view', superAdminOnly: true },
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
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
        !sidebarOpen && "-translate-x-full"
      )}>
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b">
          <Link to="/admin" className="flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span>Magic Admin</span>
          </Link>
          {!isDesktop && (
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Sidebar Content */}
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <nav className="p-4 space-y-6">
            {filteredNavGroups.map((group) => (
              <div key={group.label} className="space-y-1">
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                >
                  {group.label}
                  <ChevronDown className={cn(
                    "w-3 h-3 transition-transform",
                    isGroupExpanded(group.label) ? "rotate-0" : "-rotate-90"
                  )} />
                </button>
                
                {isGroupExpanded(group.label) && (
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => !isDesktop && setSidebarOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                          isPathActive(item.path)
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <item.icon className="w-4 h-4" />
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
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-card">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <AdminBreadcrumb />
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            <div className="hidden md:block">
              <CommandPalette />
            </div>
            <NotificationBell 
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onClearAll={clearAll}
            />
            <div className="h-8 w-px bg-border mx-1" />
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-medium leading-none">
                  {profile?.full_name || user?.email}
                </span>
                <span className="text-xs text-muted-foreground">
                  {roles[0]?.replace('_', ' ')}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
