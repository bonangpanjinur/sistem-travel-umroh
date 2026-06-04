// Database types for Umroh & Haji Management System

export type AppRole = 
  | 'super_admin'
  | 'owner'
  | 'it'
  | 'branch_manager'
  | 'finance'
  | 'operational'
  | 'sales'
  | 'marketing'
  | 'equipment'
  | 'agent'
  | 'sub_agent'
  | 'customer'
  | 'jamaah';

export type BookingStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus = 
  | 'pending'
  | 'partial'
  | 'paid'
  | 'refunded'
  | 'failed';

export type DocumentStatus = 
  | 'pending'
  | 'uploaded'
  | 'verified'
  | 'rejected'
  | 'expired';

export type PackageType = 
  | 'umroh'
  | 'haji'
  | 'haji_plus'
  | 'umroh_plus';

export type RoomType = 
  | 'quad'
  | 'triple'
  | 'double'
  | 'single';

export type GenderType = 
  | 'male'
  | 'female';

export type LeadStatus = 
  | 'new'
  | 'contacted'
  | 'follow_up'
  | 'negotiation'
  | 'closing'
  | 'won'
  | 'lost';

// Extended types with relations
export interface Branch {
  id: string;
  code: string;
  name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  branch_id: string | null;
  created_at: string;
}

export interface Hotel {
  id: string;
  name: string;
  city: string;
  star_rating: number | null;
  address: string | null;
  distance_to_masjid: string | null;
  facilities: string[] | null;
  images: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Airline {
  id: string;
  code: string;
  name: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Package {
  id: string;
  branch_id: string | null;
  code: string;
  name: string;
  package_type: PackageType;
  package_type_id: string | null;
  description: string | null;
  duration_days: number;
  hotel_makkah_id: string | null;
  hotel_madinah_id: string | null;
  airline_id: string | null;
  muthawif_id: string | null;
  includes: string[] | null;
  excludes: string[] | null;
  itinerary: any | null;
  price_quad: number;
  price_triple: number;
  price_double: number;
  price_single: number;
  currency: string;
  featured_image: string | null;
  gallery: string[] | null;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  hotel_makkah?: Hotel;
  hotel_madinah?: Hotel;
  airline?: Airline;
  departures?: Departure[];
  package_type_ref?: {
    id: string;
    code: string;
    name: string;
  };
}

export interface Departure {
  id: string;
  package_id: string;
  departure_date: string;
  return_date: string;
  quota: number;
  booked_count: number;
  departure_airport_id: string | null;
  arrival_airport_id: string | null;
  flight_number: string | null;
  departure_time: string | null;
  status: string;
  price_quad: number | null;
  price_triple: number | null;
  price_double: number | null;
  price_single: number | null;
  created_at: string;
  updated_at: string;
  // Computed
  available_seats?: number;
  // Relations
  package?: Package;
  airline?: Airline;
  hotel_makkah?: Hotel;
  hotel_madinah?: Hotel;
}

export interface Customer {
  id: string;
  user_id: string | null;
  branch_id: string | null;
  nik: string | null;
  passport_number: string | null;
  passport_expiry: string | null;
  full_name: string;
  birth_place: string | null;
  birth_date: string | null;
  gender: GenderType | null;
  marital_status: string | null;
  blood_type: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relation: string | null;
  father_name: string | null;
  mother_name: string | null;
  mahram_name: string | null;
  mahram_relation: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  booking_code: string;
  branch_id: string | null;
  departure_id: string;
  customer_id: string;
  agent_id: string | null;
  sales_id: string | null;
  room_type: RoomType;
  total_pax: number;
  adult_count: number;
  child_count: number;
  infant_count: number;
  base_price: number;
  addons_price: number;
  discount_amount: number;
  discount_label?: string | null;
  total_price: number;
  paid_amount: number;
  remaining_amount: number;
  currency: string;
  booking_status: BookingStatus;
  payment_status: PaymentStatus;
  notes: string | null;
  payment_deadline?: string | null;
  room_breakdown?: Record<string, number> | null;
  created_at: string;
  updated_at: string;
  // Relations
  departure?: Departure & {
    package?: {
      id: string;
      name: string;
      code: string;
    }
  };
  customer?: Customer;
  branch?: {
    id: string;
    name: string;
  };
}

export interface Payment {
  id: string;
  booking_id: string;
  payment_code: string;
  amount: number;
  payment_method: string | null;
  payment_type: string | null;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  proof_url: string | null;
  status: PaymentStatus;
  transaction_id: string | null;
  verified_at: string | null;
  verified_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  booking?: Booking;
}

export interface Coupon {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  link: string | null;
  created_at: string;
}

// Booking wizard form types
export interface BookingPassengerForm {
  full_name: string;
  nik: string;
  passport_number: string;
  passport_expiry: string;
  birth_place: string;
  birth_date: string;
  gender: GenderType;
  phone: string;
  email: string;
  passenger_type: 'adult' | 'child' | 'infant';
}

export interface BookingFormData {
  departure_id: string;
  room_type: RoomType;
  adult_count: number;
  child_count: number;
  infant_count: number;
  passengers: BookingPassengerForm[];
  coupon_code?: string;
  notes?: string;
}

// Dashboard stats
export interface Lead {
  id: string;
  branch_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  status: LeadStatus;
  package_interest: string | null;
  notes: string | null;
  assigned_to: string | null;
  follow_up_date: string | null;
  converted_at: string | null;
  converted_booking_id: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  package?: {
    id: string;
    name: string;
    code: string;
    price_quad: number;
  };
  branch?: {
    name: string;
  };
  assigned_profile?: {
    full_name: string | null;
  };
  converted_booking?: {
    id: string;
    booking_code: string;
  };
}

export interface Vendor {
  id: string;
  name: string;
  vendor_type: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorCost {
  id: string;
  departure_id: string;
  vendor_id: string;
  cost_type: string;
  description: string | null;
  amount: number;
  due_date: string | null;
  paid_amount: number;
  status: 'pending' | 'partial' | 'paid';
  created_at: string;
  updated_at: string;
  // Relations
  vendor?: {
    name: string;
    vendor_type: string;
  };
}

export interface DashboardStats {
  total_revenue: number;
  total_bookings: number;
  total_customers: number;
  pending_payments: number;
  occupancy_rate: number;
  revenue_by_month: { month: string; amount: number }[];
  bookings_by_status: { status: string; count: number }[];
}
