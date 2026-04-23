import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Package, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface EquipmentItem {
  id: string;
  name: string;
  description?: string;
  stock_quantity?: number;
}

interface ExistingDistribution {
  equipment_id: string;
}

interface EquipmentChecklistProps {
  equipmentItems: EquipmentItem[];
  selectedCustomerId: string;
  selectedDepartureId: string;
  existingDistributions: ExistingDistribution[];
}

interface ChecklistItem {
  equipmentId: string;
  quantity: number;
}

export function EquipmentChecklist({
  equipmentItems,
  selectedCustomerId,
  selectedDepartureId,
  existingDistributions,
}: EquipmentChecklistProps) {
  const queryClient = useQueryClient();
  const [checkedItems, setCheckedItems] = useState<Map<string, ChecklistItem>>(
    new Map(existingDistributions.map((d) => [d.equipment_id, { equipmentId: d.equipment_id, quantity: 1 }]))
  );
  const [isSaving, setIsSaving] = useState(false);

  // Mutation for saving distributions
  const saveMutation = useMutation({
    mutationFn: async () => {
      setIsSaving(true);
      const existingIds = new Set(existingDistributions.map((d) => d.equipment_id));
      const newCheckedIds = new Set(checkedItems.keys());

      // Items to add (newly checked)
      const itemsToAdd = Array.from(newCheckedIds).filter(
        (id) => !existingIds.has(id)
      );

      // Items to remove (unchecked)
      const itemsToRemove = Array.from(existingIds).filter(
        (id) => !newCheckedIds.has(id)
      );

      // Insert new distributions
      if (itemsToAdd.length > 0) {
        const insertData = itemsToAdd.map((equipmentId) => {
          const checklistItem = checkedItems.get(equipmentId);
          return {
            equipment_id: equipmentId,
            customer_id: selectedCustomerId,
            departure_id: selectedDepartureId,
            quantity: checklistItem?.quantity || 1,
            status: "distributed",
            distributed_at: new Date().toISOString(),
          };
        });

        const { error: insertError } = await supabase
          .from("equipment_distributions")
          .insert(insertData);

        if (insertError) throw insertError;

        // Update stock quantities
        for (const equipmentId of itemsToAdd) {
          const item = equipmentItems.find((e) => e.id === equipmentId);
          const checklistItem = checkedItems.get(equipmentId);
          const quantity = checklistItem?.quantity || 1;
          if (item) {
            await supabase
              .from("equipment_items")
              .update({
                stock_quantity: (item.stock_quantity || 0) - quantity,
              })
              .eq("id", equipmentId);
          }
        }
      }

      // Delete removed distributions
      if (itemsToRemove.length > 0) {
        for (const equipmentId of itemsToRemove) {
          const { data: distData } = await supabase
            .from("equipment_distributions")
            .select("id, quantity")
            .eq("equipment_id", equipmentId)
            .eq("customer_id", selectedCustomerId)
            .eq("departure_id", selectedDepartureId)
            .eq("status", "distributed")
            .single();

          if (distData) {
            await supabase
              .from("equipment_distributions")
              .delete()
              .eq("id", distData.id);

            // Restore stock quantity
            const item = equipmentItems.find((e) => e.id === equipmentId);
            if (item) {
              await supabase
                .from("equipment_items")
                .update({
                  stock_quantity: (item.stock_quantity || 0) + (distData.quantity || 1),
                })
                .eq("id", equipmentId);
            }
          }
        }
      }
    },
    onSuccess: () => {
      toast.success("✅ Perlengkapan berhasil disimpan");
      queryClient.invalidateQueries({ queryKey: ["equipment-distributions"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-items"] });
      queryClient.invalidateQueries({
        queryKey: ["customer-distributions", selectedCustomerId, selectedDepartureId],
      });
      queryClient.invalidateQueries({ queryKey: ["distribution-summary"] });
      setIsSaving(false);
    },
    onError: (error) => {
      toast.error(`❌ Gagal menyimpan perlengkapan: ${error.message}`);
      setIsSaving(false);
    },
  });

  const handleCheckItem = (id: string) => {
    const newChecked = new Map(checkedItems);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.set(id, { equipmentId: id, quantity: 1 });
    }
    setCheckedItems(newChecked);
  };

  const handleQuantityChange = (id: string, quantity: number) => {
    const newChecked = new Map(checkedItems);
    const item = equipmentItems.find((e) => e.id === id);
    const maxQuantity = item?.stock_quantity || 1;

    if (quantity > 0 && quantity <= maxQuantity) {
      if (newChecked.has(id)) {
        newChecked.set(id, { equipmentId: id, quantity });
      }
      setCheckedItems(newChecked);
    }
  };

  const handleSelectAll = () => {
    const newChecked = new Map<string, ChecklistItem>();
    equipmentItems.forEach((item) => {
      newChecked.set(item.id, { equipmentId: item.id, quantity: 1 });
    });
    setCheckedItems(newChecked);
  };

  const handleDeselectAll = () => {
    setCheckedItems(new Map());
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  if (equipmentItems.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
        <p className="text-muted-foreground">Tidak ada perlengkapan yang tersedia</p>
      </div>
    );
  }

  const distributedCount = checkedItems.size;
  const totalCount = equipmentItems.length;
  const progressPercentage = (distributedCount / totalCount) * 100;

  // Check for low stock items
  const lowStockItems = equipmentItems.filter((item) => {
    const isChecked = checkedItems.has(item.id);
    const checklistItem = checkedItems.get(item.id);
    const requestedQuantity = checklistItem?.quantity || 0;
    return isChecked && requestedQuantity > (item.stock_quantity || 0);
  });

  const hasLowStockWarning = lowStockItems.length > 0;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Perlengkapan Terdistribusi</p>
              <p className="text-2xl font-bold text-blue-600">
                {distributedCount}/{totalCount}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {Math.round(progressPercentage)}%
              </p>
              <p className="text-xs text-muted-foreground">Selesai</p>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="mt-3 w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Low Stock Warning */}
      {hasLowStockWarning && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 text-sm">Peringatan Stok Rendah</p>
                <p className="text-xs text-amber-800 mt-1">
                  {lowStockItems.map((item) => item.name).join(", ")} memiliki stok yang tidak cukup.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSelectAll}
          disabled={distributedCount === totalCount}
        >
          Pilih Semua
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDeselectAll}
          disabled={distributedCount === 0}
        >
          Hapus Semua
        </Button>
      </div>

      {/* Equipment Items */}
      <div className="grid gap-3">
        {equipmentItems.map((item) => {
          const isChecked = checkedItems.has(item.id);
          const checklistItem = checkedItems.get(item.id);
          const quantity = checklistItem?.quantity || 1;
          const hasLowStock = isChecked && quantity > (item.stock_quantity || 0);

          return (
            <Card
              key={item.id}
              className={`cursor-pointer transition-all ${
                isChecked
                  ? "bg-green-50 border-green-300"
                  : "hover:border-primary"
              } ${hasLowStock ? "border-amber-300" : ""}`}
              onClick={() => handleCheckItem(item.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={isChecked}
                    onChange={() => handleCheckItem(item.id)}
                    className="h-6 w-6 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <p className="font-semibold truncate">{item.name}</p>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {item.description}
                      </p>
                    )}
                    <div className="mt-2 flex gap-2 items-center flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          (item.stock_quantity || 0) === 0
                            ? "bg-red-100 text-red-800 border-red-300"
                            : (item.stock_quantity || 0) <= 3
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : "bg-green-100 text-green-800 border-green-300"
                        }`}
                      >
                        Stok: {item.stock_quantity || 0}
                      </Badge>
                      {isChecked && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">Qty:</span>
                          <Input
                            type="number"
                            min={1}
                            max={item.stock_quantity || 1}
                            value={quantity}
                            onChange={(e) =>
                              handleQuantityChange(item.id, parseInt(e.target.value) || 1)
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="w-16 h-7 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  {isChecked && (
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="flex gap-2 pt-4">
        <Button
          onClick={handleSave}
          disabled={isSaving || saveMutation.isPending || distributedCount === 0}
          className="flex-1"
        >
          {isSaving || saveMutation.isPending ? "Menyimpan..." : "Simpan Distribusi"}
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Penyimpanan</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menyimpan distribusi perlengkapan untuk {distributedCount} item. Stok akan dikurangi secara otomatis. Lanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm font-medium text-blue-900">Ringkasan Perubahan:</p>
            <ul className="text-xs text-blue-800 mt-2 space-y-1">
              {Array.from(checkedItems.entries()).map(([equipmentId, item]) => {
                const equipment = equipmentItems.find((e) => e.id === equipmentId);
                return (
                  <li key={equipmentId}>
                    • {equipment?.name}: {item.quantity}x
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="flex gap-3">
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => saveMutation.mutate()}
              disabled={isSaving || saveMutation.isPending}
            >
              {isSaving || saveMutation.isPending ? "Menyimpan..." : "Konfirmasi"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
