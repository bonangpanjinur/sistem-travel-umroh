'use client';

/**
 * Enhanced AdminLayout dengan Dynamic Menu Integration
 * 
 * Fitur:
 * - Menu items diambil dari database secara dinamis
 * - Real-time sync ketika permission berubah
 * - Fallback ke hardcoded menu jika database tidak tersedia
 * - Support untuk menu grouping dan sorting
 */

import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDynamicMenus } from '@/hooks/useDynamicMenus';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { Button } from '@/components/ui/button';
import { NotificationBell } from './NotificationBell';
import { CommandPalette } from './CommandPalette';
import { AdminBreadcrumb } from './AdminBreadcrumb';
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

function AdminLayoutDynamic() {
  const { user, profile, signOut, isAdmin, roles } = useAuth();
  const { groupedMenus, isLoading: menusLoading } = useDynamicMenus();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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

  // Auto-expand first few groups on load
  useEffect(() => {
    if (groupedMenus.length > 0 && expandedGroups.size === 0) {
      const firstThreeGroups = groupedMenus.slice(0, 3).map(g => g.name);
      setExpandedGroups(new Set(firstThreeGroups));
    }
  }, [groupedMenus]);

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
    <div className="flex h-screen bg-background">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && !isDesktop && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          <Link to="/admin" className="font-bold text-lg">
            Umrah Magic
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => !isDesktop && setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Sidebar Content */}
        <ScrollArea className="flex-1">
          <nav className="space-y-1 p-4">
            {menusLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : groupedMenus.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Tidak ada menu tersedia
              </div>
            ) : (
              groupedMenus.map(group => (
                <div key={group.name} className="space-y-1">
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(group.name)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                  >
                    <span>{group.name}</span>
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 transition-transform',
                        isGroupExpanded(group.name) ? 'rotate-180' : ''
                      )}
                    />
                  </button>

                  {/* Group Items */}
                  {isGroupExpanded(group.name) && (
                    <div className="space-y-1">
                      {group.items.map(item => (
                        <Link
                          key={item.key}
                          to={item.path}
                          onClick={() => !isDesktop && setSidebarOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                            isPathActive(item.path)
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          )}
                        >
                          {item.icon && (
                            <span className="w-4 h-4 flex-shrink-0">
                              {item.icon}
                            </span>
                          )}
                          <span className="flex-1 truncate">{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </nav>
        </ScrollArea>

        {/* Sidebar Footer */}
        <div className="border-t border-border p-4 space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => setExpandedGroups(new Set())}
          >
            <Menu className="w-4 h-4" />
            Collapse All
          </Button>
          <Button
            variant="destructive"
            className="w-full justify-start gap-2"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <AdminBreadcrumb />
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onClearAll={clearAll}
            />
            <CommandPalette />
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {profile?.full_name || user?.email}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayoutDynamic;
