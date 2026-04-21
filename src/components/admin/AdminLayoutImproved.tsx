'use client';

/**
 * Improved AdminLayout dengan Sidebar Toggle & Responsive Design
 * Menggunakan SidebarProvider untuk state management yang lebih robust
 * dan fitur collapse/expand yang lebih baik di desktop
 */

import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDynamicMenus } from '@/hooks/useDynamicMenus';
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
  ChevronLeft,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect, useMemo, lazy, Suspense, useCallback, useRef, memo } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

const CommandPalette = lazy(() => import('./CommandPalette').then(m => ({ default: m.CommandPalette })));

// Memoized menu group component to prevent unnecessary re-renders
const MenuGroupItem = memo(({ group, isExpanded, onToggle, isPathActive, onNavigate }: any) => (
  <div className="space-y-1.5 animate-in fade-in duration-300">
    <button
      onClick={() => onToggle(group.name)}
      className={cn(
        'w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-widest transition-all duration-200 group rounded-lg',
        isExpanded
          ? 'text-primary bg-primary/5'
          : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/50'
      )}
    >
      <span className="flex-1 text-left">{group.name}</span>
      <ChevronDown
        className={cn(
          'w-3.5 h-3.5 transition-transform duration-300 flex-shrink-0',
          isExpanded ? 'rotate-180' : '-rotate-90'
        )}
      />
    </button>

    <div className={cn(
      "space-y-0.5 overflow-hidden transition-all duration-300 ease-in-out grid",
      isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"
    )}>
      <div className="min-h-0">
        {group.items.map((item: any) => (
          <Link
            key={item.id}
            to={item.path}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden',
              isPathActive(item.path)
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
            )}
          >
            <DynamicIcon
              name={item.icon}
              className={cn(
                'w-4 h-4 flex-shrink-0 transition-all duration-200',
                isPathActive(item.path)
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground/70 group-hover:text-primary group-hover:scale-110'
              )}
            />
            <span className="flex-1 truncate relative z-10">{item.label}</span>
            {isPathActive(item.path) && (
              <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary-foreground/60" />
            )}
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

function AdminLayoutImproved() {
  const { user, profile, signOut } = useAuth();
  const { groupedMenus, isLoading: menusLoading } = useDynamicMenus();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Sidebar state management
  const [sidebarOpen, setSidebarOpen] = useState(true); // Desktop: always true, Mobile: toggle
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Desktop collapse mode
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 1024);
  
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load sidebar state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('admin-sidebar-collapsed');
    if (savedState !== null) {
      setSidebarCollapsed(JSON.parse(savedState));
    }
  }, []);

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('admin-sidebar-collapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Handle responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      const isLargeScreen = window.innerWidth >= 1024;
      setIsMobile(!isLargeScreen);
      // On mobile, close sidebar when resizing to mobile view
      if (!isLargeScreen) setSidebarOpen(false);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Debounce search query (150ms)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 150);
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
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
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  // Filter menus based on debounced search query
  const filteredGroupedMenus = useMemo(() => {
    if (!debouncedSearchQuery) return groupedMenus;
    
    return groupedMenus.map(group => ({
      ...group,
      items: group.items.filter(item => 
        item.label.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        group.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      )
    })).filter(group => group.items.length > 0);
  }, [groupedMenus, debouncedSearchQuery]);

  // Determine sidebar width based on state
  const sidebarWidth = isMobile ? 'w-72' : sidebarCollapsed ? 'w-20' : 'w-72';
  const mainContentMargin = isMobile ? '' : sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72';

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 bg-card border-r border-border transition-all duration-300 ease-in-out flex flex-col shadow-lg lg:shadow-none',
          isMobile ? 'w-72' : sidebarCollapsed ? 'w-20' : 'w-72',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Sidebar Header */}
        <div className={cn(
          'flex items-center justify-between h-16 px-6 border-b border-border/50 bg-gradient-to-r from-card to-card/50 backdrop-blur-md sticky top-0 z-10',
          sidebarCollapsed && !isMobile ? 'px-3' : ''
        )}>
          {!sidebarCollapsed || isMobile ? (
            <Link to="/admin" className="flex items-center gap-3 group">
              <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center text-primary-foreground font-bold group-hover:scale-110 transition-transform duration-200 shadow-md flex-shrink-0">
                V
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight leading-none">Vins Tour</span>
                <span className="text-[10px] text-muted-foreground font-medium">Travel</span>
              </div>
            </Link>
          ) : (
            <Link to="/admin" className="flex items-center justify-center w-9 h-9 bg-gradient-to-br from-primary to-primary/80 rounded-lg text-primary-foreground font-bold group-hover:scale-110 transition-transform duration-200 shadow-md">
              V
            </Link>
          )}
          
          <div className="flex items-center gap-1">
            {!isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hover:bg-muted transition-colors"
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <ChevronLeft className={cn("w-5 h-5 transition-transform", sidebarCollapsed ? 'rotate-180' : '')} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => !isMobile && setSidebarOpen(false)}
              className="lg:hidden hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Sidebar Search - Hidden when collapsed on desktop */}
        {(!sidebarCollapsed || isMobile) && (
          <div className="px-4 py-3 border-b border-border/30 bg-muted/20">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Cari menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-muted/50 border-muted-foreground/20 h-9 text-sm focus-visible:ring-1 focus-visible:ring-primary/50 transition-all"
              />
            </div>
          </div>
        )}

        {/* Sidebar Content */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-4">
            {menusLoading ? (
              <div className="space-y-3 px-1 py-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ))}
              </div>
            ) : sidebarCollapsed && !isMobile ? (
              // Collapsed view - show only icons
              <div className="space-y-2">
                {filteredGroupedMenus.map((group) =>
                  group.items.map((item: any) => (
                    <Link
                      key={item.id}
                      to={item.path}
                      onClick={handleNavigate}
                      className={cn(
                        'flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200 group relative',
                        isPathActive(item.path)
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                      )}
                      title={item.label}
                    >
                      <DynamicIcon
                        name={item.icon}
                        className={cn(
                          'w-5 h-5 transition-all duration-200',
                          isPathActive(item.path)
                            ? 'text-primary-foreground'
                            : 'text-muted-foreground/70 group-hover:text-primary'
                        )}
                      />
                    </Link>
                  ))
                )}
              </div>
            ) : filteredGroupedMenus.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {debouncedSearchQuery ? 'Menu tidak ditemukan' : 'Tidak ada menu tersedia'}
                </p>
              </div>
            ) : (
              filteredGroupedMenus.map((group) => (
                <MenuGroupItem
                  key={group.name}
                  group={group}
                  isExpanded={isGroupExpanded(group.name)}
                  onToggle={toggleGroup}
                  isPathActive={isPathActive}
                  onNavigate={handleNavigate}
                />
              ))
            )}
          </nav>
        </ScrollArea>

        {/* Sidebar Footer - Hidden when collapsed on desktop */}
        {(!sidebarCollapsed || isMobile) && (
          <div className="p-4 border-t border-border/50 bg-muted/10 space-y-3">
            {/* User Profile Summary */}
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-card border border-border/50 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20 flex-shrink-0">
                {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-foreground">
                  {profile?.full_name || 'Admin User'}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs gap-2 border-border/50 hover:bg-muted transition-all"
                onClick={() => navigate('/admin/settings')}
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pengaturan</span>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="h-9 text-xs gap-2 shadow-sm hover:shadow-destructive/20 transition-all"
                onClick={handleLogout}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className={cn("flex-1 flex flex-col min-w-0 overflow-hidden relative transition-all duration-300", mainContentMargin)}>
        {/* Top Header */}
        <header className="h-16 border-b border-border/50 bg-card/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden hover:bg-muted transition-colors"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="hidden md:block">
              <AdminBreadcrumb />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <Suspense fallback={<Skeleton className="h-9 w-9 rounded-md" />}>
              <CommandPalette />
            </Suspense>
            <NotificationBell 
              notifications={[]} 
              unreadCount={0} 
              onMarkAsRead={() => {}} 
              onMarkAllAsRead={() => {}} 
              onClearAll={() => {}} 
            />
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto bg-muted/30 custom-scrollbar">
          <div className="container mx-auto p-4 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminLayoutImproved;
