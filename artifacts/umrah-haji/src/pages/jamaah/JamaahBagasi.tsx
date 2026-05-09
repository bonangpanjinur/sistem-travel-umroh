import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft, Luggage, CheckCircle2, Clock, AlertCircle, Package,
  Plane, MapPin, Info, Calculator, Scale, AlertTriangle
} from "lucide-react";
import { Link } from "react-router-dom";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";

const MAX_BAGASI_KG = 32;
const MAX_KABIN_KG  = 7;
const CHARGE_PER_KG = 150000;

const ITEM_PRESETS = [
  { name: "Koper Besar", weight: 20 },
  { name: "Koper Kecil", weight: 10 },
  { name: "Baju (1 set)", weight: 0.5 },
  { name: "Sandal Jepit", weight: 0.4 },
  { name: "Mukena/Sajadah", weight: 1 },
  { name: "Al-Quran", weight: 0.8 },
  { name: "Handuk", weight: 0.5 },
  { name: "Air Mineral (1.5L)", weight: 1.5 },
];

interface BagasiItem {
  id: string;
  name: string;
  weight: number;
}

interface BagasiStep {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: "done" | "active" | "pending";
  time?: string;
  location?: string;
}

function deriveSteps(booking: any): BagasiStep[] {
  const status      = booking?.booking_status ?? "pending";
  const payDone     = booking?.payment_status === "paid";
  const isConfirmed = status === "confirmed" || status === "completed";
  const isCompleted = status === "completed";

  return [
    {
      id: "registered",
      label: "Pendaftaran Bagasi",
      description: "Data bagasi calon jamaah tercatat di sistem",
      icon: <Package className="h-4 w-4" />,
      status: payDone ? "done" : "active",
      time: payDone ? "Otomatis saat booking dikonfirmasi" : undefined,
    },
    {
      id: "label_printed",
      label: "Label Bagasi Dicetak",
      description: "Label nama & tujuan ditempel oleh petugas",
      icon: <CheckCircle2 className="h-4 w-4" />,
      status: isConfirmed ? "done" : payDone ? "active" : "pending",
      location: "Kantor Vinstour",
    },
    {
      id: "airport_check",
      label: "Drop-off di Bandara",
      description: "Bagasi diserahkan di konter check-in maskapai",
      icon: <Luggage className="h-4 w-4" />,
      status: isConfirmed ? "done" : "pending",
      location: `Bandara Keberangkatan · Counter ${booking?.departure?.flight_number?.slice(0, 2) ?? ""}`,
    },
    {
      id: "in_flight",
      label: "Dalam Penerbangan",
      description: "Bagasi berada di bagasi pesawat",
      icon: <Plane className="h-4 w-4" />,
      status: isCompleted ? "done" : isConfirmed ? "active" : "pending",
      location: "Bagasi pesawat",
    },
    {
      id: "arrived",
      label: "Tiba di Tujuan",
      description: "Bagasi tiba & dapat diambil di carousel",
      icon: <MapPin className="h-4 w-4" />,
      status: isCompleted ? "done" : "pending",
      location: "Bandara King Abdulaziz / Madinah",
    },
  ];
}

function formatCurrencyIDR(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export default function JamaahBagasi() {
  const { user } = useAuth();
  const [items, setItems]       = useState<BagasiItem[]>([]);
  const [newName, setNewName]   = useState("");
  const [newWeight, setNewWeight] = useState("");

  const { data: customer } = useQuery({
    queryKey: ["jamaah-customer", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("customers").select("*").eq("user_id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: booking, isLoading } = useQuery({
    queryKey: ["jamaah-bagasi-booking", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return null;
      const { data } = await supabase
        .from("bookings")
        .select(`*, departure:departures(*, package:packages(*), airline:airlines(name))`)
        .eq("customer_id", customer.id)
        .in("booking_status", ["confirmed", "completed", "pending"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!customer?.id,
  });

  const steps      = booking ? deriveSteps(booking) : [];
  const doneCount  = steps.filter(s => s.status === "done").length;
  const activeStep = steps.find(s => s.status === "active");
  const departure  = (booking?.departure as any);
  const pkg        = departure?.package;

  const totalWeight  = items.reduce((s, i) => s + i.weight, 0);
  const overweight   = Math.max(0, totalWeight - MAX_BAGASI_KG);
  const extraCharge  = overweight * CHARGE_PER_KG;
  const usagePct     = Math.min(100, (totalWeight / MAX_BAGASI_KG) * 100);

  const addItem = (name: string, weight: number) => {
    if (!name || weight <= 0) return;
    setItems(prev => [...prev, { id: Date.now().toString(), name, weight }]);
    setNewName(""); setNewWeight("");
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/jamaah" className="p-1 -ml-1 rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Luggage className="h-4 w-4 text-primary" />
              <span className="font-semibold text-gray-900">Bagasi</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Status & kalkulator bagasi Anda</p>
          </div>
          {booking && (
            <Badge variant="outline" className="text-xs">{doneCount}/{steps.length} Tahap</Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="status" className="px-4 pt-4 max-w-lg mx-auto">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="status" className="flex-1">
            <Luggage className="h-4 w-4 mr-1.5" />Status Bagasi
          </TabsTrigger>
          <TabsTrigger value="kalkulator" className="flex-1">
            <Calculator className="h-4 w-4 mr-1.5" />Kalkulator
          </TabsTrigger>
        </TabsList>

        {/* ── STATUS TAB ── */}
        <TabsContent value="status" className="space-y-4">
          {isLoading ? (
            <div className="space-y-3"><Skeleton className="h-40" /><Skeleton className="h-64" /></div>
          ) : !booking ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Luggage className="h-14 w-14 mx-auto text-muted-foreground mb-4 opacity-40" />
                <p className="font-semibold text-gray-700">Belum Ada Booking Aktif</p>
                <p className="text-sm text-muted-foreground mt-1">Status bagasi tersedia setelah booking terdaftar</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="overflow-hidden">
                <div className="bg-primary px-4 py-3 text-white">
                  <p className="font-semibold">{pkg?.name || "Paket Umroh"}</p>
                  <p className="text-sm opacity-80 font-mono">{booking.booking_code}</p>
                </div>
                <CardContent className="py-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <p className="text-2xl font-bold text-blue-700">{MAX_BAGASI_KG}</p>
                      <p className="text-xs text-blue-600 mt-0.5">kg Maks Bagasi</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-xl">
                      <p className="text-2xl font-bold text-amber-700">7</p>
                      <p className="text-xs text-amber-600 mt-0.5">kg Kabin</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-xl">
                      <p className="text-2xl font-bold text-green-700">{booking.total_pax}</p>
                      <p className="text-xs text-green-600 mt-0.5">Jamaah</p>
                    </div>
                  </div>
                  {activeStep && (
                    <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-2">
                      <Clock className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-primary">Status Saat Ini</p>
                        <p className="text-sm text-gray-700">{activeStep.label}</p>
                        <p className="text-xs text-muted-foreground">{activeStep.description}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Alur Status Bagasi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <div className="absolute left-[17px] top-4 bottom-4 w-0.5 bg-gray-200" />
                    <div className="space-y-4">
                      {steps.map((step) => (
                        <div key={step.id} className="flex gap-3 relative">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 ${
                            step.status === "done"   ? "bg-green-100 border-green-400 text-green-600" :
                            step.status === "active" ? "bg-primary/10 border-primary text-primary animate-pulse" :
                            "bg-gray-100 border-gray-300 text-gray-400"
                          }`}>
                            {step.status === "done" ? <CheckCircle2 className="h-4 w-4" /> : step.icon}
                          </div>
                          <div className="flex-1 pb-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`text-sm font-semibold ${
                                step.status === "done"   ? "text-gray-800" :
                                step.status === "active" ? "text-primary" : "text-gray-400"
                              }`}>{step.label}</p>
                              <Badge variant="outline" className={`text-[10px] py-0 ${
                                step.status === "done"   ? "border-green-300 text-green-600 bg-green-50" :
                                step.status === "active" ? "border-primary text-primary bg-primary/5" :
                                "text-gray-400"
                              }`}>
                                {step.status === "done" ? "Selesai" : step.status === "active" ? "Proses" : "Menunggu"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{step.description}</p>
                            {step.location && (
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="h-2.5 w-2.5" />{step.location}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          <Card className="bg-amber-50 border-amber-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-amber-800 flex items-center gap-2">
                <Info className="h-4 w-4" /> Aturan Bagasi Penting
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-amber-800 space-y-2">
              {[
                "Berat bagasi terdaftar maks 32 kg, kabin 7 kg",
                "Dilarang membawa benda tajam, bahan cair >100ml di kabin",
                "Beri tanda pengenal (nama, no. HP) di bagasi",
                "Tambahan berat bagasi bisa diatur via admin (+biaya)",
                "Air Zam-zam 5 liter akan dikirim terpisah via kargo jamaah",
              ].map((rule, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-amber-600 font-bold flex-shrink-0">{i + 1}.</span>
                  <p>{rule}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── KALKULATOR TAB ── */}
        <TabsContent value="kalkulator" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">Total Berat</p>
                <p className={`text-lg font-bold ${totalWeight > MAX_BAGASI_KG ? "text-red-600" : totalWeight > MAX_BAGASI_KG * 0.8 ? "text-amber-600" : "text-green-600"}`}>
                  {totalWeight.toFixed(1)} kg / {MAX_BAGASI_KG} kg
                </p>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden mb-1">
                <div className={`h-full rounded-full transition-all ${
                  usagePct > 100 ? "bg-red-500" : usagePct > 80 ? "bg-amber-500" : "bg-green-500"
                }`} style={{ width: `${Math.min(100, usagePct)}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 kg</span>
                <span>{MAX_BAGASI_KG} kg (maks)</span>
              </div>

              {overweight > 0 && (
                <Alert className="mt-3 border-red-300 bg-red-50 py-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800 text-xs">
                    Kelebihan <strong>{overweight.toFixed(1)} kg</strong>! Estimasi biaya tambahan: <strong>{formatCurrencyIDR(extraCharge)}</strong> ({formatCurrencyIDR(CHARGE_PER_KG)}/kg).
                  </AlertDescription>
                </Alert>
              )}
              {totalWeight > 0 && overweight === 0 && (
                <Alert className="mt-3 border-green-300 bg-green-50 py-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 text-xs">
                    Sisa kuota: <strong>{(MAX_BAGASI_KG - totalWeight).toFixed(1)} kg</strong> — masih dalam batas aman!
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Preset Barang Umum</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {ITEM_PRESETS.map(p => (
                  <Button key={p.name} variant="outline" size="sm" className="h-auto py-2 px-3 text-xs justify-start"
                    onClick={() => addItem(p.name, p.weight)}>
                    <span className="font-medium mr-1">{p.name}</span>
                    <span className="text-muted-foreground">({p.weight} kg)</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Tambah Barang Manual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input className="flex-1" placeholder="Nama barang" value={newName} onChange={e => setNewName(e.target.value)} />
                <Input className="w-24" type="number" step="0.1" min="0" placeholder="kg" value={newWeight} onChange={e => setNewWeight(e.target.value)} />
                <Button size="sm" onClick={() => addItem(newName, parseFloat(newWeight))} disabled={!newName || !newWeight || parseFloat(newWeight) <= 0}>
                  Tambah
                </Button>
              </div>
            </CardContent>
          </Card>

          {items.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Daftar Barang ({items.length})</CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs text-red-500 h-7" onClick={() => setItems([])}>Hapus Semua</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                {items.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-1.5 px-2 bg-muted/40 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Scale className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-primary">{item.weight} kg</span>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400" onClick={() => removeItem(item.id)}>×</Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="text-xs text-center text-muted-foreground pb-4">
            Tarif kelebihan bagasi: {formatCurrencyIDR(CHARGE_PER_KG)}/kg · Batas kabin: {MAX_KABIN_KG} kg
          </div>
        </TabsContent>
      </Tabs>

      <JamaahBottomNav />
    </div>
  );
}
