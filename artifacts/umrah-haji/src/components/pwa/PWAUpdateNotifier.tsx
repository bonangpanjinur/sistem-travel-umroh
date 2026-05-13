import { useEffect } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

/**
 * Listens for `sw-update-available` (dispatched from main.tsx) and shows a
 * persistent Sonner toast prompting the user to reload to apply the update.
 */
export function PWAUpdateNotifier() {
  useEffect(() => {
    const handler = (e: Event) => {
      const reg = (e as CustomEvent<{ registration: ServiceWorkerRegistration }>).detail?.registration;
      const waiting = reg?.waiting;
      toast("Versi baru tersedia", {
        description: "Muat ulang untuk menggunakan versi terbaru aplikasi.",
        duration: Infinity,
        icon: <RefreshCw className="h-4 w-4" />,
        action: {
          label: "Muat Ulang",
          onClick: () => {
            if (waiting) {
              waiting.postMessage({ type: "SKIP_WAITING" });
              // controllerchange in main.tsx will trigger reload
            } else {
              window.location.reload();
            }
          },
        },
      });
    };
    window.addEventListener("sw-update-available", handler);
    return () => window.removeEventListener("sw-update-available", handler);
  }, []);

  return null;
}

export default PWAUpdateNotifier;