import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { formatCurrency, formatDate, getRoomTypeLabel } from "@/lib/format";
import { ArrowLeft, Search, UserPlus, Plus, X, Users, Minus, BedDouble, AlertTriangle, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { RoomType } from "@/types/database";

interface PackageData {
  id: string;
  name: string;
  code: string;
}

interface DepartureData {
  id: string;
  departure_date: string;
  return_date: string;
  quota: number;
  booked_count: number | null;
  status: string;
  price_quad: number | null;
  price_triple: number | null;
  price_double: number | null;
  price_single: number | null;
  package: PackageData | null;
}

interface PassengerEntry {
  customer_id: string;
  full_name: string;
  phone: string;
  passenger_type: string;
  room_type: RoomType;
  is_new: boolean;
}

interface RoomAllocation {
  quad: number;
  triple: number;
  double: number;
  single: number;
}

const ROOM_INFO: Record<RoomType, { label: string; occupancy: number; desc: string; icon: typeof Users }> = {
  quad: { label: 'Quad', occupancy: 4, desc: '4 orang/kamar', icon: Users },
  triple: { label: 'Triple', occupancy: 3, desc: '3 orang/kamar', icon: Users },
  double: { label: 'Double', occupancy: 2, desc: '2 orang/kamar', icon: BedDouble },
  single: { label: 'Single', occupancy: 1, desc: '1 orang/kamar', icon: BedDouble },
};

export default function AdminBookingCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [departureId, setDepartureId] = useState("");
  const [roomAllocation, setRoomAllocation] = useState<RoomAllocation>({
    quad: 0, triple: 0, double: 0, single: 0,
  });
  const [notes, setNotes] = useState("");
  const [passengers, setPassengers] = useState<PassengerEntry[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ full_name: "", phone: "", email: "", nik: "" });

  // Fetch departures with available slots
  const { data: departures } = useQuery<DepartureData[]>({
    queryKey: ['admin-departures-for-booking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departures')
        .select(`
          id, departure_date, return_date, quota, booked_count, status,
          price_quad, price_triple, price_double, price_single,
          package:packages(id, name, code)
        `)
        .in('status', ['open', 'confirmed'])
        .gte('departure_date', new Date().toISOString().split('T')[0])
        .order('departure_date');
      if (error) throw error;
      return (data || []) as DepartureData[];
    },
  });

  // Search existing customers
  const { data: searchResults } = useQuery({
    queryKey: ['customer-search', customerSearch],
    queryFn: async () => {
      if (!customerSearch || customerSearch.length < 2) return [];
      const { data, error } = await supabase
        .from('customers')
        .select('id, full_name, phone, email, nik')
        .or(`full_name.ilike.%${customerSearch}%,phone.ilike.%${customerSearch}%,nik.ilike.%${customerSearch}%`)
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: customerSearch.length >= 2,
  });

  const selectedDeparture = departures?.find(d => d.id === departureId);
  const pkg = selectedDeparture?.package as PackageData | null | undefined;
  const availableSlots = selectedDeparture ? selectedDeparture.quota - (selectedDeparture.booked_count || 0) : 0;

  // Prices from departure
  const prices = useMemo(() => {
    if (!selectedDeparture) return { quad: 0, triple: 0, double: 0, single: 0 };
    return {
      quad: selectedDeparture.price_quad || 0,
      triple: selectedDeparture.price_triple || 0,
      double: selectedDeparture.price_double || 0,
      single: selectedDeparture.price_single || 0,
    };
  }, [selectedDeparture]);

  // Total passengers from room allocation
  const totalFromRooms = roomAllocation.quad + roomAllocation.triple + roomAllocation.double + roomAllocation.single;

  // Total price calculated from room allocation
  const totalPrice = useMemo(() => {
    return (roomAllocation.quad * prices.quad) +
      (roomAllocation.triple * prices.triple) +
      (roomAllocation.double * prices.double) +
      (roomAllocation.single * prices.single);
  }, [roomAllocation, prices]);

  // Validation
  const doubleValidationError = roomAllocation.double > 0 && roomAllocation.double % 2 !== 0;
  const passengerCountMismatch = passengers.length !== totalFromRooms;

  const updateRoomCount = (type: RoomType, delta: number) => {
    setRoomAllocation(prev => {
      const newCount = Math.max(0, prev[type] + delta);
      const newTotal = (type === 'quad' ? newCount : prev.quad) +
        (type === 'triple' ? newCount : prev.triple) +
        (type === 'double' ? newCount : prev.double) +
        (type === 'single' ? newCount : prev.single);
      if (newTotal > availableSlots) return prev;
      return { ...prev, [type]: newCount };
    });
  };

  // Get the dominant room type for the booking record (the one with most passengers)
  const getDominantRoomType = (): RoomType => {
    const entries: [RoomType, number][] = [
      ['quad', roomAllocation.quad],
      ['triple', roomAllocation.triple],
      ['double', roomAllocation.double],
      ['single', roomAllocation.single],
    ];
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][1] > 0 ? entries[0][0] : 'quad';
  };

  // Assign room types to passengers based on allocation order
  const getPassengerRoomType = (index: number): RoomType => {
    let offset = 0;
    for (const type of ['quad', 'triple', 'double', 'single'] as RoomType[]) {
      if (index < offset + roomAllocation[type]) return type;
      offset += roomAllocation[type];
    }
    return 'quad';
  };

  const addExistingCustomer = (customer: any) => {
    if (passengers.find(p => p.customer_id === customer.id)) {
      toast.error("Jamaah sudah ditambahkan");
      return;
    }
    if (passengers.length >= totalFromRooms) {
      toast.error(`Jumlah jamaah sudah sesuai alokasi kamar (${totalFromRooms} orang)`);
      return;
    }
    const idx = passengers.length;
    setPassengers(prev => [...prev, {
      customer_id: customer.id,
      full_name: customer.full_name,
      phone: customer.phone || '',
      passenger_type: 'adult',
      room_type: getPassengerRoomType(idx),
      is_new: false,
    }]);
    setCustomerSearch("");
  };

  const removePassenger = (index: number) => {
    setPassengers(prev => {
      const updated = prev.filter((_, i) => i !== index);
      // Re-assign room types
      return updated.map((p, i) => ({ ...p, room_type: getPassengerRoomType(i) }));
    });
  };

  const createCustomerMutation = useMutation({
    mutationFn: async (data: typeof newCustomer) => {
      const { data: customer, error } = await supabase
        .from('customers')
        .insert({
          full_name: data.full_name,
          phone: data.phone || null,
          email: data.email || null,
          nik: data.nik || null,
        })
        .select()
        .single();
      if (error) throw error;
      return customer;
    },
    onSuccess: (customer) => {
      if (passengers.length >= totalFromRooms) {
        toast.error(`Jumlah jamaah sudah sesuai alokasi kamar (${totalFromRooms} orang)`);
        return;
      }
      const idx = passengers.length;
      setPassengers(prev => [...prev, {
        customer_id: customer.id,
        full_name: customer.full_name,
        phone: customer.phone || '',
        passenger_type: 'adult',
        room_type: getPassengerRoomType(idx),
        is_new: true,
      }]);
      setShowAddCustomer(false);
      setNewCustomer({ full_name: "", phone: "", email: "", nik: "" });
      toast.success("Customer baru berhasil dibuat dan ditambahkan");
    },
    onError: (error: Error | null) => {
      toast.error("Gagal membuat customer: " + (error?.message || 'Unknown error'));
    },
  });

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!departureId || passengers.length === 0) throw new Error("Data tidak lengkap");
      if (doubleValidationError) throw new Error("Tipe Double harus kelipatan 2 orang");
      if (passengerCountMismatch) throw new Error(`Jumlah jamaah (${passengers.length}) tidak sesuai alokasi kamar (${totalFromRooms})`);

      const { data: bookingCode } = await supabase.rpc('generate_booking_code');
      const mainCustomerId = passengers[0].customer_id;
      const dominantRoom = getDominantRoomType();

      // Calculate base price from dominant room type
      const basePrice = prices[dominantRoom];

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          booking_code: bookingCode,
          customer_id: mainCustomerId,
          departure_id: departureId,
          room_type: dominantRoom,
          base_price: basePrice,
          total_price: totalPrice,
          total_pax: passengers.length,
          adult_count: passengers.filter(p => p.passenger_type === 'adult').length,
          child_count: passengers.filter(p => p.passenger_type === 'child').length,
          infant_count: passengers.filter(p => p.passenger_type === 'infant').length,
          booking_status: 'confirmed',
          payment_status: 'pending',
          notes: notes || null,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      const passengerInserts = passengers.map((p, idx) => ({
        booking_id: booking.id,
        customer_id: p.customer_id,
        is_main_passenger: idx === 0,
        passenger_type: p.passenger_type,
        room_preference: p.room_type,
      }));

      const { error: passError } = await supabase
        .from('booking_passengers')
        .insert(passengerInserts);
      if (passError) throw passError;

      await supabase
        .from('departures')
        .update({ booked_count: (selectedDeparture?.booked_count || 0) + passengers.length })
        .eq('id', departureId);

      return booking;
    },
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      toast.success("Booking berhasil dibuat!");
      navigate(`/admin/bookings/${booking.id}`);
    },
    onError: (error: Error | null) => {
      toast.error("Gagal membuat booking: " + (error?.message || 'Unknown error'));
    },
  });

  const handleDepartureChange = (id: string) => {
    setDepartureId(id);
    setRoomAllocation({ quad: 0, triple: 0, double: 0, single: 0 });
    setPassengers([]);
  };

  const canSubmit = departureId &&
    totalFromRooms > 0 &&
    passengers.length === totalFromRooms &&
    !doubleValidationError &&
    passengers.length <= availableSlots &&
    !createBookingMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/bookings"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Buat Booking Baru</h1>
          <p className="text-muted-foreground">Daftarkan jamaah secara manual</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Pilih Keberangkatan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">1. Pilih Keberangkatan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={departureId} onValueChange={handleDepartureChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih keberangkatan..." />
                </SelectTrigger>
                <SelectContent>
                  {departures?.map(d => {
                    const p = d.package as PackageData | null | undefined;
                    const avail = d.quota - (d.booked_count || 0);
                    return (
                      <SelectItem key={d.id} value={d.id} disabled={avail <= 0}>
                        {p?.name} — {formatDate(d.departure_date)} ({avail} slot)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {selectedDeparture && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg text-sm">
                  <div>
                    <p className="text-muted-foreground">Paket</p>
                    <p className="font-medium">{pkg?.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tersedia</p>
                    <p className="font-medium">{availableSlots} dari {selectedDeparture.quota}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Berangkat</p>
                    <p className="font-medium">{formatDate(selectedDeparture.departure_date)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pulang</p>
                    <p className="font-medium">{formatDate(selectedDeparture.return_date)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Pilih Tipe Kamar & Jumlah */}
          {selectedDeparture && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BedDouble className="h-5 w-5" />
                  2. Pilih Tipe Kamar & Jumlah Jamaah
                </CardTitle>
                <p className="text-sm text-muted-foreground">Tentukan berapa orang per tipe kamar. Anda bisa campuran beberapa tipe.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {(Object.keys(ROOM_INFO) as RoomType[]).map((type) => {
                  const info = ROOM_INFO[type];
                  const count = roomAllocation[type];
                  const price = prices[type];
                  if (price <= 0) return null;

                  const isDoubleError = type === 'double' && count > 0 && count % 2 !== 0;

                  return (
                    <div key={type} className="space-y-1">
                      <div
                        className={cn(
                          "flex items-center justify-between p-4 border-2 rounded-lg transition-all",
                          count > 0 ? "border-primary bg-primary/5" : "border-border hover:border-primary/30",
                          isDoubleError && "border-destructive bg-destructive/5"
                        )}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{info.label}</span>
                            <Badge variant="outline" className="text-xs font-normal">{info.desc}</Badge>
                          </div>
                          <span className="text-sm text-primary font-medium">
                            {formatCurrency(price)} / orang
                          </span>
                          {count > 0 && (
                            <span className="text-xs text-muted-foreground ml-2">
                              = {formatCurrency(count * price)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => updateRoomCount(type, -1)}
                            disabled={count <= 0}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center text-lg font-bold">{count}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => updateRoomCount(type, 1)}
                            disabled={totalFromRooms >= availableSlots}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {isDoubleError && (
                        <div className="flex items-center gap-2 text-destructive text-xs px-2">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Tipe Double harus kelipatan 2 orang (min. 2 orang)</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {totalFromRooms > 0 && (
                  <div className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Total jamaah dari alokasi kamar:</span>
                    </div>
                    <span className="font-bold">{totalFromRooms} orang</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Tambah Jamaah */}
          {totalFromRooms > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    3. Data Jamaah ({passengers.length}/{totalFromRooms})
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddCustomer(true)}
                    disabled={passengers.length >= totalFromRooms}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Customer Baru
                  </Button>
                </CardTitle>
                {passengerCountMismatch && passengers.length < totalFromRooms && (
                  <p className="text-sm text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Tambahkan {totalFromRooms - passengers.length} jamaah lagi sesuai alokasi kamar
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search existing */}
                {passengers.length < totalFromRooms && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari jamaah berdasarkan nama, telepon, atau NIK..."
                      value={customerSearch}
                      onChange={e => setCustomerSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                )}
                {searchResults && searchResults.length > 0 && passengers.length < totalFromRooms && (
                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {searchResults.map(c => (
                      <button
                        key={c.id}
                        className="w-full text-left p-3 hover:bg-muted/50 flex items-center justify-between"
                        onClick={() => addExistingCustomer(c)}
                      >
                        <div>
                          <p className="font-medium">{c.full_name}</p>
                          <p className="text-sm text-muted-foreground">{c.phone || c.email || c.nik}</p>
                        </div>
                        <UserPlus className="h-4 w-4 text-primary" />
                      </button>
                    ))}
                  </div>
                )}

                {passengers.length > 0 && <Separator />}

                {passengers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Belum ada jamaah ditambahkan</p>
                ) : (
                  <div className="space-y-2">
                    {passengers.map((p, idx) => (
                      <div key={p.customer_id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono text-muted-foreground w-5">{idx + 1}</span>
                          <div>
                            <p className="font-medium">{p.full_name}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm text-muted-foreground">{p.phone}</span>
                              {idx === 0 && <Badge variant="outline" className="text-xs">Pemesan Utama</Badge>}
                              <Badge variant="secondary" className="text-xs">
                                {ROOM_INFO[p.room_type]?.label}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={p.passenger_type}
                            onValueChange={v => setPassengers(prev => prev.map((pp, i) => i === idx ? { ...pp, passenger_type: v } : pp))}
                          >
                            <SelectTrigger className="w-[100px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="adult">Dewasa</SelectItem>
                              <SelectItem value="child">Anak</SelectItem>
                              <SelectItem value="infant">Bayi</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="icon" variant="ghost" onClick={() => removePassenger(idx)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Catatan (opsional)</Label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Catatan internal booking..." />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Summary */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-base">Ringkasan Booking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paket</span>
                  <span className="font-medium">{pkg?.name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Jamaah</span>
                  <span className="font-medium">{passengers.length}/{totalFromRooms} orang</span>
                </div>
              </div>

              {/* Room breakdown */}
              {totalFromRooms > 0 && (
                <div className="space-y-1 text-xs">
                  {roomAllocation.quad > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>{roomAllocation.quad}x Quad @ {formatCurrency(prices.quad)}</span>
                      <span>{formatCurrency(roomAllocation.quad * prices.quad)}</span>
                    </div>
                  )}
                  {roomAllocation.triple > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>{roomAllocation.triple}x Triple @ {formatCurrency(prices.triple)}</span>
                      <span>{formatCurrency(roomAllocation.triple * prices.triple)}</span>
                    </div>
                  )}
                  {roomAllocation.double > 0 && (
                    <div className={cn("flex justify-between", doubleValidationError ? "text-destructive" : "text-muted-foreground")}>
                      <span>{roomAllocation.double}x Double @ {formatCurrency(prices.double)}</span>
                      <span>{formatCurrency(roomAllocation.double * prices.double)}</span>
                    </div>
                  )}
                  {roomAllocation.single > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>{roomAllocation.single}x Single @ {formatCurrency(prices.single)}</span>
                      <span>{formatCurrency(roomAllocation.single * prices.single)}</span>
                    </div>
                  )}
                </div>
              )}

              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(totalPrice)}</span>
              </div>

              {doubleValidationError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Double harus kelipatan 2
                </p>
              )}
              {passengerCountMismatch && totalFromRooms > 0 && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Jamaah belum lengkap ({passengers.length}/{totalFromRooms})
                </p>
              )}

              <Button
                className="w-full"
                size="lg"
                disabled={!canSubmit}
                onClick={() => createBookingMutation.mutate()}
              >
                {createBookingMutation.isPending ? 'Memproses...' : 'Buat Booking'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add New Customer Dialog */}
      <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Customer Baru</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nama Lengkap *</Label>
              <Input
                value={newCustomer.full_name}
                onChange={e => setNewCustomer(p => ({ ...p, full_name: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>No. Telepon</Label>
                <Input
                  value={newCustomer.phone}
                  onChange={e => setNewCustomer(p => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newCustomer.email}
                  onChange={e => setNewCustomer(p => ({ ...p, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>NIK</Label>
              <Input
                value={newCustomer.nik}
                onChange={e => setNewCustomer(p => ({ ...p, nik: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCustomer(false)}>Batal</Button>
            <Button
              disabled={!newCustomer.full_name || createCustomerMutation.isPending}
              onClick={() => createCustomerMutation.mutate(newCustomer)}
            >
              {createCustomerMutation.isPending ? 'Menyimpan...' : 'Simpan & Tambahkan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
