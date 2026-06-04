import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Package, Plus, Trash2, Loader2, Box } from "lucide-react";

interface Props {
  packageTypeId: string;
  packageTypeName: string;
}

export function PackageTypeEquipmentCard({ packageTypeId, packageTypeName }: Props) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, { quantity: number; required: boolean }>>({});

  const { data: allItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ['equipment-items-all'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('equipment_items')
        .select('id, name, category, stock_quantity')
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: linked = [], isLoading: loadingLinked } = useQuery({
    queryKey: ['package-type-equipment', packageTypeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('package_type_equipment')
        .select('id, equipment_item_id, default_quantity, is_required, equipment_items(name, category)')
        .eq('package_type_id', packageTypeId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const rows = Object.entries(selected).map(([itemId, cfg]) => ({
        package_type_id: packageTypeId,
        equipment_item_id: itemId,
        default_quantity: cfg.quantity || 1,
        is_required: cfg.required,
      }));
      const { error } = await (supabase as any)
        .from('package_type_equipment')
        .upsert(rows, { onConflict: 'package_type_id,equipment_item_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Perlengkapan default berhasil disimpan');
      queryClient.invalidateQueries({ queryKey: ['package-type-equipment', packageTypeId] });
      setIsDialogOpen(false);
      setSelected({});
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('package_type_equipment').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Perlengkapan dihapus');
      queryClient.invalidateQueries({ queryKey: ['package-type-equipment', packageTypeId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleItem = (itemId: string) => {
    setSelected(prev => {
      const next = { ...prev };
      if (next[itemId]) delete next[itemId];
      else next[itemId] = { quantity: 1, required: false };
      return next;
    });
  };

  const linkedItemIds = new Set(linked.map((l: any) => l.equipment_item_id));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Box className="h-5 w-5 text-primary" />
            Perlengkapan Default
          </CardTitle>
          <CardDescription>
            Perlengkapan yang otomatis disiapkan untuk paket tipe {packageTypeName}
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Tambah
        </Button>
      </CardHeader>
      <CardContent>
        {loadingLinked ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : linked.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Belum ada perlengkapan default untuk tipe paket ini.</p>
            <p className="text-xs mt-1">Klik "Tambah" untuk menentukan perlengkapan default.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Perlengkapan</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-center">Jumlah Default</TableHead>
                <TableHead className="text-center">Wajib</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {linked.map((row: any) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.equipment_items?.name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {row.equipment_items?.category || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{row.default_quantity}</TableCell>
                  <TableCell className="text-center">
                    {row.is_required ? (
                      <Badge className="text-xs">Wajib</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Opsional</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(row.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Perlengkapan Default — {packageTypeName}</DialogTitle>
          </DialogHeader>
          {loadingItems ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {allItems.map((item: any) => {
                const isLinked = linkedItemIds.has(item.id);
                const isSelected = !!selected[item.id];
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isSelected ? 'bg-primary/5 border-primary/30' : ''
                    } ${isLinked ? 'opacity-40' : 'cursor-pointer hover:bg-muted/50'}`}
                    onClick={() => !isLinked && toggleItem(item.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={isLinked}
                      onCheckedChange={() => !isLinked && toggleItem(item.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    </div>
                    {isLinked && <Badge variant="secondary" className="text-xs">Sudah ada</Badge>}
                    {isSelected && (
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Label className="text-xs whitespace-nowrap">Jumlah:</Label>
                          <Input
                            type="number"
                            min={1}
                            className="w-16 h-7 text-sm"
                            value={selected[item.id].quantity}
                            onChange={e =>
                              setSelected(prev => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], quantity: Number(e.target.value) || 1 },
                              }))
                            }
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <Checkbox
                            id={`req-${item.id}`}
                            checked={selected[item.id].required}
                            onCheckedChange={v =>
                              setSelected(prev => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], required: !!v },
                              }))
                            }
                          />
                          <Label htmlFor={`req-${item.id}`} className="text-xs cursor-pointer">Wajib</Label>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); setSelected({}); }}>
              Batal
            </Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={Object.keys(selected).length === 0 || addMutation.isPending}
            >
              {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Simpan ({Object.keys(selected).length} item)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
