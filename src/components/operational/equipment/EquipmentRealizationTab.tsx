import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Package, Users, Box, TrendingUp, Info } from "lucide-react";

interface EquipmentRealizationTabProps {
  selectedPackage?: string;
  selectedDeparture?: string;
}

interface EquipmentRealizationData {
  equipment_id: string;
  equipment_name: string;
  equipment_category: string;
  total_prepared: number; // stok awal + terdistribusi
  distributed_count: number; // jumlah jamaah yang menerima
  distributed_quantity: number; // jumlah item terdistribusi
  remaining_stock: number; // sisa stok
  distribution_percentage: number;
}

export function EquipmentRealizationTab({
  selectedPackage,
  selectedDeparture,
}: EquipmentRealizationTabProps) {
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Fetch realization data
  const { data: realizationData, isLoading } = useQuery({
    queryKey: ["equipment-realization-global", selectedPackage, selectedDeparture],
    queryFn: async () => {
      // Get all equipment items
      const { data: items, error: itemsError } = await supabase
        .from("equipment_items")
        .select("id, name, category, stock_quantity")
        .order("name");

      if (itemsError) throw itemsError;

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

        realizationMap.set(item.id, {
          equipment_id: item.id,
          equipment_name: item.name,
          equipment_category: item.category || "general",
          total_prepared: totalPrepared,
          distributed_count: uniqueCustomers,
          distributed_quantity: distributedQuantity,
          remaining_stock: item.stock_quantity || 0,
          distribution_percentage: distributionPercentage,
        });
      });

      return Array.from(realizationMap.values());
    },
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

      {/* Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Filter Kategori:</label>
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
