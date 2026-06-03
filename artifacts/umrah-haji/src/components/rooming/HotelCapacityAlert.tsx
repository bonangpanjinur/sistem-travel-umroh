import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, BedDouble } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useHotelCapacitySummary, HotelCapacitySummaryRow } from "@/hooks/useHotelRoomCapacities";

interface HotelCapacityAlertProps {
  hotelId: string;
  departureId: string;
  hotelName?: string;
}

const ROOM_LABEL: Record<string, string> = {
  single: "Single",
  double: "Double",
  triple: "Triple",
  quad: "Quad",
};

const STATUS_COLOR: Record<HotelCapacitySummaryRow["status"], string> = {
  ok: "text-green-600",
  near_full: "text-amber-600",
  full: "text-blue-600",
  exceeded: "text-red-600",
  unconfigured: "text-muted-foreground",
};

const STATUS_BADGE: Record<
  HotelCapacitySummaryRow["status"],
  { label: string; cls: string }
> = {
  ok:           { label: "OK",           cls: "bg-green-100 text-green-800 border-green-200" },
  near_full:    { label: "Hampir Penuh", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  full:         { label: "Penuh",        cls: "bg-blue-100 text-blue-800 border-blue-200" },
  exceeded:     { label: "Melebihi",     cls: "bg-red-100 text-red-800 border-red-200" },
  unconfigured: { label: "Belum Dikonfigurasi", cls: "bg-muted text-muted-foreground" },
};

function CapacityRow({ row }: { row: HotelCapacitySummaryRow }) {
  const badge = STATUS_BADGE[row.status];
  const isConfigured = row.status !== "unconfigured";
  const pct = isConfigured ? Math.min(100, row.usage_pct) : 0;
  const progressColor =
    row.status === "exceeded" ? "[&>div]:bg-red-500" :
    row.status === "full"     ? "[&>div]:bg-blue-500" :
    row.status === "near_full" ? "[&>div]:bg-amber-500" :
    "[&>div]:bg-green-500";

  return (
    <div className="flex items-center gap-3 py-2 border-b last:border-0">
      <BedDouble className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-sm font-medium">{ROOM_LABEL[row.room_type] ?? row.room_type}</span>
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4", badge.cls)}>
            {badge.label}
          </Badge>
        </div>
        {isConfigured ? (
          <>
            <Progress value={pct} className={cn("h-1.5 mb-1", progressColor)} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Rooming list: <span className="font-medium text-foreground">{row.assigned_count}</span> kamar
              </span>
              <span>
                Batas hotel: <span className="font-medium text-foreground">{row.capacity_limit}</span> kamar
              </span>
            </div>
            {row.status === "exceeded" && (
              <p className="text-xs text-red-600 mt-0.5 font-medium">
                ⚠️ Rooming list melebihi kapasitas fisik hotel sebesar {row.assigned_count - row.capacity_limit} kamar
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            {row.assigned_count} kamar di rooming list · batas hotel belum diisi
          </p>
        )}
      </div>
    </div>
  );
}

export default function HotelCapacityAlert({
  hotelId,
  departureId,
  hotelName,
}: HotelCapacityAlertProps) {
  const { data: summary, isLoading, error } = useHotelCapacitySummary(hotelId, departureId);
  const [expanded, setExpanded] = useState(false);

  if (isLoading || error || !summary || summary.length === 0) return null;

  const exceeded   = summary.filter(r => r.status === "exceeded");
  const nearFull   = summary.filter(r => r.status === "near_full");
  const configured = summary.filter(r => r.status !== "unconfigured");

  // Jika semua unconfigured, tampilkan info kecil saja
  if (configured.length === 0) {
    return (
      <Alert className="border-muted bg-muted/30">
        <BedDouble className="h-4 w-4 text-muted-foreground" />
        <AlertTitle className="text-sm text-muted-foreground">Kapasitas Hotel Belum Dikonfigurasi</AlertTitle>
        <AlertDescription className="text-xs text-muted-foreground">
          Set batas kamar per tipe di halaman <strong>Master Data → Hotel</strong> agar sistem bisa memvalidasi rooming list.
        </AlertDescription>
      </Alert>
    );
  }

  const hasIssues = exceeded.length > 0 || nearFull.length > 0;

  return (
    <Alert
      className={cn(
        "border",
        exceeded.length > 0
          ? "border-red-200 bg-red-50 dark:bg-red-950/20"
          : nearFull.length > 0
          ? "border-amber-200 bg-amber-50 dark:bg-amber-950/20"
          : "border-green-200 bg-green-50 dark:bg-green-950/20"
      )}
    >
      {exceeded.length > 0 ? (
        <AlertTriangle className="h-4 w-4 text-red-600" />
      ) : nearFull.length > 0 ? (
        <AlertTriangle className="h-4 w-4 text-amber-600" />
      ) : (
        <CheckCircle2 className="h-4 w-4 text-green-600" />
      )}

      <AlertTitle
        className={cn(
          exceeded.length > 0
            ? "text-red-700 dark:text-red-400"
            : nearFull.length > 0
            ? "text-amber-700 dark:text-amber-400"
            : "text-green-700 dark:text-green-400"
        )}
      >
        Kapasitas Hotel{hotelName ? ` — ${hotelName}` : ""}
        {exceeded.length > 0 && (
          <Badge variant="destructive" className="ml-2 text-xs">
            {exceeded.length} Melebihi Batas
          </Badge>
        )}
        {nearFull.length > 0 && exceeded.length === 0 && (
          <Badge className="ml-2 text-xs bg-amber-500 hover:bg-amber-600">
            {nearFull.length} Hampir Penuh
          </Badge>
        )}
      </AlertTitle>

      <AlertDescription className="text-sm space-y-2 mt-1">
        {!hasIssues ? (
          <p className="text-green-600 text-xs">
            Semua tipe kamar dalam batas kapasitas hotel.
          </p>
        ) : (
          <p
            className={cn(
              "text-xs",
              exceeded.length > 0 ? "text-red-600" : "text-amber-600"
            )}
          >
            {exceeded.length > 0 && (
              <span>
                Tipe {exceeded.map(r => ROOM_LABEL[r.room_type] ?? r.room_type).join(", ")}{" "}
                melebihi kapasitas fisik hotel.{" "}
              </span>
            )}
            {nearFull.length > 0 && (
              <span>
                Tipe {nearFull.map(r => ROOM_LABEL[r.room_type] ?? r.room_type).join(", ")}{" "}
                sudah ≥80% kapasitas.
              </span>
            )}
          </p>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs -ml-2"
          onClick={() => setExpanded(v => !v)}
        >
          {expanded ? (
            <><ChevronUp className="h-3.5 w-3.5 mr-1" />Sembunyikan detail</>
          ) : (
            <><ChevronDown className="h-3.5 w-3.5 mr-1" />Lihat detail per tipe kamar</>
          )}
        </Button>

        {expanded && (
          <div className="mt-1 rounded-md border bg-background/80 px-3 py-1">
            {summary.map(row => (
              <CapacityRow key={row.room_type} row={row} />
            ))}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
