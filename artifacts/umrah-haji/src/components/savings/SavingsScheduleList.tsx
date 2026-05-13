import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { format, isPast } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { CalendarClock, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props { savingsPlanId: string; }

const STATUS_BADGE: Record<string, { label: string; cls: string; icon: any }> = {
  paid: { label: "Lunas", cls: "bg-emerald-600 text-white", icon: CheckCircle2 },
  partial: { label: "Sebagian", cls: "bg-amber-500 text-white", icon: Clock },
  overdue: { label: "Terlambat", cls: "bg-red-600 text-white", icon: AlertCircle },
  pending: { label: "Belum", cls: "bg-muted text-foreground", icon: Clock },
};

export function SavingsScheduleList({ savingsPlanId }: Props) {
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["savings-schedules", savingsPlanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("savings_schedules" as any)
        .select("*")
        .eq("savings_plan_id", savingsPlanId)
        .order("installment_number");
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!schedules.length) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          Jadwal Cicilan
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {schedules.map((s: any) => {
            const overdue = s.status === "pending" && isPast(new Date(s.due_date));
            const status = overdue ? "overdue" : (s.status as string);
            const cfg = STATUS_BADGE[status] || STATUS_BADGE.pending;
            const Icon = cfg.icon;
            return (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <div className="text-xs font-mono w-8 text-center text-muted-foreground">#{s.installment_number}</div>
                  <div>
                    <p className="text-sm font-medium">{format(new Date(s.due_date), "d MMM yyyy", { locale: idLocale })}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(Number(s.paid_amount) || 0)} / {formatCurrency(Number(s.amount))}
                    </p>
                  </div>
                </div>
                <Badge className={cfg.cls}>
                  <Icon className="h-3 w-3 mr-1" />
                  {cfg.label}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
