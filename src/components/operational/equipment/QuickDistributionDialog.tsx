import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";

interface EquipmentItem {
  id: string;
  name: string;
  description?: string;
  stock_quantity: number;
}

interface QuickDistributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: EquipmentItem | null;
  selectedDeparture: string;
}

interface Passenger {
  id: string;
  customer_id: string;
  customer: { id: string; full_name: string };
}

export function QuickDistributionDialog({
  open,
  onOpenChange,
  item,
  selectedDeparture,
}: QuickDistributionDialogProps) {
  const queryClient = useQueryClient();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [searchPassenger, setSearchPassenger] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Fetch passengers for selected departure
  const { data: passengers, isLoading: loadingPassengers } = useQuery({
    queryKey: ["passengers-for-quick-dist", selectedDeparture],
    queryFn: async () => {
      if (selectedDeparture === "all" || !selectedDeparture) return [];
      
      const { data, error } = await supabase
        .from("booking_passengers")
        .select(`
          id,
          customer_id,
          customer:customers(id, full_name)
        `)
        .eq("booking.departure_id", selectedDeparture)
        .order("customer.full_name");
      
      if (error) throw error;
      return data as Passenger[];
    },
    enabled: open && selectedDeparture !== "all" && !!selectedDeparture,
  });

  // Filter passengers based on search
  const filteredPassengers = passengers?.filter((p) =>
    p.customer.full_name.toLowerCase().includes(searchPassenger.toLowerCase())
  ) || [];

  // Distribute equipment mutation
  const distributeMutation = useMutation({
    mutationFn: async () => {
      if (!item || !selectedCustomerId || quantity <= 0) {
        throw new Error("Data tidak lengkap");
      }

      if (quantity > item.stock_quantity) {
        throw new Error("Stok tidak cukup");
      }

      // Insert distribution record
      const { error: insertError } = await supabase
        .from("equipment_distributions")
        .insert({
          equipment_id: item.id,
          customer_id: selectedCustomerId,
          departure_id: selectedDeparture !== "all" ? selectedDeparture : null,
          quantity,
          status: "distributed",
          distributed_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // Update stock quantity
      const { error: updateError } = await supabase
        .from("equipment_items")
        .update({ stock_quantity: item.stock_quantity - quantity })
        .eq("id", item.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      const passenger = passengers?.find((p) => p.customer_id === selectedCustomerId);
      toast.success(
        `✅ ${item?.name} (${quantity}x) berhasil didistribusikan ke ${passenger?.customer.full_name}`
      );
      queryClient.invalidateQueries({ queryKey: ["equipment-distributions"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-items"] });
      queryClient.invalidateQueries({ queryKey: ["customer-distributions"] });
      
      // Reset form
      setSelectedCustomerId("");
      setQuantity(1);
      setSearchPassenger("");
      setShowConfirmDialog(false);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`❌ ${error.message}`);
    },
  });

  const handleDistribute = () => {
    if (!selectedCustomerId) {
      toast.error("Pilih jamaah terlebih dahulu");
      return;
    }
    if (quantity <= 0 || quantity > (item?.stock_quantity || 0)) {
      toast.error("Jumlah tidak valid");
      return;
    }
    setShowConfirmDialog(true);
  };

  const selectedPassenger = passengers?.find((p) => p.customer_id === selectedCustomerId);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Distribusi Cepat: {item?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Stok Info */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-900">Stok Tersedia</p>
              <p className="text-2xl font-bold text-blue-600">{item?.stock_quantity || 0} unit</p>
            </div>

            {/* Passenger Search and Selection */}
            <div className="space-y-2">
              <Label>Cari Jamaah</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ketik nama jamaah..."
                  value={searchPassenger}
                  onChange={(e) => setSearchPassenger(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Passenger Selection */}
            <div className="space-y-2">
              <Label>Pilih Jamaah</Label>
              {loadingPassengers ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : filteredPassengers.length > 0 ? (
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jamaah..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredPassengers.map((passenger) => (
                      <SelectItem key={passenger.id} value={passenger.customer_id}>
                        {passenger.customer.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground text-center">
                  {searchPassenger
                    ? "Tidak ada jamaah yang cocok"
                    : "Tidak ada jamaah untuk keberangkatan ini"}
                </div>
              )}
            </div>

            {/* Quantity Input */}
            <div className="space-y-2">
              <Label>Jumlah</Label>
              <Input
                type="number"
                min={1}
                max={item?.stock_quantity || 1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              />
              <p className="text-xs text-muted-foreground">
                Maksimal: {item?.stock_quantity || 0} unit
              </p>
            </div>

            {/* Selected Passenger Summary */}
            {selectedPassenger && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-900">Ringkasan</p>
                <p className="text-sm text-green-800 mt-1">
                  {item?.name} ({quantity}x) → <strong>{selectedPassenger.customer.full_name}</strong>
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setSelectedCustomerId("");
                setQuantity(1);
                setSearchPassenger("");
              }}
            >
              Batal
            </Button>
            <Button
              onClick={handleDistribute}
              disabled={!selectedCustomerId || distributeMutation.isPending}
            >
              {distributeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Distribusi"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Distribusi</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan mendistribusikan <strong>{item?.name}</strong> sebanyak <strong>{quantity}x</strong> kepada{" "}
              <strong>{selectedPassenger?.customer.full_name}</strong>. Stok akan berkurang secara otomatis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 p-3 bg-amber-50 rounded-md border border-amber-200">
            <p className="text-sm font-medium text-amber-900">Stok Setelah Distribusi</p>
            <p className="text-lg font-bold text-amber-600 mt-1">
              {(item?.stock_quantity || 0) - quantity} unit
            </p>
          </div>
          <div className="flex gap-3">
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => distributeMutation.mutate()}
              disabled={distributeMutation.isPending}
            >
              {distributeMutation.isPending ? "Memproses..." : "Konfirmasi Distribusi"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
