import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Layers, Edit2, Save, RotateCcw, Plus, Trash2,
  CalendarDays, Clock, MapPin, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, Copy,
} from "lucide-react";
import { format, addDays, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────────────────────────── */
interface Activity {
  time: string;
  activity: string;
  location?: string;
}
interface ItineraryDay {
  day: number;
  title: string;
  actual_date?: string;
  activities: Activity[];
}
interface ItineraryTemplate {
  id: string;
  name: string;
  description?: string | null;
  duration_days: number;
  days: ItineraryDay[];
}
interface DepartureItinerary {
  id: string;
  departure_id: string;
  template_id: string;
  customized_days?: ItineraryDay[] | null;
  itinerary_template?: ItineraryTemplate;
}

interface Props {
  departureId: string;
  departureDate?: string | null;
  itinerary: DepartureItinerary;
}

/* ── Helper: enrich template days with actual_date ───────────────────── */
function enrichDays(days: ItineraryDay[], departureDate?: string | null): ItineraryDay[] {
  if (!departureDate) return days.map(d => ({ ...d }));
  const base = parseISO(departureDate);
  return days.map(d => ({
    ...d,
    actual_date: format(addDays(base, d.day - 1), "yyyy-MM-dd"),
  }));
}

function fmtDate(iso?: string) {
  if (!iso) return "";
  try { return format(parseISO(iso), "EEEE, d MMMM yyyy", { locale: idLocale }); }
  catch { return iso; }
}

/* ── Component ──────────────────────────────────────────────────────────── */
export function DepartureItineraryEditor({ departureId, departureDate, itinerary }: Props) {
  const queryClient = useQueryClient();
  const template = itinerary.itinerary_template;

  // Working copy of days (local edit state)
  const [days, setDays] = useState<ItineraryDay[]>(() =>
    (itinerary.customized_days as ItineraryDay[] | null) ?? []
  );
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [editingDay, setEditingDay]   = useState<number | null>(null);
  const [isCopying, setIsCopying]     = useState(false);
  const [isDirty, setIsDirty]         = useState(false);

  /* ── Persist customized_days ─────────────────────────────────────── */
  const saveMutation = useMutation({
    mutationFn: async (newDays: ItineraryDay[]) => {
      const { error } = await (supabase as any)
        .from("departure_itineraries")
        .update({ customized_days: newDays })
        .eq("id", itinerary.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departure-itinerary", departureId] });
      setIsDirty(false);
      toast.success("Itinerary disimpan");
    },
    onError: (e: any) => toast.error("Gagal menyimpan: " + e.message),
  });

  /* ── Reset to template ───────────────────────────────────────────── */
  const resetMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("departure_itineraries")
        .update({ customized_days: null })
        .eq("id", itinerary.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departure-itinerary", departureId] });
      setDays([]);
      setIsDirty(false);
      toast.success("Reset ke template asli");
    },
    onError: (e: any) => toast.error("Gagal reset: " + e.message),
  });

  /* ── Copy template → departure (with date enrichment) ─────────────── */
  const handleCopyTemplate = useCallback(async () => {
    const templateDays = template?.days;
    if (!templateDays?.length) {
      toast.error("Template tidak memiliki data hari");
      return;
    }
    setIsCopying(true);
    try {
      const enriched = enrichDays(templateDays, departureDate);
      const { error } = await (supabase as any)
        .from("departure_itineraries")
        .update({ customized_days: enriched })
        .eq("id", itinerary.id);
      if (error) throw error;
      setDays(enriched);
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ["departure-itinerary", departureId] });
      toast.success(`${enriched.length} hari berhasil disalin dari template "${template?.name}"${departureDate ? " dengan tanggal otomatis" : ""}!`);
    } catch (e: any) {
      toast.error("Gagal menyalin template: " + e.message);
    } finally {
      setIsCopying(false);
    }
  }, [template, departureDate, itinerary.id, departureId, queryClient]);

  /* ── Day edit helpers ───────────────────────────────────────────── */
  const updateDayTitle = (dayNum: number, title: string) => {
    setDays(prev => prev.map(d => d.day === dayNum ? { ...d, title } : d));
    setIsDirty(true);
  };

  const updateActivity = (dayNum: number, idx: number, field: keyof Activity, val: string) => {
    setDays(prev => prev.map(d => {
      if (d.day !== dayNum) return d;
      const acts = [...d.activities];
      acts[idx] = { ...acts[idx], [field]: val };
      return { ...d, activities: acts };
    }));
    setIsDirty(true);
  };

  const addActivity = (dayNum: number) => {
    setDays(prev => prev.map(d =>
      d.day === dayNum
        ? { ...d, activities: [...d.activities, { time: "08:00", activity: "", location: "" }] }
        : d
    ));
    setIsDirty(true);
  };

  const deleteActivity = (dayNum: number, idx: number) => {
    setDays(prev => prev.map(d =>
      d.day === dayNum
        ? { ...d, activities: d.activities.filter((_, i) => i !== idx) }
        : d
    ));
    setIsDirty(true);
  };

  const isCopied = days.length > 0;

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">
      {/* Status bar + action buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border px-4 py-3 bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center gap-2.5">
          {isCopied ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
          )}
          <div>
            <p className="text-sm font-semibold">
              {isCopied ? "Itinerary departure sudah disalin & dapat diedit" : "Menggunakan template asli (read-only)"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Template: <strong>{template?.name || "—"}</strong> · {template?.duration_days || 0} hari
              {isCopied && departureDate && ` · Berangkat ${fmtDate(departureDate)}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {isCopied && isDirty && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => saveMutation.mutate(days)}
              disabled={saveMutation.isPending}
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {saveMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          )}
          {isCopied ? (
            <Button
              size="sm"
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => {
                if (confirm("Reset itinerary ke template asli? Semua edit akan hilang.")) {
                  resetMutation.mutate();
                }
              }}
              disabled={resetMutation.isPending}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reset ke Template
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleCopyTemplate}
              disabled={isCopying || !template?.days?.length}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              {isCopying ? "Menyalin..." : "Salin Template ke Departure"}
            </Button>
          )}
        </div>
      </div>

      {!template?.days?.length && !isCopied && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Template ini tidak memiliki data hari. Tambahkan hari terlebih dahulu di halaman Template Itinerary.
        </div>
      )}

      {/* Day cards */}
      {(() => {
        const displayDays: ItineraryDay[] = isCopied ? days : (template?.days ? enrichDays(template.days, departureDate) : []);
        if (!displayDays.length) return null;

        return (
          <div className="space-y-3">
            {displayDays.map((day) => {
              const isExpanded = expandedDay === day.day;
              const isEditing  = isCopied && editingDay === day.day;

              return (
                <Card key={day.day} className={cn(
                  "transition-all",
                  isEditing && "ring-2 ring-primary/40 shadow-sm"
                )}>
                  <CardHeader
                    className="py-3 px-4 cursor-pointer"
                    onClick={() => !isEditing && setExpandedDay(isExpanded ? null : day.day)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Badge variant="outline" className="shrink-0 font-bold">
                          Hari {day.day}
                        </Badge>
                        {isEditing ? (
                          <Input
                            value={day.title}
                            onChange={e => updateDayTitle(day.day, e.target.value)}
                            className="h-7 text-sm font-semibold"
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <span className="font-semibold text-sm truncate">{day.title || "—"}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {day.actual_date && (
                          <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            {fmtDate(day.actual_date)}
                          </span>
                        )}
                        {isCopied && (
                          <Button
                            size="sm"
                            variant={isEditing ? "default" : "ghost"}
                            className="h-7 px-2"
                            onClick={e => {
                              e.stopPropagation();
                              if (isEditing) {
                                setEditingDay(null);
                                setExpandedDay(null);
                                saveMutation.mutate(days);
                              } else {
                                setEditingDay(day.day);
                                setExpandedDay(day.day);
                              }
                            }}
                          >
                            {isEditing ? (
                              <><Save className="h-3.5 w-3.5 mr-1" /> Simpan</>
                            ) : (
                              <><Edit2 className="h-3.5 w-3.5 mr-1" /> Edit</>
                            )}
                          </Button>
                        )}
                        {!isEditing && (
                          <span className="text-muted-foreground">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </span>
                        )}
                      </div>
                    </div>
                    {day.actual_date && (
                      <p className="sm:hidden text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />{fmtDate(day.actual_date)}
                      </p>
                    )}
                  </CardHeader>

                  {(isExpanded || isEditing) && (
                    <CardContent className="pt-0 pb-4 px-4">
                      <div className="space-y-2">
                        {day.activities?.map((act, idx) => (
                          <div key={idx} className={cn(
                            "flex items-start gap-2 text-sm rounded-md px-2 py-1.5",
                            isEditing ? "bg-muted/40" : ""
                          )}>
                            {isEditing ? (
                              <>
                                <Input
                                  value={act.time}
                                  onChange={e => updateActivity(day.day, idx, "time", e.target.value)}
                                  className="h-7 w-20 text-xs font-mono shrink-0"
                                  placeholder="08:00"
                                />
                                <Textarea
                                  value={act.activity}
                                  onChange={e => updateActivity(day.day, idx, "activity", e.target.value)}
                                  className="h-16 text-xs flex-1 resize-none"
                                  placeholder="Aktivitas..."
                                />
                                <Input
                                  value={act.location || ""}
                                  onChange={e => updateActivity(day.day, idx, "location", e.target.value)}
                                  className="h-7 w-28 text-xs shrink-0"
                                  placeholder="Lokasi"
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                                  onClick={() => deleteActivity(day.day, idx)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Clock className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground font-mono w-12 shrink-0">{act.time || "--:--"}</span>
                                <span className="flex-1">{act.activity}</span>
                                {act.location && (
                                  <span className="text-muted-foreground flex items-center gap-0.5 text-xs shrink-0">
                                    <MapPin className="h-3 w-3" /> {act.location}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        ))}

                        {isEditing && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full border-dashed mt-2"
                            onClick={() => addActivity(day.day)}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> Tambah Aktivitas
                          </Button>
                        )}

                        {!isEditing && !day.activities?.length && (
                          <p className="text-xs text-muted-foreground py-2">Tidak ada aktivitas untuk hari ini.</p>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        );
      })()}

      {/* Save all button at bottom when dirty */}
      {isCopied && isDirty && (
        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => saveMutation.mutate(days)}
          disabled={saveMutation.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Menyimpan semua perubahan..." : "Simpan Semua Perubahan"}
        </Button>
      )}
    </div>
  );
}
