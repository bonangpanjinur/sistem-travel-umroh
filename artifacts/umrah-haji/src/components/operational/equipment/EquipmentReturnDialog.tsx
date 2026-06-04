import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  RotateCcw, Loader2, Package, CheckCircle2, AlertTriangle,
  XCircle, User, Info,
} from "lucide-react";
import { toast } from "sonner";

interface ReturnRow {
  id: string;
  equipment_id: string;
  quantity: number;
  size: string | null;
  equipment_name: string;
  selected: boolean;
  condition: "baik" | "rusak" | "hilang";
  notes: string;
  reason: string;
}

interface EquipmentReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jamaahId: string;
  jamaahName: string;
  departureId: string;
}

const CONDITION_OPTIONS = [
  { value: "baik", label: "Baik", color: "text-green-700 bg-green-50 border-green-200", icon: CheckCircle2 },
  { value: "rusak", label: "Rusak", color: "text-amber-700 bg-amber-50 border-amber-200", icon: AlertTriangle },
  { value: "hilang", label: "Hilang", color: "text-red-700 bg-red-50 border-red-200", icon: XCircle },
] as const;

export function EquipmentReturnDialog({
  open, onOpenChange, jamaahId, jamaahName, departureId,
}: EquipmentReturnDialogProps) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [initialized, setInitialized] = useState(false);

  const { isLoading, data: distributedItems } = useQuery({
    queryKey: ["distributed-for-return", jamaahId, departureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_distributions")
        .select(`
          id,
          equipment_id,
          quantity,
          size,
          equipment_items!inner(name)
        `)
        .eq("customer_id", jamaahId)
        .eq("departure_id", departureId)
        .eq("status", "distributed");

      if (error) throw error;
      return data as any[];
    },
    enabled: open,
  });

  useEffect(() => {
    if (distributedItems && !initialized) {
      setRows(
        distributedItems.map((d: any) => ({
          id: d.id,
          equipment_id: d.equipment_id,
          quantity: d.quantity || 1,
          size: d.size,
          equipment_name: d.equipment_items?.name ?? "—",
          selected: false,
          condition: "baik" as const,
          notes: "",
          reason: "",
        }))
      );
      setInitialized(true);
    }
  }, [distributedItems, initialized]);

  const returnMutation = useMutation({
    mutationFn: async () => {
      const toReturn = rows.filter((r) => r.selected);
      if (toReturn.length === 0) throw new Error("Pilih minimal 1 item untuk dikembalikan");

      for (const row of toReturn) {
        const { error } = await supabase.rpc("return_equipment_item", {
          p_distribution_id: row.id,
          p_return_condition: row.condition,
          p_return_notes: row.notes || null,
          p_return_reason: row.reason || null,
          p_return_photo_url: null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      const count = rows.filter((r) => r.selected).length;
      toast.success(`${count} item perlengkapan berhasil diretur`);
      queryClient.invalidateQueries({ queryKey: ["equipment-distributions"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-items"] });
      queryClient.invalidateQueries({ queryKey: ["customer-distributions", jamaahId, departureId] });
      queryClient.invalidateQueries({ queryKey: ["distributed-for-return", jamaahId, departureId] });
      queryClient.invalidateQueries({ queryKey: ["distribution-summary"] });
      setInitialized(false);
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(`Gagal meretur: ${err.message}`);
    },
  });

  const toggleRow = (id: string) =>
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );

  const updateRow = (id: string, patch: Partial<ReturnRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const selectAll = () => setRows((prev) => prev.map((r) => ({ ...r, selected: true })));
  const deselectAll = () => setRows((prev) => prev.map((r) => ({ ...r, selected: false })));

  const selectedCount = rows.filter((r) => r.selected).length;
  const totalCount = rows.length;

  const handleClose = () => {
    setInitialized(false);
    setRows([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <div className="p-6 pb-4 border-b bg-muted/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <RotateCcw className="h-5 w-5 text-amber-600" />
              Retur Perlengkapan
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 mt-1">
              <User className="h-4 w-4" />
              {jamaahName}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground font-medium">
                Tidak ada perlengkapan terdistribusi
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Jamaah ini belum menerima perlengkapan apapun
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Pilih item yang akan dikembalikan ({totalCount} item)
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll} disabled={selectedCount === totalCount}>
                    Pilih Semua
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAll} disabled={selectedCount === 0}>
                    Hapus Pilihan
                  </Button>
                </div>
              </div>

              {selectedCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 text-amber-700 text-sm">
                  <Info className="h-4 w-4 shrink-0" />
                  <span>
                    <strong>{selectedCount}</strong> item akan dikembalikan ke stok
                  </span>
                </div>
              )}

              <div className="space-y-3">
                {rows.map((row) => (
                  <div
                    key={row.id}
                    className={`border rounded-lg transition-all ${
                      row.selected
                        ? "border-amber-400 bg-amber-50/60 dark:bg-amber-950/20"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <div
                      className="flex items-center gap-3 p-4 cursor-pointer"
                      onClick={() => toggleRow(row.id)}
                    >
                      <div
                        className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          row.selected
                            ? "bg-amber-500 border-amber-500"
                            : "border-muted-foreground/30"
                        }`}
                      >
                        {row.selected && <RotateCcw className="h-3 w-3 text-white" />}
                      </div>

                      <Package className="h-4 w-4 text-muted-foreground shrink-0" />

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{row.equipment_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">Qty: {row.quantity}</span>
                          {row.size && (
                            <Badge variant="outline" className="text-xs h-4">
                              Ukuran: {row.size}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {!row.selected && (
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                          Terdistribusi
                        </Badge>
                      )}
                      {row.selected && (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs flex gap-1">
                          <RotateCcw className="h-3 w-3" /> Retur
                        </Badge>
                      )}
                    </div>

                    {row.selected && (
                      <>
                        <Separator />
                        <div className="p-4 space-y-3 bg-background/50">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Kondisi Item *</Label>
                              <div className="flex gap-2">
                                {CONDITION_OPTIONS.map((opt) => {
                                  const Icon = opt.icon;
                                  return (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateRow(row.id, { condition: opt.value });
                                      }}
                                      className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border text-xs font-medium transition-all ${
                                        row.condition === opt.value
                                          ? opt.color + " border-current"
                                          : "border-border text-muted-foreground hover:border-muted-foreground/50"
                                      }`}
                                    >
                                      <Icon className="h-3 w-3" />
                                      {opt.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Alasan Retur</Label>
                              <Select
                                value={row.reason}
                                onValueChange={(v) => updateRow(row.id, { reason: v })}
                              >
                                <SelectTrigger className="h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                                  <SelectValue placeholder="Pilih alasan..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="selesai_dipakai">Selesai dipakai</SelectItem>
                                  <SelectItem value="ukuran_tidak_sesuai">Ukuran tidak sesuai</SelectItem>
                                  <SelectItem value="item_rusak">Item rusak</SelectItem>
                                  <SelectItem value="item_hilang">Item hilang</SelectItem>
                                  <SelectItem value="batal_berangkat">Batal berangkat</SelectItem>
                                  <SelectItem value="lainnya">Lainnya</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Catatan (opsional)</Label>
                            <Textarea
                              value={row.notes}
                              onChange={(e) => updateRow(row.id, { notes: e.target.value })}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Tulis catatan kondisi item..."
                              className="min-h-[60px] text-sm resize-none"
                              rows={2}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="p-6 pt-4 border-t gap-2">
          <Button variant="outline" onClick={handleClose} disabled={returnMutation.isPending}>
            Batal
          </Button>
          <Button
            variant="default"
            className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
            onClick={() => returnMutation.mutate()}
            disabled={selectedCount === 0 || returnMutation.isPending}
          >
            {returnMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Memproses...</>
            ) : (
              <><RotateCcw className="h-4 w-4" /> Proses Retur ({selectedCount})</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
