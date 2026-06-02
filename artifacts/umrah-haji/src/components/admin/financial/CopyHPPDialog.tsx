/**
 * CopyHPPDialog — Bulk-import HPP items from another departure.
 *
 * Flow:
 *   1. Search & select a source departure (shows item count + total)
 *   2. Preview all items with category grouping + individual checkboxes
 *   3. Choose import mode: append vs. replace-all
 *   4. One-click import → inserts rows into departure_cost_items
 *
 * Strips date-specific fields (check_in_date, check_out_date) on copy
 * so they don't carry over stale hotel dates.
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Search, Copy, CheckSquare, Square, AlertTriangle, Loader2,
  CalendarDays, Users, Package, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";

// ─── Category display meta (mirrors DepartureCostItemsCard) ──────────────────
const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
  airline:        { label: "Tiket Pesawat",      icon: "✈️", color: "bg-sky-100 text-sky-800" },
  hotel:          { label: "Hotel",              icon: "🏨", color: "bg-blue-100 text-blue-800" },
  land_transport: { label: "Transportasi Darat", icon: "🚌", color: "bg-orange-100 text-orange-800" },
  visa:           { label: "Visa & Dokumen",     icon: "🛂", color: "bg-purple-100 text-purple-800" },
  handling:       { label: "Handling & Porter",  icon: "🧳", color: "bg-yellow-100 text-yellow-800" },
  muthawif:       { label: "Muthawif / Guide",   icon: "👨‍💼", color: "bg-green-100 text-green-800" },
  equipment:      { label: "Perlengkapan",       icon: "📦", color: "bg-amber-100 text-amber-800" },
  manasik:        { label: "Manasik",            icon: "🎓", color: "bg-teal-100 text-teal-800" },
  insurance:      { label: "Asuransi",           icon: "🔒", color: "bg-slate-100 text-slate-800" },
  document:       { label: "Dokumen",            icon: "📄", color: "bg-neutral-100 text-neutral-800" },
  marketing:      { label: "Marketing",          icon: "📢", color: "bg-pink-100 text-pink-800" },
  pic_fee:        { label: "Komisi PIC",         icon: "💼", color: "bg-indigo-100 text-indigo-800" },
  overhead:       { label: "Overhead",           icon: "🏢", color: "bg-gray-100 text-gray-800" },
  other:          { label: "Lainnya",            icon: "📝", color: "bg-zinc-100 text-zinc-800" },
};

function fmtRp(n: number) {
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}
function fmtDate(d?: string | null) {
  if (!d) return null;
  try { return format(parseISO(d), "d MMM yyyy", { locale: idLocale }); } catch { return d; }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Target departure (we copy INTO this) */
  targetDepartureId: string;
  targetDepartureLabel?: string;
}

// ─── Step 1: departure picker item ────────────────────────────────────────────

interface DepartureOption {
  id: string;
  label: string;
  package_name: string;
  departure_date: string | null;
  pax_count: number | null;
  item_count: number;
  total_hpp: number;
}

// ─── Main component ────────────────────────────────────────────────────────────

export function CopyHPPDialog({ open, onOpenChange, targetDepartureId, targetDepartureLabel }: Props) {
  const queryClient = useQueryClient();

  // Step: "pick" | "preview"
  const [step, setStep] = useState<"pick" | "preview">("pick");
  const [search, setSearch] = useState("");
  const [selectedDeparture, setSelectedDeparture] = useState<DepartureOption | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [importMode, setImportMode] = useState<"append" | "replace">("append");

  // ── Step 1: load all OTHER departures with their item summary ──────────────
  const { data: departures = [], isLoading: depsLoading } = useQuery({
    queryKey: ["departures-with-hpp-summary", targetDepartureId],
    queryFn: async () => {
      const db = supabase as any;

      // Fetch departures (excluding self)
      const { data: deps, error: dErr } = await db
        .from("departures")
        .select(`
          id, departure_date, pax_count,
          package:packages(name)
        `)
        .neq("id", targetDepartureId)
        .order("departure_date", { ascending: false })
        .limit(100);
      if (dErr) throw dErr;

      // Fetch cost item counts & totals grouped by departure
      const { data: items, error: iErr } = await db
        .from("departure_cost_items")
        .select("departure_id, total_cost_idr");
      if (iErr && iErr.code !== "42P01") throw iErr;

      // Aggregate
      const agg: Record<string, { count: number; total: number }> = {};
      for (const item of (items || [])) {
        if (!agg[item.departure_id]) agg[item.departure_id] = { count: 0, total: 0 };
        agg[item.departure_id].count++;
        agg[item.departure_id].total += Number(item.total_cost_idr) || 0;
      }

      return (deps || []).map((d: any): DepartureOption => ({
        id: d.id,
        label: d.package?.name
          ? `${d.package.name}${d.departure_date ? ` — ${fmtDate(d.departure_date)}` : ""}`
          : d.id,
        package_name: d.package?.name || "Paket Tidak Diketahui",
        departure_date: d.departure_date,
        pax_count: d.pax_count,
        item_count: agg[d.id]?.count ?? 0,
        total_hpp: agg[d.id]?.total ?? 0,
      }));
    },
    enabled: open,
    staleTime: 1000 * 60 * 5,
  });

  // ── Step 2: load cost items from selected departure ────────────────────────
  const { data: sourceItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["departure-cost-items", selectedDeparture?.id],
    queryFn: async () => {
      if (!selectedDeparture) return [];
      const db = supabase as any;
      const { data, error } = await db
        .from("departure_cost_items")
        .select("*")
        .eq("departure_id", selectedDeparture.id)
        .order("category")
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedDeparture,
  });

  // Auto-check all items when step changes to preview
  const handleSelectDeparture = (dep: DepartureOption) => {
    if (dep.item_count === 0) {
      toast.info("Keberangkatan ini belum memiliki item HPP");
      return;
    }
    setSelectedDeparture(dep);
    setStep("preview");
  };

  // When items load, check all by default
  const allIds = useMemo(() => new Set(sourceItems.map((i: any) => i.id)), [sourceItems]);

  // Init checkedIds when source items arrive
  useState(() => {
    if (step === "preview" && sourceItems.length > 0 && checkedIds.size === 0) {
      setCheckedIds(new Set(sourceItems.map((i: any) => i.id)));
    }
  });

  // Keep checkedIds in sync when sourceItems changes
  const normalizedCheckedIds = useMemo(() => {
    if (itemsLoading || sourceItems.length === 0) return new Set<string>();
    // If checkedIds is empty (just switched dep), check everything
    if (checkedIds.size === 0) return allIds;
    return checkedIds;
  }, [sourceItems, checkedIds, allIds, itemsLoading]);

  const toggleItem = (id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev.size === 0 ? allIds : prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const effective = normalizedCheckedIds;
    if (effective.size === allIds.size) {
      setCheckedIds(new Set()); // uncheck all → deselect all visually
    } else {
      setCheckedIds(new Set(allIds));
    }
  };

  // Grouped items for preview
  const grouped: Record<string, any[]> = useMemo(() => {
    const g: Record<string, any[]> = {};
    sourceItems.forEach((item: any) => {
      const cat = item.category || "other";
      if (!g[cat]) g[cat] = [];
      g[cat].push(item);
    });
    return g;
  }, [sourceItems]);

  const selectedCount = normalizedCheckedIds.size;
  const selectedTotal = sourceItems
    .filter((i: any) => normalizedCheckedIds.has(i.id))
    .reduce((s: number, i: any) => s + (i.total_cost_idr || 0), 0);

  // ── Import mutation ────────────────────────────────────────────────────────
  const importMutation = useMutation({
    mutationFn: async () => {
      const db = supabase as any;
      const toInsert = sourceItems.filter((i: any) => normalizedCheckedIds.has(i.id));

      if (toInsert.length === 0) throw new Error("Tidak ada item yang dipilih");

      // Replace mode: delete existing first
      if (importMode === "replace") {
        const { error } = await db
          .from("departure_cost_items")
          .delete()
          .eq("departure_id", targetDepartureId);
        if (error) throw error;
      }

      // Build insert payload — strip id, departure_id, total_cost_idr, dates
      const payload = toInsert.map(({ id: _id, departure_id: _dep, total_cost_idr: _tc, check_in_date: _ci, check_out_date: _co, ...rest }: any) => ({
        ...rest,
        departure_id: targetDepartureId,
        // Nullify check-in/check-out dates — they are departure-specific
        check_in_date: null,
        check_out_date: null,
      }));

      const { error } = await db.from("departure_cost_items").insert(payload);
      if (error) throw error;

      return toInsert.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} item HPP berhasil diimpor ke keberangkatan ini`);
      queryClient.invalidateQueries({ queryKey: ["departure-cost-items", targetDepartureId] });
      queryClient.invalidateQueries({ queryKey: ["departure-financial-summary", targetDepartureId] });
      onOpenChange(false);
      resetState();
    },
    onError: (e: any) => toast.error("Gagal impor: " + (e.message || "Unknown error")),
  });

  const resetState = () => {
    setStep("pick");
    setSearch("");
    setSelectedDeparture(null);
    setCheckedIds(new Set());
    setImportMode("append");
  };

  const filteredDeps = useMemo(() => {
    if (!search.trim()) return departures;
    const q = search.toLowerCase();
    return departures.filter(d =>
      d.label.toLowerCase().includes(q) ||
      d.package_name.toLowerCase().includes(q) ||
      (d.departure_date && fmtDate(d.departure_date)?.toLowerCase().includes(q))
    );
  }, [departures, search]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetState(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Copy className="h-4 w-4 text-primary" />
            Salin HPP dari Keberangkatan Lain
          </DialogTitle>
          <DialogDescription className="text-xs">
            {step === "pick"
              ? "Pilih keberangkatan sumber untuk menyalin item HPP-nya."
              : `Pilih item yang ingin disalin ke ${targetDepartureLabel || "keberangkatan ini"}.`
            }
          </DialogDescription>

          {/* Breadcrumb stepper */}
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span className={cn("font-semibold", step === "pick" ? "text-primary" : "")}>
              1 · Pilih Sumber
            </span>
            <ChevronRight className="h-3 w-3" />
            <span className={cn("font-semibold", step === "preview" ? "text-primary" : "")}>
              2 · Preview & Impor
            </span>
          </div>
        </DialogHeader>

        {/* ── STEP 1: departure picker ── */}
        {step === "pick" && (
          <div className="flex flex-col flex-1 overflow-hidden px-6 py-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari paket atau tanggal keberangkatan..."
                className="pl-9 h-9 text-sm"
                autoFocus
              />
            </div>

            <ScrollArea className="flex-1 max-h-[52vh]">
              {depsLoading ? (
                <div className="space-y-2 py-1">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : filteredDeps.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>{search ? "Keberangkatan tidak ditemukan" : "Tidak ada keberangkatan lain"}</p>
                </div>
              ) : (
                <div className="space-y-1.5 pb-2">
                  {filteredDeps.map(dep => (
                    <button
                      key={dep.id}
                      onClick={() => handleSelectDeparture(dep)}
                      className={cn(
                        "w-full text-left rounded-lg border px-4 py-3 transition-all hover:border-primary/50 hover:bg-primary/5 group",
                        dep.item_count === 0
                          ? "opacity-50 cursor-not-allowed"
                          : "cursor-pointer"
                      )}
                      disabled={dep.item_count === 0}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{dep.package_name}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {dep.departure_date && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <CalendarDays className="h-3 w-3" />
                                {fmtDate(dep.departure_date)}
                              </span>
                            )}
                            {dep.pax_count != null && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Users className="h-3 w-3" />
                                {dep.pax_count} pax
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {dep.item_count > 0 ? (
                            <>
                              <Badge variant="secondary" className="text-[10px]">
                                {dep.item_count} item HPP
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {fmtRp(dep.total_hpp)}
                              </p>
                            </>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Kosong
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* ── STEP 2: item preview & options ── */}
        {step === "preview" && selectedDeparture && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Source info bar */}
            <div className="px-6 py-2.5 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-800 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-blue-800 dark:text-blue-200 truncate">
                  Sumber: {selectedDeparture.package_name}
                </p>
                {selectedDeparture.departure_date && (
                  <p className="text-[11px] text-blue-600 dark:text-blue-400">
                    {fmtDate(selectedDeparture.departure_date)}
                  </p>
                )}
              </div>
              <button
                onClick={() => { setStep("pick"); setCheckedIds(new Set()); }}
                className="text-[11px] text-blue-600 hover:underline shrink-0"
              >
                Ganti sumber
              </button>
            </div>

            {/* Select-all bar */}
            <div className="px-6 py-2 border-b flex items-center justify-between gap-3">
              <button
                onClick={toggleAll}
                className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {normalizedCheckedIds.size === allIds.size
                  ? <CheckSquare className="h-4 w-4 text-primary" />
                  : <Square className="h-4 w-4" />
                }
                {normalizedCheckedIds.size === allIds.size ? "Batalkan semua" : "Pilih semua"}
              </button>
              {selectedCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  <strong className="text-foreground">{selectedCount}</strong> item · {fmtRp(selectedTotal)}
                </span>
              )}
            </div>

            {/* Items list */}
            <ScrollArea className="flex-1 max-h-[38vh]">
              {itemsLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <div className="divide-y">
                  {Object.entries(grouped).map(([cat, catItems]) => {
                    const meta = CATEGORY_META[cat] || CATEGORY_META.other;
                    const catChecked = catItems.filter(i => normalizedCheckedIds.has(i.id)).length;
                    return (
                      <div key={cat}>
                        {/* Category row */}
                        <div
                          className="px-4 py-1.5 bg-muted/30 flex items-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            // Toggle all in category
                            const catIds = catItems.map(i => i.id);
                            const allCatChecked = catIds.every(id => normalizedCheckedIds.has(id));
                            setCheckedIds(prev => {
                              const next = new Set(prev.size === 0 ? allIds : prev);
                              if (allCatChecked) catIds.forEach(id => next.delete(id));
                              else catIds.forEach(id => next.add(id));
                              return next;
                            });
                          }}
                        >
                          <Checkbox
                            checked={catChecked === catItems.length}
                            className="h-3.5 w-3.5"
                            onCheckedChange={() => {}}
                          />
                          <span className="text-sm">{meta.icon}</span>
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {meta.label}
                          </span>
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-0.5">
                            {catChecked}/{catItems.length}
                          </Badge>
                        </div>

                        {/* Items */}
                        {catItems.map((item: any) => {
                          const checked = normalizedCheckedIds.has(item.id);
                          return (
                            <div
                              key={item.id}
                              onClick={() => toggleItem(item.id)}
                              className={cn(
                                "px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-muted/20 transition-colors",
                                checked ? "" : "opacity-50"
                              )}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggleItem(item.id)}
                                className="h-3.5 w-3.5 flex-shrink-0"
                                onClick={e => e.stopPropagation()}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.description}</p>
                                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                  {item.location && (
                                    <Badge className={cn("text-[9px] px-1 py-0", meta.color)}>
                                      {item.location}
                                    </Badge>
                                  )}
                                  {item.nights && (
                                    <span className="text-[10px] text-muted-foreground">{item.nights} malam</span>
                                  )}
                                  {item.flight_route && (
                                    <span className="text-[10px] font-mono text-muted-foreground">{item.flight_route}</span>
                                  )}
                                  <span className="text-[10px] text-muted-foreground">
                                    {item.quantity}×{item.currency !== "IDR" ? ` ${item.currency}` : " Rp"}{Number(item.unit_cost).toLocaleString("id-ID")}
                                    {item.currency !== "IDR" && ` (${item.exchange_rate})`}
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm font-semibold text-right shrink-0">
                                {fmtRp(item.total_cost_idr || 0)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Note about hotel dates */}
            {sourceItems.some((i: any) => i.category === "hotel" && (i.check_in_date || i.check_out_date)) && (
              <div className="mx-6 mt-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 px-3 py-2 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <p>
                  Tanggal check-in & check-out hotel <strong>tidak</strong> disalin — perlu diisi ulang setelah impor sesuai jadwal keberangkatan baru.
                </p>
              </div>
            )}

            {/* Import mode */}
            <div className="px-6 py-3 border-t bg-muted/20">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Mode Impor</p>
              <RadioGroup
                value={importMode}
                onValueChange={(v: "append" | "replace") => setImportMode(v)}
                className="flex flex-col gap-1.5"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="append" id="mode-append" />
                  <Label htmlFor="mode-append" className="text-sm cursor-pointer">
                    <span className="font-medium">Tambahkan</span>{" "}
                    <span className="text-muted-foreground">— pertahankan item HPP yang sudah ada, tambahkan item baru</span>
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="replace" id="mode-replace" />
                  <Label htmlFor="mode-replace" className="text-sm cursor-pointer">
                    <span className="font-medium text-destructive">Ganti semua</span>{" "}
                    <span className="text-muted-foreground">— hapus semua item HPP yang ada, lalu impor pilihan ini</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t flex items-center justify-between gap-3">
              <Button variant="outline" size="sm" onClick={() => { onOpenChange(false); resetState(); }}>
                Batal
              </Button>
              <Button
                size="sm"
                onClick={() => importMutation.mutate()}
                disabled={selectedCount === 0 || importMutation.isPending}
                className="min-w-[140px]"
              >
                {importMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Mengimpor...</>
                ) : (
                  <><Copy className="h-4 w-4 mr-2" />Impor {selectedCount} Item HPP</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
