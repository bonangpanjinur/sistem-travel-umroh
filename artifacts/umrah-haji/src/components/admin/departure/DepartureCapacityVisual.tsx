import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BedDouble, Users, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface Props {
  departureId: string;
  quota: number;
  priceQuad?: number;
  priceTriple?: number;
  priceDouble?: number;
  priceSingle?: number;
}

const ROOM_TYPES = [
  { key: "quad",   label: "Quad (4 orang)",    color: "bg-blue-500",   track: "bg-blue-100"   },
  { key: "triple", label: "Triple (3 orang)",   color: "bg-emerald-500",track: "bg-emerald-100"},
  { key: "double", label: "Double (2 orang)",   color: "bg-violet-500", track: "bg-violet-100" },
  { key: "single", label: "Single (1 orang)",   color: "bg-amber-500",  track: "bg-amber-100"  },
];

export function DepartureCapacityVisual({ departureId, quota, priceQuad, priceTriple, priceDouble, priceSingle }: Props) {
  const prices: Record<string, number> = {
    quad:   priceQuad   || 0,
    triple: priceTriple || 0,
    double: priceDouble || 0,
    single: priceSingle || 0,
  };

  const { data: roomCounts } = useQuery({
    queryKey: ["departure-capacity-rooms", departureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("room_type, booking_status")
        .eq("departure_id", departureId)
        .neq("booking_status", "cancelled");
      if (error) return {} as Record<string, number>;
      const counts: Record<string, number> = { quad: 0, triple: 0, double: 0, single: 0 };
      for (const b of (data || [])) {
        const rt = (b.room_type || "").toLowerCase();
        if (rt in counts) counts[rt]++;
      }
      return counts;
    },
    enabled: !!departureId,
  });

  const total = Object.values(roomCounts || {}).reduce((s, v) => s + v, 0);
  const totalPercent = quota > 0 ? Math.min(Math.round((total / quota) * 100), 100) : 0;
  const available = Math.max(0, quota - total);

  const statusColor =
    totalPercent >= 100 ? "text-red-600" :
    totalPercent >= 80  ? "text-amber-600" :
    "text-emerald-600";

  const statusBadge =
    totalPercent >= 100 ? { label: "Penuh", variant: "destructive" as const } :
    totalPercent >= 80  ? { label: "Hampir Penuh", variant: "secondary" as const } :
    { label: "Tersedia", variant: "outline" as const };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BedDouble className="h-5 w-5" />
            Kapasitas Keberangkatan
          </div>
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Total Terisi</span>
            </div>
            <span className={`font-bold ${statusColor}`}>
              {total} / {quota}
              <span className="ml-1.5 text-muted-foreground font-normal text-xs">({available} tersisa)</span>
            </span>
          </div>
          <Progress value={totalPercent} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span className={`font-semibold ${statusColor}`}>{totalPercent}% terisi</span>
            <span>100%</span>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          {ROOM_TYPES.map(({ key, label, color, track }) => {
            const count = roomCounts?.[key] ?? 0;
            const pct = quota > 0 ? Math.min(Math.round((count / quota) * 100), 100) : 0;
            if (count === 0 && prices[key] === 0) return null;
            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <div className="flex items-center gap-2">
                    {prices[key] > 0 && (
                      <span className="text-xs text-muted-foreground">{formatCurrency(prices[key])}</span>
                    )}
                    <span className="font-semibold tabular-nums">{count} booking</span>
                  </div>
                </div>
                <div className={`h-2 rounded-full ${track} overflow-hidden`}>
                  <div
                    className={`h-full rounded-full ${color} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {(priceQuad || priceTriple || priceDouble || priceSingle) && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
              <TrendingUp className="h-3.5 w-3.5" />
              Estimasi Pendapatan dari Booking
            </div>
            {(() => {
              const revenue = ROOM_TYPES.reduce((sum, { key }) => {
                return sum + (roomCounts?.[key] ?? 0) * prices[key];
              }, 0);
              return (
                <p className="text-lg font-bold text-emerald-700">
                  {formatCurrency(revenue)}
                </p>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
