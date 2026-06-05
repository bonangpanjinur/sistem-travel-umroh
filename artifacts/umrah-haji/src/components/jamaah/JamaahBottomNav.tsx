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
  { to: "/jamaah",               icon: Home,       label: "Beranda" },
  { to: "/my-bookings",          icon: Plane,       label: "Booking" },
  { to: "/jamaah/payment",       icon: CreditCard,  label: "Bayar" },
  { to: "/jamaah/notifications", icon: Bell,        label: "Notif", showBadge: true },
];

const ICON_MAP: Record<string, any> = {
  Home, QrCode, Shield, Bell, LayoutGrid, FileText, Luggage, LogIn,
  FileSignature, Camera, BookOpen, Wallet, CreditCard, MessageCircle,
  GraduationCap, CalendarDays, Users, Clock, BookMarked, User, Plane,
  Heart, Star, BellRing, Moon, Sun, UsersRound, Trophy, Search,
};

type MenuItem = {
  to: string;
  icon: React.ElementType;
  label: string;
  color: string;
  bg: string;
  category: string;
  keywords?: string;
};

const moreMenuItems: MenuItem[] = [
  { to: "/jamaah/payment",          icon: CreditCard,    label: "Bayar Online",     color: "text-primary",        bg: "bg-primary/10",                              category: "Administrasi", keywords: "pembayaran cicilan dp" },
  { to: "/jamaah/payment-history",  icon: Wallet,        label: "Riwayat Bayar",    color: "text-amber-600",      bg: "bg-amber-50 dark:bg-amber-950/30",            category: "Administrasi", keywords: "histori transaksi" },
  { to: "/jamaah/checklist",        icon: FileText,      label: "Checklist",        color: "text-green-600",      bg: "bg-green-50 dark:bg-green-950/30",            category: "Administrasi", keywords: "daftar persiapan" },
  { to: "/jamaah/documents",        icon: FileSignature, label: "Dokumen",          color: "text-indigo-600",     bg: "bg-indigo-50 dark:bg-indigo-950/30",          category: "Administrasi", keywords: "berkas surat" },
  { to: "/jamaah/checkin",          icon: LogIn,         label: "Check-in",         color: "text-blue-600",       bg: "bg-blue-50 dark:bg-blue-950/30",              category: "Administrasi", keywords: "masuk absensi" },
  { to: "/jamaah/bagasi",           icon: Luggage,       label: "Bagasi",           color: "text-orange-600",     bg: "bg-orange-50 dark:bg-orange-950/30",          category: "Administrasi", keywords: "koper barang bawaan" },
  { to: "/jamaah/kontrak",          icon: FileText,      label: "Kontrak",          color: "text-purple-600",     bg: "bg-purple-50 dark:bg-purple-950/30",          category: "Administrasi", keywords: "perjanjian akad" },
  { to: "/jamaah/manasik",          icon: GraduationCap, label: "Manasik",          color: "text-teal-600",       bg: "bg-teal-50 dark:bg-teal-950/30",              category: "Ibadah",       keywords: "latihan rukun haji umroh" },
  { to: "/jamaah/panduan-ibadah",   icon: BookOpen,      label: "Panduan Ibadah",   color: "text-emerald-600",    bg: "bg-emerald-50 dark:bg-emerald-950/30",        category: "Ibadah",       keywords: "tata cara thawaf sai" },
  { to: "/jamaah/doa-panduan",      icon: BookMarked,    label: "Doa & Dzikir",     color: "text-green-700",      bg: "bg-green-50 dark:bg-green-950/30",            category: "Ibadah",       keywords: "doa panduan wirid" },
  { to: "/jamaah/waktu-sholat",     icon: Clock,         label: "Waktu Sholat",     color: "text-sky-600",        bg: "bg-sky-50 dark:bg-sky-950/30",                category: "Ibadah",       keywords: "jadwal sholat adzan" },
  { to: "/jamaah/tracker-ibadah",   icon: Star,          label: "Tracker Ibadah",   color: "text-yellow-600",     bg: "bg-yellow-50 dark:bg-yellow-950/30",          category: "Ibadah",       keywords: "progress ibadah catatan" },
  { to: "/jamaah/pengingat-ibadah", icon: BellRing,      label: "Pengingat",        color: "text-lime-600",       bg: "bg-lime-50 dark:bg-lime-950/30",              category: "Ibadah",       keywords: "alarm notifikasi jadwal" },
  { to: "/jamaah/galeri",           icon: Camera,        label: "Galeri Foto",      color: "text-pink-600",       bg: "bg-pink-50 dark:bg-pink-950/30",              category: "Komunitas",    keywords: "foto gambar album" },
  { to: "/jamaah/progress-wall",    icon: Trophy,        label: "Progress Wall",    color: "text-amber-600",      bg: "bg-amber-50 dark:bg-amber-950/30",            category: "Komunitas",    keywords: "pencapaian reward" },
  { to: "/jamaah/pantau-keluarga",  icon: UsersRound,    label: "Pantau Keluarga",  color: "text-blue-600",       bg: "bg-blue-50 dark:bg-blue-950/30",              category: "Komunitas",    keywords: "lokasi keluarga" },
  { to: "/jamaah/feedback",         icon: MessageCircle, label: "Feedback",         color: "text-teal-600",       bg: "bg-teal-50 dark:bg-teal-950/30",              category: "Komunitas",    keywords: "ulasan review saran" },
  { to: "/jamaah/digital-id",       icon: QrCode,        label: "ID Digital",       color: "text-violet-600",     bg: "bg-violet-50 dark:bg-violet-950/30",          category: "Lainnya",      keywords: "kartu identitas qr barcode" },
  { to: "/jamaah/visa",             icon: Shield,        label: "Tracker Visa",     color: "text-cyan-600",       bg: "bg-cyan-50 dark:bg-cyan-950/30",              category: "Lainnya",      keywords: "status visa paspor" },
  { to: "/jamaah/wishlist",         icon: Heart,         label: "Wishlist",         color: "text-rose-600",       bg: "bg-rose-50 dark:bg-rose-950/30",              category: "Lainnya",      keywords: "favorit simpan paket" },
  { to: "/jamaah/kesehatan",        icon: Heart,         label: "Profil Kesehatan", color: "text-red-600",        bg: "bg-red-50 dark:bg-red-950/30",                category: "Lainnya",      keywords: "medical rekam medis" },
  { to: "/customer/settings",       icon: User,          label: "Profil & Akun",    color: "text-gray-600",       bg: "bg-gray-100 dark:bg-gray-800",                category: "Lainnya",      keywords: "pengaturan setting sandi" },
];

const CATEGORIES = ["Semua", "Administrasi", "Ibadah", "Komunitas", "Lainnya"] as const;

const sidebarGroups = [
  {
    label: "Perjalanan",
    items: [
      { to: "/jamaah",             icon: Home,          label: "Beranda",            exact: true },
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
      { to: "/jamaah/galeri",        icon: Camera,        label: "Galeri Foto" },
      { to: "/jamaah/progress-wall", icon: Trophy,        label: "Progress Wall" },
      { to: "/jamaah/feedback",      icon: MessageCircle, label: "Feedback" },
    ],
  },
  {
    label: "Akun",
    items: [
      { to: "/jamaah/notifications",   icon: Bell,      label: "Notifikasi",         showBadge: true },
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
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<typeof CATEGORIES[number]>("Semua");
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

  // Reset search/filter when sheet closes
  useEffect(() => {
    if (!moreOpen) {
      setSearchQuery("");
      setActiveCategory("Semua");
    }
  }, [moreOpen]);

  // Prevent body scroll when sheet open
  useEffect(() => {
    document.body.style.overflow = moreOpen ? "hidden" : "";
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

  // Filtered items for search/category
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return moreMenuItems.filter((item) => {
      const matchCat = activeCategory === "Semua" || item.category === activeCategory;
      if (!q) return matchCat;
      const matchSearch =
        item.label.toLowerCase().includes(q) ||
        (item.keywords ?? "").toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [searchQuery, activeCategory]);

  // Group filtered items by category for grouped display
  const groupedFiltered = useMemo(() => {
    if (searchQuery.trim()) return null; // flat when searching
    const groups: Record<string, MenuItem[]> = {};
    filteredItems.forEach((item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems, searchQuery]);

  const closeSheet = () => setMoreOpen(false);

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

      {/* ── MENU LEBIH BOTTOM SHEET — with Search & Filter ── */}
      {moreOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={closeSheet}
          />

          {/* Sheet panel */}
          <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300 max-h-[88vh]">

            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-0 shrink-0">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
            </div>

            {/* Header row */}
            <div className="flex items-center justify-between px-5 pt-3 pb-3 shrink-0">
              <div>
                <h3 className="font-bold text-[15px] text-foreground">Semua Fitur</h3>
                <p className="text-[11px] text-muted-foreground">{moreMenuItems.length} fitur tersedia</p>
              </div>
              <button
                onClick={closeSheet}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors active:scale-95"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Search bar */}
            <div className="px-4 pb-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari fitur... (bayar, manasik, visa...)"
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-muted/70 border border-border/50 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Category filter chips */}
            <div className="px-4 pb-3 shrink-0">
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-semibold transition-all active:scale-95",
                      activeCategory === cat
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border/50 shrink-0" />

            {/* Content area — scrollable */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                    <Search className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="font-semibold text-sm text-foreground">Fitur tidak ditemukan</p>
                  <p className="text-xs text-muted-foreground mt-1">Coba kata kunci lain atau ubah filter</p>
                  <button
                    onClick={() => { setSearchQuery(""); setActiveCategory("Semua"); }}
                    className="mt-4 text-xs font-semibold text-primary"
                  >
                    Reset pencarian
                  </button>
                </div>
              ) : searchQuery.trim() ? (
                /* Flat search results */
                <div className="p-4">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
                    {filteredItems.length} hasil untuk &ldquo;{searchQuery}&rdquo;
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {filteredItems.map((item) => (
                      <MenuGridItem key={item.to} item={item} onClose={closeSheet} />
                    ))}
                  </div>
                </div>
              ) : (
                /* Grouped display */
                <div className="pb-6">
                  {groupedFiltered && Object.entries(groupedFiltered).map(([cat, items]) => (
                    <div key={cat} className="px-4 pt-4">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <span className="w-1 h-3 rounded-full bg-primary/60 inline-block" />
                        {cat}
                      </p>
                      <div className="grid grid-cols-4 gap-2 mb-1">
                        {items.map((item) => (
                          <MenuGridItem key={item.to} item={item} onClose={closeSheet} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

            {/* More / Menu button */}
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

function MenuGridItem({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  return (
    <Link
      to={item.to}
      onClick={onClose}
      className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-muted active:scale-95 transition-all group"
    >
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-transform group-active:scale-90",
        item.bg
      )}>
        <item.icon className={cn("h-5 w-5", item.color)} />
      </div>
      <span className="text-[10px] font-medium text-center leading-tight text-foreground/80 max-w-[56px]">
        {item.label}
      </span>
    </Link>
  );
}
