import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RotateCcw, Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Distribution {
  id: string;
  equipment_id: string;
  customer_id: string;
  quantity: number;
  distributed_at: string;
  equipment?: { name: string } | null;
  customer?: { full_name: string } | null;
}

export function ReturnTab({ departureId }: { departureId: string }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Distribution | null>(null);
  const [form, setForm] = useState({ condition: "good" as "good" | "damaged" | "lost", admin_fee: 0, notes: "" });
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const { data: distributions, isLoading } = useQuery({
    queryKey: ["return-distributions", departureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_distributions")
        .select(`*, equipment:equipment_items(name), customer:customers(full_name)`)
        .eq("departure_id", departureId)
        .eq("status", "distributed")
        .order("distributed_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Distribution[];
    },
    enabled: !!departureId,
  });

  const returnMutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Tidak ada distribusi terpilih");
      let photoUrl: string | null = null;
      if (photoFile) {
        const path = `${selected.id}/return_${Date.now()}_${photoFile.name}`;
        const { error: upErr } = await supabase.storage.from("equipment-photos").upload(path, photoFile);
        if (upErr) throw upErr;
        photoUrl = path;
      }
      const { error } = await supabase.rpc("return_equipment_distribution" as any, {
        p_distribution_id: selected.id,
        p_condition: form.condition,
        p_admin_fee: form.admin_fee,
        p_notes: form.notes || null,
        p_return_photo_url: photoUrl,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Retur berhasil diproses");
      queryClient.invalidateQueries({ queryKey: ["return-distributions"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-distributions"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-items"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-variants"] });
      setSelected(null);
      setPhotoFile(null);
      setForm({ condition: "good", admin_fee: 0, notes: "" });
    },
    onError: (err: Error) => toast.error(`Gagal: ${err.message}`),
  });

  if (!departureId) {
    return (
      <Card><CardContent className="py-10 text-center text-muted-foreground">
        <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
        Pilih keberangkatan terlebih dahulu
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RotateCcw className="h-4 w-4" /> Daftar Distribusi Aktif
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-6"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
          ) : distributions && distributions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jamaah</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead className="w-32">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {distributions.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-xs">{format(new Date(d.distributed_at), "dd MMM yyyy")}</TableCell>
                    <TableCell className="font-medium">{d.customer?.full_name}</TableCell>
                    <TableCell>{d.equipment?.name}</TableCell>
                    <TableCell><Badge variant="secondary">{d.quantity}</Badge></TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => setSelected(d)} className="gap-1">
                        <RotateCcw className="h-3 w-3" /> Retur
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-6">Tidak ada distribusi aktif</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proses Retur</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded text-sm">
                <p><strong>{selected.customer?.full_name}</strong> — {selected.equipment?.name} (qty: {selected.quantity})</p>
              </div>
              <div className="space-y-1">
                <Label>Kondisi Barang</Label>
                <Select value={form.condition} onValueChange={(v: any) => setForm({ ...form, condition: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Bagus (kembali ke stok bagus)</SelectItem>
                    <SelectItem value="damaged">Rusak (kembali ke stok rusak)</SelectItem>
                    <SelectItem value="lost">Hilang (tidak dikembalikan)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Biaya Admin (Rp)</Label>
                <Input type="number" min={0} value={form.admin_fee} onChange={(e) => setForm({ ...form, admin_fee: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1">
                <Label>Foto Kondisi Retur (opsional)</Label>
                <Input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
              </div>
              <div className="space-y-1">
                <Label>Catatan</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Opsional" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Batal</Button>
            <Button onClick={() => returnMutation.mutate()} disabled={returnMutation.isPending}>
              {returnMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Proses Retur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}