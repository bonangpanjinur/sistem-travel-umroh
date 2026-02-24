import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AirlineForm } from "@/components/admin/forms/AirlineForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type Airline = Database["public"]["Tables"]["airlines"]["Row"];

export default function AdminAirlines() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAirline, setEditingAirline] = useState<Airline | null>(null);
  const queryClient = useQueryClient();

  const { data: airlines, isLoading } = useQuery({
    queryKey: ["admin-airlines"],
    queryFn: async () => {
      const { data, error } = await supabase.from("airlines").select("*").order("name");
      if (error) throw error;
      return data as Airline[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("airlines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Maskapai berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["admin-airlines"] });
    },
  });

  const filtered = airlines?.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold">Kelola Maskapai</h1></div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 w-64" />
          </div>
          <Button onClick={() => { setEditingAirline(null); setIsFormOpen(true); }}><Plus className="h-4 w-4 mr-2" />Tambah</Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Kode</TableHead><TableHead>Nama</TableHead><TableHead>Status</TableHead><TableHead>Aksi</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Memuat data...</TableCell>
              </TableRow>
            ) : filtered?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Tidak ada data ditemukan</TableCell>
              </TableRow>
            ) : (
              filtered?.map(airline => (
                <TableRow key={airline.id}>
                  <TableCell className="font-mono">{airline.code}</TableCell>
                  <TableCell>{airline.name}</TableCell>
                  <TableCell><Badge variant={airline.is_active ? "default" : "secondary"}>{airline.is_active ? "Aktif" : "Nonaktif"}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setEditingAirline(airline); setIsFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => {
                        if (confirm("Apakah Anda yakin ingin menghapus maskapai ini?")) {
                          deleteMutation.mutate(airline.id);
                        }
                      }}><Trash2 className="h-4 w-4" /></Button>
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
            <DialogTitle>{editingAirline ? "Edit" : "Tambah"} Maskapai</DialogTitle>
          </DialogHeader>
          <AirlineForm 
            airlineData={editingAirline || undefined} 
            onSuccess={() => setIsFormOpen(false)} 
            onCancel={() => setIsFormOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
