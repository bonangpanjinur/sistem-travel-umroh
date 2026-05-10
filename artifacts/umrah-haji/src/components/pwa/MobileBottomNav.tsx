import { NavLink, useLocation } from "react-router-dom";
import {
  Home, Package, Calculator, DollarSign, User, Calendar,
  PiggyBank, BookOpen, LayoutGrid, Phone, Moon, Compass,
  Cloud, Target, ShoppingBag, Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePWAConfig } from "@/hooks/usePWAConfig";

const ICON_MAP: Record<string, React.ElementType> = {
  Home, Package, Calculator, DollarSign, User, Calendar,
  PiggyBank, BookOpen, LayoutGrid, Phone, Moon, Compass,
  Cloud, Target, ShoppingBag, Star,
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
        className={cn("h-16", standalone ? "block" : "block md:hidden")}
        aria-hidden
      />

      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border safe-area-bottom",
          standalone ? "block" : "block md:hidden",
        )}
      >
        <div
          className="grid h-16"
          style={{ gridTemplateColumns: `repeat(${activeItems.length}, 1fr)` }}
        >
          {activeItems.map((item, idx) => {
            const Icon = ICON_MAP[item.icon] ?? Home;
            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors select-none",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-6 rounded-full transition-colors",
                    isActive ? "bg-primary/10" : "",
                  )}
                  style={isActive && standalone ? { backgroundColor: `${themeColor}20` } : undefined}
                >
                  <Icon
                    className="h-5 w-5"
                    style={isActive && standalone ? { color: themeColor } : undefined}
                  />
                </div>
                <span
                  className="leading-none"
                  style={isActive && standalone ? { color: themeColor } : undefined}
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
