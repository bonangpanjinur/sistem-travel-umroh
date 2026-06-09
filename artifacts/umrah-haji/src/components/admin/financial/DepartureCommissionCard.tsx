import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Users, CheckCircle2, Clock, DollarSign, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}Jt`;
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

interface Props {
  departureId: string;
}

export function DepartureCommissionCard({ departureId }: Props) {
  const queryClient = useQueryClient();

  const { data: commissions = [], isLoading, refetch } = useQuery({
    queryKey: ["departure-commissions", departureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_commissions")
        .select(`
          id, commission_amount, status, notes, paid_at, created_at,
          booking:bookings(booking_code, total_price),
          agent:agents(id, full_name, agency_name)
        `)
        .in(
          "booking_id",
          (await supabase
            .from("bookings")
            .select("id")
            .eq("departure_id", departureId)
            .then(r => (r.data || []).map((b: any) => b.id)))
        )
        .order("created_at", { ascending: false });
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data || [];
    },
    enabled: !!departureId,
  });

  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("agent_commissions")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departure-commissions", departureId] });
      toast.success("Komisi ditandai sudah dibayar");
    },
    onError: (e: any) => toast.error("Gagal: " + e.message),
  });

  if (isLoading) return <Skeleton className="h-32 w-full rounded-xl" />;
  if (!commissions.length) return (
    <Card className="border-dashed">
      <CardContent className="py-8 text-center text-muted-foreground">
        <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-20" />
        <p className="text-sm">Belum ada komisi agen untuk keberangkatan ini.</p>
        <p className="text-xs mt-1 opacity-70">Komisi otomatis dibuat saat booking dikonfirmasi.</p>
      </CardContent>
    </Card>
  );

  const total   = commissions.reduce((s, c: any) => s + Number(c.commission_amount), 0);
  const paid    = commissions.filter((c: any) => c.status === "paid").reduce((s, c: any) => s + Number(c.commission_amount), 0);
  const pending = total - paid;
  const paidCount   = commissions.filter((c: any) => c.status === "paid").length;
  const pendingList = commissions.filter((c: any) => c.status !== "paid");

  const agentTotals = commissions.reduce((acc: Record<string, { name: string; total: number; paid: number }>, c: any) => {
    const agentId = c.agent?.id || "unknown";
    const agentName = c.agent?.full_name || c.agent?.agency_name || "Agen Tidak Diketahui";
    if (!acc[agentId]) acc[agentId] = { name: agentName, total: 0, paid: 0 };
    acc[agentId].total += Number(c.commission_amount);
    if (c.status === "paid") acc[agentId].paid += Number(c.commission_amount);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-500" />
            Komisi Agen — Keberangkatan Ini
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Komisi", val: total, color: "bg-slate-50 text-slate-700 dark:bg-slate-900/40 dark:text-slate-200" },
            { label: "Sudah Dibayar", val: paid, color: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
            { label: "Belum Dibayar", val: pending, color: pending > 0 ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" : "bg-slate-50 text-slate-500" },
          ].map(s => (
            <div key={s.label} className={`rounded-lg p-3 text-center ${s.color}`}>
              <p className="text-xs font-mono font-semibold">{fmt(s.val)}</p>
              <p className="text-[10px] mt-0.5 opacity-80">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Per-agent breakdown */}
        {Object.entries(agentTotals).length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Per Agen</p>
            {Object.entries(agentTotals).map(([id, ag]) => (
              <div key={id} className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2 text-sm">
                <span className="font-medium truncate flex-1 min-w-0">{ag.name}</span>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs font-mono">{fmt(ag.total)}</span>
                  {ag.paid >= ag.total ? (
                    <Badge className="text-[10px] bg-green-100 text-green-700">Lunas</Badge>
                  ) : (
                    <Badge className="text-[10px] bg-amber-100 text-amber-700">Sisa {fmt(ag.total - ag.paid)}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pending commissions — mark paid buttons */}
        {pendingList.length > 0 && (
          <div className="space-y-1.5 border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {pendingList.length} Komisi Belum Dibayar
            </p>
            {pendingList.slice(0, 5).map((c: any) => (
              <div key={c.id} className="flex items-center gap-2 rounded-md border bg-amber-50/50 dark:bg-amber-950/10 px-3 py-2">
                <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium">{c.agent?.full_name || c.agent?.agency_name || "—"}</span>
                  <span className="text-xs text-muted-foreground ml-1.5">· {c.booking?.booking_code}</span>
                </div>
                <span className="text-xs font-mono font-semibold shrink-0">{fmt(Number(c.commission_amount))}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] px-2 border-green-300 text-green-700 hover:bg-green-50 shrink-0"
                  onClick={() => markPaidMutation.mutate(c.id)}
                  disabled={markPaidMutation.isPending}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Bayar
                </Button>
              </div>
            ))}
            {pendingList.length > 5 && (
              <p className="text-xs text-muted-foreground text-center py-1">+ {pendingList.length - 5} komisi lainnya</p>
            )}
          </div>
        )}

        {paidCount > 0 && pendingList.length === 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 px-3 py-2 border border-green-200 dark:border-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <span className="text-sm text-green-700 dark:text-green-300">Semua {paidCount} komisi sudah dibayar.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
