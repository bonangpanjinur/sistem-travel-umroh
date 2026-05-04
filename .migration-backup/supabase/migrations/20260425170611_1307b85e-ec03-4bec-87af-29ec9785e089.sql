-- 1. Add missing columns to equipment_items
ALTER TABLE public.equipment_items
  ADD COLUMN IF NOT EXISTS pic text,
  ADD COLUMN IF NOT EXISTS pic_type text,
  ADD COLUMN IF NOT EXISTS qr_code text,
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2. equipment_categories
CREATE TABLE IF NOT EXISTS public.equipment_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  icon text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.equipment_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view equipment_categories"
  ON public.equipment_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage equipment_categories"
  ON public.equipment_categories FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_equipment_categories_updated_at
  BEFORE UPDATE ON public.equipment_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. equipment_stock_history
CREATE TABLE IF NOT EXISTS public.equipment_stock_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_item_id uuid NOT NULL REFERENCES public.equipment_items(id) ON DELETE CASCADE,
  change_type text NOT NULL,
  quantity_change integer NOT NULL DEFAULT 0,
  previous_quantity integer NOT NULL DEFAULT 0,
  new_quantity integer NOT NULL DEFAULT 0,
  notes text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_equipment_stock_history_item ON public.equipment_stock_history(equipment_item_id);
ALTER TABLE public.equipment_stock_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view equipment_stock_history"
  ON public.equipment_stock_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage equipment_stock_history"
  ON public.equipment_stock_history FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 4. equipment_stock_opname
CREATE TABLE IF NOT EXISTS public.equipment_stock_opname (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_item_id uuid NOT NULL REFERENCES public.equipment_items(id) ON DELETE CASCADE,
  opname_date date NOT NULL DEFAULT CURRENT_DATE,
  physical_count integer NOT NULL DEFAULT 0,
  system_count integer NOT NULL DEFAULT 0,
  difference integer NOT NULL DEFAULT 0,
  notes text,
  pic_name text,
  pic_type text,
  status text NOT NULL DEFAULT 'completed',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_equipment_stock_opname_item ON public.equipment_stock_opname(equipment_item_id);
ALTER TABLE public.equipment_stock_opname ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view equipment_stock_opname"
  ON public.equipment_stock_opname FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage equipment_stock_opname"
  ON public.equipment_stock_opname FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_equipment_stock_opname_updated_at
  BEFORE UPDATE ON public.equipment_stock_opname
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. equipment_settings (key-value)
CREATE TABLE IF NOT EXISTS public.equipment_settings (
  key text PRIMARY KEY,
  value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.equipment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view equipment_settings"
  ON public.equipment_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage equipment_settings"
  ON public.equipment_settings FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 6. equipment_notification_settings
CREATE TABLE IF NOT EXISTS public.equipment_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT true,
  notify_admins boolean NOT NULL DEFAULT true,
  notify_pic boolean NOT NULL DEFAULT true,
  low_stock_threshold_default integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.equipment_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view equipment_notification_settings"
  ON public.equipment_notification_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage equipment_notification_settings"
  ON public.equipment_notification_settings FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_equipment_notification_settings_updated_at
  BEFORE UPDATE ON public.equipment_notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults
INSERT INTO public.equipment_categories (name, description) VALUES
  ('Pakaian Ihram', 'Pakaian ihram pria dan wanita'),
  ('Tas & Koper', 'Tas dan koper jamaah'),
  ('Aksesoris', 'Aksesoris perlengkapan jamaah'),
  ('Buku Panduan', 'Buku panduan ibadah'),
  ('Lainnya', 'Kategori lainnya')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.equipment_notification_settings (enabled, notify_admins, notify_pic, low_stock_threshold_default)
SELECT true, true, true, 10
WHERE NOT EXISTS (SELECT 1 FROM public.equipment_notification_settings);
