import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Package, CheckCircle2, Loader2, User, RotateCcw, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface EquipmentItem {
  id: string;
  name: string;
  description?: string;
  stock_quantity?: number;
  category?: string;
  low_stock_threshold?: number;
}

interface ChecklistItem {
  equipmentId: string;
  quantity: number;
}

interface EquipmentDistributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jamaahId: string;
  jamaahName: string;
  jamaahGender?: string;
  jamaahType?: string;
  departureId: string;
}

export function EquipmentDistributionDialog({
  open, onOpenChange, jamaahId, jamaahName, jamaahGender, jamaahType, departureId,
}: EquipmentDistributionDialogProps) {
  const queryClient = useQueryClient();
  const [checkedItems, setCheckedItems] = useState<Map<string, ChecklistItem>>(new Map());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showUnsavedReturnsDialog, setShowUnsavedReturnsDialog] = useState(false);

  const { data: allEquipmentItems, isLoading: loadingItems } = useQuery({
    queryKey: ["equipment-items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipment_items").select("*").order("name");
      if (error) throw error;
      return data as EquipmentItem[];
    },
  });

  const equipmentItems = useMemo(() => {
    if (!allEquipmentItems) return [];
    return allEquipmentItems.filter(item => {
      const cat = item.category || 'general';
      if (cat === 'general') return true;
      if (cat === 'male_only' && jamaahGender === 'male') return true;
      if (cat === 'female_only' && jamaahGender === 'female') return true;
      if (cat === 'child_only' && jamaahType === 'child') return true;
      return false;
    });
  }, [allEquipmentItems, jamaahGender, jamaahType]);

  const { data: existingDistributions } = useQuery({
    queryKey: ["customer-distributions", jamaahId, departureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_distributions")
        .select("equipment_id, quantity, status")
        .eq("customer_id", jamaahId)
        .eq("departure_id", departureId)
        .eq("status", "distributed");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  useEffect(() => {
    if (existingDistributions && existingDistributions.length > 0) {
      const newChecked = new Map<string, ChecklistItem>();
      existingDistributions.forEach((d: any) => {
        newChecked.set(d.equipment_id, { equipmentId: d.equipment_id, quantity: d.quantity || 1 });
      });
      setCheckedItems(newChecked);
    } else if (existingDistributions) {
      setCheckedItems(new Map());
    }
  }, [existingDistributions]);

  // Reset states when dialog closes
  useEffect(() => {
    if (!open) {
      setShowConfirmDialog(false);
      setShowUnsavedReturnsDialog(false);
    }
  }, [open]);

  const hasUnsavedReturns = useMemo(() => {
    const existingIds = new Set(existingDistributions?.map((d: any) => d.equipment_id) || []);
    return Array.from(existingIds).some(id => !checkedItems.has(id));
  }, [existingDistributions, checkedItems]);

  const handleClose = () => {
    if (hasUnsavedReturns) {
      setShowUnsavedReturnsDialog(true);
    } else {
      onOpenChange(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const existingIds = new Set(existingDistributions?.map((d: any) => d.equipment_id) || []);
      const newCheckedIds = new Set(checkedItems.keys());
      
      const itemsToAdd = Array.from(newCheckedIds).filter((id) => !existingIds.has(id));
      const itemsToRemove = Array.from(existingIds).filter((id) => !newCheckedIds.has(id));

      // 1. Handle Additions (Atomic)
      if (itemsToAdd.length > 0) {
        const distributions = itemsToAdd.map(id => ({
          equipment_id: id,
          customer_id: jamaahId,
          quantity: checkedItems.get(id)?.quantity || 1
        }));

        const { error } = await supabase.rpc('bulk_distribute_equipment', {
          p_departure_id: departureId,
          p_distributions: distributions
        });
        if (error) throw error;
      }

      // 2. Handle Removals (Atomic Return)
      if (itemsToRemove.length > 0) {
        for (const equipmentId of itemsToRemove) {
          // Update status to 'returned' instead of deleting
          const { data: dist, error: fetchError } = await supabase
            .from("equipment_distributions")
            .select("id, quantity")
            .eq("customer_id", jamaahId)
            .eq("departure_id", departureId)
            .eq("equipment_id", equipmentId)
            .eq("status", "distributed")
            .single();
          
          if (fetchError) throw fetchError;

          const { error: updateError } = await supabase
            .from("equipment_distributions")
            .update({ 
              status: 'returned', 
              returned_at: new Date().toISOString() 
            })
            .eq("id", dist.id);
          
          if (updateError) throw updateError;

          // Increment stock atomically
          const { error: rpcError } = await supabase.rpc('increment_equipment_stock', {
            item_id: equipmentId,
            amount: dist.quantity || 1
          });
          if (rpcError) throw rpcError;
        }
      }
    },
    onSuccess: () => {
      toast.success(`Perlengkapan ${jamaahName} berhasil diperbarui`);
      queryClient.invalidateQueries({ queryKey: ["equipment-distributions"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-items"] });
      queryClient.invalidateQueries({ queryKey: ["customer-distributions", jamaahId, departureId] });
      
      // Reset state immediately before closing
      setShowConfirmDialog(false);
      setCheckedItems(new Map());
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Gagal menyimpan: ${error.message}`);
      setShowConfirmDialog(false);
    },
  });

  const handleCheckItem = (id: string) => {
    const item = allEquipmentItems?.find(i => i.id === id);
    const isChecked = checkedItems.has(id);
    
    // Validation: Check stock if adding
    if (!isChecked && (item?.stock_quantity || 0) <= 0) {
      toast.error(`Stok ${item?.name} habis!`);
      return;
    }

    const newChecked = new Map(checkedItems);
    if (isChecked) newChecked.delete(id);
    else newChecked.set(id, { equipmentId: id, quantity: 1 });
    setCheckedItems(newChecked);
  };

  const handleSelectAll = () => {
    const newChecked = new Map(checkedItems);
    let skipped = 0;
    
    equipmentItems?.forEach((item) => {
      if (!newChecked.has(item.id)) {
        if ((item.stock_quantity || 0) > 0) {
          newChecked.set(item.id, { equipmentId: item.id, quantity: 1 });
        } else {
          skipped++;
        }
      }
    });
    
    if (skipped > 0) {
      toast.warning(`${skipped} item dilewati karena stok habis`);
    }
    setCheckedItems(newChecked);
  };

  const handleDeselectAll = () => setCheckedItems(new Map());

  const distributedCount = checkedItems.size;
  const totalCount = equipmentItems?.length || 0;
  const progressPercentage = totalCount > 0 ? (distributedCount / totalCount) * 100 : 0;

  const genderLabel = jamaahGender === 'male' ? 'Laki-laki' : jamaahGender === 'female' ? 'Perempuan' : jamaahType === 'child' ? 'Anak' : '-';
  const genderColor = jamaahGender === 'male' ? 'text-blue-600 bg-blue-50 border-blue-200' : jamaahGender === 'female' ? 'text-pink-600 bg-pink-50 border-pink-200' : 'text-muted-foreground bg-muted';

  // Inline confirmation view instead of nested AlertDialog
  if (showConfirmDialog) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Konfirmasi Penyimpanan
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Simpan distribusi <strong>{distributedCount}</strong> item untuk <strong>{jamaahName}</strong>?
            </p>
            
            <div className="p-3 bg-muted rounded-md text-sm space-y-1 max-h-[300px] overflow-y-auto">
              {Array.from(checkedItems.entries()).map(([eqId]) => {
                const eq = allEquipmentItems?.find(e => e.id === eqId);
                const isNew = !existingDistributions?.some(d => d.equipment_id === eqId);
                return (
                  <p key={eqId} className="flex items-center justify-between">
                    <span>• {eq?.name}</span>
                    {isNew && <Badge className="text-[10px] h-4 bg-green-100 text-green-700 border-green-200">Baru</Badge>}
                  </p>
                );
              })}
              {existingDistributions?.filter(d => !checkedItems.has(d.equipment_id)).map(d => {
                const eq = allEquipmentItems?.find(e => e.id === d.equipment_id);
                return (
                  <p key={d.equipment_id} className="flex items-center justify-between text-destructive">
                    <span>• {eq?.name}</span>
                    <Badge variant="outline" className="text-[10px] h-4 text-destructive border-destructive/30 flex gap-1">
                      <RotateCcw className="h-2 w-2" /> Retur
                    </Badge>
                  </p>
                );
              })}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
              disabled={saveMutation.isPending}
            >
              Batal
            </Button>
            <Button 
              onClick={() => saveMutation.mutate()} 
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Menyimpan...</>
              ) : (
                'Simpan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Main dialog view
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        {/* Unsaved Returns Confirmation Modal */}
        <Dialog open={showUnsavedReturnsDialog} onOpenChange={setShowUnsavedReturnsDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-destructive" />
                Konfirmasi Pengembalian
              </DialogTitle>
              <DialogDescription>
                Anda telah menghapus centang pada beberapa item. Apakah Anda ingin menyimpan perubahan ini sebagai pengembalian (retur)?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-md text-sm space-y-1 max-h-[200px] overflow-y-auto">
                <p className="font-semibold text-destructive mb-2">Item yang akan dikembalikan:</p>
                {existingDistributions?.filter(d => !checkedItems.has(d.equipment_id)).map(d => {
                  const eq = allEquipmentItems?.find(e => e.id === d.equipment_id);
                  return (
                    <p key={d.equipment_id} className="flex items-center justify-between text-destructive">
                      <span>• {eq?.name}</span>
                    </p>
                  );
                })}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Tutup Tanpa Simpan
              </Button>
              <Button 
                variant="destructive"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Menyimpan...</>
                ) : (
                  'Ya, Simpan Retur'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <div className="p-6 pb-4 border-b bg-muted/30">
          <DialogHeader>
            <DialogTitle className="text-lg">Detail Perlengkapan Jamaah</DialogTitle>
          </DialogHeader>
          <div className="mt-4 flex items-center gap-4">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center border ${genderColor}`}>
              <User className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base">{jamaahName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={`text-xs ${genderColor}`}>{genderLabel}</Badge>
                {jamaahType === 'child' && <Badge variant="outline" className="text-xs">Anak</Badge>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{distributedCount}/{totalCount}</p>
              <p className="text-xs text-muted-foreground">{Math.round(progressPercentage)}% selesai</p>
            </div>
          </div>
          <Progress value={progressPercentage} className="h-2 mt-3" />
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {loadingItems ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : equipmentItems && equipmentItems.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Checklist Perlengkapan</p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleSelectAll} disabled={distributedCount === totalCount}>
                    Pilih Semua
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDeselectAll} disabled={distributedCount === 0}>
                    Hapus Semua
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {equipmentItems.map((item) => {
                  const isChecked = checkedItems.has(item.id);
                  const stock = item.stock_quantity || 0;
                  const threshold = item.low_stock_threshold || 5;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleCheckItem(item.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-green-50 border-green-300 dark:bg-green-950/30 dark:border-green-700'
                          : stock === 0 
                            ? 'bg-muted/50 opacity-70 cursor-not-allowed'
                            : 'hover:border-primary/50'
                      }`}
                    >
                      <Checkbox checked={isChecked} className="h-5 w-5 pointer-events-none" />
                      <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.name}
                        </p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs shrink-0 ${
                          stock === 0 ? 'bg-red-50 text-red-700 border-red-200' :
                          stock <= threshold ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-green-50 text-green-700 border-green-200'
                        }`}
                      >
                        Stok: {stock}
                      </Badge>
                      {isChecked && <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">Tidak ada perlengkapan yang sesuai</p>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>Tutup</Button>
          <Button
            onClick={() => setShowConfirmDialog(true)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Menyimpan...</>
            ) : (
              'Simpan Distribusi'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
