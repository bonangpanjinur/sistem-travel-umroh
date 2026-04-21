import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Box, Backpack, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface EquipmentReadinessCardProps {
  departureId: string;
  totalJamaah: number;
  completedJamaah?: number;
  className?: string;
}

export function EquipmentReadinessCard({
  departureId,
  totalJamaah,
  completedJamaah = 0,
  className,
}: EquipmentReadinessCardProps) {
  const readinessPercentage = totalJamaah > 0 ? (completedJamaah / totalJamaah) * 100 : 0;
  
  const equipmentItems = [
    { name: "Koper", icon: Box, status: "partial" },
    { name: "Kain Ihram", icon: Backpack, status: "partial" },
    { name: "Buku Doa", icon: BookOpen, status: "completed" },
  ];

  return (
    <Card className={cn("bg-orange-50/30 border-orange-100", className)}>
      <CardHeader className="p-3 pb-0">
        <CardTitle className="text-xs font-semibold flex items-center gap-2 text-orange-700">
          <Box className="h-3.5 w-3.5" /> Equipment Readiness
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {/* Overall Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Status Kelengkapan</span>
            <span className="font-medium">{readinessPercentage.toFixed(0)}%</span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-orange-500 transition-all"
              style={{ width: `${readinessPercentage}%` }}
            />
          </div>
          <p className="text-[9px] text-muted-foreground">
            {completedJamaah} dari {totalJamaah} jamaah sudah menerima perlengkapan
          </p>
        </div>

        {/* Equipment Items Breakdown */}
        <div className="space-y-1.5 pt-2 border-t">
          {equipmentItems.map((item, idx) => {
            const Icon = item.icon;
            const statusColor = item.status === "completed" ? "text-green-600" : "text-orange-600";
            
            return (
              <div key={idx} className="flex items-center justify-between text-[9px]">
                <div className="flex items-center gap-1.5">
                  <Icon className={cn("h-3 w-3", statusColor)} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <span className={cn("font-medium", statusColor)}>
                  {item.status === "completed" ? "✓" : "◐"}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
