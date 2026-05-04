import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  MapPin, 
  Navigation, 
  Share2, 
  Loader2, 
  Signal, 
  SignalLow,
  SignalMedium,
  SignalHigh,
  Copy,
  RefreshCw,
  Pause,
  Play
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface LiveLocationShareProps {
  customerId: string;
  departureId?: string;
  customerName: string;
  muthawifPhone?: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: Date;
}

export function LiveLocationShare({ 
  customerId, 
  departureId, 
  customerName,
  muthawifPhone 
}: LiveLocationShareProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get accuracy icon based on accuracy value
  const getAccuracyIcon = (accuracy: number) => {
    if (accuracy <= 10) return <SignalHigh className="h-4 w-4 text-emerald-500" />;
    if (accuracy <= 50) return <SignalMedium className="h-4 w-4 text-amber-500" />;
    if (accuracy <= 100) return <SignalLow className="h-4 w-4 text-orange-500" />;
    return <Signal className="h-4 w-4 text-destructive" />;
  };

  // Save location to database
  const saveLocation = async (loc: LocationData) => {
    try {
      const { error } = await supabase
        .from("jamaah_live_locations")
        .upsert({
          customer_id: customerId,
          departure_id: departureId,
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          speed: loc.speed,
          heading: loc.heading,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "customer_id,departure_id"
        });

      if (error) throw error;
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Failed to save location:", err);
    }
  };

  // Start sharing location
  const startSharing = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation tidak didukung browser ini");
      return;
    }

    setError(null);
    setIsSharing(true);

    // Watch position for live updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
          timestamp: new Date(),
        };
        setLocation(newLocation);
        setError(null);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setError(getErrorMessage(err.code));
        toast.error(getErrorMessage(err.code));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );

    // Save location to database periodically (every 30 seconds)
    intervalRef.current = setInterval(() => {
      if (location) {
        saveLocation(location);
      }
    }, 30000);

    toast.success("Live location sharing aktif");
  };

  // Stop sharing location
  const stopSharing = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsSharing(false);
    toast.info("Live location sharing dihentikan");
  };

  // Toggle sharing
  const toggleSharing = () => {
    if (isSharing) {
      stopSharing();
    } else {
      startSharing();
    }
  };

  // Get error message
  const getErrorMessage = (code: number) => {
    switch (code) {
      case 1:
        return "Akses lokasi ditolak. Izinkan akses di pengaturan.";
      case 2:
        return "Lokasi tidak tersedia. Pastikan GPS aktif.";
      case 3:
        return "Timeout mendapatkan lokasi.";
      default:
        return "Gagal mendapatkan lokasi.";
    }
  };

  // Copy location to clipboard
  const copyLocation = () => {
    if (!location) return;
    
    const url = `https://maps.google.com/maps?q=${location.latitude},${location.longitude}`;
    navigator.clipboard.writeText(url);
    toast.success("Link lokasi disalin");
  };

  // Share via WhatsApp
  const shareViaWhatsApp = () => {
    if (!location) {
      toast.error("Lokasi belum tersedia");
      return;
    }

    const url = `https://maps.google.com/maps?q=${location.latitude},${location.longitude}`;
    const message = encodeURIComponent(
      `📍 *Lokasi Saya Saat Ini*\n\n` +
      `Nama: ${customerName}\n` +
      `Waktu: ${format(new Date(), "dd MMM yyyy HH:mm", { locale: id })}\n` +
      `Akurasi: ±${Math.round(location.accuracy)}m\n\n` +
      `${url}`
    );

    const phone = muthawifPhone ? muthawifPhone.replace(/\D/g, "") : "";
    const waUrl = phone 
      ? `https://wa.me/${phone}?text=${message}` 
      : `https://wa.me/?text=${message}`;
    
    window.open(waUrl, "_blank");
  };

  // Open in Google Maps
  const openInMaps = () => {
    if (!location) return;
    
    const url = `https://maps.google.com/maps?q=${location.latitude},${location.longitude}`;
    window.open(url, "_blank");
  };

  // Native share
  const shareNative = async () => {
    if (!location) return;

    const url = `https://maps.google.com/maps?q=${location.latitude},${location.longitude}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Lokasi Saya",
          text: `Lokasi ${customerName} - ${format(new Date(), "dd MMM HH:mm")}`,
          url: url,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      copyLocation();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Save location when it updates (if sharing)
  useEffect(() => {
    if (isSharing && location) {
      saveLocation(location);
    }
  }, [location?.latitude, location?.longitude]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Navigation className="h-4 w-4" />
              Live Location
            </CardTitle>
            <CardDescription>Bagikan lokasi real-time</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="live-location"
              checked={isSharing}
              onCheckedChange={toggleSharing}
            />
            <Label htmlFor="live-location" className="sr-only">
              Toggle live location
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isSharing ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-green-600">Sharing aktif</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                <span className="text-sm text-muted-foreground">Tidak aktif</span>
              </>
            )}
          </div>
          {location && getAccuracyIcon(location.accuracy)}
        </div>

        {/* Location Info */}
        {location && (
          <div className="bg-muted p-3 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Lokasi Saat Ini</span>
              </div>
              <Badge variant="outline" className="text-xs">
                ±{Math.round(location.accuracy)}m
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </p>
            {location.speed && location.speed > 0 && (
              <p className="text-xs text-muted-foreground">
                Kecepatan: {(location.speed * 3.6).toFixed(1)} km/h
              </p>
            )}
            {lastUpdate && (
              <p className="text-xs text-muted-foreground">
                Update: {format(lastUpdate, "HH:mm:ss")}
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={shareViaWhatsApp}
            disabled={!location}
          >
            <Share2 className="h-4 w-4 mr-1" />
            WhatsApp
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={copyLocation}
            disabled={!location}
          >
            <Copy className="h-4 w-4 mr-1" />
            Salin Link
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={openInMaps}
            disabled={!location}
          >
            <MapPin className="h-4 w-4 mr-1" />
            Buka Maps
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={shareNative}
            disabled={!location}
          >
            <Navigation className="h-4 w-4 mr-1" />
            Bagikan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
