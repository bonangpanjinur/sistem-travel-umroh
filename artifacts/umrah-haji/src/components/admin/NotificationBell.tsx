import {
  Bell, Check, Trash2, Calendar, CreditCard, MessageCircle,
  AlertTriangle, ShieldCheck, ClipboardCheck, UserPlus, FileSearch,
  Smartphone, X, PiggyBank, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AdminNotification } from "@/hooks/useAdminNotifications";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";

interface NotificationBellProps {
  notifications: AdminNotification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

// ── Category config ───────────────────────────────────────────────────────────
interface CategoryDef {
  label: string;
  types: AdminNotification['type'][];
  icon: React.ElementType;
  color: string;
  bg: string;
  link: string;
}

const CATEGORIES: CategoryDef[] = [
  {
    label: 'Leads',
    types: ['lead', 'chat_lead'],
    icon: UserPlus,
    color: 'text-sky-600',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    link: '/admin/leads',
  },
  {
    label: 'Support',
    types: ['booking'],
    icon: ClipboardCheck,
    color: 'text-violet-600',
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    link: '/admin/support',
  },
  {
    label: 'Dokumen',
    types: ['document'],
    icon: FileSearch,
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    link: '/admin/document-verification',
  },
  {
    label: 'Pembayaran',
    types: ['payment'],
    icon: CreditCard,
    color: 'text-green-600',
    bg: 'bg-green-50 dark:bg-green-950/40',
    link: '/admin/payments',
  },
  {
    label: 'Tabungan',
    types: ['savings_converted'],
    icon: PiggyBank,
    color: 'text-teal-600',
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    link: '/admin/savings',
  },
  {
    label: 'SOS',
    types: ['sos_alert'],
    icon: AlertTriangle,
    color: 'text-red-600',
    bg: 'bg-red-50 dark:bg-red-950/40',
    link: '/admin/sos-alerts',
  },
  {
    label: 'Sistem',
    types: ['system_alert'],
    icon: Zap,
    color: 'text-orange-600',
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    link: '/admin/integration-settings',
  },
];

// ── Per-type icon + colour ────────────────────────────────────────────────────
function getTypeStyle(type: AdminNotification['type']) {
  switch (type) {
    case 'lead':
    case 'chat_lead':
      return { icon: UserPlus, iconClass: 'text-sky-600', bgClass: 'bg-sky-100 dark:bg-sky-900/30' };
    case 'booking':
      return { icon: Calendar, iconClass: 'text-violet-600', bgClass: 'bg-violet-100 dark:bg-violet-900/30' };
    case 'payment':
      return { icon: CreditCard, iconClass: 'text-green-600', bgClass: 'bg-green-100 dark:bg-green-900/30' };
    case 'document':
      return { icon: FileSearch, iconClass: 'text-amber-600', bgClass: 'bg-amber-100 dark:bg-amber-900/30' };
    case 'sos_alert':
      return { icon: AlertTriangle, iconClass: 'text-red-600', bgClass: 'bg-red-100 dark:bg-red-900/30 animate-pulse' };
    case 'visa_update':
      return { icon: ShieldCheck, iconClass: 'text-purple-600', bgClass: 'bg-purple-100 dark:bg-purple-900/30' };
    case 'device_registration':
      return { icon: Smartphone, iconClass: 'text-slate-600', bgClass: 'bg-slate-100 dark:bg-slate-900/30' };
    case 'savings_converted':
      return { icon: PiggyBank, iconClass: 'text-teal-600', bgClass: 'bg-teal-100 dark:bg-teal-900/30' };
    case 'system_alert':
      return { icon: Zap, iconClass: 'text-orange-600', bgClass: 'bg-orange-100 dark:bg-orange-900/30' };
    default:
      return { icon: Bell, iconClass: 'text-muted-foreground', bgClass: 'bg-muted' };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export function NotificationBell({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
}: NotificationBellProps) {
  const navigate = useNavigate();

  const handleNotificationClick = (notification: AdminNotification) => {
    onMarkAsRead(notification.id);
    if (notification.link) navigate(notification.link);
  };

  // Build summary counts per category (unread only)
  const summaryCounts = useMemo(() => {
    const unread = notifications.filter(n => !n.read);
    return CATEGORIES.map(cat => ({
      ...cat,
      count: unread.filter(n => cat.types.includes(n.type)).length,
    })).filter(c => c.count > 0);
  }, [notifications]);

  const hasSOS = useMemo(
    () => notifications.some(n => n.type === 'sos_alert' && !n.read),
    [notifications]
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative h-9 w-9", hasSOS && "animate-pulse")}
          aria-label="Notifikasi"
        >
          <Bell className={cn("h-4 w-4", hasSOS && "text-red-500")} />
          {unreadCount > 0 && (
            <span className={cn(
              "absolute -top-1 -right-1 h-4 w-4 rounded-full text-[10px] font-bold flex items-center justify-center",
              hasSOS
                ? "bg-red-500 text-white"
                : "bg-primary text-primary-foreground"
            )}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[340px] p-0 shadow-xl" align="end">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-sm">Notifikasi</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs h-5 px-1.5">
                {unreadCount} baru
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onMarkAllAsRead} className="h-7 text-xs px-2">
                <Check className="h-3 w-3 mr-1" /> Baca semua
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClearAll}
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                title="Hapus semua"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Summary pills — only when there are unread items */}
        {summaryCounts.length > 0 && (
          <div className="px-3 py-2.5 border-b bg-muted/30 flex flex-wrap gap-1.5">
            {summaryCounts.map(cat => (
              <button
                key={cat.label}
                onClick={() => navigate(cat.link)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border transition-opacity hover:opacity-80',
                  cat.bg,
                  cat.color,
                  'border-current/20'
                )}
                title={`Lihat ${cat.label}`}
              >
                <cat.icon className="h-3 w-3" />
                {cat.label}
                <span className="ml-0.5 bg-current/20 rounded-full px-1 leading-4">{cat.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Notification list */}
        <ScrollArea className="h-[320px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground gap-3">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <Bell className="h-6 w-6 opacity-30" />
              </div>
              <p className="text-sm">Belum ada notifikasi</p>
              <p className="text-xs text-muted-foreground/60">Aktivitas baru akan muncul di sini</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const { icon: Icon, iconClass, bgClass } = getTypeStyle(notification.type);
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors flex gap-3 items-start",
                      !notification.read && "bg-primary/[0.04]"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && handleNotificationClick(notification)}
                  >
                    <div className={cn("p-2 rounded-full shrink-0 mt-0.5", bgClass)}>
                      <Icon className={cn("h-3.5 w-3.5", iconClass)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1.5">
                        <p className={cn(
                          "text-xs font-semibold leading-snug line-clamp-1",
                          !notification.read ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(notification.createdAt, { addSuffix: true, locale: idLocale })}
                      </p>
                    </div>
                    <button
                      className="shrink-0 mt-0.5 p-0.5 rounded hover:bg-muted text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                      onClick={e => { e.stopPropagation(); onMarkAsRead(notification.id); }}
                      title="Tandai sudah dibaca"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t px-4 py-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{notifications.length} notifikasi tersimpan</p>
            <button
              onClick={() => navigate('/admin/support')}
              className="text-xs text-primary hover:underline font-medium"
            >
              Lihat semua →
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
