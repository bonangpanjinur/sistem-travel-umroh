import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";

export type TripMode = "ON_TRIP" | "UPCOMING" | "PREPARING" | "OFF_TRIP" | "COMPLETED";

export interface ActiveTripData {
  bookingId: string;
  bookingCode: string;
  roomType: string | null;
  busNumber: string | null;
  bookingStatus: string;
  paidAmount: number;
  totalPrice: number;
  departureId: string;
  departureDate: string;
  returnDate: string;
  tourLeaderUserId: string | null;
  muthawifId: string | null;
  muthawifName: string | null;
  muthawifPhone: string | null;
  hotelMakkahName: string | null;
  hotelMadinahName: string | null;
  packageName: string;
  durationDays: number;
  packageType: string | null;
  dayNumber: number;
  daysLeft: number;
  daysUntilDeparture: number | null;
}

export interface ActiveTripResult {
  mode: TripMode;
  trip: ActiveTripData | null;
}

function deriveTripMode(bookings: any[]): TripMode {
  if (!bookings?.length) return "OFF_TRIP";
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const b of bookings) {
    const dep = b.departure;
    if (!dep || b.booking_status !== "confirmed") continue;
    const dDate = new Date(dep.departure_date); dDate.setHours(0, 0, 0, 0);
    const rDate = new Date(dep.return_date);     rDate.setHours(23, 59, 59, 0);
    if (today >= dDate && today <= rDate) return "ON_TRIP";
  }

  let minFutureDays = Infinity;
  for (const b of bookings) {
    const dep = b.departure;
    if (!dep || b.booking_status !== "confirmed") continue;
    const dDate = new Date(dep.departure_date); dDate.setHours(0, 0, 0, 0);
    const days = differenceInDays(dDate, today);
    if (days > 0) minFutureDays = Math.min(minFutureDays, days);
  }
  if (minFutureDays <= 30)  return "UPCOMING";
  if (minFutureDays < Infinity) return "PREPARING";
  if (bookings.some((b) => b.booking_status === "completed")) return "COMPLETED";
  return "OFF_TRIP";
}

export function useActiveTrip(userId: string | null | undefined) {
  return useQuery<ActiveTripResult | null>({
    queryKey: ["portal-active-trip", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data: customer } = await (supabase as any)
        .from("customers")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!customer?.id) return { mode: "OFF_TRIP" as TripMode, trip: null };

      const { data: bookings, error } = await (supabase as any)
        .from("bookings")
        .select(`
          id, booking_code, room_type, bus_number, booking_status,
          paid_amount, total_price,
          departure:departures(
            id, departure_date, return_date, tour_leader_user_id,
            hotel_makkah:hotels!departures_hotel_makkah_id_fkey(name),
            hotel_madinah:hotels!departures_hotel_madinah_id_fkey(name),
            muthawif:muthawifs(id, full_name, phone),
            package:packages(name, duration_days, type)
          )
        `)
        .eq("customer_id", customer.id)
        .in("booking_status", ["confirmed", "completed"])
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      if (!bookings?.length) return { mode: "OFF_TRIP" as TripMode, trip: null };

      const mode = deriveTripMode(bookings);
      const today = new Date(); today.setHours(0, 0, 0, 0);

      let activeBooking: any = null;
      if (mode === "ON_TRIP") {
        activeBooking = bookings.find((b: any) => {
          const dep = b.departure;
          if (!dep || b.booking_status !== "confirmed") return false;
          const dDate = new Date(dep.departure_date); dDate.setHours(0, 0, 0, 0);
          const rDate = new Date(dep.return_date);     rDate.setHours(23, 59, 59, 0);
          return today >= dDate && today <= rDate;
        });
      } else {
        activeBooking =
          bookings.find((b: any) => b.booking_status === "confirmed") ?? bookings[0];
      }

      if (!activeBooking) return { mode, trip: null };

      const dep = activeBooking.departure;
      let dayNumber = 1, daysLeft = 0, daysUntilDeparture: number | null = null;
      if (dep?.departure_date) {
        const dDate = new Date(dep.departure_date); dDate.setHours(0, 0, 0, 0);
        dayNumber = Math.max(1, differenceInDays(today, dDate) + 1);
        daysUntilDeparture = differenceInDays(dDate, today);
        if (dep.return_date) {
          const rDate = new Date(dep.return_date); rDate.setHours(0, 0, 0, 0);
          daysLeft = Math.max(0, differenceInDays(rDate, today));
        }
      }

      return {
        mode,
        trip: {
          bookingId:           activeBooking.id,
          bookingCode:         activeBooking.booking_code ?? "",
          roomType:            activeBooking.room_type ?? null,
          busNumber:           activeBooking.bus_number ?? null,
          bookingStatus:       activeBooking.booking_status,
          paidAmount:          activeBooking.paid_amount ?? 0,
          totalPrice:          activeBooking.total_price ?? 0,
          departureId:         dep?.id ?? "",
          departureDate:       dep?.departure_date ?? "",
          returnDate:          dep?.return_date ?? "",
          tourLeaderUserId:    dep?.tour_leader_user_id ?? null,
          muthawifId:          dep?.muthawif?.id ?? null,
          muthawifName:        dep?.muthawif?.full_name ?? null,
          muthawifPhone:       dep?.muthawif?.phone ?? null,
          hotelMakkahName:     dep?.hotel_makkah?.name ?? null,
          hotelMadinahName:    dep?.hotel_madinah?.name ?? null,
          packageName:         dep?.package?.name ?? "Paket Perjalanan",
          durationDays:        dep?.package?.duration_days ?? 9,
          packageType:         dep?.package?.type ?? null,
          dayNumber,
          daysLeft,
          daysUntilDeparture,
        } satisfies ActiveTripData,
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
