-- Sprint A-01 & A-02: Auto-trigger agent_commissions + branch_commissions
-- saat booking_status berubah menjadi 'confirmed'

-- ============================================================
-- Fungsi utama: auto-create agent commission
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_create_agent_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_id          uuid;
  v_commission_rate   numeric;
  v_commission_amount numeric;
  v_branch_id         uuid;
  v_branch_rate       numeric := 0.02; -- 2% default untuk cabang
  v_branch_amount     numeric;
BEGIN
  -- Hanya proses saat status berubah ke 'confirmed'
  IF NEW.booking_status != 'confirmed' OR OLD.booking_status = 'confirmed' THEN
    RETURN NEW;
  END IF;

  -- Ambil agent_id dari booking
  v_agent_id := NEW.agent_id;
  IF v_agent_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Ambil commission_rate dari tabel agents
  SELECT commission_rate, branch_id
  INTO v_commission_rate, v_branch_id
  FROM public.agents
  WHERE id = v_agent_id;

  IF v_commission_rate IS NULL THEN
    v_commission_rate := 0;
  END IF;

  -- Hitung komisi agen
  v_commission_amount := ROUND(COALESCE(NEW.total_price, 0) * v_commission_rate / 100, 0);

  IF v_commission_amount > 0 THEN
    INSERT INTO public.agent_commissions (
      agent_id, booking_id, commission_amount, status, notes
    ) VALUES (
      v_agent_id,
      NEW.id,
      v_commission_amount,
      'pending',
      'Auto-dibuat saat booking dikonfirmasi'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Hitung komisi cabang (jika agen punya cabang)
  IF v_branch_id IS NOT NULL THEN
    v_branch_amount := ROUND(COALESCE(NEW.total_price, 0) * v_branch_rate, 0);
    IF v_branch_amount > 0 THEN
      INSERT INTO public.branch_commissions (
        branch_id, booking_id, commission_amount, commission_rate, status, notes
      ) VALUES (
        v_branch_id,
        NEW.id,
        v_branch_amount,
        v_branch_rate * 100,
        'pending',
        'Auto-dibuat saat booking dikonfirmasi'
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Hapus trigger lama jika ada, lalu buat baru
DROP TRIGGER IF EXISTS trg_auto_commission_on_confirm ON public.bookings;
CREATE TRIGGER trg_auto_commission_on_confirm
  AFTER UPDATE OF booking_status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_agent_commission();

-- ============================================================
-- Tambah kolom branch_commission_rate ke branches (opsional, P3)
-- untuk override default 2% per cabang di masa mendatang
-- ============================================================
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 2.00;

-- Index tambahan
CREATE INDEX IF NOT EXISTS idx_agent_commissions_booking_id ON public.agent_commissions(booking_id);
CREATE INDEX IF NOT EXISTS idx_branch_commissions_booking_id ON public.branch_commissions(booking_id);
