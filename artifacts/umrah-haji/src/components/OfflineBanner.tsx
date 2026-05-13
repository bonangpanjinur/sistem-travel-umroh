import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOfflineCache";

/**
 * J3 — Banner muncul saat user offline. Beritahu data dari cache terakhir.
 */
export function OfflineBanner({ message }: { message?: string }) {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40 px-3 py-2 text-sm text-amber-800 dark:text-amber-200 mb-3">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>{message ?? "Mode Offline — data ditampilkan dari cache terakhir."}</span>
    </div>
  );
}