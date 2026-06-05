import { NavLink, useLocation } from "react-router-dom";
import {
  Home, Package, Calculator, DollarSign, User, Calendar,
  PiggyBank, BookOpen, LayoutGrid, Phone, Moon, Compass,
  Cloud, Target, ShoppingBag, Star,
  QrCode, Shield, Bell, FileText, Luggage, LogIn, FileSignature,
  Camera, Wallet, CreditCard, MessageCircle, GraduationCap,
  CalendarDays, Users, Clock, BookMarked, Plane, Heart, BellRing,
  Sun, UsersRound, Trophy, Search, MapPin, Mic, Navigation,
  Bookmark, Award, Globe, Info, Headphones
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePWAConfig } from "@/hooks/usePWAConfig";

const ICON_MAP: Record<string, React.ElementType> = {
  Home, Package, Calculator, DollarSign, User, Calendar,
  PiggyBank, BookOpen, LayoutGrid, Phone, Moon, Compass,
  Cloud, Target, ShoppingBag, Star,
  QrCode, Shield, Bell, FileText, Luggage, LogIn, FileSignature,
  Camera, Wallet, CreditCard, MessageCircle, GraduationCap,
  CalendarDays, Users, Clock, BookMarked, Plane, Heart, BellRing,
  Sun, UsersRound, Trophy, Search, MapPin, Mic, Navigation,
  Bookmark, Award, Globe, Info, Headphones,
};

interface MobileBottomNavProps {
  /** When true (standalone PWA mode), show on all screen sizes */
  standalone?: boolean;
}

export function MobileBottomNav({ standalone = false }: MobileBottomNavProps) {
  const { activeItems, iconConfig } = usePWAConfig();
  const location = useLocation();

  if (activeItems.length === 0) return null;

  const themeColor = iconConfig.themeColor || "#15803d";

  return (
    <>
      {/* Spacer so page content isn't hidden behind the nav bar */}
      <div
        className={cn("h-[62px]", standalone ? "block" : "block md:hidden")}
        aria-hidden
      />

      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-2xl border-t border-border/40 shadow-[0_-8px_32px_rgba(0,0,0,0.10)]",
          standalone ? "block" : "block md:hidden",
        )}
      >
        <div
          className="flex items-stretch justify-around h-[62px] px-1 pb-safe"
        >
          {activeItems.map((item) => {
            const Icon = ICON_MAP[item.icon] ?? Home;
            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);
            const activeColor = standalone ? themeColor : undefined;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative group select-none"
              >
                {isActive && (
                  <span className="absolute inset-x-1.5 top-1.5 bottom-1.5 rounded-2xl bg-primary/10" />
                )}
                <div
                  className={cn(
                    "relative z-10 flex items-center justify-center w-9 h-6 rounded-xl transition-all duration-200",
                    isActive ? "scale-110" : "group-active:scale-90"
                  )}
                >
                  <Icon
                    className={cn(
                      "transition-all duration-200",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                    style={{
                      width: 22, height: 22,
                      strokeWidth: isActive ? 2.5 : 1.8,
                      ...(isActive && activeColor ? { color: activeColor } : {}),
                    }}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium z-10 transition-colors duration-200",
                    isActive ? "text-primary font-semibold" : "text-muted-foreground"
                  )}
                  style={isActive && activeColor ? { color: activeColor } : undefined}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
}
