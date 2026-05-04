import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface HotelDisplayProps {
  hotelIds: string | null;
  fallback?: string;
}

export function HotelDisplay({ hotelIds, fallback = "-" }: HotelDisplayProps) {
  const ids = hotelIds ? hotelIds.split(",").filter(Boolean) : [];

  const { data: hotels, isLoading } = useQuery({
    queryKey: ["hotels-display", hotelIds],
    queryFn: async () => {
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("hotels")
        .select("id, name")
        .in("id", ids);
      
      if (error) throw error;
      return data || [];
    },
    enabled: ids.length > 0,
  });

  if (ids.length === 0) return <span>{fallback}</span>;
  if (isLoading) return <Skeleton className="h-4 w-24" />;

  if (!hotels || hotels.length === 0) return <span>{fallback}</span>;

  return (
    <span>
      {hotels.map((h, i) => (
        <span key={h.id}>
          {h.name}
          {i < hotels.length - 1 ? ", " : ""}
        </span>
      ))}
    </span>
  );
}
