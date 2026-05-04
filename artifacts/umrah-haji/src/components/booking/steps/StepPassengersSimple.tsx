import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { SimplePassengerData } from "@/hooks/useBookingWizardSimple";
import { Plus, Trash2, User, Info } from "lucide-react";

interface StepPassengersSimpleProps {
  passengers: SimplePassengerData[];
  onUpdate: (passengers: SimplePassengerData[]) => void;
}

export function StepPassengersSimple({ passengers, onUpdate }: StepPassengersSimpleProps) {
  const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addPassenger = () => {
    onUpdate([
      ...passengers,
      {
        id: generateTempId(),
        fullName: '',
        gender: 'male',
        phone: '',
        passengerType: 'adult',
      },
    ]);
  };

  const removePassenger = (id: string) => {
    if (passengers.length > 1) {
      onUpdate(passengers.filter(p => p.id !== id));
    }
  };

  const updatePassenger = (id: string, field: keyof SimplePassengerData, value: string) => {
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
            Masukkan data dasar jamaah. Data lengkap (paspor, KTP, dll) dapat dilengkapi setelah pembayaran.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={addPassenger}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah
        </Button>
      </div>

      {/* Info Box */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
        <Info className="h-5 w-5 text-blue-600 mt-0.5" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-medium">Pendaftaran Cepat</p>
          <p>Cukup isi nama dan nomor HP. Data lengkap seperti NIK, paspor, dan dokumen bisa dilengkapi nanti setelah pembayaran dikonfirmasi.</p>
        </div>
      </div>

      <div className="space-y-3">
        {passengers.map((passenger, index) => (
          <Card key={passenger.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <span className="font-medium">Jamaah {index + 1}</span>
                  {index === 0 && (
                    <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      Penanggung Jawab
                    </span>
                  )}
                </div>
                {index > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive h-8 w-8 p-0"
                    onClick={() => removePassenger(passenger.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="sm:col-span-2">
                  <Label htmlFor={`name-${passenger.id}`}>Nama Lengkap *</Label>
                  <Input
                    id={`name-${passenger.id}`}
                    value={passenger.fullName}
                    onChange={e => updatePassenger(passenger.id, 'fullName', e.target.value)}
                    placeholder="Nama sesuai KTP"
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
                  <Label htmlFor={`phone-${passenger.id}`}>No. HP</Label>
                  <Input
                    id={`phone-${passenger.id}`}
                    value={passenger.phone}
                    onChange={e => updatePassenger(passenger.id, 'phone', e.target.value)}
                    placeholder="08xxx"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <div className="text-sm text-muted-foreground text-right">
        Total: <span className="font-semibold text-foreground">{passengers.length}</span> jamaah
      </div>
    </div>
  );
}
