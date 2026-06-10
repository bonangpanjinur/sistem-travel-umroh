import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Package, Users, Box, TrendingUp, Info, ArrowUpFromLine, RefreshCcw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

interface EquipmentRealizationTabProps {
  selectedPackage?: string;
  selectedDeparture?: string;
}

interface EquipmentRealizationData {
  equipment_id: string;
  equipment_name: string;
  equipment_category: string;
  unit_cost: number;
  total_prepared: number;
  distributed_count: number;
  distributed_quantity: number;
  remaining_stock: number;
  distribution_percentage: number;
  total_cost_realized: number;
  total_cost_planned: number;
}

export function EquipmentRealizationTab({
  selectedPackage,
  selectedDeparture,
}: EquipmentRealizationTabProps) {
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const queryClient = useQueryClient();

  // INT-07: Fetch pax count dari departures.booked_count
  const { data: departureInfo } = useQuery({
    queryKey: ["departure-pax-count", selectedDeparture],
    enabled: !!selectedDeparture,
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select("booked_count, quota")
        .eq("id", selectedDeparture!)
        .single();
      return data;
    },
  });
  const paxCount = departureInfo?.booked_count || 0;

  // Fetch existing equipment cost item for this departure (dedup check)
  const { data: existingHPP } = useQuery({
    queryKey: ["existing-equipment-hpp", selectedDeparture],
    enabled: !!selectedDeparture,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("departure_cost_items")
        .select("total_cost_idr, updated_at")
        .eq("departure_id", selectedDeparture!)
        .eq("category", "perlengkapan")
        .like("description", "%Perlengkapan Jamaah%")
        .maybeSingle();
      return data;
    },
  });

  const { data: realizationData, isLoading, error } = useQuery({
    queryKey: ["equipment-realization-global", selectedPackage, selectedDeparture],
    queryFn: async () => {
      const { data: tableCheck, error: tableError } = await supabase
        .from("equipment_items")
        .select("id")
        .limit(1);
      if (tableError) throw new Error(`equipment_items: ${tableError.message}`);

      const { data: items, error: itemsError } = await supabase
        .from("equipment_items")
        .select("id, name, category, stock_quantity, unit_cost")
        .order("name");
      if (itemsError) throw itemsError;

      let distQuery = supabase
        .from("equipment_distributions")
        .select("equipment_id, customer_id, quantity, status, departure_id")
        .eq("status", "distributed");

      if (selectedDeparture) {
        distQuery = distQuery.eq("departure_id", selectedDeparture);
      } else if (selectedPackage) {
        const { data: pkgDepartures } = await supabase
          .from("departures")
          .select("id")
          .eq("package_id", selectedPackage);
        if (pkgDepartures && pkgDepartures.length > 0) {
          distQuery = distQuery.in("departure_id", pkgDepartures.map((d) => d.id));
        }
      }

      const { data: distributions, error: distError } = await distQuery;
      if (distError) throw distError;

      const realizationMap = new Map<string, EquipmentRealizationData>();
      items?.forEach((item: any) => {
        const itemDistributions = distributions?.filter((d: any) => d.equipment_id === item.id) || [];
        const distributedQuantity = itemDistributions.reduce((sum: number, d: any) => sum + (d.quantity || 1), 0);
        const uniqueCustomers = new Set(itemDistributions.map((d: any) => d.customer_id)).size;
        const totalPrepared = (item.stock_quantity || 0) + distributedQuantity;
        const distributionPercentage = totalPrepared > 0 ? (distributedQuantity / totalPrepared) * 100 : 0;
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
          total_cost_realized: unitCost * distributedQuantity,
          total_cost_planned: 0, // diisi setelah paxCount tersedia
        });
      });

      return Array.from(realizationMap.values());
    },
  });

  const categories = [
    { value: "all", label: "Semua Kategori" },
    { value: "general", label: "Umum" },
    { value: "male_only", label: "Khusus Laki-laki" },
    { value: "female_only", label: "Khusus Perempuan" },
    { value: "child_only", label: "Khusus Anak" },
  ];

  const filteredData = (realizationData || [])
    .filter((item) => filterCategory === "all" || item.equipment_category === filterCategory)
    .map((item) => ({
      ...item,
      total_cost_planned: item.unit_cost * paxCount,
    }));

  // INT-07 — totals
  const totalHPPPlanned = filteredData.reduce((s, i) => s + i.total_cost_planned, 0);
  const totalHPPRealized = filteredData.reduce((s, i) => s + i.total_cost_realized, 0);
  const totalItems = filteredData.length;
  const totalPrepared = filteredData.reduce((s, i) => s + i.total_prepared, 0);
  const totalDistributed = filteredData.reduce((s, i) => s + i.distributed_quantity, 0);
  const totalRemaining = filteredData.reduce((s, i) => s + i.remaining_stock, 0);
  const avgDistributionPct = totalItems > 0
    ? filteredData.reduce((s, i) => s + i.distribution_percentage, 0) / totalItems
    : 0;

  const existingHPPAmount = existingHPP?.total_cost_idr ?? 0;
  const hppDrift = Math.abs(existingHPPAmount - totalHPPPlanned);
  const needsSync = selectedDeparture && paxCount > 0 && hppDrift > 1000;

  // INT-07: Upsert ke departure_cost_items pakai HPP Direncanakan (pax_count × unit_cost)
  const importToHPPMutation = useMutation({
    mutationFn: async (mode: "planned" | "realized") => {
      if (!selectedDeparture) throw new Error("Pilih keberangkatan terlebih dahulu");
      const totalCost = mode === "planned" ? totalHPPPlanned : totalHPPRealized;
      if (totalCost <= 0) throw new Error(
        mode === "planned"
          ? "HPP Direncanakan = 0. Pastikan pax_count > 0 dan unit_cost item perlengkapan sudah diisi."
          : "HPP Realisasi = 0. Belum ada perlengkapan yang terdistribusi dengan harga satuan."
      );

      const db = supabase as any;
      await db
        .from("departure_cost_items")
        .delete()
        .eq("departure_id", selectedDeparture)
        .eq("category", "perlengkapan")
        .like("description", "%Perlengkapan Jamaah%");

      const { error } = await db.from("departure_cost_items").insert({
        departure_id: selectedDeparture,
        category: "perlengkapan",
        description: mode === "planned"
          ? `Biaya Perlengkapan Jamaah — Rencana (${paxCount} pax × rata-rata harga)`
          : `Biaya Perlengkapan Jamaah — Realisasi (${totalDistributed} item terdistribusi)`,
        quantity: mode === "planned" ? paxCount : totalDistributed,
        unit_cost_idr: mode === "planned" && paxCount > 0 ? Math.round(totalCost / paxCount) : totalCost,
        total_cost_idr: totalCost,
        sort_order: 99,
        notes: `Auto-sync dari Equipment Realization Tab — Mode: ${mode === "planned" ? "HPP Rencana" : "HPP Realisasi"}. ${(realizationData || []).length} jenis item.`,
      });
      if (error) throw error;

      try {
        await db.rpc("recalculate_departure_financial_summary", { p_departure_id: selectedDeparture });
      } catch { }
      queryClient.invalidateQueries({ queryKey: ["departure-cost-items", selectedDeparture] });
      queryClient.invalidateQueries({ queryKey: ["departure-financial-summary", selectedDeparture] });
      queryClient.invalidateQueries({ queryKey: ["existing-equipment-hpp", selectedDeparture] });
    },
    onSuccess: (_, mode) => toast.success(
      mode === "planned"
        ? `HPP Rencana perlengkapan (${fmt(totalHPPPlanned)}) berhasil disinkronkan ke HPP keberangkatan`
        : `HPP Realisasi perlengkapan (${fmt(totalHPPRealized)}) berhasil diimpor ke HPP keberangkatan`
    ),
    onError: (e: any) => toast.error(e.message),
  });

  const getCategoryLabel = (category: string) => {
    const cat = categories.find((c) => c.value === category);
    return cat?.label || category;
  };

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case "male_only": return "♂";
      case "female_only": return "♀";
      case "child_only": return "👶";
      default: return "📦";
    }
  };

  const getStockStatus = (remaining: number, total: number) => {
    if (remaining === 0) return { label: "Habis", color: "bg-red-100 text-red-800 border-red-200" };
    if (remaining <= Math.ceil(total * 0.1)) return { label: "Sedikit", color: "bg-amber-100 text-amber-800 border-amber-200" };
    return { label: "Tersedia", color: "bg-green-100 text-green-800 border-green-200" };
  };

  return (
    <TooltipProvider>
    <div className="space-y-6">
      {/* Scope Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-3 text-blue-800 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-300">
        <Info className="h-5 w-5 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold">Cakupan Realisasi:</p>
          <p>
            {selectedDeparture
              ? `Keberangkatan terpilih — ${paxCount > 0 ? `${paxCount} jamaah` : "belum ada jamaah"} terdaftar.`
              : selectedPackage
                ? "Akumulasi untuk semua keberangkatan dalam paket terpilih."
                : "Akumulasi global seluruh keberangkatan."}
          </p>
        </div>
      </div>

      {/* INT-07: HPP Comparison Panel — hanya tampil jika ada selectedDeparture */}
      {selectedDeparture && (
        <Card className={`border-2 ${needsSync ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20" : "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20"}`}>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">HPP Direncanakan</p>
                  <p className="font-bold text-blue-700 dark:text-blue-400">{fmt(totalHPPPlanned)}</p>
                  <p className="text-[10px] text-muted-foreground">{paxCount} pax × harga satuan</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">HPP Realisasi</p>
                  <p className="font-bold text-purple-700 dark:text-purple-400">{fmt(totalHPPRealized)}</p>
                  <p className="text-[10px] text-muted-foreground">{totalDistributed} item terdistribusi</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Tersimpan di HPP</p>
                  <p className={`font-bold ${existingHPPAmount > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}`}>
                    {existingHPPAmount > 0 ? fmt(existingHPPAmount) : "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">departure_cost_items</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 min-w-[200px]">
                {needsSync && (
                  <div className="flex items-center gap-1.5 text-amber-700 text-xs bg-amber-100 rounded px-2 py-1">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Selisih {fmt(hppDrift)} — perlu sinkronisasi
                  </div>
                )}
                {!needsSync && existingHPPAmount > 0 && (
                  <div className="flex items-center gap-1.5 text-emerald-700 text-xs bg-emerald-100 rounded px-2 py-1">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    HPP tersinkronisasi
                  </div>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => importToHPPMutation.mutate("planned")}
                      disabled={importToHPPMutation.isPending || paxCount === 0}
                    >
                      {importToHPPMutation.isPending
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <RefreshCcw className="h-4 w-4" />}
                      Sync HPP Rencana
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Simpan HPP Rencana (pax_count × unit_cost) ke departure_cost_items</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50"
                      onClick={() => importToHPPMutation.mutate("realized")}
                      disabled={importToHPPMutation.isPending || totalHPPRealized === 0}
                    >
                      <ArrowUpFromLine className="h-4 w-4" />
                      Impor HPP Realisasi
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Simpan HPP Realisasi (qty terdistribusi × unit_cost) ke departure_cost_items</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                <p className="text-2xl font-bold">{Math.round(avgDistributionPct)}%</p>
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
        </CardContent>
      </Card>

      {/* Realization Table — dengan kolom HPP Rencana & Realisasi */}
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
                <p className="text-sm mt-1">{(error as Error).message}</p>
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
                    <TableHead className="text-right w-[90px]">Harga Satuan</TableHead>
                    {selectedDeparture && paxCount > 0 && (
                      <TableHead className="text-right w-[120px] text-blue-700">
                        <Tooltip>
                          <TooltipTrigger>HPP Rencana</TooltipTrigger>
                          <TooltipContent>unit_cost × {paxCount} jamaah</TooltipContent>
                        </Tooltip>
                      </TableHead>
                    )}
                    <TableHead className="text-right w-[120px] text-purple-700">HPP Realisasi</TableHead>
                    <TableHead className="text-center w-[100px]">Terdistribusi</TableHead>
                    <TableHead className="text-center w-[80px]">Jamaah</TableHead>
                    <TableHead className="text-center w-[80px]">Sisa</TableHead>
                    <TableHead className="w-[130px]">Progress</TableHead>
                    <TableHead className="text-center w-[90px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item) => {
                    const stockStatus = getStockStatus(item.remaining_stock, item.total_prepared);
                    const variance = item.total_cost_planned - item.total_cost_realized;
                    return (
                      <TableRow key={item.equipment_id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getCategoryEmoji(item.equipment_category)}</span>
                            <span className="font-medium">{item.equipment_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {getCategoryLabel(item.equipment_category)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          {item.unit_cost > 0 ? fmt(item.unit_cost) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        {selectedDeparture && paxCount > 0 && (
                          <TableCell className="text-right">
                            {item.unit_cost > 0 ? (
                              <span className="font-semibold text-blue-700 dark:text-blue-400 text-xs">
                                {fmt(item.total_cost_planned)}
                              </span>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            {item.total_cost_realized > 0 ? (
                              <span className="font-semibold text-purple-700 dark:text-purple-400 text-xs">
                                {fmt(item.total_cost_realized)}
                              </span>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                            {selectedDeparture && paxCount > 0 && item.unit_cost > 0 && item.total_cost_realized > 0 && (
                              <span className={`text-[10px] ${variance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                {variance >= 0 ? "↑" : "↓"} {fmt(Math.abs(variance))}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-semibold">{item.distributed_quantity}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-xs">{item.distributed_count} jamaah</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-semibold text-amber-600">{item.remaining_stock}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={item.distribution_percentage} className="h-2 flex-1" />
                            <span className="text-xs font-medium tabular-nums w-12">
                              {Math.round(item.distribution_percentage)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`text-xs ${stockStatus.color}`}>
                            {stockStatus.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Footer totals */}
              {selectedDeparture && (
                <div className="border-t px-4 py-3 bg-muted/30 flex flex-wrap gap-4 text-sm">
                  {paxCount > 0 && (
                    <span>
                      <span className="text-muted-foreground">Total HPP Rencana:</span>{" "}
                      <span className="font-bold text-blue-700">{fmt(totalHPPPlanned)}</span>
                    </span>
                  )}
                  <span>
                    <span className="text-muted-foreground">Total HPP Realisasi:</span>{" "}
                    <span className="font-bold text-purple-700">{fmt(totalHPPRealized)}</span>
                  </span>
                  {paxCount > 0 && totalHPPRealized > 0 && (
                    <span>
                      <span className="text-muted-foreground">Selisih:</span>{" "}
                      <span className={`font-bold ${totalHPPPlanned >= totalHPPRealized ? "text-emerald-700" : "text-red-700"}`}>
                        {fmt(Math.abs(totalHPPPlanned - totalHPPRealized))}
                        {totalHPPPlanned >= totalHPPRealized ? " (under)" : " (over)"}
                      </span>
                    </span>
                  )}
                </div>
              )}
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
    </TooltipProvider>
  );
}
