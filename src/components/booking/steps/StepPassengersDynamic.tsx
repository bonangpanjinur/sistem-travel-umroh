import { DynamicPassengerData } from "@/hooks/useBookingWizardDynamic";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, BedDouble, Info } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RoomType } from "@/types/database";

interface StepPassengersDynamicProps {
  passengers: DynamicPassengerData[];
  onUpdate: (passengers: DynamicPassengerData[]) => void;
}

const ROOM_LABELS: Record<RoomType, string> = {
  quad: 'Quad',
  triple: 'Triple',
  double: 'Double',
  single: 'Single',
};

const ROOM_COLORS: Record<RoomType, string> = {
  quad: 'bg-blue-100 text-blue-800',
  triple: 'bg-green-100 text-green-800',
  double: 'bg-purple-100 text-purple-800',
  single: 'bg-orange-100 text-orange-800',
};

export function StepPassengersDynamic({ passengers, onUpdate }: StepPassengersDynamicProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const updatePassenger = (id: string, field: keyof DynamicPassengerData, value: string) => {
    const updated = passengers.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    );
    onUpdate(updated);
  };

  // Group passengers by room type for display
  const groupedPassengers = passengers.reduce((acc, passenger, index) => {
    const roomType = passenger.roomType;
    if (!acc[roomType]) {
      acc[roomType] = [];
    }
    acc[roomType].push({ ...passenger, originalIndex: index });
    return acc;
  }, {} as Record<RoomType, (DynamicPassengerData & { originalIndex: number })[]>);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Data Jamaah</h3>
        <p className="text-sm text-muted-foreground">
          Lengkapi nama dan data jamaah. Data detail seperti passport dan KTP dapat dilengkapi setelah pembayaran.
        </p>
      </div>

      {!user && (
        <Alert className="bg-primary/5 border-primary/20">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary font-semibold">Hemat Waktu!</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span className="text-sm">
              Login atau daftar untuk mengisi data Anda secara otomatis dan simpan untuk pemesanan selanjutnya.
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-primary text-primary hover:bg-primary hover:text-white shrink-0"
              onClick={() => navigate(`/auth/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
            >
              Login Sekarang
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Grouped by Room Type */}
      {(Object.keys(groupedPassengers) as RoomType[]).map((roomType) => (
        <div key={roomType} className="space-y-3">
          <div className="flex items-center gap-2">
            <BedDouble className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Kamar {ROOM_LABELS[roomType]}</span>
            <Badge variant="secondary" className={ROOM_COLORS[roomType]}>
              {groupedPassengers[roomType].length} orang
            </Badge>
          </div>

          <div className="space-y-3 pl-6 border-l-2 border-muted">
            {groupedPassengers[roomType].map((passenger, idx) => (
              <Card key={passenger.id} className="border-muted">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-3 w-3 text-primary" />
                    </div>
                    <span className="font-medium text-sm">
                      Jamaah {idx + 1}
                      {passenger.originalIndex === 0 && (
                        <Badge variant="outline" className="ml-2 text-xs">Pemesan Utama</Badge>
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
                    {/* Full Name */}
                    <div className="space-y-1.5 col-span-1 sm:col-span-2">
                      <Label htmlFor={`name-${passenger.id}`} className="text-sm">
                        Nama Lengkap <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id={`name-${passenger.id}`}
                        placeholder="Sesuai KTP/Passport"
                        value={passenger.fullName}
                        onChange={(e) => updatePassenger(passenger.id, 'fullName', e.target.value)}
                        className="text-base"
                      />
                    </div>

                    {/* Gender */}
                    <div className="space-y-1.5 col-span-1">
                      <Label htmlFor={`gender-${passenger.id}`} className="text-sm">
                        Jenis Kelamin
                      </Label>
                      <Select
                        value={passenger.gender}
                        onValueChange={(val) => updatePassenger(passenger.id, 'gender', val)}
                      >
                        <SelectTrigger id={`gender-${passenger.id}`} className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Laki-laki</SelectItem>
                          <SelectItem value="female">Perempuan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Phone (optional) */}
                    <div className="space-y-1.5 col-span-1">
                      <Label htmlFor={`phone-${passenger.id}`} className="text-sm">
                        No. HP <span className="text-muted-foreground text-xs">(opsional)</span>
                      </Label>
                      <Input
                        id={`phone-${passenger.id}`}
                        placeholder="08xxxxxxxxxx"
                        value={passenger.phone}
                        onChange={(e) => updatePassenger(passenger.id, 'phone', e.target.value)}
                        className="text-base"
                      />
                    </div>

                    {/* Passenger Type */}
                    <div className="space-y-1.5 col-span-1 sm:col-span-2">
                      <Label htmlFor={`type-${passenger.id}`} className="text-sm">
                        Tipe Jamaah
                      </Label>
                      <Select
                        value={passenger.passengerType}
                        onValueChange={(val) => updatePassenger(passenger.id, 'passengerType', val)}
                      >
                        <SelectTrigger id={`type-${passenger.id}`} className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="adult">Dewasa</SelectItem>
                          <SelectItem value="child">Anak-anak</SelectItem>
                          <SelectItem value="infant">Bayi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
