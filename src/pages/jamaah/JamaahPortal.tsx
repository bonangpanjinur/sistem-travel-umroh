import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  User, CreditCard, Plane, MapPin, Phone,
  Calendar, Clock, Hotel, Users, FileText, QrCode,
  Download, Share2, Wifi, WifiOff, Home, ChevronRight, Navigation,
  Bell
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { id } from "date-fns/locale";
import { Link } from "react-router-dom";
import { formatCurrency } from "@/lib/format";
import { SOSButton } from "@/components/jamaah/SOSButton";
import { LiveLocationShare } from "@/components/jamaah/LiveLocationShare";
import { useNotifications } from "@/hooks/useNotifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function JamaahPortal() {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Monitor online/offline status
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

  // Listen for PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  // Fetch customer data
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

  // Fetch active booking
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

  // Fetch loyalty points
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
    
    if (outcome === "accepted") {
      toast.success("Aplikasi berhasil diinstall!");
    }
    setDeferredPrompt(null);
  };

  const departure = booking?.departure;
  const daysUntilDeparture = departure?.departure_date 
    ? differenceInDays(new Date(departure.departure_date), new Date())
    : null;

  // Get muthawif phone from departure
  const muthawifPhone = departure?.muthawif?.phone || undefined;

  const paymentProgress = booking 
    ? ((booking.paid_amount || 0) / booking.total_price) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary-foreground/20">
              <AvatarImage src={customer?.photo_url || ""} />
              <AvatarFallback className="bg-primary-foreground/10">
                {customer?.full_name?.[0] || "J"}
              </AvatarFallback>
            </Avatar>
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
                  notifications.map((n) => (
                    <DropdownMenuItem 
                      key={n.id} 
                      className={`flex flex-col items-start gap-1 p-3 ${!n.is_read ? 'bg-primary/5' : ''}`}
                      onClick={() => markAsRead.mutate(n.id)}
                    >
                      <p className="font-semibold text-xs">{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {format(new Date(n.created_at), "d MMM, HH:mm", { locale: id })}
                      </p>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    Tidak ada notifikasi baru
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <SOSButton 
              customerName={customer?.full_name || "Jamaah"}
              muthawifPhone={muthawifPhone}
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
        {/* Countdown Card */}
        {daysUntilDeparture !== null && daysUntilDeparture > 0 && (
          <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Keberangkatan dalam</p>
                  <p className="text-4xl font-bold">{daysUntilDeparture}</p>
                  <p className="text-sm opacity-80">hari lagi</p>
                </div>
                <Plane className="h-16 w-16 opacity-20" />
              </div>
              <Separator className="my-3 bg-primary-foreground/20" />
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                <span>
                  {format(new Date(departure?.departure_date || ""), "EEEE, dd MMMM yyyy", { locale: id })}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2">
          <Link to="/my-bookings">
            <Card className="p-3 text-center hover:bg-accent transition-colors cursor-pointer">
              <CreditCard className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="text-xs">Booking</p>
            </Card>
          </Link>
          <Link to="/jamaah/digital-id">
            <Card className="p-3 text-center hover:bg-accent transition-colors cursor-pointer">
              <QrCode className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="text-xs">ID Digital</p>
            </Card>
          </Link>
          <Link to="/jamaah/itinerary">
            <Card className="p-3 text-center hover:bg-accent transition-colors cursor-pointer">
              <MapPin className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="text-xs">Itinerary</p>
            </Card>
          </Link>
          <Link to="/jamaah/documents">
            <Card className="p-3 text-center hover:bg-accent transition-colors cursor-pointer">
              <FileText className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="text-xs">Dokumen</p>
            </Card>
          </Link>
        </div>

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
              {/* Hotels */}
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

              {/* Flight */}
              <div className="flex items-start gap-3">
                <Plane className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{departure.airline?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {departure.flight_number} • {departure.departure_time || "TBA"}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Guide */}
              {departure.muthawif && (
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Muthawif</p>
                    <p className="text-sm text-muted-foreground">{departure.muthawif.name}</p>
                  </div>
                </div>
              )}
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
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{loyalty.current_points || 0}</p>
                <p className="text-sm text-muted-foreground">Poin tersedia</p>
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

        {/* Emergency Contacts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Kontak Darurat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="tel:+6281234567890"
              className="flex items-center justify-between p-2 rounded-lg hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Hotline 24 Jam</p>
                  <p className="text-xs text-muted-foreground">+62 812-3456-7890</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </a>
            <a
              href="tel:+966123456789"
              className="flex items-center justify-between p-2 rounded-lg hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Kantor Jeddah</p>
                  <p className="text-xs text-muted-foreground">+966 12-345-6789</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t py-2 px-4">
        <div className="flex justify-around">
          <Link to="/jamaah" className="flex flex-col items-center text-primary">
            <Home className="h-5 w-5" />
            <span className="text-xs">Beranda</span>
          </Link>
          <Link to="/jamaah/digital-id" className="flex flex-col items-center text-muted-foreground hover:text-primary">
            <QrCode className="h-5 w-5" />
            <span className="text-xs">ID</span>
          </Link>
          <Link to="/jamaah/itinerary" className="flex flex-col items-center text-muted-foreground hover:text-primary">
            <MapPin className="h-5 w-5" />
            <span className="text-xs">Itinerary</span>
          </Link>
          <Link to="/settings" className="flex flex-col items-center text-muted-foreground hover:text-primary">
            <User className="h-5 w-5" />
            <span className="text-xs">Profil</span>
          </Link>
        </div>
      </div>
    </div>
  );
}