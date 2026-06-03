import { AlertTriangle, Heart, Users, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMahramConflicts, MahramConflict } from "@/hooks/useMahramConflicts";

interface MahramCompatibilityAlertProps {
  departureId: string;
  hotelId?: string | null;
}

const RELATION_LABEL: Record<string, string> = {
  suami: "Suami",
  istri: "Istri",
  ayah: "Ayah",
  ibu: "Ibu",
  anak: "Anak",
  saudara: "Saudara Kandung",
  paman: "Paman",
  kakek: "Kakek",
  nenek: "Nenek",
  cucu: "Cucu",
};

const CONFLICT_LABEL: Record<MahramConflict["conflict_type"], { label: string; color: string }> = {
  both_unassigned:   { label: "Keduanya belum ditempatkan", color: "text-muted-foreground" },
  jamaah_unassigned: { label: "Jamaah belum dapat kamar",   color: "text-amber-600" },
  mahram_unassigned: { label: "Mahram belum dapat kamar",   color: "text-red-600" },
  different_hotels:  { label: "Beda hotel",                 color: "text-orange-600" },
  ok:                { label: "OK",                         color: "text-green-600" },
};

function ConflictRow({ conflict }: { conflict: MahramConflict }) {
  const { label, color } = CONFLICT_LABEL[conflict.conflict_type];
  const genderIcon = (g: string) => (g === "male" ? "👨" : g === "female" ? "👩" : "👤");

  return (
    <div className="flex items-start gap-3 py-2 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
          <span className="font-medium">
            {genderIcon(conflict.jamaah_gender)} {conflict.jamaah_name}
          </span>
          <span className="text-muted-foreground text-xs">↔</span>
          <span className="font-medium">
            {genderIcon(conflict.mahram_gender)} {conflict.mahram_name}
          </span>
          <Badge variant="secondary" className="text-xs">
            {RELATION_LABEL[conflict.mahram_relation] ?? conflict.mahram_relation}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-x-4 mt-1 text-xs text-muted-foreground">
          <span>
            Kamar jamaah:{" "}
            <span className="font-medium text-foreground">
              {conflict.jamaah_room
                ? `${conflict.jamaah_room} (${conflict.jamaah_hotel})`
                : "Belum ditempatkan"}
            </span>
          </span>
          <span>
            Kamar mahram:{" "}
            <span className="font-medium text-foreground">
              {conflict.mahram_room
                ? `${conflict.mahram_room} (${conflict.mahram_hotel})`
                : "Belum ditempatkan"}
            </span>
          </span>
        </div>
      </div>
      <span className={cn("text-xs font-medium shrink-0 mt-0.5", color)}>{label}</span>
    </div>
  );
}

export default function MahramCompatibilityAlert({
  departureId,
  hotelId,
}: MahramCompatibilityAlertProps) {
  const { data: conflicts, isLoading, error } = useMahramConflicts(departureId, hotelId);
  const [expanded, setExpanded] = useState(false);

  if (isLoading || error || !conflicts) return null;

  const critical = conflicts.filter(c => c.conflict_type === "mahram_unassigned");
  const warning  = conflicts.filter(c => c.conflict_type === "jamaah_unassigned" || c.conflict_type === "different_hotels");
  const info     = conflicts.filter(c => c.conflict_type === "both_unassigned");

  const total = conflicts.length;

  if (total === 0) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-700 dark:text-green-400">Kompatibilitas Mahram: OK</AlertTitle>
        <AlertDescription className="text-green-600 text-sm">
          Semua pasangan mahram terdaftar telah ditempatkan di kamar yang kompatibel.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert
      className={cn(
        "border",
        critical.length > 0
          ? "border-red-200 bg-red-50 dark:bg-red-950/20"
          : "border-amber-200 bg-amber-50 dark:bg-amber-950/20"
      )}
    >
      <AlertTriangle
        className={cn(
          "h-4 w-4",
          critical.length > 0 ? "text-red-600" : "text-amber-600"
        )}
      />
      <AlertTitle
        className={cn(
          critical.length > 0 ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"
        )}
      >
        Peringatan Mahram —{" "}
        {total} pasangan perlu diperhatikan
        {critical.length > 0 && (
          <Badge variant="destructive" className="ml-2 text-xs">
            {critical.length} Kritis
          </Badge>
        )}
        {warning.length > 0 && (
          <Badge className="ml-1 text-xs bg-amber-500 hover:bg-amber-600">
            {warning.length} Peringatan
          </Badge>
        )}
      </AlertTitle>
      <AlertDescription className="text-sm space-y-2 mt-1">
        <p
          className={cn(
            critical.length > 0 ? "text-red-600" : "text-amber-600"
          )}
        >
          {critical.length > 0 && (
            <span>⚠️ {critical.length} jamaah memiliki mahram yang belum mendapat kamar. </span>
          )}
          {warning.length > 0 && (
            <span>{warning.length} pasangan ditempatkan di hotel berbeda. </span>
          )}
          {info.length > 0 && (
            <span>{info.length} pasangan belum ditempatkan sama sekali.</span>
          )}
        </p>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs -ml-2"
          onClick={() => setExpanded(v => !v)}
        >
          {expanded ? (
            <><ChevronUp className="h-3.5 w-3.5 mr-1" />Sembunyikan detail</>
          ) : (
            <><ChevronDown className="h-3.5 w-3.5 mr-1" />Lihat {total} pasangan</>
          )}
        </Button>

        {expanded && (
          <div className="mt-2 rounded-md border bg-background/80 px-3 py-1">
            {conflicts.map((c, i) => (
              <ConflictRow key={`${c.jamaah_id}-${c.mahram_id}-${i}`} conflict={c} />
            ))}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
