import { useEffect, useState, ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/**
 * Detects whether the app is running as an installed PWA (standalone display
 * mode) and, if so, sends authenticated users straight into the in-app shell
 * instead of the public marketing landing page.
 *
 * Behavior:
 *  - Browser tab → render the normal landing (children).
 *  - PWA standalone + signed-in jamaah/customer → /jamaah
 *  - PWA standalone + signed-in admin/owner/etc → /dashboard
 *  - PWA standalone + signed-out → /auth/login
 */
export function StandaloneHomeGate({ children }: { children: ReactNode }) {
  const { user, role, isLoading } = useAuth();
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

  // Standalone (installed PWA) — route into app
  if (!user) return <Navigate to="/auth/login" replace />;

  const jamaahRoles = new Set(["customer", "jamaah", "user"]);
  if (role && jamaahRoles.has(role)) return <Navigate to="/jamaah" replace />;
  return <Navigate to="/dashboard" replace />;
}