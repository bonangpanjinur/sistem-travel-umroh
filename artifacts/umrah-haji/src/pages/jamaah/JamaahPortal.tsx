import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompanySettings } from "@/hooks/useCompanySettings";
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
  MessageSquare, Image, Gift, Scale, Scroll, GraduationCap
} from "lucide-react";
import { format, differenceInDays, differenceInSeconds } from "date-fns";
import { id } from "date-fns/locale";
import { Link, useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/format";
import { SOSButton } from "@/components/jamaah/SOSButton";
import { LiveLocationShare } from "@/components/jamaah/LiveLocationShare";
import { useNotifications } from "@/hooks/useNotifications";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { CuacaWidget } from "@/components/jamaah/CuacaWidget";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const WELCOME_SEEN_KEY = "jamaah-welcome-seen";

export default function JamaahPortal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const { getSetting } = useCompanySettings();
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [liveCountdown, setLiveCountdown] = useState({ h: 0, m: 0, s: 0 });

  // P4: Redirect first-time users to welcome/onboarding flow
  useEffect(() => {
    const seen = localStorage.getItem(WELCOME_SEEN_KEY);
    if (!seen) {
      navigate("/jamaah/welcome", { replace: true });
    }
  }, [navigate]);

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

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Q6: Avatar clickable untuk upload foto */}
            <div className="relative">
              <button
                onClick={() => photoInputRef.current?.click()}
                className="relative group"
                title="Ganti foto profil"
              >
                <Avatar className="h-10 w-10 border-2 border-primary-foreground/20">
                  <AvatarImage src={customer?.photo_url || ""} />
                  <AvatarFallback className="bg-primary-foreground/10">
                    {uploadingPhoto ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      customer?.full_name?.[0] || "J"
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-3 w-3 text-white" />
                </div>
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
              <p className="font-semibold">{customer?.full_name || "Jamaah"}</p>
              <p className="text-xs opacity-80">
                {isOnline ? (
                  <span className="flex items-center gap-1">
                    <Wifi className="h-3 w-3" /> Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <WifiOff className="h-3 w-3" /> Offline
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-primary-foreground relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-primary" />
                  )}
                </Button>
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
              muthawifPhone={muthawifPhone}
              emergencyPhone={emergencyPhone}
              bookingCode={booking?.booking_code}
            />
          </div>
        </div>
      </div>

      {/* Install Banner */}
      {deferredPrompt && (
        <div className="bg-accent p-3 flex items-center justify-between">
          <p className="text-sm">Install aplikasi untuk akses offline</p>
          <Button size="sm" variant="outline" onClick={handleInstallPWA}>
            <Download className="h-4 w-4 mr-1" />
            Install
          </Button>
        </div>
      )}

      <div className="p-4 space-y-4">
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
                <Link to="/packages">
                  Lihat Paket Tersedia <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to="/my-bookings">Cek Booking Saya</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Q5: Empty state saat customer belum terdaftar */}
        {!customer && (
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
                <Link to="/customer/settings">Lengkapi Profil</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions — Tersusun per Kategori */}
        <div className="space-y-4">

          {/* 1. Perjalanan & Booking */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 px-0.5">
              <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Plane className="h-3 w-3 text-blue-600" />
              </div>
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Perjalanan</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Link to="/my-bookings">
                <Card className="p-3 text-center hover:bg-blue-50 transition-colors cursor-pointer border-blue-100">
                  <CreditCard className="h-6 w-6 mx-auto mb-1 text-blue-600" />
                  <p className="text-xs">Booking</p>
                </Card>
              </Link>
              <Link to="/jamaah/itinerary">
                <Card className="p-3 text-center hover:bg-blue-50 transition-colors cursor-pointer border-blue-100">
                  <CalendarDays className="h-6 w-6 mx-auto mb-1 text-blue-500" />
                  <p className="text-xs">Itinerary</p>
                </Card>
              </Link>
              <Link to="/jamaah/digital-id">
                <Card className="p-3 text-center hover:bg-blue-50 transition-colors cursor-pointer border-blue-100">
                  <QrCode className="h-6 w-6 mx-auto mb-1 text-indigo-500" />
                  <p className="text-xs">ID Digital</p>
                </Card>
              </Link>
              <Link to="/jamaah/documents">
                <Card className="p-3 text-center hover:bg-blue-50 transition-colors cursor-pointer border-blue-100">
                  <FolderOpen className="h-6 w-6 mx-auto mb-1 text-orange-500" />
                  <p className="text-xs">Dokumen</p>
                </Card>
              </Link>
            </div>
          </div>

          {/* 2. Administrasi & Keuangan */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 px-0.5">
              <div className="w-5 h-5 rounded bg-green-100 flex items-center justify-center flex-shrink-0">
                <CreditCard className="h-3 w-3 text-green-600" />
              </div>
              <span className="text-xs font-bold text-green-700 uppercase tracking-wide">Keuangan & Admin</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Link to="/jamaah/payment">
                <Card className="p-3 text-center hover:bg-green-50 transition-colors cursor-pointer border-green-100">
                  <CreditCard className="h-6 w-6 mx-auto mb-1 text-green-600" />
                  <p className="text-xs">Bayar Online</p>
                </Card>
              </Link>
              <Link to="/jamaah/checklist">
                <Card className="p-3 text-center hover:bg-green-50 transition-colors cursor-pointer border-green-100">
                  <Scale className="h-6 w-6 mx-auto mb-1 text-emerald-600" />
                  <p className="text-xs">Checklist</p>
                </Card>
              </Link>
              {booking ? (
                <Link to={`/jamaah/invoice/${booking.id}`}>
                  <Card className="p-3 text-center hover:bg-green-50 transition-colors cursor-pointer border-green-100">
                    <FileText className="h-6 w-6 mx-auto mb-1 text-violet-600" />
                    <p className="text-xs">Invoice</p>
                  </Card>
                </Link>
              ) : (
                <Card className="p-3 text-center opacity-40 cursor-not-allowed border-green-100">
                  <FileText className="h-6 w-6 mx-auto mb-1 text-violet-400" />
                  <p className="text-xs">Invoice</p>
                </Card>
              )}
              <Link to="/jamaah/kontrak">
                <Card className="p-3 text-center hover:bg-green-50 transition-colors cursor-pointer border-green-100">
                  <FileSignature className="h-6 w-6 mx-auto mb-1 text-orange-500" />
                  <p className="text-xs">Kontrak</p>
                </Card>
              </Link>
            </div>
          </div>

          {/* 3. Ibadah & Spiritual */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 px-0.5">
              <div className="w-5 h-5 rounded bg-teal-100 flex items-center justify-center flex-shrink-0">
                <Heart className="h-3 w-3 text-teal-600" />
              </div>
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wide">Ibadah & Spiritual</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Link to="/jamaah/manasik">
                <Card className="p-3 text-center hover:bg-teal-50 transition-colors cursor-pointer border-teal-100">
                  <GraduationCap className="h-6 w-6 mx-auto mb-1 text-indigo-600" />
                  <p className="text-xs">Manasik</p>
                </Card>
              </Link>
              <Link to="/jamaah/panduan-ibadah">
                <Card className="p-3 text-center hover:bg-teal-50 transition-colors cursor-pointer border-teal-100">
                  <BookOpen className="h-6 w-6 mx-auto mb-1 text-emerald-600" />
                  <p className="text-xs">Panduan</p>
                </Card>
              </Link>
              <Link to="/jamaah/waktu-sholat">
                <Card className="p-3 text-center hover:bg-teal-50 transition-colors cursor-pointer border-teal-100">
                  <Clock className="h-6 w-6 mx-auto mb-1 text-teal-600" />
                  <p className="text-xs">Waktu Sholat</p>
                </Card>
              </Link>
              <Link to="/jamaah/doa-panduan">
                <Card className="p-3 text-center hover:bg-teal-50 transition-colors cursor-pointer border-teal-100">
                  <BookMarked className="h-6 w-6 mx-auto mb-1 text-teal-500" />
                  <p className="text-xs">Doa</p>
                </Card>
              </Link>
            </div>
          </div>

          {/* 4. Komunitas */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 px-0.5">
              <div className="w-5 h-5 rounded bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Users className="h-3 w-3 text-purple-600" />
              </div>
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">Komunitas</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Link to="/jamaah/chat">
                <Card className="p-3 text-center hover:bg-purple-50 transition-colors cursor-pointer border-purple-100">
                  <MessageSquare className="h-6 w-6 mx-auto mb-1 text-blue-500" />
                  <p className="text-xs">Chat</p>
                </Card>
              </Link>
              <Link to="/jamaah/rombongan">
                <Card className="p-3 text-center hover:bg-purple-50 transition-colors cursor-pointer border-purple-100">
                  <Users className="h-6 w-6 mx-auto mb-1 text-indigo-600" />
                  <p className="text-xs">Rombongan</p>
                </Card>
              </Link>
              <Link to="/jamaah/galeri">
                <Card className="p-3 text-center hover:bg-purple-50 transition-colors cursor-pointer border-purple-100">
                  <Image className="h-6 w-6 mx-auto mb-1 text-pink-500" />
                  <p className="text-xs">Galeri</p>
                </Card>
              </Link>
              <Link to="/jamaah/referral">
                <Card className="p-3 text-center hover:bg-purple-50 transition-colors cursor-pointer border-purple-100">
                  <Gift className="h-6 w-6 mx-auto mb-1 text-green-600" />
                  <p className="text-xs">Referral</p>
                </Card>
              </Link>
            </div>
          </div>

          {/* 5. Alat Bantu */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 px-0.5">
              <div className="w-5 h-5 rounded bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-3 w-3 text-amber-600" />
              </div>
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Alat Bantu</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Link to="/jamaah/peta-lokasi">
                <Card className="p-3 text-center hover:bg-amber-50 transition-colors cursor-pointer border-amber-100">
                  <Map className="h-6 w-6 mx-auto mb-1 text-rose-500" />
                  <p className="text-xs">Peta</p>
                </Card>
              </Link>
              <Link to="/jamaah/kalkulator-kurs">
                <Card className="p-3 text-center hover:bg-amber-50 transition-colors cursor-pointer border-amber-100">
                  <DollarSign className="h-6 w-6 mx-auto mb-1 text-emerald-700" />
                  <p className="text-xs">Kurs Riyal</p>
                </Card>
              </Link>
              <Link to="/jamaah/bagasi">
                <Card className="p-3 text-center hover:bg-amber-50 transition-colors cursor-pointer border-amber-100">
                  <Luggage className="h-6 w-6 mx-auto mb-1 text-cyan-600" />
                  <p className="text-xs">Bagasi</p>
                </Card>
              </Link>
              <Link to="/faq">
                <Card className="p-3 text-center hover:bg-amber-50 transition-colors cursor-pointer border-amber-100">
                  <HelpCircle className="h-6 w-6 mx-auto mb-1 text-blue-500" />
                  <p className="text-xs">FAQ</p>
                </Card>
              </Link>
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
                  <Link to={`/my-bookings/${booking.id}/payment`}>Upload Bukti Bayar</Link>
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
