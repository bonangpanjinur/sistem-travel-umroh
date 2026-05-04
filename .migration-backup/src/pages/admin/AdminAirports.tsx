import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AirportForm } from "@/components/admin/forms/AirportForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type Airport = Database["public"]["Tables"]["airports"]["Row"];

export default function AdminAirports() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAirport, setEditingAirport] = useState<Airport | null>(null);
  const queryClient = useQueryClient();

  const { data: airports, isLoading } = useQuery({
    queryKey: ["admin-airports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("airports").select("*").order("code");
      if (error) throw error;
      return data as Airport[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("airports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bandara berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["admin-airports"] });
    },
  });

  const filtered = airports?.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari bandara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Button onClick={() => { setEditingAirport(null); setIsFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Tambah Bandara
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Kota</TableHead>
              <TableHead>Negara</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Memuat data...</TableCell>
              </TableRow>
            ) : filtered?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "Tidak ada hasil" : "Belum ada bandara"}
                </TableCell>
              </TableRow>
            ) : (
              filtered?.map(airport => (
                <TableRow key={airport.id}>
                  <TableCell className="font-mono font-bold">{airport.code}</TableCell>
                  <TableCell>{airport.name}</TableCell>
                  <TableCell>{airport.city}</TableCell>
                  <TableCell>{airport.country}</TableCell>
                  <TableCell>
                    <Badge variant={airport.is_active ? "default" : "secondary"}>
                      {airport.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setEditingAirport(airport); setIsFormOpen(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => {
                        if (confirm("Apakah Anda yakin ingin menghapus bandara ini?")) {
                          deleteMutation.mutate(airport.id);
                        }
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAirport ? "Edit" : "Tambah"} Bandara</DialogTitle>
          </DialogHeader>
          <AirportForm 
            airportData={editingAirport || undefined} 
            onSuccess={() => setIsFormOpen(false)} 
            onCancel={() => setIsFormOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
