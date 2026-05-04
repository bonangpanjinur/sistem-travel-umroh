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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { UserPlus, Package, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { RoomType, GenderType } from "@/types/database";

interface Passenger {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  nik: string;
  gender: GenderType | "";
  birth_date: string;
  birth_place: string;
  address: string;
  city: string;
  province: string;
  passport_number: string;
  passport_expiry: string;
  passenger_type: "adult" | "child" | "infant";
}

export default function AgentRegisterGroup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState("");
  const [selectedDeparture, setSelectedDeparture] = useState("");
  const [roomType, setRoomType] = useState<RoomType>("quad");
  const [passengers, setPassengers] = useState<Passenger[]>([
    {
      id: "1",
      full_name: "",
      email: "",
      phone: "",
      nik: "",
      gender: "",
      birth_date: "",
      birth_place: "",
      address: "",
      city: "",
      province: "",
      passport_number: "",
      passport_expiry: "",
      passenger_type: "adult",
    },
  ]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPassengerId, setEditingPassengerId] = useState<string | null>(null);

  const { data: agentData } = useQuery({
    queryKey: ["agent-profile-register", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("id, commission_rate")
        .eq("user_id", user!.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: packages, isLoading: loadingPackages } = useQuery({
    queryKey: ["agent-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("id, name, code");

      if (error) throw error;
      return data;
    },
  });

  const { data: departures, isLoading: loadingDepartures } = useQuery({
    queryKey: ["agent-departures", selectedPackage],
    enabled: !!selectedPackage,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departures")
        .select("id, departure_date, quota, booked_count, status, price_quad, price_triple, price_double, price_single")
        .eq("package_id", selectedPackage)
        .eq("status", "open")
        .gt("quota", 0)
        .order("departure_date", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const selectedPackageData = packages?.find((p) => p.id === selectedPackage);
  const selectedDepartureData = departures?.find((d) => d.id === selectedDeparture);

  const getPrice = () => {
    if (!selectedDepartureData) return 0;
    switch (roomType) {
      case "single":
        return selectedDepartureData.price_single || 0;
      case "double":
        return selectedDepartureData.price_double || 0;
      case "triple":
        return selectedDepartureData.price_triple || 0;
      case "quad":
        return selectedDepartureData.price_quad || 0;
      default:
        return selectedDepartureData.price_quad || 0;
    }
  };

  const adultCount = passengers.filter((p) => p.passenger_type === "adult").length;
  const childCount = passengers.filter((p) => p.passenger_type === "child").length;
  const infantCount = passengers.filter((p) => p.passenger_type === "infant").length;
  const totalPrice = getPrice() * passengers.length;

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (passengers.length === 0) {
        throw new Error("Minimal harus ada 1 jamaah");
      }

      // Get main passenger (first adult)
      const mainPassenger = passengers.find((p) => p.passenger_type === "adult");
      if (!mainPassenger) {
        throw new Error("Minimal harus ada 1 jamaah dewasa");
      }

      // 1. Create main customer
      const { data: mainCustomer, error: customerError } = await supabase
        .from("customers")
        .insert({
          full_name: mainPassenger.full_name,
          email: mainPassenger.email,
          phone: mainPassenger.phone,
          nik: mainPassenger.nik,
          gender: mainPassenger.gender as GenderType,
          birth_date: mainPassenger.birth_date || null,
          birth_place: mainPassenger.birth_place,
          address: mainPassenger.address,
          city: mainPassenger.city,
          province: mainPassenger.province,
          passport_number: mainPassenger.passport_number,
          passport_expiry: mainPassenger.passport_expiry || null,
        })
        .select()
        .single();

      if (customerError) throw customerError;

      // 2. Generate booking code
      const bookingCode = (await supabase.rpc('generate_booking_code', { _package_code: selectedPackageData?.code || '', _departure_date: selectedDepartureData?.departure_date || new Date().toISOString().split('T')[0] })).data || `TRA${Date.now().toString(36).toUpperCase()}`;
      const price = getPrice();

      // 3. Create booking
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          booking_code: bookingCode,
          customer_id: mainCustomer.id,
          departure_id: selectedDeparture,
          agent_id: agentData?.id,
          room_type: roomType,
          total_pax: passengers.length,
          adult_count: adultCount,
          child_count: childCount,
          infant_count: infantCount,
          base_price: price,
          total_price: totalPrice,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // 4. Create booking passengers
      const passengerInserts = passengers.map((p, index) => ({
        booking_id: booking.id,
        customer_id: mainCustomer.id,
        is_main_passenger: index === 0,
        passenger_type: p.passenger_type,
        room_preference: roomType,
      }));

      const { error: passengerError } = await supabase
        .from("booking_passengers")
        .insert(passengerInserts);

      if (passengerError) throw passengerError;

      // 5. Create agent commission record
      const commissionAmount = totalPrice * (Number(agentData?.commission_rate || 5) / 100);

      const { error: commissionError } = await supabase
        .from("agent_commissions")
        .insert({
          agent_id: agentData?.id,
          booking_id: booking.id,
          commission_amount: commissionAmount,
          status: "pending",
        });

      if (commissionError) throw commissionError;

      return booking;
    },
    onSuccess: (booking) => {
      toast.success(`Rombongan berhasil didaftarkan! Kode: ${booking.booking_code}`);
      navigate("/agent");
    },
    onError: (error: any) => {
      console.error("Registration error:", error);
      toast.error(error.message || "Gagal mendaftarkan rombongan");
    },
  });

  const handleAddPassenger = () => {
    const newPassenger: Passenger = {
      id: Date.now().toString(),
      full_name: "",
      email: "",
      phone: "",
      nik: "",
      gender: "",
      birth_date: "",
      birth_place: "",
      address: "",
      city: "",
      province: "",
      passport_number: "",
      passport_expiry: "",
      passenger_type: "adult",
    };
    setPassengers([...passengers, newPassenger]);
  };

  const handleRemovePassenger = (id: string) => {
    if (passengers.length === 1) {
      toast.error("Minimal harus ada 1 jamaah");
      return;
    }
    setPassengers(passengers.filter((p) => p.id !== id));
  };

  const handlePassengerChange = (id: string, field: string, value: string) => {
    setPassengers(
      passengers.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const isFormValid =
    selectedPackage && selectedDeparture && passengers.every((p) => p.full_name && p.phone && p.gender);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Daftarkan Rombongan Jamaah</h1>
        <p className="text-muted-foreground">Daftarkan multiple jamaah dalam satu booking</p>
      </div>

      {/* Package Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Pilih Paket &amp; Keberangkatan
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
                  <p className="text-sm text-muted-foreground">Harga per Jamaah</p>
                  <p className="text-xl font-bold text-primary">
                    Rp {getPrice().toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Passengers Summary */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Jamaah</p>
              <p className="text-2xl font-bold">{passengers.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Dewasa</p>
              <p className="text-2xl font-bold">{adultCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Anak</p>
              <p className="text-2xl font-bold">{childCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Harga</p>
              <p className="text-2xl font-bold text-primary">
                Rp {totalPrice.toLocaleString("id-ID")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Passengers List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Data Jamaah
          </CardTitle>
          <Button size="sm" onClick={handleAddPassenger}>
            <Plus className="h-4 w-4 mr-1" />
            Tambah Jamaah
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {passengers.map((passenger, index) => (
            <div
              key={passenger.id}
              className="p-4 border rounded-lg bg-muted/30 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">
                  Jamaah {index + 1}
                  {index === 0 && <span className="text-xs ml-2 bg-primary text-primary-foreground px-2 py-1 rounded">Penanggung Jawab</span>}
                </h4>
                {passengers.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePassenger(passenger.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="text-xs">Nama Lengkap *</Label>
                  <Input
                    value={passenger.full_name}
                    onChange={(e) =>
                      handlePassengerChange(passenger.id, "full_name", e.target.value)
                    }
                    placeholder="Sesuai KTP/Paspor"
                    size={10}
                  />
                </div>
                <div>
                  <Label className="text-xs">Jenis Kelamin *</Label>
                  <Select
                    value={passenger.gender}
                    onValueChange={(v) =>
                      handlePassengerChange(passenger.id, "gender", v)
                    }
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
                  <Label className="text-xs">Tipe Jamaah *</Label>
                  <Select
                    value={passenger.passenger_type}
                    onValueChange={(v) =>
                      handlePassengerChange(
                        passenger.id,
                        "passenger_type",
                        v as "adult" | "child" | "infant"
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adult">Dewasa</SelectItem>
                      <SelectItem value="child">Anak (2-12 tahun)</SelectItem>
                      <SelectItem value="infant">Bayi (&lt;2 tahun)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">No. HP *</Label>
                  <Input
                    value={passenger.phone}
                    onChange={(e) =>
                      handlePassengerChange(passenger.id, "phone", e.target.value)
                    }
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={passenger.email}
                    onChange={(e) =>
                      handlePassengerChange(passenger.id, "email", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">NIK</Label>
                  <Input
                    value={passenger.nik}
                    onChange={(e) =>
                      handlePassengerChange(passenger.id, "nik", e.target.value)
                    }
                    maxLength={16}
                  />
                </div>
                <div>
                  <Label className="text-xs">Tempat Lahir</Label>
                  <Input
                    value={passenger.birth_place}
                    onChange={(e) =>
                      handlePassengerChange(passenger.id, "birth_place", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Tanggal Lahir</Label>
                  <Input
                    type="date"
                    value={passenger.birth_date}
                    onChange={(e) =>
                      handlePassengerChange(passenger.id, "birth_date", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">No. Paspor</Label>
                  <Input
                    value={passenger.passport_number}
                    onChange={(e) =>
                      handlePassengerChange(passenger.id, "passport_number", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Masa Berlaku Paspor</Label>
                  <Input
                    type="date"
                    value={passenger.passport_expiry}
                    onChange={(e) =>
                      handlePassengerChange(passenger.id, "passport_expiry", e.target.value)
                    }
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Alamat</Label>
                <Textarea
                  value={passenger.address}
                  onChange={(e) =>
                    handlePassengerChange(passenger.id, "address", e.target.value)
                  }
                  rows={2}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate("/agent")}>
          Batal
        </Button>
        <Button
          onClick={() => registerMutation.mutate()}
          disabled={!isFormValid || registerMutation.isPending}
        >
          {registerMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Daftarkan Rombongan
        </Button>
      </div>
    </div>
  );
}
