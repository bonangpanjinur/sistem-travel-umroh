import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Minus, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { EquipmentItem } from "@/pages/operational/EquipmentPage";

interface AddStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: EquipmentItem[];
  preselectedItemId?: string;
}

export function AddStockDialog({ open, onOpenChange, items, preselectedItemId }: AddStockDialogProps) {
  const queryClient = useQueryClient();
  const [stockUpdates, setStockUpdates] = useState<Map<string, number>>(new Map());
  const [isCorrectionMode, setIsCorrectionMode] = useState(false);

  const updateQty = (itemId: string, delta: number) => {
    const newMap = new Map(stockUpdates);
    const current = newMap.get(itemId) || 0;
    const newVal = current + delta;
    
    // In normal mode, don't allow negative updates (only adding stock)
    // In correction mode, allow negative updates (reducing stock)
    if (!isCorrectionMode && newVal < 0) return;
    
    if (newVal === 0) newMap.delete(itemId);
    else newMap.set(itemId, newVal);
    setStockUpdates(newMap);
  };

  const setQty = (itemId: string, val: number) => {
    const newMap = new Map(stockUpdates);
    if (val === 0) newMap.delete(itemId);
    else newMap.set(itemId, val);
    setStockUpdates(newMap);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const [itemId, amount] of stockUpdates) {
        const rpcName = amount > 0 ? 'increment_equipment_stock' : 'decrement_equipment_stock';
        const { error } = await supabase.rpc(rpcName, { 
          item_id: itemId, 
          amount: Math.abs(amount) 
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      const modeText = isCorrectionMode ? "Koreksi" : "Penambahan";
      toast.success(`${modeText} stok berhasil untuk ${stockUpdates.size} item`);
      queryClient.invalidateQueries({ queryKey: ["equipment-items"] });
      setStockUpdates(new Map());
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(`Gagal: ${err.message}`),
  });

  const totalChanges = stockUpdates.size;

  const sortedItems = [...items].sort((a, b) => {
    if (a.id === preselectedItemId) return -1;
    if (b.id === preselectedItemId) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) {
        setStockUpdates(new Map());
        setIsCorrectionMode(false);
      }
      onOpenChange(val);
    }}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between pr-6">
          <DialogTitle className="flex items-center gap-2">
            {isCorrectionMode ? <RefreshCw className="h-5 w-5 text-amber-500" /> : <Plus className="h-5 w-5" />}
            {isCorrectionMode ? "Koreksi Stok Perlengkapan" : "Tambah Stok Perlengkapan"}
          </DialogTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`text-xs h-7 ${isCorrectionMode ? 'text-amber-600 bg-amber-50' : 'text-muted-foreground'}`}
            onClick={() => {
              setIsCorrectionMode(!isCorrectionMode);
              setStockUpdates(new Map());
            }}
          >
            {isCorrectionMode ? "Mode Koreksi Aktif" : "Aktifkan Koreksi"}
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 py-2">
          {sortedItems.map(item => {
            const amount = stockUpdates.get(item.id) || 0;
            const catEmoji = item.category === 'male_only' ? '♂' : item.category === 'female_only' ? '♀' : item.category === 'child_only' ? '👶' : '';

            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  amount !== 0 
                    ? (amount > 0 ? 'bg-primary/5 border-primary/30' : 'bg-amber-50 border-amber-200') 
                    : 'bg-card'
                }`}
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
                    disabled={!isCorrectionMode && amount === 0}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="number"
                    value={amount || ''}
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
                className={isCorrectionMode && totalChanges > 0 ? "bg-amber-600 hover:bg-amber-700" : ""}
              >
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {isCorrectionMode ? "Simpan Koreksi" : "Simpan Stok"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
