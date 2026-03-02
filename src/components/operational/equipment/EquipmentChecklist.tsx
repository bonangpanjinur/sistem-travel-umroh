import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Package, CheckCircle2 } from "lucide-react";
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

export function EquipmentChecklist({
  equipmentItems,
  selectedCustomerId,
  selectedDepartureId,
  existingDistributions,
}: EquipmentChecklistProps) {
  const queryClient = useQueryClient();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(
    new Set(existingDistributions.map((d) => d.equipment_id))
  );
  const [isSaving, setIsSaving] = useState(false);

  // Mutation for saving distributions
  const saveMutation = useMutation({
    mutationFn: async () => {
      setIsSaving(true);
      const existingIds = new Set(existingDistributions.map((d) => d.equipment_id));
      const newCheckedIds = checkedItems;

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
        const insertData = itemsToAdd.map((equipmentId) => ({
          equipment_id: equipmentId,
          customer_id: selectedCustomerId,
          departure_id: selectedDepartureId,
          quantity: 1,
          status: "distributed",
          distributed_at: new Date().toISOString(),
        }));

        const { error: insertError } = await supabase
          .from("equipment_distributions")
          .insert(insertData);

        if (insertError) throw insertError;

        // Update stock quantities
        for (const equipmentId of itemsToAdd) {
          const item = equipmentItems.find((e) => e.id === equipmentId);
          if (item) {
            await supabase
              .from("equipment_items")
              .update({
                stock_quantity: (item.stock_quantity || 0) - 1,
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
      setIsSaving(false);
    },
    onError: (error) => {
      toast.error(`❌ Gagal menyimpan perlengkapan: ${error.message}`);
      setIsSaving(false);
    },
  });

  const handleCheckItem = (id: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.add(id);
    }
    setCheckedItems(newChecked);
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
                {Math.round((distributedCount / totalCount) * 100)}%
              </p>
              <p className="text-xs text-muted-foreground">Selesai</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Items */}
      <div className="grid gap-3">
        {equipmentItems.map((item) => (
          <Card
            key={item.id}
            className={`cursor-pointer transition-all ${
              checkedItems.has(item.id)
                ? "bg-green-50 border-green-300"
                : "hover:border-primary"
            }`}
            onClick={() => handleCheckItem(item.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={checkedItems.has(item.id)}
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
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs">
                      Stok: {item.stock_quantity || 0}
                    </Badge>
                  </div>
                </div>
                {checkedItems.has(item.id) && (
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Save Button */}
      <div className="flex gap-2 pt-4">
        <Button
          onClick={handleSave}
          disabled={isSaving || saveMutation.isPending}
          className="flex-1"
        >
          {isSaving || saveMutation.isPending ? "Menyimpan..." : "Simpan Distribusi"}
        </Button>
      </div>
    </div>
  );
}
