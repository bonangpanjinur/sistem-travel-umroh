import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DepartureExpenseForm } from "./DepartureExpenseForm";
import { Plus, Pencil, Trash2, Receipt, AlertCircle } from "lucide-react";
import { toast } from "sonner";

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

  const { data: items, isLoading } = useQuery({
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const db = supabase as any;
      const { error } = await db.from("departure_expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pengeluaran dihapus");
      queryClient.invalidateQueries({ queryKey: ["departure-expenses", departureId] });
      queryClient.invalidateQueries({ queryKey: ["departure-financial-summary", departureId] });
      setDeleteItem(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const total = (items || []).reduce((s: number, i: any) => s + (i.amount_idr || 0), 0);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4 text-orange-500" />
              Pengeluaran Operasional
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Realisasi biaya di lapangan</p>
          </div>
          <div className="flex items-center gap-3">
            {total > 0 && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-bold text-orange-600">{fmt(total)}</p>
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
          ) : !items || items.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Belum ada pengeluaran tercatat.</p>
            </div>
          ) : (
            <div>
              <div className="divide-y">
                {items.map((item: any) => {
                  const meta = CATEGORY_META[item.category] || CATEGORY_META.other;
                  return (
                    <div key={item.id} className="px-4 py-3 flex items-start gap-3 hover:bg-muted/20 transition-colors">
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
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.expense_date} 
                          {item.currency !== "IDR" && ` • ${item.currency} ${Number(item.amount).toLocaleString("id-ID")}`}
                        </p>
                        {item.notes && <p className="text-[10px] text-muted-foreground italic mt-0.5">{item.notes}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-orange-700">{fmt(item.amount_idr || 0)}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditItem(item); setFormOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteItem(item)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {total > 0 && (
                <div className="px-4 py-3 bg-orange-50 border-t flex justify-between items-center">
                  <span className="font-semibold text-sm">Total Pengeluaran</span>
                  <span className="font-bold text-orange-600 text-base">{fmt(total)}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Pengeluaran" : "Tambah Pengeluaran"}</DialogTitle>
          </DialogHeader>
          <DepartureExpenseForm
            departureId={departureId}
            item={editItem}
            onSuccess={() => { setFormOpen(false); setEditItem(null); }}
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
