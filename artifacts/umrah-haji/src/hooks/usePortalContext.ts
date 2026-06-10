import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useActiveTrip, type TripMode, type ActiveTripData } from "@/hooks/useActiveTrip";
import { useActiveDeparture, type DepartureOperational } from "@/hooks/useActiveDeparture";
import { useTodayItinerary, type ItineraryItem } from "@/hooks/useTodayItinerary";

export type { TripMode };

export interface PortalContext {
  user: ReturnType<typeof useAuth>["user"];
  profile: ReturnType<typeof useAuth>["profile"];
  roles: ReturnType<typeof useAuth>["roles"];
  role: string | null;

  tripMode: TripMode;
  trip: ActiveTripData | null;
  activeDeparture: DepartureOperational | null;
  todayItinerary: ItineraryItem[];

  isGuest: boolean;
  isOnTrip: boolean;
  isJamaah: boolean;
  isMuthawif: boolean;
  isTourLeader: boolean;
  showPromotion: boolean;

  isLoading: boolean;
}

export function usePortalContext(): PortalContext {
  const { user, profile, roles, isLoading: authLoading } = useAuth();

  const primaryRole = useMemo(() => {
    if (!roles?.length) return null;
    if (roles.includes("muthawif"))    return "muthawif";
    if (roles.includes("tour_leader")) return "tour_leader";
    if (roles.includes("jamaah"))      return "jamaah";
    if (roles.includes("customer"))    return "customer";
    return roles[0] ?? null;
  }, [roles]);

  const isJamaah     = primaryRole === "jamaah" || primaryRole === "customer";
  const isMuthawif   = primaryRole === "muthawif";
  const isTourLeader = primaryRole === "tour_leader";

  const {
    data: tripResult,
    isLoading: tripLoading,
  } = useActiveTrip(isJamaah ? user?.id : null);

  const {
    data: activeDeparture,
    isLoading: depLoading,
  } = useActiveDeparture(
    (isMuthawif || isTourLeader) ? user?.id : null,
    primaryRole,
  );

  const tripMode: TripMode = tripResult?.mode ?? "OFF_TRIP";
  const trip = tripResult?.trip ?? null;

  const {
    data: todayItinerary = [],
  } = useTodayItinerary(
    trip?.departureId,
    trip?.departureDate,
  );

  const isLoading = authLoading || (!!user && (tripLoading || depLoading));

  return {
    user,
    profile,
    roles,
    role: primaryRole,

    tripMode,
    trip,
    activeDeparture: activeDeparture ?? null,
    todayItinerary,

    isGuest:     !user,
    isOnTrip:    tripMode === "ON_TRIP",
    isJamaah,
    isMuthawif,
    isTourLeader,
    showPromotion: tripMode === "OFF_TRIP" || tripMode === "COMPLETED",

    isLoading,
  };
}
