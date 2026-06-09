import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "./StepIndicator";
import { StepPassengersDynamic } from "./steps/StepPassengersDynamic";
import { StepReviewDynamic } from "./steps/StepReviewDynamic";
import { StepRoomAllocation } from "./steps/StepRoomAllocation";
import { PICSelectionStepImproved } from "./PICSelectionStepImproved";
import { useBookingWizardDynamic, RoomAllocation, PICData } from "@/hooks/useBookingWizardDynamic";
import { Loader2, ArrowLeft, BedDouble, Users, Building2, Ticket, LogIn } from "lucide-react";
import { Clock, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";
import { slugify } from "@/lib/slug";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { LoginSuggestionDialog } from "./LoginSuggestionDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSeatHold, formatHoldRemaining } from "@/hooks/useSeatHold";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { getAgentRef } from "@/hooks/useAgentRef";
import {
  buildDraftKey,
  buildAutoSubmitKey,
  saveBookingDraft,
  loadBookingDraft,
  clearBookingDraft,
} from "@/lib/bookingDraft";

const MONTHS = [
  { value: "01", label: "Januari" },
  { value: "02", label: "Februari" },
  { value: "03", label: "Maret" },
  { value: "04", label: "April" },
  { value: "05", label: "Mei" },
  { value: "06", label: "Juni" },
  { value: "07", label: "Juli" },
  { value: "08", label: "Agustus" },
  { value: "09", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

export type BookingStep = 'rooms' | 'passengers' | 'pic' | 'review';

const STEPS_DEFAULT: { id: BookingStep; label: string }[] = [
  { id: 'rooms', label: 'Pilih Kamar' },
  { id: 'passengers', label: 'Data Jamaah' },
  { id: 'pic', label: 'Sumber Pendaftaran' },
  { id: 'review', label: 'Review & Bayar' },
];

// Haji: skip alokasi kamar (harga per usia, akomodasi diatur operator)
const STEPS_HAJI: { id: BookingStep; label: string }[] = [
  { id: 'passengers', label: 'Data Jamaah' },
  { id: 'pic', label: 'Sumber Pendaftaran' },
  { id: 'review', label: 'Review & Bayar' },
];

export function BookingWizard() {
  const { packageId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  
  const initialDepartureId = searchParams.get('departure') || '';
  const initialPax = parseInt(searchParams.get('pax') || '0', 10);
  const initialRoomAllocation: RoomAllocation = {
    quad: parseInt(searchParams.get('quad') || '0', 10),
    triple: parseInt(searchParams.get('triple') || '0', 10),
    double: parseInt(searchParams.get('double') || '0', 10),
    single: parseInt(searchParams.get('single') || '0', 10),
  };

  // Read PIC data from URL params, with localStorage fallback for cross-session attribution
  // (e.g. user visited /a/dewi earlier this month — attribution preserved for 30 days)
  const storedRef = getAgentRef();
  const urlAgentId   = searchParams.get('agent_id')   || undefined;
  const urlBranchId  = searchParams.get('branch_id')  || undefined;
  const resolvedAgentId  = urlAgentId  || storedRef.agentId  || undefined;
  const resolvedBranchId = urlBranchId || storedRef.branchId || undefined;
  const resolvedPicSource =
    searchParams.get('pic_source') ||
    (urlAgentId  ? 'agen'   : '') ||
    (urlBranchId ? 'cabang' : '') ||
    (storedRef.agentId  ? 'agen'   : '') ||
    (storedRef.branchId ? 'cabang' : '') ||
    'pusat';

  const picData: PICData = {
    picSource: resolvedPicSource,
    branchId: resolvedBranchId,
    agentId: resolvedAgentId,
    referralCode: searchParams.get('referral_code') || undefined,
  };

  // When agent/branch is pre-set (from URL or stored ref), skip the PIC selection step.
  const hasPresetPIC = !!(resolvedAgentId || resolvedBranchId);
  
  const { data: packageInfo } = useQuery({
    queryKey: ['package-info', packageId],
    queryFn: async () => {
      const { data, error } = await supabase.from('packages').select('id, name, code, duration_days, package_type, booking_mode, currency').eq('id', packageId!).single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!packageId,
  });

  const { data: departureInfo } = useQuery({
    queryKey: ['departure-info', initialDepartureId],
    queryFn: async () => {
      const { data, error } = await supabase.from('departures').select('id, departure_date, return_date, flight_number, price_quad, price_triple, price_double, price_single, price_adult, price_child, price_infant, currency, available_seats').eq('id', initialDepartureId).single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!initialDepartureId,
  });

  // Fetch PIC label for display
  const { data: picLabel } = useQuery({
    queryKey: ['pic-label', picData.picSource, picData.branchId, picData.agentId],
    queryFn: async () => {
      if (picData.picSource === 'cabang' && picData.branchId) {
        const { data } = await supabase.from('branches').select('name').eq('id', picData.branchId).single();
        return `Cabang: ${data?.name || '-'}`;
      }
      if (picData.picSource === 'agen' && picData.agentId) {
        const { data } = await supabase.from('agents').select('company_name, agent_code').eq('id', picData.agentId).single();
        return `Agen: ${data?.company_name || data?.agent_code || '-'}`;
      }
      if (picData.picSource === 'referral' && picData.referralCode) {
        return `Referral: ${picData.referralCode}`;
      }
      return 'Pusat';
    },
  });

  // bookingMode sudah tersedia dari packageInfo, tapi hook dipanggil sebelum packageInfo ready.
  // Kita baca dari searchParams atau default 'umroh' — akan di-sync setelah packageInfo loaded.
  const earlyBookingMode = searchParams.get('booking_mode') || 'umroh';

  const {
    currentStep, setCurrentStep, formData, updateFormData, isSubmitting, submitBooking,
    updateRoomAllocation, addHajiPassenger, removeHajiPassenger, isHaji: isHajiFromHook,
    picState, setPicState, picValidation, isValidatingPIC,
    cancellationAgreed, setCancellationAgreed,
  } = useBookingWizardDynamic(packageId!, initialDepartureId, initialRoomAllocation, picData, initialPax, earlyBookingMode);

  const [paymentStepValid, setPaymentStepValid] = useState(true);
  const [loginGate, setLoginGate] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [seatLostAfterLogin, setSeatLostAfterLogin] = useState(false);

  // Persist guest wizard state per departure to survive login redirect
  const draftKey = buildDraftKey(packageId, initialDepartureId);
  const restoredRef = useRef(false);
  const autoSubmittedRef = useRef(false);

  // Restore draft on mount (after login or refresh) — TTL aware
  useEffect(() => {
    if (!draftKey || restoredRef.current) return;
    restoredRef.current = true;
    const result = loadBookingDraft<any>(draftKey);
    if (result.status === 'expired') {
      toast.warning('Draft booking sebelumnya telah kedaluwarsa', {
        description: 'Silakan isi ulang data jamaah Anda.',
      });
      // Pastikan auto-submit flag juga hilang
      try { sessionStorage.removeItem(buildAutoSubmitKey(draftKey)); } catch {}
      return;
    }
    if (result.status !== 'ok') return;
    const draft = result.payload || {};
    if (draft?.passengers?.length) {
      updateFormData({
        passengers: draft.passengers,
        notes: draft.notes,
        paymentMode: draft.paymentMode,
        dpAmount: draft.dpAmount,
        savingsPlanId: draft.savingsPlanId,
      });
    }
    if (draft?.picState) setPicState(draft.picState);
    if (draft?.cancellationAgreed != null) setCancellationAgreed(draft.cancellationAgreed);
    if (draft?.currentStep) setCurrentStep(draft.currentStep);
    setResumed(true);
    toast.success('Data booking Anda dipulihkan', {
      description: 'Lanjutkan dari tempat terakhir tanpa perlu mengisi ulang.',
      duration: 4000,
    });
  }, [draftKey]);

  // Continuously persist draft (untuk guest, dan juga untuk user login agar
  // refresh halaman tidak menghapus progres). Menggunakan TTL envelope.
  useEffect(() => {
    if (!draftKey) return;
    saveBookingDraft(draftKey, {
      passengers: formData.passengers,
      notes: formData.notes,
      paymentMode: formData.paymentMode,
      dpAmount: formData.dpAmount,
      savingsPlanId: formData.savingsPlanId,
      picState,
      cancellationAgreed,
      currentStep,
    });
  }, [draftKey, formData, picState, cancellationAgreed, currentStep]);

  const bookingMode = (packageInfo as any)?.booking_mode || earlyBookingMode;
  // isHaji dari hook (early) atau dari packageInfo setelah loaded
  const isHaji = bookingMode === 'haji' || isHajiFromHook;
  const STEPS_RAW = isHaji ? STEPS_HAJI : STEPS_DEFAULT;
  // Skip PIC step when attribution is already pre-set via agent/branch website
  const STEPS = hasPresetPIC ? STEPS_RAW.filter(s => s.id !== 'pic') : STEPS_RAW;

  // Seat hold (BOOK-FIX3) — 15 menit lock kursi selama wizard
  const requestedPax = Math.max(initialPax || 1, 1);
  const { remainingMs, error: holdError, expiresAt } = useSeatHold(initialDepartureId, requestedPax);
  const holdExpired = !!expiresAt && remainingMs === 0;

  // Deteksi seat hold gagal setelah login (kursi diambil orang lain selama proses login)
  useEffect(() => {
    if (!user || !draftKey) return;
    const flag = sessionStorage.getItem(buildAutoSubmitKey(draftKey));
    if (flag === '1' && holdError === 'insufficient_capacity') {
      setSeatLostAfterLogin(true);
      try { sessionStorage.removeItem(buildAutoSubmitKey(draftKey)); } catch {}
      toast.error('Kursi sudah terisi penuh', {
        description: 'Saat Anda login, kursi habis diambil jamaah lain. Silakan pilih tanggal keberangkatan lain.',
        duration: 8000,
      });
    }
  }, [user, draftKey, holdError]);

  // Saat mode haji & step aktif adalah 'rooms' (state awal), pindahkan ke 'passengers'
  useEffect(() => {
    if (isHaji && currentStep === 'rooms') {
      setCurrentStep('passengers');
    }
  }, [isHaji, currentStep, setCurrentStep]);

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);
  const totalPassengers = formData.passengers.length;

  // Validasi mode pembayaran (Step 4) — dihitung penuh di StepReviewDynamic dengan totalPrice
  const paymentValid = paymentStepValid;

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) setCurrentStep(STEPS[nextIndex].id);
  };

  const handlePrev = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) setCurrentStep(STEPS[prevIndex].id);
  };

  const handleSubmit = async () => {
    // Guest gate: require login before creating booking + payment
    if (!user) {
      setLoginGate(true);
      return;
    }
    if (holdError === 'insufficient_capacity' || holdExpired) {
      toast.error('Kursi tidak tersedia. Silakan refresh atau pilih tanggal lain.');
      return;
    }
    const result = await submitBooking();
    if (result?.bookingId) {
      // Release seat hold once booking is confirmed (server-side booking_count already incremented)
      try {
        await (supabase.rpc as any)('release_seat_hold', {
          _session_id: sessionStorage.getItem('seat-hold-session-id'),
          _departure_id: initialDepartureId,
        });
      } catch {}
      // Clear draft + auto-submit flag on success
      clearBookingDraft(draftKey);
      navigate(`/booking/success/${result.bookingId}`);
    }
  };

  const goLogin = (mode: 'login' | 'register') => {
    // Pastikan draft tersimpan dengan TTL terbaru sebelum redirect
    saveBookingDraft(draftKey, {
      passengers: formData.passengers,
      notes: formData.notes,
      paymentMode: formData.paymentMode,
      dpAmount: formData.dpAmount,
      savingsPlanId: formData.savingsPlanId,
      picState,
      cancellationAgreed,
      currentStep,
    });
    if (draftKey) sessionStorage.setItem(buildAutoSubmitKey(draftKey), '1');
    const back = encodeURIComponent(window.location.pathname + window.location.search);
    const path = mode === 'register' ? '/auth/register' : '/auth/login';
    navigate(`${path}?redirect=${back}`);
  };

  // Auto-submit setelah login: tunggu sampai draft ter-restore, PIC tervalidasi,
  // seat hold valid, dan ada di step review. Kalau gagal validasi, jangan paksa submit.
  useEffect(() => {
    if (!user || !draftKey || autoSubmittedRef.current) return;
    const shouldAuto = sessionStorage.getItem(buildAutoSubmitKey(draftKey));
    if (shouldAuto !== '1') return;
    if (currentStep !== 'review') return;
    if (isSubmitting) return;
    if (isValidatingPIC) return;
    if (!picValidation.isValid) return;
    if (holdError === 'insufficient_capacity' || holdExpired) return;
    if (cancellationAgreed === false) return;

    autoSubmittedRef.current = true;
    sessionStorage.removeItem(buildAutoSubmitKey(draftKey));
    toast.info('Melanjutkan proses booking Anda...', { duration: 2500 });
    const t = setTimeout(() => { handleSubmit(); }, 400);
    return () => clearTimeout(t);
  }, [
    user, draftKey, currentStep, isSubmitting, isValidatingPIC,
    picValidation.isValid, holdError, holdExpired, cancellationAgreed,
  ]);

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // Guest Checkout: Allow users to proceed without login.
  // We will suggest login later in the process.

  if (!initialDepartureId || (initialPax === 0 && totalPassengers === 0)) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">Pilih Keberangkatan & Jumlah Jamaah</h2>
          <p className="text-muted-foreground mb-6">Silakan pilih tanggal keberangkatan dan jumlah jamaah terlebih dahulu di halaman detail paket.</p>
          <Button asChild><Link to={`/packages/${packageId}${packageInfo ? `-${slugify(packageInfo.name)}` : ''}`}>Kembali ke Detail Paket</Link></Button>
        </CardContent>
      </Card>
    );
  }

  const roomSummary: string[] = [];
  if (initialRoomAllocation.quad > 0) roomSummary.push(`${initialRoomAllocation.quad} Quad`);
  if (initialRoomAllocation.triple > 0) roomSummary.push(`${initialRoomAllocation.triple} Triple`);
  if (initialRoomAllocation.double > 0) roomSummary.push(`${initialRoomAllocation.double} Double`);
  if (initialRoomAllocation.single > 0) roomSummary.push(`${initialRoomAllocation.single} Single`);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="outline" size="sm" asChild className="mb-4">
          <Link to={`/packages/${packageId}${packageInfo ? `-${slugify(packageInfo.name)}` : ''}`}><ArrowLeft className="h-4 w-4 mr-2" />Kembali ke Detail Paket</Link>
        </Button>
        {packageInfo && (
          <div>
            <h1 className="text-2xl font-bold">Booking: {packageInfo.name}</h1>
            <p className="text-muted-foreground">
              {packageInfo.duration_days} Hari • {packageInfo.package_type?.toUpperCase()}
              {departureInfo && (
                <>
                  {" "}•{" "}
                   {departureInfo.departure_date 
                    ? `Berangkat ${format(new Date(departureInfo.departure_date), "d MMMM yyyy", { locale: idLocale })}`
                    : 'Tanggal Belum Ditentukan'}
                </>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Booking Summary Info */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Jamaah:</span>
              <span className="font-medium">{totalPassengers} orang</span>
            </div>
            {!isHaji && (
              <div className="flex items-center gap-2">
                <BedDouble className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Kamar:</span>
                <span className="font-medium">{roomSummary.join(', ') || '-'}</span>
              </div>
            )}
            {isHaji && (
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Mode:</span>
                <Badge variant="outline" className="text-xs">Haji</Badge>
              </div>
            )}
            {picLabel && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">PIC:</span>
                <Badge variant="outline" className="text-xs">{picLabel}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Seat hold countdown — BOOK-FIX3 */}
      {expiresAt && !holdExpired && (
        <Alert className="border-primary/30 bg-primary/5">
          <Clock className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            Kursi Anda dikunci selama <strong className="font-mono">{formatHoldRemaining(remainingMs)}</strong>.
            Selesaikan booking sebelum waktu habis agar tidak diambil orang lain.
          </AlertDescription>
        </Alert>
      )}
      {seatLostAfterLogin && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Maaf, kursi yang Anda kunci sudah habis diambil jamaah lain saat proses login.
            Data Anda tetap tersimpan — silakan pilih tanggal keberangkatan lain di halaman paket.
          </AlertDescription>
        </Alert>
      )}
      {resumed && !seatLostAfterLogin && (
        <Alert className="border-emerald-500/30 bg-emerald-500/5">
          <Clock className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-sm">
            Progres booking Anda berhasil dipulihkan. Periksa kembali data sebelum konfirmasi.
          </AlertDescription>
        </Alert>
      )}
      {holdError === 'insufficient_capacity' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Kuota tidak mencukupi untuk {requestedPax} jamaah. Mungkin sudah ada user lain yang sedang booking — coba kurangi jumlah atau pilih tanggal lain.
          </AlertDescription>
        </Alert>
      )}
      {holdExpired && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Waktu kunci kursi telah habis. Refresh halaman untuk mengunci ulang sebelum melanjutkan.
          </AlertDescription>
        </Alert>
      )}

      {/* Attribution banner — shown when booking from agent/branch website */}
      {hasPresetPIC && picLabel && (
        <Alert className="border-emerald-200 bg-emerald-50">
          <Building2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-800 text-sm">
            Pendaftaran Anda akan diproses melalui <strong>{picLabel}</strong>.
            Anda tidak perlu memilih sumber pendaftaran secara manual.
          </AlertDescription>
        </Alert>
      )}

      <StepIndicator steps={STEPS} currentStep={currentStep} />

      <Card>
        <CardContent className="p-6">
          {currentStep === 'rooms' && (
            <StepRoomAllocation
              totalPax={initialPax || formData.passengers.length}
              allocation={formData.roomAllocation}
              prices={departureInfo ? {
                quad: departureInfo.price_quad ?? 0,
                triple: departureInfo.price_triple ?? 0,
                double: departureInfo.price_double ?? 0,
                single: departureInfo.price_single ?? 0,
              } : { quad: 0, triple: 0, double: 0, single: 0 }}
              onUpdate={updateRoomAllocation}
              availableSeats={departureInfo?.available_seats ?? undefined}
            />
          )}
          {currentStep === 'passengers' && (
            <StepPassengersDynamic
              passengers={formData.passengers}
              onUpdate={(passengers) => updateFormData({ passengers })}
              isHaji={isHaji}
              departurePrices={departureInfo ? {
                price_adult: (departureInfo as any)?.price_adult ?? 0,
                price_child: (departureInfo as any)?.price_child ?? 0,
                price_infant: (departureInfo as any)?.price_infant ?? 0,
              } : undefined}
              onAddPassenger={addHajiPassenger}
              onRemovePassenger={removeHajiPassenger}
            />
          )}
          {currentStep === 'pic' && (
            <PICSelectionStepImproved
              picSource={picState.picSource as any}
              selectedBranchId={picState.branchId || ''}
              selectedAgentId={picState.agentId || ''}
              referralCode={picState.referralCode || ''}
              onPICSourceChange={(s) => setPicState(prev => ({ ...prev, picSource: s }))}
              onBranchChange={(id) => setPicState(prev => ({ ...prev, branchId: id }))}
              onAgentChange={(id) => setPicState(prev => ({ ...prev, agentId: id }))}
              onReferralChange={(c) => setPicState(prev => ({ ...prev, referralCode: c }))}
              validation={picValidation}
              isValidating={isValidatingPIC}
            />
          )}
          {currentStep === 'review' && packageInfo && (
            <StepReviewDynamic
              formData={formData}
              packageInfo={packageInfo as any}
              departureInfo={departureInfo}
              isHaji={isHaji}
              departurePrices={departureInfo ? {
                price_quad: departureInfo.price_quad ?? 0,
                price_triple: departureInfo.price_triple ?? 0,
                price_double: departureInfo.price_double ?? 0,
                price_single: departureInfo.price_single ?? 0,
                price_adult: (departureInfo as any)?.price_adult ?? 0,
                price_child: (departureInfo as any)?.price_child ?? 0,
                price_infant: (departureInfo as any)?.price_infant ?? 0,
              } : undefined}
              onCouponApplied={(discount, code) => updateFormData({ notes: `coupon:${code}` })}
              onUpdatePassengers={(passengers) => updateFormData({ passengers })}
              cancellationAgreed={cancellationAgreed ?? undefined}
              onCancellationAgreedChange={setCancellationAgreed}
              paymentMode={formData.paymentMode || 'full'}
              dpAmount={formData.dpAmount || 0}
              savingsPlanId={formData.savingsPlanId}
              onPaymentModeChange={(mode, dp, savingsId) =>
                updateFormData({ paymentMode: mode, dpAmount: dp, savingsPlanId: savingsId })
              }
              onPaymentValidityChange={setPaymentStepValid}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={handlePrev} disabled={currentStepIndex === 0}>Sebelumnya</Button>
        {currentStep === 'review' ? (
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !picValidation.isValid ||
              cancellationAgreed === false ||
              !paymentValid
            }
          >
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Memproses...</> : 'Konfirmasi Booking'}
          </Button>
        ) : (
          <Button 
            onClick={handleNext} 
            disabled={!canProceed(currentStep, formData, picState, picValidation, isValidatingPIC)}
          >
            Selanjutnya
          </Button>
        )}
      </div>

      <Dialog open={loginGate} onOpenChange={setLoginGate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5 text-primary" />
              Login untuk Melanjutkan Pembayaran
            </DialogTitle>
            <DialogDescription>
              Data booking Anda sudah kami simpan. Silakan login atau daftar untuk
              memproses pembayaran dengan aman dan mengakses tiket, dokumen, serta
              status visa Anda.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            Kursi Anda tetap dikunci selama proses login. Setelah berhasil masuk,
            booking akan otomatis dibuat tanpa perlu mengisi ulang.
          </div>
          <DialogFooter className="flex gap-2 sm:flex-row">
            <Button variant="outline" className="flex-1" onClick={() => goLogin('register')}>
              Daftar Akun Baru
            </Button>
            <Button className="flex-1" onClick={() => goLogin('login')}>
              Login Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function canProceed(
  step: BookingStep, 
  formData: any, 
  picState?: any, 
  picValidation?: any, 
  isValidatingPIC?: boolean
): boolean {
  switch (step) {
    case 'rooms':
      const allocated = formData.roomAllocation.quad + formData.roomAllocation.triple + formData.roomAllocation.double + formData.roomAllocation.single;
      const doubleValid = formData.roomAllocation.double % 2 === 0 || formData.roomAllocation.double === 0;
      return allocated > 0 && doubleValid;
    case 'passengers':
      if (formData.passengers.length === 0) return false;
      const allNamesValid = formData.passengers.every((p: any) => p.fullName?.trim()?.length >= 3);
      const hasAdult = formData.passengers.some((p: any) => p.passengerType === 'adult');
      return allNamesValid && hasAdult;
    case 'pic':
      if (isValidatingPIC) return false;
      return !!picValidation?.isValid;
    case 'review':
      return !!picValidation?.isValid;
    default:
      return false;
  }
}
