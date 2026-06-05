import { Link, useLocation } from "react-router-dom";
import {
  Home, QrCode, Shield, Bell, LayoutGrid, FileText, Luggage,
  LogIn, FileSignature, Camera, BookOpen, Wallet, CreditCard,
  MessageCircle, X, GraduationCap, CalendarDays, Users, Clock,
  BookMarked, User, ChevronLeft, ChevronRight, Plane, Heart, Star,
  BellRing, Moon, Sun, UsersRound, Trophy, Search
} from "lucide-react";
import { useDarkMode } from "@/hooks/useDarkMode";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import { useState, useEffect, useMemo } from "react";
import { usePWAConfig } from "@/hooks/usePWAConfig";

const DEFAULT_MOBILE_ITEMS = [
  { to: "/jamaah",              icon: Home,       label: "Beranda" },
  { to: "/my-bookings",        icon: Plane,       label: "Booking" },
  { to: "/jamaah/payment",     icon: CreditCard,  label: "Bayar" },
  { to: "/jamaah/notifications", icon: Bell,      label: "Notif", showBadge: true },
];

const ICON_MAP: Record<string, any> = {
  Home, QrCode, Shield, Bell, LayoutGrid, FileText, Luggage, LogIn,
  FileSignature, Camera, BookOpen, Wallet, CreditCard, MessageCircle,
  GraduationCap, CalendarDays, Users, Clock, BookMarked, User, Plane,
  Heart, Star, BellRing, Moon, Sun, UsersRound, Trophy, Search,
};

const moreMenuItems = [
  { to: "/jamaah/payment",         icon: CreditCard,   label: "Bayar Online",    color: "text-primary",        bg: "bg-primary/10" },
  { to: "/jamaah/checklist",       icon: FileText,     label: "Checklist",       color: "text-green-600",      bg: "bg-green-50 dark:bg-green-950/30" },
  { to: "/jamaah/checkin",         icon: LogIn,        label: "Check-in",        color: "text-blue-600",       bg: "bg-blue-50 dark:bg-blue-950/30" },
  { to: "/jamaah/bagasi",          icon: Luggage,      label: "Bagasi",          color: "text-orange-600",     bg: "bg-orange-50 dark:bg-orange-950/30" },
  { to: "/jamaah/kontrak",         icon: FileSignature,label: "Kontrak",         color: "text-purple-600",     bg: "bg-purple-50 dark:bg-purple-950/30" },
  { to: "/jamaah/documents",       icon: FileText,     label: "Dokumen",         color: "text-green-600",      bg: "bg-green-50 dark:bg-green-950/30" },
  { to: "/jamaah/galeri",          icon: Camera,       label: "Galeri",          color: "text-pink-600",       bg: "bg-pink-50 dark:bg-pink-950/30" },
  { to: "/jamaah/doa-panduan",     icon: BookOpen,     label: "Doa & Panduan",   color: "text-emerald-600",    bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  { to: "/jamaah/payment-history", icon: Wallet,       label: "Riwayat Bayar",   color: "text-amber-600",      bg: "bg-amber-50 dark:bg-amber-950/30" },
  { to: "/jamaah/manasik",         icon: GraduationCap,label: "Manasik",         color: "text-indigo-600",     bg: "bg-indigo-50 dark:bg-indigo-950/30" },
  { to: "/jamaah/progress-wall",   icon: Trophy,       label: "Progress Wall",   color: "text-yellow-600",     bg: "bg-yellow-50 dark:bg-yellow-950/30" },
  { to: "/jamaah/pengingat-ibadah",icon: BellRing,     label: "Pengingat",       color: "text-emerald-600",    bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  { to: "/jamaah/pantau-keluarga", icon: UsersRound,   label: "Pantau Keluarga", color: "text-blue-600",       bg: "bg-blue-50 dark:bg-blue-950/30" },
  { to: "/jamaah/wishlist",        icon: Heart,        label: "Wishlist",        color: "text-rose-600",       bg: "bg-rose-50 dark:bg-rose-950/30" },
  { to: "/jamaah/feedback",        icon: MessageCircle,label: "Feedback",        color: "text-teal-600",       bg: "bg-teal-50 dark:bg-teal-950/30" },
  { to: "/customer/settings",      icon: User,         label: "Profil",          color: "text-gray-600",       bg: "bg-gray-100 dark:bg-gray-800" },
];

const moreMenuGroups = [
  {
    label: "Administrasi",
    items: ["Bayar Online", "Checklist", "Check-in", "Bagasi", "Kontrak", "Dokumen", "Riwayat Bayar"],
  },
  {
    label: "Ibadah & Spiritual",
    items: ["Doa & Panduan", "Manasik", "Pengingat"],
  },
  {
    label: "Komunitas",
    items: ["Galeri", "Progress Wall", "Pantau Keluarga", "Feedback"],
  },
  {
    label: "Lainnya",
    items: ["Wishlist", "Profil"],
  },
];

const sidebarGroups = [
  {
    label: "Perjalanan",
    items: [
      { to: "/jamaah",             icon: Home,          label: "Beranda",           exact: true },
      { to: "/my-bookings",        icon: Plane,         label: "Booking Saya" },
      { to: "/jamaah/itinerary",   icon: CalendarDays,  label: "Itinerary" },
      { to: "/jamaah/digital-id",  icon: QrCode,        label: "ID Digital" },
      { to: "/jamaah/visa",        icon: Shield,        label: "Tracker Visa" },
      { to: "/jamaah/rombongan",   icon: Users,         label: "Rombongan" },
    ],
  },
  {
    label: "Keuangan",
    items: [
      { to: "/jamaah/payment",         icon: CreditCard,    label: "Bayar Online" },
      { to: "/jamaah/payment-history", icon: Wallet,        label: "Riwayat Bayar" },
      { to: "/jamaah/checklist",       icon: FileText,      label: "Checklist" },
      { to: "/jamaah/documents",       icon: FileSignature, label: "Dokumen" },
    ],
  },
  {
    label: "Ibadah",
    items: [
      { to: "/jamaah/manasik",          icon: GraduationCap, label: "Manasik Digital" },
      { to: "/jamaah/panduan-ibadah",   icon: BookOpen,      label: "Panduan Ibadah" },
      { to: "/jamaah/waktu-sholat",     icon: Clock,         label: "Waktu Sholat" },
      { to: "/jamaah/doa-panduan",      icon: BookMarked,    label: "Doa & Dzikir" },
      { to: "/jamaah/tracker-ibadah",   icon: Star,          label: "Tracker Ibadah" },
      { to: "/jamaah/pengingat-ibadah", icon: BellRing,      label: "Pengingat Ibadah" },
      { to: "/jamaah/kesehatan",        icon: Heart,         label: "Profil Kesehatan" },
    ],
  },
  {
    label: "Komunitas",
    items: [
      { to: "/jamaah/chat",          icon: MessageCircle, label: "Chat Rombongan" },
      { to: "/jamaah/galeri",        icon: Camera,        label: "Galeri Foto" },
      { to: "/jamaah/progress-wall", icon: Trophy,        label: "Progress Wall" },
    ],
  },
  {
    label: "Akun",
    items: [
      { to: "/jamaah/notifications",   icon: Bell,      label: "Notifikasi",        showBadge: true },
      { to: "/jamaah/pantau-keluarga", icon: UsersRound,label: "Pantau Keluarga" },
      { to: "/customer/settings",      icon: User,      label: "Profil & Pengaturan" },
    ],
  },
];

const SIDEBAR_COLLAPSED_KEY = "jamaah-sidebar-collapsed";

export function JamaahBottomNav() {
  const location = useLocation();
  const { unreadCount } = useNotifications();
  const { isDark, toggle: toggleDark } = useDarkMode();
  const [moreOpen, setMoreOpen] = useState(false);
  const { activeItems: pwaActiveItems } = usePWAConfig();

  const mobileNavItems = useMemo(() => {
    if (!pwaActiveItems?.length) return DEFAULT_MOBILE_ITEMS;
    return pwaActiveItems.slice(0, 4).map((it) => ({
      to: it.path,
      icon: ICON_MAP[it.icon] ?? Home,
      label: it.label,
      showBadge: it.path === "/jamaah/notifications",
    }));
  }, [pwaActiveItems]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  });

  // Prevent body scroll when bottom sheet is open
  useEffect(() => {
    if (moreOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [moreOpen]);

  useEffect(() => {
    const cls = sidebarCollapsed ? "jamaah-sidebar-collapsed" : "jamaah-sidebar-open";
    const opposite = sidebarCollapsed ? "jamaah-sidebar-open" : "jamaah-sidebar-collapsed";
    document.body.classList.add("jamaah-portal-active", cls);
    document.body.classList.remove(opposite);
    return () => {
      document.body.classList.remove("jamaah-portal-active", "jamaah-sidebar-open", "jamaah-sidebar-collapsed");
    };
  }, [sidebarCollapsed]);

  const toggleSidebar = () => {
    setSidebarCollapsed((v) => {
      const next = !v;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  };

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return location.pathname === to;
    return location.pathname === to || location.pathname.startsWith(to + "/");
  };

  // Build grouped items for bottom sheet
  const itemsByLabel = Object.fromEntries(moreMenuItems.map(it => [it.label, it]));

  return (
    <>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-50 bg-background border-r transition-all duration-300 shadow-sm",
          sidebarCollapsed ? "w-16" : "w-60"
        )}
      >
        <div className={cn(
          "flex items-center border-b h-14 shrink-0",
          sidebarCollapsed ? "justify-center px-2" : "justify-between px-4"
        )}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <span className="text-primary-foreground text-xs font-bold">V</span>
              </div>
              <span className="font-semibold text-sm text-foreground truncate">Portal Jamaah</span>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-bold">V</span>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className={cn(
              "p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground",
              sidebarCollapsed && "mt-0"
            )}
            title={sidebarCollapsed ? "Perlebar sidebar" : "Sempitkan sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 space-y-4 px-2">
          {sidebarGroups.map((group) => (
            <div key={group.label}>
              {!sidebarCollapsed && (
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-1">
                  {group.label}
                </p>
              )}
              {sidebarCollapsed && <div className="border-t mx-1 mb-1 opacity-30" />}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.to, (item as any).exact);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center rounded-lg transition-colors relative",
                        sidebarCollapsed ? "justify-center h-10 w-full" : "gap-3 px-2 py-2",
                        active
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <div className="relative shrink-0">
                        <item.icon className="h-4 w-4" />
                        {(item as any).showBadge && unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 border border-background">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        )}
                      </div>
                      {!sidebarCollapsed && (
                        <span className="text-sm truncate">{item.label}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t px-2 py-2 shrink-0 space-y-1">
          <button
            onClick={toggleDark}
            title={isDark ? "Mode Terang" : "Mode Gelap"}
            className={cn(
              "flex items-center rounded-lg transition-colors text-muted-foreground hover:bg-muted hover:text-foreground w-full",
              sidebarCollapsed ? "justify-center h-10" : "gap-3 px-2 py-2"
            )}
          >
            {isDark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
            {!sidebarCollapsed && <span className="text-sm">{isDark ? "Mode Terang" : "Mode Gelap"}</span>}
          </button>
          {!sidebarCollapsed && (
            <Link to="/" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors block px-2">
              ← Kembali ke Website
            </Link>
          )}
        </div>
      </aside>

      {/* ── MOBILE BOTTOM SHEET OVERLAY ── */}
      {moreOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMoreOpen(false)}
          />

          {/* Bottom sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/25" />
            </div>

            {/* Sheet header */}
            <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-border/60">
              <div>
                <h3 className="font-bold text-base text-foreground">Semua Fitur</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Portal Jamaah lengkap</p>
              </div>
              <button
                onClick={() => setMoreOpen(false)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Grouped grid menu */}
            <div className="overflow-y-auto max-h-[65vh] pb-safe">
              {moreMenuGroups.map((group) => {
                const groupItems = group.items
                  .map(label => itemsByLabel[label])
                  .filter(Boolean);
                if (groupItems.length === 0) return null;
                return (
                  <div key={group.label} className="px-4 pt-4">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5 px-1">
                      {group.label}
                    </p>
                    <div className="grid grid-cols-4 gap-2 mb-1">
                      {groupItems.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setMoreOpen(false)}
                          className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl hover:bg-muted active:scale-95 transition-all"
                        >
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm",
                            item.bg
                          )}>
                            <item.icon className={cn("h-5 w-5", item.color)} />
                          </div>
                          <span className="text-[10px] font-medium text-center leading-tight text-foreground/80">
                            {item.label}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="h-6" />
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE BOTTOM BAR ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-background/90 backdrop-blur-2xl border-t border-border/40 shadow-[0_-8px_32px_rgba(0,0,0,0.10)]">
          <div className="flex items-stretch justify-around h-[62px] px-1 pb-safe">
            {mobileNavItems.map((item) => {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative group"
                >
                  {active && (
                    <span className="absolute inset-x-1.5 top-1.5 bottom-1.5 rounded-2xl bg-primary/10" />
                  )}
                  <div className="relative z-10">
                    <div className={cn(
                      "flex items-center justify-center w-9 h-6 rounded-xl transition-all duration-200",
                      active ? "scale-110" : "group-active:scale-90"
                    )}>
                      <item.icon
                        className={cn(
                          "transition-all duration-200",
                          active ? "text-primary" : "text-muted-foreground"
                        )}
                        style={{ width: 22, height: 22 }}
                        strokeWidth={active ? 2.5 : 1.8}
                      />
                    </div>
                    {item.showBadge && unreadCount > 0 && (
                      <span className="absolute -top-2 -right-2.5 min-w-[17px] h-[17px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 border-2 border-background">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium z-10 transition-colors duration-200",
                    active ? "text-primary font-semibold" : "text-muted-foreground"
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            })}

            {/* Menu / More button */}
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative group"
            >
              {moreOpen && (
                <span className="absolute inset-x-1.5 top-1.5 bottom-1.5 rounded-2xl bg-primary/10" />
              )}
              <div className={cn(
                "relative z-10 w-9 h-6 flex items-center justify-center transition-all duration-200",
                moreOpen ? "scale-110" : "group-active:scale-90"
              )}>
                <LayoutGrid
                  className={cn(
                    "transition-all duration-200",
                    moreOpen ? "text-primary" : "text-muted-foreground"
                  )}
                  style={{ width: 22, height: 22 }}
                  strokeWidth={moreOpen ? 2.5 : 1.8}
                />
              </div>
              <span className={cn(
                "text-[10px] font-medium z-10 transition-colors duration-200",
                moreOpen ? "text-primary font-semibold" : "text-muted-foreground"
              )}>
                Menu
              </span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
