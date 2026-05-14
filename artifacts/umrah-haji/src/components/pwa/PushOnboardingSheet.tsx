import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BellRing, X, ShieldCheck, Plane, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePWAMode } from "@/hooks/usePWAMode";
import { usePushSubscription } from "@/hooks/usePushSubscription";

const SEEN_KEY = "pwa-push-onboarding-seen";

/**
 * Bottom-sheet sekali tampil saat user pertama kali membuka PWA.
 * Meminta izin notifikasi untuk update status booking & visa.
 */
export function PushOnboardingSheet({ customerId }: { customerId?: string }) {
  const { user } = useAuth();
  const { isStandalone } = usePWAMode();
  const { canSubscribe, isSubscribed, subscribe, isLoading, permission } = usePushSubscription(customerId);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isStandalone) return;
    if (!user) return; // hanya tawarkan setelah login
    if (localStorage.getItem(SEEN_KEY)) return;
    if (!canSubscribe || isSubscribed) return;
    if (permission === "denied") return;
    const t = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(t);
  }, [isStandalone, user, canSubscribe, isSubscribed, permission]);

  const dismiss = (remember = true) => {
    if (remember) localStorage.setItem(SEEN_KEY, "1");
    setOpen(false);
  };

  const handleAllow = async () => {
    await subscribe();
    dismiss(true);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            onClick={() => dismiss(false)}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-[101] bg-background rounded-t-3xl p-6 pb-8 shadow-2xl max-w-md mx-auto"
          >
            <button
              onClick={() => dismiss(false)}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-muted flex items-center justify-center"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
              <BellRing className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-display text-lg font-semibold">Aktifkan Notifikasi</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Dapatkan update real-time tentang status booking, visa, dan jadwal keberangkatan Anda.
            </p>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li className="flex items-center gap-2.5">
                <Plane className="h-4 w-4 text-primary flex-shrink-0" />
                <span>Update status booking & keberangkatan</span>
              </li>
              <li className="flex items-center gap-2.5">
                <FileCheck className="h-4 w-4 text-primary flex-shrink-0" />
                <span>Verifikasi dokumen & visa</span>
              </li>
              <li className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-primary flex-shrink-0" />
                <span>Pengingat pembayaran & deadline</span>
              </li>
            </ul>
            <div className="grid grid-cols-2 gap-2 mt-5">
              <Button variant="outline" onClick={() => dismiss(true)} disabled={isLoading}>
                Nanti saja
              </Button>
              <Button onClick={handleAllow} disabled={isLoading}>
                {isLoading ? "Mengaktifkan..." : "Izinkan"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}