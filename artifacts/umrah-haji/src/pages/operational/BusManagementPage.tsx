import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Bus, Plus, Edit, Trash2, Users, MapPin, 
  Clock, Phone, UserPlus, Download
} from "lucide-react";

interface BusAssignment {
  id: string;
  departure_id: string;
  bus_provider_id?: string;
  bus_number: string;
  driver_name?: string;
  driver_phone?: string;
  capacity: number;
  route_type: string;
  departure_point?: string;
  arrival_point?: string;
  departure_time?: string;
  notes?: string;
  bus_provider?: { name: string };
  passengers?: BusPassenger[];
}

interface BusPassenger {
  id: string;
  bus_assignment_id: string;
  customer_id: string;
  seat_number?: string;
  customer?: { full_name: string; phone?: string };
}

export default function BusManagementPage() {
  const queryClient = useQueryClient();
  const [selectedDeparture, setSelectedDeparture] = useState<string>("");
  const [formDialog, setFormDialog] = useState(false);
  const [passengerDialog, setPassengerDialog] = useState(false);
  const [editingBus, setEditingBus] = useState<BusAssignment | null>(null);
  const [selectedBus, setSelectedBus] = useState<BusAssignment | null>(null);
  const [selectedPassengers, setSelectedPassengers] = useState<string[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    bus_number: "",
    driver_name: "",
    driver_phone: "",
    capacity: 40,
    route_type: "transfer",
    departure_point: "",
    arrival_point: "",
    notes: "",
  });

  // Fetch departures
  const { data: departures } = useQuery({
    queryKey: ["departures-for-bus"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departures")
        .select("id, departure_date, package:packages(name)")
        .gte("departure_date", new Date().toISOString().split("T")[0])
        .order("departure_date");
      if (error) throw error;
      return data;
    },
  });

  // Fetch bus assignments
  const { data: buses, isLoading } = useQuery({
    queryKey: ["bus-assignments", selectedDeparture],
    queryFn: async () => {
      if (!selectedDeparture) return [];
      const { data, error } = await supabase
        .from("bus_assignments" as any)
        .select(`
          *,
          bus_provider:bus_providers(name),
          passengers:bus_passengers(
            id,
            customer_id,
            seat_number,
            customer:customers(full_name, phone)
          )
        `)
        .eq("departure_id", selectedDeparture)
        .order("created_at");
      if (error) throw error;
      return data as unknown as BusAssignment[];
    },
    enabled: !!selectedDeparture,
  });

  // Fetch available customers for this departure
  const { data: availableCustomers } = useQuery({
    queryKey: ["available-customers-bus", selectedDeparture],
    queryFn: async () => {
      if (!selectedDeparture) return [];
      
      // Get customers from bookings for this departure
      const { data, error } = await supabase
        .from("booking_passengers")
        .select(`
          customer:customers(id, full_name, phone),
          booking:bookings!inner(departure_id)
        `)
        .eq("booking.departure_id", selectedDeparture);
      
      if (error) throw error;
      return data?.map(d => d.customer).filter(Boolean) || [];
    },
    enabled: !!selectedDeparture,
  });

  // Save bus mutation
  const saveBusMutation = useMutation({
    mutationFn: async () => {
      if (editingBus) {
        const { error } = await supabase
          .from("bus_assignments" as any)
          .update({
            ...formData,
            departure_id: selectedDeparture,
          })
          .eq("id", editingBus.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("bus_assignments" as any)
          .insert({
            ...formData,
            departure_id: selectedDeparture,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingBus ? "Bus berhasil diupdate" : "Bus berhasil ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["bus-assignments"] });
      setFormDialog(false);
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  // Delete bus mutation
  const deleteBusMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bus_assignments" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bus berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["bus-assignments"] });
    },
  });

  // Add passengers mutation
  const addPassengersMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBus) return;
      
      const passengers = selectedPassengers.map((customerId, index) => ({
        bus_assignment_id: selectedBus.id,
        customer_id: customerId,
        seat_number: (index + 1).toString(),
      }));
      
      const { error } = await supabase
        .from("bus_passengers" as any)
        .insert(passengers);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Penumpang berhasil ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["bus-assignments"] });
      setPassengerDialog(false);
      setSelectedPassengers([]);
    },
    onError: (error) => toast.error(error.message),
  });

  // Remove passenger mutation
  const removePassengerMutation = useMutation({
    mutationFn: async (passengerId: string) => {
      const { error } = await supabase
        .from("bus_passengers" as any)
        .delete()
        .eq("id", passengerId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Penumpang dihapus dari bus");
      queryClient.invalidateQueries({ queryKey: ["bus-assignments"] });
    },
  });

  const resetForm = () => {
    setFormData({
      bus_number: "",
      driver_name: "",
      driver_phone: "",
      capacity: 40,
      route_type: "transfer",
      departure_point: "",
      arrival_point: "",
      notes: "",
    });
    setEditingBus(null);
  };

  const openEditDialog = (bus: BusAssignment) => {
    setEditingBus(bus);
    setFormData({
      bus_number: bus.bus_number,
      driver_name: bus.driver_name || "",
      driver_phone: bus.driver_phone || "",
      capacity: bus.capacity,
      route_type: bus.route_type,
      departure_point: bus.departure_point || "",
      arrival_point: bus.arrival_point || "",
      notes: bus.notes || "",
    });
    setFormDialog(true);
  };

  const routeTypeLabels: Record<string, string> = {
    transfer: "Transfer Airport",
    city_tour: "City Tour",
    airport: "Antar Jemput Bandara",
    ziarah: "Ziarah",
  };

  // Get customers already assigned to any bus
  const assignedCustomerIds = buses?.flatMap(b => 
    b.passengers?.map(p => p.customer_id) || []
  ) || [];

  const unassignedCustomers = availableCustomers?.filter(
    (c: any) => !assignedCustomerIds.includes(c.id)
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Bus</h1>
          <p className="text-muted-foreground">Atur penempatan bus dan penumpang</p>
        </div>
        <Select value={selectedDeparture} onValueChange={setSelectedDeparture}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Pilih Keberangkatan" />
          </SelectTrigger>
          <SelectContent>
            {departures?.map((d: any) => (
              <SelectItem key={d.id} value={d.id}>
                {format(new Date(d.departure_date), "dd MMM yyyy", { locale: localeId })} - {d.package?.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedDeparture ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Pilih keberangkatan untuk mengelola bus</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex justify-end">
            <Button onClick={() => { resetForm(); setFormDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Bus
            </Button>
          </div>

          {!buses?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Belum ada bus untuk keberangkatan ini</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {buses.map((bus) => (
                <Card key={bus.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Bus className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{bus.bus_number}</CardTitle>
                          <Badge variant="outline" className="mt-1">
                            {routeTypeLabels[bus.route_type] || bus.route_type}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(bus)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteBusMutation.mutate(bus.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {bus.driver_name && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{bus.driver_name}</span>
                        </div>
                      )}
                      {bus.driver_phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{bus.driver_phone}</span>
                        </div>
                      )}
                      {bus.departure_point && (
                        <div className="flex items-center gap-2 col-span-2">
                          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate">{bus.departure_point} → {bus.arrival_point}</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium">
                          Penumpang ({bus.passengers?.length || 0}/{bus.capacity})
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedBus(bus);
                            setSelectedPassengers([]);
                            setPassengerDialog(true);
                          }}
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          Tambah
                        </Button>
                      </div>

                      {bus.passengers && bus.passengers.length > 0 ? (
                        <ScrollArea className="h-32">
                          <div className="space-y-1">
                            {bus.passengers.map((p) => (
                              <div key={p.id} className="flex items-center justify-between text-sm py-1">
                                <span>
                                  <span className="font-mono text-muted-foreground mr-2">
                                    #{p.seat_number}
                                  </span>
                                  {p.customer?.full_name}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => removePassengerMutation.mutate(p.id)}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Belum ada penumpang
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Form Dialog */}
      <Dialog open={formDialog} onOpenChange={setFormDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBus ? "Edit Bus" : "Tambah Bus"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nomor Bus *</Label>
                <Input
                  value={formData.bus_number}
                  onChange={(e) => setFormData({ ...formData, bus_number: e.target.value })}
                  placeholder="B 1234 XYZ"
                />
              </div>
              <div className="space-y-2">
                <Label>Kapasitas</Label>
                <Input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 40 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipe Rute</Label>
              <Select
                value={formData.route_type}
                onValueChange={(v) => setFormData({ ...formData, route_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transfer">Transfer Airport</SelectItem>
                  <SelectItem value="city_tour">City Tour</SelectItem>
                  <SelectItem value="airport">Antar Jemput Bandara</SelectItem>
                  <SelectItem value="ziarah">Ziarah</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Driver</Label>
                <Input
                  value={formData.driver_name}
                  onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                  placeholder="Ahmad"
                />
              </div>
              <div className="space-y-2">
                <Label>Telepon Driver</Label>
                <Input
                  value={formData.driver_phone}
                  onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value })}
                  placeholder="+62..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Titik Keberangkatan</Label>
                <Input
                  value={formData.departure_point}
                  onChange={(e) => setFormData({ ...formData, departure_point: e.target.value })}
                  placeholder="Hotel Makkah"
                />
              </div>
              <div className="space-y-2">
                <Label>Tujuan</Label>
                <Input
                  value={formData.arrival_point}
                  onChange={(e) => setFormData({ ...formData, arrival_point: e.target.value })}
                  placeholder="Masjidil Haram"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormDialog(false)}>
              Batal
            </Button>
            <Button
              onClick={() => saveBusMutation.mutate()}
              disabled={!formData.bus_number || saveBusMutation.isPending}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Passengers Dialog */}
      <Dialog open={passengerDialog} onOpenChange={setPassengerDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Penumpang ke {selectedBus?.bus_number}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-64">
            {unassignedCustomers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Semua jamaah sudah ditempatkan di bus
              </p>
            ) : (
              <div className="space-y-2">
                {unassignedCustomers.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted">
                    <Checkbox
                      checked={selectedPassengers.includes(c.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPassengers([...selectedPassengers, c.id]);
                        } else {
                          setSelectedPassengers(selectedPassengers.filter(id => id !== c.id));
                        }
                      }}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{c.full_name}</p>
                      {c.phone && <p className="text-sm text-muted-foreground">{c.phone}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPassengerDialog(false)}>
              Batal
            </Button>
            <Button
              onClick={() => addPassengersMutation.mutate()}
              disabled={selectedPassengers.length === 0 || addPassengersMutation.isPending}
            >
              Tambah {selectedPassengers.length} Penumpang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}