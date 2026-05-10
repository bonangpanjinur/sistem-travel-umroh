import { Link, useLocation } from "react-router-dom";
import {
  Home, QrCode, Shield, Bell, LayoutGrid, FileText, Luggage,
  LogIn, FileSignature, Camera, BookOpen, Wallet, CreditCard,
  MessageCircle, X, GraduationCap, CalendarDays, Users, Clock,
  BookMarked, User, ChevronLeft, ChevronRight, Plane, Heart, Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import { useState, useEffect } from "react";

const mobileNavItems = [
  { to: "/jamaah", icon: Home, label: "Beranda" },
  { to: "/jamaah/digital-id", icon: QrCode, label: "ID" },
  { to: "/jamaah/visa", icon: Shield, label: "Visa" },
  { to: "/jamaah/notifications", icon: Bell, label: "Notif", showBadge: true },
];

const moreMenuItems = [
  { to: "/jamaah/payment", icon: CreditCard, label: "Bayar Online", color: "text-primary bg-primary/10" },
  { to: "/jamaah/checklist", icon: FileText, label: "Checklist", color: "text-green-600 bg-green-50" },
  { to: "/jamaah/checkin", icon: LogIn, label: "Check-in", color: "text-blue-600 bg-blue-50" },
  { to: "/jamaah/bagasi", icon: Luggage, label: "Bagasi", color: "text-orange-600 bg-orange-50" },
  { to: "/jamaah/kontrak", icon: FileSignature, label: "Kontrak", color: "text-purple-600 bg-purple-50" },
  { to: "/jamaah/documents", icon: FileText, label: "Dokumen", color: "text-green-600 bg-green-50" },
  { to: "/jamaah/galeri", icon: Camera, label: "Galeri", color: "text-pink-600 bg-pink-50" },
  { to: "/jamaah/doa-panduan", icon: BookOpen, label: "Doa & Panduan", color: "text-emerald-600 bg-emerald-50" },
  { to: "/jamaah/payment-history", icon: Wallet, label: "Riwayat Bayar", color: "text-amber-600 bg-amber-50" },
  { to: "/jamaah/manasik", icon: GraduationCap, label: "Manasik", color: "text-indigo-600 bg-indigo-50" },
  { to: "/jamaah/feedback", icon: MessageCircle, label: "Feedback", color: "text-teal-600 bg-teal-50" },
  { to: "/customer/settings", icon: User, label: "Profil", color: "text-gray-600 bg-gray-50" },
];

const sidebarGroups = [
  {
    label: "Perjalanan",
    items: [
      { to: "/jamaah", icon: Home, label: "Beranda", exact: true },
      { to: "/my-bookings", icon: Plane, label: "Booking Saya" },
      { to: "/jamaah/itinerary", icon: CalendarDays, label: "Itinerary" },
      { to: "/jamaah/digital-id", icon: QrCode, label: "ID Digital" },
      { to: "/jamaah/visa", icon: Shield, label: "Tracker Visa" },
      { to: "/jamaah/rombongan", icon: Users, label: "Rombongan" },
    ],
  },
  {
    label: "Keuangan",
    items: [
      { to: "/jamaah/payment", icon: CreditCard, label: "Bayar Online" },
      { to: "/jamaah/payment-history", icon: Wallet, label: "Riwayat Bayar" },
      { to: "/jamaah/checklist", icon: FileText, label: "Checklist" },
      { to: "/jamaah/documents", icon: FileSignature, label: "Dokumen" },
    ],
  },
  {
    label: "Ibadah",
    items: [
      { to: "/jamaah/manasik", icon: GraduationCap, label: "Manasik Digital" },
      { to: "/jamaah/panduan-ibadah", icon: BookOpen, label: "Panduan Ibadah" },
      { to: "/jamaah/waktu-sholat", icon: Clock, label: "Waktu Sholat" },
      { to: "/jamaah/doa-panduan", icon: BookMarked, label: "Doa & Dzikir" },
      { to: "/jamaah/tracker-ibadah", icon: Star, label: "Tracker Ibadah" },
      { to: "/jamaah/kesehatan", icon: Heart, label: "Profil Kesehatan" },
    ],
  },
  {
    label: "Komunitas",
    items: [
      { to: "/jamaah/chat", icon: MessageCircle, label: "Chat Rombongan" },
      { to: "/jamaah/galeri", icon: Camera, label: "Galeri Foto" },
    ],
  },
  {
    label: "Akun",
    items: [
      { to: "/jamaah/notifications", icon: Bell, label: "Notifikasi", showBadge: true },
      { to: "/customer/settings", icon: User, label: "Profil & Pengaturan" },
    ],
  },
];

const SIDEBAR_COLLAPSED_KEY = "jamaah-sidebar-collapsed";

export function JamaahBottomNav() {
  const location = useLocation();
  const { unreadCount } = useNotifications();
  const [moreOpen, setMoreOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  });

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

  return (
    <>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-50 bg-background border-r transition-all duration-300 shadow-sm",
          sidebarCollapsed ? "w-16" : "w-60"
        )}
      >
        {/* Sidebar Header */}
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

        {/* Navigation Groups */}
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

        {/* Sidebar Footer */}
        {!sidebarCollapsed && (
          <div className="border-t px-3 py-3 shrink-0">
            <Link
              to="/"
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Kembali ke Website
            </Link>
          </div>
        )}
      </aside>

      {/* ── MOBILE "LEBIH" OVERLAY ── */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          <div className="relative bg-background rounded-t-2xl shadow-2xl px-4 pt-4 pb-28 z-10 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base">Menu Lengkap</h3>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-1.5 rounded-full hover:bg-muted"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {moreMenuItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-muted transition-colors"
                >
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", item.color)}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] text-center leading-tight font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE BOTTOM NAV BAR ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t py-2 px-4 z-40 safe-area-inset-bottom">
        <div className="flex justify-around max-w-md mx-auto">
          {mobileNavItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors relative",
                  active ? "text-primary" : "text-muted-foreground hover:text-primary"
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

          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors",
              moreOpen ? "text-primary" : "text-muted-foreground hover:text-primary"
            )}
          >
            <LayoutGrid className="h-5 w-5" />
            <span className="text-[10px] leading-none">Lebih</span>
          </button>
        </div>
      </div>
    </>
  );
}
