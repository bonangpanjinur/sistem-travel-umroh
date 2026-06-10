import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";

export interface DepartureOperational {
  id: string;
  departure_date: string;
  return_date: string;
  tour_leader_user_id: string | null;
  muthawif: { id: string; full_name: string; phone: string | null } | null;
  package: { name: string; duration_days: number } | null;
  hotel_makkah: { name: string } | null;
  hotel_madinah: { name: string } | null;
  bookingCount: number;
  dayNumber: number;
  daysLeft: number;
}

export function useActiveDeparture(
  userId: string | null | undefined,
  role: string | null | undefined,
) {
  return useQuery<DepartureOperational | null>({
    queryKey: ["portal-active-departure", userId, role],
    queryFn: async () => {
      if (!userId || (role !== "muthawif" && role !== "tour_leader")) return null;

      const today = new Date().toISOString().split("T")[0];

      let departureId: string | null = null;

      if (role === "muthawif") {
        const { data: muthawif } = await (supabase as any)
          .from("muthawifs")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        if (!muthawif?.id) return null;

        const { data } = await (supabase as any)
          .from("departures")
          .select("id")
          .eq("muthawif_id", muthawif.id)
          .lte("departure_date", today)
          .gte("return_date", today)
          .order("departure_date", { ascending: false })
          .limit(1)
          .maybeSingle();
        departureId = data?.id ?? null;
      } else {
        const { data } = await (supabase as any)
          .from("departures")
          .select("id")
          .eq("tour_leader_user_id", userId)
          .lte("departure_date", today)
          .gte("return_date", today)
          .order("departure_date", { ascending: false })
          .limit(1)
          .maybeSingle();
        departureId = data?.id ?? null;
      }

      if (!departureId) return null;

      const { data: dep, error } = await (supabase as any)
        .from("departures")
        .select(`
          id, departure_date, return_date, tour_leader_user_id,
          muthawif:muthawifs(id, full_name, phone),
          package:packages(name, duration_days),
          hotel_makkah:hotels!departures_hotel_makkah_id_fkey(name),
          hotel_madinah:hotels!departures_hotel_madinah_id_fkey(name)
        `)
        .eq("id", departureId)
        .maybeSingle();

      if (error || !dep) return null;

      const { count } = await (supabase as any)
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("departure_id", departureId)
        .eq("booking_status", "confirmed");

      const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
      const dDate = new Date(dep.departure_date); dDate.setHours(0, 0, 0, 0);
      const rDate = new Date(dep.return_date);    rDate.setHours(0, 0, 0, 0);

      return {
        ...dep,
        bookingCount:  count ?? 0,
        dayNumber:     Math.max(1, differenceInDays(todayDate, dDate) + 1),
        daysLeft:      Math.max(0, differenceInDays(rDate, todayDate)),
      } as DepartureOperational;
    },
    enabled: !!userId && (role === "muthawif" || role === "tour_leader"),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
