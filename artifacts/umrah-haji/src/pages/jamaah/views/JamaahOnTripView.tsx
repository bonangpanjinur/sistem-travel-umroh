import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Hotel, Bus, Wifi, WifiOff, ChevronRight, MapPin, Phone } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { JamaahAppShell } from "@/components/jamaah/shell/JamaahAppShell";
import { TripStatusHeader } from "@/components/jamaah/trip/TripStatusHeader";
import { TodayItineraryCard } from "@/components/jamaah/trip/TodayItineraryCard";
import { EmergencyContactBar } from "@/components/jamaah/trip/EmergencyContactBar";
import { SholatCountdownWidget } from "@/components/jamaah/SholatCountdownWidget";
import { IbadahShortcutsGrid } from "@/components/jamaah/IbadahShortcutsGrid";
import { useTodayItinerary } from "@/hooks/useTodayItinerary";
import type { PortalContext } from "@/hooks/usePortalContext";
import { useAuth } from "@/hooks/useAuth";

interface Props { ctx: PortalContext }

const MAKKAH_COORDS  = { lat: 21.3891, lng: 39.8579 };
const MADINAH_COORDS = { lat: 24.5247, lng: 39.5692 };

export function JamaahOnTripView({ ctx }: Props) {
  const { profile } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const trip = ctx.trip!;

  useEffect(() => {
    const up = () => setIsOnline(true);
    const dn = () => setIsOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", dn);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", dn); };
  }, []);

  const { data: itinerary = [], isLoading: itinLoading } = useTodayItinerary(
    trip.departureId, trip.departureDate,
  );

  // Determine current city from itinerary (fallback to Makkah)
  const cityFromItin = ctx.todayItinerary?.[0]?.location_city?.toLowerCase() ?? "";
  const isMadinah = cityFromItin.includes("madinah") || cityFromItin.includes("medina");
  const prayerCoords = isMadinah ? MADINAH_COORDS : MAKKAH_COORDS;
  const prayerCity   = isMadinah ? "Madinah" : "Makkah";

  const firstName = profile?.full_name?.split(" ")[0] ?? "Jamaah";

  return (
    <JamaahAppShell>
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-amber-100 dark:bg-amber-950/50 border-b border-amber-300 dark:border-amber-700 px-4 py-2 flex items-center gap-2 text-sm z-40">
          <WifiOff className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-amber-800 dark:text-amber-200">Mode Offline — konten ibadah tetap tersedia</span>
        </div>
      )}

      {/* Trip status hero */}
      <TripStatusHeader
        packageName={trip.packageName}
        currentDay={trip.dayNumber}
        totalDays={trip.durationDays}
        city={prayerCity}
        departureDate={trip.departureDate}
        returnDate={trip.returnDate}
        bookingCode={trip.bookingCode}
        daysLeft={trip.daysLeft}
      />

      <div className="px-4 py-4 space-y-4 pb-32">
        {/* Sholat countdown — uses Makkah/Madinah coords */}
        <SholatCountdownWidget
          lat={prayerCoords.lat}
          lng={prayerCoords.lng}
          cityLabel={prayerCity}
        />

        {/* Today's itinerary */}
        <TodayItineraryCard
          items={itinerary}
          dayNumber={trip.dayNumber}
          isLoading={itinLoading}
        />

        {/* Emergency contacts + SOS */}
        <EmergencyContactBar
          muthawifName={trip.muthawifName}
          muthawifPhone={trip.muthawifPhone}
          departureId={trip.departureId}
          bookingCode={trip.bookingCode}
          customerName={profile?.full_name}
        />

        {/* Quick ibadah shortcuts */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Ibadah & Panduan</p>
          <IbadahShortcutsGrid tripMode="ON_TRIP" cols={8} />
        </div>

        {/* Hotel info */}
        {(trip.hotelMakkahName || trip.hotelMadinahName) && (
          <div className="rounded-2xl border bg-card p-4 space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Hotel className="h-3.5 w-3.5" /> Hotel
            </p>
            {trip.hotelMakkahName && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Makkah</p>
                  <p className="text-sm font-semibold">{trip.hotelMakkahName}</p>
                </div>
              </div>
            )}
            {trip.hotelMadinahName && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                  <MapPin className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Madinah</p>
                  <p className="text-sm font-semibold">{trip.hotelMadinahName}</p>
                </div>
              </div>
            )}
            {trip.busNumber && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                  <Bus className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Bus / Kloter</p>
                  <p className="text-sm font-semibold">{trip.busNumber}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick links: rombongan, chat, galeri */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { to: "/jamaah/rombongan", icon: "👥", label: "Rombongan" },
            { to: "/jamaah/chat",      icon: "💬", label: "Chat Group" },
            { to: "/jamaah/galeri",    icon: "📸", label: "Galeri" },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-muted/40 hover:bg-muted transition-colors active:scale-95"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-[11px] font-semibold text-center">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </JamaahAppShell>
  );
}
