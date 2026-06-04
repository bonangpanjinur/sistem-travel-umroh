import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HotelForm } from "@/components/admin/forms/HotelForm";
import { Search, Plus, Edit, Trash2, Hotel as HotelIcon, BedDouble, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import HotelRoomCapacityCard from "@/components/admin/HotelRoomCapacityCard";
import { Database } from "@/integrations/supabase/types";

type Hotel = Database["public"]["Tables"]["hotels"]["Row"];

export default function AdminHotels() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Hotel | null>(null);
  const [expandedCapacity, setExpandedCapacity] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: hotels, isLoading } = useQuery({
    queryKey: ["admin-hotels"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hotels").select("*").order("name");
      if (error) throw error;
      return data as Hotel[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hotels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Hotel berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["admin-hotels"] });
    },
  });

  const filteredHotels = hotels?.filter(h =>
    h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Kelola Hotel</h1>
          <p className="text-muted-foreground">Daftar hotel Makkah & Madinah</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari hotel..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 w-64" />
          </div>
          <Button onClick={() => { setEditingHotel(null); setIsFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />Tambah Hotel
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Memuat data hotel..." />
      ) : !filteredHotels?.length ? (
        <EmptyState
          icon={HotelIcon}
          title="Belum ada hotel"
          description="Tambahkan hotel Makkah & Madinah"
          actionLabel="Tambah Hotel"
          onAction={() => { setEditingHotel(null); setIsFormOpen(true); }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredHotels.map(hotel => (
            <div key={hotel.id} className="space-y-2">
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">{hotel.name}</h3>
                      <p className="text-sm text-muted-foreground">{hotel.city}</p>
                    </div>
                    <Badge variant={hotel.is_active ? "default" : "secondary"}>
                      {hotel.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>
                  <p className="text-sm">{"⭐".repeat(hotel.star_rating || 3)}</p>
                  {hotel.distance_to_masjid && (
                    <p className="text-xs text-muted-foreground mt-1">Jarak: {hotel.distance_to_masjid}</p>
                  )}
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setEditingHotel(hotel); setIsFormOpen(true); }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteTarget(hotel)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto text-xs gap-1"
                      onClick={() =>
                        setExpandedCapacity(prev => prev === hotel.id ? null : hotel.id)
                      }
                      title="Atur kapasitas kamar hotel"
                    >
                      <BedDouble className="h-3.5 w-3.5" />
                      Kapasitas
                      {expandedCapacity === hotel.id
                        ? <ChevronUp className="h-3 w-3" />
                        : <ChevronDown className="h-3 w-3" />
                      }
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* K3 — Kapasitas kamar per tipe, expandable */}
              {expandedCapacity === hotel.id && (
                <HotelRoomCapacityCard
                  hotelId={hotel.id}
                  hotelName={hotel.name}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingHotel ? "Edit Hotel" : "Tambah Hotel"}</DialogTitle>
          </DialogHeader>
          <HotelForm
            hotelData={editingHotel || undefined}
            onSuccess={() => setIsFormOpen(false)}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus Hotel"
        description={`Yakin ingin menghapus hotel "${deleteTarget?.name}"?`}
        confirmLabel="Hapus"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}
