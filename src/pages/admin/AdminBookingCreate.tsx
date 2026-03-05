import { useState, useMemo, useEffect } from "react";
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
import { formatCurrency, formatDate } from "@/lib/format";
import { ArrowLeft, Search, UserPlus, Plus, X, Users, Minus, BedDouble, AlertTriangle, Info, Package } from "lucide-react";
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
  package_id: string;
  departure_date: string;
  return_date: string;
  quota: number;
  booked_count: number | null;
  status: string;
  price_quad: number | null;
  price_triple: number | null;
  price_double: number | null;
  price_single: number | null;
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

  const [packageId, setPackageId] = useState<string>("");
  const [departureId, setDepartureId] = useState<string>("");
  const [roomAllocation, setRoomAllocation] = useState<RoomAllocation>({
    quad: 0, triple: 0, double: 0, single: 0,
  });
  const [notes, setNotes] = useState("");
  const [passengers, setPassengers] = useState<PassengerEntry[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [activePassengerIndex, setActivePassengerIndex] = useState<number | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ full_name: "", phone: "", email: "", nik: "" });

  // Fetch active packages
  const { data: packages } = useQuery<PackageData[]>({
    queryKey: ['admin-packages-for-booking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch departures for selected package
  const { data: departures } = useQuery<DepartureData[]>({
    queryKey: ['admin-departures-for-package', packageId],
    queryFn: async () => {
      if (!packageId) return [];
      const { data, error } = await supabase
        .from('departures')
        .select(`
          id, package_id, departure_date, return_date, quota, booked_count, status,
          price_quad, price_triple, price_double, price_single
        `)
        .eq('package_id', packageId)
        .in('status', ['open', 'confirmed'])
        .gte('departure_date', new Date().toISOString().split('T')[0])
        .order('departure_date');
      if (error) throw error;
      return (data || []) as DepartureData[];
    },
    enabled: !!packageId,
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

  const selectedPackage = packages?.find(p => p.id === packageId);
  const selectedDeparture = departures?.find(d => d.id === departureId);
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
  
  // Effect to sync passengers with room allocation
  useEffect(() => {
    const newPassengers: PassengerEntry[] = [];
    let currentIdx = 0;
    
    (['quad', 'triple', 'double', 'single'] as RoomType[]).forEach(type => {
      for (let i = 0; i < roomAllocation[type]; i++) {
        const existing = passengers[currentIdx];
        if (existing) {
          newPassengers.push({ ...existing, room_type: type });
        } else {
          newPassengers.push({
            customer_id: "",
            full_name: "",
            phone: "",
            passenger_type: 'adult',
            room_type: type,
            is_new: false,
          });
        }
        currentIdx++;
      }
    });
    
    setPassengers(newPassengers);
  }, [roomAllocation]);

  const updateRoomCount = (type: RoomType, delta: number) => {
    setRoomAllocation(prev => {
      const newCount = Math.max(0, prev[type] + delta);
      const newTotal = (type === 'quad' ? newCount : prev.quad) +
        (type === 'triple' ? newCount : prev.triple) +
        (type === 'double' ? newCount : prev.double) +
        (type === 'single' ? newCount : prev.single);
      if (newTotal > availableSlots) {
        toast.error("Slot tidak mencukupi");
        return prev;
      }
      return { ...prev, [type]: newCount };
    });
  };

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

  const assignCustomerToSlot = (customer: any, index: number) => {
    if (passengers.some((p, i) => i !== index && p.customer_id === customer.id)) {
      toast.error("Jamaah sudah ada di slot lain");
      return;
    }
    
    setPassengers(prev => prev.map((p, i) => i === index ? {
      ...p,
      customer_id: customer.id,
      full_name: customer.full_name,
      phone: customer.phone || '',
    } : p));
    
    setCustomerSearch("");
    setActivePassengerIndex(null);
  };

  const clearSlot = (index: number) => {
    setPassengers(prev => prev.map((p, i) => i === index ? {
      ...p,
      customer_id: "",
      full_name: "",
      phone: "",
    } : p));
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
      if (activePassengerIndex !== null) {
        assignCustomerToSlot(customer, activePassengerIndex);
      }
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
      if (!departureId || passengers.some(p => !p.customer_id)) throw new Error("Data jamaah belum lengkap");
      if (doubleValidationError) throw new Error("Tipe Double harus kelipatan 2 orang");

      const { data: bookingCode } = await supabase.rpc('generate_booking_code');
      const mainCustomerId = passengers[0].customer_id;
      const dominantRoom = getDominantRoomType();
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

  const handlePackageChange = (id: string) => {
    setPackageId(id);
    setDepartureId("");
    setRoomAllocation({ quad: 0, triple: 0, double: 0, single: 0 });
    setPassengers([]);
  };

  const handleDepartureChange = (id: string) => {
    setDepartureId(id);
    setRoomAllocation({ quad: 0, triple: 0, double: 0, single: 0 });
    setPassengers([]);
  };

  const canSubmit = departureId &&
    totalFromRooms > 0 &&
    passengers.every(p => p.customer_id) &&
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
          {/* Step 1: Pilih Paket */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-5 w-5" />
                1. Pilih Paket
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={packageId} onValueChange={handlePackageChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih paket..." />
                </SelectTrigger>
                <SelectContent>
                  {packages?.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Step 2: Pilih Keberangkatan */}
          {packageId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">2. Pilih Keberangkatan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={departureId} onValueChange={handleDepartureChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tanggal keberangkatan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departures?.map(d => {
                      const avail = d.quota - (d.booked_count || 0);
                      return (
                        <SelectItem key={d.id} value={d.id} disabled={avail <= 0}>
                          {formatDate(d.departure_date)} ({avail} slot tersedia)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {selectedDeparture && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg text-sm">
                    <div>
                      <p className="text-muted-foreground">Tersedia</p>
                      <p className="font-medium">{availableSlots} dari {selectedDeparture.quota}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pulang</p>
                      <p className="font-medium">{formatDate(selectedDeparture.return_date)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Pilih Tipe Kamar & Jumlah */}
          {selectedDeparture && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BedDouble className="h-5 w-5" />
                  3. Pilih Tipe Kamar & Jumlah Jamaah
                </CardTitle>
                <p className="text-sm text-muted-foreground">Tentukan berapa orang per tipe kamar.</p>
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
              </CardContent>
            </Card>
          )}

          {/* Step 4: Data Jamaah */}
          {totalFromRooms > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    4. Data Jamaah ({passengers.filter(p => p.customer_id).length}/{totalFromRooms})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {passengers.map((p, idx) => (
                    <div key={idx} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center">
                            {idx + 1}
                          </Badge>
                          <span className="font-medium">Slot {idx + 1}</span>
                          <Badge variant="secondary">{ROOM_INFO[p.room_type].label}</Badge>
                        </div>
                        {p.customer_id && (
                          <Button size="sm" variant="ghost" className="text-destructive h-8 px-2" onClick={() => clearSlot(idx)}>
                            <X className="h-4 w-4 mr-1" /> Lepas
                          </Button>
                        )}
                      </div>

                      {!p.customer_id ? (
                        <div className="space-y-3">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Cari jamaah atau tambah baru..."
                              value={activePassengerIndex === idx ? customerSearch : ""}
                              onChange={e => {
                                setActivePassengerIndex(idx);
                                setCustomerSearch(e.target.value);
                              }}
                              onFocus={() => setActivePassengerIndex(idx)}
                              className="pl-10"
                            />
                          </div>
                          
                          {activePassengerIndex === idx && searchResults && searchResults.length > 0 && (
                            <div className="border rounded-lg divide-y max-h-48 overflow-y-auto bg-popover">
                              {searchResults.map(c => (
                                <button
                                  key={c.id}
                                  className="w-full text-left p-3 hover:bg-muted flex items-center justify-between"
                                  onClick={() => assignCustomerToSlot(c, idx)}
                                >
                                  <div>
                                    <p className="font-medium">{c.full_name}</p>
                                    <p className="text-xs text-muted-foreground">{c.phone || c.nik || 'No phone/NIK'}</p>
                                  </div>
                                  <UserPlus className="h-4 w-4 text-primary" />
                                </button>
                              ))}
                            </div>
                          )}

                          <Button
                            variant="outline"
                            className="w-full border-dashed"
                            onClick={() => {
                              setActivePassengerIndex(idx);
                              setShowAddCustomer(true);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Tambah Customer Baru
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-muted/30 p-3 rounded-md">
                          <div>
                            <p className="font-bold">{p.full_name}</p>
                            <p className="text-sm text-muted-foreground">{p.phone || 'No phone'}</p>
                          </div>
                          <Select
                            value={p.passenger_type}
                            onValueChange={v => setPassengers(prev => prev.map((pp, i) => i === idx ? { ...pp, passenger_type: v } : pp))}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="adult">Dewasa</SelectItem>
                              <SelectItem value="child">Anak</SelectItem>
                              <SelectItem value="infant">Bayi</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-4">
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
                  <span className="font-medium">{selectedPackage?.name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Jamaah</span>
                  <span className="font-medium">{passengers.filter(p => p.customer_id).length}/{totalFromRooms} orang</span>
                </div>
              </div>

              {totalFromRooms > 0 && (
                <div className="space-y-1 text-xs border-t pt-2">
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
