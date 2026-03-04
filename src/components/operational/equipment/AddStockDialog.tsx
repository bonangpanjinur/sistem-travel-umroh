import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EquipmentItem {
  id: string;
  name: string;
  description?: string;
  stock_quantity: number;
  category?: string;
}

interface AddStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: EquipmentItem[];
  preselectedItemId?: string;
}

export function AddStockDialog({ open, onOpenChange, items, preselectedItemId }: AddStockDialogProps) {
  const queryClient = useQueryClient();
  const [stockUpdates, setStockUpdates] = useState<Map<string, number>>(new Map());

  const updateQty = (itemId: string, delta: number) => {
    const newMap = new Map(stockUpdates);
    const current = newMap.get(itemId) || 0;
    const newVal = Math.max(0, current + delta);
    if (newVal === 0) newMap.delete(itemId);
    else newMap.set(itemId, newVal);
    setStockUpdates(newMap);
  };

  const setQty = (itemId: string, val: number) => {
    const newMap = new Map(stockUpdates);
    if (val <= 0) newMap.delete(itemId);
    else newMap.set(itemId, val);
    setStockUpdates(newMap);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const [itemId, addQty] of stockUpdates) {
        const item = items.find(i => i.id === itemId);
        if (!item) continue;
        const { error } = await supabase
          .from("equipment_items")
          .update({ stock_quantity: (item.stock_quantity || 0) + addQty })
          .eq("id", itemId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(`Stok berhasil ditambahkan untuk ${stockUpdates.size} item`);
      queryClient.invalidateQueries({ queryKey: ["equipment-items"] });
      setStockUpdates(new Map());
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(`Gagal: ${err.message}`),
  });

  const totalChanges = stockUpdates.size;

  // Sort items: preselected first, then by name
  const sortedItems = [...items].sort((a, b) => {
    if (a.id === preselectedItemId) return -1;
    if (b.id === preselectedItemId) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" /> Tambah Stok Perlengkapan
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 py-2">
          {sortedItems.map(item => {
            const addQty = stockUpdates.get(item.id) || 0;
            const catEmoji = item.category === 'male_only' ? '♂' : item.category === 'female_only' ? '♀' : item.category === 'child_only' ? '👶' : '';

            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${addQty > 0 ? 'bg-primary/5 border-primary/30' : 'bg-card'}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {catEmoji && <span className="mr-1">{catEmoji}</span>}
                    {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground">Stok saat ini: {item.stock_quantity}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="outline" size="icon" className="h-7 w-7"
                    onClick={() => updateQty(item.id, -1)}
                    disabled={addQty === 0}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="number" min={0}
                    value={addQty || ''}
                    onChange={(e) => setQty(item.id, parseInt(e.target.value) || 0)}
                    className="w-16 h-7 text-center text-sm"
                    placeholder="0"
                  />
                  <Button
                    variant="outline" size="icon" className="h-7 w-7"
                    onClick={() => updateQty(item.id, 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">
              {totalChanges > 0 ? `${totalChanges} item akan diupdate` : 'Belum ada perubahan'}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={totalChanges === 0 || saveMutation.isPending}
              >
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Simpan
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
