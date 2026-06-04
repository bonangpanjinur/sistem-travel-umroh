/**
 * HPPTemplateDialog — HPP Template Library
 *
 * Three tabs:
 *   "Terapkan"  — browse saved templates → apply to current departure
 *   "Simpan"    — save current departure's items as a new named template
 *   "Kelola"    — rename / delete saved templates
 *
 * Storage: localStorage via useHPPTemplates hook (works offline / demo mode).
 */

import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  BookMarked, Save, Settings2, Trash2, Pencil, Check, X,
  Package, Loader2, Copy, ChevronDown, ChevronUp, AlertTriangle,
  Star, CheckSquare, Square,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useHPPTemplates, HPPTemplate, HPPTemplateTag } from "@/hooks/useHPPTemplates";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

const TAGS: { value: HPPTemplateTag; label: string; color: string }[] = [
  { value: "umroh",   label: "Umroh",   color: "bg-emerald-100 text-emerald-800" },
  { value: "haji",    label: "Haji",    color: "bg-amber-100 text-amber-800" },
  { value: "reguler", label: "Reguler", color: "bg-blue-100 text-blue-800" },
  { value: "plus",    label: "Plus",    color: "bg-purple-100 text-purple-800" },
  { value: "vip",     label: "VIP",     color: "bg-yellow-100 text-yellow-800" },
  { value: "custom",  label: "Custom",  color: "bg-gray-100 text-gray-800" },
];

function fmtRp(n: number) {
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}
function fmtDate(d: string) {
  try { return format(parseISO(d), "d MMM yyyy", { locale: idLocale }); } catch { return d; }
}
function tagMeta(tag?: HPPTemplateTag) {
  return TAGS.find(t => t.value === tag);
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  targetDepartureId: string;
  /** Items currently on this departure — used for "Simpan sebagai Template" */
  currentItems: any[];
}

// ── TemplateCard — single template row in "Terapkan" tab ─────────────────────

function TemplateCard({
  template,
  onApply,
  selected,
}: {
  template: HPPTemplate;
  onApply: (t: HPPTemplate) => void;
  selected: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const grouped: Record<string, number> = {};
  template.items.forEach(i => {
    grouped[i.category] = (grouped[i.category] || 0) + 1;
  });

  const tm = tagMeta(template.tag);

  return (
    <div
      className={cn(
        "rounded-lg border transition-all",
        selected ? "border-primary/60 bg-primary/5 ring-1 ring-primary/30" : "hover:border-primary/30"
      )}
    >
      <div
        className="px-4 py-3 flex items-start gap-3 cursor-pointer"
        onClick={() => onApply(template)}
      >
        <div className="mt-0.5 flex-shrink-0">
          <BookMarked className={cn("h-4 w-4", selected ? "text-primary" : "text-muted-foreground")} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">{template.name}</p>
            {tm && (
              <Badge className={cn("text-[10px] px-1.5 py-0", tm.color)}>{tm.label}</Badge>
            )}
          </div>
          {template.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{template.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground">{template.item_count} item</span>
            <span className="text-xs font-semibold text-destructive">{fmtRp(template.total_hpp)}</span>
            <span className="text-[10px] text-muted-foreground">
              Dibuat {fmtDate(template.created_at)}
            </span>
          </div>
          {/* Category chips */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Object.entries(grouped).map(([cat, cnt]) => {
              const m = CATEGORY_META[cat] || CATEGORY_META.other;
              return (
                <span key={cat} className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", m.color)}>
                  {m.icon} {m.label} ({cnt})
                </span>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {selected && <Check className="h-4 w-4 text-primary" />}
          <button
            onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
            className="p-1 rounded hover:bg-muted/50 text-muted-foreground"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded item list */}
      {expanded && (
        <div className="border-t divide-y bg-muted/20">
          {template.items.map((item, idx) => {
            const m = CATEGORY_META[item.category] || CATEGORY_META.other;
            return (
              <div key={idx} className="px-4 py-2 flex items-center gap-3">
                <span className="text-sm">{m.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{item.description}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.quantity}× {item.currency !== "IDR" ? item.currency : "Rp"}{" "}
                    {Number(item.unit_cost).toLocaleString("id-ID")}
                    {item.currency !== "IDR" && ` (kurs ${item.exchange_rate})`}
                    {" · "}
                    {item.unit === "per_pax" ? "per jamaah" : item.unit === "per_room" ? "per kamar" : item.unit}
                  </p>
                </div>
                <p className="text-xs font-semibold shrink-0">{fmtRp(item.total_cost_idr || 0)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Dialog ───────────────────────────────────────────────────────────────

export function HPPTemplateDialog({ open, onOpenChange, targetDepartureId, currentItems }: Props) {
  const queryClient = useQueryClient();
  const { templates, saveTemplate, updateTemplate, deleteTemplate, buildInsertPayload } = useHPPTemplates();

  // ── Terapkan tab state ──────────────────────────────────────────────────────
  const [selectedTemplate, setSelectedTemplate] = useState<HPPTemplate | null>(null);
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [searchTpl, setSearchTpl] = useState("");
  const [filterTag, setFilterTag] = useState<string>("all");

  // ── Simpan tab state ────────────────────────────────────────────────────────
  const [saveName, setSaveName] = useState("");
  const [saveDesc, setSaveDesc] = useState("");
  const [saveTag, setSaveTag] = useState<HPPTemplateTag | "">("");
  const [checkedSaveIds, setCheckedSaveIds] = useState<Set<string>>(() =>
    new Set() // will be auto-filled to all on first render
  );
  const [isSaving, setIsSaving] = useState(false);

  // All item ids for current departure — use index as key since no id guaranteed
  const allCurrentIndexes = useMemo(() => new Set(currentItems.map((_: any, i: number) => String(i))), [currentItems]);
  const effectiveSaveIds = checkedSaveIds.size === 0 ? allCurrentIndexes : checkedSaveIds;

  // ── Kelola tab state ────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editTag, setEditTag] = useState<HPPTemplateTag | "">("");
  const [deleteConfirm, setDeleteConfirm] = useState<HPPTemplate | null>(null);

  // ── Apply mutation ──────────────────────────────────────────────────────────
  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) throw new Error("Pilih template terlebih dahulu");
      const db = supabase as any;

      if (importMode === "replace") {
        const { error } = await db
          .from("departure_cost_items")
          .delete()
          .eq("departure_id", targetDepartureId);
        if (error) throw error;
      }

      const payload = buildInsertPayload(selectedTemplate, targetDepartureId);
      const { error } = await db.from("departure_cost_items").insert(payload);
      if (error) throw error;
      return payload.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} item HPP dari template "${selectedTemplate?.name}" berhasil diterapkan`);
      queryClient.invalidateQueries({ queryKey: ["departure-cost-items", targetDepartureId] });
      queryClient.invalidateQueries({ queryKey: ["departure-financial-summary", targetDepartureId] });
      onOpenChange(false);
      reset();
    },
    onError: (e: any) => toast.error("Gagal menerapkan template: " + (e.message || "Unknown error")),
  });

  const reset = () => {
    setSelectedTemplate(null);
    setSearchTpl("");
    setFilterTag("all");
    setImportMode("append");
    setSaveName("");
    setSaveDesc("");
    setSaveTag("");
    setCheckedSaveIds(new Set());
    setEditingId(null);
  };

  // ── Save current items as template ─────────────────────────────────────────
  const handleSave = () => {
    if (!saveName.trim()) { toast.error("Nama template harus diisi"); return; }
    const selected = currentItems.filter((_: any, i: number) => effectiveSaveIds.has(String(i)));
    if (selected.length === 0) { toast.error("Pilih minimal 1 item HPP"); return; }
    setIsSaving(true);
    try {
      saveTemplate(saveName, selected, {
        description: saveDesc || undefined,
        tag: saveTag || undefined,
      });
      toast.success(`Template "${saveName}" disimpan dengan ${selected.length} item`);
      setSaveName(""); setSaveDesc(""); setSaveTag(""); setCheckedSaveIds(new Set());
    } finally {
      setIsSaving(false);
    }
  };

  // ── Filtered templates ──────────────────────────────────────────────────────
  const filteredTemplates = useMemo(() => {
    let list = templates;
    if (filterTag !== "all") list = list.filter(t => t.tag === filterTag);
    if (searchTpl.trim()) {
      const q = searchTpl.toLowerCase();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [templates, filterTag, searchTpl]);

  // ── Current items grouped (for Simpan tab) ─────────────────────────────────
  const currentGrouped: Record<string, { item: any; index: number }[]> = useMemo(() => {
    const g: Record<string, { item: any; index: number }[]> = {};
    currentItems.forEach((item: any, idx: number) => {
      const cat = item.category || "other";
      if (!g[cat]) g[cat] = [];
      g[cat].push({ item, index: idx });
    });
    return g;
  }, [currentItems]);

  const toggleSaveItem = (idx: number) => {
    setCheckedSaveIds(prev => {
      const effective = prev.size === 0 ? new Set(allCurrentIndexes) : new Set(prev);
      const key = String(idx);
      effective.has(key) ? effective.delete(key) : effective.add(key);
      return effective;
    });
  };

  const toggleSaveAll = () => {
    if (effectiveSaveIds.size === allCurrentIndexes.size) {
      setCheckedSaveIds(new Set(["__none__"])); // force empty selection
    } else {
      setCheckedSaveIds(new Set()); // triggers effectiveSaveIds → allCurrentIndexes
    }
  };

  const saveSelectedCount = effectiveSaveIds.has("__none__") ? 0 : effectiveSaveIds.size;
  const saveSelectedTotal = currentItems
    .filter((_: any, i: number) => effectiveSaveIds.has(String(i)) && !effectiveSaveIds.has("__none__"))
    .reduce((s: number, i: any) => s + (i.total_cost_idr || 0), 0);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b">
            <DialogTitle className="flex items-center gap-2 text-base">
              <BookMarked className="h-4 w-4 text-primary" />
              Template HPP
            </DialogTitle>
            <DialogDescription className="text-xs">
              Terapkan template yang tersimpan, simpan item saat ini sebagai template baru, atau kelola template yang ada.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="apply" className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="mx-6 mt-3 mb-0 grid grid-cols-3 h-9 shrink-0">
              <TabsTrigger value="apply" className="text-xs gap-1.5">
                <Copy className="h-3.5 w-3.5" /> Terapkan
                {templates.length > 0 && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-0.5">{templates.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="save" className="text-xs gap-1.5">
                <Save className="h-3.5 w-3.5" /> Simpan Baru
              </TabsTrigger>
              <TabsTrigger value="manage" className="text-xs gap-1.5">
                <Settings2 className="h-3.5 w-3.5" /> Kelola
              </TabsTrigger>
            </TabsList>

            {/* ─── TAB: Terapkan ─────────────────────────────────────────── */}
            <TabsContent value="apply" className="flex flex-col flex-1 overflow-hidden mt-0 px-6 pb-0">
              {templates.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-3">
                  <BookMarked className="h-10 w-10 opacity-20" />
                  <div>
                    <p className="font-medium text-sm">Belum ada template tersimpan</p>
                    <p className="text-xs mt-1">
                      Buka tab <strong>Simpan Baru</strong> untuk menyimpan item HPP keberangkatan ini sebagai template.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Filters */}
                  <div className="flex gap-2 mt-3 mb-2 shrink-0">
                    <div className="relative flex-1">
                      <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={searchTpl}
                        onChange={e => setSearchTpl(e.target.value)}
                        placeholder="Cari nama template..."
                        className="pl-8 h-8 text-xs"
                      />
                    </div>
                    <Select value={filterTag} onValueChange={setFilterTag}>
                      <SelectTrigger className="h-8 w-32 text-xs">
                        <SelectValue placeholder="Semua tag" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua</SelectItem>
                        {TAGS.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <ScrollArea className="flex-1 max-h-[40vh] pb-2">
                    {filteredTemplates.length === 0 ? (
                      <p className="text-center text-xs text-muted-foreground py-8">Tidak ada template yang cocok</p>
                    ) : (
                      <div className="space-y-2 pb-1">
                        {filteredTemplates.map(t => (
                          <TemplateCard
                            key={t.id}
                            template={t}
                            selected={selectedTemplate?.id === t.id}
                            onApply={setSelectedTemplate}
                          />
                        ))}
                      </div>
                    )}
                  </ScrollArea>

                  {/* Import mode + action */}
                  <div className="border-t pt-3 pb-4 mt-2 shrink-0 space-y-3">
                    {selectedTemplate && (
                      <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">Template dipilih:</span>
                        <span className="font-semibold text-primary truncate">{selectedTemplate.name}</span>
                        <span className="text-muted-foreground shrink-0">({selectedTemplate.item_count} item)</span>
                      </div>
                    )}

                    <RadioGroup
                      value={importMode}
                      onValueChange={(v: "append" | "replace") => setImportMode(v)}
                      className="flex flex-col gap-1"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="append" id="tpl-append" />
                        <Label htmlFor="tpl-append" className="text-xs cursor-pointer">
                          <span className="font-medium">Tambahkan</span>{" "}
                          <span className="text-muted-foreground">— pertahankan item HPP yang ada</span>
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="replace" id="tpl-replace" />
                        <Label htmlFor="tpl-replace" className="text-xs cursor-pointer">
                          <span className="font-medium text-destructive">Ganti semua</span>{" "}
                          <span className="text-muted-foreground">— hapus item HPP yang ada, lalu terapkan template</span>
                        </Label>
                      </div>
                    </RadioGroup>

                    <div className="flex justify-between items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => { onOpenChange(false); reset(); }}>
                        Batal
                      </Button>
                      <Button
                        size="sm"
                        disabled={!selectedTemplate || applyMutation.isPending}
                        onClick={() => applyMutation.mutate()}
                        className="min-w-[160px]"
                      >
                        {applyMutation.isPending
                          ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Menerapkan...</>
                          : <><Copy className="h-4 w-4 mr-2" />Terapkan Template</>
                        }
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* ─── TAB: Simpan Baru ──────────────────────────────────────── */}
            <TabsContent value="save" className="flex flex-col flex-1 overflow-hidden mt-0 px-6 pb-4">
              {currentItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-3">
                  <Save className="h-10 w-10 opacity-20" />
                  <div>
                    <p className="font-medium text-sm">Belum ada item HPP</p>
                    <p className="text-xs mt-1">Tambahkan item HPP ke keberangkatan ini terlebih dahulu.</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Template metadata */}
                  <div className="space-y-3 mt-3 shrink-0">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs font-semibold">Nama Template *</Label>
                        <Input
                          value={saveName}
                          onChange={e => setSaveName(e.target.value)}
                          placeholder="Cth: Paket Umroh Reguler 9 Hari"
                          className="h-9 text-sm"
                          autoFocus
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Tag</Label>
                        <Select value={saveTag} onValueChange={(v: HPPTemplateTag) => setSaveTag(v)}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Pilih..." />
                          </SelectTrigger>
                          <SelectContent>
                            {TAGS.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Deskripsi (opsional)</Label>
                      <Textarea
                        value={saveDesc}
                        onChange={e => setSaveDesc(e.target.value)}
                        placeholder="Cth: Template untuk program umroh 9 hari low season..."
                        rows={2}
                        className="text-sm resize-none"
                      />
                    </div>
                  </div>

                  {/* Item picker */}
                  <div className="mt-3 shrink-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="text-xs font-semibold">Pilih Item yang Akan Disimpan</Label>
                      <button
                        onClick={toggleSaveAll}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {saveSelectedCount === allCurrentIndexes.size
                          ? <CheckSquare className="h-3.5 w-3.5 text-primary" />
                          : <Square className="h-3.5 w-3.5" />
                        }
                        {saveSelectedCount === allCurrentIndexes.size ? "Batalkan semua" : "Pilih semua"}
                      </button>
                    </div>
                  </div>

                  <ScrollArea className="flex-1 max-h-[26vh] border rounded-lg overflow-hidden">
                    <div className="divide-y">
                      {Object.entries(currentGrouped).map(([cat, catEntries]) => {
                        const meta = CATEGORY_META[cat] || CATEGORY_META.other;
                        return (
                          <div key={cat}>
                            <div className="px-3 py-1.5 bg-muted/30 flex items-center gap-2">
                              <span className="text-xs">{meta.icon}</span>
                              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {meta.label}
                              </span>
                            </div>
                            {catEntries.map(({ item, index }) => {
                              const checked = effectiveSaveIds.has(String(index)) && !effectiveSaveIds.has("__none__");
                              return (
                                <div
                                  key={index}
                                  onClick={() => toggleSaveItem(index)}
                                  className={cn(
                                    "px-3 py-2 flex items-center gap-3 cursor-pointer hover:bg-muted/20 transition-colors",
                                    !checked && "opacity-50"
                                  )}
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={() => toggleSaveItem(index)}
                                    className="h-3.5 w-3.5"
                                    onClick={e => e.stopPropagation()}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{item.description}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {item.quantity}× {item.currency !== "IDR" ? item.currency : "Rp"}{" "}
                                      {Number(item.unit_cost).toLocaleString("id-ID")}
                                    </p>
                                  </div>
                                  <p className="text-xs font-semibold shrink-0">{fmtRp(item.total_cost_idr || 0)}</p>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>

                  {/* Hotel dates note */}
                  {currentItems.some((i: any) => i.category === "hotel") && (
                    <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 flex items-start gap-2 text-xs text-amber-800 shrink-0">
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      <p>Tanggal check-in & check-out hotel <strong>tidak</strong> ikut tersimpan dalam template.</p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {saveSelectedCount} item · {fmtRp(saveSelectedTotal)}
                    </span>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={isSaving || !saveName.trim() || saveSelectedCount === 0}
                      className="min-w-[140px]"
                    >
                      {isSaving
                        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Menyimpan...</>
                        : <><Save className="h-4 w-4 mr-2" />Simpan Template</>
                      }
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            {/* ─── TAB: Kelola ───────────────────────────────────────────── */}
            <TabsContent value="manage" className="flex flex-col flex-1 overflow-hidden mt-0 px-6 pb-4">
              {templates.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-3">
                  <Settings2 className="h-10 w-10 opacity-20" />
                  <p className="text-sm">Belum ada template tersimpan.</p>
                </div>
              ) : (
                <ScrollArea className="flex-1 max-h-[60vh] mt-3">
                  <div className="space-y-2 pb-2">
                    {templates.map(t => {
                      const isEditing = editingId === t.id;
                      const tm = tagMeta(t.tag);
                      return (
                        <div key={t.id} className="rounded-lg border">
                          {isEditing ? (
                            /* Edit mode */
                            <div className="p-3 space-y-2">
                              <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-2">
                                  <Input
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="h-8 text-sm"
                                    placeholder="Nama template"
                                    autoFocus
                                  />
                                </div>
                                <Select value={editTag} onValueChange={(v: HPPTemplateTag) => setEditTag(v)}>
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Tag..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {TAGS.map(tg => (
                                      <SelectItem key={tg.value} value={tg.value}>{tg.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Input
                                value={editDesc}
                                onChange={e => setEditDesc(e.target.value)}
                                className="h-8 text-sm"
                                placeholder="Deskripsi (opsional)"
                              />
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingId(null)}>
                                  <X className="h-3.5 w-3.5 mr-1" /> Batal
                                </Button>
                                <Button size="sm" className="h-7 text-xs" onClick={() => {
                                  if (!editName.trim()) { toast.error("Nama tidak boleh kosong"); return; }
                                  updateTemplate(t.id, { name: editName, description: editDesc || undefined, tag: editTag || undefined });
                                  toast.success("Template diperbarui");
                                  setEditingId(null);
                                }}>
                                  <Check className="h-3.5 w-3.5 mr-1" /> Simpan
                                </Button>
                              </div>
                            </div>
                          ) : (
                            /* View mode */
                            <div className="px-4 py-3 flex items-start gap-3">
                              <Star className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-sm truncate">{t.name}</p>
                                  {tm && (
                                    <Badge className={cn("text-[10px] px-1.5 py-0 shrink-0", tm.color)}>{tm.label}</Badge>
                                  )}
                                </div>
                                {t.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.description}</p>
                                )}
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {t.item_count} item · {fmtRp(t.total_hpp)} · {fmtDate(t.created_at)}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => {
                                    setEditingId(t.id);
                                    setEditName(t.name);
                                    setEditDesc(t.description || "");
                                    setEditTag(t.tag || "");
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteConfirm(t)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Template?</AlertDialogTitle>
            <AlertDialogDescription>
              Template <strong>"{deleteConfirm?.name}"</strong> ({deleteConfirm?.item_count} item) akan dihapus permanen dari library.
              Item HPP di keberangkatan yang sudah menggunakan template ini tidak terpengaruh.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirm) {
                  deleteTemplate(deleteConfirm.id);
                  toast.success(`Template "${deleteConfirm.name}" dihapus`);
                  setDeleteConfirm(null);
                }
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
