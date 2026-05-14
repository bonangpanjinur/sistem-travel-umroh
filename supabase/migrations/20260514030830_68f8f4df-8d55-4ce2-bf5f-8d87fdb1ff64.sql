CREATE TABLE IF NOT EXISTS public.web_vitals_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL CHECK (metric_name IN ('LCP','CLS','INP','FCP','TTFB')),
  metric_value numeric NOT NULL CHECK (metric_value >= 0 AND metric_value < 1000000),
  rating text CHECK (rating IN ('good','needs-improvement','poor')),
  metric_id text,
  navigation_type text,
  route text NOT NULL,
  device_type text CHECK (device_type IN ('mobile','tablet','desktop')),
  user_agent text,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  release_version text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wvm_metric_time ON public.web_vitals_metrics(metric_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wvm_route ON public.web_vitals_metrics(route);
CREATE INDEX IF NOT EXISTS idx_wvm_branch ON public.web_vitals_metrics(branch_id);
CREATE INDEX IF NOT EXISTS idx_wvm_release ON public.web_vitals_metrics(release_version);
CREATE INDEX IF NOT EXISTS idx_wvm_device ON public.web_vitals_metrics(device_type);

ALTER TABLE public.web_vitals_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert web vitals" ON public.web_vitals_metrics;
CREATE POLICY "Anyone can insert web vitals"
ON public.web_vitals_metrics
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Admin owner read web vitals" ON public.web_vitals_metrics;
CREATE POLICY "Admin owner read web vitals"
ON public.web_vitals_metrics
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'owner'::app_role)
);

DROP POLICY IF EXISTS "Branch manager read own branch web vitals" ON public.web_vitals_metrics;
CREATE POLICY "Branch manager read own branch web vitals"
ON public.web_vitals_metrics
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'branch_manager'::app_role)
  AND branch_id IN (
    SELECT ur.branch_id FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.branch_id IS NOT NULL
  )
);