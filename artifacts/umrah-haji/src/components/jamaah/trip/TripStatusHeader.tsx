import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { Plane, MapPin, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  packageName: string;
  currentDay: number;
  totalDays: number;
  city?: string;
  departureDate: string;
  returnDate: string;
  bookingCode?: string | null;
  daysLeft: number;
}

export function TripStatusHeader({
  packageName, currentDay, totalDays, city, departureDate, returnDate, bookingCode, daysLeft,
}: Props) {
  const todayLabel = format(new Date(), "EEEE, d MMMM yyyy", { locale: id });
  const progress = Math.min(100, Math.round((currentDay / totalDays) * 100));

  const cityDisplay = city || "Tanah Suci";

  return (
    <div className="bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 text-white px-4 py-4 rounded-b-3xl shadow-lg relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Plane className="h-3.5 w-3.5 opacity-80" />
              <p className="text-[11px] opacity-80 font-medium uppercase tracking-wider">Sedang Berlangsung</p>
            </div>
            <p className="font-bold text-lg leading-tight line-clamp-1">{packageName}</p>
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3 opacity-70" />
              <p className="text-[12px] opacity-80">{cityDisplay}</p>
            </div>
          </div>
          <div className="text-right shrink-0 ml-3">
            <div className="bg-white/20 rounded-xl px-3 py-2 backdrop-blur-sm">
              <p className="text-[10px] opacity-70 uppercase tracking-wider">Hari ke</p>
              <p className="font-black text-2xl leading-none">{currentDay}</p>
              <p className="text-[10px] opacity-70">dari {totalDays}</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="flex justify-between text-[10px] opacity-70 mb-1">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {todayLabel}
            </span>
            <span>{daysLeft} hari lagi</span>
          </div>
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/80 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {bookingCode && (
          <p className="text-[10px] opacity-60 font-mono"># {bookingCode}</p>
        )}
      </div>
    </div>
  );
}
