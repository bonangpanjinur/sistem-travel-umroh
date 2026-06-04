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
import { UserPlus, Package, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { RoomType, GenderType } from "@/types/database";

interface DuplicateErrors {
  nik?: string;
  email?: string;
  phone?: string;
}

interface CheckingState {
  nik: boolean;
  email: boolean;
  phone: boolean;
}

export default function AgentRegister() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState("");
  const [selectedDeparture, setSelectedDeparture] = useState("");
  const [roomType, setRoomType] = useState<RoomType>("quad");
  const [duplicateErrors, setDuplicateErrors] = useState<DuplicateErrors>({});
  const [checking, setChecking] = useState<CheckingState>({ nik: false, email: false, phone: false });

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
      case 'quad':   return selectedDepartureData.price_quad   || 0;
      default:       return selectedDepartureData.price_quad   || 0;
    }
  };

  // ─── Fungsi pengecekan duplikat ─────────────────────────────────────────────

  const checkDuplicate = async (field: 'nik' | 'email' | 'phone', value: string) => {
    if (!value.trim()) {
      setDuplicateErrors(prev => ({ ...prev, [field]: undefined }));
      return;
    }

    setChecking(prev => ({ ...prev, [field]: true }));
    setDuplicateErrors(prev => ({ ...prev, [field]: undefined }));

    try {
      const columnMap: Record<string, string> = {
        nik:   'nik',
        email: 'email',
        phone: 'phone',
      };
      const { data, error } = await supabase
        .from('customers')
        .select('id')
        .eq(columnMap[field], value.trim())
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const labels: Record<string, string> = {
          nik:   'NIK',
          email: 'Email',
          phone: 'Nomor telepon',
        };
        setDuplicateErrors(prev => ({
          ...prev,
          [field]: `${labels[field]} ini sudah terdaftar di sistem.`,
        }));
      }
    } catch {
      // Tidak tampilkan error jaringan sebagai duplikat
    } finally {
      setChecking(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setPassengerData(prev => ({ ...prev, [field]: value }));
    // Hapus error duplikat saat user mulai mengedit
    if (field === 'nik' || field === 'email' || field === 'phone') {
      setDuplicateErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const hasDuplicateError = !!(duplicateErrors.nik || duplicateErrors.email || duplicateErrors.phone);
  const isChecking = checking.nik || checking.email || checking.phone;

  // ─── Submit ──────────────────────────────────────────────────────────────────

  const registerMutation = useMutation({
    mutationFn: async () => {
      // Validasi duplikat sebelum kirim ke server
      const checks: Promise<void>[] = [];
      if (passengerData.nik)   checks.push(checkDuplicate('nik',   passengerData.nik));
      if (passengerData.email) checks.push(checkDuplicate('email', passengerData.email));
      if (passengerData.phone) checks.push(checkDuplicate('phone', passengerData.phone));
      await Promise.all(checks);

      // Cek apakah ada error duplikat setelah pengecekan selesai
      const { data: nikCheck } = passengerData.nik
        ? await supabase.from('customers').select('id').eq('nik', passengerData.nik).maybeSingle()
        : { data: null };
      const { data: emailCheck } = passengerData.email
        ? await supabase.from('customers').select('id').eq('email', passengerData.email).maybeSingle()
        : { data: null };
      const { data: phoneCheck } = await supabase
        .from('customers').select('id').eq('phone', passengerData.phone).maybeSingle();

      const newErrors: DuplicateErrors = {};
      if (nikCheck)   newErrors.nik   = 'NIK ini sudah terdaftar di sistem.';
      if (emailCheck) newErrors.email = 'Email ini sudah terdaftar di sistem.';
      if (phoneCheck) newErrors.phone = 'Nomor telepon ini sudah terdaftar di sistem.';

      if (Object.keys(newErrors).length > 0) {
        setDuplicateErrors(newErrors);
        throw new Error('Data jamaah sudah terdaftar. Periksa NIK, email, atau nomor telepon.');
      }

      // 1. Buat customer
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          full_name:       passengerData.full_name,
          email:           passengerData.email || null,
          phone:           passengerData.phone,
          nik:             passengerData.nik    || null,
          gender:          passengerData.gender as GenderType,
          birth_date:      passengerData.birth_date    || null,
          birth_place:     passengerData.birth_place   || null,
          address:         passengerData.address       || null,
          city:            passengerData.city          || null,
          province:        passengerData.province      || null,
          passport_number: passengerData.passport_number || null,
          passport_expiry: passengerData.passport_expiry || null,
        })
        .select()
        .single();

      if (customerError) throw customerError;

      // 2. Generate kode booking
      const bookingCode = (await supabase.rpc('generate_booking_code', {
        _package_code:    selectedPackageData?.code || '',
        _departure_date:  selectedDepartureData?.departure_date || new Date().toISOString().split('T')[0],
      })).data || `TRA${Date.now().toString(36).toUpperCase()}`;

      const price = getPrice();

      // 3. Buat booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          booking_code:  bookingCode,
          customer_id:   customer.id,
          departure_id:  selectedDeparture,
          agent_id:      agentData?.id,
          room_type:     roomType,
          total_pax:     1,
          adult_count:   1,
          base_price:    price,
          total_price:   price,
          notes:         passengerData.notes,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // 4. Buat booking passenger
      const { error: passengerError } = await supabase
        .from('booking_passengers')
        .insert({
          booking_id:        booking.id,
          customer_id:       customer.id,
          is_main_passenger: true,
          room_preference:   roomType,
        });

      if (passengerError) throw passengerError;

      // 5. Buat record komisi agen
      const commissionAmount = price * (Number(agentData?.commission_rate || 5) / 100);
      const { error: commissionError } = await supabase
        .from('agent_commissions')
        .insert({
          agent_id:          agentData!.id,
          booking_id:        booking.id,
          commission_amount: commissionAmount,
          status:            'pending',
        } as any);

      if (commissionError) throw commissionError;

      return booking;
    },
    onSuccess: (booking) => {
      toast.success(`Jamaah berhasil didaftarkan! Kode: ${booking.booking_code}`);
      navigate('/agent');
    },
    onError: (error: Error) => {
      console.error('Registration error:', error);
      if (!error.message.includes('sudah terdaftar')) {
        toast.error("Gagal mendaftarkan jamaah. " + (error.message || ''));
      }
    },
  });

  const isFormValid =
    passengerData.full_name &&
    passengerData.phone &&
    passengerData.gender &&
    selectedPackage &&
    selectedDeparture &&
    !hasDuplicateError &&
    !isChecking;

  // ─── Helper komponen field ───────────────────────────────────────────────────

  const FieldStatus = ({ field }: { field: 'nik' | 'email' | 'phone' }) => {
    if (checking[field]) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />;
    if (duplicateErrors[field]) return <AlertCircle className="h-4 w-4 text-destructive absolute right-3 top-1/2 -translate-y-1/2" />;
    const val = passengerData[field];
    if (val && !duplicateErrors[field] && !checking[field]) return <CheckCircle2 className="h-4 w-4 text-green-500 absolute right-3 top-1/2 -translate-y-1/2" />;
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Daftarkan Jamaah</h1>
        <p className="text-muted-foreground">Daftarkan jamaah baru melalui referral Anda</p>
      </div>

      {/* Peringatan duplikat global */}
      {hasDuplicateError && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Data jamaah sudah terdaftar</p>
            <ul className="list-disc pl-4 space-y-0.5">
              {duplicateErrors.nik   && <li>{duplicateErrors.nik}</li>}
              {duplicateErrors.email && <li>{duplicateErrors.email}</li>}
              {duplicateErrors.phone && <li>{duplicateErrors.phone}</li>}
            </ul>
            <p className="mt-2 text-destructive/80">Periksa apakah jamaah ini sudah pernah didaftarkan sebelumnya.</p>
          </div>
        </div>
      )}

      {/* Pilih Paket & Keberangkatan */}
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
                        ({dep.quota - (dep.booked_count ?? 0)} seat)
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

      {/* Data Jamaah */}
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

            {/* No. HP — cek duplikat onBlur */}
            <div>
              <Label>No. HP *</Label>
              <div className="relative">
                <Input
                  value={passengerData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  onBlur={(e) => checkDuplicate('phone', e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className={duplicateErrors.phone ? 'border-destructive pr-10' : 'pr-10'}
                />
                <FieldStatus field="phone" />
              </div>
              {duplicateErrors.phone && (
                <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {duplicateErrors.phone}
                </p>
              )}
            </div>

            {/* Email — cek duplikat onBlur */}
            <div>
              <Label>Email</Label>
              <div className="relative">
                <Input
                  type="email"
                  value={passengerData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  onBlur={(e) => e.target.value && checkDuplicate('email', e.target.value)}
                  className={duplicateErrors.email ? 'border-destructive pr-10' : 'pr-10'}
                />
                <FieldStatus field="email" />
              </div>
              {duplicateErrors.email && (
                <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {duplicateErrors.email}
                </p>
              )}
            </div>

            {/* NIK — cek duplikat onBlur, hanya jika 16 digit */}
            <div>
              <Label>NIK</Label>
              <div className="relative">
                <Input
                  value={passengerData.nik}
                  onChange={(e) => handleInputChange('nik', e.target.value)}
                  onBlur={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length === 16) checkDuplicate('nik', val);
                  }}
                  maxLength={16}
                  placeholder="16 digit NIK"
                  className={duplicateErrors.nik ? 'border-destructive pr-10' : 'pr-10'}
                />
                <FieldStatus field="nik" />
              </div>
              {duplicateErrors.nik && (
                <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {duplicateErrors.nik}
                </p>
              )}
              {passengerData.nik && passengerData.nik.length < 16 && !duplicateErrors.nik && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {passengerData.nik.length}/16 digit
                </p>
              )}
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
            <Button variant="outline" onClick={() => navigate('/agent')}>
              Batal
            </Button>
            <Button
              onClick={() => registerMutation.mutate()}
              disabled={!isFormValid || registerMutation.isPending || isChecking}
            >
              {registerMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
              ) : isChecking ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memvalidasi...</>
              ) : (
                'Daftarkan Jamaah'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
