import { Bell, Check, Trash2, AlertCircle, CheckCircle, DollarSign, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { AgentNotification } from "@/hooks/useAgentNotifications";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface AgentNotificationBellProps {
  notifications: AgentNotification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

export function AgentNotificationBell({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
}: AgentNotificationBellProps) {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return <FileText className="h-4 w-4" />;
      case 'document':
        return <AlertCircle className="h-4 w-4" />;
      case 'commission':
        return <DollarSign className="h-4 w-4" />;
      case 'payment':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'booking':
        return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
      case 'document':
        return "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400";
      case 'commission':
        return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";
      case 'payment':
        return "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400";
      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold">Notifikasi</h4>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMarkAllAsRead}
                className="h-8 text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Baca Semua
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="h-8 text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <Bell className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-sm">Belum ada notifikasi</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                    !notification.read && "bg-primary/5"
                  )}
                  onClick={() => onMarkAsRead(notification.id)}
                >
                  <div className="flex gap-3">
                    <div className={cn(
                      "p-2 rounded-full shrink-0",
                      getNotificationColor(notification.type)
                    )}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          !notification.read && "text-primary"
                        )}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(notification.createdAt, { 
                          addSuffix: true, 
                          locale: idLocale 
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
