import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, CheckCircle2, Package, RotateCcw, ListChecks } from "lucide-react";
import { toast } from "sonner";

interface EquipmentItem {
  id: string;
  name: string;
  description?: string;
  stock_quantity?: number;
  category?: string;
  low_stock_threshold?: number;
}

interface ExistingDistribution {
  equipment_id: string;
  status: string;
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
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (existingDistributions) {
      // Pre-check both distributed AND queued items
      setCheckedItems(new Set(existingDistributions.map((d) => d.equipment_id)));
    }
  }, [existingDistributions, selectedCustomerId, selectedDepartureId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const existingMap = new Map(existingDistributions.map((d) => [d.equipment_id, d.status]));

      // Items newly checked (not in existing at all)
      const itemsToAdd = Array.from(checkedItems).filter((id) => !existingMap.has(id));

      // Items that are in queued status but now being confirmed as distributed
      const queuedToDistribute = Array.from(checkedItems).filter(
        (id) => existingMap.get(id) === "queued"
      );

      // Items unchecked that were distributed or queued
      const itemsToRemove = Array.from(existingMap.keys()).filter((id) => !checkedItems.has(id));

      // 1. Upgrade queued → distributed (no stock deduction, already reserved)
      for (const equipmentId of queuedToDistribute) {
        const { error } = await supabase
          .from("equipment_distributions")
          .update({
            status: "distributed",
            distributed_at: new Date().toISOString(),
          })
          .eq("customer_id", selectedCustomerId)
          .eq("departure_id", selectedDepartureId)
          .eq("equipment_id", equipmentId)
          .eq("status", "queued");
        if (error) throw error;
      }

      // 2. Handle brand-new additions via RPC (deducts stock)
      if (itemsToAdd.length > 0) {
        const distributions = itemsToAdd.map((id) => ({
          equipment_id: id,
          customer_id: selectedCustomerId,
          quantity: 1,
        }));

        const { error } = await supabase.rpc("bulk_distribute_equipment", {
          p_departure_id: selectedDepartureId,
          p_distributions: distributions,
        });
        if (error) throw error;
      }

      // 3. Handle removals (return distributed, cancel queued)
      for (const equipmentId of itemsToRemove) {
        const existingStatus = existingMap.get(equipmentId);

        if (existingStatus === "queued") {
          // Cancel queued item — just delete or mark as pending
          const { error } = await supabase
            .from("equipment_distributions")
            .update({ status: "pending" })
            .eq("customer_id", selectedCustomerId)
            .eq("departure_id", selectedDepartureId)
            .eq("equipment_id", equipmentId)
            .eq("status", "queued");
          if (error) throw error;
        } else if (existingStatus === "distributed") {
          const { data: dist, error: fetchError } = await supabase
            .from("equipment_distributions")
            .select("id, quantity")
            .eq("customer_id", selectedCustomerId)
            .eq("departure_id", selectedDepartureId)
            .eq("equipment_id", equipmentId)
            .eq("status", "distributed")
            .single();

          if (fetchError) throw fetchError;

          const { error: updateError } = await supabase
            .from("equipment_distributions")
            .update({
              status: "returned",
              returned_at: new Date().toISOString(),
            })
            .eq("id", dist.id);

          if (updateError) throw updateError;

          const { error: rpcError } = await supabase.rpc("increment_equipment_stock", {
            item_id: equipmentId,
            amount: dist.quantity || 1,
          });
          if (rpcError) throw rpcError;
        }
      }
    },
    onSuccess: () => {
      toast.success("Perubahan berhasil disimpan");
      queryClient.invalidateQueries({ queryKey: ["equipment-distributions"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-items"] });
      queryClient.invalidateQueries({ queryKey: ["customer-distributions", selectedCustomerId, selectedDepartureId] });
      queryClient.invalidateQueries({ queryKey: ["distribution-summary"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-readiness"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-readiness-overall"] });
    },
    onError: (error) => {
      toast.error(`Gagal menyimpan: ${error.message}`);
    },
  });

  const handleToggle = (id: string) => {
    const item = equipmentItems.find((i) => i.id === id);
    const isChecked = checkedItems.has(id);
    const existingStatus = existingDistributions.find((d) => d.equipment_id === id)?.status;

    // Allow unchecking queued items; only check stock for new items
    if (!isChecked && !existingStatus && (item?.stock_quantity || 0) <= 0) {
      toast.error(`Stok ${item?.name} habis!`);
      return;
    }

    const newChecked = new Set(checkedItems);
    if (isChecked) newChecked.delete(id);
    else newChecked.add(id);
    setCheckedItems(newChecked);
  };

  const handleSelectAll = () => {
    const newChecked = new Set(checkedItems);
    let skipped = 0;
    equipmentItems.forEach((item) => {
      if (!newChecked.has(item.id)) {
        const existingStatus = existingDistributions.find((d) => d.equipment_id === item.id)?.status;
        // Can select queued items (no stock needed) or items with stock
        if (existingStatus === "queued" || (item.stock_quantity || 0) > 0) {
          newChecked.add(item.id);
        } else {
          skipped++;
        }
      }
    });
    if (skipped > 0) toast.warning(`${skipped} item dilewati karena stok habis`);
    setCheckedItems(newChecked);
  };

  const handleDeselectAll = () => setCheckedItems(new Set());

  const handleReturnAll = () => {
    setCheckedItems(new Set());
    toast.info("Semua perlengkapan ditandai untuk dikembalikan (retur)");
  };

  const existingMap = new Map(existingDistributions.map((d) => [d.equipment_id, d.status]));

  const hasChanges =
    Array.from(checkedItems).some((id) => !existingMap.has(id) || existingMap.get(id) === "queued") ||
    Array.from(existingMap.keys()).some((id) => !checkedItems.has(id));

  const distributedCount = checkedItems.size;
  const totalCount = equipmentItems.length;
  const queuedCount = existingDistributions.filter((d) => d.status === "queued").length;
  const progressPercentage = totalCount > 0 ? (distributedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Progress card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Perlengkapan Terdistribusi</p>
              <p className="text-2xl font-bold text-blue-600">
                {distributedCount}/{totalCount}
              </p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-sm font-medium">{Math.round(progressPercentage)}%</p>
              {queuedCount > 0 && (
                <div className="flex items-center gap-1 justify-end">
                  <ListChecks className="h-3 w-3 text-purple-600" />
                  <span className="text-[10px] text-purple-600 font-medium">
                    {queuedCount} antrian
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            className="flex-1 sm:flex-none"
          >
            Pilih Semua
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReturnAll}
            className="flex-1 sm:flex-none text-destructive hover:text-destructive hover:bg-destructive/5"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Retur Semua
          </Button>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!hasChanges || saveMutation.isPending}
          className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Simpan Distribusi
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {equipmentItems.map((item) => {
          const isChecked = checkedItems.has(item.id);
          const existingStatus = existingMap.get(item.id);
          const isQueued = existingStatus === "queued";
          const isDistributed = existingStatus === "distributed";
          const stock = item.stock_quantity || 0;
          const threshold = item.low_stock_threshold || 5;
          const isLow = stock <= threshold && stock > 0;
          const isOut = stock === 0 && !isQueued && !isDistributed;

          return (
            <Card
              key={item.id}
              className={`cursor-pointer transition-all border-2 ${
                isChecked && isQueued
                  ? "border-purple-400 bg-purple-50/50"
                  : isChecked
                  ? "border-primary bg-primary/5"
                  : isOut
                  ? "bg-muted/50 opacity-60 border-transparent"
                  : "border-transparent hover:border-muted"
              }`}
              onClick={() => handleToggle(item.id)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <Checkbox checked={isChecked} className="h-5 w-5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium text-sm truncate">{item.name}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {isQueued ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] h-4 bg-purple-50 text-purple-700 border-purple-200"
                      >
                        Antrian Otomatis
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className={`text-[10px] h-4 ${
                          isOut
                            ? "bg-red-50 text-red-700 border-red-200"
                            : isLow
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-green-50 text-green-700 border-green-200"
                        }`}
                      >
                        Stok: {stock}
                      </Badge>
                    )}
                    {isLow && !isQueued && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                  </div>
                </div>
                {/* Status badges */}
                {isChecked && isQueued && (
                  <Badge className="bg-purple-500 text-white text-[10px] h-4">Konfirmasi</Badge>
                )}
                {isChecked && !existingMap.has(item.id) && (
                  <Badge className="bg-green-500 text-white text-[10px] h-4">Baru</Badge>
                )}
                {!isChecked && isDistributed && (
                  <Badge variant="outline" className="text-destructive border-destructive/30 text-[10px] h-4 flex gap-1">
                    <RotateCcw className="h-2 w-2" /> Retur
                  </Badge>
                )}
                {!isChecked && isQueued && (
                  <Badge variant="outline" className="text-gray-500 border-gray-300 text-[10px] h-4">
                    Batal
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
