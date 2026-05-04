import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, CheckCircle2, AlertCircle } from "lucide-react";

import { getEquipmentItems, getStockOpname, createStockOpname } from "@/features/equipment/queries";
import type { EquipmentItem } from "@/features/equipment/dto";

export default function AdminStockOpname() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null);
  const [formData, setFormData] = useState({
    physicalCount: 0,
    notes: "",
    picName: "",
    picType: "pusat",
  });

  const { data: equipmentItems } = useQuery({
    queryKey: ["equipment-items-master"],
    queryFn: getEquipmentItems,
  });

  const { data: opnameRecords } = useQuery({
    queryKey: ["stock-opname"],
    queryFn: getStockOpname,
  });

  const filteredEquipment = useMemo(
    () => (equipmentItems ?? []).filter((i) => i.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [equipmentItems, searchTerm],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedItem) throw new Error("Item tidak dipilih");
      const systemCount = selectedItem.stockQuantity;
      await createStockOpname({
        equipment_item_id: selectedItem.id,
        physical_count: formData.physicalCount,
        system_count: systemCount,
        difference: formData.physicalCount - systemCount,
        notes: formData.notes || null,
        pic_name: formData.picName || null,
        pic_type: formData.picType,
        status: "completed",
        opname_date: new Date().toISOString().split("T")[0],
      });
    },
    onSuccess: () => {
      toast.success("Stock opname berhasil disimpan");
      queryClient.invalidateQueries({ queryKey: ["stock-opname"] });
      setShowDialog(false);
      setSelectedItem(null);
      setFormData({ physicalCount: 0, notes: "", picName: "", picType: "pusat" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleStartOpname = (item: EquipmentItem) => {
    setSelectedItem(item);
    setFormData({
      physicalCount: item.stockQuantity,
      notes: "",
      picName: item.pic ?? "",
      picType: item.picType ?? "pusat",
    });
    setShowDialog(true);
  };

  const totalItems = equipmentItems?.length ?? 0;
  const totalOpnames = opnameRecords?.length ?? 0;
  const totalDiscrepancies = (opnameRecords ?? []).filter((r) => r.difference !== 0).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari peralatan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Opname</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalOpnames}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Selisih Ditemukan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{totalDiscrepancies}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Perlengkapan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-center">Stok Sistem</TableHead>
                <TableHead>PIC</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEquipment.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.category}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{item.stockQuantity}</TableCell>
                  <TableCell>{item.pic ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => handleStartOpname(item)}>
                      <Plus className="h-4 w-4 mr-1" /> Opname
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!filteredEquipment.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Tidak ada perlengkapan
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Stock Opname</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-center">Sistem</TableHead>
                <TableHead className="text-center">Fisik</TableHead>
                <TableHead className="text-center">Selisih</TableHead>
                <TableHead>PIC</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(opnameRecords ?? []).map((rec) => (
                <TableRow key={rec.id}>
                  <TableCell>{rec.opnameDate}</TableCell>
                  <TableCell className="font-medium">{rec.equipmentItem?.name ?? "-"}</TableCell>
                  <TableCell className="text-center">{rec.systemCount}</TableCell>
                  <TableCell className="text-center">{rec.physicalCount}</TableCell>
                  <TableCell className="text-center">
                    <span className={rec.difference !== 0 ? "text-destructive font-semibold" : ""}>
                      {rec.difference > 0 ? `+${rec.difference}` : rec.difference}
                    </span>
                  </TableCell>
                  <TableCell>
                    {rec.picName ? (
                      <Badge variant="outline">
                        {rec.picName} ({rec.picType ?? "-"})
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {rec.difference === 0 ? (
                      <Badge className="gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Sesuai
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3 w-3" /> Selisih
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!opnameRecords?.length && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Belum ada riwayat opname
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stock Opname - {selectedItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stok Sistem</Label>
                <Input value={selectedItem?.stockQuantity ?? 0} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Stok Fisik *</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.physicalCount}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, physicalCount: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama PIC</Label>
                <Input
                  value={formData.picName}
                  onChange={(e) => setFormData((p) => ({ ...p, picName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipe PIC</Label>
                <Select
                  value={formData.picType}
                  onValueChange={(v) => setFormData((p) => ({ ...p, picType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pusat">Pusat</SelectItem>
                    <SelectItem value="cabang">Cabang</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Catatan opsional..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Batal
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}