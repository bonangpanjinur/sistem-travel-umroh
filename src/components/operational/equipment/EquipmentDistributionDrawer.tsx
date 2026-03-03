import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Package, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
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

interface EquipmentDistributionDrawerProps {
  jamaahId: string;
  jamaahName: string;
  jamaahGender?: string;
  jamaahType?: string;
  departureId: string;
  onClose: () => void;
}

export function EquipmentDistributionDrawer({
  jamaahId, jamaahName, jamaahGender, jamaahType, departureId, onClose,
}: EquipmentDistributionDrawerProps) {
  const queryClient = useQueryClient();
  const [checkedItems, setCheckedItems] = useState<Map<string, ChecklistItem>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { data: allEquipmentItems, isLoading: loadingItems } = useQuery({
    queryKey: ["equipment-items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipment_items").select("*").order("name");
      if (error) throw error;
      return data as EquipmentItem[];
    },
  });

  // Filter items based on jamaah gender/type
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
  });

  useMemo(() => {
    if (existingDistributions && existingDistributions.length > 0) {
      const newChecked = new Map<string, ChecklistItem>();
      existingDistributions.forEach((d: any) => {
        newChecked.set(d.equipment_id, { equipmentId: d.equipment_id, quantity: d.quantity || 1 });
      });
      setCheckedItems(newChecked);
    }
  }, [existingDistributions]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      setIsSaving(true);
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
            await supabase.from("equipment_items").update({ stock_quantity: (item.stock_quantity || 0) - qty }).eq("id", equipmentId);
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
      toast.success(`✅ Perlengkapan ${jamaahName} berhasil disimpan`);
      queryClient.invalidateQueries({ queryKey: ["equipment-distributions"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-items"] });
      queryClient.invalidateQueries({ queryKey: ["customer-distributions", jamaahId, departureId] });
      setIsSaving(false);
      setShowConfirmDialog(false);
      onClose();
    },
    onError: (error) => {
      toast.error(`❌ Gagal menyimpan: ${error.message}`);
      setIsSaving(false);
    },
  });

  const handleCheckItem = (id: string) => {
    const newChecked = new Map(checkedItems);
    if (newChecked.has(id)) newChecked.delete(id);
    else newChecked.set(id, { equipmentId: id, quantity: 1 });
    setCheckedItems(newChecked);
  };

  const handleQuantityChange = (id: string, quantity: number) => {
    const item = allEquipmentItems?.find((e) => e.id === id);
    const max = item?.stock_quantity || 1;
    if (quantity > 0 && quantity <= max && checkedItems.has(id)) {
      const newChecked = new Map(checkedItems);
      newChecked.set(id, { equipmentId: id, quantity });
      setCheckedItems(newChecked);
    }
  };

  const handleSelectAll = () => {
    const newChecked = new Map<string, ChecklistItem>();
    equipmentItems?.forEach((item) => newChecked.set(item.id, { equipmentId: item.id, quantity: 1 }));
    setCheckedItems(newChecked);
  };

  const handleDeselectAll = () => setCheckedItems(new Map());

  if (loadingItems) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!equipmentItems || equipmentItems.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
        <p className="text-muted-foreground">Tidak ada perlengkapan yang sesuai untuk jamaah ini</p>
      </div>
    );
  }

  const distributedCount = checkedItems.size;
  const totalCount = equipmentItems.length;
  const progressPercentage = (distributedCount / totalCount) * 100;

  const lowStockItems = equipmentItems.filter((item) => {
    const isChecked = checkedItems.has(item.id);
    const qty = checkedItems.get(item.id)?.quantity || 0;
    return isChecked && qty > (item.stock_quantity || 0);
  });

  const genderLabel = jamaahGender === 'male' ? 'Laki-laki' : jamaahGender === 'female' ? 'Perempuan' : jamaahType === 'child' ? 'Anak' : '';

  return (
    <div className="space-y-4">
      {/* Gender info */}
      {genderLabel && (
        <Badge variant="outline" className="text-xs">{genderLabel} — item disesuaikan</Badge>
      )}

      {/* Summary */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">Perlengkapan</p>
              <p className="text-2xl font-bold">{distributedCount}/{totalCount}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{Math.round(progressPercentage)}%</p>
              <p className="text-xs text-muted-foreground">Selesai</p>
            </div>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </CardContent>
      </Card>

      {lowStockItems.length > 0 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900 text-sm">Stok Rendah</p>
              <p className="text-xs text-amber-800 mt-1">{lowStockItems.map(i => i.name).join(", ")}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={distributedCount === totalCount}>Pilih Semua</Button>
        <Button variant="outline" size="sm" onClick={handleDeselectAll} disabled={distributedCount === 0}>Hapus Semua</Button>
      </div>

      <div className="grid gap-3 max-h-[400px] overflow-y-auto">
        {equipmentItems.map((item) => {
          const isChecked = checkedItems.has(item.id);
          const quantity = checkedItems.get(item.id)?.quantity || 1;
          const hasLowStock = isChecked && quantity > (item.stock_quantity || 0);
          const cat = item.category || 'general';
          const catEmoji = cat === 'male_only' ? '♂' : cat === 'female_only' ? '♀' : cat === 'child_only' ? '👶' : '';

          return (
            <Card
              key={item.id}
              className={`cursor-pointer transition-all ${isChecked ? "bg-green-50 border-green-300" : "hover:border-primary"} ${hasLowStock ? "border-amber-300" : ""}`}
              onClick={() => handleCheckItem(item.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Checkbox checked={isChecked} onChange={() => handleCheckItem(item.id)} className="h-6 w-6 cursor-pointer" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                      <p className="font-semibold truncate">{catEmoji} {item.name}</p>
                    </div>
                    {item.description && <p className="text-sm text-muted-foreground truncate">{item.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={`text-xs ${(item.stock_quantity || 0) === 0 ? "bg-red-100 text-red-800 border-red-300" : (item.stock_quantity || 0) <= 3 ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-green-100 text-green-800 border-green-300"}`}>
                      Stok: {item.stock_quantity || 0}
                    </Badge>
                    {isChecked && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Qty:</span>
                        <Input type="number" min={1} max={item.stock_quantity || 1} value={quantity}
                          onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                          onClick={(e) => e.stopPropagation()} className="w-16 h-7 text-xs" />
                      </div>
                    )}
                  </div>
                  {isChecked && <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose} disabled={isSaving || saveMutation.isPending}>Tutup</Button>
        <Button onClick={() => setShowConfirmDialog(true)} disabled={isSaving || saveMutation.isPending || distributedCount === 0} className="flex-1">
          {isSaving || saveMutation.isPending ? "Menyimpan..." : "Simpan Distribusi"}
        </Button>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Penyimpanan</AlertDialogTitle>
            <AlertDialogDescription>
              Simpan distribusi untuk {jamaahName} ({distributedCount} item)?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 p-3 bg-muted rounded-md">
            <p className="text-sm font-medium">Ringkasan:</p>
            <ul className="text-xs mt-2 space-y-1">
              {Array.from(checkedItems.entries()).map(([eqId, item]) => {
                const eq = allEquipmentItems?.find(e => e.id === eqId);
                return <li key={eqId}>{eq?.name} ({item.quantity}x)</li>;
              })}
            </ul>
          </div>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
