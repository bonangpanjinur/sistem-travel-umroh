import { useEffect, useState, ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/**
 * Detects whether the app is running as an installed PWA (standalone display
 * mode) and, if so, opens the app shell directly — no login wall.
 *
 * Behavior:
 *  - Browser tab → render the normal landing (children).
 *  - PWA standalone + signed-in admin/owner/etc → /dashboard
 *  - PWA standalone + everyone else (jamaah/customer/guest) → /jamaah
 *    (the /jamaah portal supports guest mode and shows a soft login prompt
 *    only when the user opens a personal feature.)
 */
export function StandaloneHomeGate({ children }: { children: ReactNode }) {
  const { user, hasRole, isLoading } = useAuth() as any;
  const [isStandalone, setIsStandalone] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => {
      const mq = window.matchMedia?.("(display-mode: standalone)").matches;
      // iOS Safari uses navigator.standalone
      const ios = (window.navigator as any).standalone === true;
      setIsStandalone(Boolean(mq || ios));
    };
    check();
    const mq = window.matchMedia?.("(display-mode: standalone)");
    mq?.addEventListener?.("change", check);
    return () => mq?.removeEventListener?.("change", check);
  }, []);

  if (isStandalone === null || isLoading) return <>{children}</>;
  if (!isStandalone) return <>{children}</>;

  // Standalone (installed PWA) — open app directly. Guests go to /jamaah too.
  if (!user) return <Navigate to="/jamaah" replace />;

  const isAdminLike =
    hasRole?.("super_admin") ||
    hasRole?.("owner") ||
    hasRole?.("branch_manager") ||
    hasRole?.("admin") ||
    hasRole?.("finance") ||
    hasRole?.("operational") ||
    hasRole?.("hr");
  if (isAdminLike) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/jamaah" replace />;
}