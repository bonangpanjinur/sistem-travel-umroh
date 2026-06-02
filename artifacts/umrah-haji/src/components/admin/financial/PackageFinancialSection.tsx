import { useState } from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DeparturePLSummaryCard } from "./DeparturePLSummaryCard";
import { DepartureCostItemsCard } from "./DepartureCostItemsCard";
import { DepartureExpensesCard } from "./DepartureExpensesCard";
import { DepartureOtherRevenuesCard } from "./DepartureOtherRevenuesCard";
import { Calendar, DollarSign } from "lucide-react";

interface Departure {
  id: string;
  departure_date: string | null;
  return_date: string | null;
  status: string;
  quota: number;
  bookings?: { booking_status: string; total_pax: number }[];
}

interface Props {
  departures: Departure[];
}

function formatDepartureLabel(d: Departure): string {
  if (d.departure_date) {
    const dep = new Date(d.departure_date).toLocaleDateString("id-ID", {
      day: "numeric", month: "short", year: "numeric",
    });
    const ret = d.return_date
      ? new Date(d.return_date).toLocaleDateString("id-ID", {
          day: "numeric", month: "short", year: "numeric",
        })
      : "-";
    return `${dep} — ${ret}`;
  }
  return "Tanggal belum ditentukan";
}

const STATUS_BADGE: Record<string, JSX.Element> = {
  open:     <Badge className="bg-green-500 text-[10px] px-1.5 py-0">Open</Badge>,
  closed:   <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Closed</Badge>,
  full:     <Badge className="bg-orange-500 text-[10px] px-1.5 py-0">Full</Badge>,
  departed: <Badge variant="outline" className="text-[10px] px-1.5 py-0">Berangkat</Badge>,
};

export function PackageFinancialSection({ departures }: Props) {
  const [selectedId, setSelectedId] = useState<string>(departures[0]?.id ?? "");

  const selected = departures.find((d) => d.id === selectedId);
  const paxCount = selected?.bookings
    ?.filter((b) => ["confirmed", "completed"].includes(b.booking_status))
    .reduce((s, b) => s + (b.total_pax || 0), 0) ?? 0;

  if (!departures || departures.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
        <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">Belum ada jadwal keberangkatan</p>
        <p className="text-sm mt-1">Hubungkan keberangkatan ke paket ini terlebih dahulu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Departure selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium text-muted-foreground shrink-0">Keberangkatan:</span>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="w-full max-w-sm">
            <SelectValue placeholder="Pilih keberangkatan..." />
          </SelectTrigger>
          <SelectContent>
            {departures.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                <div className="flex items-center gap-2">
                  <span>{formatDepartureLabel(d)}</span>
                  {STATUS_BADGE[d.status]}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{paxCount} jamaah aktif</span>
            <span>•</span>
            <span>{selected.quota} kuota</span>
          </div>
        )}
      </div>

      {selected && (
        <div className="space-y-4">
          {/* P&L Summary at the top */}
          <DeparturePLSummaryCard
            departureId={selected.id}
            departureLabel={formatDepartureLabel(selected)}
            paxCount={paxCount}
            quota={selected.quota}
          />

          {/* Three cards side by side on large screens, stacked on small */}
          <div className="grid gap-4 lg:grid-cols-2">
            <DepartureCostItemsCard
              departureId={selected.id}
              paxCount={paxCount}
              departureLabel={formatDepartureLabel(selected)}
            />
            <div className="space-y-4">
              <DepartureExpensesCard departureId={selected.id} />
              <DepartureOtherRevenuesCard departureId={selected.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
