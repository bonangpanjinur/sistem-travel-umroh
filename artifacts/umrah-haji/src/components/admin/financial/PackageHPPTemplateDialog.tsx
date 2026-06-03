/**
 * PackageHPPTemplateDialog — DB-backed HPP template per package.
 *
 * Two tabs:
 *   "Terapkan"  — apply the package's saved template to the current departure
 *   "Simpan"    — overwrite the package template with this departure's items
 *
 * Unlike HPPTemplateDialog (localStorage), this persists to `package_hpp_templates`
 * and is scoped to a single package, so all departures of that package share it.
 */

import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Package2, Save, Copy, Loader2, ChevronDown, ChevronUp,
  CheckSquare, Square, AlertTriangle, FileText, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { usePackageHPPTemplate, type PackageHPPTemplateItem } from "@/hooks/usePackageHPPTemplate";

// ── Category metadata ──────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
  airline:        { label: "Tiket Pesawat",      icon: "✈️",  color: "bg-sky-100 text-sky-800" },
  hotel:          { label: "Hotel",              icon: "🏨",  color: "bg-blue-100 text-blue-800" },
  land_transport: { label: "Transportasi Darat", icon: "🚌",  color: "bg-orange-100 text-orange-800" },
  visa:           { label: "Visa & Dokumen",     icon: "🛂",  color: "bg-purple-100 text-purple-800" },
  handling:       { label: "Handling & Porter",  icon: "🧳",  color: "bg-yellow-100 text-yellow-800" },
  muthawif:       { label: "Muthawif / Guide",   icon: "👨‍💼", color: "bg-green-100 text-green-800" },
  equipment:      { label: "Perlengkapan",       icon: "📦",  color: "bg-amber-100 text-amber-800" },
  manasik:        { label: "Manasik",            icon: "🎓",  color: "bg-teal-100 text-teal-800" },
  insurance:      { label: "Asuransi",           icon: "🔒",  color: "bg-slate-100 text-slate-800" },
  document:       { label: "Dokumen",            icon: "📄",  color: "bg-neutral-100 text-neutral-800" },
  marketing:      { label: "Marketing",          icon: "📢",  color: "bg-pink-100 text-pink-800" },
  pic_fee:        { label: "Komisi PIC",         icon: "💼",  color: "bg-indigo-100 text-indigo-800" },
  overhead:       { label: "Overhead",           icon: "🏢",  color: "bg-gray-100 text-gray-800" },
  other:          { label: "Lainnya",            icon: "📝",  color: "bg-zinc-100 text-zinc-800" },
};

function fmtRp(n: number) {
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

function fmtDate(d: string) {
  try { return format(parseISO(d), "d MMM yyyy", { locale: idLocale }); } catch { return d; }
}

// ── TemplateItemRow ────────────────────────────────────────────────────────────

function TemplateItemRow({ item }: { item: PackageHPPTemplateItem }) {
  const meta = CATEGORY_META[item.category] || CATEGORY_META.other;
  return (
    <div className="px-4 py-2.5 flex items-start gap-3">
      <span className="text-sm mt-0.5">{meta.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.description}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[10px] text-muted-foreground">
          {item.location && <span className={cn("px-1.5 py-0.5 rounded-full font-medium text-[10px]", meta.color)}>{item.location}</span>}
          {item.nights && <span>{item.nights} malam</span>}
          {item.flight_route && <span className="font-mono">{item.flight_route}</span>}
          <span>
            {item.quantity}× {item.currency !== "IDR" ? item.currency : "Rp"}{" "}
            {Number(item.unit_cost).toLocaleString("id-ID")}
            {item.currency !== "IDR" && ` (kurs ${item.exchange_rate})`}
            {" · "}
            {item.unit === "per_pax" ? "per jamaah" : item.unit === "per_room" ? "per kamar" : item.unit === "per_night" ? "per malam" : item.unit === "fixed" ? "tetap" : item.unit}
          </span>
        </div>
        {item.notes && <p className="text-[10px] text-muted-foreground italic mt-0.5">{item.notes}</p>}
      </div>
      <p className="text-sm font-semibold shrink-0 mt-0.5">{fmtRp(item.total_cost_idr)}</p>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  packageId: string;
  packageName?: string;
  targetDepartureId: string;
  /** Current departure items — used for "Simpan sebagai Template Paket" */
  currentItems: any[];
  onApplied?: () => void;
}

// ── Main Dialog ────────────────────────────────────────────────────────────────

export function PackageHPPTemplateDialog({
  open,
  onOpenChange,
  packageId,
  packageName,
  targetDepartureId,
  currentItems,
  onApplied,
}: Props) {
  const {
    templateItems,
    hasTemplate,
    totalHPP,
    isLoading,
    saveTemplate,
    isSaving,
    applyTemplate,
    isApplying,
  } = usePackageHPPTemplate(open ? packageId : undefined);

  // ── Apply tab state ────────────────────────────────────────────────────────
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const allIds = useMemo(() => new Set(templateItems.map(i => i.id)), [templateItems]);
  const effectiveChecked = checkedIds.size === 0 ? allIds : checkedIds;

  const grouped = useMemo(() => {
    const g: Record<string, PackageHPPTemplateItem[]> = {};
    templateItems.forEach(item => {
      const cat = item.category || "other";
      if (!g[cat]) g[cat] = [];
      g[cat].push(item);
    });
    return g;
  }, [templateItems]);

  const toggleItem = (id: string) => {
    setCheckedIds(prev => {
      const next = new Set<string>(prev.size === 0 ? allIds : prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (effectiveChecked.size === allIds.size) setCheckedIds(new Set(["__none__"]));
    else setCheckedIds(new Set());
  };

  const toggleCat = (cat: string, catItems: PackageHPPTemplateItem[]) => {
    const catIds = catItems.map(i => i.id);
    const allCatChecked = catIds.every(id => effectiveChecked.has(id));
    setCheckedIds(prev => {
      const next = new Set<string>(prev.size === 0 ? allIds : prev);
      if (allCatChecked) catIds.forEach(id => next.delete(id));
      else catIds.forEach(id => next.add(id));
      return next;
    });
  };

  const toggleCatExpanded = (cat: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const selectedItems = templateItems.filter(
    i => effectiveChecked.has(i.id) && !effectiveChecked.has("__none__")
  );
  const selectedTotal = selectedItems.reduce((s, i) => s + i.total_cost_idr, 0);

  // ── Save tab state ─────────────────────────────────────────────────────────
  const [saveCheckedIdx, setSaveCheckedIdx] = useState<Set<string>>(new Set());
  const [confirmSave, setConfirmSave] = useState(false);

  const allCurrentIdx = useMemo(
    () => new Set(currentItems.map((_: any, i: number) => String(i))),
    [currentItems]
  );
  const effectiveSaveIdx = saveCheckedIdx.size === 0 ? allCurrentIdx : saveCheckedIdx;

  const toggleSaveItem = (idx: number) => {
    setSaveCheckedIdx(prev => {
      const next = new Set<string>(prev.size === 0 ? allCurrentIdx : prev);
      const key = String(idx);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleSaveAll = () => {
    if (effectiveSaveIdx.size === allCurrentIdx.size) setSaveCheckedIdx(new Set(["__none__"]));
    else setSaveCheckedIdx(new Set());
  };

  const itemsToSave = currentItems.filter(
    (_: any, i: number) => effectiveSaveIdx.has(String(i)) && !effectiveSaveIdx.has("__none__")
  );

  const currentGrouped: Record<string, { item: any; index: number }[]> = useMemo(() => {
    const g: Record<string, { item: any; index: number }[]> = {};
    currentItems.forEach((item: any, idx: number) => {
      const cat = item.category || "other";
      if (!g[cat]) g[cat] = [];
      g[cat].push({ item, index: idx });
    });
    return g;
  }, [currentItems]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleApply = async () => {
    if (selectedItems.length === 0) return;
    await applyTemplate({ templateItems: selectedItems, departureId: targetDepartureId, mode: importMode });
    onApplied?.();
    onOpenChange(false);
    reset();
  };

  const handleSave = async () => {
    setConfirmSave(false);
    await saveTemplate({ pkgId: packageId, sourceItems: itemsToSave });
    setSaveCheckedIdx(new Set());
  };

  const reset = () => {
    setCheckedIds(new Set());
    setImportMode("append");
    setSaveCheckedIdx(new Set());
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Package2 className="h-4 w-4 text-primary" />
              Template HPP Paket
              {packageName && (
                <Badge variant="secondary" className="text-xs font-normal">{packageName}</Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Template HPP disimpan di database dan digunakan bersama untuk semua keberangkatan paket ini.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue={hasTemplate ? "apply" : "save"} className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="mx-6 mt-3 mb-0 grid grid-cols-2 h-9 shrink-0">
              <TabsTrigger value="apply" className="text-xs gap-1.5">
                <Copy className="h-3.5 w-3.5" /> Terapkan ke Keberangkatan
                {hasTemplate && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-0.5">
                    {templateItems.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="save" className="text-xs gap-1.5">
                <Save className="h-3.5 w-3.5" /> Simpan sebagai Template
              </TabsTrigger>
            </TabsList>

            {/* ─── TAB: Terapkan ────────────────────────────────────────── */}
            <TabsContent value="apply" className="flex flex-col flex-1 overflow-hidden mt-0 px-6 pb-0">
              {isLoading ? (
                <div className="flex-1 flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !hasTemplate ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-3">
                  <FileText className="h-10 w-10 opacity-20" />
                  <div>
                    <p className="font-medium text-sm">Belum ada template HPP untuk paket ini</p>
                    <p className="text-xs mt-1">
                      Buka tab <strong>Simpan sebagai Template</strong> untuk membuat template dari item HPP keberangkatan ini.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Summary bar */}
                  <div className="mt-3 mb-2 flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                    <div className="text-xs text-muted-foreground">
                      Template paket · <strong className="text-foreground">{templateItems.length} item</strong>
                    </div>
                    <div className="text-xs font-semibold text-destructive">{fmtRp(totalHPP)}</div>
                  </div>

                  {/* Select-all bar */}
                  <div className="flex items-center justify-between py-1.5 shrink-0">
                    <button
                      onClick={toggleAll}
                      className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {effectiveChecked.has("__none__")
                        ? <Square className="h-4 w-4" />
                        : effectiveChecked.size === allIds.size
                          ? <CheckSquare className="h-4 w-4 text-primary" />
                          : <Square className="h-4 w-4" />
                      }
                      {effectiveChecked.size === allIds.size && !effectiveChecked.has("__none__")
                        ? "Batalkan semua"
                        : "Pilih semua"
                      }
                    </button>
                    {selectedItems.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        <strong className="text-foreground">{selectedItems.length}</strong> item · {fmtRp(selectedTotal)}
                      </span>
                    )}
                  </div>

                  {/* Item list grouped by category */}
                  <ScrollArea className="flex-1 max-h-[38vh]">
                    <div className="divide-y pb-1">
                      {Object.entries(grouped).map(([cat, catItems]) => {
                        const meta = CATEGORY_META[cat] || CATEGORY_META.other;
                        const catChecked = catItems.filter(i => effectiveChecked.has(i.id) && !effectiveChecked.has("__none__")).length;
                        const expanded = expandedCats.has(cat);
                        const catTotal = catItems.reduce((s, i) => s + i.total_cost_idr, 0);

                        return (
                          <div key={cat}>
                            {/* Category row */}
                            <div
                              className="px-4 py-2 bg-muted/30 flex items-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => toggleCat(cat, catItems)}
                            >
                              <Checkbox
                                checked={catChecked === catItems.length && catItems.length > 0}
                                className="h-3.5 w-3.5 shrink-0"
                                onCheckedChange={() => {}}
                              />
                              <span className="text-sm">{meta.icon}</span>
                              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex-1">
                                {meta.label}
                              </span>
                              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                {catChecked}/{catItems.length}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{fmtRp(catTotal)}</span>
                              <button
                                onClick={e => { e.stopPropagation(); toggleCatExpanded(cat); }}
                                className="p-0.5 rounded hover:bg-muted/60 text-muted-foreground ml-1"
                              >
                                {expanded
                                  ? <ChevronUp className="h-3.5 w-3.5" />
                                  : <ChevronDown className="h-3.5 w-3.5" />
                                }
                              </button>
                            </div>

                            {/* Items (shown when expanded) */}
                            {expanded && catItems.map(item => {
                              const checked = effectiveChecked.has(item.id) && !effectiveChecked.has("__none__");
                              return (
                                <div
                                  key={item.id}
                                  onClick={() => toggleItem(item.id)}
                                  className={cn(
                                    "flex items-start gap-3 cursor-pointer hover:bg-muted/20 transition-colors border-t border-muted/50",
                                    !checked && "opacity-50"
                                  )}
                                >
                                  <div className="pl-4 pt-3 pb-3 shrink-0">
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={() => toggleItem(item.id)}
                                      className="h-3.5 w-3.5"
                                      onClick={e => e.stopPropagation()}
                                    />
                                  </div>
                                  <div className="flex-1 pr-4">
                                    <TemplateItemRow item={item} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>

                  {/* Footer */}
                  <div className="border-t pt-3 pb-4 mt-2 shrink-0 space-y-3">
                    <RadioGroup
                      value={importMode}
                      onValueChange={(v: "append" | "replace") => setImportMode(v)}
                      className="flex flex-col gap-1"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="append" id="pkg-tpl-append" />
                        <Label htmlFor="pkg-tpl-append" className="text-xs cursor-pointer">
                          <span className="font-medium">Tambahkan</span>{" "}
                          <span className="text-muted-foreground">— pertahankan item HPP yang ada</span>
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="replace" id="pkg-tpl-replace" />
                        <Label htmlFor="pkg-tpl-replace" className="text-xs cursor-pointer">
                          <span className="font-medium text-destructive">Ganti semua</span>{" "}
                          <span className="text-muted-foreground">— hapus item yang ada, lalu terapkan template</span>
                        </Label>
                      </div>
                    </RadioGroup>

                    <div className="flex justify-between items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => { onOpenChange(false); reset(); }}>
                        Batal
                      </Button>
                      <Button
                        size="sm"
                        disabled={selectedItems.length === 0 || isApplying}
                        onClick={handleApply}
                        className="min-w-[180px]"
                      >
                        {isApplying
                          ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Menerapkan...</>
                          : <><Check className="h-4 w-4 mr-2" />Terapkan {selectedItems.length} Item</>
                        }
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* ─── TAB: Simpan ──────────────────────────────────────────── */}
            <TabsContent value="save" className="flex flex-col flex-1 overflow-hidden mt-0 px-6 pb-4">
              {currentItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-3">
                  <Save className="h-10 w-10 opacity-20" />
                  <div>
                    <p className="font-medium text-sm">Belum ada item HPP di keberangkatan ini</p>
                    <p className="text-xs mt-1">Tambahkan item HPP terlebih dahulu sebelum menyimpan sebagai template.</p>
                  </div>
                </div>
              ) : (
                <>
                  {hasTemplate && (
                    <div className="mt-3 mb-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      <p className="text-xs text-amber-800 dark:text-amber-200">
                        Paket ini sudah memiliki template (<strong>{templateItems.length} item</strong>).
                        Menyimpan baru akan <strong>mengganti</strong> template yang ada.
                      </p>
                    </div>
                  )}

                  {/* Select-all */}
                  <div className="flex items-center justify-between mt-2 mb-1 shrink-0">
                    <button
                      onClick={toggleSaveAll}
                      className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {effectiveSaveIdx.size === allCurrentIdx.size && !effectiveSaveIdx.has("__none__")
                        ? <CheckSquare className="h-4 w-4 text-primary" />
                        : <Square className="h-4 w-4" />
                      }
                      {effectiveSaveIdx.size === allCurrentIdx.size && !effectiveSaveIdx.has("__none__")
                        ? "Batalkan semua" : "Pilih semua"
                      }
                    </button>
                    <span className="text-xs text-muted-foreground">
                      <strong className="text-foreground">{itemsToSave.length}</strong> item dipilih
                    </span>
                  </div>

                  {/* Current items grouped */}
                  <ScrollArea className="flex-1 max-h-[40vh]">
                    <div className="divide-y pb-1">
                      {Object.entries(currentGrouped).map(([cat, entries]) => {
                        const meta = CATEGORY_META[cat] || CATEGORY_META.other;
                        const catChecked = entries.filter(({ index }) =>
                          effectiveSaveIdx.has(String(index)) && !effectiveSaveIdx.has("__none__")
                        ).length;

                        return (
                          <div key={cat}>
                            <div className="px-4 py-1.5 bg-muted/30 flex items-center gap-2">
                              <span className="text-sm">{meta.icon}</span>
                              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex-1">
                                {meta.label}
                              </span>
                              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                {catChecked}/{entries.length}
                              </Badge>
                            </div>

                            {entries.map(({ item, index }) => {
                              const checked = effectiveSaveIdx.has(String(index)) && !effectiveSaveIdx.has("__none__");
                              return (
                                <div
                                  key={index}
                                  onClick={() => toggleSaveItem(index)}
                                  className={cn(
                                    "px-4 py-2.5 flex items-start gap-3 cursor-pointer hover:bg-muted/20 transition-colors border-t border-muted/30",
                                    !checked && "opacity-50"
                                  )}
                                >
                                  <Checkbox
                                    checked={checked}
                                    className="h-3.5 w-3.5 mt-0.5 shrink-0"
                                    onCheckedChange={() => toggleSaveItem(index)}
                                    onClick={e => e.stopPropagation()}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{item.description}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                      {item.quantity}× {item.currency !== "IDR" ? item.currency : "Rp"}{" "}
                                      {Number(item.unit_cost).toLocaleString("id-ID")}
                                      {item.currency !== "IDR" && ` (${item.exchange_rate})`}
                                      {" · "}
                                      {item.unit === "per_pax" ? "per jamaah" : item.unit === "per_room" ? "per kamar" : item.unit === "fixed" ? "tetap" : item.unit}
                                    </p>
                                  </div>
                                  <p className="text-sm font-semibold shrink-0">
                                    {fmtRp(item.total_cost_idr || 0)}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>

                  <div className="border-t pt-3 mt-2 flex justify-between items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                      Batal
                    </Button>
                    <Button
                      size="sm"
                      disabled={itemsToSave.length === 0 || isSaving}
                      onClick={() => setConfirmSave(true)}
                      className="min-w-[200px]"
                    >
                      {isSaving
                        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Menyimpan...</>
                        : <><Save className="h-4 w-4 mr-2" />Simpan {itemsToSave.length} Item sebagai Template</>
                      }
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Confirm overwrite */}
      <AlertDialog open={confirmSave} onOpenChange={setConfirmSave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {hasTemplate ? "Ganti Template Paket?" : "Simpan Template Paket?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {hasTemplate
                ? `Template HPP paket "${packageName || ""}" yang ada (${templateItems.length} item) akan diganti dengan ${itemsToSave.length} item dari keberangkatan ini.`
                : `${itemsToSave.length} item HPP akan disimpan sebagai template paket "${packageName || ""}". Template ini dapat diterapkan ke keberangkatan lain.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleSave}>
              {hasTemplate ? "Ganti Template" : "Simpan Template"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
