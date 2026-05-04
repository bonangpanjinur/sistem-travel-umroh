import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Variant {
  id: string;
  equipment_id: string;
  size: string | null;
  color: string | null;
  sku: string | null;
  stock_good: number;
  stock_damaged: number;
  low_stock_threshold: number;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  equipmentId: string;
  equipmentName: string;
}

export function VariantManagerDialog({ open, onOpenChange, equipmentId, equipmentName }: Props) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({ size: "", color: "", sku: "", stock_good: 0, stock_damaged: 0, low_stock_threshold: 5 });

  const { data: variants, isLoading } = useQuery({
    queryKey: ["equipment-variants", equipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_variants" as any)
        .select("*")
        .eq("equipment_id", equipmentId)
        .order("created_at");
      if (error) throw error;
      return (data || []) as unknown as Variant[];
    },
    enabled: open && !!equipmentId,
  });

  useEffect(() => {
    if (!open) {
      setDraft({ size: "", color: "", sku: "", stock_good: 0, stock_damaged: 0, low_stock_threshold: 5 });
    }
  }, [open]);

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("equipment_variants" as any)
        .insert({
          equipment_id: equipmentId,
          size: draft.size || null,
          color: draft.color || null,
          sku: draft.sku || null,
          stock_good: draft.stock_good,
          stock_damaged: draft.stock_damaged,
          low_stock_threshold: draft.low_stock_threshold,
        });
      if (error) throw error;
      // Mark item as having variants
      await supabase.from("equipment_items").update({ has_variants: true } as any).eq("id", equipmentId);
    },
    onSuccess: () => {
      toast.success("Varian ditambahkan");
      setDraft({ size: "", color: "", sku: "", stock_good: 0, stock_damaged: 0, low_stock_threshold: 5 });
      queryClient.invalidateQueries({ queryKey: ["equipment-variants", equipmentId] });
      queryClient.invalidateQueries({ queryKey: ["equipment-items"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (v: Variant) => {
      const { error } = await supabase
        .from("equipment_variants" as any)
        .update({
          size: v.size,
          color: v.color,
          sku: v.sku,
          stock_good: v.stock_good,
          stock_damaged: v.stock_damaged,
          low_stock_threshold: v.low_stock_threshold,
        })
        .eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Varian diperbarui");
      queryClient.invalidateQueries({ queryKey: ["equipment-variants", equipmentId] });
      queryClient.invalidateQueries({ queryKey: ["equipment-items"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipment_variants" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Varian dihapus");
      queryClient.invalidateQueries({ queryKey: ["equipment-variants", equipmentId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleAdd = () => {
    if (draft.stock_good < 0) return toast.error("Stok tidak boleh negatif");
    addMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Kelola Varian — {equipmentName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Form tambah varian */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 p-3 bg-muted/40 rounded-lg items-end">
            <div className="space-y-1">
              <Label className="text-xs">Ukuran</Label>
              <Input value={draft.size} onChange={(e) => setDraft({ ...draft, size: e.target.value })} placeholder="S/M/L/XL" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Warna</Label>
              <Input value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} placeholder="Hitam" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">SKU</Label>
              <Input value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} placeholder="opsional" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Stok Bagus</Label>
              <Input type="number" min={0} value={draft.stock_good} onChange={(e) => setDraft({ ...draft, stock_good: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Stok Rusak</Label>
              <Input type="number" min={0} value={draft.stock_damaged} onChange={(e) => setDraft({ ...draft, stock_damaged: parseInt(e.target.value) || 0 })} />
            </div>
            <Button onClick={handleAdd} disabled={addMutation.isPending} className="gap-1">
              {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Tambah
            </Button>
          </div>

          {/* Tabel varian */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ukuran</TableHead>
                  <TableHead>Warna</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Stok Bagus</TableHead>
                  <TableHead>Stok Rusak</TableHead>
                  <TableHead>Min</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-6"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : variants && variants.length > 0 ? (
                  variants.map((v) => {
                    const isLow = v.stock_good <= v.low_stock_threshold;
                    const isOut = v.stock_good === 0;
                    return (
                      <TableRow key={v.id}>
                        <TableCell><Input value={v.size || ""} onChange={(e) => updateMutation.mutate({ ...v, size: e.target.value })} className="h-8" /></TableCell>
                        <TableCell><Input value={v.color || ""} onChange={(e) => updateMutation.mutate({ ...v, color: e.target.value })} className="h-8" /></TableCell>
                        <TableCell><Input value={v.sku || ""} onChange={(e) => updateMutation.mutate({ ...v, sku: e.target.value })} className="h-8" /></TableCell>
                        <TableCell><Input type="number" min={0} value={v.stock_good} onChange={(e) => updateMutation.mutate({ ...v, stock_good: parseInt(e.target.value) || 0 })} className="h-8 w-20" /></TableCell>
                        <TableCell><Input type="number" min={0} value={v.stock_damaged} onChange={(e) => updateMutation.mutate({ ...v, stock_damaged: parseInt(e.target.value) || 0 })} className="h-8 w-20" /></TableCell>
                        <TableCell><Input type="number" min={0} value={v.low_stock_threshold} onChange={(e) => updateMutation.mutate({ ...v, low_stock_threshold: parseInt(e.target.value) || 0 })} className="h-8 w-16" /></TableCell>
                        <TableCell>
                          {isOut ? <Badge variant="destructive">Habis</Badge> : isLow ? <Badge variant="secondary" className="gap-1"><AlertTriangle className="h-3 w-3" />Menipis</Badge> : <Badge>Aman</Badge>}
                        </TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(v.id)} disabled={deleteMutation.isPending}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Belum ada varian. Item akan menggunakan stok agregat.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}