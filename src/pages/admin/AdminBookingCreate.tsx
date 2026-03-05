import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { 
  ArrowLeft, Search, UserPlus, Plus, X, Users, Minus, 
  BedDouble, AlertTriangle, Info, Package, Calendar, 
  CheckCircle2, CreditCard, UserCheck
} from "lucide-react";
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

const ROOM_INFO: Record<RoomType, { label: string; occupancy: number; desc: string; icon: any }> = {
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

  // Determine current step for UI feedback
  const currentStep = useMemo(() => {
    if (!packageId) return 1;
    if (!departureId) return 2;
    if (roomAllocation.quad + roomAllocation.triple + roomAllocation.double + roomAllocation.single === 0) return 3;
    return 4;
  }, [packageId, departureId, roomAllocation]);

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

  // Stepper UI Component
  const Stepper = () => (
    <div className="flex items-center justify-between mb-8 px-4 gap-2">
      {[
        { step: 1, label: "Paket", icon: Package },
        { step: 2, label: "Jadwal", icon: Calendar },
        { step: 3, label: "Kamar", icon: BedDouble },
        { step: 4, label: "Jamaah", icon: UserCheck }
      ].map((item, idx) => (
        <div key={item.step} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center relative">
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 text-sm font-bold",
              currentStep >= item.step ? "bg-primary border-primary text-primary-foreground" : "bg-background border-muted text-muted-foreground"
            )}>
              {currentStep > item.step ? <CheckCircle2 className="h-5 w-5" /> : <span>{item.step}</span>}
            </div>
            <span className={cn(
              "text-[10px] font-bold mt-2 absolute -bottom-6 whitespace-nowrap",
              currentStep >= item.step ? "text-primary" : "text-muted-foreground"
            )}>
              {item.label}
            </span>
          </div>
          {idx < 3 && (
            <div className={cn(
              "h-[2px] flex-1 mx-2 transition-all duration-300",
              currentStep > item.step ? "bg-primary" : "bg-muted"
            )} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="rounded-full hover:bg-muted">
              <Link to="/admin/bookings"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Buat Booking Baru</h1>
              <p className="text-muted-foreground text-sm">Sistem pendaftaran jamaah manual yang terintegrasi</p>
            </div>
          </div>
          <Badge variant="outline" className="px-4 py-1 text-sm font-medium hidden sm:flex">
            Admin Portal
          </Badge>
        </div>

        <Stepper />

        <div className="grid gap-8 lg:grid-cols-12 items-start pt-4">
          <div className="lg:col-span-8 space-y-8">
            {/* Step 1 & 2: Pemilihan Paket & Jadwal */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className={cn("transition-all duration-300 overflow-hidden", currentStep === 1 && "ring-2 ring-primary ring-offset-2")}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    1. Pilih Paket
                  </CardTitle>
                  <CardDescription className="text-xs">Pilih kategori layanan umrah/haji</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={packageId} onValueChange={handlePackageChange}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Pilih paket..." />
                    </SelectTrigger>
                    <SelectContent>
                      {packages?.map(p => (
                        <SelectItem key={p.id} value={p.id} className="py-2">
                          <span className="font-medium">{p.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card className={cn("transition-all duration-300 overflow-hidden", currentStep === 2 && "ring-2 ring-primary ring-offset-2", !packageId && "opacity-50 pointer-events-none")}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    2. Keberangkatan
                  </CardTitle>
                  <CardDescription className="text-xs">Pilih jadwal yang tersedia</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={departureId} onValueChange={handleDepartureChange}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Pilih tanggal..." />
                    </SelectTrigger>
                    <SelectContent>
                      {departures?.map(d => {
                        const avail = d.quota - (d.booked_count || 0);
                        return (
                          <SelectItem key={d.id} value={d.id} disabled={avail <= 0} className="py-2">
                            <span className="font-medium">{formatDate(d.departure_date)}</span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  {selectedDeparture && (
                    <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/10 text-sm">
                      <div className="flex items-center gap-2 text-primary font-medium">
                        <Info className="h-4 w-4" />
                        <span className="text-xs font-bold">{availableSlots} Slot</span>
                      </div>
                      <div className="text-muted-foreground text-xs">
                        Hingga {formatDate(selectedDeparture.return_date)}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Step 3: Tipe Kamar */}
            <Card className={cn("transition-all duration-300 overflow-hidden", currentStep === 3 && "ring-2 ring-primary ring-offset-2", !departureId && "opacity-50 pointer-events-none")}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BedDouble className="h-5 w-5 text-primary" />
                  3. Tipe Kamar & Alokasi
                </CardTitle>
                <CardDescription className="text-xs">Tentukan jumlah jamaah berdasarkan jenis kamar</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {(Object.keys(ROOM_INFO) as RoomType[]).map((type) => {
                  const info = ROOM_INFO[type];
                  const count = roomAllocation[type];
                  const price = prices[type];
                  if (price <= 0) return null;

                  const isDoubleError = type === 'double' && count > 0 && count % 2 !== 0;

                  return (
                    <div key={type} className="relative">
                      <div className={cn(
                        "p-4 rounded-xl border-2 transition-all duration-200",
                        count > 0 ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30",
                        isDoubleError && "border-destructive bg-destructive/5"
                      )}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="p-2 bg-background rounded-lg border shadow-sm">
                            <info.icon className={cn("h-5 w-5", count > 0 ? "text-primary" : "text-muted-foreground")} />
                          </div>
                          <Badge variant={count > 0 ? "default" : "outline"} className="font-bold text-xs">
                            {count}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1">
                          <h3 className="font-bold text-sm">{info.label}</h3>
                          <p className="text-xs text-muted-foreground">{info.desc}</p>
                          <p className="text-xs font-semibold text-primary mt-2">
                            {formatCurrency(price)} <span className="text-[9px] text-muted-foreground font-normal">/ pax</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2 mt-4">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() => updateRoomCount(type, -1)}
                            disabled={count <= 0}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <div className="flex-1 text-center font-bold text-sm">{count}</div>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() => updateRoomCount(type, 1)}
                            disabled={totalFromRooms >= availableSlots}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {isDoubleError && (
                        <div className="absolute -bottom-5 left-0 right-0 text-center">
                          <span className="text-[9px] text-destructive font-bold flex items-center justify-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Kelipatan 2
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Step 4: Data Jamaah - IMPROVED LAYOUT */}
            {totalFromRooms > 0 && (
              <Card className={cn("transition-all duration-300 overflow-visible", currentStep === 4 && "ring-2 ring-primary ring-offset-2")}>
                <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      4. Detail Jamaah
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">Lengkapi identitas untuk setiap slot yang dipilih</CardDescription>
                  </div>
                  <Badge variant="secondary" className="h-6 px-2 text-xs font-bold">
                    {passengers.filter(p => p.customer_id).length} / {totalFromRooms}
                  </Badge>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="grid gap-5">
                    {passengers.map((p, idx) => (
                      <div key={idx} className={cn(
                        "relative border rounded-xl transition-all duration-200 overflow-visible",
                        p.customer_id ? "bg-background border-primary/20 shadow-sm" : "bg-muted/20 border-dashed border-muted-foreground/30"
                      )}>
                        <div className={cn(
                          "absolute top-0 left-0 bottom-0 w-1 rounded-l-xl",
                          p.customer_id ? "bg-primary" : "bg-muted-foreground/20"
                        )} />
                        
                        <div className="p-4 space-y-4">
                          {/* Slot Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs",
                                p.customer_id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                              )}>
                                {idx + 1}
                              </div>
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Slot {idx + 1}</p>
                                <Badge variant="outline" className="mt-1 text-[9px] font-medium h-5">
                                  {ROOM_INFO[p.room_type].label}
                                </Badge>
                              </div>
                            </div>
                            {p.customer_id && (
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full" 
                                onClick={() => clearSlot(idx)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          {/* Input Area */}
                          {!p.customer_id ? (
                            <div className="space-y-3">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                  placeholder="Cari nama atau telepon..."
                                  value={activePassengerIndex === idx ? customerSearch : ""}
                                  onChange={e => {
                                    setActivePassengerIndex(idx);
                                    setCustomerSearch(e.target.value);
                                  }}
                                  onFocus={() => setActivePassengerIndex(idx)}
                                  className="pl-9 h-10 border-muted-foreground/20 text-sm"
                                  autoComplete="off"
                                />
                                
                                {/* Dropdown Results - FIXED Z-INDEX */}
                                {activePassengerIndex === idx && searchResults && searchResults.length > 0 && (
                                  <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-popover border rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                                    {searchResults.map(c => (
                                      <button
                                        key={c.id}
                                        className="w-full text-left p-3 hover:bg-muted transition-colors flex items-center justify-between border-b last:border-0 text-sm"
                                        onClick={() => assignCustomerToSlot(c, idx)}
                                      >
                                        <div className="space-y-1 flex-1">
                                          <p className="font-bold text-xs">{c.full_name}</p>
                                          <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                                            {c.nik && <span>{c.nik}</span>}
                                            {c.phone && <span>{c.phone}</span>}
                                          </div>
                                        </div>
                                        <UserPlus className="h-4 w-4 text-primary shrink-0 ml-2" />
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <Button
                                variant="outline"
                                className="w-full h-10 border-dashed text-sm"
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
                            <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg">
                              <div className="space-y-1">
                                <p className="font-bold text-sm">{p.full_name}</p>
                                <p className="text-xs text-muted-foreground">{p.phone || 'No phone'}</p>
                              </div>
                              <Select
                                value={p.passenger_type}
                                onValueChange={v => setPassengers(prev => prev.map((pp, i) => i === idx ? { ...pp, passenger_type: v } : pp))}
                              >
                                <SelectTrigger className="w-[100px] h-9 text-xs">
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
                      </div>
                    ))}
                  </div>

                  {/* Notes Section */}
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-xs font-bold flex items-center gap-2">
                      <Info className="h-4 w-4 text-primary" /> Catatan Internal (Opsional)
                    </Label>
                    <Textarea 
                      value={notes} 
                      onChange={e => setNotes(e.target.value)} 
                      rows={3} 
                      placeholder="Contoh: Permintaan kamar lantai bawah, alergi makanan, dll..." 
                      className="resize-none border-muted-foreground/20 focus:ring-primary text-sm"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar Summary - Right Column */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="sticky top-6 border-2 shadow-lg overflow-hidden">
              <div className="h-2 bg-primary w-full" />
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Ringkasan Biaya
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-muted-foreground font-medium">Paket Dipilih</span>
                    <span className="text-xs font-bold text-right max-w-[150px]">{selectedPackage?.name || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground font-medium">Total Jamaah</span>
                    <Badge variant="secondary" className="font-bold text-xs">
                      {passengers.filter(p => p.customer_id).length} / {totalFromRooms}
                    </Badge>
                  </div>
                </div>

                <Separator />

                {totalFromRooms > 0 && (
                  <div className="space-y-3">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Rincian Kamar</p>
                    {(Object.keys(roomAllocation) as RoomType[]).map(type => {
                      if (roomAllocation[type] === 0) return null;
                      return (
                        <div key={type} className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-primary" />
                            <span className="text-muted-foreground uppercase font-medium">{type}</span>
                            <span className="font-bold">x{roomAllocation[type]}</span>
                          </div>
                          <span className="font-medium">{formatCurrency(roomAllocation[type] * prices[type])}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 space-y-1">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-bold text-primary uppercase tracking-tighter">Total Estimasi</span>
                    <span className="text-2xl font-black text-primary leading-none">{formatCurrency(totalPrice)}</span>
                  </div>
                </div>

                {doubleValidationError && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/5 text-destructive rounded-lg border border-destructive/20">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <p className="text-[9px] font-bold">Kamar DOUBLE harus berjumlah genap!</p>
                  </div>
                )}
                
                <Button
                  className="w-full h-12 text-sm font-bold shadow-md hover:shadow-xl transition-all duration-300"
                  size="lg"
                  disabled={!canSubmit}
                  onClick={() => createBookingMutation.mutate()}
                >
                  {createBookingMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                      Memproses...
                    </div>
                  ) : (
                    'Konfirmasi Booking'
                  )}
                </Button>

                <p className="text-[9px] text-center text-muted-foreground px-4">
                  Dengan mengklik tombol di atas, Anda mengonfirmasi bahwa data yang dimasukkan telah sesuai dengan dokumen asli jamaah.
                </p>
              </CardContent>
            </Card>
            
            {/* Helpful Tips Card */}
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="p-4 space-y-3">
                <h4 className="text-xs font-bold flex items-center gap-2">
                  <Info className="h-3 w-3 text-primary" /> Tips Admin
                </h4>
                <ul className="text-[9px] space-y-2 text-muted-foreground">
                  <li>• Gunakan fitur <strong>Cari</strong> untuk mempercepat input data jamaah lama.</li>
                  <li>• Pastikan <strong>Tipe Kamar</strong> sudah sesuai sebelum mengisi data jamaah.</li>
                  <li>• Catatan internal akan muncul pada manifest keberangkatan.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Add New Customer Dialog */}
      <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Tambah Jamaah Baru</DialogTitle>
            <CardDescription>Masukkan data dasar untuk pendaftaran awal</CardDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label className="font-bold text-sm">Nama Lengkap sesuai Paspor/KTP *</Label>
              <Input
                value={newCustomer.full_name}
                onChange={e => setNewCustomer(p => ({ ...p, full_name: e.target.value }))}
                placeholder="Contoh: Ahmad Subagjo"
                className="h-11"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold text-sm">No. Telepon / WhatsApp</Label>
                <Input
                  value={newCustomer.phone}
                  onChange={e => setNewCustomer(p => ({ ...p, phone: e.target.value }))}
                  placeholder="0812..."
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-sm">Email (Opsional)</Label>
                <Input
                  type="email"
                  value={newCustomer.email}
                  onChange={e => setNewCustomer(p => ({ ...p, email: e.target.value }))}
                  placeholder="ahmad@email.com"
                  className="h-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-sm">NIK (Nomor Induk Kependudukan)</Label>
              <Input
                value={newCustomer.nik}
                onChange={e => setNewCustomer(p => ({ ...p, nik: e.target.value }))}
                placeholder="16 digit angka..."
                className="h-11"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowAddCustomer(false)} className="rounded-xl">Batal</Button>
            <Button
              disabled={!newCustomer.full_name || createCustomerMutation.isPending}
              onClick={() => createCustomerMutation.mutate(newCustomer)}
              className="rounded-xl px-8 font-bold"
            >
              {createCustomerMutation.isPending ? 'Menyimpan...' : 'Simpan & Masukkan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
