import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays, ChevronRight, CheckCircle2, Clock, Circle,
  Utensils, Bus, Hotel, BookOpen, Compass, Footprints, Mic,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type ItineraryItem, type ActivityStatus, getActivityStatus } from "@/hooks/useTodayItinerary";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  ibadah:    BookOpen,
  makan:     Utensils,
  transport: Bus,
  akomodasi: Hotel,
  ziarah:    Compass,
  sai:       Footprints,
  tawaf:     Footprints,
  ceramah:   Mic,
};

function CategoryIcon({ category, iconName }: { category: string | null; iconName: string | null }) {
  const Icon = (iconName && CATEGORY_ICONS[iconName]) || (category && CATEGORY_ICONS[category]) || CalendarDays;
  return <Icon className="h-4 w-4" />;
}

interface Props {
  items: ItineraryItem[];
  dayNumber: number;
  isLoading?: boolean;
}

export function TodayItineraryCard({ items, dayNumber, isLoading }: Props) {
  const now = new Date();
  const decorated = useMemo(
    () => items.map((item) => ({ item, status: getActivityStatus(item, now) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items],
  );

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-card p-4 space-y-3 animate-pulse">
        <div className="h-4 bg-muted rounded w-40" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="h-8 w-8 rounded-xl bg-muted" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-muted rounded w-3/4" />
              <div className="h-2.5 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <p className="font-semibold text-sm">Agenda Hari ke-{dayNumber}</p>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">
          Belum ada agenda yang dijadwalkan untuk hari ini.
        </p>
        <Link to="/jamaah/itinerary" className="text-xs text-primary flex items-center justify-center gap-1 mt-1">
          Lihat itinerary lengkap <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  const activeIdx = decorated.findIndex((d) => d.status === "active");

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <p className="font-semibold text-sm">Agenda Hari ke-{dayNumber}</p>
        </div>
        <Link to="/jamaah/itinerary" className="text-[11px] text-primary flex items-center gap-0.5">
          Semua <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="px-2 pb-3 space-y-1">
        {decorated.map(({ item, status }, idx) => (
          <div
            key={item.id}
            className={cn(
              "flex items-start gap-3 px-2 py-2.5 rounded-xl transition-colors",
              status === "active" && "bg-primary/8 ring-1 ring-primary/20",
              status === "done"   && "opacity-50",
            )}
          >
            {/* Time column */}
            <div className="w-11 shrink-0 text-right">
              <p className={cn(
                "text-[11px] font-medium",
                status === "active" ? "text-primary" : "text-muted-foreground",
              )}>
                {item.start_time?.slice(0, 5) ?? "–"}
              </p>
            </div>

            {/* Connector line */}
            <div className="flex flex-col items-center shrink-0 mt-0.5">
              {status === "done" ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : status === "active" ? (
                <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                </div>
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/40" />
              )}
              {idx < decorated.length - 1 && (
                <div className="w-px h-3 bg-border mt-0.5" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className={cn(
                  "text-sm font-medium leading-tight",
                  status === "active" && "text-primary",
                )}>
                  {item.title}
                </p>
                {status === "active" && (
                  <span className="text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                    SEKARANG
                  </span>
                )}
              </div>
              {item.location && (
                <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <span>📍</span> {item.location}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
