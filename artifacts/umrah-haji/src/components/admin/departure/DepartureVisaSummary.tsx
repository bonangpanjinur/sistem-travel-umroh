import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, ShieldAlert, Clock, XCircle, AlertCircle, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInCalendarDays, format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface Props {
  departureId: string;
  customerIds: string[];
  visaDeadline?: string | null;
}

const STATUS_CFG = {
  issued:     { label: "Visa Terbit",   color: "bg-green-100 text-green-700 border-green-200",  icon: ShieldCheck  },
  processing: { label: "Proses",        color: "bg-blue-100 text-blue-700 border-blue-200",     icon: Clock        },
  submitted:  { label: "Diajukan",      color: "bg-purple-100 text-purple-700 border-purple-200", icon: Clock      },
  rejected:   { label: "Ditolak",       color: "bg-red-100 text-red-700 border-red-200",         icon: XCircle     },
  pending:    { label: "Belum Diproses",color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: ShieldAlert },
  none:       { label: "Belum Ada Data",color: "bg-gray-100 text-gray-600 border-gray-200",      icon: AlertCircle },
} as const;

export function DepartureVisaSummary({ departureId, customerIds }: Props) {
  const { data: visaData = [], isLoading } = useQuery({
    queryKey: ["departure-visa-summary", departureId],
    queryFn: async () => {
      if (!customerIds.length) return [];
      const { data, error } = await (supabase as any)
        .from("visa_status_logs")
        .select("customer_id, status, updated_at")
        .in("customer_id", customerIds)
        .order("updated_at", { ascending: false });
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      const latestPerCustomer = new Map<string, string>();
      (data || []).forEach((row: any) => {
        if (!latestPerCustomer.has(row.customer_id))
          latestPerCustomer.set(row.customer_id, row.status);
      });
      return Array.from(latestPerCustomer.entries()).map(([id, status]) => ({ customer_id: id, status }));
    },
    enabled: customerIds.length > 0,
  });

  const totalJamaah = customerIds.length;

  const counts = {
    issued:     visaData.filter((v: any) => v.status === "issued").length,
    processing: visaData.filter((v: any) => v.status === "processing" || v.status === "submitted").length,
    rejected:   visaData.filter((v: any) => v.status === "rejected").length,
    pending:    visaData.filter((v: any) => v.status === "pending").length,
    none:       totalJamaah - visaData.length,
  };

  const allIssued = counts.issued >= totalJamaah && totalJamaah > 0;
  const pct = totalJamaah > 0 ? Math.round((counts.issued / totalJamaah) * 100) : 0;

  const deadlineDays = visaDeadline
    ? differenceInCalendarDays(new Date(visaDeadline), new Date())
    : null;
  const deadlineUrgent  = deadlineDays !== null && deadlineDays <= 7  && deadlineDays >= 0;
  const deadlineWarning = deadlineDays !== null && deadlineDays <= 14 && deadlineDays > 7;
  const deadlinePassed  = deadlineDays !== null && deadlineDays < 0;

  if (isLoading) return <Skeleton className="h-32 w-full rounded-xl" />;

  return (
    <div className="space-y-2">
      {/* D5: Deadline visa banner */}
      {visaDeadline && deadlineDays !== null && (
        <div className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
          deadlinePassed  ? "bg-red-50 border-red-300 text-red-700 dark:bg-red-950/20 dark:text-red-300" :
          deadlineUrgent  ? "bg-orange-50 border-orange-300 text-orange-700 dark:bg-orange-950/20 dark:text-orange-300" :
          deadlineWarning ? "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300" :
                            "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300"
        )}>
          <CalendarClock className="h-4 w-4 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold">Deadline Visa: </span>
            <span>{format(new Date(visaDeadline), "d MMMM yyyy", { locale: idLocale })}</span>
          </div>
          <span className={cn(
            "text-xs font-bold px-2 py-0.5 rounded-full",
            deadlinePassed  ? "bg-red-100 text-red-800"    :
            deadlineUrgent  ? "bg-orange-100 text-orange-800" :
            deadlineWarning ? "bg-amber-100 text-amber-800" :
                              "bg-blue-100 text-blue-800"
          )}>
            {deadlinePassed  ? `Terlewat ${Math.abs(deadlineDays)} hari` :
             deadlineDays === 0 ? "Hari ini!" :
             `${deadlineDays} hari lagi`}
          </span>
        </div>
      )}

    <Card className={cn("border-2", allIssued ? "border-green-400" : counts.rejected > 0 ? "border-red-300" : "border-border")}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          Ringkasan Status Visa
          {allIssued && (
            <Badge className="text-[10px] bg-green-100 text-green-700 border-green-300 border">Semua Terbit ✓</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        {totalJamaah === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada jamaah terdaftar</p>
        ) : (
          <>
            {/* Progress bar */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", allIssued ? "bg-green-500" : "bg-blue-500")}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={cn("text-sm font-semibold", allIssued ? "text-green-700" : "text-blue-700")}>
                {pct}%
              </span>
            </div>

            {/* Status breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {([
                ["issued",     counts.issued],
                ["processing", counts.processing],
                ["rejected",   counts.rejected],
                ["pending",    counts.pending],
                ["none",       counts.none],
              ] as [string, number][]).filter(([, n]) => n > 0).map(([status, count]) => {
                const cfg = STATUS_CFG[status as keyof typeof STATUS_CFG] || STATUS_CFG.none;
                const Icon = cfg.icon;
                return (
                  <div key={status} className={cn("rounded-lg border px-2.5 py-2 flex items-center gap-1.5", cfg.color)}>
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold">{count} jamaah</p>
                      <p className="text-[10px] opacity-80">{cfg.label}</p>
                    </div>
                  </div>
                );
              })}
              <div className="rounded-lg border bg-muted/50 px-2.5 py-2 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">{totalJamaah} total</p>
                  <p className="text-[10px] text-muted-foreground">Jamaah</p>
                </div>
              </div>
            </div>

            {counts.rejected > 0 && (
              <div className="mt-2 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5 flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{counts.rejected} jamaah visa ditolak — segera hubungi jamaah terkait.</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
