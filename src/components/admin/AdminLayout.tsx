import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { AppRole } from "@/types/database";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "./NotificationBell";
import { CommandPalette } from "./CommandPalette";
import { AdminBreadcrumb } from "./AdminBreadcrumb";
import { 
  LayoutDashboard, Package, Users, Calendar, CreditCard, 
  Settings, LogOut, Menu, X, Shield, UserCheck,
  FileBarChart, BarChart3, Target, KeyRound, BedDouble, Plane,
  Wallet, FileCheck, Building2, DollarSign, Truck, Gift,
  Banknote, Clock, Briefcase, Smartphone,
  HeadphonesIcon, Palette, ShieldCheck, Key, MessageSquare,
  UserCog, BookOpen, MapPin, TrendingUp, FileText, Share2, Search,
  FileType, Star, ExternalLink, ChevronDown
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from 'lucide-react';

// Grouped navigation for better organization
const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
      { label: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
    ]
  },
  {
    label: 'Sales & CRM',
    allowedRoles: ['super_admin', 'owner', 'branch_manager', 'sales', 'marketing', 'operational'],
    items: [
      { label: 'CRM Leads', icon: Target, path: '/admin/leads' },
      { label: 'Booking', icon: Calendar, path: '/admin/bookings' },
      { label: 'Kupon', icon: Gift, path: '/admin/coupons' },
    ]
  },
  {
    label: 'Produk & Operasional',
    allowedRoles: ['super_admin', 'owner', 'branch_manager', 'operational', 'equipment'],
    items: [
      { label: 'Paket', icon: Package, path: '/admin/packages' },
      { label: 'Keberangkatan', icon: Plane, path: '/admin/departures' },
      { label: 'Template Itinerary', icon: MapPin, path: '/admin/itinerary-templates' },
      { label: 'Tabungan', icon: Wallet, path: '/admin/savings' },
      { label: 'Kamar', icon: BedDouble, path: '/admin/room-assignments' },
    ]
  },
  {
    label: 'Keuangan & Akuntansi',
    allowedRoles: ['super_admin', 'owner', 'finance', 'operational', 'branch_manager'],
    items: [
      { label: 'Pembayaran', icon: CreditCard, path: '/admin/payments' },
      { label: 'Kas & Bank', icon: Wallet, path: '/admin/finance-cash' },
      { label: 'Piutang Jamaah', icon: FileText, path: '/admin/finance/ar' },
      { label: 'Hutang Vendor', icon: Truck, path: '/admin/finance/ap' },
      { label: 'Laporan Laba Rugi', icon: DollarSign, path: '/admin/finance' },
      { label: 'Vendor', icon: Building2, path: '/admin/vendors' },
      { label: 'Tabungan', icon: Wallet, path: '/admin/savings' },
    ]
  },
  {
    label: 'Jamaah & Agent',
    allowedRoles: ['super_admin', 'owner', 'branch_manager', 'sales', 'operational'],
    items: [
      { label: 'Jamaah', icon: Users, path: '/admin/customers' },
      { label: 'Agent', icon: UserCheck, path: '/admin/agents' },
      { label: 'Loyalty', icon: Gift, path: '/admin/loyalty' },
      { label: 'Referral', icon: Share2, path: '/admin/referrals' },
      { label: 'Haji', icon: BookOpen, path: '/admin/haji' },
    ]
  },
  {
    label: 'SDM (HR)',
    allowedRoles: ['super_admin', 'owner', 'branch_manager', 'operational'],
    items: [
      { label: 'Data Karyawan', icon: UserCog, path: '/admin/hr?tab=employees' },
      { label: 'Absensi', icon: Clock, path: '/admin/hr?tab=attendance' },
      { label: 'Penggajian / Payroll', icon: Banknote, path: '/admin/hr/payroll' },
      { label: 'Departemen', icon: Building2, path: '/admin/hr?tab=departments' },
      { label: 'Posisi', icon: Briefcase, path: '/admin/hr?tab=positions' },
      { label: 'Jadwal Kerja', icon: Calendar, path: '/admin/hr?tab=schedules' },
      { label: 'Perangkat', icon: Smartphone, path: '/admin/hr?tab=devices' },
      { label: 'Pengaturan HR', icon: Settings, path: '/admin/hr?tab=settings' },
    ]
  },
  {
    label: 'Support & Komunikasi',
    allowedRoles: ['super_admin', 'owner', 'branch_manager', 'sales', 'marketing', 'operational'],
    items: [
      { label: 'Tiket Support', icon: HeadphonesIcon, path: '/admin/support' },
      { label: 'WhatsApp', icon: MessageSquare, path: '/admin/whatsapp' },
      { label: 'Materi Promosi', icon: FileText, path: '/admin/marketing-materials' },
    ]
  },
  {
    label: 'Master Data',
    allowedRoles: ['super_admin', 'owner', 'branch_manager', 'operational'],
    items: [
      { label: 'Master Data', icon: Settings, path: '/admin/master-data' },
      { label: 'Cabang', icon: Building2, path: '/admin/branches' },
    ]
  },
  {
    label: 'Dokumen & Surat',
    allowedRoles: ['super_admin', 'owner', 'branch_manager', 'operational', 'equipment'],
    items: [
      { label: 'Verifikasi Dokumen', icon: FileCheck, path: '/admin/document-verification' },
      { label: 'Generate Surat', icon: FileText, path: '/admin/documents-generator' },
      { label: 'Konten Offline', icon: BookOpen, path: '/admin/offline-content' },
    ]
  },
  {
    label: 'Laporan',
    allowedRoles: ['super_admin', 'owner', 'finance', 'marketing', 'branch_manager', 'operational'],
    items: [
      { label: 'Laporan', icon: FileBarChart, path: '/admin/reports' },
      { label: 'Laporan Lanjutan', icon: TrendingUp, path: '/admin/advanced-reports' },
      { label: 'Laporan Terjadwal', icon: Calendar, path: '/admin/scheduled-reports' },
    ]
  },
  {
    label: 'Pengaturan',
    allowedRoles: ['super_admin', 'owner', 'branch_manager'],
    items: [
      { label: 'Users', icon: Shield, path: '/admin/users' },
      { label: 'Hak Akses', icon: KeyRound, path: '/admin/permissions' },
      { label: 'Security Audit', icon: ShieldCheck, path: '/admin/security' },
      { label: '2FA Settings', icon: Key, path: '/admin/2fa' },
      { label: 'Tampilan', icon: Palette, path: '/admin/appearance' },
      { label: 'Halaman Statis', icon: FileType, path: '/admin/static-pages' },
      { label: 'Testimoni', icon: Star, path: '/admin/testimonials' },
      { label: 'Pengaturan', icon: Settings, path: '/admin/settings' },
    ]
  },
];

export function AdminLayout() {
  const { user, profile, signOut, isAdmin, roles, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useAdminNotifications();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

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

      {/* Mobile/Tablet Header */}
      <header className="xl:hidden fixed top-0 left-0 right-0 h-16 bg-background border-b z-50 flex items-center justify-between px-4">
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <span className="font-semibold">Admin Panel</span>
        <div className="flex items-center gap-1">
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
            onClearAll={clearAll}
          />
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Sidebar - visible on xl+, togglable on mobile/tablet */}
      <aside className={cn(
        "fixed top-0 left-0 bottom-0 w-64 bg-background border-r z-40 transform transition-transform xl:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-6 border-b">
            <Link to="/admin" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
                U
              </div>
              <span className="font-semibold">UmrohTravel</span>
            </Link>
            <div className="hidden xl:flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
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
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
  {NAV_GROUPS.filter((group) => {
                // If no allowedRoles defined, show to all admin users
                if (!group.allowedRoles) return true;
                // Check if user has any of the allowed roles
                return group.allowedRoles.some(role => roles.includes(role as AppRole));
              }).map((group) => (
              <div key={group.label}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.path || 
                      (item.path !== '/admin' && location.pathname.startsWith(item.path));
                    
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm",
                          isActive 
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-muted"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Back to Website + User Info */}
          <div className="p-4 border-t space-y-3">
            <Button variant="outline" size="sm" className="w-full" asChild>
              <a href="/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Kembali ke Website
              </a>
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold">
                  {profile?.full_name?.charAt(0) || 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{profile?.full_name || 'Admin'}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile/tablet */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 xl:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="xl:pl-64 pt-16 xl:pt-6 min-h-screen transition-all duration-300">
        <div className="p-6">
          <AdminBreadcrumb />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
