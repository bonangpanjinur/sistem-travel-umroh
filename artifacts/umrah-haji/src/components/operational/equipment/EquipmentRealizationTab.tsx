import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Package, Users, Box, TrendingUp, Info, ArrowUpFromLine } from "lucide-react";
import { toast } from "sonner";

interface EquipmentRealizationTabProps {
  selectedPackage?: string;
  selectedDeparture?: string;
}

interface EquipmentRealizationData {
  equipment_id: string;
  equipment_name: string;
  equipment_category: string;
  unit_cost: number;
  total_prepared: number; // stok awal + terdistribusi
  distributed_count: number; // jumlah jamaah yang menerima
  distributed_quantity: number; // jumlah item terdistribusi
  remaining_stock: number; // sisa stok
  distribution_percentage: number;
  total_cost: number; // unit_cost × distributed_quantity
}

export function EquipmentRealizationTab({
  selectedPackage,
  selectedDeparture,
}: EquipmentRealizationTabProps) {
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [isImporting, setIsImporting] = useState(false);
  const queryClient = useQueryClient();

  // Fetch realization data
  const { data: realizationData, isLoading, error } = useQuery({
    queryKey: ["equipment-realization-global", selectedPackage, selectedDeparture],
    queryFn: async () => {
      // Check if table exists first
      const { data: tableCheck, error: tableError } = await supabase
        .from("equipment_items")
        .select("id")
        .limit(1);
      
      if (tableError) {
        console.error("equipment_items table error:", tableError);
        throw new Error(`equipment_items: ${tableError.message}`);
      }

      // Get all equipment items (including unit_cost for HPP calculation)
      const { data: items, error: itemsError } = await supabase
        .from("equipment_items")
        .select("id, name, category, stock_quantity, unit_cost")
        .order("name");

      if (itemsError) {
        console.error("equipment_items query error:", itemsError);
        throw itemsError;
      }

      // Build distribution query
      let distQuery = supabase
        .from("equipment_distributions")
        .select("equipment_id, customer_id, quantity, status, departure_id")
        .eq("status", "distributed");

      // Filter by departure if selected, otherwise show global
      if (selectedDeparture) {
        distQuery = distQuery.eq("departure_id", selectedDeparture);
      } else if (selectedPackage) {
        // If only package selected, we might want to filter by departures of that package
        // But the user said "langsung aja" (just show it), so we'll show global or by package if needed.
        // To filter by package, we'd need to join with departures table.
        // For now, let's keep it global unless a specific departure is picked, 
        // OR we can fetch departures for this package and filter by those IDs.
        const { data: pkgDepartures } = await supabase
          .from("departures")
          .select("id")
          .eq("package_id", selectedPackage);
        
        if (pkgDepartures && pkgDepartures.length > 0) {
          const depIds = pkgDepartures.map(d => d.id);
          distQuery = distQuery.in("departure_id", depIds);
        }
      }

      const { data: distributions, error: distError } = await distQuery;
      if (distError) throw distError;

      // Process data
      const realizationMap = new Map<string, EquipmentRealizationData>();

      items?.forEach((item: any) => {
        const itemDistributions = distributions?.filter(
          (d: any) => d.equipment_id === item.id
        ) || [];

        const distributedQuantity = itemDistributions.reduce(
          (sum: number, d: any) => sum + (d.quantity || 1),
          0
        );

        const uniqueCustomers = new Set(
          itemDistributions.map((d: any) => d.customer_id)
        ).size;

        const totalPrepared = (item.stock_quantity || 0) + distributedQuantity;
        const distributionPercentage =
          totalPrepared > 0 ? (distributedQuantity / totalPrepared) * 100 : 0;

        const unitCost = item.unit_cost || 0;
        realizationMap.set(item.id, {
          equipment_id: item.id,
          equipment_name: item.name,
          equipment_category: item.category || "general",
          unit_cost: unitCost,
          total_prepared: totalPrepared,
          distributed_count: uniqueCustomers,
          distributed_quantity: distributedQuantity,
          remaining_stock: item.stock_quantity || 0,
          distribution_percentage: distributionPercentage,
          total_cost: unitCost * distributedQuantity,
        });
      });

      return Array.from(realizationMap.values());
    },
  });

  // "Impor ke HPP" mutation — inserts total equipment cost as one HPP cost item
  const importToHPPMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDeparture) throw new Error("Pilih keberangkatan terlebih dahulu");
      const totalEquipmentCost = (realizationData || []).reduce(
        (sum, item) => sum + item.total_cost,
        0
      );
      if (totalEquipmentCost <= 0) throw new Error("Tidak ada biaya perlengkapan (unit_cost masih 0). Isi harga satuan perlengkapan terlebih dahulu.");

      const db = supabase as any;

      // Delete existing equipment cost item for this departure (avoid duplicates)
      await db
        .from("departure_cost_items")
        .delete()
        .eq("departure_id", selectedDeparture)
        .eq("category", "perlengkapan")
        .like("description", "%Perlengkapan Jamaah%");

      // Insert fresh total
      const { error } = await db.from("departure_cost_items").insert({
        departure_id: selectedDeparture,
        category: "perlengkapan",
        description: "Biaya Perlengkapan Jamaah (auto-import dari Equipment)",
        quantity: 1,
        unit_cost_idr: totalEquipmentCost,
        total_cost_idr: totalEquipmentCost,
        sort_order: 99,
        notes: `Dihitung dari ${(realizationData || []).length} item perlengkapan yang terdistribusi`,
      });
      if (error) throw error;

      // Trigger P&L recalculation
      await db.rpc("recalculate_departure_financial_summary", { p_departure_id: selectedDeparture });
      queryClient.invalidateQueries({ queryKey: ["departure-cost-items", selectedDeparture] });
      queryClient.invalidateQueries({ queryKey: ["departure-financial-summary", selectedDeparture] });
    },
    onSuccess: () => toast.success("Biaya perlengkapan berhasil diimpor ke HPP keberangkatan"),
    onError: (e: any) => toast.error(e.message),
  });

  // Get unique categories
  const categories = [
    { value: "all", label: "Semua Kategori" },
    { value: "general", label: "Umum" },
    { value: "male_only", label: "Khusus Laki-laki" },
    { value: "female_only", label: "Khusus Perempuan" },
    { value: "child_only", label: "Khusus Anak" },
  ];

  // Filter data
  const filteredData =
    realizationData?.filter((item) =>
      filterCategory === "all" ? true : item.equipment_category === filterCategory
    ) || [];

  // Calculate summary metrics
  const totalItems = filteredData.length;
  const totalPrepared = filteredData.reduce((sum, item) => sum + item.total_prepared, 0);
  const totalDistributed = filteredData.reduce(
    (sum, item) => sum + item.distributed_quantity,
    0
  );
  const totalRemaining = filteredData.reduce((sum, item) => sum + item.remaining_stock, 0);
  const avgDistributionPercentage =
    totalItems > 0
      ? filteredData.reduce((sum, item) => sum + item.distribution_percentage, 0) /
        totalItems
      : 0;

  const getCategoryLabel = (category: string) => {
    const cat = categories.find((c) => c.value === category);
    return cat?.label || category;
  };

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case "male_only":
        return "♂";
      case "female_only":
        return "♀";
      case "child_only":
        return "👶";
      default:
        return "📦";
    }
  };

  const getStockStatus = (remaining: number, total: number) => {
    if (remaining === 0) return { label: "Habis", color: "bg-red-100 text-red-800 border-red-200" };
    if (remaining <= Math.ceil(total * 0.1)) return { label: "Sedikit", color: "bg-amber-100 text-amber-800 border-amber-200" };
    return { label: "Tersedia", color: "bg-green-100 text-green-800 border-green-200" };
  };

  return (
    <div className="space-y-6">
      {/* Scope Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-3 text-blue-800 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-300">
        <Info className="h-5 w-5 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold">Cakupan Realisasi:</p>
          <p>
            {selectedDeparture 
              ? "Menampilkan data untuk keberangkatan terpilih." 
              : selectedPackage 
                ? "Menampilkan data akumulasi untuk semua keberangkatan dalam paket terpilih." 
                : "Menampilkan data akumulasi global untuk seluruh keberangkatan."}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950">
                <Box className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPrepared}</p>
                <p className="text-xs text-muted-foreground">Total Disiapkan</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalDistributed}</p>
                <p className="text-xs text-muted-foreground">Terdistribusi</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950">
                <Package className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalRemaining}</p>
                <p className="text-xs text-muted-foreground">Sisa Stok</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Math.round(avgDistributionPercentage)}%
                </p>
                <p className="text-xs text-muted-foreground">Rata-rata Distribusi</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950">
                <Box className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalItems}</p>
                <p className="text-xs text-muted-foreground">Jenis Item</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter + Impor ke HPP */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-4 flex-1">
              <label className="text-sm font-medium whitespace-nowrap">Filter Kategori:</label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedDeparture && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-primary/50 text-primary hover:bg-primary/5"
                onClick={() => importToHPPMutation.mutate()}
                disabled={importToHPPMutation.isPending}
              >
                {importToHPPMutation.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <ArrowUpFromLine className="h-4 w-4" />}
                Impor Biaya ke HPP
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Realization Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5" /> Ringkasan Realisasi Perlengkapan
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center text-red-500">
                <p className="font-semibold">Error memuat data perlengkapan</p>
                <p className="text-sm mt-1">{error.message}</p>
                <p className="text-xs mt-2 text-muted-foreground">
                  Pastikan tabel equipment_items dan equipment_distributions ada di database
                </p>
              </div>
            </div>
          ) : filteredData.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Item</TableHead>
                    <TableHead className="w-[100px]">Kategori</TableHead>
                    <TableHead className="text-center w-[100px]">Disiapkan</TableHead>
                    <TableHead className="text-center w-[100px]">Terdistribusi</TableHead>
                    <TableHead className="text-center w-[80px]">Jamaah</TableHead>
                    <TableHead className="text-center w-[80px]">Sisa</TableHead>
                    <TableHead className="w-[150px]">Progress</TableHead>
                    <TableHead className="text-center w-[100px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item) => {
                    const stockStatus = getStockStatus(
                      item.remaining_stock,
                      item.total_prepared
                    );

                    return (
                      <TableRow key={item.equipment_id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {getCategoryEmoji(item.equipment_category)}
                            </span>
                            <span className="font-medium">{item.equipment_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {getCategoryLabel(item.equipment_category)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {item.total_prepared}
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {item.distributed_quantity}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-xs">
                            {item.distributed_count} jamaah
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-semibold text-amber-600">
                            {item.remaining_stock}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={item.distribution_percentage}
                              className="h-2 flex-1"
                            />
                            <span className="text-xs font-medium tabular-nums w-12">
                              {Math.round(item.distribution_percentage)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={`text-xs ${stockStatus.color}`}
                          >
                            {stockStatus.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground">
                  Tidak ada data perlengkapan untuk kategori ini
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
