import { useNotifications } from "@/hooks/useNotifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { Bell, CheckCheck, Clock, AlertCircle, Info, CheckCircle2, ChevronLeft, ArrowRight, CreditCard, FileText, Plane, Map, RotateCcw } from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

function getNotifActionUrl(notif: any): { url: string; label: string } | null {
  const title = (notif.title || "").toLowerCase();
  const message = (notif.message || "").toLowerCase();
  const type = notif.type || "info";

  if (type === "visa_update" || title.includes("visa") || message.includes("visa")) {
    return { url: "/jamaah/visa", label: "Cek Status Visa" };
  }
  if (type === "refund" || title.includes("refund") || message.includes("refund") || title.includes("dana dikembalikan")) {
    return { url: "/jamaah/payment-history", label: "Lihat Riwayat Pembayaran" };
  }
  if (title.includes("pembayaran") || message.includes("pembayaran") || message.includes("bayar") || message.includes("lunas")) {
    return { url: "/jamaah/payment-history", label: "Lihat Pembayaran" };
  }
  if (type === "document" || title.includes("dokumen") || message.includes("dokumen") || message.includes("upload")) {
    return { url: "/jamaah/documents", label: "Lihat Dokumen Saya" };
  }
  if (title.includes("booking") || title.includes("konfirmasi") || message.includes("booking")) {
    return { url: "/my-bookings", label: "Lihat Booking" };
  }
  if (title.includes("itinerary") || title.includes("jadwal") || message.includes("jadwal")) {
    return { url: "/jamaah/itinerary", label: "Lihat Jadwal" };
  }
  if (title.includes("peta") || message.includes("lokasi")) {
    return { url: "/jamaah/peta-lokasi", label: "Buka Peta" };
  }
  if (type === "urgent") {
    return { url: "/jamaah", label: "Ke Portal Jamaah" };
  }
  return null;
}

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  info:        { icon: Info,         color: "text-blue-600",    bg: "bg-blue-50 border-blue-100" },
  warning:     { icon: AlertCircle,  color: "text-amber-600",   bg: "bg-amber-50 border-amber-100" },
  success:     { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
  urgent:      { icon: AlertCircle,  color: "text-red-600",     bg: "bg-red-50 border-red-100" },
  refund:      { icon: RotateCcw,    color: "text-violet-600",  bg: "bg-violet-50 border-violet-100" },
  payment:     { icon: CreditCard,   color: "text-green-600",   bg: "bg-green-50 border-green-100" },
  visa_update: { icon: FileText,     color: "text-sky-600",     bg: "bg-sky-50 border-sky-100" },
  document:    { icon: FileText,     color: "text-orange-600",  bg: "bg-orange-50 border-orange-100" },
};

export default function JamaahNotifications() {
  const { notifications, isLoading, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/jamaah">
              <Button variant="ghost" size="icon" className="text-primary-foreground h-8 w-8">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold">Notifikasi</h1>
              {unreadCount > 0 && (
                <p className="text-xs opacity-80">{unreadCount} belum dibaca</p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground text-xs"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Tandai semua dibaca
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))
        ) : !notifications.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 bg-muted rounded-full mb-4">
              <Bell className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">Belum ada notifikasi</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-xs">
              Notifikasi dari tim Vinstour akan muncul di sini
            </p>
          </div>
        ) : (
          <>
            {/* Unread section */}
            {notifications.filter((n: any) => !n.is_read).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                  Belum Dibaca
                </p>
                <div className="space-y-2">
                  {notifications
                    .filter((n: any) => !n.is_read)
                    .map((notif: any) => (
                      <NotifCard
                        key={notif.id}
                        notif={notif}
                        onRead={() => markAsRead.mutate(notif.id)}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Read section */}
            {notifications.filter((n: any) => n.is_read).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1 mt-4">
                  Sudah Dibaca
                </p>
                <div className="space-y-2">
                  {notifications
                    .filter((n: any) => n.is_read)
                    .map((notif: any) => (
                      <NotifCard
                        key={notif.id}
                        notif={notif}
                        onRead={() => {}}
                      />
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <JamaahBottomNav />
    </div>
  );
}

function NotifCard({ notif, onRead }: { notif: any; onRead: () => void }) {
  const type = notif.type || "info";
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.info;
  const Icon = config.icon;
  const action = getNotifActionUrl(notif);

  return (
    <Card
      className={cn(
        "transition-all border",
        !notif.is_read ? config.bg + " shadow-sm" : "opacity-70"
      )}
      onClick={onRead}
    >
      <CardContent className="pt-3 pb-3 px-4">
        <div className="flex gap-3">
          <div className={cn("mt-0.5 p-1.5 rounded-full flex-shrink-0", !notif.is_read ? "bg-white/70" : "bg-muted")}>
            <Icon className={cn("h-4 w-4", config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className={cn("font-semibold text-sm", !notif.is_read ? "text-foreground" : "text-muted-foreground")}>
                {notif.title}
              </p>
              {!notif.is_read && (
                <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{notif.message}</p>
            <div className="flex items-center justify-between mt-1.5">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground/60" />
                <p className="text-xs text-muted-foreground/60">
                  {notif.created_at
                    ? formatDistanceToNow(parseISO(notif.created_at), { locale: idLocale, addSuffix: true })
                    : "-"}
                </p>
                {notif.is_read && notif.read_at && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <CheckCheck className="h-3 w-3 text-emerald-500" />
                    <p className="text-xs text-muted-foreground/60">dibaca</p>
                  </>
                )}
              </div>
              {/* Q8: Action button deep link */}
              {action && (
                <Link
                  to={action.url}
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-colors",
                    config.color,
                    "bg-white/60 hover:bg-white border border-current/20"
                  )}
                >
                  {action.label}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
