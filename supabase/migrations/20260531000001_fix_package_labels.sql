-- Fix for missing package_labels and package_label_assignments tables
CREATE TABLE IF NOT EXISTS public.package_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  slug varchar(50) NOT NULL,
  name varchar(100) NOT NULL,
  color varchar(20) NOT NULL DEFAULT 'primary',
  icon varchar(50),
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT package_labels_branch_slug_unique UNIQUE (branch_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_package_labels_branch ON public.package_labels(branch_id);
CREATE INDEX IF NOT EXISTS idx_package_labels_active ON public.package_labels(is_active);

CREATE TABLE IF NOT EXISTS public.package_label_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES public.package_labels(id) ON DELETE CASCADE,
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT package_label_assignments_unique UNIQUE (package_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_package_label_assign_package ON public.package_label_assignments(package_id);
CREATE INDEX IF NOT EXISTS idx_package_label_assign_label ON public.package_label_assignments(label_id);

-- Trigger: updated_at
DROP TRIGGER IF EXISTS trg_package_labels_updated_at ON public.package_labels;
CREATE TRIGGER trg_package_labels_updated_at
  BEFORE UPDATE ON public.package_labels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.package_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_label_assignments ENABLE ROW LEVEL SECURITY;

-- Public read (labels visible on public package listings)
DROP POLICY IF EXISTS "Anyone can view active package labels" ON public.package_labels;
CREATE POLICY "Anyone can view active package labels"
  ON public.package_labels FOR SELECT
  USING (is_active = true OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view label assignments" ON public.package_label_assignments;
CREATE POLICY "Anyone can view label assignments"
  ON public.package_label_assignments FOR SELECT
  USING (true);

-- Admin manage (branch-scoped via existing helpers)
DROP POLICY IF EXISTS "Admins manage package labels in their branch" ON public.package_labels;
CREATE POLICY "Admins manage package labels in their branch"
  ON public.package_labels FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'owner')
    OR (public.is_admin(auth.uid()) AND (branch_id IS NULL OR public.user_belongs_to_branch(auth.uid(), branch_id)))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'owner')
    OR (public.is_admin(auth.uid()) AND (branch_id IS NULL OR public.user_belongs_to_branch(auth.uid(), branch_id)))
  );

DROP POLICY IF EXISTS "Admins manage package label assignments" ON public.package_label_assignments;
CREATE POLICY "Admins manage package label assignments"
  ON public.package_label_assignments FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Seed beberapa label global default
INSERT INTO public.package_labels (branch_id, slug, name, color, sort_order)
VALUES
  (NULL, 'best_seller', 'Best Seller', 'amber', 1),
  (NULL, 'early_bird', 'Early Bird', 'emerald', 2),
  (NULL, 'flash_sale', 'Flash Sale', 'red', 3),
  (NULL, 'new', 'Baru', 'blue', 4),
  (NULL, 'limited', 'Terbatas', 'purple', 5)
ON CONFLICT (branch_id, slug) DO NOTHING;
