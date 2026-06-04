import { useEffect } from "react";

/**
 * Prefetches commonly-navigated admin route chunks during idle time.
 * Reduces perceived navigation delay when switching menus from AdminPackages.
 */
export function usePrefetchAdminRoutes() {
  useEffect(() => {
    const prefetch = () => {
      // Fire-and-forget dynamic imports; Vite will fetch the chunks in the background.
      const imports: Array<() => Promise<unknown>> = [
        () => import("@/pages/admin/AdminDashboard"),
        () => import("@/pages/admin/AdminBookings"),
        () => import("@/pages/admin/AdminPayments"),
        () => import("@/pages/admin/AdminCustomers"),
        () => import("@/pages/admin/AdminDepartures"),
        () => import("@/pages/admin/AdminLeads"),
        () => import("@/pages/admin/AdminChatLeads"),
        () => import("@/pages/admin/AdminPackageTypes"),
        () => import("@/pages/admin/AdminSavingsPlans"),
        () => import("@/pages/admin/AdminReports"),
        () => import("@/pages/admin/AdminSettings"),
      ];
      imports.forEach((fn) => {
        try {
          fn().catch(() => {});
        } catch {
          /* ignore */
        }
      });
    };

    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    let idleId: number | undefined;
    let timeoutId: number | undefined;

    if (typeof w.requestIdleCallback === "function") {
      idleId = w.requestIdleCallback(prefetch, { timeout: 2000 });
    } else {
      timeoutId = window.setTimeout(prefetch, 1500);
    }

    return () => {
      if (idleId !== undefined && typeof w.cancelIdleCallback === "function") {
        w.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);
}