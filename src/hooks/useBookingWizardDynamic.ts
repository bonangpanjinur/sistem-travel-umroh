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
  picSource: string;
  branchId?: string;
  agentId?: string;
  referralCode?: string;
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
  picData?: PICData
) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<BookingStep>('passengers');
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

      // 4. Determine PIC (branch_id, agent_id) from picData
      let branchId: string | null = null;
      let agentId: string | null = null;

      if (picData) {
        if (picData.picSource === 'cabang' && picData.branchId) {
          branchId = picData.branchId;
        } else if (picData.picSource === 'agen' && picData.agentId) {
          agentId = picData.agentId;
        }
      }

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
      if (picData?.picSource === 'referral' && picData.referralCode) {
        try {
          const { data: refCode } = await supabase
            .from('referral_codes')
            .select('id')
            .eq('code', picData.referralCode)
            .eq('is_active', true)
            .single();
          
          if (refCode) {
            await (supabase as any)
              .from('referral_usages')
              .insert({ referral_code_id: refCode.id, used_by_booking_id: booking.id });
          }
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

  return { currentStep, setCurrentStep, formData, updateFormData, isSubmitting, submitBooking };
}
