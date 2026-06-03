import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MahramConflict {
  jamaah_id: string;
  jamaah_name: string;
  jamaah_gender: string;
  mahram_id: string;
  mahram_name: string;
  mahram_gender: string;
  mahram_relation: string;
  jamaah_room: string | null;
  jamaah_hotel: string | null;
  mahram_room: string | null;
  mahram_hotel: string | null;
  conflict_type:
    | "both_unassigned"
    | "jamaah_unassigned"
    | "mahram_unassigned"
    | "different_hotels"
    | "ok";
}

export function useMahramConflicts(
  departureId: string | null,
  hotelId?: string | null
) {
  return useQuery<MahramConflict[]>({
    queryKey: ["mahram-conflicts", departureId, hotelId ?? null],
    queryFn: async () => {
      if (!departureId) return [];
      const { data, error } = await supabase.rpc(
        "check_mahram_room_conflicts",
        {
          p_departure_id: departureId,
          p_hotel_id: hotelId ?? null,
        }
      );
      if (error) throw error;
      return (data as MahramConflict[]) || [];
    },
    enabled: !!departureId,
    staleTime: 30_000,
  });
}
