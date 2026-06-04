import { lazy, Suspense } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Users, Wallet, BarChart3, Bell, Briefcase, ShoppingBag, Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const JamaahBottomNav = lazy(() =>
  import("@/components/jamaah/JamaahBottomNav").then((m) => ({ default: m.JamaahBottomNav }))
);

type NavItem = { to: string; icon: any; label: string };

const AGENT_ITEMS: NavItem[] = [
  { to: "/agent/dashboard", icon: Home, label: "Beranda" },
  { to: "/agent/jamaah", icon: Users, label: "Jamaah" },
  { to: "/agent/commissions", icon: Wallet, label: "Komisi" },
  { to: "/agent/laporan", icon: BarChart3, label: "Laporan" },
];

const CUSTOMER_ITEMS: NavItem[] = [
  { to: "/", icon: Home, label: "Beranda" },
  { to: "/packages", icon: ShoppingBag, label: "Paket" },
  { to: "/my-bookings", icon: Briefcase, label: "Booking" },
  { to: "/customer/wishlist", icon: Heart, label: "Wishlist" },
  { to: "/customer/notifications", icon: Bell, label: "Notif" },
];

function MobileBar({ items }: { items: NavItem[] }) {
  const { pathname } = useLocation();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur border-t flex justify-around items-center h-14 pb-[env(safe-area-inset-bottom)]">
      {items.map((it) => {
        const active = pathname === it.to || pathname.startsWith(it.to + "/");
        const Icon = it.icon;
        return (
          <Link
            key={it.to}
            to={it.to}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Role-aware mobile bottom navigation.
 * - jamaah / customer-with-active-booking → full JamaahBottomNav (rich sidebar+bottom)
 * - agent → simple agent bottom bar
 * - customer (default) → public customer bar
 * - admin / staff / super_admin → none (they use admin sidebar)
 */
export function RoleAwareBottomNav() {
  const { user, isAgent, isAdmin, isSuperAdmin, isStaff, hasRole } = useAuth();
  if (!user) return null;
  if (isAdmin() || isSuperAdmin() || isStaff()) return null;

  if (hasRole("jamaah" as any)) {
    return (
      <Suspense fallback={null}>
        <JamaahBottomNav />
      </Suspense>
    );
  }
  if (isAgent()) return <MobileBar items={AGENT_ITEMS} />;
  return <MobileBar items={CUSTOMER_ITEMS} />;
}

export default RoleAwareBottomNav;