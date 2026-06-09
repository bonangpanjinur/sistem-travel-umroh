import { useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  addDays, startOfDay, differenceInCalendarDays, format, isToday,
  isWeekend, startOfMonth, eachDayOfInterval, parseISO, isSameDay,
  addMonths, subMonths, startOfWeek, endOfMonth,
} from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CalendarDays, AlertTriangle, ChevronLeft, ChevronRight, Dot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link } from "react-router-dom";

// ─── constants ────────────────────────────────────────────────────────────────
const DAY_W   = 30;   // px per day column
const ROW_H   = 44;   // px per muthawif row
const NAME_W  = 148;  // px for muthawif name column
const DAYS    = 56;   // 8 weeks visible

const ROLE_COLOR: Record<string, string> = {
  lead:      "bg-amber-500 border-amber-600",
  muthawif:  "bg-blue-500  border-blue-600",
  assistant: "bg-slate-400 border-slate-500",
};
const ROLE_LABEL: Record<string, string> = {
  lead: "Lead", muthawif: "Muthawif", assistant: "Asisten",
};
const STATUS_OPACITY: Record<string, string> = {
  scheduled: "opacity-90",
  ongoing:   "opacity-100",
  completed: "opacity-40",
  cancelled: "opacity-20 line-through",
};

// ─── types ────────────────────────────────────────────────────────────────────
interface Assignment {
  id: string;
  muthawif_id: string;
  departure_id: string;
  role: string;
  notes?: string | null;
  departure: {
    id: string;
    departure_date: string;
    return_date: string | null;
    status: string;
    package: { name: string } | null;
  };
}
interface Muthawif {
  id: string;
  name: string;
  is_active: boolean;
  experience_years?: number | null;
}

interface Props {
  /** If set, we scroll & highlight this departure in the calendar */
  highlightDepartureId?: string;
}

// ─── main component ───────────────────────────────────────────────────────────
export function MuthawifConflictCalendar({ highlightDepartureId }: Props) {
  const [viewStart, setViewStart] = useState<Date>(() => {
    const t = startOfDay(new Date());
    return addDays(t, -7); // start 1 week before today
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch active muthawifs
  const { data: muthawifs = [], isLoading: loadingM } = useQuery<Muthawif[]>({
    queryKey: ["muthawifs-calendar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("muthawifs")
        .select("id, name, is_active, experience_years")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  // Fetch all assignments with departure info
  const { data: assignments = [], isLoading: loadingA } = useQuery<Assignment[]>({
    queryKey: ["muthawif-calendar-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departure_muthawifs")
        .select(`
          id, muthawif_id, departure_id, role, notes,
          departure:departures(
            id, departure_date, return_date, status,
            package:packages(name)
          )
        `)
        .order("departure_id");
      if (error && error.code === "42P01") return [];
      if (error) throw error;
      return (data || []).filter((a: any) => a.departure?.departure_date);
    },
    staleTime: 30_000,
  });

  const viewEnd = addDays(viewStart, DAYS - 1);
  const days = eachDayOfInterval({ start: viewStart, end: viewEnd });

  // ── build per-muthawif block list + detect conflicts ──────────────────────
  const { rows, conflictSet } = useMemo(() => {
    const rows = muthawifs.map((m) => {
      const blocks = assignments
        .filter((a) => a.muthawif_id === m.id)
        .map((a) => {
          const s = startOfDay(parseISO(a.departure.departure_date));
          const e = a.departure.return_date
            ? startOfDay(parseISO(a.departure.return_date))
            : s;
          return { ...a, start: s, end: e };
        })
        .sort((a, b) => a.start.getTime() - b.start.getTime());
      return { muthawif: m, blocks };
    });

    // Detect conflicts: same muthawif, overlapping ranges
    const conflictSet = new Set<string>(); // departure_id values
    for (const row of rows) {
      for (let i = 0; i < row.blocks.length; i++) {
        for (let j = i + 1; j < row.blocks.length; j++) {
          const a = row.blocks[i];
          const b = row.blocks[j];
          if (a.departure.status === "cancelled" || b.departure.status === "cancelled") continue;
          if (a.departure.status === "completed" || b.departure.status === "completed") continue;
          // Overlap: a.start <= b.end && b.start <= a.end
          if (a.start <= b.end && b.start <= a.end) {
            conflictSet.add(a.departure_id);
            conflictSet.add(b.departure_id);
          }
        }
      }
    }
    return { rows, conflictSet };
  }, [muthawifs, assignments]);

  const totalConflicts = conflictSet.size;

  // Auto-scroll to today on mount
  useEffect(() => {
    if (scrollRef.current) {
      const todayOffset = differenceInCalendarDays(startOfDay(new Date()), viewStart);
      if (todayOffset >= 0) {
        scrollRef.current.scrollLeft = Math.max(0, todayOffset * DAY_W - 80);
      }
    }
  }, []);

  // ── month header groups ──────────────────────────────────────────────────
  const monthGroups = useMemo(() => {
    const groups: { label: string; start: number; span: number }[] = [];
    let cur = "";
    let curStart = 0;
    days.forEach((d, i) => {
      const label = format(d, "MMMM yyyy", { locale: localeId });
      if (label !== cur) {
        if (cur) groups[groups.length - 1].span = i - curStart;
        groups.push({ label, start: i, span: 0 });
        cur = label;
        curStart = i;
      }
    });
    if (groups.length) groups[groups.length - 1].span = days.length - groups[groups.length - 1].start;
    return groups;
  }, [days]);

  const loading = loadingM || loadingA;

  return (
    <TooltipProvider>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-5 w-5" />
              Kalender Jadwal Muthawif
              {totalConflicts > 0 && (
                <Badge className="bg-red-100 text-red-700 border-red-300 gap-1 ml-1">
                  <AlertTriangle className="h-3 w-3" />
                  {totalConflicts} konflik
                </Badge>
              )}
            </CardTitle>

            {/* Navigation */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline" size="sm"
                onClick={() => setViewStart(d => addDays(d, -14))}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline" size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setViewStart(addDays(startOfDay(new Date()), -7))}
              >
                Hari ini
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={() => setViewStart(d => addDays(d, 14))}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" /> Lead</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" /> Muthawif</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-slate-400 inline-block" /> Asisten</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Konflik jadwal</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm border border-dashed border-slate-400 inline-block opacity-40" /> Selesai/Batal</span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Belum ada muthawif aktif</p>
            </div>
          ) : (
            <div className="flex">
              {/* Fixed: muthawif name column */}
              <div className="shrink-0 border-r bg-muted/20" style={{ width: NAME_W }}>
                {/* top spacer: month + day header rows */}
                <div style={{ height: 48 }} />
                {rows.map(({ muthawif }, ri) => (
                  <div
                    key={muthawif.id}
                    className="flex items-center px-3 border-b text-sm font-medium truncate"
                    style={{ height: ROW_H }}
                  >
                    <Link
                      to={`/admin/muthawifs/${muthawif.id}`}
                      className="truncate hover:text-primary transition-colors"
                      title={muthawif.name}
                    >
                      {muthawif.name}
                    </Link>
                  </div>
                ))}
              </div>

              {/* Scrollable: timeline */}
              <div
                ref={scrollRef}
                className="overflow-x-auto flex-1"
              >
                <div style={{ width: days.length * DAY_W, minWidth: "100%" }}>
                  {/* Month row */}
                  <div className="flex border-b" style={{ height: 24 }}>
                    {monthGroups.map((g, i) => (
                      <div
                        key={i}
                        className="text-[10px] font-semibold text-muted-foreground flex items-center pl-2 border-r shrink-0 bg-muted/30 uppercase tracking-wide"
                        style={{ width: g.span * DAY_W }}
                      >
                        {g.label}
                      </div>
                    ))}
                  </div>

                  {/* Day header row */}
                  <div className="flex border-b" style={{ height: 24 }}>
                    {days.map((d, i) => {
                      const today = isToday(d);
                      const weekend = isWeekend(d);
                      return (
                        <div
                          key={i}
                          className={[
                            "flex flex-col items-center justify-center border-r text-[9px] shrink-0 leading-none",
                            today ? "bg-primary/10 text-primary font-bold" : weekend ? "bg-slate-50 text-muted-foreground/70" : "text-muted-foreground/80",
                          ].join(" ")}
                          style={{ width: DAY_W }}
                        >
                          <span>{format(d, "d")}</span>
                          <span className="uppercase">{format(d, "eee", { locale: localeId }).slice(0, 2)}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Muthawif rows */}
                  {rows.map(({ muthawif, blocks }, ri) => {
                    return (
                      <div
                        key={muthawif.id}
                        className="relative border-b"
                        style={{ height: ROW_H }}
                      >
                        {/* Day column backgrounds */}
                        <div className="absolute inset-0 flex">
                          {days.map((d, i) => {
                            const today = isToday(d);
                            const weekend = isWeekend(d);
                            return (
                              <div
                                key={i}
                                className={[
                                  "shrink-0 border-r h-full",
                                  today ? "bg-primary/5" : weekend ? "bg-slate-50/70" : "",
                                ].join(" ")}
                                style={{ width: DAY_W }}
                              />
                            );
                          })}
                        </div>

                        {/* Today vertical line */}
                        {(() => {
                          const todayOffset = differenceInCalendarDays(startOfDay(new Date()), viewStart);
                          if (todayOffset < 0 || todayOffset >= DAYS) return null;
                          return (
                            <div
                              className="absolute top-0 bottom-0 w-px bg-primary/50 z-10 pointer-events-none"
                              style={{ left: todayOffset * DAY_W + DAY_W / 2 }}
                            />
                          );
                        })()}

                        {/* Assignment blocks */}
                        {blocks.map((block) => {
                          const startOff = differenceInCalendarDays(block.start, viewStart);
                          const endOff   = differenceInCalendarDays(block.end, viewStart);
                          // Clip to view window
                          const clippedStart = Math.max(0, startOff);
                          const clippedEnd   = Math.min(DAYS - 1, endOff);
                          if (clippedEnd < clippedStart) return null;

                          const isConflict  = conflictSet.has(block.departure_id);
                          const isHighlight = block.departure_id === highlightDepartureId;
                          const isComplete  = ["completed", "cancelled"].includes(block.departure.status);
                          const durDays     = differenceInCalendarDays(block.end, block.start) + 1;

                          const colorClass = isConflict
                            ? "bg-red-500 border-red-600"
                            : isHighlight
                              ? "bg-emerald-500 border-emerald-600"
                              : ROLE_COLOR[block.role] || ROLE_COLOR.muthawif;

                          const opacityClass = isComplete
                            ? "opacity-30"
                            : isConflict
                              ? "opacity-95"
                              : "opacity-85 hover:opacity-100";

                          const left  = clippedStart * DAY_W;
                          const width = Math.max((clippedEnd - clippedStart + 1) * DAY_W - 2, 4);

                          return (
                            <Tooltip key={block.id}>
                              <TooltipTrigger asChild>
                                <div
                                  className={[
                                    "absolute top-2 rounded border text-white text-[10px] font-medium",
                                    "flex items-center overflow-hidden cursor-default transition-opacity",
                                    colorClass,
                                    opacityClass,
                                    isHighlight ? "ring-2 ring-emerald-400 ring-offset-1" : "",
                                    isConflict ? "ring-1 ring-red-700" : "",
                                  ].join(" ")}
                                  style={{ left: left + 1, width, height: ROW_H - 16 }}
                                >
                                  {width > 40 && (
                                    <span className="px-1.5 truncate leading-none">
                                      {block.departure.package?.name || "Paket?"}
                                    </span>
                                  )}
                                  {isConflict && width > 16 && (
                                    <AlertTriangle className="h-2.5 w-2.5 shrink-0 mr-0.5" />
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-56 text-xs space-y-1 p-2.5">
                                <p className="font-semibold">{block.departure.package?.name || "—"}</p>
                                <p className="text-muted-foreground">
                                  {format(block.start, "dd MMM yyyy", { locale: localeId })}
                                  {" → "}
                                  {format(block.end, "dd MMM yyyy", { locale: localeId })}
                                  {" "}({durDays} hari)
                                </p>
                                <p>
                                  Peran:{" "}
                                  <span className="font-medium">{ROLE_LABEL[block.role] || block.role}</span>
                                </p>
                                {block.notes && <p className="italic text-muted-foreground">{block.notes}</p>}
                                <p>
                                  Status:{" "}
                                  <span className={isConflict ? "text-red-600 font-medium" : "text-muted-foreground"}>
                                    {isConflict ? "⚠ Konflik jadwal" : block.departure.status}
                                  </span>
                                </p>
                                <Link
                                  to={`/admin/departures/${block.departure_id}`}
                                  className="text-primary underline underline-offset-2 text-xs"
                                >
                                  Buka keberangkatan →
                                </Link>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
