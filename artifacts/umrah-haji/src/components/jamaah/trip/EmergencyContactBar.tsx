import { Phone, AlertTriangle, User } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Props {
  tourLeaderName?: string | null;
  tourLeaderPhone?: string | null;
  muthawifName?: string | null;
  muthawifPhone?: string | null;
  customerId?: string | null;
  departureId?: string | null;
  bookingCode?: string | null;
  customerName?: string | null;
}

export function EmergencyContactBar({
  tourLeaderName,
  tourLeaderPhone,
  muthawifName,
  muthawifPhone,
  customerId,
  departureId,
  bookingCode,
  customerName,
}: Props) {
  return (
    <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 overflow-hidden">
      <div className="px-3 py-2 flex items-center gap-1.5 border-b border-red-200/60 dark:border-red-900/30">
        <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
        <p className="text-[11px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">Kontak Darurat</p>
      </div>

      <div className="grid grid-cols-3 divide-x divide-red-200/60 dark:divide-red-900/30">
        {/* Tour Leader */}
        <a
          href={tourLeaderPhone ? `tel:${tourLeaderPhone}` : undefined}
          className={cn(
            "flex flex-col items-center gap-1 py-3 px-2 transition-colors",
            tourLeaderPhone ? "active:bg-red-100 dark:active:bg-red-900/30 cursor-pointer" : "opacity-50 cursor-default",
          )}
        >
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
            <User className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Tour Leader</p>
          <p className="text-[11px] font-semibold text-center leading-tight line-clamp-1">
            {tourLeaderName ?? "–"}
          </p>
          {tourLeaderPhone && (
            <p className="text-[10px] text-primary font-medium flex items-center gap-0.5">
              <Phone className="h-2.5 w-2.5" /> Telepon
            </p>
          )}
        </a>

        {/* SOS Button */}
        <Link
          to={`/jamaah/sos-status`}
          className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 active:bg-red-100 dark:active:bg-red-900/30 transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse">
            <AlertTriangle className="h-6 w-6 text-white" />
          </div>
          <p className="text-[11px] font-black text-red-600 dark:text-red-400 uppercase tracking-wider">SOS</p>
        </Link>

        {/* Muthawif */}
        <a
          href={muthawifPhone ? `tel:${muthawifPhone}` : undefined}
          className={cn(
            "flex flex-col items-center gap-1 py-3 px-2 transition-colors",
            muthawifPhone ? "active:bg-red-100 dark:active:bg-red-900/30 cursor-pointer" : "opacity-50 cursor-default",
          )}
        >
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <User className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Muthawif</p>
          <p className="text-[11px] font-semibold text-center leading-tight line-clamp-1">
            {muthawifName ?? "–"}
          </p>
          {muthawifPhone && (
            <p className="text-[10px] text-primary font-medium flex items-center gap-0.5">
              <Phone className="h-2.5 w-2.5" /> Telepon
            </p>
          )}
        </a>
      </div>
    </div>
  );
}
