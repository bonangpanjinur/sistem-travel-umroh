import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  AlertCircle, 
  MapPin, 
  Loader2, 
  Phone, 
  MessageCircle,
  Navigation,
  Shield,
  Heart,
  HelpCircle
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface SOSButtonProps {
  customerName: string;
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

const emergencyTypes: { type: EmergencyType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: "medical", label: "Medis/Kesehatan", icon: <Heart className="h-5 w-5" />, color: "bg-destructive" },
  { type: "lost", label: "Tersesat/Hilang", icon: <MapPin className="h-5 w-5" />, color: "bg-warning" },
  { type: "security", label: "Keamanan", icon: <Shield className="h-5 w-5" />, color: "bg-warning" },
  { type: "other", label: "Lainnya", icon: <HelpCircle className="h-5 w-5" />, color: "bg-primary" },
];

export function SOSButton({ customerName, muthawifPhone, emergencyPhone, bookingCode }: SOSButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [selectedType, setSelectedType] = useState<EmergencyType | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  // Get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation tidak didukung browser ini");
      return;
    }

    setIsLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(),
        });
        setIsLoadingLocation(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Gagal mendapatkan lokasi. Pastikan GPS aktif.");
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Start watching location for live updates
  const startWatchingLocation = () => {
    if (!navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(),
        });
      },
      (error) => {
        console.error("Watch position error:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    setWatchId(id);
  };

  // Stop watching location
  const stopWatchingLocation = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  };

  // Open SOS dialog and get location
  const handleOpenSOS = () => {
    setIsOpen(true);
    getCurrentLocation();
    startWatchingLocation();
  };

  // Close dialog and cleanup
  const handleClose = () => {
    setIsOpen(false);
    setSelectedType(null);
    stopWatchingLocation();
  };

  // Format emergency message
  const formatEmergencyMessage = () => {
    const typeLabel = emergencyTypes.find(t => t.type === selectedType)?.label || "Darurat";
    const googleMapsUrl = location 
      ? `https://maps.google.com/maps?q=${location.latitude},${location.longitude}`
      : "[Lokasi tidak tersedia]";
    
    return (
      `🆘 *SOS DARURAT - ${typeLabel.toUpperCase()}*\n\n` +
      `👤 Nama: ${customerName}\n` +
      `🎫 Kode Booking: ${bookingCode || "-"}\n` +
      `📅 Waktu: ${format(new Date(), "dd MMM yyyy HH:mm", { locale: id })}\n\n` +
      `📍 *Lokasi:*\n${googleMapsUrl}\n` +
      (location ? `Akurasi: ${Math.round(location.accuracy)}m\n` : "") +
      `\n⚠️ Mohon bantuan segera!`
    );
  };

  // Send SOS via WhatsApp
  const sendSOSWhatsApp = (phone: string) => {
    if (!selectedType) {
      toast.error("Pilih jenis darurat terlebih dahulu");
      return;
    }

    setIsSending(true);
    const message = encodeURIComponent(formatEmergencyMessage());
    const cleanPhone = phone.replace(/\D/g, "");
    
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
    
    toast.success("Membuka WhatsApp untuk mengirim SOS");
    setIsSending(false);
  };

  // Make direct call
  const makeCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  // Share live location link
  const shareLiveLocation = () => {
    if (!location) {
      toast.error("Lokasi belum tersedia");
      return;
    }

    const googleMapsUrl = `https://maps.google.com/maps?q=${location.latitude},${location.longitude}`;
    
    if (navigator.share) {
      navigator.share({
        title: "Lokasi Saya - SOS",
        text: `Lokasi darurat ${customerName}`,
        url: googleMapsUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(googleMapsUrl);
      toast.success("Link lokasi disalin ke clipboard");
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWatchingLocation();
    };
  }, []);

  const defaultPhone = emergencyPhone || "+6281234567890";
  const contactPhone = muthawifPhone || defaultPhone;

  return (
    <>
      {/* SOS Button */}
      <Button
        variant="destructive"
        size="sm"
        onClick={handleOpenSOS}
      >
        <AlertCircle className="h-4 w-4 mr-1" />
        SOS
      </Button>

      {/* SOS Dialog */}
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-red-600 flex items-center justify-center gap-2">
              <AlertCircle className="h-6 w-6" />
              SOS DARURAT
            </DialogTitle>
            <DialogDescription className="text-center">
              Pilih jenis darurat dan hubungi bantuan
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Location Status */}
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isLoadingLocation ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : location ? (
                    <MapPin className="h-4 w-4 text-green-500" />
                  ) : (
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm">
                    {isLoadingLocation 
                      ? "Mencari lokasi..." 
                      : location 
                        ? `Lokasi ditemukan (±${Math.round(location.accuracy)}m)`
                        : "Lokasi tidak tersedia"}
                  </span>
                </div>
                {location && (
                  <Badge variant="outline" className="text-xs">
                    {watchId !== null ? "Live" : "Static"}
                  </Badge>
                )}
              </div>
              {location && (
                <p className="text-xs text-muted-foreground mt-1">
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </p>
              )}
            </div>

            {/* Emergency Type Selection */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Jenis Darurat:</p>
              <div className="grid grid-cols-2 gap-2">
                {emergencyTypes.map((item) => (
                  <Button
                    key={item.type}
                    variant={selectedType === item.type ? "default" : "outline"}
                    className={`h-auto py-3 flex flex-col items-center gap-1 ${
                      selectedType === item.type ? item.color : ""
                    }`}
                    onClick={() => setSelectedType(item.type)}
                  >
                    {item.icon}
                    <span className="text-xs">{item.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {/* WhatsApp to Muthawif */}
              <Button
                className="w-full bg-success hover:bg-success/90"
                onClick={() => sendSOSWhatsApp(contactPhone)}
                disabled={!selectedType || isSending}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp Muthawif/Petugas
              </Button>

              {/* Direct Call */}
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => makeCall(contactPhone)}
              >
                <Phone className="h-4 w-4 mr-2" />
                Telepon Darurat
              </Button>

              {/* Share Location */}
              <Button
                variant="outline"
                className="w-full"
                onClick={shareLiveLocation}
                disabled={!location}
              >
                <Navigation className="h-4 w-4 mr-2" />
                Bagikan Lokasi
              </Button>
            </div>

            {/* Emergency Numbers */}
            <div className="text-center text-xs text-muted-foreground space-y-1">
              <p>Hotline: {defaultPhone}</p>
              {muthawifPhone && <p>Muthawif: {muthawifPhone}</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
