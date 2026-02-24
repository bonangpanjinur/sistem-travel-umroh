import { useState } from "react";
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
import { ArrowLeft, Search, UserPlus, Plus, X, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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
  is_new: boolean;
}

const ROOM_TYPES = ['quad', 'triple', 'double', 'single'] as const;

export default function AdminBookingCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [departureId, setDepartureId] = useState("");
  const [roomType, setRoomType] = useState<string>("quad");
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

  const getPrice = () => {
    if (!selectedDeparture) return 0;
    const prices: Record<string, number | null> = {
      quad: selectedDeparture.price_quad,
      triple: selectedDeparture.price_triple,
      double: selectedDeparture.price_double,
      single: selectedDeparture.price_single,
    };
    return prices[roomType] || 0;
  };

  const unitPrice = getPrice() || 0;
  const totalPrice = unitPrice * passengers.length;
  const availableSlots = selectedDeparture ? selectedDeparture.quota - (selectedDeparture.booked_count || 0) : 0;

  const addExistingCustomer = (customer: any) => {
    if (passengers.find(p => p.customer_id === customer.id)) {
      toast.error("Jamaah sudah ditambahkan");
      return;
    }
    setPassengers(prev => [...prev, {
      customer_id: customer.id,
      full_name: customer.full_name,
      phone: customer.phone || '',
      passenger_type: 'adult',
      is_new: false,
    }]);
    setCustomerSearch("");
  };

  const removePassenger = (index: number) => {
    setPassengers(prev => prev.filter((_, i) => i !== index));
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
      setPassengers(prev => [...prev, {
        customer_id: customer.id,
        full_name: customer.full_name,
        phone: customer.phone || '',
        passenger_type: 'adult',
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

      // Generate booking code
      const { data: bookingCode } = await supabase.rpc('generate_booking_code');

      const mainCustomerId = passengers[0].customer_id;

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          booking_code: bookingCode,
          customer_id: mainCustomerId,
          departure_id: departureId,
          room_type: roomType as 'quad' | 'triple' | 'double' | 'single',
          base_price: unitPrice,
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

      // Create booking passengers
      const passengerInserts = passengers.map((p, idx) => ({
        booking_id: booking.id,
        customer_id: p.customer_id,
        is_main_passenger: idx === 0,
        passenger_type: p.passenger_type,
        room_preference: roomType as 'quad' | 'triple' | 'double' | 'single',
      }));

      const { error: passError } = await supabase
        .from('booking_passengers')
        .insert(passengerInserts);

      if (passError) throw passError;

      // Update booked_count
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
              <CardTitle>1. Pilih Keberangkatan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={departureId} onValueChange={setDepartureId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih keberangkatan..." />
                </SelectTrigger>
                <SelectContent>
                  {departures?.map(d => {
                    const p = d.package as PackageData | null | undefined;
                    const avail = d.quota - (d.booked_count || 0);
                    return (
                      <SelectItem key={d.id} value={d.id} disabled={avail <= 0}>
                        {p?.name} — {formatDate(d.departure_date)} ({avail} slot tersedia)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {selectedDeparture && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Paket</p>
                    <p className="font-medium">{pkg?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tersedia</p>
                    <p className="font-medium">{availableSlots} dari {selectedDeparture.quota}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Berangkat</p>
                    <p className="font-medium">{formatDate(selectedDeparture.departure_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pulang</p>
                    <p className="font-medium">{formatDate(selectedDeparture.return_date)}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Tipe Kamar</Label>
                <Select value={roomType} onValueChange={setRoomType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPES.map(rt => (
                      <SelectItem key={rt} value={rt}>{getRoomTypeLabel(rt)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDeparture && (
                  <p className="text-sm text-muted-foreground">
                    Harga per orang: {formatCurrency(unitPrice)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Tambah Jamaah */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  2. Jamaah ({passengers.length})
                </span>
                <Button size="sm" variant="outline" onClick={() => setShowAddCustomer(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Customer Baru
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search existing */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari jamaah berdasarkan nama, telepon, atau NIK..."
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              {searchResults && searchResults.length > 0 && (
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

              <Separator />

              {passengers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Belum ada jamaah ditambahkan</p>
              ) : (
                <div className="space-y-2">
                  {passengers.map((p, idx) => (
                    <div key={p.customer_id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-muted-foreground">{idx + 1}</span>
                        <div>
                          <p className="font-medium">{p.full_name}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{p.phone}</span>
                            {idx === 0 && <Badge variant="outline" className="text-xs">Pemesan Utama</Badge>}
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
        </div>

        {/* Sidebar Summary */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Ringkasan Booking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paket</span>
                  <span className="font-medium">{pkg?.name || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tipe Kamar</span>
                  <span className="font-medium">{getRoomTypeLabel(roomType)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Jumlah Jamaah</span>
                  <span className="font-medium">{passengers.length} orang</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Harga/orang</span>
                  <span className="font-medium">{formatCurrency(unitPrice)}</span>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(totalPrice)}</span>
              </div>
              <Button
                className="w-full"
                size="lg"
                disabled={!departureId || passengers.length === 0 || createBookingMutation.isPending || passengers.length > availableSlots}
                onClick={() => createBookingMutation.mutate()}
              >
                {createBookingMutation.isPending ? 'Memproses...' : 'Buat Booking'}
              </Button>
              {passengers.length > availableSlots && availableSlots > 0 && (
                <p className="text-sm text-destructive text-center">
                  Jumlah jamaah melebihi slot tersedia ({availableSlots})
                </p>
              )}
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
