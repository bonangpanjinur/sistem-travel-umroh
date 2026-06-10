import { Link } from "react-router-dom";
import {
  Moon, Compass, BookMarked, Heart, Target, GraduationCap,
  Scroll, BarChart3, Calendar, MapPin, AlertTriangle, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TripMode } from "@/hooks/usePortalContext";

interface ShortcutItem {
  to: string;
  icon: React.ElementType;
  label: string;
  color: string;
  bg: string;
  urgent?: boolean;
}

const ON_TRIP_SHORTCUTS: ShortcutItem[] = [
  { to: "/jamaah/waktu-sholat", icon: Moon,         label: "Jadwal\nSholat",   color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/40" },
  { to: "/jamaah/kiblat",       icon: Compass,      label: "Arah\nKiblat",     color: "text-emerald-600",bg: "bg-emerald-50 dark:bg-emerald-950/40" },
  { to: "/jamaah/doa-panduan",  icon: Scroll,       label: "Doa &\nDzikir",    color: "text-green-700",  bg: "bg-green-50 dark:bg-green-950/40" },
  { to: "/jamaah/panduan-ibadah",icon: BookMarked,  label: "Panduan\nIbadah",  color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-950/40" },
  { to: "/jamaah/rombongan",    icon: Users,        label: "Rombongan",        color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-950/40" },
  { to: "/jamaah/itinerary",    icon: Calendar,     label: "Jadwal\nTrip",     color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/40" },
  { to: "/jamaah/peta-lokasi",  icon: MapPin,       label: "Peta\nLokasi",     color: "text-rose-600",   bg: "bg-rose-50 dark:bg-rose-950/40" },
  { to: "/jamaah/sos-status",   icon: AlertTriangle,label: "SOS\nDarurat",     color: "text-red-600",    bg: "bg-red-50 dark:bg-red-950/40", urgent: true },
];

const OFF_TRIP_SHORTCUTS: ShortcutItem[] = [
  { to: "/jamaah/waktu-sholat",   icon: Moon,          label: "Jadwal\nSholat",  color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/40" },
  { to: "/jamaah/kiblat",         icon: Compass,       label: "Arah\nKiblat",    color: "text-emerald-600",bg: "bg-emerald-50 dark:bg-emerald-950/40" },
  { to: "/jamaah/al-quran",       icon: BookMarked,    label: "Al-Quran",         color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-950/40" },
  { to: "/jamaah/doa-panduan",    icon: Scroll,        label: "Doa &\nDzikir",   color: "text-green-700",  bg: "bg-green-50 dark:bg-green-950/40" },
  { to: "/jamaah/tracker-ibadah", icon: BarChart3,     label: "Tracker\nIbadah", color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/40" },
  { to: "/jamaah/target-ibadah",  icon: Target,        label: "Target\nHarian",  color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/40" },
  { to: "/jamaah/manasik",        icon: GraduationCap, label: "Manasik\nDigital",color: "text-teal-600",   bg: "bg-teal-50 dark:bg-teal-950/40" },
  { to: "/jamaah/zikir",          icon: Heart,         label: "Zikir\nPagi-Sore",color: "text-pink-600",   bg: "bg-pink-50 dark:bg-pink-950/40" },
];

const UPCOMING_SHORTCUTS: ShortcutItem[] = [
  { to: "/jamaah/waktu-sholat",   icon: Moon,          label: "Jadwal\nSholat",  color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/40" },
  { to: "/jamaah/manasik",        icon: GraduationCap, label: "Manasik",         color: "text-teal-600",   bg: "bg-teal-50 dark:bg-teal-950/40" },
  { to: "/jamaah/documents",      icon: BookMarked,    label: "Dokumen",         color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-950/40" },
  { to: "/jamaah/kiblat",         icon: Compass,       label: "Arah\nKiblat",   color: "text-emerald-600",bg: "bg-emerald-50 dark:bg-emerald-950/40" },
  { to: "/jamaah/doa-panduan",    icon: Scroll,        label: "Doa &\nDzikir",  color: "text-green-700",  bg: "bg-green-50 dark:bg-green-950/40" },
  { to: "/jamaah/tracker-ibadah", icon: BarChart3,     label: "Tracker",        color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/40" },
];

const SHORTCUTS: Record<string, ShortcutItem[]> = {
  ON_TRIP:   ON_TRIP_SHORTCUTS,
  UPCOMING:  UPCOMING_SHORTCUTS,
  PREPARING: OFF_TRIP_SHORTCUTS,
  OFF_TRIP:  OFF_TRIP_SHORTCUTS,
  COMPLETED: OFF_TRIP_SHORTCUTS,
};

interface Props {
  tripMode: TripMode;
  cols?: 4 | 8;
}

export function IbadahShortcutsGrid({ tripMode, cols = 4 }: Props) {
  const items = SHORTCUTS[tripMode] ?? OFF_TRIP_SHORTCUTS;
  const displayed = cols === 4 ? items.slice(0, 4) : items;

  return (
    <div className={cn("grid gap-2", cols === 4 ? "grid-cols-4" : "grid-cols-4")}>
      {displayed.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className={cn(
            "flex flex-col items-center gap-1.5 p-2.5 rounded-2xl transition-all active:scale-95",
            item.bg,
            item.urgent && "ring-1 ring-red-300 dark:ring-red-700",
          )}
        >
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center",
            item.urgent ? "bg-red-100 dark:bg-red-900/50" : "bg-white/60 dark:bg-white/10",
          )}>
            <item.icon className={cn("h-4.5 w-4.5", item.color)} style={{ width: 18, height: 18 }} />
          </div>
          <p className={cn(
            "text-[10px] font-semibold text-center leading-tight",
            item.urgent ? "text-red-600 dark:text-red-400" : "text-foreground/80",
          )}>
            {item.label.replace("\\n", "\n")}
          </p>
        </Link>
      ))}
    </div>
  );
}
