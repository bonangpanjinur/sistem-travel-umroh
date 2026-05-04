-- =====================================================
-- SECURITY FIX: Complete remaining fixes
-- =====================================================

-- =====================================================
-- FIX 4: Profiles Table Public Exposure
-- Restrict to own profile or authorized roles
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are publicly viewable" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Users can only view their own profile, admins/sales can view all
CREATE POLICY "Users can view own profile" ON public.profiles 
FOR SELECT USING (
  user_id = auth.uid() 
  OR public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'sales')
  OR public.has_role(auth.uid(), 'operational')
);

-- =====================================================
-- FIX 5: Bookings Financial Exposure
-- Restrict to booking owner, agent, or authorized roles
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Bookings are viewable by everyone" ON public.bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;

-- Users can only view their own bookings, agents can view their referrals, admins/staff can view all
CREATE POLICY "Users can view own bookings" ON public.bookings 
FOR SELECT USING (
  -- User's own booking (via customer record)
  EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = customer_id AND c.user_id = auth.uid()
  )
  -- Or user is the assigned agent
  OR EXISTS (
    SELECT 1 FROM public.agents a
    WHERE a.id = agent_id AND a.user_id = auth.uid()
  )
  -- Or user is admin/authorized roles
  OR public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'sales')
  OR public.has_role(auth.uid(), 'finance')
  OR public.has_role(auth.uid(), 'operational')
);