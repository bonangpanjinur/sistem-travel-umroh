'use client';

/**
 * AdminLayoutDynamicImproved — sidebar + topbar for all admin roles.
 *
 * Changes vs previous version:
 * - Super-admin gets a purple "Super Admin" badge in the profile footer
 * - Role badge shown for every staff role (highest-priority role)
 * - Sidebar groups are colour-coded per privilege tier
 * - Menus now cover ALL routes from the registry (expanded from 20 → 40+)
 * - Duplicate permission keys removed (rbac-status now has its own permission)
 */

import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { SettingsCategoryNav, type SettingsCategoryKey } from './SettingsCategoryNav';

const SETTINGS_PATH_TO_CATEGORY: Record<string, SettingsCategoryKey> = {
  '/admin/settings': 'umum',
  '/admin/document-settings': 'umum',
  '/admin/notification-settings': 'umum',
  '/admin/appearance': 'appearance',
  '/admin/users': 'access',
  '/admin/roles': 'access',
  '/admin/dashboard-access': 'access',
  '/admin/rbac-tools': 'access',
  '/admin/rbac-status': 'access',
  '/admin/access-simulator': 'access',
  '/admin/api-connect': 'integration',
  '/admin/webhooks': 'integration',
  '/admin/email-templates': 'integration',
  '/admin/push-notifications': 'integration',
  '/admin/2fa': 'security',
  '/admin/security-audit': 'security',
  '/admin/activity-log': 'security',
  '/admin/supabase-setup': 'backend',
};
import { useAuth } from '@/hooks/useAuth';
import { useDynamicMenus } from '@/hooks/useDynamicMenus';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { Button } from '@/components/ui/button';
import { NotificationBell } from './NotificationBell';
import { AdminBreadcrumb } from './AdminBreadcrumb';
import { getMenuIcon } from '@/lib/admin-menu-icons';
import { prefetchAdminPath } from '@/lib/adminRoutePrefetch';
import { ROLE_LABELS } from '@/lib/constants';
import {
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Search,
  User,
  Shield,
  Moon,
  Sun,
  Smartphone,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useMemo, lazy, Suspense, useCallback, useRef, memo } from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

const CommandPalette = lazy(() => import('./CommandPalette').then(m => ({ default: m.CommandPalette })));

// ─── Role badge colour map ───────────────────────────────────────────────────
const ROLE_BADGE_CLASSES: Record<string, string> = {
  super_admin:    'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300',
  owner:          'bg-amber-100  text-amber-700  border-amber-300  dark:bg-amber-950  dark:text-amber-300',
  branch_manager: 'bg-blue-100   text-blue-700   border-blue-300   dark:bg-blue-950   dark:text-blue-300',
  finance:        'bg-green-100  text-green-700  border-green-300  dark:bg-green-950  dark:text-green-300',
  sales:          'bg-sky-100    text-sky-700    border-sky-300    dark:bg-sky-950    dark:text-sky-300',
  marketing:      'bg-pink-100   text-pink-700   border-pink-300   dark:bg-pink-950   dark:text-pink-300',
  operational:    'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-300',
  equipment:      'bg-stone-100  text-stone-700  border-stone-300  dark:bg-stone-950  dark:text-stone-300',
  agent:          'bg-teal-100   text-teal-700   border-teal-300   dark:bg-teal-950   dark:text-teal-300',
};

// ─── Memoised menu group row ─────────────────────────────────────────────────
const MenuGroupItem = memo(({ group, isExpanded, onToggle, isPathActive, onNavigate }: {
  group: { name: string; items: any[] };
  isExpanded: boolean;
  onToggle: (name: string) => void;
  isPathActive: (path: string) => boolean;
  onNavigate: () => void;
}) => (
  <div className="space-y-0.5">
    <button
      onClick={() => onToggle(group.name)}
      className={cn(
        'w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors rounded-md',
        isExpanded
          ? 'text-primary'
          : 'text-muted-foreground/60 hover:text-foreground'
      )}
      aria-expanded={isExpanded}
    >
      <span className="flex-1 text-left">{group.name}</span>
      <ChevronDown
        className={cn(
          'w-3 h-3 transition-transform duration-200 flex-shrink-0',
          isExpanded ? 'rotate-0' : '-rotate-90'
        )}
      />
    </button>

    <AnimatePresence initial={false}>
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="min-h-0 space-y-0.5 pl-1 pb-1">
            {group.items.map((item: any) => {
              const active = isPathActive(item.path);
              const IconComp = getMenuIcon(item.icon);
              return (
                <Link
                  key={item.id ?? item.key}
                  to={item.path}
                  onClick={onNavigate}
                  onMouseEnter={() => prefetchAdminPath(item.path)}
                  onFocus={() => prefetchAdminPath(item.path)}
                  onTouchStart={() => prefetchAdminPath(item.path)}
                  className={cn(
                    'flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-md text-sm font-medium transition-all duration-150 group relative',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-foreground/70 hover:text-foreground hover:bg-muted/70'
                  )}
                >
                  <IconComp
                    className={cn(
                      'w-4 h-4 flex-shrink-0',
                      active ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                    )}
                  />
                  <span className="flex-1 truncate text-[13px]">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
));
MenuGroupItem.displayName = 'MenuGroupItem';

// ─── Main layout ─────────────────────────────────────────────────────────────
function AdminLayoutDynamicImproved() {
  const { user, profile, roles, signOut, hasRole } = useAuth();
  const { groupedMenus, isLoading: menusLoading } = useDynamicMenus();
  const { getSetting } = useCompanySettings();
  const adminNotifications = useAdminNotifications();
  const { isDark, toggle: toggleDark } = useDarkMode();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' && window.innerWidth >= 1024
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Company branding
  const companyInfo   = getSetting('company_info') || {};
  const companyName   = (companyInfo as any)?.name   || 'Admin Panel';
  const companyTagline = (companyInfo as any)?.tagline || 'Travel Management';
  const companyLogo   = (companyInfo as any)?.logo_url;

  // Derived role info
  const isSuperAdmin  = hasRole('super_admin');
  const primaryRole   = roles[0] ?? '';           // highest-priority role
  const roleLabel     = ROLE_LABELS[primaryRole] ?? primaryRole;
  const roleBadgeClass = ROLE_BADGE_CLASSES[primaryRole] ?? 'bg-muted text-muted-foreground border-border';

  // Responsive sidebar
  useEffect(() => {
    const onResize = () => {
      const wide = window.innerWidth >= 1024;
      setIsDesktop(wide);
      if (!wide) setSidebarOpen(false);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(searchQuery), 150);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  // Auto-expand active group; initialise all groups expanded on first load
  useEffect(() => {
    if (!groupedMenus.length) return;
    setExpandedGroups(prev => {
      if (prev.size === 0) {
        // First render: expand every group so no menu is hidden
        return new Set(groupedMenus.map(g => g.name));
      }
      // On navigation: ensure the group containing the active route stays expanded
      const active = groupedMenus.find(g =>
        g.items.some(i =>
          location.pathname === i.path ||
          (i.path !== '/admin' && location.pathname.startsWith(i.path + '/'))
        )
      );
      if (active && !prev.has(active.name)) {
        return new Set([...prev, active.name]);
      }
      return prev;
    });
  }, [groupedMenus, location.pathname]);

  const handleLogout   = useCallback(async () => { await signOut(); navigate('/'); }, [signOut, navigate]);
  const toggleGroup    = useCallback((name: string) => setExpandedGroups(prev => {
    const next = new Set(prev);
    next.has(name) ? next.delete(name) : next.add(name);
    return next;
  }), []);
  const isGroupExpanded = useCallback((name: string) => expandedGroups.has(name), [expandedGroups]);
  const isPathActive    = useCallback((path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  }, [location.pathname]);
  const handleNavigate  = useCallback(() => { if (!isDesktop) setSidebarOpen(false); }, [isDesktop]);

  // Filter by search
  const filteredGroups = useMemo(() => {
    if (!debouncedQuery) return groupedMenus;
    const q = debouncedQuery.toLowerCase();
    return groupedMenus
      .map(g => ({ ...g, items: g.items.filter(i => i.label.toLowerCase().includes(q) || g.name.toLowerCase().includes(q)) }))
      .filter(g => g.items.length > 0);
  }, [groupedMenus, debouncedQuery]);

  const totalResults = useMemo(() => filteredGroups.reduce((s, g) => s + g.items.length, 0), [filteredGroups]);
  const userInitial   = (profile?.full_name || user?.email || 'A').charAt(0).toUpperCase();

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && !isDesktop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <aside className={cn(
        'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform duration-300 ease-in-out flex flex-col shadow-lg lg:shadow-none',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>

        {/* Sidebar header — branding */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border/50">
          <Link to="/admin" className="flex items-center gap-2.5 group min-w-0 flex-1">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={companyName}
                className="w-9 h-9 rounded-lg object-cover border border-border/50 group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center text-primary-foreground font-bold text-base group-hover:scale-105 transition-transform shadow-sm flex-shrink-0">
                {companyName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm tracking-tight leading-tight truncate">{companyName}</span>
              <span className="text-[10px] text-muted-foreground font-medium truncate">{companyTagline}</span>
            </div>
          </Link>
          <Button
            variant="ghost" size="icon"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden hover:bg-muted h-8 w-8 flex-shrink-0"
            aria-label="Tutup sidebar"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Super admin banner */}
        {isSuperAdmin && (
          <div className="mx-3 mt-2 px-3 py-1.5 rounded-md bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300">Super Admin — Akses Penuh</span>
          </div>
        )}

        {/* Search */}
        <div className="px-3 py-2.5 border-b border-border/30 mt-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari menu... (Ctrl+K)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-8 bg-muted/40 border-transparent h-8 text-xs focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:bg-background"
              aria-label="Cari menu"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {debouncedQuery && (
            <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
              {totalResults} menu ditemukan
            </p>
          )}
        </div>

        {/* Menu list */}
        <ScrollArea className="flex-1 px-2 py-2">
          <nav className="space-y-2">
            {menusLoading ? (
              <div className="space-y-3 px-1 py-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-7 w-full" />
                    <Skeleton className="h-7 w-full" />
                  </div>
                ))}
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-10 px-4">
                <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  {debouncedQuery ? 'Menu tidak ditemukan' : 'Tidak ada menu tersedia'}
                </p>
              </div>
            ) : (
              filteredGroups.map(group => (
                <MenuGroupItem
                  key={group.name}
                  group={group}
                  isExpanded={isGroupExpanded(group.name) || !!debouncedQuery}
                  onToggle={toggleGroup}
                  isPathActive={isPathActive}
                  onNavigate={handleNavigate}
                />
              ))
            )}
          </nav>
        </ScrollArea>

        {/* Profile footer */}
        <div className="p-2 border-t border-border/50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted/70 transition-colors group">
                {/* Avatar */}
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border flex-shrink-0',
                  isSuperAdmin
                    ? 'bg-gradient-to-br from-purple-500 to-purple-700 text-white border-purple-400'
                    : 'bg-gradient-to-br from-primary/20 to-primary/10 text-primary border-primary/20'
                )}>
                  {userInitial}
                </div>

                {/* Name + role badge */}
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-semibold truncate text-foreground leading-tight">
                    {profile?.full_name || 'Admin User'}
                  </p>
                  {roleLabel && (
                    <span className={cn(
                      'inline-flex items-center text-[9px] font-semibold px-1.5 py-0 rounded border leading-4 mt-0.5',
                      roleBadgeClass
                    )}>
                      {roleLabel}
                    </span>
                  )}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" side="top" className="w-60">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold leading-none">{profile?.full_name || 'Admin User'}</p>
                  <p className="text-xs text-muted-foreground leading-none">{user?.email}</p>
                  {roleLabel && (
                    <span className={cn(
                      'inline-flex self-start items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-1',
                      roleBadgeClass
                    )}>
                      {isSuperAdmin && <Shield className="w-2.5 h-2.5 mr-1" />}
                      {roleLabel}
                    </span>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/admin/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Pengaturan</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/admin/pwa-settings')}>
                <Smartphone className="mr-2 h-4 w-4" />
                <span>Aplikasi (PWA)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/customer/settings')}>
                <User className="mr-2 h-4 w-4" />
                <span>Profil Saya</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Keluar</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

        {/* Top header */}
        <header className="h-14 border-b border-border/50 bg-card/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost" size="icon"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden hover:bg-muted h-9 w-9"
              aria-label="Buka menu"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="hidden md:block min-w-0">
              <AdminBreadcrumb />
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-2">
            {/* Role badge in topbar (desktop) */}
            {roleLabel && (
              <span className={cn(
                'hidden lg:inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                roleBadgeClass
              )}>
                {isSuperAdmin && <Shield className="w-2.5 h-2.5 mr-1" />}
                {roleLabel}
              </span>
            )}
            <Suspense fallback={<Skeleton className="h-9 w-9 rounded-md" />}>
              <CommandPalette />
            </Suspense>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDark}
              className="h-9 w-9"
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <NotificationBell
              notifications={adminNotifications.notifications}
              unreadCount={adminNotifications.unreadCount}
              onMarkAsRead={adminNotifications.markAsRead}
              onMarkAllAsRead={adminNotifications.markAllAsRead}
              onClearAll={adminNotifications.clearAll}
            />
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto bg-muted/30 custom-scrollbar">
          <div className="container mx-auto p-4 lg:p-6 animate-in fade-in duration-300">
            {SETTINGS_PATH_TO_CATEGORY[location.pathname] && (
              <SettingsCategoryNav category={SETTINGS_PATH_TO_CATEGORY[location.pathname]} />
            )}
            <Suspense
              key={location.pathname}
              fallback={
                <div className="flex items-center justify-center min-h-[60vh]">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminLayoutDynamicImproved;
