import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { autoCalculateCommission } from "@/hooks/useAutoCommission";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Calculator, CheckCircle2, Clock, XCircle, RefreshCcw, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";

interface Props {
  bookingId: string;
  hasAgent: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:  { label: "Pending",   color: "bg-yellow-100 text-yellow-800 border-yellow-300",  icon: <Clock className="h-3 w-3" /> },
  approved: { label: "Disetujui", color: "bg-blue-100 text-blue-800 border-blue-300",        icon: <CheckCircle2 className="h-3 w-3" /> },
  paid:     { label: "Lunas",     color: "bg-green-100 text-green-800 border-green-300",     icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected: { label: "Ditolak",   color: "bg-red-100 text-red-800 border-red-300",           icon: <XCircle className="h-3 w-3" /> },
};

export function AdminBookingCommissionCard({ bookingId, hasAgent }: Props) {
  const queryClient = useQueryClient();
  const [triggering, setTriggering] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const { data: commissions, isLoading } = useQuery({
    queryKey: ["booking-commissions", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_commissions")
        .select(`
          id, commission_amount, commission_rate, status, notes, created_at, paid_at,
          agent:agents(id, company_name, agent_code, commission_rate)
        `)
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!bookingId,
  });

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      const result = await autoCalculateCommission(bookingId);
      if (result.skipped) {
        toast.info(result.message);
      } else {
        toast.success(result.message);
        queryClient.invalidateQueries({ queryKey: ["booking-commissions", bookingId] });
        queryClient.invalidateQueries({ queryKey: ["admin-commissions"] });
      }
    } catch (err: any) {
      toast.error("Gagal menghitung komisi: " + err.message);
    } finally {
      setTriggering(false);
    }
  };

  const totalComission = (commissions ?? []).reduce((s, c) => s + Number(c.commission_amount), 0);
  const hasCommissions = (commissions ?? []).length > 0;

  return (
    <Card className="border-none shadow-md overflow-hidden">
      <CardHeader className="bg-muted/50 px-6 py-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Calculator className="h-3.5 w-3.5" />
            Komisi Booking
            {hasCommissions && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                {commissions!.length}
              </span>
            )}
          </CardTitle>
          <button
            className="text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setExpanded(e => !e)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : hasCommissions ? (
            <>
              {commissions!.map((c) => {
                const cfg = STATUS_CONFIG[c.status ?? "pending"] ?? STATUS_CONFIG.pending;
                const agent = c.agent as any;
                return (
                  <div key={c.id} className="rounded-lg border bg-card p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {agent?.company_name ?? agent?.agent_code ?? "Agen"}
                        </p>
                        {c.notes && (
                          <p className="text-[10px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                            {c.notes}
                          </p>
                        )}
                      </div>
                      <Badge
                        className={`text-[10px] border shrink-0 flex items-center gap-1 px-1.5 py-0.5 font-semibold rounded-full ${cfg.color}`}
                        variant="outline"
                      >
                        {cfg.icon}
                        {cfg.label}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-extrabold text-emerald-600">
                        {formatCurrency(Number(c.commission_amount))}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(c.created_at!), "d MMM yyyy HH:mm", { locale: idLocale })}
                      </span>
                    </div>
                    {c.paid_at && (
                      <p className="text-[10px] text-blue-600">
                        Dibayar: {format(new Date(c.paid_at), "d MMM yyyy", { locale: idLocale })}
                      </p>
                    )}
                  </div>
                );
              })}

              {commissions!.length > 1 && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-muted-foreground">Total Komisi</span>
                    <span className="text-sm font-extrabold text-emerald-600">{formatCurrency(totalComission)}</span>
                  </div>
                </>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-[11px] text-muted-foreground hover:text-foreground h-7"
                onClick={handleTrigger}
                disabled={triggering}
              >
                {triggering ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />}
                Hitung Ulang Komisi
              </Button>
            </>
          ) : (
            <div className="text-center py-3 space-y-3">
              {hasAgent ? (
                <>
                  <p className="text-xs text-muted-foreground">Belum ada komisi tercatat untuk booking ini.</p>
                  <Button
                    size="sm"
                    className="w-full text-xs font-bold"
                    onClick={handleTrigger}
                    disabled={triggering}
                  >
                    {triggering ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Calculator className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Hitung Komisi Sekarang
                  </Button>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Booking ini tidak memiliki agen — tidak ada komisi.</p>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
