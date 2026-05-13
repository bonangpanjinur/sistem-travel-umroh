
-- ============================================================
-- 1. STOCK OPNAME APPROVAL WORKFLOW
-- ============================================================

CREATE TYPE public.opname_status AS ENUM ('draft','submitted','approved','rejected');

CREATE TABLE public.store_opname_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  status public.opname_status NOT NULL DEFAULT 'draft',
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  reviewer_notes text,
  applied_movement_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.store_opname_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.store_opname_sessions(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE RESTRICT,
  system_qty int NOT NULL,
  physical_qty int NOT NULL,
  unit_cost numeric(14,2) NOT NULL DEFAULT 0,
  line_notes text,
  applied boolean NOT NULL DEFAULT false,
  movement_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, product_id)
);

CREATE INDEX idx_opname_lines_session ON public.store_opname_lines(session_id);
CREATE INDEX idx_opname_sessions_status ON public.store_opname_sessions(status);

ALTER TABLE public.store_opname_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_opname_lines    ENABLE ROW LEVEL SECURITY;

-- Sessions: store admins can read; branch_manager limited to own branch
CREATE POLICY opname_sessions_select ON public.store_opname_sessions
  FOR SELECT USING (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'owner')
    OR (public.has_role(auth.uid(),'branch_manager')
        AND (branch_id IS NULL OR branch_id = public.get_user_branch_id(auth.uid())))
  );
CREATE POLICY opname_sessions_insert ON public.store_opname_sessions
  FOR INSERT WITH CHECK (public.is_store_admin(auth.uid()));
CREATE POLICY opname_sessions_update ON public.store_opname_sessions
  FOR UPDATE USING (public.is_store_admin(auth.uid()));
CREATE POLICY opname_sessions_delete ON public.store_opname_sessions
  FOR DELETE USING (
    public.is_store_admin(auth.uid()) AND status IN ('draft','rejected')
  );

CREATE POLICY opname_lines_select ON public.store_opname_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.store_opname_sessions s
      WHERE s.id = session_id
        AND (public.has_role(auth.uid(),'super_admin')
          OR public.has_role(auth.uid(),'owner')
          OR (public.has_role(auth.uid(),'branch_manager')
              AND (s.branch_id IS NULL OR s.branch_id = public.get_user_branch_id(auth.uid()))))
    )
  );
CREATE POLICY opname_lines_write ON public.store_opname_lines
  FOR ALL USING (
    public.is_store_admin(auth.uid())
    AND EXISTS (SELECT 1 FROM public.store_opname_sessions s
                WHERE s.id = session_id AND s.status IN ('draft','submitted'))
  ) WITH CHECK (public.is_store_admin(auth.uid()));

CREATE TRIGGER trg_opname_sessions_uat
  BEFORE UPDATE ON public.store_opname_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Code generator
CREATE OR REPLACE FUNCTION public.generate_opname_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_code text; v_exists boolean;
BEGIN
  LOOP
    v_code := 'OPN-' || to_char(now(),'YYMMDD') || '-' || upper(substring(md5(random()::text),1,4));
    SELECT EXISTS(SELECT 1 FROM public.store_opname_sessions WHERE code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END $$;

-- Submit
CREATE OR REPLACE FUNCTION public.submit_opname_session(_session_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_status opname_status; v_count int;
BEGIN
  IF NOT public.is_store_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT status INTO v_status FROM public.store_opname_sessions WHERE id = _session_id FOR UPDATE;
  IF v_status IS NULL THEN RAISE EXCEPTION 'session_not_found'; END IF;
  IF v_status NOT IN ('draft','rejected') THEN
    RAISE EXCEPTION 'invalid_state: % (must be draft/rejected)', v_status;
  END IF;
  SELECT count(*) INTO v_count FROM public.store_opname_lines WHERE session_id = _session_id;
  IF v_count = 0 THEN RAISE EXCEPTION 'no_lines'; END IF;

  UPDATE public.store_opname_sessions
    SET status = 'submitted', submitted_at = now(),
        reviewed_by = NULL, reviewed_at = NULL, reviewer_notes = NULL
    WHERE id = _session_id;
END $$;

-- Approve & apply adjustments
CREATE OR REPLACE FUNCTION public.approve_opname_session(_session_id uuid, _reviewer_notes text DEFAULT NULL)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_status opname_status;
  v_line RECORD;
  v_diff int;
  v_movement_id uuid;
  v_count int := 0;
BEGIN
  IF NOT public.is_store_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT status INTO v_status FROM public.store_opname_sessions WHERE id = _session_id FOR UPDATE;
  IF v_status IS NULL THEN RAISE EXCEPTION 'session_not_found'; END IF;
  IF v_status <> 'submitted' THEN RAISE EXCEPTION 'invalid_state: %', v_status; END IF;

  FOR v_line IN
    SELECT l.*, p.current_stock AS live_stock, p.avg_cost
    FROM public.store_opname_lines l
    JOIN public.store_products p ON p.id = l.product_id
    WHERE l.session_id = _session_id AND l.applied = false
  LOOP
    v_diff := v_line.physical_qty - COALESCE(v_line.live_stock,0);
    IF v_diff <> 0 THEN
      INSERT INTO public.store_stock_movements
        (product_id, type, qty, unit_cost, ref_table, ref_id, notes, created_by)
      VALUES
        (v_line.product_id, 'adjustment', v_diff,
         COALESCE(v_line.avg_cost,0),
         'store_opname_lines', v_line.id,
         'Opname approval — fisik ' || v_line.physical_qty || ' vs sistem ' || COALESCE(v_line.live_stock,0),
         auth.uid())
      RETURNING id INTO v_movement_id;

      UPDATE public.store_opname_lines
        SET applied = true, movement_id = v_movement_id
        WHERE id = v_line.id;
      v_count := v_count + 1;
    ELSE
      UPDATE public.store_opname_lines SET applied = true WHERE id = v_line.id;
    END IF;
  END LOOP;

  UPDATE public.store_opname_sessions
    SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(),
        reviewer_notes = _reviewer_notes, applied_movement_count = v_count
    WHERE id = _session_id;

  RETURN v_count;
END $$;

-- Reject
CREATE OR REPLACE FUNCTION public.reject_opname_session(_session_id uuid, _reviewer_notes text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_status opname_status;
BEGIN
  IF NOT public.is_store_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _reviewer_notes IS NULL OR length(trim(_reviewer_notes)) = 0 THEN
    RAISE EXCEPTION 'reviewer_notes_required';
  END IF;
  SELECT status INTO v_status FROM public.store_opname_sessions WHERE id = _session_id FOR UPDATE;
  IF v_status IS NULL THEN RAISE EXCEPTION 'session_not_found'; END IF;
  IF v_status <> 'submitted' THEN RAISE EXCEPTION 'invalid_state: %', v_status; END IF;

  UPDATE public.store_opname_sessions
    SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(),
        reviewer_notes = _reviewer_notes
    WHERE id = _session_id;
END $$;

-- ============================================================
-- 2. LOW-STOCK ALERTS
-- ============================================================

CREATE TABLE public.store_low_stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('low','out')),
  current_stock int NOT NULL,
  min_stock int NOT NULL,
  branch_id uuid,
  resolved_at timestamptz,
  resolved_stock int,
  channels jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_low_stock_unresolved
  ON public.store_low_stock_alerts(product_id) WHERE resolved_at IS NULL;
CREATE INDEX idx_low_stock_created ON public.store_low_stock_alerts(created_at DESC);

ALTER TABLE public.store_low_stock_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY low_stock_alerts_select ON public.store_low_stock_alerts
  FOR SELECT USING (public.is_store_admin(auth.uid()));
CREATE POLICY low_stock_alerts_admin_write ON public.store_low_stock_alerts
  FOR ALL USING (public.is_store_admin(auth.uid())) WITH CHECK (true);

-- Trigger function: detects threshold crossings on store_products
CREATE OR REPLACE FUNCTION public.tg_store_product_low_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_old_below boolean;
  v_new_below boolean;
  v_alert_type text;
  v_admin_user_ids uuid[];
  v_admin_phones text[];
  v_admin_user_emails RECORD;
  v_alert_id uuid;
  v_msg text;
  v_email_count int := 0;
  v_wa_count int := 0;
BEGIN
  IF NEW.is_active IS DISTINCT FROM true THEN RETURN NEW; END IF;
  IF COALESCE(NEW.min_stock,0) <= 0 THEN RETURN NEW; END IF;

  v_old_below := COALESCE(OLD.current_stock,0) <= COALESCE(OLD.min_stock,0)
                 AND COALESCE(OLD.min_stock,0) > 0;
  v_new_below := COALESCE(NEW.current_stock,0) <= COALESCE(NEW.min_stock,0);

  -- Resolve open alerts when stock back above min
  IF NOT v_new_below AND v_old_below THEN
    UPDATE public.store_low_stock_alerts
      SET resolved_at = now(), resolved_stock = NEW.current_stock
      WHERE product_id = NEW.id AND resolved_at IS NULL;
    RETURN NEW;
  END IF;

  -- Only fire on a fresh crossing (was OK, now below) to avoid spam
  IF NOT v_new_below OR v_old_below THEN RETURN NEW; END IF;

  v_alert_type := CASE WHEN NEW.current_stock <= 0 THEN 'out' ELSE 'low' END;

  INSERT INTO public.store_low_stock_alerts
    (product_id, alert_type, current_stock, min_stock, branch_id)
  VALUES (NEW.id, v_alert_type, NEW.current_stock, COALESCE(NEW.min_stock,0), NEW.branch_id)
  RETURNING id INTO v_alert_id;

  -- Recipient admin user_ids: super_admin + owner + branch_manager (scoped if branch known)
  SELECT COALESCE(array_agg(DISTINCT ur.user_id), '{}') INTO v_admin_user_ids
  FROM public.user_roles ur
  WHERE ur.role IN ('super_admin','owner')
     OR (ur.role = 'branch_manager'
         AND (NEW.branch_id IS NULL OR ur.branch_id IS NULL OR ur.branch_id = NEW.branch_id));

  v_msg := CASE WHEN v_alert_type = 'out'
    THEN '🚨 Stok HABIS: ' || NEW.name || ' (sisa ' || NEW.current_stock || ', min ' || NEW.min_stock || ')'
    ELSE '⚠️ Stok menipis: ' || NEW.name || ' (sisa ' || NEW.current_stock || ', min ' || NEW.min_stock || ')'
  END;

  -- In-app + browser push
  IF COALESCE(array_length(v_admin_user_ids,1),0) > 0 THEN
    PERFORM public.enqueue_push(
      v_admin_user_ids,
      CASE WHEN v_alert_type='out' THEN 'Stok Produk Habis' ELSE 'Stok Produk Menipis' END,
      v_msg, CASE WHEN v_alert_type='out' THEN 'error' ELSE 'warning' END,
      '/admin/store/low-stock'
    );
  END IF;

  -- WhatsApp queue (one row per admin with phone)
  INSERT INTO public.whatsapp_logs (recipient_phone, message_content, status)
  SELECT p.phone, v_msg || E'\n\nKelola di panel admin > Toko > Stok Menipis.', 'pending'
  FROM public.profiles p
  WHERE p.user_id = ANY(v_admin_user_ids)
    AND p.phone IS NOT NULL
    AND length(trim(p.phone)) >= 8;
  GET DIAGNOSTICS v_wa_count = ROW_COUNT;

  -- Email queue (one row per admin with email)
  INSERT INTO public.email_logs
    (recipient_email, recipient_name, subject, body_html, template_type, reference_type, reference_id, status, metadata)
  SELECT
    u.email, p.full_name,
    CASE WHEN v_alert_type='out' THEN '[Stok Habis] ' ELSE '[Stok Menipis] ' END || NEW.name,
    '<p>' || v_msg || '</p><p>SKU: ' || COALESCE(NEW.sku,'-') ||
       '</p><p>Silakan buka panel admin untuk membuat Purchase Order.</p>',
    'low_stock_alert', 'store_low_stock_alerts', v_alert_id, 'pending',
    jsonb_build_object('product_id', NEW.id, 'alert_type', v_alert_type)
  FROM public.profiles p
  JOIN public.list_users_with_emails() u ON u.id = p.user_id
  WHERE p.user_id = ANY(v_admin_user_ids) AND u.email IS NOT NULL;
  GET DIAGNOSTICS v_email_count = ROW_COUNT;

  UPDATE public.store_low_stock_alerts
    SET channels = jsonb_build_object(
      'push', COALESCE(array_length(v_admin_user_ids,1),0),
      'whatsapp_queued', v_wa_count,
      'email_queued', v_email_count
    )
    WHERE id = v_alert_id;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_store_product_low_stock
  AFTER UPDATE OF current_stock, min_stock, is_active ON public.store_products
  FOR EACH ROW EXECUTE FUNCTION public.tg_store_product_low_stock();
