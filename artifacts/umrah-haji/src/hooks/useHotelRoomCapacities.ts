import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HotelRoomCapacity {
  id: string;
  hotel_id: string;
  room_type: "single" | "double" | "triple" | "quad";
  total_rooms: number;
  notes: string | null;
}

export interface HotelCapacitySummaryRow {
  room_type: string;
  capacity_limit: number;
  assigned_count: number;
  remaining: number | null;
  usage_pct: number;
  status: "ok" | "near_full" | "full" | "exceeded" | "unconfigured";
}

/** Fetch raw capacity config for a hotel */
export function useHotelRoomCapacities(hotelId: string | null | undefined) {
  return useQuery<HotelRoomCapacity[]>({
    queryKey: ["hotel-room-capacities", hotelId],
    queryFn: async () => {
      if (!hotelId) return [];
      // Cast to 'any' to bypass type checking for table not in generated types
      const { data, error } = await (supabase as any)
        .from("hotel_room_capacities")
        .select("*")
        .eq("hotel_id", hotelId)
        .order("room_type");
      if (error) throw error;
      return (data as HotelRoomCapacity[]) || [];
    },
    enabled: !!hotelId,
    staleTime: 60_000,
  });
}

/** Fetch capacity summary (limit vs assigned) for a specific departure+hotel */
export function useHotelCapacitySummary(
  hotelId: string | null | undefined,
  departureId: string | null | undefined
) {
  return useQuery<HotelCapacitySummaryRow[]>({
    queryKey: ["hotel-capacity-summary", hotelId, departureId],
    queryFn: async () => {
      if (!hotelId || !departureId) return [];
      // Cast to 'any' to bypass type checking for RPC not in generated types
      const { data, error } = await (supabase as any).rpc(
        "get_hotel_capacity_summary",
        {
          p_hotel_id: hotelId,
          p_departure_id: departureId,
        }
      );
      if (error) throw error;
      return (data as HotelCapacitySummaryRow[]) || [];
    },
    enabled: !!hotelId && !!departureId,
    staleTime: 20_000,
  });
}

/** Upsert capacity for one room type in a hotel */
export function useUpsertHotelRoomCapacity(hotelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      room_type,
      total_rooms,
      notes,
    }: {
      room_type: string;
      total_rooms: number;
      notes?: string;
    }) => {
      // Cast to 'any' to bypass type checking for table not in generated types
      const { error } = await (supabase as any)
        .from("hotel_room_capacities")
        .upsert(
          { hotel_id: hotelId, room_type, total_rooms, notes: notes ?? null },
          { onConflict: "hotel_id,room_type" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotel-room-capacities", hotelId] });
      queryClient.invalidateQueries({ queryKey: ["hotel-capacity-summary"] });
    },
  });
}
