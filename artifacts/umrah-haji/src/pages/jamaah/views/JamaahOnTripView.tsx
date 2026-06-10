import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { WifiOff, ChevronRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { JamaahAppShell } from "@/components/jamaah/shell/JamaahAppShell";
import { TripStatusHeader } from "@/components/jamaah/trip/TripStatusHeader";
import { TodayItineraryCard } from "@/components/jamaah/trip/TodayItineraryCard";
import { EmergencyContactBar } from "@/components/jamaah/trip/EmergencyContactBar";
import { HotelInfoCard } from "@/components/jamaah/trip/HotelInfoCard";
import { SholatCountdownWidget } from "@/components/jamaah/SholatCountdownWidget";
import { IbadahShortcutsGrid } from "@/components/jamaah/IbadahShortcutsGrid";
import { CuacaWidget } from "@/components/jamaah/CuacaWidget";
import { useTodayItinerary } from "@/hooks/useTodayItinerary";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import type { PortalContext } from "@/hooks/usePortalContext";
import type { ItineraryItem } from "@/hooks/useTodayItinerary";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props { ctx: PortalContext }

const MAKKAH_COORDS  = { lat: 21.3891, lng: 39.8579 };
const MADINAH_COORDS = { lat: 24.5247, lng: 39.5692 };

export function JamaahOnTripView({ ctx }: Props) {
  const { profile } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const queryClient = useQueryClient();

  const trip = ctx.trip!;

  // Track online/offline status
  useEffect(() => {
    const up = () => setIsOnline(true);
    const dn = () => setIsOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", dn);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", dn); };
  }, []);

  const { data: itinerary, isLoading: itinLoading } = useTodayItinerary(
    trip.departureId, trip.departureDate,
  );

  // ── S17-08: Offline cache for itinerary (useOfflineCache(key, data) → T | undefined) ──
  const CACHE_KEY = `itinerary_${trip.departureId}_day${trip.dayNumber}`;
  const displayItinerary: ItineraryItem[] = useOfflineCache<ItineraryItem[]>(CACHE_KEY, itinerary) ?? [];

  // ── S17-07: Realtime subscribe itinerary updates ────────────────────────────
  useEffect(() => {
    if (!trip.departureId) return;

    const channel = (supabase as any)
      .channel(`itinerary-updates-${trip.departureId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "departure_itineraries",
          filter: `departure_id=eq.${trip.departureId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["itinerary-today"] });
          toast.info("📅 Itinerary hari ini diperbarui oleh Tour Leader", { duration: 4000 });
        },
      )
      .subscribe();

    return () => { (supabase as any).removeChannel(channel); };
  }, [trip.departureId, queryClient]);

  // ── S17-05: City detection for prayer coordinates ─────────────────────────
  const cityFromItin = ctx.todayItinerary?.[0]?.location_city?.toLowerCase() ?? "";
  const isMadinah = cityFromItin.includes("madinah") || cityFromItin.includes("medina");
  const prayerCoords = isMadinah ? MADINAH_COORDS : MAKKAH_COORDS;
  const prayerCity   = isMadinah ? "Madinah" : "Makkah";
  const currentCity  = isMadinah ? "madinah" : "makkah";

  const firstName = profile?.full_name?.split(" ")[0] ?? "Jamaah";

  return (
    <JamaahAppShell>
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-amber-100 dark:bg-amber-950/50 border-b border-amber-300 dark:border-amber-700 px-4 py-2 flex items-center gap-2 text-sm z-40">
          <WifiOff className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-amber-800 dark:text-amber-200">
            Mode Offline — konten ibadah tetap tersedia
          </span>
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
        {/* S17-05: Sholat countdown — uses Makkah/Madinah coords based on itinerary city */}
        <SholatCountdownWidget
          lat={prayerCoords.lat}
          lng={prayerCoords.lng}
          cityLabel={prayerCity}
        />

        {/* Today's itinerary (uses offline cache if offline) */}
        <TodayItineraryCard
          items={displayItinerary}
          dayNumber={trip.dayNumber}
          isLoading={itinLoading && displayItinerary.length === 0}
        />

        {/* Emergency contacts + SOS */}
        <EmergencyContactBar
          muthawifName={trip.muthawifName}
          muthawifPhone={trip.muthawifPhone}
          departureId={trip.departureId}
          bookingCode={trip.bookingCode}
          customerName={profile?.full_name}
        />

        {/* S17-04: Hotel info card (extracted component) */}
        <HotelInfoCard
          hotelMakkahName={trip.hotelMakkahName}
          hotelMadinahName={trip.hotelMadinahName}
          busNumber={trip.busNumber}
          currentCity={currentCity}
        />

        {/* Quick ibadah shortcuts */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Ibadah & Panduan
          </p>
          <IbadahShortcutsGrid tripMode="ON_TRIP" cols={8} />
        </div>

        {/* S17-10: Weather widget for Tanah Suci */}
        {isOnline && <CuacaWidget />}

        {/* Quick links: rombongan, chat, galeri */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { to: "/jamaah/rombongan", icon: "👥", label: "Rombongan" },
            { to: "/jamaah/chat",      icon: "💬", label: "Chat Group" },
            { to: "/jamaah/galeri",    icon: "📸", label: "Galeri"     },
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
