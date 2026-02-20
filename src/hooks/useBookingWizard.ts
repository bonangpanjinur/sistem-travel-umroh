import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { RoomType } from "@/types/database";

// Old booking step type (kept for backward compatibility)
type LegacyBookingStep = 'departure' | 'passengers' | 'documents' | 'room' | 'review';

export interface PassengerData {
  id: string;
  fullName: string;
  nik: string;
  passportNumber: string;
  passportExpiry: string;
  birthPlace: string;
  birthDate: string;
  gender: 'male' | 'female';
  phone: string;
  email: string;
  passengerType: 'adult' | 'child' | 'infant';
  ktpUrl?: string;
  passportUrl?: string;
}

export interface BookingFormData {
  departureId: string;
  roomType: RoomType;
  passengers: PassengerData[];
  couponCode?: string;
  notes?: string;
}

const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const createEmptyPassenger = (): PassengerData => ({
  id: generateTempId(),
  fullName: '',
  nik: '',
  passportNumber: '',
  passportExpiry: '',
  birthPlace: '',
  birthDate: '',
  gender: 'male',
  phone: '',
  email: '',
  passengerType: 'adult',
});

export function useBookingWizard(packageId: string, initialDepartureId?: string) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<LegacyBookingStep>('departure');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<BookingFormData>({
    departureId: initialDepartureId || '',
    roomType: 'quad',
    passengers: [createEmptyPassenger()],
  });

  const updateFormData = (updates: Partial<BookingFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const addPassenger = () => {
    setFormData(prev => ({
      ...prev,
      passengers: [...prev.passengers, createEmptyPassenger()],
    }));
  };

  const removePassenger = (id: string) => {
    setFormData(prev => ({
      ...prev,
      passengers: prev.passengers.filter(p => p.id !== id),
    }));
  };

  const updatePassenger = (id: string, updates: Partial<PassengerData>) => {
    setFormData(prev => ({
      ...prev,
      passengers: prev.passengers.map(p => 
        p.id === id ? { ...p, ...updates } : p
      ),
    }));
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
            nik: mainPassenger.nik,
            passport_number: mainPassenger.passportNumber,
            passport_expiry: mainPassenger.passportExpiry || null,
            birth_place: mainPassenger.birthPlace,
            birth_date: mainPassenger.birthDate || null,
            gender: mainPassenger.gender,
            phone: mainPassenger.phone,
            email: mainPassenger.email || user.email,
          })
          .select('id')
          .single();

        if (customerError) throw customerError;
        customer = newCustomer;
      }

      // 2. Get departure info for pricing (now from departure, not package)
      const { data: departure, error: departureError } = await supabase
        .from('departures')
        .select(`
          id,
          price_quad,
          price_triple,
          price_double,
          price_single
        `)
        .eq('id', formData.departureId)
        .single();

      if (departureError || !departure) throw new Error('Departure tidak ditemukan');

      // 3. Calculate pricing from departure
      const priceMap: Record<RoomType, number> = {
        quad: departure.price_quad || 0,
        triple: departure.price_triple || 0,
        double: departure.price_double || 0,
        single: departure.price_single || 0,
      };
      
      const basePrice = priceMap[formData.roomType];
      const adultCount = formData.passengers.filter(p => p.passengerType === 'adult').length;
      const childCount = formData.passengers.filter(p => p.passengerType === 'child').length;
      const infantCount = formData.passengers.filter(p => p.passengerType === 'infant').length;
      const totalPax = formData.passengers.length;
      const totalPrice = basePrice * totalPax;

      // 4. Create booking
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
          remaining_amount: totalPrice,
          notes: formData.notes,
        })
        .select('id, booking_code')
        .single();

      if (bookingError) throw bookingError;

      // 5. Create customer records for additional passengers & booking_passengers
      for (const passenger of formData.passengers) {
        let passengerId = customer.id;
        
        // If not the main passenger, create a new customer record
        if (passenger.id !== formData.passengers[0].id) {
          const { data: passengerCustomer, error: passengerError } = await supabase
            .from('customers')
            .insert({
              full_name: passenger.fullName,
              nik: passenger.nik,
              passport_number: passenger.passportNumber,
              passport_expiry: passenger.passportExpiry || null,
              birth_place: passenger.birthPlace,
              birth_date: passenger.birthDate || null,
              gender: passenger.gender,
              phone: passenger.phone,
              email: passenger.email,
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

      // 6. Update departure booked count manually
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
    addPassenger,
    removePassenger,
    updatePassenger,
    isSubmitting,
    submitBooking,
  };
}
