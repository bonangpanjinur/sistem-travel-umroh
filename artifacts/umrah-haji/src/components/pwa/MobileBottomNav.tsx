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

export function MobileBottomNav() {
  const { activeItems } = usePWAConfig();
  const location = useLocation();

  if (activeItems.length === 0) return null;

  return (
    <>
      {/* Spacer agar konten tidak tertutup navbar bawah */}
      <div className="h-16 md:hidden" aria-hidden />

      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background border-t border-border safe-area-bottom">
        <div
          className="grid h-16"
          style={{ gridTemplateColumns: `repeat(${activeItems.length}, 1fr)` }}
        >
          {activeItems.map((item) => {
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
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-6 rounded-full transition-colors",
                    isActive ? "bg-primary/10" : ""
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="leading-none">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
}
