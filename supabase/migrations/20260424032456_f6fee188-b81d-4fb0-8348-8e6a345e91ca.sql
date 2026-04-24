CREATE TABLE IF NOT EXISTS public.package_change_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  min_days_before_departure integer NOT NULL,
  penalty_amount numeric NOT NULL DEFAULT 0,
  penalty_type text NOT NULL DEFAULT 'fixed' CHECK (penalty_type IN ('fixed','percentage')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_package_change_rules_package_id ON public.package_change_rules(package_id);

ALTER TABLE public.package_change_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view package change rules"
  ON public.package_change_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage package change rules"
  ON public.package_change_rules FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER update_package_change_rules_updated_at
  BEFORE UPDATE ON public.package_change_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();