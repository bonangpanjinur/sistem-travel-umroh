import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { RoomType } from "@/types/database";
import { BookingStep } from "@/components/booking/BookingWizard";

export interface SimplePassengerData {
  id: string;
  fullName: string;
  gender: 'male' | 'female';
  phone: string;
  passengerType: 'adult' | 'child' | 'infant';
}

export interface SimpleBookingFormData {
  departureId: string;
  roomType: RoomType;
  passengers: SimplePassengerData[];
  notes?: string;
}

const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const createEmptyPassenger = (): SimplePassengerData => ({
  id: generateTempId(),
  fullName: '',
  gender: 'male',
  phone: '',
  passengerType: 'adult',
});

export function useBookingWizardSimple(
  packageId: string, 
  initialDepartureId?: string,
  initialRoomType?: RoomType
) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<BookingStep>('passengers');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<SimpleBookingFormData>({
    departureId: initialDepartureId || '',
    roomType: initialRoomType || 'quad',
    passengers: [createEmptyPassenger()],
  });

  const updateFormData = (updates: Partial<SimpleBookingFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const initializePassengers = (count: number) => {
    const passengers: SimplePassengerData[] = [];
    for (let i = 0; i < count; i++) {
      passengers.push(createEmptyPassenger());
    }
    setFormData(prev => ({ ...prev, passengers }));
  };

  const submitBooking = async () => {
    if (!user) {
      toast.error('Silakan login terlebih dahulu');
      return null;
    }

    setIsSubmitting(true);
    
    try {
      // 1. Get or create customer record for the user
      let { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!customer) {
        const mainPassenger = formData.passengers[0];
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            user_id: user.id,
            full_name: mainPassenger.fullName,
            gender: mainPassenger.gender,
            phone: mainPassenger.phone || null,
            email: user.email,
          })
          .select('id')
          .single();

        if (customerError) throw customerError;
        customer = newCustomer;
      }

      // 2. Get departure & package info for pricing
      const { data: departure, error: departureError } = await supabase
        .from('departures')
        .select(`
          id,
          package:packages(
            price_quad,
            price_triple,
            price_double,
            price_single
          )
        `)
        .eq('id', formData.departureId)
        .single();

      if (departureError || !departure?.package) throw new Error('Departure tidak ditemukan');

      // 3. Calculate pricing
      const pkg = departure.package as unknown as {
        price_quad: number;
        price_triple: number;
        price_double: number;
        price_single: number;
      };
      const priceMap: Record<RoomType, number> = {
        quad: pkg.price_quad,
        triple: pkg.price_triple,
        double: pkg.price_double,
        single: pkg.price_single,
      };
      
      const basePrice = priceMap[formData.roomType];
      const adultCount = formData.passengers.filter(p => p.passengerType === 'adult').length;
      const childCount = formData.passengers.filter(p => p.passengerType === 'child').length;
      const infantCount = formData.passengers.filter(p => p.passengerType === 'infant').length;
      const totalPax = formData.passengers.length;
      const totalPrice = basePrice * totalPax;

      // 4. Create booking (remaining_amount is auto-calculated from total_price - paid_amount)
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          booking_code: (await supabase.rpc('generate_booking_code')).data || `UMR${Date.now().toString(36).toUpperCase()}`,
          departure_id: formData.departureId,
          customer_id: customer.id,
          room_type: formData.roomType,
          total_pax: totalPax,
          adult_count: adultCount,
          child_count: childCount,
          infant_count: infantCount,
          base_price: basePrice,
          total_price: totalPrice,
          notes: formData.notes,
        })
        .select('id, booking_code')
        .single();

      if (bookingError) throw bookingError;

      // 5. Create customer records for additional passengers & booking_passengers
      for (const passenger of formData.passengers) {
        let passengerId = customer.id;
        
        // If not the main passenger, create a new customer record with minimal data
        if (passenger.id !== formData.passengers[0].id) {
          const { data: passengerCustomer, error: passengerError } = await supabase
            .from('customers')
            .insert({
              full_name: passenger.fullName,
              gender: passenger.gender,
              phone: passenger.phone || null,
            })
            .select('id')
            .single();

          if (passengerError) throw passengerError;
          passengerId = passengerCustomer.id;
        }

        // Create booking_passenger record
        await supabase
          .from('booking_passengers')
          .insert({
            booking_id: booking.id,
            customer_id: passengerId,
            is_main_passenger: passenger.id === formData.passengers[0].id,
            passenger_type: passenger.passengerType,
            room_preference: formData.roomType,
          });
      }

      // 6. Update departure booked count
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

  return {
    currentStep,
    setCurrentStep,
    formData,
    updateFormData,
    isSubmitting,
    submitBooking,
    initializePassengers,
  };
}
