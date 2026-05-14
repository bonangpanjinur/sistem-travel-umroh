import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { RoomType } from "@/types/database";
import { BookingStep } from "@/components/booking/BookingWizard";
import { createGuestAccount, linkGuestCustomerToUser } from "@/services/guestCheckoutService";

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
  email?: string;
  passengerType: 'adult' | 'child' | 'infant';
  roomType: RoomType;
}

export interface DynamicBookingFormData {
  departureId: string;
  roomAllocation: RoomAllocation;
  passengers: DynamicPassengerData[];
  notes?: string;
  paymentMode?: 'full' | 'dp' | 'savings';
  dpAmount?: number;
  savingsPlanId?: string;
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
  initialPax: number = 0,
  bookingMode: string = 'umroh'
) {
  const isHaji = bookingMode === 'haji';
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<BookingStep>((!isHaji && initialPax > 0) ? 'rooms' : 'passengers');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const initialPassengers = useMemo(() => {
    if (isHaji) {
      // Haji: mulai dengan 1 orang dewasa default
      return [{ id: generateTempId(), fullName: '', gender: 'male' as const, phone: '', passengerType: 'adult' as const, roomType: 'quad' as RoomType }];
    }
    return createPassengersFromAllocation(initialRoomAllocation);
  }, [isHaji, initialRoomAllocation.quad, initialRoomAllocation.triple, initialRoomAllocation.double, initialRoomAllocation.single]);
  
  const [formData, setFormData] = useState<DynamicBookingFormData>({
    departureId: initialDepartureId,
    roomAllocation: initialRoomAllocation,
    passengers: initialPassengers,
    paymentMode: 'full',
    dpAmount: 0,
  });

  const [picState, setPicState] = useState<PICData>(picData || { picSource: 'pusat' });
  const [picValidation, setPicValidation] = useState<{ isValid: boolean; errorMessage?: string; resolvedBranchId?: string; resolvedAgentId?: string; resolvedReferralId?: string; metadata?: any }>({ isValid: true });
  const [isValidatingPIC, setIsValidatingPIC] = useState(false);
  const [cancellationAgreed, setCancellationAgreed] = useState<boolean | null>(null);

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
    setIsSubmitting(true);
    
    try {
      let customerId: string | null = null;
      let userEmail: string | null = user?.email || null;

      // 1. Handle Customer Record (Logged In Required)
      if (!user) throw new Error('Anda harus login untuk melakukan pemesanan');

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
            email: user.email 
          })
          .select('id')
          .single();
        if (customerError) throw customerError;
        customerId = newCustomer.id;
      } else {
        customerId = customer.id;
      }

      if (!customerId) throw new Error('Gagal memproses data pelanggan');

      // 2. Get departure info (incl. package currency for multi-currency snapshot)
      const { data: departure, error: departureError } = await supabase
        .from('departures')
        .select('id, departure_date, price_quad, price_triple, price_double, price_single, price_adult, price_child, price_infant, package:packages(code, currency, booking_mode)')
        .eq('id', formData.departureId)
        .single();

      if (departureError || !departure) throw new Error('Departure tidak ditemukan');

      const departureBookingMode: string = (departure as any).package?.booking_mode || bookingMode;
      const useAgeBasedPricing = departureBookingMode === 'haji' ||
        ((departure as any).price_adult && (departure as any).price_adult > 0);

      // 3. Calculate pricing
      const priceMap: Record<RoomType, number> = {
        quad: departure.price_quad || 0, triple: departure.price_triple || 0,
        double: departure.price_double || 0, single: departure.price_single || 0,
      };

      const agePriceMap: Record<string, number> = {
        adult: (departure as any).price_adult || 0,
        child: (departure as any).price_child || 0,
        infant: (departure as any).price_infant || 0,
      };
      
      const adultCount = formData.passengers.filter(p => p.passengerType === 'adult').length;
      const childCount = formData.passengers.filter(p => p.passengerType === 'child').length;
      const infantCount = formData.passengers.filter(p => p.passengerType === 'infant').length;
      const totalPax = formData.passengers.length;

      let totalPrice = 0;
      let basePrice = 0;
      let mainRoomType: RoomType = 'quad';

      if (useAgeBasedPricing) {
        // Model harga per usia: adult × harga_dewasa + child × harga_anak + infant × harga_bayi
        totalPrice = adultCount * agePriceMap.adult
          + childCount * agePriceMap.child
          + infantCount * agePriceMap.infant;
        basePrice = agePriceMap.adult;
        mainRoomType = 'quad'; // default, tidak relevan untuk haji
      } else {
        // Model harga per tipe kamar (umroh/wisata)
        for (const passenger of formData.passengers) {
          totalPrice += priceMap[passenger.roomType];
        }
        const roomCounts = formData.passengers.reduce((acc, p) => {
          acc[p.roomType] = (acc[p.roomType] || 0) + 1;
          return acc;
        }, {} as Record<RoomType, number>);
        mainRoomType = (Object.entries(roomCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'quad') as RoomType;
        basePrice = priceMap[mainRoomType];
      }

      // 3.1 Multi-currency snapshot (BOOK-FIX1 / CUR-7)
      const pkgCurrency: string = (departure as any).package?.currency || 'IDR';
      let exchangeRate = 1;
      if (pkgCurrency.toUpperCase() !== 'IDR') {
        const { data: rateRes } = await supabase.rpc('get_active_exchange_rate' as any, {
          _currency_from: pkgCurrency,
          _currency_to: 'IDR',
        });
        exchangeRate = Number(rateRes) || 1;
      }
      const totalPriceOriginal = totalPrice;
      const totalPriceIdr = totalPrice * exchangeRate;

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
      const { data: bookingCodeData, error: bookingCodeError } = await supabase.rpc('generate_booking_code', { _package_code: (departure.package as any)?.code || '', _departure_date: departure.departure_date });
      if (bookingCodeError) throw bookingCodeError;
      const bookingCode = bookingCodeData || `TRA${Date.now().toString(36).toUpperCase()}`;
      
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          booking_code: bookingCode,
          departure_id: formData.departureId,
          customer_id: customerId,
          room_type: mainRoomType,
          total_pax: totalPax,
          adult_count: adultCount,
          child_count: childCount,
          infant_count: infantCount,
          base_price: basePrice,
          total_price: totalPrice,
          currency: pkgCurrency,
          exchange_rate: exchangeRate,
          total_price_original: totalPriceOriginal,
          total_price_idr: totalPriceIdr,
          notes: formData.notes,
          branch_id: branchId,
          agent_id: agentId,
          payment_mode: formData.paymentMode || 'full',
          dp_amount: formData.paymentMode === 'dp' ? (formData.dpAmount || 0) : 0,
          savings_plan_id: formData.paymentMode === 'savings' ? (formData.savingsPlanId || null) : null,
        } as any)
        .select('id, booking_code')
        .single();

      if (bookingError) throw bookingError;

      // 5.0 Create initial payment record(s) sesuai mode pembayaran
      try {
        const paymentMode = formData.paymentMode || 'full';
        const { data: pCode } = await supabase.rpc('generate_payment_code' as any);
        const baseCode = pCode || `PAY${Date.now().toString(36).toUpperCase()}`;

        if (paymentMode === 'full') {
          await supabase.from('payments').insert({
            booking_id: booking.id,
            payment_code: baseCode,
            amount: totalPrice,
            status: 'pending',
            notes: 'Pembayaran lunas — menunggu transfer & verifikasi',
          } as any);
        } else if (paymentMode === 'dp') {
          const dp = Math.max(0, Math.min(totalPrice, formData.dpAmount || 0));
          await supabase.from('payments').insert({
            booking_id: booking.id,
            payment_code: baseCode,
            amount: dp,
            status: 'pending',
            notes: `Uang muka (DP). Sisa pelunasan ${(totalPrice - dp).toLocaleString('id-ID')} jatuh tempo H-30.`,
          } as any);
        } else if (paymentMode === 'savings' && formData.savingsPlanId) {
          // Tarik saldo tabungan: ambil paid_amount, kurangi sebesar min(saldo, total)
          const { data: plan } = await (supabase as any)
            .from('savings_plans')
            .select('id, paid_amount, remaining_amount, target_amount')
            .eq('id', formData.savingsPlanId)
            .maybeSingle();
          const saldo = Number(plan?.paid_amount || 0);
          const useFromSavings = Math.min(saldo, totalPrice);
          const shortfall = Math.max(0, totalPrice - useFromSavings);

          // Catat pembayaran terverifikasi dari saldo tabungan
          if (useFromSavings > 0) {
            await supabase.from('payments').insert({
              booking_id: booking.id,
              payment_code: baseCode,
              amount: useFromSavings,
              status: 'paid',
              payment_method: 'savings',
              notes: `Dibayar dari Tabungan Umroh (plan ${formData.savingsPlanId})`,
              verified_at: new Date().toISOString(),
            } as any);

            // Tandai plan dikonversi & kurangi saldo
            await (supabase as any)
              .from('savings_plans')
              .update({
                paid_amount: Math.max(0, saldo - useFromSavings),
                converted_booking_id: booking.id,
                status: shortfall === 0 ? 'completed' : 'active',
                updated_at: new Date().toISOString(),
              })
              .eq('id', formData.savingsPlanId);
          }

          // Sisa kekurangan jadi payment pending baru
          if (shortfall > 0) {
            const { data: pCode2 } = await supabase.rpc('generate_payment_code' as any);
            await supabase.from('payments').insert({
              booking_id: booking.id,
              payment_code: pCode2 || `${baseCode}-2`,
              amount: shortfall,
              status: 'pending',
              notes: 'Sisa pelunasan setelah penggunaan saldo tabungan',
            } as any);
          }
        }
      } catch (payErr) {
        console.warn('Initial payment creation failed:', payErr);
      }

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
        let passengerId = customerId;
        
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

      // Auto-pair Double room passengers (chunks of 2)
      try {
        const { data: bps } = await supabase
          .from('booking_passengers')
          .select('id, room_preference')
          .eq('booking_id', booking.id);
        const doubles = (bps || []).filter((p: any) => p.room_preference === 'double');
        for (let j = 0; j + 1 < doubles.length; j += 2) {
          const a = doubles[j].id, b = doubles[j + 1].id;
          await supabase.from('booking_passengers').update({ roommate_id: b }).eq('id', a);
          await supabase.from('booking_passengers').update({ roommate_id: a }).eq('id', b);
        }
      } catch (e) {
        console.warn('Auto-pair double failed:', e);
      }

      // 7. booked_count disinkronkan otomatis oleh trigger DB sync_departure_booked_count

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
              referred_customer_id: customerId,
              booking_amount: totalPrice,
              commission_amount: commissionAmount,
              commission_status: 'pending'
            });
        } catch (refErr) {
          console.warn('Referral tracking failed:', refErr);
        }
      }

      // 9. For guest checkout, create auto-account
      if (!user && userEmail && customerId) {
        try {
          const mainPassenger = formData.passengers[0];
          const accountResult = await createGuestAccount(
            userEmail,
            mainPassenger.fullName,
            mainPassenger.phone
          );

          if (accountResult.success && accountResult.userId) {
            // Link the customer to the newly created user
            await linkGuestCustomerToUser(customerId, accountResult.userId);
            toast.success(`Booking berhasil! Akun Anda telah dibuat. Cek email untuk mengatur kata sandi.`);
          } else {
            // Booking succeeded but account creation failed - still show success
            toast.success(`Booking berhasil dibuat! Kode: ${booking.booking_code}`);
            console.warn('Guest account creation failed:', accountResult.message);
          }
        } catch (accountErr) {
          console.warn('Guest account creation error:', accountErr);
          // Don't fail the booking if account creation fails
          toast.success(`Booking berhasil dibuat! Kode: ${booking.booking_code}`);
        }
      } else {
        toast.success(`Booking berhasil dibuat! Kode: ${booking.booking_code}`);
      }

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

  // PAK-F6: Haji — tambah jamaah per tipe usia
  const addHajiPassenger = (type: 'adult' | 'child' | 'infant') => {
    const newPassenger: DynamicPassengerData = {
      id: generateTempId(),
      fullName: '',
      gender: 'male',
      phone: '',
      passengerType: type,
      roomType: 'quad', // tidak relevan untuk haji, diset default
    };
    setFormData(prev => ({
      ...prev,
      passengers: [...prev.passengers, newPassenger],
    }));
  };

  // PAK-F6: Haji — hapus jamaah (tidak bisa hapus pemesan utama index 0)
  const removeHajiPassenger = (id: string) => {
    setFormData(prev => {
      if (prev.passengers.length <= 1) return prev; // minimal 1 jamaah
      const idx = prev.passengers.findIndex(p => p.id === id);
      if (idx === 0) return prev; // pemesan utama tidak bisa dihapus
      return { ...prev, passengers: prev.passengers.filter(p => p.id !== id) };
    });
  };

  return { 
    currentStep, 
    setCurrentStep, 
    formData, 
    updateFormData, 
    isSubmitting, 
    submitBooking,
    updateRoomAllocation,
    addHajiPassenger,
    removeHajiPassenger,
    isHaji,
    picState,
    setPicState,
    picValidation,
    isValidatingPIC,
    cancellationAgreed,
    setCancellationAgreed,
  };
}
