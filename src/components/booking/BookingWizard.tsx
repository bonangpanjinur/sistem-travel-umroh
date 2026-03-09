import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "./StepIndicator";
import { StepPassengersDynamic } from "./steps/StepPassengersDynamic";
import { StepReviewDynamic } from "./steps/StepReviewDynamic";
import { useBookingWizardDynamic, RoomAllocation } from "@/hooks/useBookingWizardDynamic";
import { Loader2, ArrowLeft, BedDouble, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export type BookingStep = 'passengers' | 'review';

const STEPS: { id: BookingStep; label: string }[] = [
  { id: 'passengers', label: 'Data Jamaah' },
  { id: 'review', label: 'Review & Bayar' },
];

const ROOM_LABELS = {
  quad: 'Quad',
  triple: 'Triple', 
  double: 'Double',
  single: 'Single',
};

export function BookingWizard() {
  const { packageId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  
  // Get pre-selected options from URL params
  const initialDepartureId = searchParams.get('departure') || '';
  const initialRoomAllocation: RoomAllocation = {
    quad: parseInt(searchParams.get('quad') || '0', 10),
    triple: parseInt(searchParams.get('triple') || '0', 10),
    double: parseInt(searchParams.get('double') || '0', 10),
    single: parseInt(searchParams.get('single') || '0', 10),
  };
  
  // Fetch package info
  const { data: packageInfo } = useQuery({
    queryKey: ['package-info', packageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('id, name, code, duration_days, package_type')
        .eq('id', packageId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!packageId,
  });

  // Fetch departure info
  const { data: departureInfo } = useQuery({
    queryKey: ['departure-info', initialDepartureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departures')
        .select('id, departure_date, return_date, flight_number, price_quad, price_triple, price_double, price_single')
        .eq('id', initialDepartureId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!initialDepartureId,
  });

  const {
    currentStep,
    setCurrentStep,
    formData,
    updateFormData,
    isSubmitting,
    submitBooking,
  } = useBookingWizardDynamic(packageId!, initialDepartureId, initialRoomAllocation);

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);
  const totalPassengers = formData.passengers.length;

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id);
    }
  };

  const handlePrev = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  };

  const handleSubmit = async () => {
    const result = await submitBooking();
    if (result?.bookingId) {
      navigate(`/booking/success/${result.bookingId}`);
    }
  };

  // Redirect to login if not authenticated
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">Login Diperlukan</h2>
          <p className="text-muted-foreground mb-6">
            Silakan login terlebih dahulu untuk melanjutkan pemesanan.
          </p>
          <Button onClick={() => navigate(`/auth/login?redirect=${encodeURIComponent(`/booking/${packageId}${window.location.search}`)}`)}>
            Login Sekarang
          </Button>
        </CardContent>
      </Card>
    );
  }

  // If no departure selected, redirect back to package page
  if (!initialDepartureId || totalPassengers === 0) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">Pilih Keberangkatan & Kamar</h2>
          <p className="text-muted-foreground mb-6">
            Silakan pilih tanggal keberangkatan dan jumlah jamaah terlebih dahulu di halaman detail paket.
          </p>
          <Button asChild>
            <Link to={`/packages/${packageId}`}>
              Kembali ke Detail Paket
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Build room summary for display
  const roomSummary: string[] = [];
  if (initialRoomAllocation.quad > 0) roomSummary.push(`${initialRoomAllocation.quad} Quad`);
  if (initialRoomAllocation.triple > 0) roomSummary.push(`${initialRoomAllocation.triple} Triple`);
  if (initialRoomAllocation.double > 0) roomSummary.push(`${initialRoomAllocation.double} Double`);
  if (initialRoomAllocation.single > 0) roomSummary.push(`${initialRoomAllocation.single} Single`);

  return (
    <div className="space-y-6">
      {/* Back Button & Title */}
      <div>
        <Button variant="outline" size="sm" asChild className="mb-4">
          <Link to={`/packages/${packageId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Detail Paket
          </Link>
        </Button>
        {packageInfo && (
          <div>
            <h1 className="text-2xl font-bold">Booking: {packageInfo.name}</h1>
            <p className="text-muted-foreground">
              {packageInfo.duration_days} Hari • {packageInfo.package_type?.toUpperCase()}
              {departureInfo && (
                <> • Berangkat {format(new Date(departureInfo.departure_date), "d MMMM yyyy", { locale: idLocale })}</>
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
            <div className="flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Kamar:</span>
              <span className="font-medium">{roomSummary.join(', ')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Indicator */}
      <StepIndicator steps={STEPS} currentStep={currentStep} />

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {currentStep === 'passengers' && (
            <StepPassengersDynamic
              passengers={formData.passengers}
              onUpdate={(passengers) => updateFormData({ passengers })}
            />
          )}
          
          {currentStep === 'review' && packageInfo && (
            <StepReviewDynamic
              formData={formData}
              packageInfo={packageInfo as any}
              departureInfo={departureInfo}
              departurePrices={departureInfo ? {
                price_quad: departureInfo.price_quad ?? 0,
                price_triple: departureInfo.price_triple ?? 0,
                price_double: departureInfo.price_double ?? 0,
                price_single: departureInfo.price_single ?? 0,
              } : undefined}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentStepIndex === 0}
        >
          Sebelumnya
        </Button>

        {currentStep === 'review' ? (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Memproses...
              </>
            ) : (
              'Konfirmasi Booking'
            )}
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={!canProceed(currentStep, formData)}>
            Selanjutnya
          </Button>
        )}
      </div>
    </div>
  );
}

function canProceed(step: BookingStep, formData: any): boolean {
  switch (step) {
    case 'passengers':
      if (formData.passengers.length === 0) return false;
      // All passengers must have name >= 3 chars
      const allNamesValid = formData.passengers.every((p: any) => p.fullName?.trim()?.length >= 3);
      // At least 1 adult passenger
      const hasAdult = formData.passengers.some((p: any) => p.passengerType === 'adult');
      return allNamesValid && hasAdult;
    case 'review':
      return true;
    default:
      return false;
  }
}
