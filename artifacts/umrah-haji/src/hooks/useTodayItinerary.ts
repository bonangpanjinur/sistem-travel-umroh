import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";
import { format, parseISO } from "date-fns";

export interface ItineraryItem {
  id: string;
  day_number: number;
  start_time: string | null;
  end_time: string | null;
  title: string;
  description: string | null;
  location: string | null;
  location_city: string | null;
  guide_key: string | null;
  icon_name: string | null;
  category: string | null;
}

export type ActivityStatus = "done" | "active" | "upcoming";

export function getActivityStatus(item: ItineraryItem, now: Date): ActivityStatus {
  if (!item.start_time) return "upcoming";
  const [sh, sm] = item.start_time.split(":").map(Number);
  const startMinutes = sh * 60 + sm;
  const nowMinutes   = now.getHours() * 60 + now.getMinutes();

  if (item.end_time) {
    const [eh, em] = item.end_time.split(":").map(Number);
    const endMinutes = eh * 60 + em;
    if (nowMinutes > endMinutes) return "done";
    if (nowMinutes >= startMinutes) return "active";
  } else {
    if (nowMinutes > startMinutes + 60) return "done";
    if (nowMinutes >= startMinutes) return "active";
  }
  return "upcoming";
}

export function useTodayItinerary(
  departureId: string | null | undefined,
  departureDate: string | null | undefined,
  dayOverride?: number,
) {
  return useQuery<ItineraryItem[]>({
    queryKey: ["itinerary-today", departureId, departureDate, dayOverride],
    queryFn: async () => {
      if (!departureId || !departureDate) return [];

      const today = new Date(); today.setHours(0, 0, 0, 0);
      const startDate = new Date(departureDate); startDate.setHours(0, 0, 0, 0);
      const dayNumber = dayOverride ?? (differenceInDays(today, startDate) + 1);

      const { data, error } = await (supabase as any)
        .from("departure_itineraries")
        .select(
          "id, day_number, start_time, end_time, title, description, location, location_city, guide_key, icon_name, category",
        )
        .eq("departure_id", departureId)
        .eq("day_number", dayNumber)
        .order("start_time", { ascending: true, nullsFirst: false });

      if (error) return [];
      return (data ?? []) as ItineraryItem[];
    },
    enabled: !!departureId && !!departureDate,
    staleTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useTomorrowItinerary(
  departureId: string | null | undefined,
  departureDate: string | null | undefined,
) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const startDate = departureDate ? new Date(departureDate) : null;
  if (startDate) startDate.setHours(0, 0, 0, 0);
  const dayNumber = startDate ? differenceInDays(today, startDate) + 2 : 2;

  return useQuery<ItineraryItem[]>({
    queryKey: ["itinerary-tomorrow", departureId, departureDate],
    queryFn: async () => {
      if (!departureId || !departureDate) return [];
      const { data, error } = await (supabase as any)
        .from("departure_itineraries")
        .select(
          "id, day_number, start_time, end_time, title, description, location, location_city, guide_key, icon_name, category",
        )
        .eq("departure_id", departureId)
        .eq("day_number", dayNumber)
        .order("start_time", { ascending: true, nullsFirst: false });
      if (error) return [];
      return (data ?? []) as ItineraryItem[];
    },
    enabled: !!departureId && !!departureDate,
    staleTime: 10 * 60 * 1000,
  });
}
