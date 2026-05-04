
-- =====================================================
-- DATABASE EXTENSION: LOYALTY, WALLET, & SUPPORT SYSTEM
-- =====================================================

-- 1. LOYALTY SYSTEM (Poin & Reward)
-- =====================================================

-- Tabel Saldo Poin Pelanggan
CREATE TABLE public.loyalty_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE UNIQUE NOT NULL,
    current_points INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    total_redeemed INTEGER DEFAULT 0,
    tier_level VARCHAR(20) DEFAULT 'silver', -- silver, gold, platinum
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabel Riwayat Transaksi Poin
CREATE TABLE public.loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    transaction_type VARCHAR(20) NOT NULL, -- EARN (Dapat), REDEEM (Tukar), EXPIRE (Hangus)
    points_amount INTEGER NOT NULL,
    description TEXT,
    reference_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Katalog Reward (Hadiah)
CREATE TABLE public.loyalty_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    points_required INTEGER NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. AGENT WALLET SYSTEM (Dompet Digital Agen)
-- =====================================================

CREATE TABLE public.agent_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE UNIQUE NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.agent_wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES public.agent_wallets(id) ON DELETE CASCADE NOT NULL,
    transaction_type VARCHAR(20) NOT NULL, -- CREDIT (Masuk), DEBIT (Keluar)
    amount DECIMAL(15,2) NOT NULL,
    category VARCHAR(50), -- COMMISSION, WITHDRAWAL, BOOKING_PAYMENT
    status VARCHAR(20) DEFAULT 'completed',
    reference_id UUID,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Request Penarikan Dana oleh Agen
CREATE TABLE public.withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    bank_details JSONB,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, processed, rejected
    proof_url TEXT,
    notes TEXT,
    processed_at TIMESTAMPTZ,
    processed_by UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. SUPPORT & COMPLAINT HANDLING (Helpdesk)
-- =====================================================

-- Function to generate ticket code
CREATE OR REPLACE FUNCTION public.generate_ticket_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := 'TIK' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        SELECT EXISTS(SELECT 1 FROM public.support_tickets WHERE ticket_code = new_code) INTO code_exists;
        EXIT WHEN NOT code_exists;
    END LOOP;
    RETURN new_code;
END;
$$;

CREATE TABLE public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_code VARCHAR(20) UNIQUE NOT NULL DEFAULT generate_ticket_code(),
    user_id UUID NOT NULL,
    category VARCHAR(50), -- HOTEL, TRANSPORT, FOOD, APP, OTHER
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open', -- open, in_progress, resolved, closed
    assigned_to UUID,
    attachment_url TEXT,
    departure_id UUID REFERENCES public.departures(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.ticket_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL,
    message TEXT NOT NULL,
    attachment_url TEXT,
    is_internal_note BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. VENDOR MANAGEMENT & ACCOUNT PAYABLE
-- =====================================================

CREATE TABLE public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    vendor_type VARCHAR(50) NOT NULL, -- HOTEL, AIRLINE, VISA_PROVIDER, CATERING, TRANSPORT, OTHER
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(50),
    bank_account_name VARCHAR(255),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.vendor_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    departure_id UUID REFERENCES public.departures(id) ON DELETE CASCADE NOT NULL,
    vendor_id UUID REFERENCES public.vendors(id) NOT NULL,
    cost_type VARCHAR(50) NOT NULL, -- ACCOMMODATION, FLIGHT, VISA, MEALS, TRANSPORT, OTHER
    description TEXT,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'IDR',
    due_date DATE,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending', -- pending, partial, paid
    paid_at TIMESTAMPTZ,
    paid_by UUID,
    proof_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ROOMING LIST MANAGEMENT
-- =====================================================

CREATE TABLE public.room_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    departure_id UUID REFERENCES public.departures(id) ON DELETE CASCADE NOT NULL,
    hotel_id UUID REFERENCES public.hotels(id) NOT NULL,
    room_number VARCHAR(20) NOT NULL,
    room_type VARCHAR(20) NOT NULL, -- quad, triple, double, single
    floor VARCHAR(10),
    capacity INTEGER DEFAULT 4,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(departure_id, hotel_id, room_number)
);

CREATE TABLE public.room_occupants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_assignment_id UUID REFERENCES public.room_assignments(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) NOT NULL,
    bed_number INTEGER,
    check_in_at TIMESTAMPTZ,
    check_out_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(room_assignment_id, customer_id)
);

-- 6. QR CODE & DIGITAL ID
-- =====================================================

CREATE TABLE public.jamaah_qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    departure_id UUID REFERENCES public.departures(id) ON DELETE CASCADE NOT NULL,
    qr_code_data TEXT NOT NULL,
    qr_image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(customer_id, departure_id)
);

-- Checkpoint scans (meal validation, bus check, etc)
CREATE TABLE public.qr_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_code_id UUID REFERENCES public.jamaah_qr_codes(id) ON DELETE CASCADE NOT NULL,
    scan_type VARCHAR(50) NOT NULL, -- MEAL_BREAKFAST, MEAL_LUNCH, MEAL_DINNER, BUS_BOARDING, HOTEL_CHECKIN, CUSTOM
    location VARCHAR(255),
    scanned_by UUID,
    notes TEXT,
    scanned_at TIMESTAMPTZ DEFAULT now()
);

-- 7. REFERRAL SYSTEM
-- =====================================================

CREATE TABLE public.referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE UNIQUE NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    total_referrals INTEGER DEFAULT 0,
    total_bonus_earned DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_code_id UUID REFERENCES public.referral_codes(id) NOT NULL,
    referred_customer_id UUID REFERENCES public.customers(id) NOT NULL,
    booking_id UUID REFERENCES public.bookings(id),
    bonus_type VARCHAR(20) DEFAULT 'points', -- points, discount, cash
    bonus_amount DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, rewarded
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(referred_customer_id)
);

-- 8. TRIGGERS & FUNCTIONS
-- =====================================================

-- Auto-create wallet saat agen baru didaftarkan
CREATE OR REPLACE FUNCTION public.handle_new_agent_wallet()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.agent_wallets (agent_id)
    VALUES (NEW.id)
    ON CONFLICT (agent_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_agent_created_wallet
    AFTER INSERT ON public.agents
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_agent_wallet();

-- Auto-create loyalty account saat customer baru
CREATE OR REPLACE FUNCTION public.handle_new_customer_loyalty()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.loyalty_points (customer_id)
    VALUES (NEW.id)
    ON CONFLICT (customer_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_customer_created_loyalty
    AFTER INSERT ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_customer_loyalty();

-- Generate referral code for customer
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := 'REF' || UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 6));
        SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = new_code) INTO code_exists;
        EXIT WHEN NOT code_exists;
    END LOOP;
    RETURN new_code;
END;
$$;

-- Update timestamps trigger
CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at
    BEFORE UPDATE ON public.vendors
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendor_costs_updated_at
    BEFORE UPDATE ON public.vendor_costs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_room_assignments_updated_at
    BEFORE UPDATE ON public.room_assignments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. RLS SECURITY POLICIES
-- =====================================================

-- Loyalty Points
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage loyalty points" ON public.loyalty_points
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Customers can view own points" ON public.loyalty_points
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.customers WHERE id = customer_id AND user_id = auth.uid())
);

-- Loyalty Transactions
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage loyalty transactions" ON public.loyalty_transactions
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Customers can view own transactions" ON public.loyalty_transactions
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.customers WHERE id = customer_id AND user_id = auth.uid())
);

-- Loyalty Rewards
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage rewards" ON public.loyalty_rewards
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Everyone can view active rewards" ON public.loyalty_rewards
FOR SELECT USING (is_active = true);

-- Agent Wallets
ALTER TABLE public.agent_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage wallets" ON public.agent_wallets
FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'finance'));

CREATE POLICY "Agents can view own wallet" ON public.agent_wallets
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.agents WHERE id = agent_id AND user_id = auth.uid())
);

-- Agent Wallet Transactions
ALTER TABLE public.agent_wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage wallet transactions" ON public.agent_wallet_transactions
FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'finance'));

CREATE POLICY "Agents can view own wallet transactions" ON public.agent_wallet_transactions
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.agent_wallets w
        JOIN public.agents a ON a.id = w.agent_id
        WHERE w.id = wallet_id AND a.user_id = auth.uid()
    )
);

-- Withdrawal Requests
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage withdrawals" ON public.withdrawal_requests
FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'finance'));

CREATE POLICY "Agents can create withdrawal requests" ON public.withdrawal_requests
FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.agents WHERE id = agent_id AND user_id = auth.uid())
);

CREATE POLICY "Agents can view own withdrawals" ON public.withdrawal_requests
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.agents WHERE id = agent_id AND user_id = auth.uid())
);

-- Support Tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage all tickets" ON public.support_tickets
FOR ALL USING (
    is_admin(auth.uid()) OR 
    has_role(auth.uid(), 'operational') OR 
    has_role(auth.uid(), 'sales')
);

CREATE POLICY "Users can create tickets" ON public.support_tickets
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own tickets" ON public.support_tickets
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own tickets" ON public.support_tickets
FOR UPDATE USING (user_id = auth.uid());

-- Ticket Responses
ALTER TABLE public.ticket_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage responses" ON public.ticket_responses
FOR ALL USING (
    is_admin(auth.uid()) OR 
    has_role(auth.uid(), 'operational') OR 
    has_role(auth.uid(), 'sales')
);

CREATE POLICY "Users can view ticket responses" ON public.ticket_responses
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.support_tickets t 
        WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR is_internal_note = false)
    )
);

CREATE POLICY "Users can add responses to own tickets" ON public.ticket_responses
FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid())
);

-- Vendors
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage vendors" ON public.vendors
FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'finance'));

CREATE POLICY "Staff can view vendors" ON public.vendors
FOR SELECT USING (
    is_admin(auth.uid()) OR 
    has_role(auth.uid(), 'finance') OR 
    has_role(auth.uid(), 'operational')
);

-- Vendor Costs
ALTER TABLE public.vendor_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage vendor costs" ON public.vendor_costs
FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'finance'));

CREATE POLICY "Staff can view vendor costs" ON public.vendor_costs
FOR SELECT USING (
    is_admin(auth.uid()) OR 
    has_role(auth.uid(), 'finance') OR 
    has_role(auth.uid(), 'operational')
);

-- Room Assignments
ALTER TABLE public.room_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage room assignments" ON public.room_assignments
FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'operational'));

CREATE POLICY "Staff can view room assignments" ON public.room_assignments
FOR SELECT USING (
    is_admin(auth.uid()) OR 
    has_role(auth.uid(), 'operational') OR 
    has_role(auth.uid(), 'sales')
);

-- Room Occupants
ALTER TABLE public.room_occupants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage room occupants" ON public.room_occupants
FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'operational'));

CREATE POLICY "Staff can view room occupants" ON public.room_occupants
FOR SELECT USING (
    is_admin(auth.uid()) OR 
    has_role(auth.uid(), 'operational') OR 
    has_role(auth.uid(), 'sales')
);

-- Jamaah QR Codes
ALTER TABLE public.jamaah_qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage QR codes" ON public.jamaah_qr_codes
FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'operational'));

CREATE POLICY "Customers can view own QR" ON public.jamaah_qr_codes
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.customers WHERE id = customer_id AND user_id = auth.uid())
);

-- QR Scans
ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage QR scans" ON public.qr_scans
FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'operational'));

CREATE POLICY "Staff can view QR scans" ON public.qr_scans
FOR SELECT USING (
    is_admin(auth.uid()) OR has_role(auth.uid(), 'operational')
);

-- Referral Codes
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage referral codes" ON public.referral_codes
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Customers can view own referral code" ON public.referral_codes
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.customers WHERE id = customer_id AND user_id = auth.uid())
);

CREATE POLICY "Anyone can view referral codes for validation" ON public.referral_codes
FOR SELECT USING (is_active = true);

-- Referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage referrals" ON public.referrals
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Referrers can view own referrals" ON public.referrals
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.referral_codes rc
        JOIN public.customers c ON c.id = rc.customer_id
        WHERE rc.id = referrer_code_id AND c.user_id = auth.uid()
    )
);
