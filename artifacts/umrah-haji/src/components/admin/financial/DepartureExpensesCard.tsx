import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DepartureExpenseForm } from "./DepartureExpenseForm";
import { Plus, Pencil, Trash2, Receipt, AlertCircle, RefreshCw, CheckCircle2, XCircle, Clock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  airline_ticket: { label: "Tiket",        icon: "✈️" },
  hotel:          { label: "Hotel",        icon: "🏨" },
  transport:      { label: "Transport",    icon: "🚌" },
  visa_fee:       { label: "Visa",         icon: "🛂" },
  guide:          { label: "Guide",        icon: "👨‍💼" },
  meals:          { label: "Konsumsi",     icon: "🍽️" },
  tips:           { label: "Tips",         icon: "💵" },
  souvenir:       { label: "Souvenir",     icon: "🎁" },
  printing:       { label: "Cetak",        icon: "🖨️" },
  refund:         { label: "Refund",       icon: "↩️" },
  penalty:        { label: "Penalti",      icon: "⚠️" },
  medical:        { label: "Medis",        icon: "🏥" },
  operational:    { label: "Operasional",  icon: "🏢" },
  other:          { label: "Lainnya",      icon: "📝" },
};

const PAYMENT_BADGE: Record<string, string> = {
  transfer: "Transfer", cash: "Tunai", card: "Kartu", other: "Lainnya",
};

const APPROVAL_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  pending_approval: { label: "Menunggu Approval", className: "bg-amber-100 text-amber-700 border-amber-300", icon: Clock },
  approved:         { label: "Disetujui",          className: "bg-emerald-100 text-emerald-700 border-emerald-300", icon: CheckCircle2 },
  rejected:         { label: "Ditolak",            className: "bg-red-100 text-red-700 border-red-300", icon: XCircle },
};

function fmt(n: number) {
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

interface Props {
  departureId: string;
}

export function DepartureExpensesCard({ departureId }: Props) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["departure-expenses", departureId],
    queryFn: async () => {
      const db = supabase as any;
      const { data, error } = await db
        .from("departure_expenses")
        .select("*")
        .eq("departure_id", departureId)
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const triggerRecalculate = useCallback(async () => {
    setIsRecalculating(true);
    try {
      const db = supabase as any;
      await db.rpc("recalculate_departure_financial_summary", { p_departure_id: departureId });
      queryClient.invalidateQueries({ queryKey: ["departure-financial-summary", departureId] });
    } catch (_e) {
    } finally {
      setIsRecalculating(false);
    }
  }, [departureId, queryClient]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const db = supabase as any;
      const { error } = await db.from("departure_expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Pengeluaran dihapus");
      queryClient.invalidateQueries({ queryKey: ["departure-expenses", departureId] });
      setDeleteItem(null);
      await triggerRecalculate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approved" | "rejected" }) => {
      const db = supabase as any;
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await db
        .from("departure_expenses")
        .update({
          approval_status: action,
          approved_by:     user?.id ?? null,
          approved_at:     new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: async (_, { action }) => {
      toast.success(action === "approved" ? "Pengeluaran disetujui" : "Pengeluaran ditolak");
      queryClient.invalidateQueries({ queryKey: ["departure-expenses", departureId] });
      if (action === "approved") await triggerRecalculate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleFormSuccess = async () => {
    setFormOpen(false);
    setEditItem(null);
    queryClient.invalidateQueries({ queryKey: ["departure-expenses", departureId] });
    await triggerRecalculate();
  };

  const pending  = items.filter((i: any) => i.approval_status === "pending_approval" || !i.approval_status);
  const approved = items.filter((i: any) => i.approval_status === "approved");
  const rejected = items.filter((i: any) => i.approval_status === "rejected");

  const totalApproved = approved.reduce((s: number, i: any) => s + (i.amount_idr || 0), 0);
  const totalPending  = pending.reduce((s: number, i: any)  => s + (i.amount_idr || 0), 0);
  const totalAll      = items.reduce((s: number, i: any)    => s + (i.amount_idr || 0), 0);

  function ExpenseRow({ item, showApprovalButtons }: { item: any; showApprovalButtons?: boolean }) {
    const meta = CATEGORY_META[item.category] || CATEGORY_META.other;
    const approvalCfg = APPROVAL_CONFIG[item.approval_status] || APPROVAL_CONFIG.pending_approval;
    const ApprovalIcon = approvalCfg.icon;
    return (
      <div className="px-4 py-3 flex items-start gap-3 hover:bg-muted/20 transition-colors">
        <span className="text-lg mt-0.5">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{item.description}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{meta.label}</Badge>
            {item.location && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{item.location}</Badge>
            )}
            {item.payment_method && (
              <span className="text-[10px] text-muted-foreground">{PAYMENT_BADGE[item.payment_method] || item.payment_method}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-xs text-muted-foreground">
              {item.expense_date}
              {item.currency !== "IDR" && ` • ${item.currency} ${Number(item.amount).toLocaleString("id-ID")}`}
            </p>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 flex items-center gap-0.5 ${approvalCfg.className}`}>
              <ApprovalIcon className="h-2.5 w-2.5" />
              {approvalCfg.label}
            </Badge>
            {item.approved_at && item.approval_status === "approved" && (
              <span className="text-[10px] text-muted-foreground">
                {format(parseISO(item.approved_at), "d MMM yyyy", { locale: localeId })}
              </span>
            )}
          </div>
          {item.notes && <p className="text-[10px] text-muted-foreground italic mt-0.5">{item.notes}</p>}
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-orange-700">{fmt(item.amount_idr || 0)}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {showApprovalButtons && (item.approval_status === "pending_approval" || !item.approval_status) && (
            <>
              <Button
                variant="ghost" size="sm"
                className="h-7 px-2 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700 text-[11px]"
                disabled={approveMutation.isPending}
                onClick={() => approveMutation.mutate({ id: item.id, action: "approved" })}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-0.5" /> Setuju
              </Button>
              <Button
                variant="ghost" size="sm"
                className="h-7 px-2 text-red-600 hover:bg-red-50 hover:text-red-600 text-[11px]"
                disabled={approveMutation.isPending}
                onClick={() => approveMutation.mutate({ id: item.id, action: "rejected" })}
              >
                <XCircle className="h-3.5 w-3.5 mr-0.5" /> Tolak
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditItem(item); setFormOpen(true); }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteItem(item)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4 text-orange-500" />
              Pengeluaran Operasional
              {isRecalculating && <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Realisasi biaya lapangan · Disetujui: {fmt(totalApproved)} · Menunggu: {fmt(totalPending)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {totalAll > 0 && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-bold text-orange-600">{fmt(totalAll)}</p>
              </div>
            )}
            <Button size="sm" variant="outline" onClick={() => { setEditItem(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Tambah
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Belum ada pengeluaran tercatat.</p>
            </div>
          ) : (
            <Tabs defaultValue="semua" className="w-full">
              <div className="px-4 pt-2 pb-0">
                <TabsList className="h-8 text-xs">
                  <TabsTrigger value="semua" className="text-xs h-7 gap-1">
                    Semua
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">{items.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="text-xs h-7 gap-1 text-amber-600">
                    <Clock className="h-3 w-3" /> Pending
                    {pending.length > 0 && <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1 py-0">{pending.length}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="approved" className="text-xs h-7 gap-1 text-emerald-700">
                    <ShieldCheck className="h-3 w-3" /> Disetujui
                    {approved.length > 0 && <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-1 py-0">{approved.length}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="rejected" className="text-xs h-7 gap-1 text-red-600">
                    <XCircle className="h-3 w-3" /> Ditolak
                    {rejected.length > 0 && <Badge className="bg-red-100 text-red-700 text-[10px] px-1 py-0">{rejected.length}</Badge>}
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="semua" className="mt-0">
                <div className="divide-y">
                  {items.map((item: any) => <ExpenseRow key={item.id} item={item} showApprovalButtons />)}
                </div>
                {totalAll > 0 && (
                  <div className="px-4 py-3 bg-orange-50 border-t flex justify-between items-center">
                    <span className="font-semibold text-sm">Total Semua Pengeluaran</span>
                    <span className="font-bold text-orange-600 text-base">{fmt(totalAll)}</span>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="pending" className="mt-0">
                {pending.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-40 text-emerald-500" />
                    <p className="text-sm">Tidak ada pengeluaran menunggu approval</p>
                  </div>
                ) : (
                  <div>
                    <div className="px-4 py-2 bg-amber-50/60 border-b text-xs text-amber-700 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {pending.length} pengeluaran menunggu persetujuan manager — total {fmt(totalPending)}
                    </div>
                    <div className="divide-y">
                      {pending.map((item: any) => <ExpenseRow key={item.id} item={item} showApprovalButtons />)}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="approved" className="mt-0">
                {approved.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <p className="text-sm">Belum ada pengeluaran disetujui</p>
                  </div>
                ) : (
                  <div>
                    <div className="divide-y">
                      {approved.map((item: any) => <ExpenseRow key={item.id} item={item} />)}
                    </div>
                    <div className="px-4 py-3 bg-emerald-50 border-t flex justify-between items-center">
                      <span className="font-semibold text-sm text-emerald-700">Total Disetujui</span>
                      <span className="font-bold text-emerald-700 text-base">{fmt(totalApproved)}</span>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="rejected" className="mt-0">
                {rejected.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <p className="text-sm">Tidak ada pengeluaran ditolak</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {rejected.map((item: any) => <ExpenseRow key={item.id} item={item} />)}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Pengeluaran" : "Tambah Pengeluaran"}</DialogTitle>
            {!editItem && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3 text-amber-500" />
                Pengeluaran baru akan masuk status <strong>Menunggu Approval</strong> dari manager sebelum dicatat ke laporan
              </p>
            )}
          </DialogHeader>
          <DepartureExpenseForm
            departureId={departureId}
            item={editItem}
            onSuccess={handleFormSuccess}
            onCancel={() => { setFormOpen(false); setEditItem(null); }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengeluaran?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-destructive" /> Hapus <strong>{deleteItem?.description}</strong>?</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteMutation.mutate(deleteItem?.id)}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
