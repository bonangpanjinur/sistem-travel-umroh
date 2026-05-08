import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Luggage, CheckCircle2, Clock, AlertCircle, Package, Plane, MapPin, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";

interface BagasiStep {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: "done" | "active" | "pending";
  time?: string;
  location?: string;
}

const MAX_BAGASI_KG = 32;

function deriveSteps(booking: any): BagasiStep[] {
  const status = booking?.booking_status ?? "pending";
  const payDone = booking?.payment_status === "paid";
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

export default function JamaahBagasi() {
  const { user } = useAuth();

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

  const steps = booking ? deriveSteps(booking) : [];
  const doneCount = steps.filter(s => s.status === "done").length;
  const activeStep = steps.find(s => s.status === "active");
  const departure = (booking?.departure as any);
  const pkg = departure?.package;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/jamaah" className="p-1 -ml-1 rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Luggage className="h-4 w-4 text-primary" />
              <span className="font-semibold text-gray-900">Status Bagasi</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Pelacakan bagasi perjalanan Anda</p>
          </div>
          {booking && (
            <Badge variant="outline" className="text-xs">
              {doneCount}/{steps.length} Tahap
            </Badge>
          )}
        </div>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
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
            {/* Summary Card */}
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

            {/* Tracking Timeline */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Alur Status Bagasi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div className="absolute left-[17px] top-4 bottom-4 w-0.5 bg-gray-200" />
                  <div className="space-y-4">
                    {steps.map((step, idx) => (
                      <div key={step.id} className="flex gap-3 relative">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 ${
                          step.status === "done"
                            ? "bg-green-100 border-green-400 text-green-600"
                            : step.status === "active"
                            ? "bg-primary/10 border-primary text-primary animate-pulse"
                            : "bg-gray-100 border-gray-300 text-gray-400"
                        }`}>
                          {step.status === "done" ? <CheckCircle2 className="h-4 w-4" /> : step.icon}
                        </div>
                        <div className="flex-1 pb-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm font-semibold ${
                              step.status === "done" ? "text-gray-800" :
                              step.status === "active" ? "text-primary" : "text-gray-400"
                            }`}>{step.label}</p>
                            <Badge
                              variant="outline"
                              className={`text-[10px] py-0 ${
                                step.status === "done" ? "border-green-300 text-green-600 bg-green-50" :
                                step.status === "active" ? "border-primary text-primary bg-primary/5" :
                                "text-gray-400"
                              }`}
                            >
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

            {/* Peraturan Bagasi */}
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
          </>
        )}
      </div>

      <JamaahBottomNav />
    </div>
  );
}
