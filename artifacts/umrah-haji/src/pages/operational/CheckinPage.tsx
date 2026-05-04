import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { QrCode, Search, CheckCircle, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const CHECKPOINTS = [
  { value: 'airport_departure', label: 'Bandara Keberangkatan' },
  { value: 'airport_arrival', label: 'Bandara Kedatangan' },
  { value: 'hotel_makkah', label: 'Hotel Makkah' },
  { value: 'hotel_madinah', label: 'Hotel Madinah' },
  { value: 'bus', label: 'Bus' },
];

export default function CheckinPage() {
  const [selectedDeparture, setSelectedDeparture] = useState<string>("");
  const [checkpoint, setCheckpoint] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: departures } = useQuery({
    queryKey: ['checkin-departures'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departures')
        .select(`
          id,
          departure_date,
          package:packages(name)
        `)
        .gte('departure_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('departure_date', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const { data: passengers, isLoading } = useQuery({
    queryKey: ['checkin-passengers', selectedDeparture, checkpoint],
    enabled: !!selectedDeparture && !!checkpoint,
    queryFn: async () => {
      // Get passengers for this departure
      const { data: bookingPassengers, error: passengersError } = await supabase
        .from('booking_passengers')
        .select(`
          id,
          customer:customers(id, full_name, phone, photo_url),
          booking:bookings!inner(departure_id, booking_status)
        `)
        .eq('booking.departure_id', selectedDeparture)
        .eq('booking.booking_status', 'confirmed');

      if (passengersError) throw passengersError;

      // Get attendance records for this departure and checkpoint
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('attendance')
        .select('customer_id, checked_in_at')
        .eq('departure_id', selectedDeparture)
        .eq('checkpoint', checkpoint);

      if (attendanceError) throw attendanceError;

      // Merge data
      const attendanceMap = new Map(
        attendanceRecords?.map(a => [a.customer_id, a.checked_in_at])
      );

      return bookingPassengers?.map(p => ({
        ...p,
        checked_in_at: attendanceMap.get((p.customer as any)?.id) || null,
      }));
    },
  });

  const checkinMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const { error } = await supabase
        .from('attendance')
        .insert({
          customer_id: customerId,
          departure_id: selectedDeparture,
          checkpoint: checkpoint,
          checked_in_by: user?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Check-in berhasil!");
      queryClient.invalidateQueries({ queryKey: ['checkin-passengers'] });
    },
    onError: () => {
      toast.error("Gagal melakukan check-in");
    },
  });

  const filteredPassengers = passengers?.filter(p => 
    (p.customer as any)?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const checkedInCount = passengers?.filter(p => p.checked_in_at).length || 0;
  const totalCount = passengers?.length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Check-in Jamaah</h1>
        <p className="text-muted-foreground">Lakukan check-in jamaah di setiap checkpoint</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Keberangkatan</label>
              <Select value={selectedDeparture} onValueChange={setSelectedDeparture}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih keberangkatan" />
                </SelectTrigger>
                <SelectContent>
                  {departures?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {(d.package as any)?.name} - {format(new Date(d.departure_date), "dd MMM yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Checkpoint</label>
              <Select value={checkpoint} onValueChange={setCheckpoint}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih checkpoint" />
                </SelectTrigger>
                <SelectContent>
                  {CHECKPOINTS.map((cp) => (
                    <SelectItem key={cp.value} value={cp.value}>
                      {cp.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Cari Jamaah</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nama jamaah..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {selectedDeparture && checkpoint && (
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-lg py-2 px-4">
            <UserCheck className="h-5 w-5 mr-2" />
            {checkedInCount} / {totalCount} Jamaah Check-in
          </Badge>
        </div>
      )}

      {/* Passenger List */}
      {selectedDeparture && checkpoint && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Daftar Jamaah
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : filteredPassengers?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Tidak ada jamaah ditemukan
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPassengers?.map((p, idx) => (
                    <TableRow key={p.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">
                        {(p.customer as any)?.full_name}
                      </TableCell>
                      <TableCell>{(p.customer as any)?.phone || '-'}</TableCell>
                      <TableCell>
                        {p.checked_in_at ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {format(new Date(p.checked_in_at), "HH:mm")}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Belum Check-in</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          disabled={!!p.checked_in_at || checkinMutation.isPending}
                          onClick={() => checkinMutation.mutate((p.customer as any)?.id)}
                        >
                          {p.checked_in_at ? 'Sudah Check-in' : 'Check-in'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
