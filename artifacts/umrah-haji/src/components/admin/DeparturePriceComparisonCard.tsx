import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Star,
  ExternalLink,
  Users,
  BarChart3,
  TrendingDown,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

interface Departure {
  id: string;
  departure_date: string | null;
  return_date: string | null;
  month: string | null;
  status: string | null;
  quota: number | null;
  booked_count: number | null;
  price_quad: number | null;
  price_triple: number | null;
  price_double: number | null;
  price_single: number | null;
  airline?: { code: string; name: string } | null;
  hotel_makkah?: { name: string; star_rating: number } | null;
  hotel_madinah?: { name: string; star_rating: number } | null;
  bookings?: any[];
}

interface DeparturePriceComparisonCardProps {
  departures: Departure[];
}

type SortKey = "date" | "quad" | "triple" | "double" | "single" | "occupancy";
type SortDir = "asc" | "desc";
type RoomType = "quad" | "triple" | "double" | "single";

const ROOM_LABELS: Record<RoomType, string> = {
  quad: "Quad",
  triple: "Triple",
  double: "Double",
  single: "Single",
};

const MONTHS = [
  "", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Ags", "Sep", "Okt", "Nov", "Des",
];

function statusBadge(status: string | null) {
  switch (status) {
    case "open":   return <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px]">Open</Badge>;
    case "closed": return <Badge variant="secondary" className="text-[10px]">Closed</Badge>;
    case "full":   return <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-[10px]">Full</Badge>;
    case "departed": return <Badge variant="outline" className="text-[10px]">Departed</Badge>;
    default:       return <Badge variant="outline" className="text-[10px]">{status || "-"}</Badge>;
  }
}

function occupancyColor(pct: number) {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-orange-400";
  if (pct >= 40) return "bg-yellow-400";
  return "bg-green-500";
}

export function DeparturePriceComparisonCard({ departures }: DeparturePriceComparisonCardProps) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [highlight, setHighlight] = useState<RoomType>("double");

  const active = useMemo(
    () => departures.filter((d) => d.status !== "cancelled"),
    [departures]
  );

  // Min prices per room type across all departures
  const mins = useMemo(() => {
    const get = (key: RoomType) =>
      Math.min(...active.map((d) => d[`price_${key}`] || Infinity).filter((v) => v < Infinity));
    return {
      quad: get("quad"),
      triple: get("triple"),
      double: get("double"),
      single: get("single"),
    };
  }, [active]);

  const sorted = useMemo(() => {
    const arr = [...active];
    arr.sort((a, b) => {
      let av = 0, bv = 0;
      if (sortKey === "date") {
        av = a.departure_date ? new Date(a.departure_date).getTime() : 0;
        bv = b.departure_date ? new Date(b.departure_date).getTime() : 0;
      } else if (sortKey === "occupancy") {
        av = a.quota ? ((a.booked_count || 0) / a.quota) * 100 : 0;
        bv = b.quota ? ((b.booked_count || 0) / b.quota) * 100 : 0;
      } else {
        av = a[`price_${sortKey}`] || 0;
        bv = b[`price_${sortKey}`] || 0;
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [active, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 text-primary" />
      : <ArrowDown className="h-3 w-3 text-primary" />;
  }

  function PriceCell({ departure, room }: { departure: Departure; room: RoomType }) {
    const price = departure[`price_${room}`] || 0;
    const min = mins[room];
    const isCheapest = price > 0 && price === min;
    const diff = price > 0 && min < Infinity && price !== min ? price - min : 0;
    const pct = min > 0 && diff > 0 ? Math.round((diff / min) * 100) : 0;
    const isHighlight = room === highlight;

    if (!price) return <TableCell className="text-center text-muted-foreground text-xs">—</TableCell>;

    return (
      <TableCell className={`text-right ${isHighlight ? "bg-primary/5" : ""}`}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex flex-col items-end gap-0.5 cursor-default">
                <span className={`font-semibold text-xs ${isCheapest ? "text-green-700" : ""}`}>
                  {formatCurrency(price)}
                </span>
                {isCheapest && (
                  <Badge className="bg-green-100 text-green-700 border-green-200 text-[9px] px-1 py-0 h-4">
                    <Star className="h-2 w-2 mr-0.5" />Termurah
                  </Badge>
                )}
                {diff > 0 && (
                  <span className="text-[10px] text-muted-foreground">+{pct}%</span>
                )}
              </div>
            </TooltipTrigger>
            {diff > 0 && (
              <TooltipContent side="left" className="text-xs">
                Selisih {formatCurrency(diff)} dari harga termurah
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </TableCell>
    );
  }

  if (active.length === 0) return null;

  // Summary stats
  const allPrices = active
    .flatMap((d) => [d.price_quad, d.price_triple, d.price_double, d.price_single])
    .filter((p): p is number => !!p && p > 0);
  const globalMin = allPrices.length ? Math.min(...allPrices) : 0;
  const globalMax = allPrices.length ? Math.max(...allPrices) : 0;
  const cheapestDep = active.find(
    (d) =>
      d[`price_${highlight}`] === mins[highlight] && mins[highlight] < Infinity
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-primary" />
            Perbandingan Harga Keberangkatan
            <Badge variant="secondary">{active.length} jadwal</Badge>
          </CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground whitespace-nowrap">Sorot tipe:</span>
            <Select value={highlight} onValueChange={(v) => setHighlight(v as RoomType)}>
              <SelectTrigger className="h-8 w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ROOM_LABELS) as RoomType[]).map((r) => (
                  <SelectItem key={r} value={r}>{ROOM_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.keys(ROOM_LABELS) as RoomType[]).map((room) => {
            const min = mins[room];
            const hasData = min < Infinity;
            return (
              <button
                key={room}
                onClick={() => setHighlight(room)}
                className={`rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 ${
                  highlight === room ? "border-primary bg-primary/5" : ""
                }`}
              >
                <p className="text-xs text-muted-foreground mb-0.5">{ROOM_LABELS[room]}</p>
                <p className={`font-bold text-sm ${hasData ? "text-green-700" : "text-muted-foreground"}`}>
                  {hasData ? formatCurrency(min) : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">harga mulai</p>
              </button>
            );
          })}
        </div>

        {/* Cheapest note */}
        {cheapestDep && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm">
            <TrendingDown className="h-4 w-4 text-green-600 shrink-0" />
            <span className="text-green-800">
              Harga <strong>{ROOM_LABELS[highlight]}</strong> termurah:{" "}
              <strong>{formatCurrency(mins[highlight])}</strong> — keberangkatan{" "}
              {cheapestDep.departure_date
                ? formatDate(cheapestDep.departure_date)
                : cheapestDep.month
                  ? `Bulan ${MONTHS[parseInt(cheapestDep.month)] || cheapestDep.month}`
                  : "TBD"}
            </span>
          </div>
        )}

        {/* Main comparison table */}
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs w-40">
                  <button
                    onClick={() => toggleSort("date")}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    Keberangkatan <SortIcon k="date" />
                  </button>
                </TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">
                  <button
                    onClick={() => toggleSort("occupancy")}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    Isi Kursi <SortIcon k="occupancy" />
                  </button>
                </TableHead>
                <TableHead className={`text-xs text-right ${highlight === "quad" ? "bg-primary/10" : ""}`}>
                  <button onClick={() => toggleSort("quad")} className="flex items-center gap-1 ml-auto hover:text-foreground">
                    Quad <SortIcon k="quad" />
                  </button>
                </TableHead>
                <TableHead className={`text-xs text-right ${highlight === "triple" ? "bg-primary/10" : ""}`}>
                  <button onClick={() => toggleSort("triple")} className="flex items-center gap-1 ml-auto hover:text-foreground">
                    Triple <SortIcon k="triple" />
                  </button>
                </TableHead>
                <TableHead className={`text-xs text-right ${highlight === "double" ? "bg-primary/10" : ""}`}>
                  <button onClick={() => toggleSort("double")} className="flex items-center gap-1 ml-auto hover:text-foreground">
                    Double <SortIcon k="double" />
                  </button>
                </TableHead>
                <TableHead className={`text-xs text-right ${highlight === "single" ? "bg-primary/10" : ""}`}>
                  <button onClick={() => toggleSort("single")} className="flex items-center gap-1 ml-auto hover:text-foreground">
                    Single <SortIcon k="single" />
                  </button>
                </TableHead>
                <TableHead className="text-xs text-center">Hotel Makkah</TableHead>
                <TableHead className="text-xs text-center w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((dep) => {
                const booked = dep.booked_count || (dep.bookings?.filter((b: any) => b.booking_status !== "cancelled").length) || 0;
                const quota = dep.quota || 0;
                const occupancyPct = quota > 0 ? Math.round((booked / quota) * 100) : 0;

                return (
                  <TableRow key={dep.id} className="hover:bg-muted/30">
                    {/* Date */}
                    <TableCell className="text-xs">
                      {dep.departure_date ? (
                        <div>
                          <p className="font-medium">{formatDate(dep.departure_date)}</p>
                          {dep.return_date && (
                            <p className="text-[10px] text-muted-foreground">
                              s/d {formatDate(dep.return_date)}
                            </p>
                          )}
                        </div>
                      ) : dep.month ? (
                        <p className="font-medium text-muted-foreground italic">
                          Bln {MONTHS[parseInt(dep.month)] || dep.month}
                        </p>
                      ) : (
                        <p className="text-muted-foreground italic text-[10px]">TBD</p>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>{statusBadge(dep.status)}</TableCell>

                    {/* Occupancy */}
                    <TableCell>
                      <div className="space-y-1 min-w-[80px]">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Users className="h-2.5 w-2.5" />
                            {booked}/{quota}
                          </span>
                          <span className="font-medium">{occupancyPct}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${occupancyColor(occupancyPct)}`}
                            style={{ width: `${Math.min(100, occupancyPct)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>

                    {/* Prices */}
                    <PriceCell departure={dep} room="quad" />
                    <PriceCell departure={dep} room="triple" />
                    <PriceCell departure={dep} room="double" />
                    <PriceCell departure={dep} room="single" />

                    {/* Hotel */}
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {dep.hotel_makkah ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="max-w-[100px] truncate block mx-auto">
                              {dep.hotel_makkah.name}
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              {dep.hotel_makkah.name} ★{dep.hotel_makkah.star_rating}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : "—"}
                    </TableCell>

                    {/* Link */}
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" asChild className="h-7 w-7">
                        <Link to={`/admin/departures/${dep.id}`}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Global range footer */}
        {globalMin > 0 && (
          <p className="text-xs text-muted-foreground text-right">
            Rentang harga semua tipe: {formatCurrency(globalMin)} – {formatCurrency(globalMax)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
