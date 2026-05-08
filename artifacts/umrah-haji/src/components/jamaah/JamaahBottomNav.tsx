import { Link, useLocation } from "react-router-dom";
import { Home, QrCode, MapPin, User, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";

const navItems = [
  { to: "/jamaah", icon: Home, label: "Beranda" },
  { to: "/jamaah/digital-id", icon: QrCode, label: "ID" },
  { to: "/jamaah/itinerary", icon: MapPin, label: "Itinerary" },
  { to: "/jamaah/notifications", icon: Bell, label: "Notifikasi", showBadge: true },
  { to: "/customer/settings", icon: User, label: "Profil" },
];

export function JamaahBottomNav() {
  const location = useLocation();
  const { unreadCount } = useNotifications();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t py-2 px-4 z-40 safe-area-inset-bottom">
      <div className="flex justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to ||
            (item.to === "/jamaah" && location.pathname === "/jamaah");
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors relative",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {item.showBadge && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 border border-background">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
