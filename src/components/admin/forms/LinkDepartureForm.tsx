import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatDate, formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plane, Users, Calendar, Hotel } from "lucide-react";

interface LinkDepartureFormProps {
  packageId: string;
  linkedDepartureIds: string[];
  onSuccess: () => void;
  onCancel: () => void;
}

const MONTHS = [
  { value: "01", label: "Januari" },
  { value: "02", label: "Februari" },
  { value: "03", label: "Maret" },
  { value: "04", label: "April" },
  { value: "05", label: "Mei" },
  { value: "06", label: "Juni" },
  { value: "07", label: "Juli" },
  { value: "08", label: "Agustus" },
  { value: "09", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

export function LinkDepartureForm({
  packageId,
  linkedDepartureIds,
  onSuccess,
  onCancel,
}: LinkDepartureFormProps) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>(linkedDepartureIds);

  // Fetch all departures that either have no package or belong to this package
  const { data: availableDepartures, isLoading } = useQuery({
    queryKey: ['available-departures', packageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departures')
        .select(`
          *,
          departure_airport:airports!departures_departure_airport_id_fkey(code, city),
          arrival_airport:airports!departures_arrival_airport_id_fkey(code, city),
          airline:airlines(code, name),
          hotel_makkah:hotels!departures_hotel_makkah_id_fkey(name, star_rating),
          hotel_madinah:hotels!departures_hotel_madinah_id_fkey(name, star_rating),
          package:packages(id, name, package_types(code, name)),
          departure_hotels(hotel_id, hotel_role, hotels(name))
        `)
        .or(`package_id.is.null,package_id.eq.${packageId}`)
        .order('departure_date', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const linkMutation = useMutation({
    mutationFn: async () => {
      // First, unlink all departures from this package that are no longer selected
      const toUnlink = linkedDepartureIds.filter(id => !selectedIds.includes(id));
      if (toUnlink.length > 0) {
        const { error: unlinkError } = await supabase
          .from('departures')
          .update({ package_id: null })
          .in('id', toUnlink);
        if (unlinkError) throw unlinkError;
      }

      // Then, link the newly selected departures
      const toLink = selectedIds.filter(id => !linkedDepartureIds.includes(id));
      if (toLink.length > 0) {
        const { error: linkError } = await supabase
          .from('departures')
          .update({ package_id: packageId })
          .in('id', toLink);
        if (linkError) throw linkError;
      }
    },
    onSuccess: () => {
      toast.success("Jadwal keberangkatan berhasil diperbarui");
      queryClient.invalidateQueries({ queryKey: ['admin-departures', packageId] });
      queryClient.invalidateQueries({ queryKey: ['available-departures'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-departures'] });
      queryClient.invalidateQueries({ queryKey: ['departures'] });
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal memperbarui jadwal");
    },
  });

  const toggleDeparture = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-green-500 text-xs">Open</Badge>;
      case 'closed':
        return <Badge variant="secondary" className="text-xs">Closed</Badge>;
      case 'full':
        return <Badge className="bg-orange-500 text-xs">Full</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Memuat data...</div>;
  }

  const unlinkedDepartures = availableDepartures?.filter(d => !d.package_id) || [];
  const linkedDepartures = availableDepartures?.filter(d => d.package_id === packageId) || [];

  return (
    <div className="space-y-4">
      {unlinkedDepartures.length === 0 && linkedDepartures.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">Tidak ada jadwal keberangkatan tersedia</p>
          <p className="text-sm text-muted-foreground mt-1">
            Buat jadwal baru di menu <strong>Keberangkatan</strong>
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Pilih jadwal keberangkatan yang akan dihubungkan ke paket ini:
          </p>

          <div className="max-h-[400px] overflow-y-auto space-y-2 border rounded-lg p-2">
            {/* Currently linked */}
            {linkedDepartures.length > 0 && (
              <>
                <p className="text-xs font-medium text-muted-foreground px-2 pt-2">
                  Terhubung ke paket ini ({linkedDepartures.length})
                </p>
                {linkedDepartures.map((departure) => (
                  <DepartureItem
                    key={departure.id}
                    departure={departure}
                    isSelected={selectedIds.includes(departure.id)}
                    onToggle={() => toggleDeparture(departure.id)}
                    getStatusBadge={getStatusBadge}
                  />
                ))}
              </>
            )}

            {/* Available (unlinked) */}
            {unlinkedDepartures.length > 0 && (
              <>
                <p className="text-xs font-medium text-muted-foreground px-2 pt-2">
                  Tersedia (belum terhubung) ({unlinkedDepartures.length})
                </p>
                {unlinkedDepartures.map((departure) => (
                  <DepartureItem
                    key={departure.id}
                    departure={departure}
                    isSelected={selectedIds.includes(departure.id)}
                    onToggle={() => toggleDeparture(departure.id)}
                    getStatusBadge={getStatusBadge}
                  />
                ))}
              </>
            )}
          </div>
        </>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button
          onClick={() => linkMutation.mutate()}
          disabled={linkMutation.isPending}
        >
          {linkMutation.isPending ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
    </div>
  );
}

function DepartureItem({
  departure,
  isSelected,
  onToggle,
  getStatusBadge,
}: {
  departure: any;
  isSelected: boolean;
  onToggle: () => void;
  getStatusBadge: (status: string) => React.ReactNode;
}) {
  return (
    <label
      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
        isSelected ? 'bg-primary/5 border-primary' : 'hover:bg-muted/50'
      }`}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggle}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">
            {departure.departure_date 
              ? formatDate(departure.departure_date) 
              : departure.month 
                ? `Bulan ${MONTHS.find(m => m.value === departure.month)?.label || departure.month}`
                : 'Tanggal Belum Ditentukan'}
          </span>
          {getStatusBadge(departure.status)}
        </div>
        
        {/* Flight info */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {departure.airline && (
            <span className="font-medium text-foreground">{departure.airline.name}</span>
          )}
          <span className="flex items-center gap-1">
            {departure.departure_airport?.code || '-'}
            <Plane className="h-3 w-3" />
            {departure.arrival_airport?.code || '-'}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {departure.booked_count || 0}/{departure.quota}
          </span>
        </div>

        {/* Hotel info */}
        {(departure.hotel_makkah || departure.hotel_madinah || (departure.package?.package_types?.code?.toLowerCase() === 'tour' && departure.departure_hotels?.length > 0)) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Hotel className="h-3 w-3" />
            {departure.package?.package_types?.code?.toLowerCase() === 'tour' ? (
              <span>{departure.departure_hotels?.length} Hotel</span>
            ) : (
              <>
                {departure.hotel_makkah && (
                  <span>M: {departure.hotel_makkah.name}</span>
                )}
                {departure.hotel_makkah && departure.hotel_madinah && <span>•</span>}
                {departure.hotel_madinah && (
                  <span>D: {departure.hotel_madinah.name}</span>
                )}
              </>
            )}
          </div>
        )}

        {/* Price info */}
        {departure.price_quad > 0 && (
          <p className="text-xs text-muted-foreground">
            Mulai <span className="font-medium text-foreground">{formatCurrency(departure.price_quad)}</span>/orang
          </p>
        )}
      </div>
    </label>
  );
}
