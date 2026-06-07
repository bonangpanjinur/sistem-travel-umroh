import { Outlet, Link, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAgentNotifications } from "@/hooks/useAgentNotifications";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AgentNotificationBell } from "@/components/agent/AgentNotificationBell";
import { 
  Home, Users, DollarSign, Package, UserCog,
  Menu, X, LogOut, Wallet, Globe, Zap, Network, Crown, Link2,
  Trophy, Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  agentOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard",          href: "/agent",              icon: Home },
  { label: "Keanggotaan",        href: "/agent/membership",   icon: Crown },
  { label: "Daftarkan Jamaah",   href: "/agent/register",     icon: UserCog },
  { label: "Data Jamaah",        href: "/agent/jamaah",       icon: UserCog },
  { label: "Paket Tersedia",     href: "/agent/packages",     icon: Package },
  { label: "Digital Kit",        href: "/agent/digital-kit",  icon: Zap },
  { label: "Referral & Booking", href: "/agent/referrals",    icon: Link2 },
  // Hanya agen utama (bukan sub_agent)
  { label: "Target Bulanan",     href: "/agent/targets",      icon: Target,   agentOnly: true },
  { label: "Leaderboard",        href: "/agent/leaderboard",  icon: Trophy,   agentOnly: true },
  { label: "CRM Pipeline Lead",  href: "/agent/leads",        icon: Users,    agentOnly: true },
  { label: "Komisi",             href: "/agent/commissions",  icon: DollarSign, agentOnly: true },
  { label: "Dompet",             href: "/agent/wallet",       icon: Wallet,   agentOnly: true },
  { label: "Laporan Bulanan",    href: "/agent/laporan",      icon: Target,   agentOnly: true },
  { label: "Broadcast WA",       href: "/agent/broadcast",    icon: Zap,      agentOnly: true },
  { label: "Link Pendaftaran",   href: "/agent/unique-link",  icon: Link2,    agentOnly: true },
  { label: "Jaringan Sub Agen",  href: "/agent/network",      icon: Network,  agentOnly: true },
  { label: "Website Saya",       href: "/agent/website",      icon: Globe,    agentOnly: true },
];

export default function AgentLayoutEnhanced() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, signOut, hasRole, isLoading } = useAuth();

  // Get agent ID for notifications
  const { data: agentData } = useQuery({
    queryKey: ['agent-profile', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user!.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Setup notifications
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useAgentNotifications(agentData?.id);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const isSubAgent = hasRole('sub_agent') && !hasRole('agent');

  if (!user || (!hasRole('agent') && !hasRole('sub_agent'))) {
    return <Navigate to="/auth/login" replace />;
  }

  const visibleNavItems = isSubAgent
    ? navItems.filter((item) => !item.agentOnly)
    : navItems;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
          <Menu className="h-6 w-6" />
        </Button>
        <span className="font-semibold">Agent Portal</span>
        <AgentNotificationBell
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onClearAll={clearAll}
        />
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 bg-card border-r transform transition-transform lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between p-4 border-b">
          <span className="font-bold text-lg">Agent Portal</span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="p-4 space-y-2">
          {isSubAgent && (
            <p className="text-xs text-muted-foreground px-3 pb-1 font-medium uppercase tracking-wide">
              Sub-Agen Portal
            </p>
          )}
          {visibleNavItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                location.pathname === item.href
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2">
            <Home className="h-4 w-4" />
            Kembali ke Home
          </Link>
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 p-6">
        {/* Desktop Header with Notifications */}
        <div className="hidden lg:flex items-center justify-end mb-6">
          <AgentNotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
            onClearAll={clearAll}
          />
        </div>
        
        <Outlet />
      </main>
    </div>
  );
}
