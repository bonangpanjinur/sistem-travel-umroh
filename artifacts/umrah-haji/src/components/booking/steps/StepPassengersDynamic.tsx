import { DynamicPassengerData } from "@/hooks/useBookingWizardDynamic";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, BedDouble, Plus, Trash2, UserCheck, Baby, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RoomType } from "@/types/database";
import { formatCurrency } from "@/lib/format";

interface StepPassengersDynamicProps {
  passengers: DynamicPassengerData[];
  onUpdate: (passengers: DynamicPassengerData[]) => void;
  isHaji?: boolean;
  departurePrices?: {
    price_adult?: number;
    price_child?: number;
    price_infant?: number;
  };
  onAddPassenger?: (type: 'adult' | 'child' | 'infant') => void;
  onRemovePassenger?: (id: string) => void;
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

const PASSENGER_TYPE_CONFIG = {
  adult: {
    label: 'Dewasa',
    icon: UserCheck,
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    headerColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    priceKey: 'price_adult' as const,
  },
  child: {
    label: 'Anak-anak',
    icon: UserRound,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    headerColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    priceKey: 'price_child' as const,
  },
  infant: {
    label: 'Bayi',
    icon: Baby,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    headerColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    priceKey: 'price_infant' as const,
  },
} as const;

export function StepPassengersDynamic({
  passengers,
  onUpdate,
  isHaji = false,
  departurePrices,
  onAddPassenger,
  onRemovePassenger,
}: StepPassengersDynamicProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const updatePassenger = (id: string, field: keyof DynamicPassengerData, value: string) => {
    const updated = passengers.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    );
    onUpdate(updated);
  };

  // ─── MODE HAJI: Daftar per tipe usia ───────────────────────────────────────
  if (isHaji) {
    const byType = {
      adult: passengers.filter(p => p.passengerType === 'adult'),
      child: passengers.filter(p => p.passengerType === 'child'),
      infant: passengers.filter(p => p.passengerType === 'infant'),
    };

    const totalPassengers = passengers.length;

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold">Data Jamaah Haji</h3>
          <p className="text-sm text-muted-foreground">
            Tambahkan jamaah sesuai kategori usia. Harga dihitung per orang berdasarkan tipe jamaah.
          </p>
        </div>

        {totalPassengers === 0 && (
          <Alert>
            <User className="h-4 w-4" />
            <AlertDescription>
              Belum ada jamaah. Tambahkan minimal 1 jamaah dewasa untuk melanjutkan.
            </AlertDescription>
          </Alert>
        )}

        {(['adult', 'child', 'infant'] as const).map((type) => {
          const cfg = PASSENGER_TYPE_CONFIG[type];
          const Icon = cfg.icon;
          const price = departurePrices?.[cfg.priceKey] ?? 0;
          const typePassengers = byType[type];

          return (
            <div key={type} className="space-y-3">
              {/* Section header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${cfg.headerColor}`} />
                  <span className={`font-semibold text-sm ${cfg.headerColor}`}>{cfg.label}</span>
                  <Badge variant="secondary" className={`text-xs ${cfg.color}`}>
                    {typePassengers.length} orang
                  </Badge>
                  {price > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(price)} / orang
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => onAddPassenger?.(type)}
                >
                  <Plus className="h-3 w-3" />
                  Tambah {cfg.label}
                </Button>
              </div>

              {/* Passengers in this type */}
              {typePassengers.length > 0 && (
                <div className={`space-y-3 pl-5 border-l-2 ${cfg.borderColor}`}>
                  {typePassengers.map((passenger, idx) => {
                    const globalIndex = passengers.findIndex(p => p.id === passenger.id);
                    return (
                      <Card key={passenger.id} className="border-muted">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`h-6 w-6 rounded-full flex items-center justify-center bg-muted/60`}>
                                <User className="h-3 w-3" />
                              </div>
                              <span className="font-medium text-sm">
                                {cfg.label} {idx + 1}
                                {globalIndex === 0 && (
                                  <Badge variant="outline" className="ml-2 text-xs">Pemesan Utama</Badge>
                                )}
                              </span>
                            </div>
                            {/* Remove button — jangan hapus pemesan utama */}
                            {globalIndex !== 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => onRemovePassenger?.(passenger.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
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

                            {/* Phone */}
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
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ─── MODE UMROH/WISATA: Dikelompokkan per tipe kamar ────────────────────────
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

                    {/* Phone */}
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
