import { Link, useLocation } from "react-router-dom";
import { Home, QrCode, MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/jamaah", icon: Home, label: "Beranda" },
  { to: "/jamaah/digital-id", icon: QrCode, label: "ID" },
  { to: "/jamaah/itinerary", icon: MapPin, label: "Itinerary" },
  { to: "/customer/settings", icon: User, label: "Profil" },
];

export function JamaahBottomNav() {
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t py-2 px-4 z-40">
      <div className="flex justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
