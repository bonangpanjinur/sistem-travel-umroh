import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMarginAlert } from "@/hooks/useMarginAlert";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DepartureCostItemForm } from "./DepartureCostItemForm";
import { CopyHPPDialog } from "./CopyHPPDialog";
import { HPPTemplateDialog } from "./HPPTemplateDialog";
import { Plus, Pencil, Trash2, Package, AlertCircle, Copy, BookMarked, RefreshCw } from "lucide-react";
import { toast } from "sonner";

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

function fmt(n: number) {
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

interface Props {
  departureId: string;
  paxCount?: number;
  departureLabel?: string;
  priceQuad?: number;
  priceTriple?: number;
  priceDouble?: number;
  priceSingle?: number;
  targetMarginPct?: number;
}

export function DepartureCostItemsCard({
  departureId,
  paxCount = 0,
  departureLabel,
  priceQuad = 0,
  priceTriple = 0,
  priceDouble = 0,
  priceSingle = 0,
  targetMarginPct = 20,
}: Props) {
  const queryClient = useQueryClient();

  useMarginAlert({
    departureId,
    paxCount,
    priceQuad,
    priceTriple,
    priceDouble,
    priceSingle,
    targetPct: targetMarginPct,
    enabled: !!departureId,
  });
  const [formOpen, setFormOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const { data: items, isLoading } = useQuery({
    queryKey: ["departure-cost-items", departureId],
    queryFn: async () => {
      const db = supabase as any;
      const { data, error } = await db
        .from("departure_cost_items")
        .select("*")
        .eq("departure_id", departureId)
        .order("category")
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  // Auto-recalculate financial summary after any change
  const triggerRecalculate = useCallback(async () => {
    setIsRecalculating(true);
    try {
      const db = supabase as any;
      await db.rpc("recalculate_departure_financial_summary", { p_departure_id: departureId });
      queryClient.invalidateQueries({ queryKey: ["departure-financial-summary", departureId] });
    } catch (_e) {
      // silent - P&L card will still show stale data with refresh button
    } finally {
      setIsRecalculating(false);
    }
  }, [departureId, queryClient]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const db = supabase as any;
      const { error } = await db.from("departure_cost_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Item HPP dihapus");
      queryClient.invalidateQueries({ queryKey: ["departure-cost-items", departureId] });
      setDeleteItem(null);
      await triggerRecalculate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const totalHPP = (items || []).reduce((sum: number, i: any) => sum + (i.total_cost_idr || 0), 0);

  // Group by category
  const grouped: Record<string, any[]> = {};
  (items || []).forEach((item: any) => {
    const cat = item.category || "other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  const handleFormSuccess = async () => {
    setFormOpen(false);
    setEditItem(null);
    await triggerRecalculate();
  };

  const handleCopySuccess = async () => {
    setCopyOpen(false);
    await triggerRecalculate();
  };

  const handleTemplateSuccess = async () => {
    setTemplateOpen(false);
    await triggerRecalculate();
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4 text-primary" />
              HPP / Modal per Seat
              {isRecalculating && <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </CardTitle>
            {paxCount > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">{paxCount} jamaah terdaftar</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {totalHPP > 0 && (
              <div className="text-right mr-1">
                <p className="text-xs text-muted-foreground">Total HPP</p>
                <p className="font-bold text-destructive">{fmt(totalHPP)}</p>
                {paxCount > 0 && (
                  <p className="text-[10px] text-muted-foreground">{fmt(totalHPP / paxCount)} / pax</p>
                )}
              </div>
            )}
            <Button size="sm" variant="outline" onClick={() => setTemplateOpen(true)}>
              <BookMarked className="h-4 w-4 mr-1" /> Template
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCopyOpen(true)}>
              <Copy className="h-4 w-4 mr-1" /> Salin HPP
            </Button>
            <Button size="sm" onClick={() => { setEditItem(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Tambah
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : !items || items.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Belum ada item HPP. Klik <strong>Tambah</strong> untuk mulai input biaya modal.</p>
              <p className="text-xs mt-1 opacity-60">Atau gunakan <strong>Template</strong> untuk mengisi HPP secara cepat.</p>
            </div>
          ) : (
            <div className="divide-y">
              {Object.entries(grouped).map(([cat, catItems]) => {
                const meta = CATEGORY_META[cat] || CATEGORY_META.other;
                const catTotal = catItems.reduce((s, i) => s + (i.total_cost_idr || 0), 0);
                return (
                  <div key={cat}>
                    {/* Category header */}
                    <div className="px-4 py-2 bg-muted/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{meta.icon}</span>
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{meta.label}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{catItems.length}</Badge>
                      </div>
                      <span className="text-sm font-semibold text-muted-foreground">{fmt(catTotal)}</span>
                    </div>

                    {/* Items */}
                    {catItems.map((item: any) => (
                      <div key={item.id} className="px-4 py-3 flex items-start gap-3 hover:bg-muted/20 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium truncate">{item.description}</span>
                            {item.location && (
                              <Badge className={`text-[10px] px-1.5 py-0 ${meta.color}`}>{item.location}</Badge>
                            )}
                            {item.nights && (
                              <span className="text-[10px] text-muted-foreground">{item.nights} malam</span>
                            )}
                            {item.room_type && (
                              <span className="text-[10px] text-muted-foreground capitalize">{item.room_type}</span>
                            )}
                            {item.flight_route && (
                              <span className="text-[10px] text-muted-foreground font-mono">{item.flight_route}</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {item.quantity} × {item.currency !== "IDR" ? `${item.currency} ` : "Rp "}
                            {Number(item.unit_cost).toLocaleString("id-ID")}
                            {item.currency !== "IDR" && ` (kurs ${item.exchange_rate})`}
                            {" "}({item.unit === "per_pax" ? "per jamaah" : item.unit === "per_room" ? "per kamar" : item.unit === "per_night" ? "per malam" : item.unit === "fixed" ? "tetap" : item.unit})
                          </div>
                          {item.notes && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 italic">{item.notes}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold">{fmt(item.total_cost_idr || 0)}</p>
                          {paxCount > 0 && item.unit === "per_pax" && (
                            <p className="text-[10px] text-muted-foreground">
                              /{paxCount} pax
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditItem(item); setFormOpen(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteItem(item)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}

              {/* Grand Total */}
              <div className="px-4 py-3 bg-destructive/5 border-t-2 border-destructive/20 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Total HPP</p>
                  {paxCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {fmt(totalHPP / paxCount)} / pax
                    </p>
                  )}
                </div>
                <p className="text-lg font-bold text-destructive">{fmt(totalHPP)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Item HPP" : "Tambah Item HPP"}</DialogTitle>
          </DialogHeader>
          <DepartureCostItemForm
            departureId={departureId}
            paxCount={paxCount}
            item={editItem}
            onSuccess={handleFormSuccess}
            onCancel={() => { setFormOpen(false); setEditItem(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Item HPP?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-destructive" /> Hapus <strong>{deleteItem?.description}</strong>? Aksi ini tidak bisa dibatalkan.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteMutation.mutate(deleteItem?.id)}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk-import / Copy HPP dialog */}
      <CopyHPPDialog
        open={copyOpen}
        onOpenChange={(open) => {
          setCopyOpen(open);
          if (!open) handleCopySuccess();
        }}
        targetDepartureId={departureId}
        targetDepartureLabel={departureLabel}
      />

      {/* Template library dialog */}
      <HPPTemplateDialog
        open={templateOpen}
        onOpenChange={(open) => {
          setTemplateOpen(open);
          if (!open) handleTemplateSuccess();
        }}
        targetDepartureId={departureId}
        currentItems={items || []}
      />
    </>
  );
}
