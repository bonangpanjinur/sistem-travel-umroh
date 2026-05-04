import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { UserPlus, Package } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { RoomType, GenderType } from "@/types/database";

export default function AgentRegister() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState("");
  const [selectedDeparture, setSelectedDeparture] = useState("");
  const [roomType, setRoomType] = useState<RoomType>("quad");
  
  // Passenger form state
  const [passengerData, setPassengerData] = useState({
    full_name: "",
    email: "",
    phone: "",
    nik: "",
    gender: "" as GenderType | "",
    birth_date: "",
    birth_place: "",
    address: "",
    city: "",
    province: "",
    passport_number: "",
    passport_expiry: "",
    notes: "",
  });

  const { data: agentData } = useQuery({
    queryKey: ['agent-profile-register', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('id, commission_rate')
        .eq('user_id', user!.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: packages, isLoading: loadingPackages } = useQuery({
    queryKey: ['agent-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('id, name, code')
        .eq('is_active', true);

      if (error) throw error;
      return data;
    },
  });

  const { data: departures, isLoading: loadingDepartures } = useQuery({
    queryKey: ['agent-departures', selectedPackage],
    enabled: !!selectedPackage,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departures')
        .select('id, departure_date, quota, booked_count, status, price_quad, price_triple, price_double, price_single')
        .eq('package_id', selectedPackage)
        .eq('status', 'open')
        .gt('quota', 0)
        .order('departure_date', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const selectedPackageData = packages?.find(p => p.id === selectedPackage);
  const selectedDepartureData = departures?.find(d => d.id === selectedDeparture);

  const getPrice = () => {
    if (!selectedDepartureData) return 0;
    switch (roomType) {
      case 'single': return selectedDepartureData.price_single || 0;
      case 'double': return selectedDepartureData.price_double || 0;
      case 'triple': return selectedDepartureData.price_triple || 0;
      case 'quad': return selectedDepartureData.price_quad || 0;
      default: return selectedDepartureData.price_quad || 0;
    }
  };

  const registerMutation = useMutation({
    mutationFn: async () => {
      // 1. Create customer
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          full_name: passengerData.full_name,
          email: passengerData.email,
          phone: passengerData.phone,
          nik: passengerData.nik,
          gender: passengerData.gender as GenderType,
          birth_date: passengerData.birth_date || null,
          birth_place: passengerData.birth_place,
          address: passengerData.address,
          city: passengerData.city,
          province: passengerData.province,
          passport_number: passengerData.passport_number,
          passport_expiry: passengerData.passport_expiry || null,
        })
        .select()
        .single();

      if (customerError) throw customerError;

      // 2. Generate booking code
      const bookingCode = (await supabase.rpc('generate_booking_code', { _package_code: selectedPackageData?.code || '', _departure_date: selectedDepartureData?.departure_date || new Date().toISOString().split('T')[0] })).data || `TRA${Date.now().toString(36).toUpperCase()}`;
      const price = getPrice();

      // 3. Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          booking_code: bookingCode,
          customer_id: customer.id,
          departure_id: selectedDeparture,
          agent_id: agentData?.id,
          room_type: roomType,
          total_pax: 1,
          adult_count: 1,
          base_price: price,
          total_price: price,
          notes: passengerData.notes,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // 4. Create booking passenger
      const { error: passengerError } = await supabase
        .from('booking_passengers')
        .insert({
          booking_id: booking.id,
          customer_id: customer.id,
          is_main_passenger: true,
          room_preference: roomType,
        });

      if (passengerError) throw passengerError;

      // 5. Create agent commission record
      const commissionAmount = price * (Number(agentData?.commission_rate || 5) / 100);
      
      const { error: commissionError } = await supabase
        .from('agent_commissions')
        .insert({
          agent_id: agentData?.id,
          booking_id: booking.id,
          commission_amount: commissionAmount,
          status: 'pending',
        });

      if (commissionError) throw commissionError;

      return booking;
    },
    onSuccess: (booking) => {
      toast.success(`Jamaah berhasil didaftarkan! Kode: ${booking.booking_code}`);
      navigate('/agent');
    },
    onError: (error) => {
      console.error('Registration error:', error);
      toast.error("Gagal mendaftarkan jamaah");
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setPassengerData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = 
    passengerData.full_name &&
    passengerData.phone &&
    passengerData.gender &&
    selectedPackage &&
    selectedDeparture;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Daftarkan Jamaah</h1>
        <p className="text-muted-foreground">Daftarkan jamaah baru melalui referral Anda</p>
      </div>

      {/* Package Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Pilih Paket & Keberangkatan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Paket Umroh</Label>
              {loadingPackages ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih paket" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages?.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name} ({pkg.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label>Keberangkatan</Label>
              {loadingDepartures ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select 
                  value={selectedDeparture} 
                  onValueChange={setSelectedDeparture}
                  disabled={!selectedPackage}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tanggal" />
                  </SelectTrigger>
                  <SelectContent>
                    {departures?.map((dep) => (
                      <SelectItem key={dep.id} value={dep.id}>
                        {format(new Date(dep.departure_date), "dd MMM yyyy")} 
                        ({dep.quota - dep.booked_count} seat)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label>Tipe Kamar</Label>
              <Select value={roomType} onValueChange={(v) => setRoomType(v as RoomType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quad">Quad (4 orang)</SelectItem>
                  <SelectItem value="triple">Triple (3 orang)</SelectItem>
                  <SelectItem value="double">Double (2 orang)</SelectItem>
                  <SelectItem value="single">Single (1 orang)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedDepartureData && (
              <div className="flex items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Harga</p>
                  <p className="text-xl font-bold text-primary">
                    Rp {getPrice().toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Passenger Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Data Jamaah
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Nama Lengkap *</Label>
              <Input
                value={passengerData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="Sesuai KTP/Paspor"
              />
            </div>
            <div>
              <Label>Jenis Kelamin *</Label>
              <Select 
                value={passengerData.gender} 
                onValueChange={(v) => handleInputChange('gender', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Laki-laki</SelectItem>
                  <SelectItem value="female">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>No. HP *</Label>
              <Input
                value={passengerData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="08xxxxxxxxxx"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={passengerData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>
            <div>
              <Label>NIK</Label>
              <Input
                value={passengerData.nik}
                onChange={(e) => handleInputChange('nik', e.target.value)}
                maxLength={16}
              />
            </div>
            <div>
              <Label>Tempat Lahir</Label>
              <Input
                value={passengerData.birth_place}
                onChange={(e) => handleInputChange('birth_place', e.target.value)}
              />
            </div>
            <div>
              <Label>Tanggal Lahir</Label>
              <Input
                type="date"
                value={passengerData.birth_date}
                onChange={(e) => handleInputChange('birth_date', e.target.value)}
              />
            </div>
            <div>
              <Label>Kota</Label>
              <Input
                value={passengerData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
              />
            </div>
            <div>
              <Label>No. Paspor</Label>
              <Input
                value={passengerData.passport_number}
                onChange={(e) => handleInputChange('passport_number', e.target.value)}
              />
            </div>
            <div>
              <Label>Masa Berlaku Paspor</Label>
              <Input
                type="date"
                value={passengerData.passport_expiry}
                onChange={(e) => handleInputChange('passport_expiry', e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <Label>Alamat</Label>
            <Textarea
              value={passengerData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              rows={2}
            />
          </div>
          
          <div>
            <Label>Catatan</Label>
            <Textarea
              value={passengerData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Catatan khusus (opsional)"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/agent')}
            >
              Batal
            </Button>
            <Button 
              onClick={() => registerMutation.mutate()}
              disabled={!isFormValid || registerMutation.isPending}
            >
              {registerMutation.isPending ? 'Menyimpan...' : 'Daftarkan Jamaah'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
