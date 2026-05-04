'use client';

/**
 * Enhanced AdminLayout dengan Dynamic Menu Integration & Improved UI/UX
 * - Hapus redundansi: footer settings/logout → masuk ke profile dropdown
 * - Logo & nama dari company settings (bukan hardcoded)
 * - Notification bell pakai hook real (bukan props kosong)
 * - Search lebih informatif (hint Ctrl+K, hasil count)
 * - Icon clash diperbaiki, group naming lebih konsisten
 */

import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDynamicMenus } from '@/hooks/useDynamicMenus';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { Button } from '@/components/ui/button';
import { NotificationBell } from './NotificationBell';
import { AdminBreadcrumb } from './AdminBreadcrumb';
import { getMenuIcon } from '@/lib/admin-menu-icons';
import {
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Search,
  User,
  Command,
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
import { useState, useEffect, useMemo, lazy, Suspense, useCallback, useRef, memo } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const CommandPalette = lazy(() => import('./CommandPalette').then(m => ({ default: m.CommandPalette })));

// Memoized menu group component to prevent unnecessary re-renders
const MenuGroupItem = memo(({ group, isExpanded, onToggle, isPathActive, onNavigate }: any) => (
  <div className="space-y-1">
    <button
      onClick={() => onToggle(group.name)}
      className={cn(
        'w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors rounded-md',
        isExpanded
          ? 'text-primary'
          : 'text-muted-foreground/70 hover:text-foreground'
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

    <div className={cn(
      "overflow-hidden transition-all duration-200 grid",
      isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"
    )}>
      <div className="min-h-0 space-y-0.5">
        {group.items.map((item: any) => (
          <Link
            key={item.id}
            to={item.path}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 pl-3 pr-2 py-2 rounded-md text-sm font-medium transition-all duration-150 group relative',
              isPathActive(item.path)
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground/70 hover:text-foreground hover:bg-muted/70'
            )}
          >
            <DynamicIcon
              name={item.icon}
              className={cn(
                'w-4 h-4 flex-shrink-0',
                isPathActive(item.path)
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground group-hover:text-foreground'
              )}
            />
            <span className="flex-1 truncate">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  </div>
));

MenuGroupItem.displayName = 'MenuGroupItem';

// Helper to render Lucide icon by name (uses tree-shaken registry)
const DynamicIcon = ({ name, className }: { name?: string; className?: string }) => {
  const IconComponent = getMenuIcon(name);
  return <IconComponent className={className} />;
};

function AdminLayoutDynamicImproved() {
  const { user, profile, signOut } = useAuth();
  const { groupedMenus, isLoading: menusLoading } = useDynamicMenus();
  const { getSetting } = useCompanySettings();
  const adminNotifications = useAdminNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' && window.innerWidth >= 1024);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Company branding (dynamic dari settings)
  const companyInfo = getSetting('company_info') || {};
  const companyName = companyInfo?.name || 'Admin Panel';
  const companyTagline = companyInfo?.tagline || 'Travel Management';
  const companyLogo = companyInfo?.logo_url;

  // Handle responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      const isLargeScreen = window.innerWidth >= 1024;
      setIsDesktop(isLargeScreen);
      if (!isLargeScreen) setSidebarOpen(false);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Debounce search query (150ms)
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => setDebouncedSearchQuery(searchQuery), 150);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery]);

  // Auto-expand group containing active path
  useEffect(() => {
    if (groupedMenus.length === 0) return;

    const activeGroup = groupedMenus.find(group =>
      group.items.some(item => location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path)))
    );

    if (activeGroup) {
      setExpandedGroups(prev => {
        if (prev.has(activeGroup.name)) return prev;
        const next = new Set(prev);
        next.add(activeGroup.name);
        return next;
      });
    } else {
      setExpandedGroups(prev => {
        if (prev.size > 0) return prev;
        return new Set([groupedMenus[0].name]);
      });
    }
  }, [groupedMenus, location.pathname]);

  const handleLogout = useCallback(async () => {
    await signOut();
    navigate('/');
  }, [signOut, navigate]);

  const toggleGroup = useCallback((groupName: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  }, []);

  const isGroupExpanded = useCallback(
    (groupName: string) => expandedGroups.has(groupName),
    [expandedGroups]
  );

  const isPathActive = useCallback((path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  const handleNavigate = useCallback(() => {
    if (!isDesktop) setSidebarOpen(false);
  }, [isDesktop]);

  // Filter menus based on debounced search query
  const filteredGroupedMenus = useMemo(() => {
    if (!debouncedSearchQuery) return groupedMenus;
    const q = debouncedSearchQuery.toLowerCase();
    return groupedMenus.map(group => ({
      ...group,
      items: group.items.filter(item =>
        item.label.toLowerCase().includes(q) ||
        group.name.toLowerCase().includes(q)
      )
    })).filter(group => group.items.length > 0);
  }, [groupedMenus, debouncedSearchQuery]);

  // Total filtered results count
  const totalResults = useMemo(
    () => filteredGroupedMenus.reduce((sum, g) => sum + g.items.length, 0),
    [filteredGroupedMenus]
  );

  const userInitial = (profile?.full_name || user?.email || 'A').charAt(0).toUpperCase();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && !isDesktop && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform duration-300 ease-in-out flex flex-col shadow-lg lg:shadow-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Sidebar Header — dynamic branding */}
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
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden hover:bg-muted h-8 w-8 flex-shrink-0"
            aria-label="Tutup sidebar"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Sidebar Search */}
        <div className="px-3 py-2.5 border-b border-border/30">
          <div className="relative group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
          {debouncedSearchQuery && (
            <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
              {totalResults} hasil ditemukan
            </p>
          )}
        </div>

        {/* Sidebar Content */}
        <ScrollArea className="flex-1 px-2 py-3">
          <nav className="space-y-3">
            {menusLoading ? (
              <div className="space-y-3 px-1 py-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-7 w-full" />
                    <Skeleton className="h-7 w-full" />
                  </div>
                ))}
              </div>
            ) : filteredGroupedMenus.length === 0 ? (
              <div className="text-center py-10 px-4">
                <div className="w-10 h-10 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Search className="w-5 h-5 text-muted-foreground/50" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {debouncedSearchQuery ? 'Menu tidak ditemukan' : 'Tidak ada menu tersedia'}
                </p>
              </div>
            ) : (
              filteredGroupedMenus.map((group) => (
                <MenuGroupItem
                  key={group.name}
                  group={group}
                  isExpanded={isGroupExpanded(group.name) || !!debouncedSearchQuery}
                  onToggle={toggleGroup}
                  isPathActive={isPathActive}
                  onNavigate={handleNavigate}
                />
              ))
            )}
          </nav>
        </ScrollArea>

        {/* Sidebar Footer — single profile dropdown (no redundant buttons) */}
        <div className="p-2 border-t border-border/50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted/70 transition-colors group">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-sm border border-primary/20 flex-shrink-0">
                  {userInitial}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-semibold truncate text-foreground leading-tight">
                    {profile?.full_name || 'Admin User'}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate leading-tight">
                    {user?.email}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-0.5">
                  <p className="text-sm font-medium leading-none">{profile?.full_name || 'Admin User'}</p>
                  <p className="text-xs text-muted-foreground leading-none mt-1">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/admin/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Pengaturan</span>
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <header className="h-14 border-b border-border/50 bg-card/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
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
            <Suspense fallback={<Skeleton className="h-9 w-9 rounded-md" />}>
              <CommandPalette />
            </Suspense>
            <NotificationBell
              notifications={adminNotifications.notifications}
              unreadCount={adminNotifications.unreadCount}
              onMarkAsRead={adminNotifications.markAsRead}
              onMarkAllAsRead={adminNotifications.markAllAsRead}
              onClearAll={adminNotifications.clearAll}
            />
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto bg-muted/30 custom-scrollbar">
          <div className="container mx-auto p-4 lg:p-6 animate-in fade-in duration-300">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminLayoutDynamicImproved;
