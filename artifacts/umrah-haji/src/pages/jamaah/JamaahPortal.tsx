import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { usePWAMode } from "@/hooks/usePWAMode";
import { usePWAConfig } from "@/hooks/usePWAConfig";
import { useWebsiteSettings, WebsiteSettings } from "@/hooks/useWebsiteSettingsOptimized";
import { BannerCarousel } from "@/components/home/BannerCarousel";
import { QuickMenuGrid } from "@/components/home/QuickMenuGrid";
import { JamaahTrackerWidget } from "@/components/home/JamaahTrackerWidget";
import { FeaturedPackages } from "@/components/home/FeaturedPackages";
import { WhyChooseUs } from "@/components/home/WhyChooseUs";
import { Testimonials } from "@/components/home/Testimonials";
import { ThemedCTASection } from "@/components/home/ThemedCTASection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  CreditCard, Plane, Phone,
  Calendar, Hotel, Users, FolderOpen, QrCode,
  Download, Wifi, WifiOff, ChevronRight,
  Bell, BookOpen, HelpCircle, CalendarDays, Map,
  Star, Camera, Loader2, Package, ArrowRight,
  Clock, DollarSign, FileText, Megaphone,
  Heart, Sparkles, Luggage, FileSignature, BookMarked,
  MessageSquare, Image, Gift, Scale, Scroll, GraduationCap, BellRing,
  ShoppingBag, Receipt, CheckCircle, MapPin, Zap, Trophy,
  Moon, Sun, Radio
} from "lucide-react";
import { format, differenceInDays, differenceInSeconds } from "date-fns";
import { id } from "date-fns/locale";
import { Link, useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/format";
import { SOSButton } from "@/components/jamaah/SOSButton";
import { TourLeaderSOSPanel } from "@/components/jamaah/TourLeaderSOSPanel";
import { LiveLocationShare } from "@/components/jamaah/LiveLocationShare";
import { useNotifications } from "@/hooks/useNotifications";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useGeoNotification } from "@/hooks/useGeoNotification";
import { restorePendingFollowup } from "@/hooks/useChatbotFollowup";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { CuacaWidget } from "@/components/jamaah/CuacaWidget";
import { IslamicHomeSections } from "@/components/jamaah/home/IslamicHomeSections";
import { ProfileProgressCard } from "@/components/jamaah/home/ProfileProgressCard";
import { PushOnboardingSheet } from "@/components/pwa/PushOnboardingSheet";
import { LogIn } from "lucide-react";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useRecentlyViewedPackages } from "@/hooks/useRecentlyViewedPackages";
import { useWishlist } from "@/hooks/useWishlist";
import { slugify } from "@/lib/slug";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const WELCOME_SEEN_KEY = "jamaah-welcome-seen";

const PWA_SECTION_COMPONENTS: Record<string, React.ComponentType<{ settings?: WebsiteSettings }>> = {
  featured_packages: FeaturedPackages as any,
  why_choose_us: WhyChooseUs as any,
  testimonials: Testimonials as any,
  cta: ThemedCTASection as any,
};

function PushNotifBanner({ customerId }: { customerId?: string }) {
  const { canSubscribe, isSubscribed, isLoading, subscribe, permission } =
    usePushSubscription(customerId);
  if (!canSubscribe || isSubscribed || permission === "denied") return null;
  return (
    <div className="bg-amber-50 border-y border-amber-200 p-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <BellRing className="h-4 w-4 text-amber-600" />
        <p className="text-sm text-amber-900">Aktifkan notifikasi untuk update penting</p>
      </div>
      <Button size="sm" variant="outline" onClick={subscribe} disabled={isLoading}
        className="border-amber-400 text-amber-800 hover:bg-amber-100">
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aktifkan"}
      </Button>
    </div>
  );
}

function getRoomTypeLabel(type?: string): string {
  const map: Record<string, string> = {
    quad: "Quad (4 orang)",
    triple: "Triple (3 orang)",
    double: "Double (2 orang)",
    single: "Single (1 orang)",
  };
  return type ? (map[type] || type) : "-";
}

export default function JamaahPortal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const { isDark, toggle: toggleDark } = useDarkMode();
  const { getSetting } = useCompanySettings();
  const { items: recentlyViewed, clearAll: clearRecentlyViewed } = useRecentlyViewedPackages();
  const { ids: wishlistIds, packages: wishlistPackages, count: wishlistCount } = useWishlist();
  const { isStandalone } = usePWAMode();
  const { pwaLayout, pwaTheme } = usePWAConfig();
  const { data: settings } = useWebsiteSettings();
  const template = settings?.template || 'classic';

  // Notifikasi Geolokasi: alert ketika mendekati lokasi suci
  useGeoNotification(true);
  const queryClient = useQueryClient();

  // Restore any pending chatbot follow-up reminder on portal load
  useEffect(() => {
    restorePendingFollowup().catch(() => {});
  }, []);

  // Apply PWA-specific theme colors when in standalone mode
  useEffect(() => {
    if (isStandalone && pwaTheme) {
      document.documentElement.style.setProperty('--primary', pwaTheme.primaryColor);
      document.documentElement.style.setProperty('--background', pwaTheme.backgroundColor);
    }
  }, [isStandalone, pwaTheme]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [liveCountdown, setLiveCountdown] = useState({ h: 0, m: 0, s: 0 });

  // P4: Redirect first-time SIGNED-IN users to welcome/onboarding flow.
  // Guests stay on the home portal (no login wall).
  useEffect(() => {
    if (!user?.id) return;
    const seen = localStorage.getItem(WELCOME_SEEN_KEY);
    if (!seen) {
      navigate("/jamaah/welcome", { replace: true });
    }
  }, [navigate, user?.id]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const { data: customer } = useQuery({
    queryKey: ["jamaah-customer", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: booking } = useQuery({
    queryKey: ["jamaah-booking", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return null;
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          departure:departures(
            *,
            package:packages(*),
            hotel_makkah:hotels!departures_hotel_makkah_id_fkey(*),
            hotel_madinah:hotels!departures_hotel_madinah_id_fkey(*),
            airline:airlines(*),
            muthawif:muthawifs(*)
          )
        `)
        .eq("customer_id", customer.id)
        .in("booking_status", ["confirmed", "completed"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id,
  });

  // P6: Live countdown timer (jam & menit)
  useEffect(() => {
    const tick = () => {
      const departure = (booking as any)?.departure?.departure_date;
      if (!departure) return;
      const now = new Date();
      const target = new Date(departure);
      const totalSeconds = differenceInSeconds(target, now);
      if (totalSeconds <= 0) return;
      const h = Math.floor((totalSeconds % 86400) / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      setLiveCountdown({ h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [(booking as any)?.departure?.departure_date]);

  const { data: announcements } = useQuery({
    queryKey: ["jamaah-announcements", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "announcement")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) return [];
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const { data: loyalty } = useQuery({
    queryKey: ["jamaah-loyalty", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return null;
      const { data, error } = await supabase
        .from("loyalty_points")
        .select("*")
        .eq("customer_id", customer.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id,
  });

  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      toast.info("Untuk menginstall, gunakan menu browser > 'Add to Home Screen'");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") toast.success("Aplikasi berhasil diinstall!");
    setDeferredPrompt(null);
  };

  // Render PWA section based on section ID
  const renderPWASection = (sectionId: string) => {
    switch (sectionId) {
      case 'hero':
        return <BannerCarousel template={template as any} key="hero-banner" waNumber={settings?.footer_whatsapp ?? undefined} compact={true} />;
      case 'quick_menu':
        return <QuickMenuGrid settings={settings ?? undefined} key="quick-menu" />;
      case 'tracker':
        return <JamaahTrackerWidget key="tracker" />;
      case 'profile_progress':
        return <ProfileProgressCard key="profile-progress" isGuest={!user} customer={customer} booking={booking} />;
      case 'islamic_home':
        return <IslamicHomeSections key="islamic-home" customerName={customer?.full_name} customerId={customer?.id} />;
      default: {
        const Component = PWA_SECTION_COMPONENTS[sectionId];
        return Component ? <Component key={sectionId} settings={settings ?? undefined} /> : null;
      }
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!customer?.id) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran foto maksimal 5MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }
    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `avatars/${customer.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("customer-documents")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from("customer-documents")
        .getPublicUrl(path);
      await supabase
        .from("customers")
        .update({ photo_url: urlData.publicUrl })
        .eq("id", customer.id);
      queryClient.invalidateQueries({ queryKey: ["jamaah-customer"] });
      toast.success("Foto profil berhasil diperbarui!");
    } catch (err: any) {
      toast.error(err.message || "Gagal upload foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const departure = booking?.departure;
  const daysUntilDeparture = departure?.departure_date
    ? differenceInDays(new Date(departure.departure_date), new Date())
    : null;
  const muthawifPhone = departure?.muthawif?.phone || undefined;
  const emergencyPhone = getSetting("emergency_contact_phone") || getSetting("company_phone");
  const paymentProgress = booking
    ? ((booking.paid_amount || 0) / booking.total_price) * 100
    : 0;

  const greetingText = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const firstName = customer?.full_name?.split(' ')[0] || (user ? 'Jamaah' : 'Tamu');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background pb-24 md:pb-6">
      {/* ── MODERN HEADER ── */}
      <div className="relative bg-gradient-to-br from-primary via-primary to-primary/85 text-primary-foreground overflow-hidden sticky top-0 z-50 shadow-lg">
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative px-4 pt-5 pb-4">
          <div className="flex items-center justify-between">
            {/* Left: Avatar + Greeting */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => user && photoInputRef.current?.click()}
                  className="relative group"
                  title={user ? "Ganti foto profil" : "Tamu"}
                >
                  <Avatar className="h-11 w-11 border-2 border-white/30 shadow-md">
                    <AvatarImage src={customer?.photo_url || ""} />
                    <AvatarFallback className="bg-white/15 text-white font-bold text-base">
                      {uploadingPhoto ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        firstName[0]?.toUpperCase() || '🕌'
                      )}
                    </AvatarFallback>
                  </Avatar>
                  {user && (
                    <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="h-3 w-3 text-white" />
                    </div>
                  )}
                  {/* Online dot */}
                  <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-primary ${isOnline ? 'bg-green-400' : 'bg-gray-400'}`} />
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoUpload(file);
                    e.target.value = "";
                  }}
                />
              </div>
              <div>
                <p className="text-[11px] opacity-75 font-medium">{greetingText()},</p>
                <p className="font-bold text-base leading-tight">{firstName}</p>
                {booking && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
                    <p className="text-[10px] opacity-80">{booking.booking_code}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5">
              {/* Dark / Light mode toggle — always visible */}
              <button
                onClick={toggleDark}
                title={isDark ? "Mode Terang" : "Mode Gelap"}
                aria-label={isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all"
              >
                {isDark
                  ? <Sun className="h-5 w-5 text-amber-300" />
                  : <Moon className="h-5 w-5 text-white" />
                }
              </button>
              {user ? (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                        <Bell className="h-5 w-5" />
                        {unreadCount > 0 && (
                          <span className="absolute top-1 right-1 h-4 w-4 flex items-center justify-center bg-red-500 rounded-full text-[9px] font-bold border border-primary">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                      <DropdownMenuLabel>Notifikasi</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {notifications && notifications.length > 0 ? (
                        notifications.slice(0, 5).map((n) => (
                          <DropdownMenuItem
                            key={n.id}
                            className={`flex flex-col items-start gap-1 p-3 ${!n.is_read ? "bg-primary/5" : ""}`}
                            onClick={() => markAsRead.mutate(n.id)}
                          >
                            <p className="font-semibold text-xs">{n.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {format(new Date(n.created_at!), "d MMM, HH:mm", { locale: id })}
                            </p>
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                          Tidak ada notifikasi baru
                        </div>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/jamaah/notifications" className="w-full text-center text-xs text-primary">
                          Lihat Semua Notifikasi
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <SOSButton
                    customerName={customer?.full_name || "Jamaah"}
                    customerId={customer?.id}
                    departureId={(booking as any)?.departure_id}
                    muthawifPhone={muthawifPhone}
                    emergencyPhone={emergencyPhone}
                    bookingCode={booking?.booking_code}
                  />
                </>
              ) : (
                <Button asChild size="sm" className="h-8 px-3 text-xs font-semibold bg-white text-primary hover:bg-white/90">
                  <Link to="/auth/login">
                    <LogIn className="h-3.5 w-3.5 mr-1" /> Masuk
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* ── Quick Stats Strip ── */}
          {booking && (
            <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-0.5">
              {daysUntilDeparture !== null && daysUntilDeparture >= 0 && (
                <div className="flex-shrink-0 bg-white/15 rounded-xl px-3 py-1.5 flex items-center gap-2">
                  <Plane className="h-3.5 w-3.5 opacity-80" />
                  <div>
                    <p className="text-[9px] opacity-70 uppercase tracking-wide">Berangkat</p>
                    <p className="text-xs font-bold">{daysUntilDeparture === 0 ? 'Hari Ini!' : `${daysUntilDeparture} hari lagi`}</p>
                  </div>
                </div>
              )}
              <div className="flex-shrink-0 bg-white/15 rounded-xl px-3 py-1.5 flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5 opacity-80" />
                <div>
                  <p className="text-[9px] opacity-70 uppercase tracking-wide">Pembayaran</p>
                  <p className="text-xs font-bold">{paymentProgress >= 100 ? 'Lunas ✓' : `${paymentProgress.toFixed(0)}%`}</p>
                </div>
              </div>
              {booking.booking_status && (
                <div className="flex-shrink-0 bg-white/15 rounded-xl px-3 py-1.5 flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 opacity-80" />
                  <div>
                    <p className="text-[9px] opacity-70 uppercase tracking-wide">Status</p>
                    <p className="text-xs font-bold capitalize">{booking.booking_status}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Install Banner */}
      {deferredPrompt && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-primary flex-shrink-0" />
            <p className="text-xs font-medium text-primary">Install untuk akses offline & notifikasi</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleInstallPWA} className="h-7 px-3 text-xs border-primary/30 text-primary">
            Install
          </Button>
        </div>
      )}

      <PushNotifBanner customerId={customer?.id} />
      <PushOnboardingSheet customerId={customer?.id} />

      {/* Dynamic homepage layout — order & visibility controlled from Admin › PWA Settings */}
      <div>
        {pwaLayout
          .filter(section => section.enabled)
          .sort((a, b) => a.order - b.order)
          .map(section => renderPWASection(section.id))}
      </div>

      <div className="px-3 pt-3 pb-4 space-y-4">
        {/* P6: Enhanced Departure Countdown Widget */}
        {daysUntilDeparture !== null && daysUntilDeparture > 0 && (
          <Card className="bg-gradient-to-br from-primary via-primary to-primary/85 text-primary-foreground overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs opacity-75 uppercase tracking-wide font-medium">Hitung Mundur Keberangkatan</p>
                  <p className="text-sm font-medium mt-0.5 opacity-90">
                    {format(new Date(departure?.departure_date || ""), "EEEE, dd MMMM yyyy", { locale: id })}
                  </p>
                </div>
                <Plane className="h-8 w-8 opacity-20" />
              </div>

              {/* Countdown digits */}
              <div className="flex items-end gap-2 mb-3">
                <div className="text-center">
                  <div className="bg-white/15 rounded-xl px-3 py-2 min-w-[56px]">
                    <p className="text-3xl font-bold font-mono leading-none">{String(daysUntilDeparture).padStart(2, "0")}</p>
                  </div>
                  <p className="text-[10px] opacity-70 mt-1">Hari</p>
                </div>
                <p className="text-2xl font-bold opacity-50 mb-3">:</p>
                <div className="text-center">
                  <div className="bg-white/15 rounded-xl px-3 py-2 min-w-[56px]">
                    <p className="text-3xl font-bold font-mono leading-none">{String(liveCountdown.h).padStart(2, "0")}</p>
                  </div>
                  <p className="text-[10px] opacity-70 mt-1">Jam</p>
                </div>
                <p className="text-2xl font-bold opacity-50 mb-3">:</p>
                <div className="text-center">
                  <div className="bg-white/15 rounded-xl px-3 py-2 min-w-[56px]">
                    <p className="text-3xl font-bold font-mono leading-none">{String(liveCountdown.m).padStart(2, "0")}</p>
                  </div>
                  <p className="text-[10px] opacity-70 mt-1">Menit</p>
                </div>
                <p className="text-2xl font-bold opacity-50 mb-3">:</p>
                <div className="text-center">
                  <div className="bg-white/15 rounded-xl px-3 py-2 min-w-[56px]">
                    <p className="text-3xl font-bold font-mono leading-none tabular-nums">{String(liveCountdown.s).padStart(2, "0")}</p>
                  </div>
                  <p className="text-[10px] opacity-70 mt-1">Detik</p>
                </div>
              </div>

              <Separator className="my-3 bg-primary-foreground/20" />

              {/* Preparation mini-checklist */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <Link to="/jamaah/checklist" className="flex flex-col items-center gap-1 bg-white/10 rounded-lg p-2 hover:bg-white/20 transition-colors text-center">
                  <span className="text-base">{booking?.payment_status === "paid" ? "✅" : "💳"}</span>
                  <span className="opacity-80 leading-tight">Pembayaran</span>
                </Link>
                <Link to="/jamaah/documents" className="flex flex-col items-center gap-1 bg-white/10 rounded-lg p-2 hover:bg-white/20 transition-colors text-center">
                  <span className="text-base">📄</span>
                  <span className="opacity-80 leading-tight">Dokumen</span>
                </Link>
                <Link to="/jamaah/kesehatan" className="flex flex-col items-center gap-1 bg-white/10 rounded-lg p-2 hover:bg-white/20 transition-colors text-center">
                  <span className="text-base">❤️</span>
                  <span className="opacity-80 leading-tight">Kesehatan</span>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tour Leader SOS Monitor — only for is_tour_leader customers */}
        {customer?.id && (customer as any).is_tour_leader && (
          <TourLeaderSOSPanel
            customerId={customer.id}
            isTourLeader={true}
          />
        )}

        {/* Q5: Empty state saat belum ada booking */}
        {customer && !booking && (
          <Card className="border-dashed border-2">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Package className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Belum Ada Booking Aktif</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Mulai perjalanan ibadah Anda dengan memesan paket umroh atau haji
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs text-left">
                <div className="p-3 rounded-lg bg-muted/50 flex flex-col items-center text-center gap-1">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-xs">1</span>
                  </div>
                  <p className="font-medium">Pilih Paket</p>
                  <p className="text-muted-foreground">Temukan paket sesuai budget</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 flex flex-col items-center text-center gap-1">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-xs">2</span>
                  </div>
                  <p className="font-medium">Booking</p>
                  <p className="text-muted-foreground">Isi data & bayar DP</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 flex flex-col items-center text-center gap-1">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-xs">3</span>
                  </div>
                  <p className="font-medium">Berangkat</p>
                  <p className="text-muted-foreground">Siap menjalankan ibadah</p>
                </div>
              </div>
              <Button asChild className="w-full">
                <Link to="/jamaah/paket">
                  Lihat Paket Tersedia <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to="/jamaah/booking">Cek Booking Saya</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Q5: Empty state saat customer belum terdaftar */}
        {user && !customer && (
          <Card className="border-dashed border-2 border-amber-300 bg-amber-50">
            <CardContent className="p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                <Bell className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold">Profil Jamaah Belum Terdaftar</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Hubungi admin untuk mendaftarkan data jamaah Anda, atau lengkapi profil terlebih dahulu
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/jamaah/profil">Lengkapi Profil</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Recently Viewed Packages */}
        {recentlyViewed.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Paket Baru Dilihat
                </CardTitle>
                <button
                  onClick={clearRecentlyViewed}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Hapus semua
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentlyViewed.map((pkg) => {
                const slug = `${pkg.id}-${slugify(pkg.name)}`;
                const typeLabel =
                  pkg.package_type === "umroh"
                    ? "Umroh"
                    : pkg.package_type === "haji"
                    ? "Haji"
                    : pkg.package_type === "haji_plus"
                    ? "Haji Plus"
                    : "Umroh Plus";
                return (
                  <Link
                    key={pkg.id}
                    to={`/jamaah/paket/${slug}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors group"
                  >
                    {/* Thumbnail */}
                    <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                      {pkg.featured_image ? (
                        <img
                          src={pkg.featured_image}
                          alt={pkg.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                        {pkg.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {typeLabel}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {pkg.duration_days} hari
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-primary mt-0.5">
                        {formatCurrency(pkg.price_quad, pkg.currency)}
                      </p>
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </Link>
                );
              })}

              <Button asChild variant="ghost" size="sm" className="w-full text-xs mt-1">
                <Link to="/jamaah/paket">
                  Lihat semua paket <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Wishlist Paket */}
        {wishlistCount > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
                  Paket Tersimpan
                </CardTitle>
                <Link
                  to="/jamaah/wishlist"
                  className="text-[11px] text-primary font-semibold hover:underline flex items-center gap-0.5"
                >
                  Lihat semua ({wishlistCount}) <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {wishlistPackages.slice(0, 3).map((pkg: any) => {
                const slug = `${pkg.id}-${slugify(pkg.name)}`;
                const typeLabel =
                  pkg.package_type === "umroh" ? "Umroh" :
                  pkg.package_type === "haji" ? "Haji" :
                  pkg.package_type === "haji_plus" ? "Haji Plus" : "Umroh Plus";
                const price = [pkg.price_quad, pkg.price_triple, pkg.price_double, pkg.price_single]
                  .map(Number).filter(v => v > 0);
                const lowestPrice = price.length > 0 ? Math.min(...price) : 0;
                return (
                  <Link
                    key={pkg.id}
                    to={`/jamaah/paket/${slug}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors group"
                  >
                    <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                      {pkg.featured_image ? (
                        <img src={pkg.featured_image} alt={pkg.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                        {pkg.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{typeLabel}</Badge>
                        <span className="text-[11px] text-muted-foreground">{pkg.duration_days} hari</span>
                      </div>
                      <p className="text-xs font-semibold text-primary mt-0.5">
                        {formatCurrency(lowestPrice, pkg.currency)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </Link>
                );
              })}
              <Button asChild variant="ghost" size="sm" className="w-full text-xs mt-1">
                <Link to="/jamaah/wishlist">
                  Lihat semua wishlist <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── QUICK ACTIONS — Redesigned Modern Grid ── */}
        <div className="rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-border shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Menu Utama</h2>
            <span className="text-[10px] text-muted-foreground">Tap untuk akses cepat</span>
          </div>
        <div className="space-y-5">

          {/* 1. Perjalanan & Booking */}
          <div>
            <div className="flex items-center justify-between mb-2.5 px-0.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-500 flex items-center justify-center shadow-sm">
                  <Plane className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Perjalanan</span>
              </div>
              <Link to="/jamaah/booking" className="text-[11px] text-primary font-medium flex items-center gap-0.5">
                Lihat semua <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {[
                { to: "/jamaah/booking", icon: CreditCard, label: "Booking", color: "bg-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100" },
                { to: "/jamaah/itinerary", icon: CalendarDays, label: "Itinerary", color: "bg-sky-500", bg: "bg-sky-50 dark:bg-sky-950/30 hover:bg-sky-100" },
                { to: "/jamaah/digital-id", icon: QrCode, label: "ID Digital", color: "bg-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100" },
                { to: "/jamaah/documents", icon: FolderOpen, label: "Dokumen", color: "bg-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100" },
              ].map(({ to, icon: Icon, label, color, bg }) => (
                <Link to={to} key={to}>
                  <div className={`rounded-2xl p-3 text-center transition-all duration-150 active:scale-95 ${bg} border border-white/60 dark:border-white/5 shadow-sm`}>
                    <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mx-auto mb-2 shadow-sm`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 leading-tight">{label}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* 2. Keuangan & Admin */}
          <div>
            <div className="flex items-center justify-between mb-2.5 px-0.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center shadow-sm">
                  <CreditCard className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Keuangan & Admin</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {[
                { to: "/jamaah/payment", icon: CreditCard, label: "Bayar", color: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100" },
                { to: "/jamaah/checklist", icon: Scale, label: "Checklist", color: "bg-green-500", bg: "bg-green-50 dark:bg-green-950/30 hover:bg-green-100" },
                { to: booking ? `/jamaah/invoice/${booking.id}` : "#", icon: FileText, label: "Invoice", color: booking ? "bg-violet-500" : "bg-gray-300", bg: booking ? "bg-violet-50 dark:bg-violet-950/30 hover:bg-violet-100" : "bg-gray-50 opacity-50" },
                { to: "/jamaah/kontrak", icon: FileSignature, label: "Kontrak", color: "bg-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100" },
              ].map(({ to, icon: Icon, label, color, bg }) => (
                <Link to={to} key={label}>
                  <div className={`rounded-2xl p-3 text-center transition-all duration-150 active:scale-95 ${bg} border border-white/60 dark:border-white/5 shadow-sm`}>
                    <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mx-auto mb-2 shadow-sm`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 leading-tight">{label}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* 3. Ibadah & Spiritual */}
          <div>
            <div className="flex items-center justify-between mb-2.5 px-0.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-teal-500 flex items-center justify-center shadow-sm">
                  <Heart className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Ibadah & Spiritual</span>
              </div>
              <Link to="/jamaah/manasik" className="text-[11px] text-primary font-medium flex items-center gap-0.5">
                Lihat semua <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {[
                { to: "/jamaah/manasik", icon: GraduationCap, label: "Manasik", color: "bg-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100" },
                { to: "/jamaah/al-quran", icon: BookOpen, label: "Al-Qur'an", color: "bg-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100" },
                { to: "/jamaah/waktu-sholat", icon: Clock, label: "Sholat", color: "bg-teal-500", bg: "bg-teal-50 dark:bg-teal-950/30 hover:bg-teal-100" },
                { to: "/jamaah/doa-panduan", icon: BookMarked, label: "Doa & Dzikir", color: "bg-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-950/30 hover:bg-cyan-100" },
                { to: "/jamaah/kiblat", icon: MapPin, label: "Kiblat", color: "bg-green-600", bg: "bg-green-50 dark:bg-green-950/30 hover:bg-green-100" },
                { to: "/jamaah/tracker-ibadah", icon: Star, label: "Tracker", color: "bg-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100" },
                { to: "/jamaah/pengingat-ibadah", icon: BellRing, label: "Pengingat", color: "bg-rose-500", bg: "bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100" },
                { to: "/jamaah/manasik-interaktif", icon: Scroll, label: "Interaktif", color: "bg-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100" },
              ].map(({ to, icon: Icon, label, color, bg }) => (
                <Link to={to} key={to}>
                  <div className={`rounded-2xl p-3 text-center transition-all duration-150 active:scale-95 ${bg} border border-white/60 dark:border-white/5 shadow-sm`}>
                    <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mx-auto mb-2 shadow-sm`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 leading-tight">{label}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* 4. Komunitas */}
          <div>
            <div className="flex items-center justify-between mb-2.5 px-0.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-500 flex items-center justify-center shadow-sm">
                  <Users className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Komunitas</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {[
                { to: "/jamaah/siaran", icon: Radio, label: "Siaran Live", color: "bg-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100" },
                { to: "/jamaah/chat", icon: MessageSquare, label: "Chat", color: "bg-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100" },
                { to: "/jamaah/rombongan", icon: Users, label: "Rombongan", color: "bg-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100" },
                { to: "/jamaah/galeri", icon: Image, label: "Galeri", color: "bg-pink-500", bg: "bg-pink-50 dark:bg-pink-950/30 hover:bg-pink-100" },
                { to: "/jamaah/referral", icon: Gift, label: "Referral", color: "bg-green-500", bg: "bg-green-50 dark:bg-green-950/30 hover:bg-green-100" },
              ].map(({ to, icon: Icon, label, color, bg }) => (
                <Link to={to} key={to}>
                  <div className={`rounded-2xl p-3 text-center transition-all duration-150 active:scale-95 ${bg} border border-white/60 dark:border-white/5 shadow-sm`}>
                    <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mx-auto mb-2 shadow-sm`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 leading-tight">{label}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* 5. Alat Bantu */}
          <div>
            <div className="flex items-center justify-between mb-2.5 px-0.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500 flex items-center justify-center shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Alat Bantu</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {[
                { to: "/jamaah/peta-lokasi", icon: Map, label: "Peta", color: "bg-rose-500", bg: "bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100" },
                { to: "/jamaah/kalkulator-kurs", icon: DollarSign, label: "Kurs Riyal", color: "bg-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100" },
                { to: "/jamaah/bagasi", icon: Luggage, label: "Bagasi", color: "bg-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-950/30 hover:bg-cyan-100" },
                { to: "/faq", icon: HelpCircle, label: "FAQ", color: "bg-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100" },
                { to: "/store", icon: ShoppingBag, label: "Toko", color: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100" },
                { to: "/store/orders", icon: Receipt, label: "Pesanan", color: "bg-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100" },
              ].map(({ to, icon: Icon, label, color, bg }) => (
                <Link to={to} key={to}>
                  <div className={`rounded-2xl p-3 text-center transition-all duration-150 active:scale-95 ${bg} border border-white/60 dark:border-white/5 shadow-sm`}>
                    <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mx-auto mb-2 shadow-sm`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 leading-tight">{label}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

        </div>
        </div>

        {/* O5: Widget Cuaca Makkah & Madinah */}
        <CuacaWidget />

        {/* Payment Progress */}
        {booking && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Status Pembayaran</CardTitle>
                <Badge variant={paymentProgress >= 100 ? "default" : "secondary"}>
                  {paymentProgress >= 100 ? "Lunas" : `${paymentProgress.toFixed(0)}%`}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={paymentProgress} className="h-2 mb-2" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Terbayar</span>
                <span className="font-medium">{formatCurrency(booking.paid_amount || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sisa</span>
                <span className="font-medium text-destructive">
                  {formatCurrency(booking.remaining_amount || 0)}
                </span>
              </div>
              {(booking.remaining_amount || 0) > 0 && (
                <Button asChild size="sm" className="w-full mt-3">
                  <Link to="/jamaah/payment">Upload Bukti Bayar</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Trip Info */}
        {departure && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{departure.package?.name}</CardTitle>
              <CardDescription>{departure.package?.duration_days} Hari</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Hotel className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Hotel Makkah</p>
                  <p className="text-sm text-muted-foreground">
                    {departure.hotel_makkah?.name} ⭐{departure.hotel_makkah?.star_rating}
                  </p>
                  <p className="text-sm font-medium mt-2">Hotel Madinah</p>
                  <p className="text-sm text-muted-foreground">
                    {departure.hotel_madinah?.name} ⭐{departure.hotel_madinah?.star_rating}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <Plane className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{departure.airline?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {departure.flight_number} • {departure.departure_time || "TBA"}
                  </p>
                </div>
              </div>
              {departure.muthawif && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Muthawif</p>
                      <p className="text-sm text-muted-foreground">{departure.muthawif.name}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* F3: Detail Akomodasi Hotel */}
        {departure && (departure.hotel_makkah || departure.hotel_madinah) && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Hotel className="h-4 w-4" />
                  Detail Akomodasi
                </CardTitle>
                {booking?.booking_status === "confirmed" && (
                  <Badge variant="secondary" className="text-xs">Konfirmasi</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {departure.hotel_makkah && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">🕌 Makkah Al-Mukarramah</p>
                      <p className="font-semibold text-sm">{departure.hotel_makkah.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {"⭐".repeat(Math.min(departure.hotel_makkah.star_rating || 4, 5))} {departure.hotel_makkah.star_rating} Bintang
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {departure.hotel_madinah && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">🕌 Madinah Al-Munawwarah</p>
                      <p className="font-semibold text-sm">{departure.hotel_madinah.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {"⭐".repeat(Math.min(departure.hotel_madinah.star_rating || 4, 5))} {departure.hotel_madinah.star_rating} Bintang
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {/* Nomor Kamar Jamaah */}
              {(booking as any)?.room_number && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs font-medium text-green-700 mb-0.5">🛏️ Nomor Kamar Anda</p>
                  <p className="font-bold text-green-800 text-lg">{(booking as any).room_number}</p>
                  <p className="text-xs text-green-600">Tipe: {getRoomTypeLabel((booking as any).room_type)}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {departure.departure_date && (
                  <div className="p-2 bg-primary/5 rounded-lg">
                    <p className="text-muted-foreground">Check-in</p>
                    <p className="font-semibold">
                      {format(new Date(departure.departure_date), "d MMM yyyy", { locale: id })}
                    </p>
                  </div>
                )}
                {departure.return_date && (
                  <div className="p-2 bg-primary/5 rounded-lg">
                    <p className="text-muted-foreground">Check-out</p>
                    <p className="font-semibold">
                      {format(new Date(departure.return_date), "d MMM yyyy", { locale: id })}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Q2: Tombol feedback untuk booking yang sudah selesai */}
        {booking?.booking_status === "completed" && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Star className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Bagaimana perjalanan Anda?</p>
                  <p className="text-xs text-muted-foreground">Beri ulasan untuk membantu jamaah lain</p>
                </div>
                <Button asChild size="sm" variant="outline" className="border-amber-300">
                  <Link to={`/jamaah/feedback/${booking.id}`}>
                    Beri Ulasan
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loyalty Points */}
        {loyalty && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Poin Loyalitas</CardTitle>
                <Badge>{loyalty.tier_level || "Bronze"}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-primary">{loyalty.current_points || 0}</p>
                  <p className="text-sm text-muted-foreground">Poin tersedia</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/customer/my-loyalty">Tukar Poin</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Live Location Sharing */}
        {customer && (
          <LiveLocationShare
            customerId={customer.id}
            departureId={booking?.departure_id}
            customerName={customer.full_name}
            muthawifPhone={muthawifPhone}
          />
        )}

        {/* F4: Pengumuman dari Pembimbing */}
        {announcements && announcements.length > 0 && (
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" />
                Pengumuman
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {announcements.map((ann: any) => (
                <div key={ann.id} className="p-3 bg-primary/5 border border-primary/10 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm">{ann.title}</p>
                    {!ann.is_read && (
                      <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ann.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    {format(new Date(ann.created_at), "d MMM yyyy, HH:mm", { locale: id })}
                  </p>
                </div>
              ))}
              <Button asChild variant="ghost" size="sm" className="w-full text-xs">
                <Link to="/jamaah/notifications">Lihat semua notifikasi →</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Fase 8 — Engagement & Gamifikasi */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              Ibadah & Pencapaian
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {[
                { to: "/jamaah/badges",        icon: "🏅", label: "Badge Ibadah" },
                { to: "/jamaah/target-ibadah", icon: "🎯", label: "Target Harian" },
                { to: "/jamaah/jurnal",        icon: "📖", label: "Jurnal Ibadah" },
                { to: "/jamaah/doa-counter",   icon: "📿", label: "Doa Counter" },
                { to: "/jamaah/zikir",         icon: "🌅", label: "Zikir Pagi-Petang" },
                { to: "/jamaah/sertifikat",    icon: "🏆", label: "Sertifikat" },
                { to: "/jamaah/galeri",        icon: "📸", label: "Galeri Rombongan" },
              ].map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/40 hover:bg-muted transition-colors"
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-xs font-medium leading-tight">{item.label}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Fase 9 & 10 — Layanan Digital & AI */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Layanan Digital & AI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {[
                { to: "/jamaah/siskohat",     icon: "🕌", label: "Porsi Haji (SISKOHAT)" },
                { to: "/jamaah/chatbot",      icon: "🤖", label: "Chatbot Bantuan" },
                { to: "/jamaah/ringkasan-ai", icon: "✨", label: "Ringkasan Perjalanan AI" },
              ].map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/40 hover:bg-muted transition-colors"
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-xs font-medium leading-tight">{item.label}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contacts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Kontak Darurat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {getSetting("company_phone") && (
              <a
                href={`tel:${getSetting("company_phone")}`}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-accent"
              >
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Hotline 24 Jam</p>
                    <p className="text-xs text-muted-foreground">{getSetting("company_phone")}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </a>
            )}
            {getSetting("company_email") && (
              <a
                href={`mailto:${getSetting("company_email")}`}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-accent"
              >
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Email Support</p>
                    <p className="text-xs text-muted-foreground">{getSetting("company_email")}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </a>
            )}
          </CardContent>
        </Card>
      </div>

      <JamaahBottomNav />
    </div>
  );
}
