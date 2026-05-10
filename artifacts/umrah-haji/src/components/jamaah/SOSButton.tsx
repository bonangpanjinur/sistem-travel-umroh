import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertCircle, MapPin, Loader2, Phone, MessageCircle,
  Navigation, Shield, Heart, HelpCircle, X,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SOSButtonProps {
  customerName: string;
  customerId?: string;
  muthawifPhone?: string;
  emergencyPhone?: string;
  bookingCode?: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

type EmergencyType = "medical" | "lost" | "security" | "other";

const EMERGENCY_TYPES: { type: EmergencyType; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
  { type: "medical", label: "Medis / Kesehatan", icon: <Heart className="h-5 w-5" />, color: "text-red-600", bg: "bg-red-50 border-red-200" },
  { type: "lost", label: "Tersesat / Hilang", icon: <MapPin className="h-5 w-5" />, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  { type: "security", label: "Keamanan", icon: <Shield className="h-5 w-5" />, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  { type: "other", label: "Lainnya", icon: <HelpCircle className="h-5 w-5" />, color: "text-gray-600", bg: "bg-gray-50 border-gray-200" },
];

const SAUDI_EMERGENCY = [
  { label: "Ambulans", number: "997", icon: "🚑" },
  { label: "Polisi", number: "999", icon: "🚔" },
  { label: "KJRI Jeddah", number: "+966-12-671-1271", icon: "🇮🇩" },
  { label: "KBRI Riyadh", number: "+966-11-488-2800", icon: "🇮🇩" },
];

const HOLD_DURATION = 3000; // 3 seconds hold to send

export function SOSButton({ customerName, customerId, muthawifPhone, emergencyPhone, bookingCode }: SOSButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [selectedType, setSelectedType] = useState<EmergencyType | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  // Hold-to-send state
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStart = useRef<number>(0);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: new Date(),
        });
        setIsLoadingLocation(false);
      },
      () => {
        setIsLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const startWatchingLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    const wid = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: new Date(),
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    setWatchId(wid);
  }, []);

  const stopWatchingLocation = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchId]);

  const handleOpenSOS = () => {
    setIsOpen(true);
    getCurrentLocation();
    startWatchingLocation();
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedType(null);
    stopWatchingLocation();
    cancelHold();
  };

  const formatEmergencyMessage = useCallback(() => {
    const typeLabel = EMERGENCY_TYPES.find(t => t.type === selectedType)?.label || "Darurat";
    const mapsUrl = location
      ? `https://maps.google.com/maps?q=${location.latitude},${location.longitude}`
      : "[Lokasi tidak tersedia]";
    return (
      `🆘 *SOS DARURAT — ${typeLabel.toUpperCase()}*\n\n` +
      `👤 Nama: ${customerName}\n` +
      `🎫 Booking: ${bookingCode || "-"}\n` +
      `📅 Waktu: ${format(new Date(), "dd MMM yyyy HH:mm", { locale: id })}\n\n` +
      `📍 *Lokasi:*\n${mapsUrl}\n` +
      (location ? `Akurasi: ±${Math.round(location.accuracy)}m\n` : "") +
      `\n⚠️ Mohon bantuan segera!`
    );
  }, [selectedType, customerName, bookingCode, location]);

  const logSOSToDatabase = async (emergencyType: EmergencyType) => {
    try {
      await supabase.from("sos_alerts" as any).insert({
        customer_id: customerId || null,
        booking_code: bookingCode || null,
        emergency_type: emergencyType,
        message: formatEmergencyMessage(),
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        accuracy: location?.accuracy || null,
        status: "active",
      } as any);
    } catch {
      // graceful fail if table not yet created
    }
  };

  const sendSOS = async () => {
    if (!selectedType) return;
    setIsSending(true);
    await logSOSToDatabase(selectedType);

    // vibrate if supported
    if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);

    const message = encodeURIComponent(formatEmergencyMessage());
    const contactPhone = muthawifPhone || emergencyPhone || "";

    if (contactPhone) {
      const clean = contactPhone.replace(/\D/g, "");
      window.open(`https://wa.me/${clean}?text=${message}`, "_blank");
      toast.success("SOS dikirim ke Muthawif/Petugas via WhatsApp");
    } else {
      navigator.clipboard?.writeText(formatEmergencyMessage());
      toast.error("Nomor petugas tidak tersedia. Pesan SOS disalin ke clipboard.");
    }
    setIsSending(false);
    cancelHold();
  };

  const makeCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const shareLiveLocation = () => {
    if (!location) {
      toast.error("Lokasi belum tersedia");
      return;
    }
    const url = `https://maps.google.com/maps?q=${location.latitude},${location.longitude}`;
    if (navigator.share) {
      navigator.share({ title: "Lokasi Darurat", text: `Lokasi ${customerName}`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link lokasi disalin");
    }
  };

  // ── Hold-to-send logic ──
  const startHold = () => {
    if (!selectedType) {
      toast.error("Pilih jenis darurat terlebih dahulu");
      return;
    }
    setIsHolding(true);
    holdStart.current = Date.now();
    if (navigator.vibrate) navigator.vibrate(50);

    holdTimer.current = setInterval(() => {
      const elapsed = Date.now() - holdStart.current;
      const progress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setHoldProgress(progress);
      if (elapsed >= HOLD_DURATION) {
        cancelHold();
        sendSOS();
      }
    }, 50);
  };

  const cancelHold = () => {
    if (holdTimer.current) {
      clearInterval(holdTimer.current);
      holdTimer.current = null;
    }
    setIsHolding(false);
    setHoldProgress(0);
  };

  useEffect(() => {
    return () => {
      stopWatchingLocation();
      cancelHold();
    };
  }, []);

  const contactPhone = muthawifPhone || emergencyPhone || "";
  const defaultPhone = emergencyPhone || "+6281234567890";

  return (
    <>
      {/* ── SOS BUTTON ── */}
      <Button
        variant="destructive"
        size="sm"
        onClick={handleOpenSOS}
        className="relative animate-none"
      >
        <AlertCircle className="h-4 w-4 mr-1" />
        SOS
      </Button>

      {/* ── SOS DIALOG ── */}
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          {/* Red header */}
          <div className="bg-destructive text-destructive-foreground p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-6 w-6" />
                <div>
                  <p className="font-bold text-lg leading-none">SOS DARURAT</p>
                  <p className="text-xs opacity-80 mt-0.5">Tekan & tahan tombol untuk kirim</p>
                </div>
              </div>
              <button onClick={handleClose} className="p-1 rounded-full hover:bg-white/20 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Location Status */}
            <div className={cn(
              "rounded-xl p-3 flex items-center gap-2 text-sm",
              location ? "bg-green-50 border border-green-200" : "bg-muted"
            )}>
              {isLoadingLocation ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
              ) : location ? (
                <MapPin className="h-4 w-4 text-green-600 shrink-0" />
              ) : (
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">
                  {isLoadingLocation ? "Mendeteksi lokasi GPS..." : location ? "Lokasi terdeteksi" : "GPS tidak tersedia"}
                </p>
                {location && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} · ±{Math.round(location.accuracy)}m
                  </p>
                )}
              </div>
              {location && watchId !== null && (
                <Badge className="bg-green-100 text-green-700 border-green-200 text-[9px]">Live</Badge>
              )}
            </div>

            {/* Emergency Type */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">PILIH JENIS DARURAT</p>
              <div className="grid grid-cols-2 gap-2">
                {EMERGENCY_TYPES.map((item) => (
                  <button
                    key={item.type}
                    onClick={() => setSelectedType(item.type)}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-xl border text-left transition-all",
                      selectedType === item.type
                        ? `${item.bg} border-current ring-2 ring-offset-1 ${item.color.replace("text-", "ring-")}`
                        : "border-border hover:border-muted-foreground/50"
                    )}
                  >
                    <span className={item.color}>{item.icon}</span>
                    <span className={cn("text-xs font-medium", selectedType === item.type ? item.color : "text-foreground")}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Hold-to-Send Button */}
            <div className="space-y-2">
              <div className="relative">
                <Button
                  className={cn(
                    "w-full h-14 text-base font-bold transition-all select-none",
                    isHolding ? "bg-destructive/80" : "bg-destructive hover:bg-destructive/90",
                    !selectedType && "opacity-50"
                  )}
                  onMouseDown={startHold}
                  onMouseUp={cancelHold}
                  onMouseLeave={cancelHold}
                  onTouchStart={(e) => { e.preventDefault(); startHold(); }}
                  onTouchEnd={(e) => { e.preventDefault(); cancelHold(); }}
                  disabled={isSending}
                >
                  {isSending ? (
                    <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Mengirim...</>
                  ) : isHolding ? (
                    <><MessageCircle className="h-5 w-5 mr-2" /> Tahan... {Math.round(holdProgress)}%</>
                  ) : (
                    <><MessageCircle className="h-5 w-5 mr-2" /> Tahan untuk Kirim SOS WA</>
                  )}
                </Button>
                {/* Progress bar overlay */}
                {isHolding && (
                  <div
                    className="absolute bottom-0 left-0 h-1 bg-white/60 rounded-b-md transition-none"
                    style={{ width: `${holdProgress}%` }}
                  />
                )}
              </div>
              {!selectedType && (
                <p className="text-xs text-center text-muted-foreground">
                  ↑ Pilih jenis darurat dulu, lalu tekan & tahan 3 detik
                </p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/5"
                onClick={() => makeCall(contactPhone || defaultPhone)}
              >
                <Phone className="h-4 w-4 mr-1.5" />
                Telepon
              </Button>
              <Button
                variant="outline"
                onClick={shareLiveLocation}
                disabled={!location}
              >
                <Navigation className="h-4 w-4 mr-1.5" />
                Bagikan GPS
              </Button>
            </div>

            {/* Saudi Emergency Numbers */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">DARURAT ARAB SAUDI</p>
              <div className="grid grid-cols-2 gap-1.5">
                {SAUDI_EMERGENCY.map(({ label, number, icon }) => (
                  <a
                    key={number}
                    href={`tel:${number}`}
                    className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2 text-xs hover:bg-muted transition-colors"
                  >
                    <span>{icon}</span>
                    <div>
                      <p className="font-semibold">{label}</p>
                      <p className="font-mono text-muted-foreground">{number}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Contact info */}
            {(muthawifPhone || emergencyPhone) && (
              <p className="text-center text-xs text-muted-foreground">
                {muthawifPhone && <span>Muthawif: {muthawifPhone} · </span>}
                {emergencyPhone && <span>Hotline: {emergencyPhone}</span>}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
