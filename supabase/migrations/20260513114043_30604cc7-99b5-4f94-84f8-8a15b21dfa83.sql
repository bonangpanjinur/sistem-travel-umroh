
-- ============================================================
-- LOY-FIX3: Tabel jamaah_badges + 5 trigger badge otomatis
-- ============================================================

CREATE TABLE IF NOT EXISTS public.jamaah_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  source text,
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_jamaah_badges_user ON public.jamaah_badges(user_id);

ALTER TABLE public.jamaah_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own badges" ON public.jamaah_badges
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own badges" ON public.jamaah_badges
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage badges" ON public.jamaah_badges
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Helper function: award badge with notification
CREATE OR REPLACE FUNCTION public.award_badge(
  _user_id uuid, _badge_id text, _badge_name text,
  _xp integer DEFAULT 50, _source text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inserted boolean := false;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;
  INSERT INTO public.jamaah_badges (user_id, badge_id, source)
  VALUES (_user_id, _badge_id, _source)
  ON CONFLICT (user_id, badge_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (_user_id,
      '🏆 Badge Baru: ' || _badge_name,
      'Selamat! Anda mendapat badge "' || _badge_name || '" (+' || _xp || ' XP).',
      'success', '/jamaah/badges');
  END IF;
  RETURN v_inserted;
END $$;

-- Trigger 1: First payment -> badge "umroh_pertama" (when first payment paid)
CREATE OR REPLACE FUNCTION public.tg_badge_first_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid; v_count int;
BEGIN
  IF NEW.status::text <> 'paid' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status::text = 'paid' THEN RETURN NEW; END IF;
  SELECT c.user_id INTO v_user_id
  FROM bookings b JOIN customers c ON c.id = b.customer_id
  WHERE b.id = NEW.booking_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;
  PERFORM public.award_badge(v_user_id, 'umroh_pertama', 'Umroh Perdana', 500, 'first_payment');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_badge_first_payment ON public.payments;
CREATE TRIGGER trg_badge_first_payment
  AFTER INSERT OR UPDATE OF status ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_badge_first_payment();

-- Trigger 2: Loyalty tier reached
CREATE OR REPLACE FUNCTION public.tg_badge_loyalty_tier()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  IF NEW.tier_level IS NULL OR NEW.tier_level = OLD.tier_level THEN RETURN NEW; END IF;
  SELECT user_id INTO v_user_id FROM customers WHERE id = NEW.customer_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.tier_level = 'gold' THEN
    PERFORM public.award_badge(v_user_id, 'tier_gold', 'Tier Gold', 100, 'loyalty_tier');
  ELSIF NEW.tier_level = 'platinum' THEN
    PERFORM public.award_badge(v_user_id, 'tier_platinum', 'Tier Platinum', 250, 'loyalty_tier');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_badge_loyalty_tier ON public.loyalty_points;
CREATE TRIGGER trg_badge_loyalty_tier
  AFTER UPDATE OF tier_level ON public.loyalty_points
  FOR EACH ROW EXECUTE FUNCTION public.tg_badge_loyalty_tier();

-- Trigger 3: Savings plan created -> badge "tabungan_aktif"
CREATE OR REPLACE FUNCTION public.tg_badge_savings_started()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  SELECT user_id INTO v_user_id FROM customers WHERE id = NEW.customer_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;
  PERFORM public.award_badge(v_user_id, 'tabungan_aktif', 'Penabung Setia', 75, 'savings_plan');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_badge_savings_started ON public.savings_plans;
CREATE TRIGGER trg_badge_savings_started
  AFTER INSERT ON public.savings_plans
  FOR EACH ROW EXECUTE FUNCTION public.tg_badge_savings_started();

-- Trigger 4: Booking confirmed -> badge "booking_confirmed"
CREATE OR REPLACE FUNCTION public.tg_badge_booking_confirmed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  IF NEW.booking_status::text <> 'confirmed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.booking_status::text = 'confirmed' THEN RETURN NEW; END IF;
  SELECT user_id INTO v_user_id FROM customers WHERE id = NEW.customer_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;
  PERFORM public.award_badge(v_user_id, 'booking_confirmed', 'Booking Terkonfirmasi', 150, 'booking');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_badge_booking_confirmed ON public.bookings;
CREATE TRIGGER trg_badge_booking_confirmed
  AFTER INSERT OR UPDATE OF booking_status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.tg_badge_booking_confirmed();

-- Trigger 5: Document verified -> badge "dokumen_lengkap"
CREATE OR REPLACE FUNCTION public.tg_badge_document_verified()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid; v_verified_count int;
BEGIN
  IF NEW.status::text <> 'verified' THEN RETURN NEW; END IF;
  SELECT user_id INTO v_user_id FROM customers WHERE id = NEW.customer_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO v_verified_count
  FROM customer_documents
  WHERE customer_id = NEW.customer_id AND status::text = 'verified';
  IF v_verified_count >= 2 THEN
    PERFORM public.award_badge(v_user_id, 'dokumen_lengkap', 'Dokumen Lengkap', 100, 'documents');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_badge_document_verified ON public.customer_documents;
CREATE TRIGGER trg_badge_document_verified
  AFTER UPDATE OF status ON public.customer_documents
  FOR EACH ROW EXECUTE FUNCTION public.tg_badge_document_verified();
