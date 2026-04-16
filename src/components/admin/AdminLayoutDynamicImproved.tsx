'use client';

/**
 * Enhanced AdminLayout dengan Dynamic Menu Integration & Improved UI/UX
 * 
 * Fitur:
 * - Menu items diambil dari database secara dinamis
 * - Real-time sync ketika permission berubah
 * - Fallback ke hardcoded menu jika database tidak tersedia
 * - Support untuk menu grouping dan sorting
 * - UI/UX yang lebih bersih, responsif, dan modern
 * - Smooth animations dan better visual hierarchy
 * - Enhanced hover states dan active indicators
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
  Zap,
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

function AdminLayoutDynamicImproved() {
  const { user, profile, signOut, isAdmin } = useAuth();
  const { groupedMenus, isLoading: menusLoading } = useDynamicMenus();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

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
      } else if (expandedGroups.size === 0 && groupedMenus.length > 0) {
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
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 w-72 bg-card border-r border-border transition-all duration-300 ease-in-out flex flex-col shadow-lg lg:shadow-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Sidebar Header - Improved */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-border/50 bg-gradient-to-r from-card to-card/50 backdrop-blur-md sticky top-0 z-10">
          <Link to="/admin" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center text-primary-foreground font-bold group-hover:scale-110 transition-transform duration-200 shadow-md">
              U
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight leading-none">Umrah</span>
              <span className="text-[10px] text-muted-foreground font-medium">Magic</span>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => !isDesktop && setSidebarOpen(false)}
            className="lg:hidden hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Sidebar Search - Improved */}
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

        {/* Sidebar Content - Improved */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-4">
            {menusLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground animate-pulse">Memuat menu...</p>
              </div>
            ) : filteredGroupedMenus.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'Menu tidak ditemukan' : 'Tidak ada menu tersedia'}
                </p>
              </div>
            ) : (
              filteredGroupedMenus.map((group, groupIdx) => (
                <div key={group.name} className="space-y-1.5 animate-in fade-in duration-300" style={{ animationDelay: `${groupIdx * 50}ms` }}>
                  {/* Group Header - Improved */}
                  <button
                    onClick={() => toggleGroup(group.name)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-all duration-200 group rounded-lg',
                      isGroupExpanded(group.name)
                        ? 'text-primary bg-primary/5'
                        : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    <span className="flex-1 text-left">{group.name}</span>
                    <ChevronDown
                      className={cn(
                        'w-3.5 h-3.5 transition-transform duration-300 flex-shrink-0',
                        isGroupExpanded(group.name) ? 'rotate-180' : '-rotate-90'
                      )}
                    />
                  </button>

                  {/* Group Items - Improved */}
                  <div className={cn(
                    "space-y-0.5 overflow-hidden transition-all duration-300 ease-in-out",
                    isGroupExpanded(group.name) ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
                  )}>
                    {group.items.map((item, itemIdx) => {
                      const isActive = isPathActive(item.path);
                      const isHovered = hoveredItem === item.key;
                      
                      return (
                        <Link
                          key={item.key}
                          to={item.path}
                          onClick={() => !isDesktop && setSidebarOpen(false)}
                          onMouseEnter={() => setHoveredItem(item.key)}
                          onMouseLeave={() => setHoveredItem(null)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden',
                            isActive
                              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 translate-x-0'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                          )}
                          style={{ 
                            animationDelay: `${itemIdx * 30}ms`,
                            animation: isGroupExpanded(group.name) ? 'slideIn 0.3s ease-out forwards' : 'none'
                          }}
                        >
                          {/* Background gradient on hover */}
                          {!isActive && (
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                          )}
                          
                          {/* Icon */}
                          <DynamicIcon 
                            name={item.icon} 
                            className={cn(
                              "w-4.5 h-4.5 flex-shrink-0 transition-all duration-200",
                              isActive 
                                ? "text-primary-foreground" 
                                : "text-muted-foreground/70 group-hover:text-primary group-hover:scale-110"
                            )} 
                          />
                          
                          {/* Label */}
                          <span className="flex-1 truncate relative z-10">{item.label}</span>
                          
                          {/* Active Indicator */}
                          {isActive && (
                            <div className="absolute right-2 w-2 h-2 rounded-full bg-primary-foreground/60 animate-pulse" />
                          )}
                          
                          {/* Hover Indicator */}
                          {isHovered && !isActive && (
                            <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary/40 transition-all duration-200" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </nav>
        </ScrollArea>

        {/* Sidebar Footer - Improved */}
        <div className="p-4 border-t border-border/50 bg-gradient-to-t from-muted/20 to-transparent space-y-3">
          {/* User Info Card */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/40 border border-muted-foreground/10 transition-all hover:bg-muted/60">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
              {profile?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{profile?.full_name || 'Admin User'}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="justify-center gap-2 text-xs h-9 border-muted-foreground/20 hover:bg-muted/80 transition-all"
              onClick={() => navigate('/admin/settings')}
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pengaturan</span>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="justify-center gap-2 text-xs h-9 shadow-sm hover:shadow-md transition-all"
              onClick={handleLogout}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Bar - Improved */}
        <header className="h-16 border-b border-border/50 bg-card/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 lg:px-8 gap-4 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-4 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden hover:bg-muted transition-colors"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="hidden sm:block">
              <AdminBreadcrumb />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Command Palette & Notifications */}
            <div className="flex items-center bg-muted/30 rounded-full px-1 gap-1">
              <CommandPalette />
              <NotificationBell
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
                onClearAll={clearAll}
              />
            </div>
            
            <div className="h-8 w-[1px] bg-border/50 mx-1 hidden sm:block" />
            
            {/* User Settings Button */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="hidden sm:flex items-center gap-2 px-2 hover:bg-muted rounded-full transition-colors"
              onClick={() => navigate('/admin/settings')}
            >
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                {profile?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
              </div>
              <Settings className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
            </Button>
          </div>
        </header>

        {/* Page Content - Improved */}
        <main className="flex-1 overflow-auto bg-muted/10">
          <div className="container mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
            <Outlet />
          </div>
        </main>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

export default AdminLayoutDynamicImproved;
