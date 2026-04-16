'use client';

/**
 * Enhanced AdminLayout dengan Dynamic Menu Integration
 * 
 * Fitur:
 * - Menu items diambil dari database secara dinamis
 * - Real-time sync ketika permission berubah
 * - Fallback ke hardcoded menu jika database tidak tersedia
 * - Support untuk menu grouping dan sorting
 * - UI/UX yang lebih bersih dan terorganisir
 */

import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDynamicMenus } from '@/hooks/useDynamicMenus';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { Button } from '@/components/ui/button';
import { NotificationBell } from './NotificationBell';
import { CommandPalette } from './CommandPalette';
import { AdminBreadcrumb } from './AdminBreadcrumb';
import * as LucideIcons from 'lucide-react';
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronDown,
  Loader2,
  Search,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

// Helper to render Lucide icon by name
const DynamicIcon = ({ name, className }: { name?: string; className?: string }) => {
  if (!name) return <LucideIcons.Circle className={className} />;
  const IconComponent = (LucideIcons as any)[name];
  if (!IconComponent) return <LucideIcons.Circle className={className} />;
  return <IconComponent className={className} />;
};

function AdminLayoutDynamic() {
  const { user, profile, signOut, isAdmin } = useAuth();
  const { groupedMenus, isLoading: menusLoading } = useDynamicMenus();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

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

  // Auto-expand group containing active path
  useEffect(() => {
    if (groupedMenus.length > 0) {
      const activeGroup = groupedMenus.find(group => 
        group.items.some(item => location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path)))
      );
      
      if (activeGroup) {
        setExpandedGroups(prev => {
          const next = new Set(prev);
          next.add(activeGroup.name);
          return next;
        });
      } else if (expandedGroups.size === 0) {
        // Default expand first group if nothing active
        setExpandedGroups(new Set([groupedMenus[0].name]));
      }
    }
  }, [groupedMenus, location.pathname]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  const isGroupExpanded = (groupName: string) => {
    return expandedGroups.has(groupName);
  };

  const isPathActive = (path: string) => {
    return (
      location.pathname === path ||
      (path !== '/admin' && location.pathname.startsWith(path))
    );
  };

  // Filter menus based on search query
  const filteredGroupedMenus = useMemo(() => {
    if (!searchQuery) return groupedMenus;
    
    return groupedMenus.map(group => ({
      ...group,
      items: group.items.filter(item => 
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(group => group.items.length > 0);
  }, [groupedMenus, searchQuery]);

  if (!user || !isAdmin()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Akses ditolak</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && !isDesktop && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 w-72 bg-card border-r border-border transition-all duration-300 ease-in-out flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-10">
          <Link to="/admin" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold group-hover:scale-110 transition-transform">
              U
            </div>
            <span className="font-bold text-xl tracking-tight">Umrah Magic</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => !isDesktop && setSidebarOpen(false)}
            className="lg:hidden hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Sidebar Search */}
        <div className="px-4 py-3 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50 border-none h-9 text-sm focus-visible:ring-1"
            />
          </div>
        </div>

        {/* Sidebar Content */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-6">
            {menusLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground animate-pulse">Memuat menu...</p>
              </div>
            ) : filteredGroupedMenus.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'Menu tidak ditemukan' : 'Tidak ada menu tersedia'}
                </p>
              </div>
            ) : (
              filteredGroupedMenus.map(group => (
                <div key={group.name} className="space-y-1">
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(group.name)}
                    className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest hover:text-foreground transition-colors group"
                  >
                    <span>{group.name}</span>
                    <ChevronDown
                      className={cn(
                        'w-3.5 h-3.5 transition-transform duration-300',
                        isGroupExpanded(group.name) ? 'rotate-180' : '-rotate-90 opacity-0 group-hover:opacity-100'
                      )}
                    />
                  </button>

                  {/* Group Items */}
                  <div className={cn(
                    "space-y-0.5 overflow-hidden transition-all duration-300",
                    isGroupExpanded(group.name) ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
                  )}>
                    {group.items.map(item => (
                      <Link
                        key={item.key}
                        to={item.path}
                        onClick={() => !isDesktop && setSidebarOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative',
                          isPathActive(item.path)
                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                        )}
                      >
                        <DynamicIcon 
                          name={item.icon} 
                          className={cn(
                            "w-4.5 h-4.5 flex-shrink-0 transition-transform group-hover:scale-110",
                            isPathActive(item.path) ? "text-primary-foreground" : "text-muted-foreground/70 group-hover:text-primary"
                          )} 
                        />
                        <span className="flex-1 truncate">{item.label}</span>
                        {isPathActive(item.path) && (
                          <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary-foreground/50" />
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              ))
            )}
          </nav>
        </ScrollArea>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border bg-card/50 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg bg-muted/30">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
              {profile?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{profile?.full_name || 'Admin User'}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="justify-center gap-2 text-xs h-9 border-muted-foreground/20 hover:bg-muted"
              onClick={() => setExpandedGroups(new Set())}
              title="Collapse All"
            >
              <Menu className="w-3.5 h-3.5" />
              Collapse
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="justify-center gap-2 text-xs h-9 shadow-sm"
              onClick={handleLogout}
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Bar */}
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-6 gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden hover:bg-muted"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="hidden sm:block">
              <AdminBreadcrumb />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center bg-muted/50 rounded-full px-1">
              <CommandPalette />
              <NotificationBell
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
                onClearAll={clearAll}
              />
            </div>
            
            <div className="h-8 w-[1px] bg-border mx-1 hidden sm:block" />
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="hidden sm:flex items-center gap-2 px-2 hover:bg-muted rounded-full"
              onClick={() => navigate('/admin/settings')}
            >
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                {profile?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
              </div>
              <Settings className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-muted/20">
          <div className="container mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminLayoutDynamic;
