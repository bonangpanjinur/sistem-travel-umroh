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
  CheckCircle2, CreditCard, UserCheck, ArrowRight
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

  const [activeStep, setActiveStep] = useState(1);
  const [packageId, setPackageId] = useState<string>("");
  const [departureId, setDepartureId] = useState<string>("");
  const [roomAllocation, setRoomAllocation] = useState<RoomAllocation>({
    quad: 0, triple: 0, double: 0, single: 0,
  });
  const [notes, setNotes] = useState("");
  const [passengers, setPassengers] = useState<PassengerEntry[]>([]);
  const [picType, setPicType] = useState<'pusat' | 'cabang' | 'agen'>('pusat');
  const [picBranchId, setPicBranchId] = useState<string>("");
  const [picAgentId, setPicAgentId] = useState<string>("");
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

  // Fetch branches for PIC
  const { data: branches } = useQuery({
    queryKey: ['branches-for-pic'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('id, name, code').eq('is_active', true).order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch agents for PIC
  const { data: agents } = useQuery({
    queryKey: ['agents-for-pic'],
    queryFn: async () => {
      const { data, error } = await supabase.from('agents').select('id, agent_code, company_name, user_id').eq('is_active', true);
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

      const { data: bookingCode } = await supabase.rpc('generate_booking_code', { _package_code: selectedPackage?.code || '', _departure_date: selectedDeparture?.departure_date || new Date().toISOString().split('T')[0] });
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
          branch_id: picType === 'cabang' && picBranchId ? picBranchId : null,
          agent_id: picType === 'agen' && picAgentId ? picAgentId : null,
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
    // Auto-advance to next step after package selection
    setTimeout(() => setActiveStep(2), 300);
  };

  const handleDepartureChange = (id: string) => {
    setDepartureId(id);
    setRoomAllocation({ quad: 0, triple: 0, double: 0, single: 0 });
    setPassengers([]);
    // Auto-advance to next step after departure selection
    setTimeout(() => setActiveStep(3), 300);
  };

  const canSubmit = departureId &&
    totalFromRooms > 0 &&
    passengers.every(p => p.customer_id) &&
    !doubleValidationError &&
    passengers.length <= availableSlots &&
    !createBookingMutation.isPending;

  // Wizard Navigation Helpers
  const nextStep = () => {
    if (activeStep === 1 && !packageId) {
      toast.error("Pilih paket terlebih dahulu");
      return;
    }
    if (activeStep === 2 && !departureId) {
      toast.error("Pilih jadwal keberangkatan");
      return;
    }
    if (activeStep === 3 && totalFromRooms === 0) {
      toast.error("Tentukan jumlah jamaah");
      return;
    }
    if (activeStep === 3 && doubleValidationError) {
      toast.error("Kamar Double harus kelipatan 2");
      return;
    }
    setActiveStep(prev => Math.min(prev + 1, 4));
  };

  const prevStep = () => setActiveStep(prev => Math.max(prev - 1, 1));

  // Stepper UI Component
  const Stepper = () => (
    <div className="flex items-center justify-between mb-8 px-4 gap-2">
      {[
        { step: 1, label: "Paket", icon: Package },
        { step: 2, label: "Jadwal", icon: Calendar },
        { step: 3, label: "Kamar", icon: BedDouble },
        { step: 4, label: "Jamaah", icon: UserCheck }
      ].map((item, idx) => (
        <button 
          key={item.step} 
          className="flex items-center flex-1 last:flex-none outline-none group"
          onClick={() => {
            // Only allow clicking steps that are already "accessible"
            if (item.step < activeStep) setActiveStep(item.step);
          }}
          disabled={item.step >= activeStep}
        >
          <div className="flex flex-col items-center relative">
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 text-sm font-bold",
              activeStep === item.step ? "bg-primary border-primary text-primary-foreground scale-110 shadow-lg" : 
              activeStep > item.step ? "bg-primary/20 border-primary text-primary" : "bg-background border-muted text-muted-foreground"
            )}>
              {activeStep > item.step ? <CheckCircle2 className="h-5 w-5" /> : <span>{item.step}</span>}
            </div>
            <span className={cn(
              "text-[10px] font-bold mt-2 absolute -bottom-6 whitespace-nowrap",
              activeStep === item.step ? "text-primary" : "text-muted-foreground"
            )}>
              {item.label}
            </span>
          </div>
          {idx < 3 && (
            <div className={cn(
              "h-[2px] flex-1 mx-2 transition-all duration-300",
              activeStep > item.step ? "bg-primary" : "bg-muted"
            )} />
          )}
        </button>
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
          {/* Main Content Area - Content Changes Based on Step */}
          <div className="lg:col-span-8">
            <div className="transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
              {/* STEP 1: PILIH PAKET */}
              {activeStep === 1 && (
                <Card className="border-2 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Package className="h-6 w-6 text-primary" />
                      Langkah 1: Pilih Paket
                    </CardTitle>
                    <CardDescription>Pilih kategori layanan umrah atau haji untuk memulai booking</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {packages?.map(p => (
                        <button
                          key={p.id}
                          onClick={() => handlePackageChange(p.id)}
                          className={cn(
                            "p-5 text-left border-2 rounded-xl transition-all hover:border-primary/50 group",
                            packageId === p.id ? "border-primary bg-primary/5 shadow-md" : "border-muted bg-background"
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className={cn(
                              "h-10 w-10 rounded-lg flex items-center justify-center transition-colors",
                              packageId === p.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-primary/10"
                            )}>
                              <Package className="h-5 w-5" />
                            </div>
                            {packageId === p.id && <CheckCircle2 className="h-5 w-5 text-primary" />}
                          </div>
                          <p className="font-bold text-base">{p.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{p.code}</p>
                        </button>
                      ))}
                    </div>
                    
                    <div className="flex justify-end pt-4">
                      <Button size="lg" onClick={nextStep} disabled={!packageId} className="px-8 font-bold">
                        Lanjut Pilih Jadwal <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* STEP 2: PILIH JADWAL */}
              {activeStep === 2 && (
                <Card className="border-2 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Calendar className="h-6 w-6 text-primary" />
                      Langkah 2: Pilih Jadwal Keberangkatan
                    </CardTitle>
                    <CardDescription>Jadwal tersedia untuk paket <strong>{selectedPackage?.name}</strong></CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4">
                      {departures?.length === 0 ? (
                        <div className="p-10 text-center border-2 border-dashed rounded-xl">
                          <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">Tidak ada jadwal keberangkatan yang tersedia untuk paket ini.</p>
                        </div>
                      ) : (
                        departures?.map(d => {
                          const avail = d.quota - (d.booked_count || 0);
                          return (
                            <button
                              key={d.id}
                              onClick={() => handleDepartureChange(d.id)}
                              disabled={avail <= 0}
                              className={cn(
                                "p-4 text-left border-2 rounded-xl transition-all flex items-center justify-between",
                                departureId === d.id ? "border-primary bg-primary/5 shadow-md" : "border-muted bg-background",
                                avail <= 0 && "opacity-50 grayscale pointer-events-none"
                              )}
                            >
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "h-12 w-12 rounded-full flex flex-col items-center justify-center leading-none",
                                  departureId === d.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                )}>
                                  <span className="text-[10px] font-bold uppercase">{new Date(d.departure_date).toLocaleString('id-ID', { month: 'short' })}</span>
                                  <span className="text-lg font-black">{new Date(d.departure_date).getDate()}</span>
                                </div>
                                <div>
                                  <p className="font-bold">{formatDate(d.departure_date)}</p>
                                  <p className="text-xs text-muted-foreground">Durasi hingga {formatDate(d.return_date)}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant={avail > 10 ? "secondary" : "destructive"} className="font-bold">
                                  {avail} Slot Tersedia
                                </Badge>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                    
                    <div className="flex justify-between pt-4">
                      <Button variant="ghost" onClick={prevStep} className="font-bold">Kembali</Button>
                      <Button size="lg" onClick={nextStep} disabled={!departureId} className="px-8 font-bold">
                        Lanjut Atur Kamar <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* STEP 3: TIPE KAMAR */}
              {activeStep === 3 && (
                <Card className="border-2 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <BedDouble className="h-6 w-6 text-primary" />
                      Langkah 3: Tipe Kamar & Alokasi
                    </CardTitle>
                    <CardDescription>Tentukan berapa jamaah untuk setiap tipe kamar pada keberangkatan ini</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {(Object.keys(ROOM_INFO) as RoomType[]).map((type) => {
                        const info = ROOM_INFO[type];
                        const count = roomAllocation[type];
                        const price = prices[type];
                        if (price <= 0) return null;

                        const isDoubleError = type === 'double' && count > 0 && count % 2 !== 0;

                        return (
                          <div key={type} className={cn(
                            "p-5 rounded-xl border-2 transition-all",
                            count > 0 ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-background",
                            isDoubleError && "border-destructive bg-destructive/5"
                          )}>
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "p-2 rounded-lg",
                                  count > 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                )}>
                                  <info.icon className="h-5 w-5" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-base">{info.label}</h3>
                                  <p className="text-[10px] text-muted-foreground">{info.desc}</p>
                                </div>
                              </div>
                              <Badge variant="outline" className="font-bold">{formatCurrency(price)}</Badge>
                            </div>

                            <div className="flex items-center gap-4 bg-background border rounded-lg p-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-full hover:bg-muted"
                                onClick={() => updateRoomCount(type, -1)}
                                disabled={count <= 0}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <div className="flex-1 text-center font-black text-xl">{count}</div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-full hover:bg-muted"
                                onClick={() => updateRoomCount(type, 1)}
                                disabled={totalFromRooms >= availableSlots}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            {isDoubleError && (
                              <p className="text-[10px] text-destructive font-bold mt-2 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> Harus kelipatan 2 orang
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="flex justify-between pt-4">
                      <Button variant="ghost" onClick={prevStep} className="font-bold">Kembali</Button>
                      <Button size="lg" onClick={nextStep} disabled={totalFromRooms === 0 || doubleValidationError} className="px-8 font-bold">
                        Lanjut Isi Data Jamaah <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* STEP 4: DATA JAMAAH */}
              {activeStep === 4 && (
                <Card className="border-2 shadow-sm overflow-visible">
                  <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Users className="h-6 w-6 text-primary" />
                        Langkah 4: Detail Jamaah
                      </CardTitle>
                      <CardDescription>Lengkapi identitas untuk {totalFromRooms} slot yang telah dialokasikan</CardDescription>
                    </div>
                    <Badge variant="secondary" className="h-8 px-3 text-xs font-bold">
                      {passengers.filter(p => p.customer_id).length} / {totalFromRooms} Terisi
                    </Badge>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-8">
                    <div className="grid gap-6">
                      {passengers.map((p, idx) => (
                        <div key={idx} className={cn(
                          "relative border-2 rounded-2xl transition-all duration-200 overflow-visible",
                          p.customer_id ? "bg-background border-primary/20 shadow-sm" : "bg-muted/10 border-dashed border-muted-foreground/30"
                        )}>
                          <div className={cn(
                            "absolute top-0 left-0 bottom-0 w-1.5 rounded-l-2xl",
                            p.customer_id ? "bg-primary" : "bg-muted-foreground/20"
                          )} />
                          
                          <div className="p-5 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "h-10 w-10 rounded-full flex items-center justify-center font-black text-sm",
                                  p.customer_id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                )}>
                                  {idx + 1}
                                </div>
                                <div>
                                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Slot {idx + 1}</p>
                                  <Badge variant="outline" className="mt-1 text-[10px] font-bold h-5 bg-background">
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

                            {!p.customer_id ? (
                              <div className="grid gap-3 sm:grid-cols-4">
                                <div className="sm:col-span-3 relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                  <Input
                                    placeholder="Cari nama atau nomor telepon..."
                                    value={activePassengerIndex === idx ? customerSearch : ""}
                                    onChange={e => {
                                      setActivePassengerIndex(idx);
                                      setCustomerSearch(e.target.value);
                                    }}
                                    onFocus={() => setActivePassengerIndex(idx)}
                                    className="pl-10 h-11 border-muted-foreground/30 text-sm rounded-xl"
                                    autoComplete="off"
                                  />
                                  
                                  {activePassengerIndex === idx && searchResults && searchResults.length > 0 && (
                                    <div className="absolute z-[100] top-full left-0 right-0 mt-2 bg-popover border-2 rounded-2xl shadow-2xl max-h-72 overflow-y-auto animate-in fade-in zoom-in-95">
                                      {searchResults.map(c => (
                                        <button
                                          key={c.id}
                                          className="w-full text-left p-4 hover:bg-primary/5 transition-colors flex items-center justify-between border-b last:border-0"
                                          onClick={() => assignCustomerToSlot(c, idx)}
                                        >
                                          <div className="space-y-1 flex-1">
                                            <p className="font-black text-sm">{c.full_name}</p>
                                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium">
                                              {c.nik && <span className="flex items-center gap-1"><Info className="h-3 w-3" /> {c.nik}</span>}
                                              {c.phone && <span className="flex items-center gap-1"><UserPlus className="h-3 w-3" /> {c.phone}</span>}
                                            </div>
                                          </div>
                                          <ArrowRight className="h-4 w-4 text-primary shrink-0 ml-2" />
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <Button
                                  variant="outline"
                                  className="h-11 border-dashed border-2 rounded-xl text-xs font-bold"
                                  onClick={() => {
                                    setActivePassengerIndex(idx);
                                    setShowAddCustomer(true);
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Customer Baru
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between bg-primary/5 p-4 rounded-xl border border-primary/10">
                                <div className="space-y-1">
                                  <p className="font-black text-base text-primary">{p.full_name}</p>
                                  <p className="text-xs text-muted-foreground font-medium">{p.phone || 'Tanpa nomor telepon'}</p>
                                </div>
                                <Select
                                  value={p.passenger_type}
                                  onValueChange={v => setPassengers(prev => prev.map((pp, i) => i === idx ? { ...pp, passenger_type: v } : pp))}
                                >
                                  <SelectTrigger className="w-[120px] h-10 text-xs font-bold bg-background rounded-lg border-2">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="adult">Dewasa</SelectItem>
                                    <SelectItem value="child">Anak-anak</SelectItem>
                                    <SelectItem value="infant">Bayi</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3 pt-6 border-t-2 border-dashed">
                      <Label className="text-sm font-black flex items-center gap-2">
                        <Info className="h-4 w-4 text-primary" /> Catatan Internal Booking
                      </Label>
                      <Textarea 
                        value={notes} 
                        onChange={e => setNotes(e.target.value)} 
                        rows={4} 
                        placeholder="Tambahkan catatan khusus untuk booking ini jika ada..." 
                        className="resize-none border-2 rounded-xl focus:ring-primary text-sm p-4"
                      />
                    </div>
                    
                    <div className="flex justify-between pt-4">
                      <Button variant="ghost" onClick={prevStep} className="font-bold">Kembali</Button>
                      <Button 
                        size="lg" 
                        disabled={!canSubmit || createBookingMutation.isPending} 
                        onClick={() => createBookingMutation.mutate()}
                        className="px-10 font-black shadow-lg"
                      >
                        {createBookingMutation.isPending ? 'Memproses...' : 'Konfirmasi & Buat Booking'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Sidebar Summary - Always Visible */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="sticky top-6 border-2 shadow-xl overflow-hidden rounded-2xl bg-background/50 backdrop-blur-sm">
              <div className="h-2 bg-primary w-full" />
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Ringkasan Booking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-muted-foreground font-bold text-xs uppercase">Paket</span>
                    <span className="font-black text-right">{selectedPackage?.name || '-'}</span>
                  </div>
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-muted-foreground font-bold text-xs uppercase">Jadwal</span>
                    <span className="font-black text-right">{selectedDeparture ? formatDate(selectedDeparture.departure_date) : '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-bold text-xs uppercase">Jamaah</span>
                    <Badge variant="secondary" className="font-black text-xs px-3">
                      {passengers.filter(p => p.customer_id).length} / {totalFromRooms} Terisi
                    </Badge>
                  </div>
                </div>

                <Separator className="bg-muted-foreground/10" />

                {totalFromRooms > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Rincian Kamar</p>
                    {(Object.keys(roomAllocation) as RoomType[]).map(type => {
                      if (roomAllocation[type] === 0) return null;
                      return (
                        <div key={type} className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                            <span className="text-muted-foreground uppercase font-bold text-[10px]">{type}</span>
                            <span className="font-black">x{roomAllocation[type]}</span>
                          </div>
                          <span className="font-bold">{formatCurrency(roomAllocation[type] * prices[type])}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="bg-primary text-primary-foreground p-5 rounded-2xl shadow-inner space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Pembayaran</span>
                  <div className="text-3xl font-black leading-none">{formatCurrency(totalPrice)}</div>
                </div>

                {doubleValidationError && (
                  <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-xl border-2 border-destructive/20 animate-pulse">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <p className="text-xs font-black">Kamar DOUBLE harus berjumlah genap!</p>
                  </div>
                )}
                
                {activeStep < 4 && (
                  <Button
                    className="w-full h-14 text-base font-black shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                    onClick={nextStep}
                    disabled={
                      (activeStep === 1 && !packageId) || 
                      (activeStep === 2 && !departureId) || 
                      (activeStep === 3 && (totalFromRooms === 0 || doubleValidationError))
                    }
                  >
                    Lanjut ke Langkah {activeStep + 1}
                  </Button>
                )}

                <p className="text-[10px] text-center text-muted-foreground px-4 leading-relaxed font-medium">
                  Pastikan semua data benar sebelum melakukan konfirmasi akhir di langkah ke-4.
                </p>
              </CardContent>
            </Card>
            
            {/* Contextual Tips Card */}
            <Card className="bg-primary/5 border-dashed border-2 border-primary/20 rounded-2xl">
              <CardContent className="p-5 space-y-3">
                <h4 className="text-xs font-black flex items-center gap-2 text-primary">
                  <Info className="h-4 w-4" /> Bantuan Langkah {activeStep}
                </h4>
                <div className="text-[10px] space-y-2 text-muted-foreground font-medium leading-relaxed">
                  {activeStep === 1 && <p>Pilih salah satu paket layanan yang tersedia untuk melihat jadwal keberangkatan yang ada.</p>}
                  {activeStep === 2 && <p>Tentukan tanggal keberangkatan. Pastikan slot yang tersedia mencukupi jumlah jamaah Anda.</p>}
                  {activeStep === 3 && <p>Gunakan tombol + dan - untuk mengatur jumlah orang per tipe kamar. Total jamaah akan dihitung otomatis.</p>}
                  {activeStep === 4 && <p>Cari nama jamaah yang sudah terdaftar atau tambahkan jamaah baru jika belum ada di sistem.</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Add New Customer Dialog */}
      <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl border-2 shadow-2xl p-0 overflow-hidden">
          <div className="bg-primary p-6 text-primary-foreground">
            <DialogTitle className="text-2xl font-black">Tambah Jamaah Baru</DialogTitle>
            <p className="text-xs opacity-80 mt-1 font-medium">Masukkan data identitas dasar untuk pendaftaran</p>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="font-black text-sm">Nama Lengkap (Sesuai KTP/Paspor) *</Label>
              <Input
                value={newCustomer.full_name}
                onChange={e => setNewCustomer(p => ({ ...p, full_name: e.target.value }))}
                placeholder="Masukkan nama lengkap jamaah..."
                className="h-12 border-2 rounded-xl focus:ring-primary"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-black text-sm">Nomor Telepon / WA</Label>
                <Input
                  value={newCustomer.phone}
                  onChange={e => setNewCustomer(p => ({ ...p, phone: e.target.value }))}
                  placeholder="0812..."
                  className="h-12 border-2 rounded-xl focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-sm">Email</Label>
                <Input
                  type="email"
                  value={newCustomer.email}
                  onChange={e => setNewCustomer(p => ({ ...p, email: e.target.value }))}
                  placeholder="jamaah@email.com"
                  className="h-12 border-2 rounded-xl focus:ring-primary"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-black text-sm">NIK (16 Digit)</Label>
              <Input
                value={newCustomer.nik}
                onChange={e => setNewCustomer(p => ({ ...p, nik: e.target.value }))}
                placeholder="Masukkan nomor NIK..."
                className="h-12 border-2 rounded-xl focus:ring-primary"
              />
            </div>
          </div>
          <DialogFooter className="p-8 pt-0 gap-3">
            <Button variant="ghost" onClick={() => setShowAddCustomer(false)} className="rounded-xl font-bold">Batal</Button>
            <Button
              disabled={!newCustomer.full_name || createCustomerMutation.isPending}
              onClick={() => createCustomerMutation.mutate(newCustomer)}
              className="rounded-xl px-10 font-black shadow-lg"
            >
              {createCustomerMutation.isPending ? 'Menyimpan...' : 'Simpan Jamaah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
