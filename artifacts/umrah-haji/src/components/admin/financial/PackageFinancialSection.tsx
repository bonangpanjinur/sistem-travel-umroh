import React, { useState } from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeparturePLSummaryCard } from "./DeparturePLSummaryCard";
import { DepartureCostItemsCard } from "./DepartureCostItemsCard";
import { DepartureExpensesCard } from "./DepartureExpensesCard";
import { DepartureOtherRevenuesCard } from "./DepartureOtherRevenuesCard";
import {
  DepartureMarginComparison,
  type DepartureForComparison,
} from "./DepartureMarginComparison";
import { DepartureMarginCalculator } from "./DepartureMarginCalculator";
import { Calendar, DollarSign, BarChart2, Calculator } from "lucide-react";

interface Departure {
  id: string;
  departure_date: string | null;
  return_date: string | null;
  status: string;
  quota: number;
  price_quad?: number | null;
  price_triple?: number | null;
  price_double?: number | null;
  price_single?: number | null;
  bookings?: { booking_status: string; total_pax: number }[];
  packageName?: string;
}

interface Props {
  departures: Departure[];
  packageName?: string;
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

const STATUS_BADGE: Record<string, React.ReactElement> = {
  open:     <Badge className="bg-green-500 text-[10px] px-1.5 py-0">Open</Badge>,
  closed:   <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Closed</Badge>,
  full:     <Badge className="bg-orange-500 text-[10px] px-1.5 py-0">Full</Badge>,
  departed: <Badge variant="outline" className="text-[10px] px-1.5 py-0">Berangkat</Badge>,
};

export function PackageFinancialSection({ departures, packageName }: Props) {
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

  const depsForComparison: DepartureForComparison[] = departures.map((d) => ({
    id: d.id,
    departure_date: d.departure_date,
    return_date: d.return_date,
    status: d.status,
    quota: d.quota,
    price_quad: d.price_quad ?? null,
    price_triple: d.price_triple ?? null,
    price_double: d.price_double ?? null,
    price_single: d.price_single ?? null,
    bookings: d.bookings,
  }));

  return (
    <Tabs defaultValue="detail" className="space-y-4">
      <TabsList className="h-8">
        <TabsTrigger value="detail" className="text-xs gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          Detail per Keberangkatan
        </TabsTrigger>
        <TabsTrigger value="calculator" className="text-xs gap-1.5">
          <Calculator className="h-3.5 w-3.5" />
          Kalkulator Margin
        </TabsTrigger>
        <TabsTrigger value="comparison" className="text-xs gap-1.5">
          <BarChart2 className="h-3.5 w-3.5" />
          Perbandingan Margin
          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
            {departures.length}
          </Badge>
        </TabsTrigger>
      </TabsList>

      {/* ── Tab 1: Detail per keberangkatan ── */}
      <TabsContent value="detail" className="space-y-6 mt-0">
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
            <DeparturePLSummaryCard
              departureId={selected.id}
              departureLabel={formatDepartureLabel(selected)}
              paxCount={paxCount}
              quota={selected.quota}
            />

            <div className="grid gap-4 lg:grid-cols-2">
              <DepartureCostItemsCard
                departureId={selected.id}
                paxCount={paxCount}
                departureLabel={formatDepartureLabel(selected)}
                priceQuad={selected.price_quad ?? 0}
                priceTriple={selected.price_triple ?? 0}
                priceDouble={selected.price_double ?? 0}
                priceSingle={selected.price_single ?? 0}
              />
              <div className="space-y-4">
                <DepartureExpensesCard departureId={selected.id} />
                <DepartureOtherRevenuesCard departureId={selected.id} />
              </div>
            </div>
          </div>
        )}
      </TabsContent>

      {/* ── Tab 2: Kalkulator Margin ── */}
      <TabsContent value="calculator" className="mt-0">
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <Calculator className="h-4 w-4 text-muted-foreground shrink-0" />
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
        </div>
        {selected ? (
          <DepartureMarginCalculator
            departureId={selected.id}
            paxCount={paxCount}
            priceQuad={selected.price_quad ?? 0}
            priceTriple={selected.price_triple ?? 0}
            priceDouble={selected.price_double ?? 0}
            priceSingle={selected.price_single ?? 0}
            packageName={packageName}
            departureDate={selected.departure_date}
          />
        ) : (
          <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
            <Calculator className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Pilih keberangkatan di atas untuk melihat kalkulator margin</p>
          </div>
        )}
      </TabsContent>

      {/* ── Tab 3: Perbandingan Margin ── */}
      <TabsContent value="comparison" className="mt-0">
        <DepartureMarginComparison departures={depsForComparison} />
      </TabsContent>
    </Tabs>
  );
}
