import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface BreakEvenIndicatorCardProps {
  totalBooked: number;
  quota: number;
  breakEvenPax: number;
  operationalCostPerPax?: number;
  className?: string;
}

export function BreakEvenIndicatorCard({
  totalBooked,
  quota,
  breakEvenPax,
  operationalCostPerPax = 0,
  className,
}: BreakEvenIndicatorCardProps) {
  const isProfitable = breakEvenPax > 0 && totalBooked >= breakEvenPax;
  const occupancyRate = Math.min((totalBooked / quota) * 100, 100);
  const breakEvenRate = breakEvenPax > 0 ? (breakEvenPax / quota) * 100 : 0;
  const remainingForBEP = Math.max(breakEvenPax - totalBooked, 0);
  const profitMargin = totalBooked - breakEvenPax;

  return (
    <Card className={cn("bg-green-50/30 border-green-100", className)}>
      <CardHeader className="p-3 pb-0">
        <CardTitle className="text-xs font-semibold flex items-center gap-2 text-green-700">
          <TrendingUp className="h-3.5 w-3.5" /> Profitability Monitoring
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {/* Break-even Info */}
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Titik Impas (BEP)</span>
          <span className="font-bold text-foreground">{breakEvenPax} Pax</span>
        </div>

        {/* Progress Bar with BEP Marker */}
        <div className="space-y-1">
          <div className="relative h-3 w-full bg-muted rounded-full overflow-hidden">
            {/* Main progress bar */}
            <div
              className={cn(
                "h-full transition-all",
                isProfitable ? "bg-green-500" : "bg-blue-500"
              )}
              style={{ width: `${occupancyRate}%` }}
            />

            {/* BEP Marker */}
            {breakEvenPax > 0 && breakEvenPax < quota && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-destructive/70 z-10 shadow-sm"
                style={{ left: `${breakEvenRate}%` }}
                title={`Titik Impas: ${breakEvenPax} Pax`}
              />
            )}
          </div>

          {/* Progress Info */}
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>0%</span>
            <span className="font-medium">{occupancyRate.toFixed(0)}%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Status and Metrics */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-muted-foreground">Status Profit</span>
            <Badge
              variant={isProfitable ? "default" : "outline"}
              className={cn(
                "text-[9px] font-bold",
                isProfitable && "bg-green-500 hover:bg-green-600"
              )}
            >
              {isProfitable ? "✓ PROFIT" : "○ BELUM BEP"}
            </Badge>
          </div>

          {/* Remaining for BEP or Profit Margin */}
          <div className="text-[9px]">
            {isProfitable ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Margin Profit</span>
                <span className="font-bold text-green-600">+{profitMargin} Pax</span>
              </div>
            ) : (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kurang untuk BEP</span>
                <span className="font-bold text-orange-600">{remainingForBEP} Pax</span>
              </div>
            )}
          </div>

          {/* Operational Cost Info */}
          {operationalCostPerPax > 0 && (
            <div className="text-[9px] flex justify-between">
              <span className="text-muted-foreground">Biaya Ops/Pax</span>
              <span className="font-medium">{formatCurrency(operationalCostPerPax)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

