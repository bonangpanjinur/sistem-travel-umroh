import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PassengerData } from "@/hooks/useBookingWizard";
import { Plus, Trash2, User } from "lucide-react";

interface StepPassengersProps {
  passengers: PassengerData[];
  onUpdate: (passengers: PassengerData[]) => void;
}

export function StepPassengers({ passengers, onUpdate }: StepPassengersProps) {
  const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addPassenger = () => {
    onUpdate([
      ...passengers,
      {
        id: generateTempId(),
        fullName: '',
        nik: '',
        passportNumber: '',
        passportExpiry: '',
        birthPlace: '',
        birthDate: '',
        gender: 'male',
        phone: '',
        email: '',
        passengerType: 'adult',
      },
    ]);
  };

  const removePassenger = (id: string) => {
    if (passengers.length > 1) {
      onUpdate(passengers.filter(p => p.id !== id));
    }
  };

  const updatePassenger = (id: string, field: keyof PassengerData, value: string) => {
    onUpdate(
      passengers.map(p => 
        p.id === id ? { ...p, [field]: value } : p
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Data Jamaah</h3>
          <p className="text-sm text-muted-foreground">
            Masukkan data lengkap setiap jamaah sesuai KTP/Paspor
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={addPassenger}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Jamaah
        </Button>
      </div>

      <div className="space-y-4">
        {passengers.map((passenger, index) => (
          <Card key={passenger.id}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Jamaah {index + 1}
                  {index === 0 && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      Penanggung Jawab
                    </span>
                  )}
                </CardTitle>
                {index > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removePassenger(passenger.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor={`name-${passenger.id}`}>Nama Lengkap (sesuai KTP/Paspor)</Label>
                <Input
                  id={`name-${passenger.id}`}
                  value={passenger.fullName}
                  onChange={e => updatePassenger(passenger.id, 'fullName', e.target.value)}
                  placeholder="Masukkan nama lengkap"
                />
              </div>

              <div>
                <Label htmlFor={`nik-${passenger.id}`}>NIK (KTP)</Label>
                <Input
                  id={`nik-${passenger.id}`}
                  value={passenger.nik}
                  onChange={e => updatePassenger(passenger.id, 'nik', e.target.value)}
                  placeholder="16 digit NIK"
                  maxLength={16}
                />
              </div>

              <div>
                <Label htmlFor={`passport-${passenger.id}`}>No. Paspor</Label>
                <Input
                  id={`passport-${passenger.id}`}
                  value={passenger.passportNumber}
                  onChange={e => updatePassenger(passenger.id, 'passportNumber', e.target.value)}
                  placeholder="Nomor paspor"
                />
              </div>

              <div>
                <Label htmlFor={`birthPlace-${passenger.id}`}>Tempat Lahir</Label>
                <Input
                  id={`birthPlace-${passenger.id}`}
                  value={passenger.birthPlace}
                  onChange={e => updatePassenger(passenger.id, 'birthPlace', e.target.value)}
                  placeholder="Kota kelahiran"
                />
              </div>

              <div>
                <Label htmlFor={`birthDate-${passenger.id}`}>Tanggal Lahir</Label>
                <Input
                  id={`birthDate-${passenger.id}`}
                  type="date"
                  value={passenger.birthDate}
                  onChange={e => updatePassenger(passenger.id, 'birthDate', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor={`gender-${passenger.id}`}>Jenis Kelamin</Label>
                <Select
                  value={passenger.gender}
                  onValueChange={val => updatePassenger(passenger.id, 'gender', val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Laki-laki</SelectItem>
                    <SelectItem value="female">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor={`type-${passenger.id}`}>Tipe Jamaah</Label>
                <Select
                  value={passenger.passengerType}
                  onValueChange={val => updatePassenger(passenger.id, 'passengerType', val)}
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
                <Label htmlFor={`phone-${passenger.id}`}>No. HP</Label>
                <Input
                  id={`phone-${passenger.id}`}
                  value={passenger.phone}
                  onChange={e => updatePassenger(passenger.id, 'phone', e.target.value)}
                  placeholder="08xxxxxxxxxx"
                />
              </div>

              <div>
                <Label htmlFor={`email-${passenger.id}`}>Email</Label>
                <Input
                  id={`email-${passenger.id}`}
                  type="email"
                  value={passenger.email}
                  onChange={e => updatePassenger(passenger.id, 'email', e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
