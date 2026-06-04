import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Package, Shirt, BookOpen, Briefcase, Shield,
  HeartPulse, Gift, Box, RefreshCw, AlertTriangle,
  CheckCircle2, Clock, XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EquipmentReadinessCardProps {
  departureId: string;
  totalJamaah: number;
  className?: string;
}

interface EquipmentItemStat {
  id: string;
  name: string;
  category: string;
  photo_url: string | null;
  distributed: number;
  pending: number;
  returned: number;
  total_assigned: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  koper:       Briefcase,
  ihram:       Shirt,
  buku:        BookOpen,
  tas:         Briefcase,
  perlengkapan: Package,
  kesehatan:   HeartPulse,
  keamanan:    Shield,
  souvenir:    Gift,
  lainnya:     Box,
};

function getCategoryIcon(name: string, category: string): React.ElementType {
  const key = [name, category]
    .join(" ")
    .toLowerCase();
  for (const [k, Icon] of Object.entries(CATEGORY_ICONS)) {
    if (key.includes(k)) return Icon;
  }
  return Box;
}

function StatusBadge({ distributed, pending, total }: { distributed: number; pending: number; total: number }) {
  if (total === 0) return null;
  if (distributed === total) {
    return (
      <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-4 border-green-300 text-green-700 bg-green-50">
        Selesai
      </Badge>
    );
  }
  if (distributed === 0) {
    return (
      <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-4 border-orange-300 text-orange-700 bg-orange-50">
        Belum Mulai
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-4 border-blue-300 text-blue-700 bg-blue-50">
      Sebagian
    </Badge>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EquipmentReadinessCard({
  departureId,
  totalJamaah,
  className,
}: EquipmentReadinessCardProps) {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["equipment-readiness", departureId],
    queryFn: async (): Promise<EquipmentItemStat[]> => {
      const { data: rows, error } = await supabase
        .from("equipment_distributions")
        .select(`
          equipment_id,
          customer_id,
          status,
          quantity,
          equipment_items!equipment_distributions_equipment_id_fkey (
            id,
            name,
            category,
            photo_url
          )
        `)
        .eq("departure_id", departureId);

      if (error) throw error;
      if (!rows || rows.length === 0) return [];

      // Aggregate per equipment item
      const map = new Map<string, EquipmentItemStat>();

      for (const row of rows) {
        const item = row.equipment_items as any;
        if (!item) continue;

        if (!map.has(item.id)) {
          map.set(item.id, {
            id: item.id,
            name: item.name,
            category: item.category ?? "",
            photo_url: item.photo_url ?? null,
            distributed: 0,
            pending: 0,
            returned: 0,
            total_assigned: 0,
          });
        }

        const stat = map.get(item.id)!;
        stat.total_assigned += 1;

        if (row.status === "distributed") stat.distributed += 1;
        else if (row.status === "returned") stat.returned += 1;
        else stat.pending += 1;
      }

      return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!departureId,
    staleTime: 1000 * 60 * 2, // 2 minutes — refresh often enough for operational real-time use
    refetchOnWindowFocus: true,
  });

  // Compute overall: unique customers who have received ALL their assigned equipment
  const { data: overallData } = useQuery({
    queryKey: ["equipment-readiness-overall", departureId],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("equipment_distributions")
        .select("customer_id, status")
        .eq("departure_id", departureId);

      if (error) throw error;
      if (!rows || rows.length === 0) return { completedCustomers: 0 };

      // Group by customer_id — a customer is "complete" if ALL their items are distributed
      const byCustomer = new Map<string, { total: number; distributed: number }>();
      for (const row of rows) {
        if (!byCustomer.has(row.customer_id)) {
          byCustomer.set(row.customer_id, { total: 0, distributed: 0 });
        }
        const c = byCustomer.get(row.customer_id)!;
        c.total += 1;
        if (row.status === "distributed") c.distributed += 1;
      }

      let completedCustomers = 0;
      for (const c of byCustomer.values()) {
        if (c.total > 0 && c.distributed === c.total) completedCustomers++;
      }

      return { completedCustomers, totalAssigned: byCustomer.size };
    },
    enabled: !!departureId,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
  });

  const completedJamaah = overallData?.completedCustomers ?? 0;
  const totalAssigned = overallData?.totalAssigned ?? 0;
  const readinessPct = totalJamaah > 0 ? (completedJamaah / totalJamaah) * 100 : 0;
  const hasData = (data?.length ?? 0) > 0;

  return (
    <TooltipProvider delayDuration={300}>
      <Card className={cn("bg-orange-50/30 border-orange-100", className)}>
        <CardHeader className="p-3 pb-0">
          <CardTitle className="text-xs font-semibold flex items-center justify-between text-orange-700">
            <div className="flex items-center gap-2">
              <Package className="h-3.5 w-3.5" />
              Kesiapan Perlengkapan
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-muted-foreground hover:text-orange-600"
                  onClick={() => refetch()}
                  disabled={isFetching}
                >
                  <RefreshCw className={cn("h-3 w-3", isFetching && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">Perbarui data</TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-3 space-y-3">
          {/* ── Overall progress ── */}
          {isLoading ? (
            <div className="space-y-1.5">
              <Skeleton className="h-2.5 w-full" />
              <Skeleton className="h-2 w-24" />
            </div>
          ) : isError ? (
            <div className="flex items-center gap-1.5 text-[10px] text-destructive">
              <AlertTriangle className="h-3 w-3" />
              <span>Gagal memuat data perlengkapan</span>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Status Kelengkapan</span>
                <span className="font-semibold text-orange-700">{readinessPct.toFixed(0)}%</span>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    readinessPct >= 100
                      ? "bg-green-500"
                      : readinessPct >= 50
                      ? "bg-orange-500"
                      : "bg-orange-300"
                  )}
                  style={{ width: `${Math.min(100, readinessPct)}%` }}
                />
              </div>

              <p className="text-[9px] text-muted-foreground">
                {hasData ? (
                  <>
                    {completedJamaah} dari {totalJamaah} jamaah lengkap
                    {totalAssigned < totalJamaah && (
                      <span className="ml-1 text-amber-600">
                        ({totalJamaah - totalAssigned} belum di-assign)
                      </span>
                    )}
                  </>
                ) : (
                  "Belum ada distribusi perlengkapan"
                )}
              </p>
            </div>
          )}

          {/* ── Per-item breakdown ── */}
          {!isLoading && !isError && (
            <div className="space-y-1.5 pt-2 border-t border-orange-100">
              {!hasData ? (
                <div className="flex flex-col items-center py-2 gap-1 text-muted-foreground">
                  <Box className="h-5 w-5 opacity-30" />
                  <p className="text-[9px] text-center">
                    Belum ada item perlengkapan yang di-assign ke keberangkatan ini.
                    <br />
                    Tambahkan dari menu Perlengkapan.
                  </p>
                </div>
              ) : (
                data!.map((item) => {
                  const Icon = getCategoryIcon(item.name, item.category);
                  const pct = item.total_assigned > 0
                    ? (item.distributed / item.total_assigned) * 100
                    : 0;

                  return (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>
                        <div className="group space-y-0.5 cursor-default">
                          <div className="flex items-center justify-between text-[9px]">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Icon
                                className={cn(
                                  "h-3 w-3 flex-shrink-0",
                                  pct >= 100
                                    ? "text-green-600"
                                    : pct > 0
                                    ? "text-orange-600"
                                    : "text-muted-foreground"
                                )}
                              />
                              <span className="text-muted-foreground truncate max-w-[90px]">{item.name}</span>
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              <StatusBadge
                                distributed={item.distributed}
                                pending={item.pending}
                                total={item.total_assigned}
                              />
                              <span className={cn(
                                "font-semibold",
                                pct >= 100 ? "text-green-600" : "text-orange-600"
                              )}>
                                {item.distributed}/{item.total_assigned}
                              </span>
                            </div>
                          </div>

                          {/* Mini progress bar per item */}
                          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full transition-all duration-500",
                                pct >= 100 ? "bg-green-500" : "bg-orange-400"
                              )}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs max-w-[200px]">
                        <p className="font-semibold mb-1">{item.name}</p>
                        <div className="flex gap-3 text-[11px]">
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            {item.distributed} diterima
                          </span>
                          <span className="flex items-center gap-1 text-amber-600">
                            <Clock className="h-3 w-3" />
                            {item.pending} pending
                          </span>
                          {item.returned > 0 && (
                            <span className="flex items-center gap-1 text-gray-500">
                              <XCircle className="h-3 w-3" />
                              {item.returned} kembali
                            </span>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })
              )}
            </div>
          )}

          {/* ── Loading skeleton for items ── */}
          {isLoading && (
            <div className="space-y-2 pt-2 border-t border-orange-100">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-0.5">
                  <div className="flex justify-between">
                    <Skeleton className="h-2.5 w-20" />
                    <Skeleton className="h-2.5 w-8" />
                  </div>
                  <Skeleton className="h-1 w-full" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
