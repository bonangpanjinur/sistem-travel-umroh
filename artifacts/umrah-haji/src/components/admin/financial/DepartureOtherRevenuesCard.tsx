import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DepartureOtherRevenueForm } from "./DepartureOtherRevenueForm";
import { Plus, Pencil, Trash2, TrendingUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  room_upgrade:    { label: "Upgrade Kamar",    icon: "🛏️" },
  extra_night:     { label: "Malam Tambahan",   icon: "🌙" },
  addon_service:   { label: "Layanan Tambahan", icon: "➕" },
  visa_extra:      { label: "Visa Tambahan",    icon: "🛂" },
  transport_extra: { label: "Transport Extra",  icon: "🚌" },
  insurance_extra: { label: "Upgrade Asuransi", icon: "🔒" },
  equipment_extra: { label: "Perlengkapan",     icon: "📦" },
  penalty_fee:     { label: "Biaya Batal",      icon: "⚠️" },
  other:           { label: "Lainnya",          icon: "📝" },
};

function fmt(n: number) {
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

interface Props {
  departureId: string;
}

export function DepartureOtherRevenuesCard({ departureId }: Props) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["departure-other-revenues", departureId],
    queryFn: async () => {
      const db = supabase as any;
      const { data, error } = await db
        .from("departure_other_revenues")
        .select("*")
        .eq("departure_id", departureId)
        .order("revenue_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const db = supabase as any;
      const { error } = await db.from("departure_other_revenues").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pendapatan dihapus");
      queryClient.invalidateQueries({ queryKey: ["departure-other-revenues", departureId] });
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
              <TrendingUp className="h-4 w-4 text-green-500" />
              Pendapatan Tambahan
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Upgrade, addon, dan pendapatan di luar harga paket</p>
          </div>
          <div className="flex items-center gap-3">
            {total > 0 && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-bold text-green-600">{fmt(total)}</p>
              </div>
            )}
            <Button size="sm" variant="outline" className="border-green-200 text-green-700 hover:bg-green-50"
              onClick={() => { setEditItem(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Tambah
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
          ) : !items || items.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Belum ada pendapatan tambahan tercatat.</p>
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
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-200 text-green-700">{meta.label}</Badge>
                          {item.location && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{item.location}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.revenue_date}
                          {item.currency !== "IDR" && ` • ${item.currency} ${Number(item.amount).toLocaleString("id-ID")}`}
                        </p>
                        {item.notes && <p className="text-[10px] text-muted-foreground italic mt-0.5">{item.notes}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-green-700">{fmt(item.amount_idr || 0)}</p>
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
                <div className="px-4 py-3 bg-green-50 border-t flex justify-between items-center">
                  <span className="font-semibold text-sm">Total Pendapatan Tambahan</span>
                  <span className="font-bold text-green-600 text-base">{fmt(total)}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Pendapatan Tambahan" : "Tambah Pendapatan Tambahan"}</DialogTitle>
          </DialogHeader>
          <DepartureOtherRevenueForm
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
            <AlertDialogTitle>Hapus Pendapatan?</AlertDialogTitle>
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
