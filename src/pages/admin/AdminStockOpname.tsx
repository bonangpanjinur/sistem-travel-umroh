import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Search, CheckCircle2, AlertCircle, RotateCcw } from "lucide-react";

interface EquipmentItem {
  id: string;
  name: string;
  category: string;
  stock_quantity: number | null;
  pic: string | null;
  pic_type: string | null;
}

interface StockOpname {
  id: string;
  equipment_item_id: string;
  opname_date: string;
  physical_count: number;
  system_count: number;
  difference: number;
  notes: string | null;
  pic_name: string | null;
  pic_type: string | null;
  status: string;
  created_at: string;
  equipment_item?: EquipmentItem;
}

export default function AdminStockOpname() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null);
  const [formData, setFormData] = useState({
    physical_count: 0,
    notes: "",
    pic_name: "",
    pic_type: "pusat"
  });

  // Fetch equipment items
  const { data: equipmentItems } = useQuery({
    queryKey: ["equipment-items-master"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_items")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as EquipmentItem[];
    },
  });

  // Fetch stock opname records
  const { data: opnameRecords } = useQuery({
    queryKey: ["stock-opname"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_stock_opname")
        .select("*")
        .order("opname_date", { ascending: false });
      if (error) throw error;
      
      // Fetch equipment details for each record
      const records = data || [];
      const enrichedRecords: StockOpname[] = await Promise.all(
        records.map(async (record) => {
          const { data: item } = await supabase
            .from("equipment_items")
            .select("id, name, category, stock_quantity, pic, pic_type")
            .eq("id", record.equipment_item_id)
            .single();
          return { ...record, equipment_item: item || undefined };
        })
      );
      return enrichedRecords;
    },
  });

  const filteredEquipment = equipmentItems?.filter(i =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedItem) return;
      
      const payload = {
        equipment_item_id: selectedItem.id,
        physical_count: formData.physical_count,
        system_count: selectedItem.stock_quantity || 0,
        difference: formData.physical_count - (selectedItem.stock_quantity || 0),
        notes: formData.notes || null,
        pic_name: formData.pic_name || null,
        pic_type: formData.pic_type,
        status: "completed",
        opname_date: new Date().toISOString().split("T")[0]
      };

      const { error } = await supabase
        .from("equipment_stock_opname")
        .insert(payload);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Stock opname berhasil disimpan");
      queryClient.invalidateQueries({ queryKey: ["stock-opname"] });
      setShowDialog(false);
      setSelectedItem(null);
      setFormData({ physical_count: 0, notes: "", pic_name: "", pic_type: "pusat" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleStartOpname = (item: EquipmentItem) => {
    setSelectedItem(item);
    setFormData({
      physical_count: item.stock_quantity || 0,
      notes: "",
      pic_name: item.pic || "",
      pic_type: item.pic_type || "pusat"
    });
    setShowDialog(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari peralatan..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{equipmentItems?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Opname</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{opnameRecords?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Selisih Tertunda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {opnameRecords?.filter(r => r.difference !== 0).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock Opname</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-center">Stok Sistem</TableHead>
                <TableHead className="text-center">Stok Fisik</TableHead>
                <TableHead className="text-center">Selisih</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>PIC</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opnameRecords?.map(record => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.equipment_item?.name || '-'}</TableCell>
                  <TableCell>{record.equipment_item?.category || '-'}</TableCell>
                  <TableCell className="text-center">{record.system_count}</TableCell>
                  <TableCell className="text-center">{record.physical_count}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={record.difference === 0 ? "default" : "destructive"}>
                      {record.difference > 0 ? `+${record.difference}` : record.difference}
                    </Badge>
                  </TableCell>
                  <TableCell>{record.opname_date}</TableCell>
                  <TableCell>
                    {record.pic_name && (
                      <Badge variant="outline">{record.pic_name} ({record.pic_type})</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => {
                      const item = record.equipment_item;
                      if (item) handleStartOpname(item);
                    }}>
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!opnameRecords?.length && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Belum ada data stock opname
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lakukan Stock Opname</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Item</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-center">Stok Saat Ini</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEquipment?.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell className="text-center">{item.stock_quantity || 0}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => handleStartOpname(item)}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Opname
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Opname Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stock Opname - {selectedItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stok di Sistem</Label>
                <Input value={selectedItem?.stock_quantity || 0} disabled />
              </div>
              <div className="space-y-2">
                <Label>Stok Fisik (Hasil Hitung) *</Label>
                <Input 
                  type="number" 
                  value={formData.physical_count} 
                  onChange={e => setFormData(p => ({ ...p, physical_count: parseInt(e.target.value) || 0 }))} 
                />
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium">Selisih: 
                <span className={`ml-2 ${(formData.physical_count - (selectedItem?.stock_quantity || 0)) === 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(formData.physical_count - (selectedItem?.stock_quantity || 0)) > 0 ? '+' : ''}
                  {formData.physical_count - (selectedItem?.stock_quantity || 0)}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>PIC Opname</Label>
                <Input value={formData.pic_name} onChange={e => setFormData(p => ({ ...p, pic_name: e.target.value }))} placeholder="Nama PIC..." />
              </div>
              <div className="space-y-2">
                <Label>Tipe PIC</Label>
                <select 
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={formData.pic_type}
                  onChange={e => setFormData(p => ({ ...p, pic_type: e.target.value }))}
                >
                  <option value="agent">Agent</option>
                  <option value="pusat">Pusat</option>
                  <option value="cabang">Cabang</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Input value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Catatan opname..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Simpan Opname
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}