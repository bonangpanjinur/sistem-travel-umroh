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

const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

function createPassengersFromAllocation(allocation: RoomAllocation): DynamicPassengerData[] {
  const passengers: DynamicPassengerData[] = [];
  
  // Create passengers for each room type
  for (let i = 0; i < allocation.quad; i++) {
    passengers.push({
      id: generateTempId(),
      fullName: '',
      gender: 'male',
      phone: '',
      passengerType: 'adult',
      roomType: 'quad',
    });
  }
  
  for (let i = 0; i < allocation.triple; i++) {
    passengers.push({
      id: generateTempId(),
      fullName: '',
      gender: 'male',
      phone: '',
      passengerType: 'adult',
      roomType: 'triple',
    });
  }
  
  for (let i = 0; i < allocation.double; i++) {
    passengers.push({
      id: generateTempId(),
      fullName: '',
      gender: 'male',
      phone: '',
      passengerType: 'adult',
      roomType: 'double',
    });
  }
  
  for (let i = 0; i < allocation.single; i++) {
    passengers.push({
      id: generateTempId(),
      fullName: '',
      gender: 'male',
      phone: '',
      passengerType: 'adult',
      roomType: 'single',
    });
  }
  
  return passengers;
}

export function useBookingWizardDynamic(
  packageId: string, 
  initialDepartureId: string,
  initialRoomAllocation: RoomAllocation
) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<BookingStep>('passengers');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize passengers based on room allocation
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

      // 2. Get departure info for pricing (use departure-specific prices which override package prices)
      const { data: departure, error: departureError } = await supabase
        .from('departures')
        .select('id, price_quad, price_triple, price_double, price_single')
        .eq('id', formData.departureId)
        .single();

      if (departureError || !departure) throw new Error('Departure tidak ditemukan');

      // 3. Calculate pricing based on each passenger's room type (using departure prices)
      const priceMap: Record<RoomType, number> = {
        quad: departure.price_quad || 0,
        triple: departure.price_triple || 0,
        double: departure.price_double || 0,
        single: departure.price_single || 0,
      };
      
      // Calculate total price based on individual room types
      let totalPrice = 0;
      for (const passenger of formData.passengers) {
        totalPrice += priceMap[passenger.roomType];
      }
      
      const adultCount = formData.passengers.filter(p => p.passengerType === 'adult').length;
      const childCount = formData.passengers.filter(p => p.passengerType === 'child').length;
      const infantCount = formData.passengers.filter(p => p.passengerType === 'infant').length;
      const totalPax = formData.passengers.length;
      
      // Use the most common room type as the "main" room type for the booking record
      const roomCounts = formData.passengers.reduce((acc, p) => {
        acc[p.roomType] = (acc[p.roomType] || 0) + 1;
        return acc;
      }, {} as Record<RoomType, number>);
      
      const mainRoomType = (Object.entries(roomCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'quad') as RoomType;
      const basePrice = priceMap[mainRoomType];

      // 4. Create booking (remaining_amount is auto-calculated from total_price - paid_amount)
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          booking_code: (await supabase.rpc('generate_booking_code')).data || `UMR${Date.now().toString(36).toUpperCase()}`,
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
        })
        .select('id, booking_code')
        .single();

      if (bookingError) throw bookingError;

      // 5. Create customer records for additional passengers & booking_passengers
      for (let i = 0; i < formData.passengers.length; i++) {
        const passenger = formData.passengers[i];
        let passengerId = customer.id;
        
        // If not the main passenger, create a new customer record with minimal data
        if (i > 0) {
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

        // Create booking_passenger record with individual room preference
        await supabase
          .from('booking_passengers')
          .insert({
            booking_id: booking.id,
            customer_id: passengerId,
            is_main_passenger: i === 0,
            passenger_type: passenger.passengerType,
            room_preference: passenger.roomType,
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
  };
}
