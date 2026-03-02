import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Barcode, X, LogOut, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EquipmentItem {
  id: string;
  name: string;
  stock_quantity: number;
}

interface KioskModeProps {
  onExit: () => void;
}

export function KioskMode({ onExit }: KioskModeProps) {
  const queryClient = useQueryClient();
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [scannedCustomerId, setScannedCustomerId] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch equipment items
  const { data: equipmentItems = [] } = useQuery({
    queryKey: ["equipment-items-kiosk"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_items")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as EquipmentItem[];
    },
  });

  // Fetch customer details
  const { data: customerData } = useQuery({
    queryKey: ["customer-kiosk", scannedCustomerId],
    queryFn: async () => {
      if (!scannedCustomerId) return null;
      const { data, error } = await supabase
        .from("customers")
        .select("id, full_name")
        .eq("id", scannedCustomerId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!scannedCustomerId,
  });

  // Mutation for distributing equipment
  const distributeMutation = useMutation({
    mutationFn: async () => {
      if (!scannedCustomerId || selectedEquipment.size === 0) {
        throw new Error("Pilih minimal satu item perlengkapan");
      }

      const distributions = Array.from(selectedEquipment).map(equipmentId => ({
        equipment_id: equipmentId,
        customer_id: scannedCustomerId,
        quantity: 1,
        status: "distributed",
        distributed_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("equipment_distributions")
        .insert(distributions);

      if (error) throw error;

      // Update stock quantities
      for (const equipmentId of selectedEquipment) {
        const item = equipmentItems.find(e => e.id === equipmentId);
        if (item) {
          await supabase
            .from("equipment_items")
            .update({ stock_quantity: (item.stock_quantity || 0) - 1 })
            .eq("id", equipmentId);
        }
      }
    },
    onSuccess: () => {
      toast.success(`✅ Perlengkapan berhasil didistribusikan ke ${customerData?.full_name}`);
      queryClient.invalidateQueries({ queryKey: ["equipment-items-kiosk"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-distributions"] });
      resetForm();
    },
    onError: (error) => toast.error(`❌ ${error.message}`),
  });

  const handleBarcodeInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && e.currentTarget.value.trim()) {
      const code = e.currentTarget.value.trim();
      setScannedCustomerId(code);
      e.currentTarget.value = "";
      e.currentTarget.focus();
    }
  };

  const toggleEquipment = (equipmentId: string) => {
    const newSelected = new Set(selectedEquipment);
    if (newSelected.has(equipmentId)) {
      newSelected.delete(equipmentId);
    } else {
      newSelected.add(equipmentId);
    }
    setSelectedEquipment(newSelected);
  };

  const resetForm = () => {
    setScannedCustomerId("");
    setSelectedEquipment(new Set());
    barcodeInputRef.current?.focus();
  };

  const handleDistribute = async () => {
    setIsProcessing(true);
    try {
      await distributeMutation.mutateAsync();
    } finally {
      setIsProcessing(false);
    }
  };

  const criticalStockItems = equipmentItems.filter(i => (i.stock_quantity || 0) < 5);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 to-slate-800 z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center shadow-lg">
        <div>
          <h1 className="text-3xl font-bold">Mode Distribusi Layar Penuh</h1>
          <p className="text-blue-100 text-sm mt-1">Sistem Kasir Perlengkapan Jamaah</p>
        </div>
        <Button 
          variant="ghost" 
          className="text-white hover:bg-blue-600 text-lg h-auto py-2 px-4"
          onClick={onExit}
        >
          <LogOut className="h-5 w-5 mr-2" />
          Keluar
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto flex gap-6 p-6">
        {/* Left Panel: Barcode Scanner & Customer Info */}
        <div className="w-1/3 space-y-4 flex flex-col">
          {/* Barcode Input - Large and Prominent */}
          <Card className="border-2 border-blue-400 bg-white shadow-xl">
            <CardHeader className="bg-blue-50 pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Barcode className="h-6 w-6 text-blue-600" />
                Scan Barcode Jamaah
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <Input
                ref={barcodeInputRef}
                type="text"
                placeholder="Arahkan scanner ke barcode..."
                onKeyDown={handleBarcodeInput}
                className="text-2xl font-mono p-4 h-16 border-2 border-blue-300 focus:border-blue-600"
                autoComplete="off"
                autoFocus
              />
              {scannedCustomerId && (
                <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                  <p className="text-xs text-green-700 font-semibold">BARCODE TERSCAN</p>
                  <p className="text-lg font-mono text-green-800 mt-1">{scannedCustomerId}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Info */}
          {customerData && (
            <Card className="border-2 border-green-400 bg-green-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Data Jamaah
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-green-900">{customerData.full_name}</p>
                  <p className="text-xs text-green-700">ID: {customerData.id}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Critical Stock Alert */}
          {criticalStockItems.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                ⚠️ {criticalStockItems.length} item stok kritis! Segera pesan ulang.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 mt-auto pt-4">
            <Button 
              size="lg"
              className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700"
              onClick={handleDistribute}
              disabled={!scannedCustomerId || selectedEquipment.size === 0 || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Distribusi ({selectedEquipment.size})
                </>
              )}
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="w-full h-14 text-lg font-bold"
              onClick={resetForm}
            >
              <X className="h-5 w-5 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        {/* Right Panel: Equipment Selection Grid */}
        <div className="flex-1 flex flex-col">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white mb-2">Pilih Perlengkapan</h2>
            <p className="text-gray-300 text-sm">
              Klik tombol untuk memilih perlengkapan yang akan didistribusikan ({selectedEquipment.size} dipilih)
            </p>
          </div>

          {/* Equipment Grid */}
          <div className="flex-1 overflow-auto grid grid-cols-2 gap-4 pr-4">
            {equipmentItems.map((item) => {
              const isSelected = selectedEquipment.has(item.id);
              const isOutOfStock = (item.stock_quantity || 0) === 0;

              return (
                <button
                  key={item.id}
                  onClick={() => !isOutOfStock && toggleEquipment(item.id)}
                  disabled={isOutOfStock}
                  className={cn(
                    "p-4 rounded-lg border-2 transition-all transform hover:scale-105 active:scale-95 text-left",
                    isSelected
                      ? "bg-blue-600 border-blue-400 text-white shadow-lg"
                      : "bg-white border-gray-300 text-gray-900 hover:border-blue-400",
                    isOutOfStock && "opacity-50 cursor-not-allowed hover:scale-100"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-bold text-lg">{item.name}</p>
                      <p className={cn(
                        "text-sm mt-1",
                        isSelected ? "text-blue-100" : "text-gray-600"
                      )}>
                        Stok: {item.stock_quantity || 0}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="bg-white rounded-full p-1">
                        <CheckCircle2 className="h-6 w-6 text-blue-600" />
                      </div>
                    )}
                  </div>
                  {isOutOfStock && (
                    <Badge variant="destructive" className="mt-2">Habis</Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
