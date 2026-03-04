import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Package, CheckCircle2, AlertTriangle, Loader2, User } from "lucide-react";
import { toast } from "sonner";

interface EquipmentItem {
  id: string;
  name: string;
  description?: string;
  stock_quantity?: number;
  category?: string;
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
        .select("equipment_id, quantity")
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

  const saveMutation = useMutation({
    mutationFn: async () => {
      const existingIds = new Set(existingDistributions?.map((d: any) => d.equipment_id) || []);
      const newCheckedIds = new Set(checkedItems.keys());
      const itemsToAdd = Array.from(newCheckedIds).filter((id) => !existingIds.has(id));
      const itemsToRemove = Array.from(existingIds).filter((id) => !newCheckedIds.has(id));

      if (itemsToAdd.length > 0) {
        const insertData = itemsToAdd.map((equipmentId) => ({
          equipment_id: equipmentId,
          customer_id: jamaahId,
          departure_id: departureId,
          quantity: checkedItems.get(equipmentId)?.quantity || 1,
          status: "distributed",
          distributed_at: new Date().toISOString(),
        }));
        const { error } = await supabase.from("equipment_distributions").insert(insertData);
        if (error) throw error;
        for (const equipmentId of itemsToAdd) {
          const item = allEquipmentItems?.find((e) => e.id === equipmentId);
          const qty = checkedItems.get(equipmentId)?.quantity || 1;
          if (item) {
            await supabase.from("equipment_items").update({ stock_quantity: Math.max(0, (item.stock_quantity || 0) - qty) }).eq("id", equipmentId);
          }
        }
      }

      if (itemsToRemove.length > 0) {
        for (const equipmentId of itemsToRemove) {
          const { data: distData } = await supabase
            .from("equipment_distributions").select("id, quantity")
            .eq("equipment_id", equipmentId).eq("customer_id", jamaahId)
            .eq("departure_id", departureId).eq("status", "distributed").single();
          if (distData) {
            await supabase.from("equipment_distributions").delete().eq("id", distData.id);
            const item = allEquipmentItems?.find((e) => e.id === equipmentId);
            if (item) {
              await supabase.from("equipment_items").update({ stock_quantity: (item.stock_quantity || 0) + (distData.quantity || 1) }).eq("id", equipmentId);
            }
          }
        }
      }
    },
    onSuccess: () => {
      toast.success(`Perlengkapan ${jamaahName} berhasil disimpan`);
      queryClient.invalidateQueries({ queryKey: ["equipment-distributions"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-items"] });
      queryClient.invalidateQueries({ queryKey: ["customer-distributions", jamaahId, departureId] });
      setShowConfirmDialog(false);
      onOpenChange(false);
    },
    onError: (error) => toast.error(`Gagal menyimpan: ${error.message}`),
  });

  const handleCheckItem = (id: string) => {
    const newChecked = new Map(checkedItems);
    if (newChecked.has(id)) newChecked.delete(id);
    else newChecked.set(id, { equipmentId: id, quantity: 1 });
    setCheckedItems(newChecked);
  };

  const handleSelectAll = () => {
    const newChecked = new Map<string, ChecklistItem>();
    equipmentItems?.forEach((item) => newChecked.set(item.id, { equipmentId: item.id, quantity: 1 }));
    setCheckedItems(newChecked);
  };

  const handleDeselectAll = () => setCheckedItems(new Map());

  const distributedCount = checkedItems.size;
  const totalCount = equipmentItems?.length || 0;
  const progressPercentage = totalCount > 0 ? (distributedCount / totalCount) * 100 : 0;

  const genderLabel = jamaahGender === 'male' ? 'Laki-laki' : jamaahGender === 'female' ? 'Perempuan' : jamaahType === 'child' ? 'Anak' : '-';
  const genderColor = jamaahGender === 'male' ? 'text-blue-600 bg-blue-50 border-blue-200' : jamaahGender === 'female' ? 'text-pink-600 bg-pink-50 border-pink-200' : 'text-muted-foreground bg-muted';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          {/* Header with jamaah info */}
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

          {/* Checklist */}
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
                    const catEmoji = item.category === 'male_only' ? '♂' : item.category === 'female_only' ? '♀' : item.category === 'child_only' ? '👶' : '';

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleCheckItem(item.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-green-50 border-green-300 dark:bg-green-950/30 dark:border-green-700'
                            : 'hover:border-primary/50'
                        }`}
                      >
                        <Checkbox checked={isChecked} className="h-5 w-5 pointer-events-none" />
                        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {catEmoji && <span className="mr-1">{catEmoji}</span>}
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
                            stock <= 5 ? 'bg-amber-50 text-amber-700 border-amber-200' :
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

          {/* Footer */}
          <DialogFooter className="p-6 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
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

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Penyimpanan</AlertDialogTitle>
            <AlertDialogDescription>
              Simpan distribusi {distributedCount} item untuk {jamaahName}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-3 p-3 bg-muted rounded-md text-sm space-y-1">
            {Array.from(checkedItems.entries()).map(([eqId]) => {
              const eq = allEquipmentItems?.find(e => e.id === eqId);
              return <p key={eqId}>• {eq?.name}</p>;
            })}
          </div>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
