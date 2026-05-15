import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Plane, Lock, AlertTriangle, ChevronRight, ChevronLeft,
  CheckCircle2, Users, CalendarDays, TrendingDown, TrendingUp,
  BedDouble, Package2, Info, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  savingsPlan: {
    id: string;
    package_id?: string | null;
    paid_amount: number;
    target_amount: number;
    locked_price?: number | null;
  };
}

interface Departure {
  id: string;
  departure_date: string;
  return_date: string | null;
  quota: number;
  booked_count: number;
  available_seats: number | null;
  status: string;
  price_quad: number | null;
  price_triple: number | null;
  price_double: number | null;
  price_single: number | null;
  packages: {
    id: string;
    name: string;
    type: string;
    duration_days: number;
    airline: string | null;
    hotel_makkah: string | null;
    hotel_madinah: string | null;
  } | null;
}

interface PkgOption {
  id: string;
  name: string;
  type: string;
  duration_days: number;
  price: number;
  savings_target: number | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ROOM_TYPES = [
  { value: "quad",   label: "Quad",   desc: "4 orang/kamar", priceKey: "price_quad"   },
  { value: "triple", label: "Triple", desc: "3 orang/kamar", priceKey: "price_triple" },
  { value: "double", label: "Double", desc: "2 orang/kamar", priceKey: "price_double" },
  { value: "single", label: "Single", desc: "1 orang/kamar", priceKey: "price_single" },
] as const;

type RoomType = (typeof ROOM_TYPES)[number]["value"];
type Step = "package" | "departure" | "confirm";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function seatsLeft(dep: Departure) {
  if (dep.available_seats != null) return dep.available_seats;
  return Math.max(0, (dep.quota || 0) - (dep.booked_count || 0));
}

function quotaColorCls(seats: number, quota: number) {
  const pct = quota > 0 ? seats / quota : 1;
  if (seats === 0)   return "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/20";
  if (pct < 0.2)     return "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/20";
  if (pct < 0.5)     return "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/20";
  return "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20";
}

// ─── Component ────────────────────────────────────────────────────────────────
export function SavingsConvertDialog({ open, onOpenChange, savingsPlan }: Props) {
  const navigate  = useNavigate();
  const qc        = useQueryClient();

  const isFlexible  = !savingsPlan.package_id;
  const firstStep: Step = isFlexible ? "package" : "departure";

  const [step,          setStep]          = useState<Step>(firstStep);
  const [selectedPkgId, setSelectedPkgId] = useState<string>(savingsPlan.package_id ?? "");
  const [selectedDepId, setSelectedDepId] = useState<string>("");
  const [roomType,      setRoomType]      = useState<RoomType>("quad");

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setStep(firstStep);
      setSelectedPkgId(savingsPlan.package_id ?? "");
      setSelectedDepId("");
      setRoomType("quad");
    }
    onOpenChange(v);
  };

  // ── Packages (flexible plans only) ───────────────────────────────────────
  const { data: packages = [], isLoading: loadingPkgs } = useQuery({
    queryKey: ["savings-packages-for-convert"],
    enabled: open && isFlexible,
    queryFn: async () => {
      const { data } = await supabase
        .from("packages")
        .select("id, name, type, duration_days, price, savings_target")
        .eq("is_active", true)
        .order("name");
      return (data || []) as unknown as PkgOption[];
    },
  });

  // ── Departures ────────────────────────────────────────────────────────────
  const activePkgId = selectedPkgId || savingsPlan.package_id;

  const { data: departures = [], isLoading: loadingDeps } = useQuery({
    queryKey: ["convert-departures", activePkgId],
    enabled: open && !!activePkgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select(`
          id, departure_date, return_date, quota, booked_count, available_seats,
          status, price_quad, price_triple, price_double, price_single,
          packages:package_id ( id, name, type, duration_days, airline, hotel_makkah, hotel_madinah )
        `)
        .eq("package_id", activePkgId as string)
        .gte("departure_date", new Date().toISOString().split("T")[0])
        .neq("status", "cancelled")
        .order("departure_date");
      return (data || []) as unknown as Departure[];
    },
  });

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedDep      = useMemo(() => departures.find(d => d.id === selectedDepId) ?? null, [departures, selectedDepId]);
  const lockedPrice      = savingsPlan.locked_price ?? savingsPlan.target_amount;
  const paidAmount       = savingsPlan.paid_amount;
  const currentRoomPrice = selectedDep ? (selectedDep[`price_${roomType}` as keyof Departure] as number | null) ?? 0 : 0;
  const priceDiff        = currentRoomPrice - lockedPrice;   // positive = market is higher = jamaah saves
  const extraNeeded      = Math.max(0, lockedPrice - paidAmount);
  const isFreeToConvert  = extraNeeded <= 0;

  // ── Convert mutation ──────────────────────────────────────────────────────
  const convert = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("convert_savings_to_booking" as any, {
        _savings_plan_id: savingsPlan.id,
        _departure_id:    selectedDepId,          room_type: convRoomType as any,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (bookingId) => {
      toast.success("Tabungan berhasil dikonversi ke booking! 🎉");
      qc.invalidateQueries({ queryKey: ["savings-plans"] });
      qc.invalidateQueries({ queryKey: ["my-savings-plans"] });
      handleOpenChange(false);
      navigate(`/my-bookings/${bookingId}`);
    },
    onError: (e: any) => toast.error(e.message || "Gagal mengkonversi tabungan"),
  });

  // ── Step labels ───────────────────────────────────────────────────────────
  const steps: { key: Step; label: string }[] = [
    ...(isFlexible ? [{ key: "package" as Step, label: "Pilih Paket" }] : []),
    { key: "departure", label: "Jadwal & Kamar" },
    { key: "confirm",   label: "Konfirmasi" },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">

        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Plane className="h-4 w-4 text-primary" />
            Konversi Tabungan ke Booking
          </DialogTitle>
          <DialogDescription asChild>
            {/* Step breadcrumb */}
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {steps.map((s, i) => (
                <span key={s.key} className="flex items-center gap-1">
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    s.key === step
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground bg-muted",
                  )}>
                    {i + 1}. {s.label}
                  </span>
                  {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                </span>
              ))}
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* ── Body ── */}
        <ScrollArea className="flex-1 px-6 py-5 min-h-0">

          {/* ══ STEP 1: PILIH PAKET (flexible only) ══ */}
          {step === "package" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Tabungan Anda bersifat fleksibel. Pilih paket yang sesuai sebelum memilih jadwal.
              </p>

              {loadingPkgs ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
              ) : packages.length === 0 ? (
                <Alert><Info className="h-4 w-4" /><AlertDescription>Tidak ada paket aktif tersedia.</AlertDescription></Alert>
              ) : (
                <div className="space-y-2">
                  {packages.map(pkg => (
                    <button
                      key={pkg.id}
                      onClick={() => { setSelectedPkgId(pkg.id); setSelectedDepId(""); }}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border-2 transition-all",
                        selectedPkgId === pkg.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40 hover:bg-muted/30",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Package2 className="h-4 w-4 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{pkg.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {pkg.duration_days} hari · {pkg.type.replace("_", " ").toUpperCase()}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold text-primary">
                            {formatCurrency(pkg.savings_target ?? pkg.price)}
                          </p>
                          {selectedPkgId === pkg.id && (
                            <CheckCircle2 className="h-4 w-4 text-primary ml-auto mt-0.5" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ STEP 2: JADWAL & KAMAR ══ */}
          {step === "departure" && (
            <div className="space-y-5">

              {/* Locked price banner */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800">
                <Lock className="h-5 w-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                    Harga Terkunci: {formatCurrency(lockedPrice)}
                  </p>
                  <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                    Sudah dibayar {formatCurrency(paidAmount)} · Sisa tagihan {formatCurrency(extraNeeded)}
                  </p>
                </div>
              </div>

              {/* Departure list */}
              <div>
                <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Jadwal Keberangkatan
                </p>

                {loadingDeps ? (
                  <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
                ) : departures.length === 0 ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Belum ada jadwal keberangkatan yang tersedia.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2">
                    {departures.map(dep => {
                      const seats  = seatsLeft(dep);
                      const isFull = seats <= 0;
                      const qCls   = quotaColorCls(seats, dep.quota);

                      return (
                        <button
                          key={dep.id}
                          disabled={isFull}
                          onClick={() => setSelectedDepId(dep.id)}
                          className={cn(
                            "w-full text-left p-3 rounded-lg border-2 transition-all",
                            isFull && "opacity-50 cursor-not-allowed",
                            !isFull && selectedDepId === dep.id
                              ? "border-primary bg-primary/5"
                              : !isFull && "border-border hover:border-primary/40 hover:bg-muted/30",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              {/* Dates */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-bold">
                                  {format(new Date(dep.departure_date), "d MMM yyyy", { locale: idLocale })}
                                </p>
                                {dep.return_date && (
                                  <span className="text-xs text-muted-foreground">
                                    → {format(new Date(dep.return_date), "d MMM yyyy", { locale: idLocale })}
                                    {dep.packages?.duration_days && ` (${dep.packages.duration_days} hr)`}
                                  </span>
                                )}
                                <Badge variant="outline" className={cn(
                                  "text-xs px-1.5 py-0",
                                  dep.status === "open" ? "border-emerald-300 text-emerald-700" : "border-amber-300 text-amber-700",
                                )}>
                                  {dep.status === "open" ? "Tersedia" : dep.status}
                                </Badge>
                              </div>
                              {/* Airline / hotel */}
                              {dep.packages?.airline && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                  ✈ {dep.packages.airline}
                                  {dep.packages.hotel_makkah ? ` · 🏨 ${dep.packages.hotel_makkah}` : ""}
                                </p>
                              )}
                              {/* Room prices chip row */}
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {ROOM_TYPES.filter(r => dep[r.priceKey as keyof Departure]).map(r => (
                                  <span key={r.value} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                                    {r.label} {formatCurrency(Number(dep[r.priceKey as keyof Departure] ?? 0))}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Quota badge */}
                            <div className="shrink-0 flex flex-col items-end gap-1">
                              <div className={cn("text-xs font-semibold px-2 py-1 rounded-lg border", qCls)}>
                                <Users className="h-3 w-3 inline mr-0.5" />
                                {isFull ? "Penuh" : `${seats} sisa`}
                              </div>
                              <p className="text-xs text-muted-foreground">dari {dep.quota}</p>
                              {selectedDepId === dep.id && (
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Room type selector — revealed after departure chosen */}
              {selectedDep && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <BedDouble className="h-4 w-4 text-primary" /> Tipe Kamar
                  </p>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {ROOM_TYPES.map(r => {
                      const price = selectedDep[r.priceKey as keyof Departure] as number | null;
                      if (!price) return null;
                      const diff = price - lockedPrice;
                      return (
                        <button
                          key={r.value}
                          onClick={() => setRoomType(r.value)}
                          className={cn(
                            "p-3 rounded-lg border-2 text-left transition-all",
                            roomType === r.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                          )}
                        >
                          <p className="text-sm font-bold">{r.label}</p>
                          <p className="text-xs text-muted-foreground">{r.desc}</p>
                          <p className="text-sm font-bold text-primary mt-1">{formatCurrency(price)}</p>
                          {diff > 0 && (
                            <p className="text-xs text-emerald-600 mt-0.5">Hemat {formatCurrency(diff)}</p>
                          )}
                          {diff < 0 && (
                            <p className="text-xs text-amber-600 mt-0.5">+{formatCurrency(-diff)}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Compact price breakdown */}
                  <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-sm">
                    <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">Rincian Harga</p>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Lock className="h-3.5 w-3.5" /> Harga terkunci (Anda bayar)
                      </span>
                      <span className="font-semibold">{formatCurrency(lockedPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Harga pasar sekarang ({ROOM_TYPES.find(r => r.value === roomType)?.label})</span>
                      <span>{formatCurrency(currentRoomPrice)}</span>
                    </div>

                    {priceDiff > 0 && (
                      <div className="flex items-center justify-between text-emerald-700 font-medium border-t pt-1">
                        <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> Harga naik — Anda dilindungi</span>
                        <Badge className="bg-emerald-600 text-white text-xs">Hemat {formatCurrency(priceDiff)}</Badge>
                      </div>
                    )}
                    {priceDiff < 0 && (
                      <div className="flex items-center justify-between text-amber-600 border-t pt-1">
                        <span className="flex items-center gap-1"><TrendingDown className="h-3.5 w-3.5" /> Harga pasar lebih rendah</span>
                        <span className="text-xs">Tetap bayar harga terkunci</span>
                      </div>
                    )}

                    <Separator />

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sudah dibayar</span>
                      <span className="text-emerald-600 font-medium">–{formatCurrency(paidAmount)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Sisa tagihan</span>
                      <span className={extraNeeded > 0 ? "text-primary" : "text-emerald-600"}>
                        {extraNeeded > 0 ? formatCurrency(extraNeeded) : "LUNAS ✓"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ STEP 3: KONFIRMASI ══ */}
          {step === "confirm" && selectedDep && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Tinjau detail konversi. Tindakan ini tidak dapat dibatalkan.
              </p>

              {/* Summary card */}
              <div className="rounded-xl border divide-y overflow-hidden">

                {/* Package & departure */}
                <div className="p-4 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Keberangkatan</p>
                  <div className="flex items-start gap-3 mt-2">
                    <Plane className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold">{selectedDep.packages?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(selectedDep.departure_date), "d MMMM yyyy", { locale: idLocale })}
                        {selectedDep.return_date && ` → ${format(new Date(selectedDep.return_date), "d MMMM yyyy", { locale: idLocale })}`}
                      </p>
                      {selectedDep.packages?.airline && (
                        <p className="text-xs text-muted-foreground">✈ {selectedDep.packages.airline}</p>
                      )}
                      {selectedDep.packages?.hotel_makkah && (
                        <p className="text-xs text-muted-foreground">🏨 {selectedDep.packages.hotel_makkah}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Room & quota */}
                <div className="p-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Kamar</p>
                    <div className="flex items-center gap-1.5">
                      <BedDouble className="h-4 w-4 text-primary" />
                      <span className="font-semibold capitalize">{roomType}</span>
                      <span className="text-xs text-muted-foreground">({ROOM_TYPES.find(r => r.value === roomType)?.desc})</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Kuota</p>
                    <div className={cn(
                      "inline-flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1 rounded-lg border",
                      quotaColorCls(seatsLeft(selectedDep), selectedDep.quota),
                    )}>
                      <Users className="h-3.5 w-3.5" />
                      {seatsLeft(selectedDep)} sisa / {selectedDep.quota}
                    </div>
                  </div>
                </div>

                {/* Price breakdown */}
                <div className="p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rincian Pembayaran</p>
                  <div className="space-y-1.5 text-sm mt-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Lock className="h-3.5 w-3.5" /> Harga terkunci
                      </span>
                      <span className="font-semibold">{formatCurrency(lockedPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Harga pasar ({ROOM_TYPES.find(r => r.value === roomType)?.label})</span>
                      <span>{formatCurrency(currentRoomPrice)}</span>
                    </div>
                    {priceDiff > 0 && (
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> Selisih Anda hemat</span>
                        <span>{formatCurrency(priceDiff)}</span>
                      </div>
                    )}
                    {priceDiff < 0 && (
                      <div className="flex justify-between text-amber-600">
                        <span className="flex items-center gap-1"><TrendingDown className="h-3.5 w-3.5" /> Harga pasar lebih rendah</span>
                        <span>{formatCurrency(Math.abs(priceDiff))}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sudah dibayar</span>
                      <span className="text-emerald-600 font-semibold">–{formatCurrency(paidAmount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base border-t pt-2 mt-1">
                      <span>Sisa tagihan</span>
                      <span className={extraNeeded > 0 ? "text-primary" : "text-emerald-600"}>
                        {extraNeeded > 0 ? formatCurrency(extraNeeded) : "LUNAS ✓"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alerts */}
              {extraNeeded > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Masih ada sisa pembayaran <strong>{formatCurrency(extraNeeded)}</strong>.
                    Booking akan dibuat dan tim kami akan menghubungi Anda untuk pelunasan.
                  </AlertDescription>
                </Alert>
              )}
              {isFreeToConvert && (
                <Alert className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertDescription className="text-xs text-emerald-800 dark:text-emerald-300">
                    Tabungan Anda sudah lunas — siap dikonversi ke booking sekarang!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

        </ScrollArea>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t flex justify-between gap-2 shrink-0 bg-background">
          {step === firstStep ? (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>Batal</Button>
          ) : (
            <Button variant="outline" onClick={() => setStep(step === "confirm" ? "departure" : "package")}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Kembali
            </Button>
          )}

          {step === "package" && (
            <Button disabled={!selectedPkgId} onClick={() => setStep("departure")}>
              Pilih Jadwal <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}

          {step === "departure" && (
            <Button
              disabled={!selectedDepId || (selectedDep ? seatsLeft(selectedDep) <= 0 : true)}
              onClick={() => setStep("confirm")}
            >
              Tinjau Konversi <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}

          {step === "confirm" && (
            <Button onClick={() => convert.mutate()} disabled={convert.isPending} className="min-w-[160px]">
              {convert.isPending
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Memproses…</>
                : <><CheckCircle2 className="h-4 w-4 mr-2" /> Konfirmasi Konversi</>
              }
            </Button>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
}
