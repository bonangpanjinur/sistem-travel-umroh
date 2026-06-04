import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import { CheckCircle2, XCircle, Clock, AlertCircle, Loader2, CheckSquare2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type DiscountStatus = "pending" | "approved" | "rejected";

const STATUS_CONFIG: Record<DiscountStatus, { label: string; color: string; icon: any }> = {
  pending: { label: "Menunggu", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock },
  approved: { label: "Disetujui", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  rejected: { label: "Ditolak", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
};

export default function BranchDiskon() {
  const { user, branchId } = useAuth();
  const queryClient = useQueryClient();
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [notes, setNotes] = useState("");

  const { data: branchData } = useQuery({
    queryKey: ["branch-data-diskon", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await (supabase as any).from("branches").select("id").eq("manager_user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const bId = branchData?.id || branchId;

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["branch-discount-requests", bId],
    enabled: !!bId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("discount_requests")
        .select(`
          id, discount_amount, discount_pct, reason, status, notes, created_at, reviewed_at,
          agent:agents(company_name, agent_code),
          booking:bookings(booking_code, total_price, customer:customers(full_name))
        `)
        .eq("branch_id", bId)
        .order("created_at", { ascending: false });
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data || [];
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      const { error } = await (supabase as any)
        .from("discount_requests")
        .update({ status, notes, reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branch-discount-requests"] });
      setSelectedReq(null); setAction(null); setNotes("");
      toast.success(action === "approve" ? "Diskon disetujui!" : "Diskon ditolak.");
    },
    onError: (err: any) => toast.error("Gagal: " + err.message),
  });

  const handleReview = () => {
    if (!selectedReq || !action) return;
    reviewMutation.mutate({ id: selectedReq.id, status: action === "approve" ? "approved" : "rejected", notes });
  };

  const pending = requests.filter((r: any) => r.status === "pending");
  const reviewed = requests.filter((r: any) => r.status !== "pending");

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <CheckSquare2 className="h-5 w-5 text-primary" /> Approval Diskon
        </h1>
        <p className="text-sm text-muted-foreground">Setujui atau tolak permintaan diskon dari agen</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Menunggu", value: pending.length, color: "text-yellow-600" },
          { label: "Disetujui", value: requests.filter((r: any) => r.status === "approved").length, color: "text-green-600" },
          { label: "Ditolak", value: requests.filter((r: any) => r.status === "rejected").length, color: "text-red-600" },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-3 text-center">
              <p className={cn("font-bold text-2xl", k.color)}>{k.value}</p>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Tidak ada permintaan diskon</p>
          <p className="text-sm text-muted-foreground">Permintaan dari agen akan muncul di sini</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2 flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-yellow-600" /> Menunggu Persetujuan ({pending.length})
              </p>
              <div className="space-y-2">
                {pending.map((r: any) => {
                  const cfg = STATUS_CONFIG["pending"];
                  return (
                    <Card key={r.id} className="border-yellow-200 bg-yellow-50/30">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="font-semibold text-sm">{r.booking?.customer?.full_name || "-"}</p>
                            <p className="text-xs text-muted-foreground">{r.booking?.booking_code} · {r.agent?.company_name}</p>
                          </div>
                          <Badge className={cn("text-[10px] border", cfg.color)}>{cfg.label}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Diskon Diminta</p>
                            <p className="font-bold text-red-600">
                              {r.discount_pct ? `${r.discount_pct}%` : formatCurrency(Number(r.discount_amount || 0))}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Total Booking</p>
                            <p className="font-bold">{formatCurrency(Number(r.booking?.total_price || 0))}</p>
                          </div>
                        </div>
                        {r.reason && (
                          <div className="bg-white border rounded-lg p-2 mb-3">
                            <p className="text-xs text-muted-foreground mb-0.5">Alasan:</p>
                            <p className="text-xs">{r.reason}</p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm" className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={() => { setSelectedReq(r); setAction("approve"); }}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Setujui
                          </Button>
                          <Button
                            size="sm" variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => { setSelectedReq(r); setAction("reject"); }}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Tolak
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {reviewed.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2">Riwayat ({reviewed.length})</p>
              <div className="space-y-2">
                {reviewed.map((r: any) => {
                  const status = r.status as DiscountStatus;
                  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["pending"];
                  const Icon = cfg.icon;
                  return (
                    <Card key={r.id} className="opacity-80">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{r.booking?.customer?.full_name || "-"}</p>
                            <p className="text-xs text-muted-foreground">{r.booking?.booking_code} · {r.agent?.company_name}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-bold text-sm">
                              {r.discount_pct ? `${r.discount_pct}%` : formatCurrency(Number(r.discount_amount || 0))}
                            </span>
                            <Badge className={cn("text-[10px] border gap-1", cfg.color)}>
                              <Icon className="h-3 w-3" />{cfg.label}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!selectedReq && !!action} onOpenChange={(o) => { if (!o) { setSelectedReq(null); setAction(null); setNotes(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action === "approve" ? "✅ Setujui Diskon" : "❌ Tolak Diskon"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-muted rounded-lg p-3 text-sm">
              <p><strong>Booking:</strong> {selectedReq?.booking?.booking_code}</p>
              <p><strong>Jamaah:</strong> {selectedReq?.booking?.customer?.full_name}</p>
              <p><strong>Diskon:</strong> {selectedReq?.discount_pct ? `${selectedReq.discount_pct}%` : formatCurrency(Number(selectedReq?.discount_amount || 0))}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Catatan {action === "reject" ? "(wajib)" : "(opsional)"}</label>
              <Textarea
                placeholder={action === "approve" ? "Catatan tambahan..." : "Alasan penolakan..."}
                value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedReq(null); setAction(null); setNotes(""); }}>Batal</Button>
            <Button
              onClick={handleReview}
              disabled={reviewMutation.isPending || (action === "reject" && !notes.trim())}
              className={action === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {reviewMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {action === "approve" ? "Ya, Setujui" : "Ya, Tolak"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
