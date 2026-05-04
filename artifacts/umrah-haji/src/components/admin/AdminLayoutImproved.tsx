'use client';

/**
 * AdminLayoutImproved - Versi Perbaikan UI/UX
 * Fokus pada: Menghilangkan gap, konsistensi warna, dan responsivitas total.
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
  User,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect, useMemo, lazy, Suspense, useCallback, useRef, memo } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const CommandPalette = lazy(() => import('./CommandPalette').then(m => ({ default: m.CommandPalette })));

// Memoized menu group component
const MenuGroupItem = memo(({ group, isExpanded, onToggle, isPathActive, onNavigate, isCollapsed }: any) => {
  if (isCollapsed) return null;

  return (
    <div className="space-y-1 animate-in fade-in duration-300 px-2">
      <button
        onClick={() => onToggle(group.name)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 group rounded-lg mb-1',
          isExpanded
            ? 'text-primary bg-primary/5'
            : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/50'
        )}
      >
        <span className="flex-1 text-left">{group.name}</span>
        <ChevronDown
          className={cn(
            'w-3 h-3 transition-transform duration-300 flex-shrink-0',
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
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden mb-0.5',
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
  );
});

MenuGroupItem.displayName = 'MenuGroupItem';

const DynamicIcon = ({ name, className }: { name?: string; className?: string }) => {
  const IconComponent = getMenuIcon(name);
  return <IconComponent className={className} />;
};

function AdminLayoutImproved() {
  const { user, profile, signOut } = useAuth();
  const { groupedMenus, isLoading: menusLoading } = useDynamicMenus();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [sidebarOpen, setSidebarOpen] = useState(false); 
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 1024);
  
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const savedState = localStorage.getItem('admin-sidebar-collapsed');
    if (savedState !== null && window.innerWidth >= 1024) {
      setSidebarCollapsed(JSON.parse(savedState));
    }
  }, []);

  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem('admin-sidebar-collapsed', JSON.stringify(sidebarCollapsed));
    }
  }, [sidebarCollapsed, isMobile]);

  useEffect(() => {
    const handleResize = () => {
      const isLargeScreen = window.innerWidth >= 1024;
      setIsMobile(!isLargeScreen);
      if (isLargeScreen) {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => setDebouncedSearchQuery(searchQuery), 150);
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
  }, [searchQuery]);

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

  const isGroupExpanded = useCallback((groupName: string) => expandedGroups.has(groupName), [expandedGroups]);
  const isPathActive = useCallback((path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    // Ensure exact match for sub-paths to avoid double highlighting (e.g., /admin/hr and /admin/hr/payroll)
    if (location.pathname === path) return true;
    // For parent paths, only highlight if it's a true parent and not another specific menu item
    return location.pathname.startsWith(path + '/');
  }, [location.pathname]);

  const handleNavigate = useCallback(() => { if (isMobile) setSidebarOpen(false); }, [isMobile]);

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

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen w-full bg-background overflow-hidden font-sans">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && isMobile && (
          <div
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar Container */}
        <aside
          className={cn(
            'fixed lg:relative inset-y-0 left-0 z-[70] bg-card border-r border-border transition-all duration-300 ease-in-out flex flex-col shadow-xl lg:shadow-none shrink-0',
            isMobile 
              ? cn('w-72', sidebarOpen ? 'translate-x-0' : '-translate-x-full') 
              : cn(sidebarCollapsed ? 'w-[80px]' : 'w-[280px]')
          )}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-border/50 bg-card sticky top-0 z-10 shrink-0">
            {(!sidebarCollapsed || isMobile) ? (
              <Link to="/admin" className="flex items-center gap-3 group overflow-hidden">
                <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center text-primary-foreground font-bold shadow-md shrink-0">
                  V
                </div>
                <div className="flex flex-col truncate">
                  <span className="font-bold text-sm tracking-tight leading-none">Vins Tour</span>
                  <span className="text-[10px] text-muted-foreground font-medium">Travel</span>
                </div>
              </Link>
            ) : (
              <div className="w-full flex justify-center">
                <Link to="/admin" className="w-9 h-9 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center text-primary-foreground font-bold shadow-md">
                  V
                </Link>
              </div>
            )}
            
            {!isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className={cn("h-8 w-8 hover:bg-muted transition-colors shrink-0", sidebarCollapsed ? "absolute -right-4 top-4 z-20 bg-card border border-border rounded-full shadow-sm hidden lg:flex" : "")}
              >
                <ChevronLeft className={cn("w-4 h-4 transition-transform duration-300", sidebarCollapsed ? 'rotate-180' : '')} />
              </Button>
            )}

            {isMobile && (
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="h-8 w-8">
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>

          {/* Sidebar Search */}
          {(!sidebarCollapsed || isMobile) && (
            <div className="px-4 py-3 shrink-0">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Cari menu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-muted/50 border-transparent h-9 text-xs focus-visible:ring-1 focus-visible:ring-primary/50 transition-all rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Sidebar Navigation */}
          <ScrollArea className="flex-1 px-2">
            <nav className="py-2 space-y-1">
              {menusLoading ? (
                <div className="space-y-3 px-2 py-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-9 w-full rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : (sidebarCollapsed && !isMobile) ? (
                <div className="flex flex-col items-center gap-2 py-2">
                  {filteredGroupedMenus.map((group) =>
                    group.items.map((item: any) => (
                      <Tooltip key={item.id}>
                        <TooltipTrigger asChild>
                          <Link
                            to={item.path}
                            onClick={handleNavigate}
                            className={cn(
                              'flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 group relative',
                              isPathActive(item.path)
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                            )}
                          >
                            <DynamicIcon name={item.icon} className="w-5 h-5" />
                            {isPathActive(item.path) && (
                              <div className="absolute -left-1 w-1 h-5 bg-primary rounded-r-full" />
                            )}
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-medium">{item.label}</TooltipContent>
                      </Tooltip>
                    ))
                  )}
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
                    isCollapsed={false}
                  />
                ))
              )}
            </nav>
          </ScrollArea>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-border/50 bg-muted/5 shrink-0">
            {(!sidebarCollapsed || isMobile) ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-card border border-border/50 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                    {profile?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate text-foreground">{profile?.full_name || 'Admin User'}</p>
                    <p className="text-[9px] text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-[10px] gap-1.5" onClick={() => navigate('/admin/settings')}>
                    <User className="w-3 h-3" /> Edit Profil
                  </Button>
                  <Button variant="destructive" size="sm" className="flex-1 h-8 text-[10px] gap-1.5" onClick={handleLogout}>
                    <LogOut className="w-3 h-3" /> Logout
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={() => navigate('/admin/settings')} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                      <User className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Edit Profil</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={handleLogout} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                      <LogOut className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Logout</TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Wrapper */}
        <div className="flex-1 flex flex-col min-w-0 bg-background relative h-full">
          {/* Top Header */}
          <header className="h-16 border-b border-border/50 bg-card/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-6 sticky top-0 z-50 shrink-0">
            <div className="flex items-center gap-3">
              {isMobile && (
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="h-9 w-9">
                  <Menu className="w-5 h-5" />
                </Button>
              )}
              <div className="hidden sm:block overflow-hidden">
                <AdminBreadcrumb />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Suspense fallback={<Skeleton className="h-8 w-32 rounded-lg" />}>
                <CommandPalette />
              </Suspense>
              <NotificationBell notifications={[]} unreadCount={0} onMarkAsRead={() => {}} onMarkAllAsRead={() => {}} onClearAll={() => {}} />
            </div>
          </header>

          {/* Page Body */}
          <main className="flex-1 overflow-y-auto bg-muted/20 custom-scrollbar p-4 lg:p-6">
            <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default AdminLayoutImproved;
