import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, BookOpen, Heart, Bell, User, Compass, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { JamaahAppShell } from "@/components/jamaah/shell/JamaahAppShell";
import { usePWAMode } from "@/hooks/usePWAMode";

interface JamaahAppLayoutProps {
  children: ReactNode;
  className?: string;
}

const NAV_ITEMS = [
  { to: "/jamaah", label: "Beranda", icon: Home, exact: true },
  { to: "/jamaah/ibadah", label: "Ibadah", icon: Heart },
  { to: "/jamaah/itinerary", label: "Jadwal", icon: Calendar },
  { to: "/jamaah/panduan-ibadah", label: "Panduan", icon: BookOpen },
  { to: "/sholat", label: "Sholat", icon: Compass },
  { to: "/jamaah/notifications", label: "Notifikasi", icon: Bell },
  { to: "/jamaah/profile", label: "Profil", icon: User },
] as const;

const COMPACT_NAV = [
  { to: "/jamaah", label: "Beranda", icon: Home, exact: true },
  { to: "/jamaah/ibadah", label: "Ibadah", icon: Heart },
  { to: "/sholat", label: "Sholat", icon: Compass },
  { to: "/jamaah/notifications", label: "Notif", icon: Bell },
  { to: "/jamaah/profile", label: "Profil", icon: User },
] as const;

/**
 * PWA-F3: JamaahAppLayout — Layout khusus portal jamaah dengan bottom nav berbeda.
 *
 * Saat app berjalan sebagai PWA (standalone/fullscreen):
 *   → Tampilkan bottom nav 5-tab kustom dengan ikon besar + label
 * Saat berjalan di browser biasa:
 *   → Gunakan JamaahAppShell standar (yang sudah ada)
 */
export function JamaahAppLayout({ children, className }: JamaahAppLayoutProps) {
  const { isStandalone } = usePWAMode();

  // Di browser biasa — gunakan shell standar
  if (!isStandalone) {
    return (
      <JamaahAppShell className={className}>
        {children}
      </JamaahAppShell>
    );
  }

  // Mode PWA standalone — gunakan layout khusus dengan bottom nav yang berbeda
  return (
    <div
      data-portal="jamaah"
      data-pwa="standalone"
      className={cn("min-h-screen w-full bg-background", className)}
    >
      <div className="mx-auto w-full max-w-md pb-24">
        <div className="safe-top" />
        {children}
      </div>

      {/* Bottom Nav khusus PWA — lebih besar, lebih lengkap */}
      <PWAJamaahBottomNav />
    </div>
  );
}

function PWAJamaahBottomNav() {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-bottom"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto max-w-md">
        <div className="flex items-stretch">
          {COMPACT_NAV.map(({ to, label, icon: Icon, exact }) => {
            const isActive = exact
              ? location.pathname === to
              : location.pathname.startsWith(to);

            return (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                    isActive ? "bg-primary/10" : "bg-transparent"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] leading-tight transition-colors",
                    isActive ? "text-primary font-semibold" : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default JamaahAppLayout;
