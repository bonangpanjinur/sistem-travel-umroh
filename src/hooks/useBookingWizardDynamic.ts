import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { RoomType } from "@/types/database";
import { BookingStep } from "@/components/booking/BookingWizard";

export interface RoomAllocation {
  quad: number;
  triple: number;
  double: number;
  single: number;
}

export interface DynamicPassengerData {
  id: string;
  fullName: string;
  gender: 'male' | 'female';
  phone: string;
  passengerType: 'adult' | 'child' | 'infant';
  roomType: RoomType;
}

export interface DynamicBookingFormData {
  departureId: string;
  roomAllocation: RoomAllocation;
  passengers: DynamicPassengerData[];
  notes?: string;
}

export interface PICData {
  picSource?: string;
  notes?: string;
  branchId?: string;
  agentId?: string;
  referralCode?: string;
  couponCode?: string;
}
const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

function createPassengersFromAllocation(allocation: RoomAllocation): DynamicPassengerData[] {
  const passengers: DynamicPassengerData[] = [];
  const types: RoomType[] = ['quad', 'triple', 'double', 'single'];
  for (const type of types) {
    for (let i = 0; i < allocation[type]; i++) {
      passengers.push({ id: generateTempId(), fullName: '', gender: 'male', phone: '', passengerType: 'adult', roomType: type });
    }
  }
  return passengers;
}

export function useBookingWizardDynamic(
  packageId: string, 
  initialDepartureId: string,
  initialRoomAllocation: RoomAllocation,
  picData?: PICData,
  initialPax: number = 0
) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<BookingStep>(initialPax > 0 ? 'rooms' : 'passengers');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const initialPassengers = useMemo(() => 
    createPassengersFromAllocation(initialRoomAllocation), 
    [initialRoomAllocation.quad, initialRoomAllocation.triple, initialRoomAllocation.double, initialRoomAllocation.single]
  );
  
  const [formData, setFormData] = useState<DynamicBookingFormData>({
    departureId: initialDepartureId,
    roomAllocation: initialRoomAllocation,
    passengers: initialPassengers,
  });

  const [picState, setPicState] = useState<PICData>(picData || { picSource: 'pusat' });
  const [picValidation, setPicValidation] = useState<{ isValid: boolean; errorMessage?: string; resolvedBranchId?: string; resolvedAgentId?: string; resolvedReferralId?: string; metadata?: any }>({ isValid: true });
  const [isValidatingPIC, setIsValidatingPIC] = useState(false);

  // Effect for real-time validation
  useMemo(() => {
    const validate = async () => {
      // Don't validate if everything is empty except for pusat
      if (picState.picSource === 'pusat') {
        setPicValidation({ isValid: true, metadata: { name: 'Kantor Pusat' } });
        return;
      }

      if (picState.picSource === 'cabang' && !picState.branchId) {
        setPicValidation({ isValid: false, errorMessage: 'Silakan pilih kantor cabang' });
        return;
      }

      if (picState.picSource === 'agen' && !picState.agentId) {
        setPicValidation({ isValid: false, errorMessage: 'Silakan pilih agen travel' });
        return;
      }

      if (picState.picSource === 'referral' && (!picState.referralCode || picState.referralCode.length < 3)) {
        setPicValidation({ isValid: false, errorMessage: 'Silakan masukkan kode referral yang valid' });
        return;
      }

      setIsValidatingPIC(true);
      try {
        const { data, error } = await supabase.rpc('validate_registration_context' as any, {
          p_pic_source: picState.picSource,
          p_branch_id: picState.branchId || null,
          p_agent_id: picState.agentId || null,
          p_referral_code: picState.referralCode || null
        });

        if (error) throw error;
        
        const result = data as any;
        setPicValidation({
          isValid: result?.is_valid,
          errorMessage: result?.error_message,
          resolvedBranchId: result?.resolved_branch_id,
          resolvedAgentId: result?.resolved_agent_id,
          resolvedReferralId: result?.resolved_referral_id,
          metadata: result?.metadata
        });
      } catch (err) {
        console.error('Validation error:', err);
        setPicValidation({ isValid: false, errorMessage: 'Gagal memverifikasi data' });
      } finally {
        setIsValidatingPIC(false);
      }
    };

    const timer = setTimeout(validate, 500);
    return () => clearTimeout(timer);
  }, [picState.picSource, picState.branchId, picState.agentId, picState.referralCode]);

  const updateFormData = (updates: Partial<DynamicBookingFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const submitBooking = async () => {
    if (!user) {
      toast.error('Silakan login terlebih dahulu');
      return null;
    }

    setIsSubmitting(true);
    
    try {
      // 1. Get or create customer record
      let { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!customer) {
        const mainPassenger = formData.passengers[0];
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({ user_id: user.id, full_name: mainPassenger.fullName, gender: mainPassenger.gender, phone: mainPassenger.phone || null, email: user.email })
          .select('id')
          .single();
        if (customerError) throw customerError;
        customer = newCustomer;
      }

      // 2. Get departure info
      const { data: departure, error: departureError } = await supabase
        .from('departures')
        .select('id, departure_date, price_quad, price_triple, price_double, price_single, package:packages(code)')
        .eq('id', formData.departureId)
        .single();

      if (departureError || !departure) throw new Error('Departure tidak ditemukan');

      // 3. Calculate pricing
      const priceMap: Record<RoomType, number> = {
        quad: departure.price_quad || 0, triple: departure.price_triple || 0,
        double: departure.price_double || 0, single: departure.price_single || 0,
      };
      
      let totalPrice = 0;
      for (const passenger of formData.passengers) {
        totalPrice += priceMap[passenger.roomType];
      }
      
      const adultCount = formData.passengers.filter(p => p.passengerType === 'adult').length;
      const childCount = formData.passengers.filter(p => p.passengerType === 'child').length;
      const infantCount = formData.passengers.filter(p => p.passengerType === 'infant').length;
      const totalPax = formData.passengers.length;
      
      const roomCounts = formData.passengers.reduce((acc, p) => {
        acc[p.roomType] = (acc[p.roomType] || 0) + 1;
        return acc;
      }, {} as Record<RoomType, number>);
      
      const mainRoomType = (Object.entries(roomCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'quad') as RoomType;
      const basePrice = priceMap[mainRoomType];

      // 4. Determine PIC (branch_id, agent_id) from picState with strict validation
      const { data: validation, error: validationError } = await supabase.rpc('validate_registration_context' as any, {
        p_pic_source: picState.picSource,
        p_branch_id: picState.branchId || null,
        p_agent_id: picState.agentId || null,
        p_referral_code: picState.referralCode || null
      });

      if (validationError) throw validationError;
      const validationResult = validation as any;
      if (!validationResult?.is_valid) throw new Error(validationResult?.error_message || 'Data pendaftaran tidak valid');

      const branchId = validationResult?.resolved_branch_id;
      const agentId = validationResult?.resolved_agent_id;
      const referralId = validationResult?.resolved_referral_id;

      // 5. Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          booking_code: (await supabase.rpc('generate_booking_code', { _package_code: (departure.package as any)?.code || '', _departure_date: departure.departure_date })).data || `TRA${Date.now().toString(36).toUpperCase()}`,
          departure_id: formData.departureId,
          customer_id: customer.id,
          room_type: mainRoomType,
          total_pax: totalPax,
          adult_count: adultCount,
          child_count: childCount,
          infant_count: infantCount,
          base_price: basePrice,
          total_price: totalPrice,
          notes: formData.notes,
          branch_id: branchId,
          agent_id: agentId,
        })
        .select('id, booking_code')
        .single();

      if (bookingError) throw bookingError;

      // 5.1 Handle coupon usage atomically if provided
      if (picState.couponCode) {
        try {
          const { error: couponError } = await supabase.rpc('increment_coupon_used' as any, { 
            p_code: picState.couponCode 
          });
          if (couponError) console.warn('Failed to increment coupon count:', couponError);
        } catch (couponErr) {
          console.warn('Coupon increment error:', couponErr);
        }
      }

      // 6. Create passengers
      for (let i = 0; i < formData.passengers.length; i++) {
        const passenger = formData.passengers[i];
        let passengerId = customer.id;
        
        if (i > 0) {
          const { data: passengerCustomer, error: passengerError } = await supabase
            .from('customers')
            .insert({ full_name: passenger.fullName, gender: passenger.gender, phone: passenger.phone || null })
            .select('id')
            .single();
          if (passengerError) throw passengerError;
          passengerId = passengerCustomer.id;
        }

        await supabase
          .from('booking_passengers')
          .insert({ booking_id: booking.id, customer_id: passengerId, is_main_passenger: i === 0, passenger_type: passenger.passengerType, room_preference: passenger.roomType });
      }

      // 7. Update departure booked count
      const { data: currentDeparture } = await supabase
        .from('departures')
        .select('booked_count')
        .eq('id', formData.departureId)
        .single();

      if (currentDeparture) {
        await supabase
          .from('departures')
          .update({ booked_count: (currentDeparture.booked_count || 0) + totalPax })
          .eq('id', formData.departureId);
      }

      // 8. Handle referral code if provided
      if (referralId) {
        try {
          // Get commission rate
          const { data: refCodeData } = await supabase
            .from('referral_codes')
            .select('commission_rate')
            .eq('id', referralId)
            .single();

          const commissionRate = refCodeData?.commission_rate || 2.5;
          const commissionAmount = (totalPrice * Number(commissionRate)) / 100;

          await supabase
            .from('referral_usages')
            .insert({ 
              referral_code_id: referralId, 
              booking_id: booking.id,
              referred_customer_id: customer.id,
              booking_amount: totalPrice,
              commission_amount: commissionAmount,
              commission_status: 'pending'
            });
        } catch (refErr) {
          console.warn('Referral tracking failed:', refErr);
        }
      }

      toast.success(`Booking berhasil dibuat! Kode: ${booking.booking_code}`);
      return { bookingId: booking.id, bookingCode: booking.booking_code };

    } catch (error: any) {
      console.error('Booking error:', error);
      toast.error(error.message || 'Gagal membuat booking');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateRoomAllocation = (allocation: RoomAllocation) => {
    const newPassengers = createPassengersFromAllocation(allocation);
    setFormData(prev => ({
      ...prev,
      roomAllocation: allocation,
      passengers: newPassengers.map((newP, idx) => {
        const oldP = prev.passengers[idx];
        if (oldP) {
          return { ...newP, fullName: oldP.fullName, gender: oldP.gender, phone: oldP.phone, passengerType: oldP.passengerType };
        }
        return newP;
      })
    }));
  };

  return { 
    currentStep, 
    setCurrentStep, 
    formData, 
    updateFormData, 
    isSubmitting, 
    submitBooking,
    updateRoomAllocation,
    picState,
    setPicState,
    picValidation,
    isValidatingPIC
  };
}
