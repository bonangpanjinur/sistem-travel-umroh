import { Hotel, MapPin, Bus, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface HotelInfoCardProps {
  hotelMakkahName?: string | null;
  hotelMakkahStar?: number | null;
  hotelMadinahName?: string | null;
  hotelMadinahStar?: number | null;
  busNumber?: string | null;
  currentCity?: "makkah" | "madinah";
  className?: string;
}

function StarRating({ count }: { count: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: Math.min(5, count) }).map((_, i) => (
        <Star key={i} className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
      ))}
    </span>
  );
}

export function HotelInfoCard({
  hotelMakkahName,
  hotelMakkahStar,
  hotelMadinahName,
  hotelMadinahStar,
  busNumber,
  currentCity,
  className,
}: HotelInfoCardProps) {
  const hasAny = hotelMakkahName || hotelMadinahName || busNumber;
  if (!hasAny) return null;

  return (
    <div className={cn("rounded-2xl border bg-card p-4 space-y-3", className)}>
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Hotel className="h-3.5 w-3.5" /> Akomodasi & Transport
      </p>

      {hotelMakkahName && (
        <div
          className={cn(
            "flex items-center gap-3 p-2.5 rounded-xl transition-colors",
            currentCity === "makkah"
              ? "bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-200 dark:ring-emerald-800"
              : "bg-muted/40",
          )}
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
            <MapPin className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] text-muted-foreground font-medium">🕋 Makkah</p>
              {currentCity === "makkah" && (
                <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-semibold">
                  Lokasi Sekarang
                </span>
              )}
            </div>
            <p className="text-sm font-semibold leading-tight line-clamp-1">{hotelMakkahName}</p>
            {hotelMakkahStar && hotelMakkahStar > 0 && (
              <StarRating count={hotelMakkahStar} />
            )}
          </div>
        </div>
      )}

      {hotelMadinahName && (
        <div
          className={cn(
            "flex items-center gap-3 p-2.5 rounded-xl transition-colors",
            currentCity === "madinah"
              ? "bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-200 dark:ring-blue-800"
              : "bg-muted/40",
          )}
        >
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
            <MapPin className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] text-muted-foreground font-medium">🕌 Madinah</p>
              {currentCity === "madinah" && (
                <span className="text-[9px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-semibold">
                  Lokasi Sekarang
                </span>
              )}
            </div>
            <p className="text-sm font-semibold leading-tight line-clamp-1">{hotelMadinahName}</p>
            {hotelMadinahStar && hotelMadinahStar > 0 && (
              <StarRating count={hotelMadinahStar} />
            )}
          </div>
        </div>
      )}

      {busNumber && (
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
            <Bus className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-medium">Bus / Kloter</p>
            <p className="text-sm font-semibold">{busNumber}</p>
          </div>
        </div>
      )}
    </div>
  );
}
