-- =====================================================
-- SISTEM MANAJEMEN UMROH & HAJI - DATABASE FOUNDATION
-- =====================================================

-- 1. ENUM TYPES
-- =====================================================

-- App Roles Enum
CREATE TYPE public.app_role AS ENUM (
  'super_admin',
  'owner',
  'branch_manager',
  'finance',
  'operational',
  'sales',
  'marketing',
  'equipment',
  'agent',
  'customer'
);

-- Booking Status
CREATE TYPE public.booking_status AS ENUM (
  'pending',
  'confirmed',
  'processing',
  'completed',
  'cancelled',
  'refunded'
);

-- Payment Status
CREATE TYPE public.payment_status AS ENUM (
  'pending',
  'partial',
  'paid',
  'refunded',
  'failed'
);

-- Document Status
CREATE TYPE public.document_status AS ENUM (
  'pending',
  'uploaded',
  'verified',
  'rejected',
  'expired'
);

-- Package Type
CREATE TYPE public.package_type AS ENUM (
  'umroh',
  'haji',
  'haji_plus',
  'umroh_plus'
);

-- Room Type
CREATE TYPE public.room_type AS ENUM (
  'quad',
  'triple',
  'double',
  'single'
);

-- Gender
CREATE TYPE public.gender_type AS ENUM (
  'male',
  'female'
);

-- Lead Status
CREATE TYPE public.lead_status AS ENUM (
  'new',
  'contacted',
  'follow_up',
  'negotiation',
  'closing',
  'won',
  'lost'
);

-- 2. CORE TABLES
-- =====================================================

-- Branches (Cabang)
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User Roles (RBAC)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role, branch_id)
);

-- Profiles (Extended User Info)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(50),
  avatar_url TEXT,
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. MASTER DATA TABLES
-- =====================================================

-- Airlines (Maskapai)
CREATE TABLE public.airlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Airports (Bandara)
CREATE TABLE public.airports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Hotels
CREATE TABLE public.hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL, -- 'makkah' or 'madinah'
  star_rating INTEGER DEFAULT 3,
  address TEXT,
  distance_to_masjid VARCHAR(100),
  facilities TEXT[],
  images TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Muthawif (Tour Guide)
CREATE TABLE public.muthawifs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  photo_url TEXT,
  languages TEXT[],
  experience_years INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bus Providers
CREATE TABLE public.bus_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Document Types
CREATE TABLE public.document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_required BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. PACKAGE & DEPARTURE TABLES
-- =====================================================

-- Packages (Paket Umroh/Haji)
CREATE TABLE public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  package_type package_type NOT NULL DEFAULT 'umroh',
  description TEXT,
  duration_days INTEGER NOT NULL DEFAULT 9,
  hotel_makkah_id UUID REFERENCES public.hotels(id),
  hotel_madinah_id UUID REFERENCES public.hotels(id),
  airline_id UUID REFERENCES public.airlines(id),
  muthawif_id UUID REFERENCES public.muthawifs(id),
  includes TEXT[],
  excludes TEXT[],
  itinerary JSONB,
  price_quad DECIMAL(15,2) NOT NULL DEFAULT 0,
  price_triple DECIMAL(15,2) NOT NULL DEFAULT 0,
  price_double DECIMAL(15,2) NOT NULL DEFAULT 0,
  price_single DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'IDR',
  featured_image TEXT,
  gallery TEXT[],
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Departures (Keberangkatan)
CREATE TABLE public.departures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES public.packages(id) ON DELETE CASCADE NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE NOT NULL,
  quota INTEGER NOT NULL DEFAULT 45,
  booked_count INTEGER DEFAULT 0,
  departure_airport_id UUID REFERENCES public.airports(id),
  arrival_airport_id UUID REFERENCES public.airports(id),
  flight_number VARCHAR(50),
  departure_time TIME,
  status VARCHAR(50) DEFAULT 'open', -- open, closed, departed, completed
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. CUSTOMER & JAMAAH TABLES
-- =====================================================

-- Customers (Jamaah Master Data)
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  nik VARCHAR(20),
  passport_number VARCHAR(50),
  passport_expiry DATE,
  full_name VARCHAR(255) NOT NULL,
  birth_place VARCHAR(100),
  birth_date DATE,
  gender gender_type,
  marital_status VARCHAR(50),
  blood_type VARCHAR(5),
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  postal_code VARCHAR(10),
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  emergency_contact_relation VARCHAR(100),
  father_name VARCHAR(255),
  mother_name VARCHAR(255),
  mahram_name VARCHAR(255),
  mahram_relation VARCHAR(100),
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Customer Documents
CREATE TABLE public.customer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  document_type_id UUID REFERENCES public.document_types(id) NOT NULL,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  status document_status DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. BOOKING & TRANSACTION TABLES
-- =====================================================

-- Bookings (Pemesanan)
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code VARCHAR(50) UNIQUE NOT NULL,
  branch_id UUID REFERENCES public.branches(id),
  departure_id UUID REFERENCES public.departures(id) NOT NULL,
  customer_id UUID REFERENCES public.customers(id) NOT NULL,
  agent_id UUID REFERENCES auth.users(id),
  sales_id UUID REFERENCES auth.users(id),
  room_type room_type NOT NULL DEFAULT 'quad',
  total_pax INTEGER DEFAULT 1,
  adult_count INTEGER DEFAULT 1,
  child_count INTEGER DEFAULT 0,
  infant_count INTEGER DEFAULT 0,
  base_price DECIMAL(15,2) NOT NULL,
  addons_price DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  total_price DECIMAL(15,2) NOT NULL,
  paid_amount DECIMAL(15,2) DEFAULT 0,
  remaining_amount DECIMAL(15,2) GENERATED ALWAYS AS (total_price - paid_amount) STORED,
  currency VARCHAR(3) DEFAULT 'IDR',
  booking_status booking_status DEFAULT 'pending',
  payment_status payment_status DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Booking Passengers (Jamaah per Booking)
CREATE TABLE public.booking_passengers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) NOT NULL,
  is_main_passenger BOOLEAN DEFAULT false,
  passenger_type VARCHAR(20) DEFAULT 'adult', -- adult, child, infant
  room_preference room_type,
  special_requests TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  payment_code VARCHAR(50) UNIQUE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  payment_method VARCHAR(100),
  bank_name VARCHAR(100),
  account_number VARCHAR(100),
  account_name VARCHAR(255),
  proof_url TEXT,
  status payment_status DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. COUPONS & DISCOUNTS
-- =====================================================

CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) DEFAULT 'percentage', -- percentage, fixed
  discount_value DECIMAL(15,2) NOT NULL,
  min_purchase DECIMAL(15,2) DEFAULT 0,
  max_discount DECIMAL(15,2),
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from DATE,
  valid_until DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. AGENT & COMMISSION
-- =====================================================

CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  branch_id UUID REFERENCES public.branches(id),
  agent_code VARCHAR(50) UNIQUE NOT NULL,
  company_name VARCHAR(255),
  npwp VARCHAR(50),
  bank_name VARCHAR(100),
  bank_account_number VARCHAR(100),
  bank_account_name VARCHAR(255),
  commission_rate DECIMAL(5,2) DEFAULT 5.00, -- percentage
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.agent_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  commission_amount DECIMAL(15,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, paid
  paid_at TIMESTAMPTZ,
  paid_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. CRM & LEADS
-- =====================================================

CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id),
  assigned_to UUID REFERENCES auth.users(id),
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  source VARCHAR(100), -- website, referral, social_media, etc
  package_interest UUID REFERENCES public.packages(id),
  status lead_status DEFAULT 'new',
  notes TEXT,
  follow_up_date DATE,
  converted_at TIMESTAMPTZ,
  converted_booking_id UUID REFERENCES public.bookings(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. OPERATIONAL TABLES
-- =====================================================

-- Manifest
CREATE TABLE public.manifests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id UUID REFERENCES public.departures(id) ON DELETE CASCADE NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id),
  file_url TEXT,
  version INTEGER DEFAULT 1
);

-- Attendance (Check-in)
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id UUID REFERENCES public.departures(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  checkpoint VARCHAR(100) NOT NULL, -- airport_departure, hotel_makkah, hotel_madinah, airport_return
  checked_in_at TIMESTAMPTZ DEFAULT now(),
  checked_in_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Luggage
CREATE TABLE public.luggage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id UUID REFERENCES public.departures(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  tag_code VARCHAR(50) UNIQUE NOT NULL,
  weight_kg DECIMAL(5,2),
  status VARCHAR(50) DEFAULT 'registered', -- registered, checked_in, loaded, delivered
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Equipment Distribution
CREATE TABLE public.equipment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  stock_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.equipment_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id UUID REFERENCES public.departures(id),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  equipment_id UUID REFERENCES public.equipment_items(id) NOT NULL,
  quantity INTEGER DEFAULT 1,
  distributed_at TIMESTAMPTZ DEFAULT now(),
  distributed_by UUID REFERENCES auth.users(id)
);

-- 11. AUDIT LOG
-- =====================================================

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100),
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. NOTIFICATIONS
-- =====================================================

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info', -- info, success, warning, error
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- SECURITY DEFINER FUNCTIONS
-- =====================================================

-- Function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user has any admin role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'owner', 'branch_manager')
  )
$$;

-- Function to check if user belongs to branch
CREATE OR REPLACE FUNCTION public.user_belongs_to_branch(_user_id UUID, _branch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (branch_id = _branch_id OR branch_id IS NULL)
  )
$$;

-- Function to get user's branch_id
CREATE OR REPLACE FUNCTION public.get_user_branch_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT branch_id
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muthawifs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.luggage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- BRANCHES POLICIES
CREATE POLICY "Branches are viewable by everyone" ON public.branches FOR SELECT USING (true);
CREATE POLICY "Branches are manageable by admins" ON public.branches FOR ALL USING (public.is_admin(auth.uid()));

-- USER ROLES POLICIES
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.is_admin(auth.uid()));

-- PROFILES POLICIES
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- MASTER DATA POLICIES (Public Read)
CREATE POLICY "Airlines are viewable by everyone" ON public.airlines FOR SELECT USING (true);
CREATE POLICY "Airlines are manageable by admins" ON public.airlines FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Airports are viewable by everyone" ON public.airports FOR SELECT USING (true);
CREATE POLICY "Airports are manageable by admins" ON public.airports FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Hotels are viewable by everyone" ON public.hotels FOR SELECT USING (true);
CREATE POLICY "Hotels are manageable by admins" ON public.hotels FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Muthawifs are viewable by everyone" ON public.muthawifs FOR SELECT USING (true);
CREATE POLICY "Muthawifs are manageable by admins" ON public.muthawifs FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Bus providers are viewable by everyone" ON public.bus_providers FOR SELECT USING (true);
CREATE POLICY "Bus providers are manageable by admins" ON public.bus_providers FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Document types are viewable by everyone" ON public.document_types FOR SELECT USING (true);
CREATE POLICY "Document types are manageable by admins" ON public.document_types FOR ALL USING (public.is_admin(auth.uid()));

-- PACKAGES & DEPARTURES POLICIES
CREATE POLICY "Packages are viewable by everyone" ON public.packages FOR SELECT USING (is_active = true);
CREATE POLICY "Packages are manageable by admins" ON public.packages FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Departures are viewable by everyone" ON public.departures FOR SELECT USING (true);
CREATE POLICY "Departures are manageable by admins" ON public.departures FOR ALL USING (public.is_admin(auth.uid()));

-- CUSTOMERS POLICIES
CREATE POLICY "Customers can view own data" ON public.customers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Staff can view all customers" ON public.customers FOR SELECT USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'sales') OR public.has_role(auth.uid(), 'operational'));
CREATE POLICY "Customers can insert own data" ON public.customers FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Customers can update own data" ON public.customers FOR UPDATE USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- CUSTOMER DOCUMENTS POLICIES
CREATE POLICY "Users can view own documents" ON public.customer_documents FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.customers WHERE customers.id = customer_documents.customer_id AND customers.user_id = auth.uid())
);
CREATE POLICY "Staff can view all documents" ON public.customer_documents FOR SELECT USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'operational'));
CREATE POLICY "Users can upload own documents" ON public.customer_documents FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.customers WHERE customers.id = customer_documents.customer_id AND customers.user_id = auth.uid())
);
CREATE POLICY "Admins can manage documents" ON public.customer_documents FOR ALL USING (public.is_admin(auth.uid()));

-- BOOKINGS POLICIES
CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.customers WHERE customers.id = bookings.customer_id AND customers.user_id = auth.uid())
);
CREATE POLICY "Staff can view all bookings" ON public.bookings FOR SELECT USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'sales') OR public.has_role(auth.uid(), 'finance'));
CREATE POLICY "Users can create bookings" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage bookings" ON public.bookings FOR ALL USING (public.is_admin(auth.uid()));

-- BOOKING PASSENGERS POLICIES
CREATE POLICY "Users can view own booking passengers" ON public.booking_passengers FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.bookings b 
    JOIN public.customers c ON c.id = b.customer_id 
    WHERE b.id = booking_passengers.booking_id AND c.user_id = auth.uid()
  )
);
CREATE POLICY "Staff can view all passengers" ON public.booking_passengers FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can insert passengers" ON public.booking_passengers FOR INSERT WITH CHECK (true);

-- PAYMENTS POLICIES
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.bookings b 
    JOIN public.customers c ON c.id = b.customer_id 
    WHERE b.id = payments.booking_id AND c.user_id = auth.uid()
  )
);
CREATE POLICY "Staff can view all payments" ON public.payments FOR SELECT USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'finance'));
CREATE POLICY "Users can upload payment proof" ON public.payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Finance can manage payments" ON public.payments FOR ALL USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'finance'));

-- COUPONS POLICIES
CREATE POLICY "Active coupons are viewable" ON public.coupons FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage coupons" ON public.coupons FOR ALL USING (public.is_admin(auth.uid()));

-- AGENTS POLICIES
CREATE POLICY "Agents can view own data" ON public.agents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all agents" ON public.agents FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage agents" ON public.agents FOR ALL USING (public.is_admin(auth.uid()));

-- AGENT COMMISSIONS POLICIES
CREATE POLICY "Agents can view own commissions" ON public.agent_commissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.agents WHERE agents.id = agent_commissions.agent_id AND agents.user_id = auth.uid())
);
CREATE POLICY "Finance can manage commissions" ON public.agent_commissions FOR ALL USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'finance'));

-- LEADS POLICIES
CREATE POLICY "Sales can view assigned leads" ON public.leads FOR SELECT USING (
  assigned_to = auth.uid() OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'sales')
);
CREATE POLICY "Sales can create leads" ON public.leads FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'sales') OR public.is_admin(auth.uid()));
CREATE POLICY "Sales can update assigned leads" ON public.leads FOR UPDATE USING (assigned_to = auth.uid() OR public.is_admin(auth.uid()));

-- OPERATIONAL TABLES POLICIES
CREATE POLICY "Operational staff can view manifests" ON public.manifests FOR SELECT USING (public.has_role(auth.uid(), 'operational') OR public.is_admin(auth.uid()));
CREATE POLICY "Operational staff can manage manifests" ON public.manifests FOR ALL USING (public.has_role(auth.uid(), 'operational') OR public.is_admin(auth.uid()));

CREATE POLICY "Operational staff can view attendance" ON public.attendance FOR SELECT USING (public.has_role(auth.uid(), 'operational') OR public.is_admin(auth.uid()));
CREATE POLICY "Operational staff can manage attendance" ON public.attendance FOR ALL USING (public.has_role(auth.uid(), 'operational') OR public.is_admin(auth.uid()));

CREATE POLICY "Operational staff can view luggage" ON public.luggage FOR SELECT USING (public.has_role(auth.uid(), 'operational') OR public.is_admin(auth.uid()));
CREATE POLICY "Operational staff can manage luggage" ON public.luggage FOR ALL USING (public.has_role(auth.uid(), 'operational') OR public.is_admin(auth.uid()));

CREATE POLICY "Equipment items viewable by staff" ON public.equipment_items FOR SELECT USING (public.has_role(auth.uid(), 'equipment') OR public.is_admin(auth.uid()));
CREATE POLICY "Equipment items manageable by staff" ON public.equipment_items FOR ALL USING (public.has_role(auth.uid(), 'equipment') OR public.is_admin(auth.uid()));

CREATE POLICY "Equipment distributions viewable by staff" ON public.equipment_distributions FOR SELECT USING (public.has_role(auth.uid(), 'equipment') OR public.is_admin(auth.uid()));
CREATE POLICY "Equipment distributions manageable by staff" ON public.equipment_distributions FOR ALL USING (public.has_role(auth.uid(), 'equipment') OR public.is_admin(auth.uid()));

-- AUDIT LOGS POLICIES
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- NOTIFICATIONS POLICIES
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON public.hotels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_departures_updated_at BEFORE UPDATE ON public.departures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customer_documents_updated_at BEFORE UPDATE ON public.customer_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_luggage_updated_at BEFORE UPDATE ON public.luggage FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- AUTO CREATE PROFILE ON USER SIGNUP
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  -- Also assign default customer role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- BOOKING CODE GENERATOR
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_booking_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'UMR' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    SELECT EXISTS(SELECT 1 FROM public.bookings WHERE booking_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PAYMENT CODE GENERATOR
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_payment_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'PAY' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    SELECT EXISTS(SELECT 1 FROM public.payments WHERE payment_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;