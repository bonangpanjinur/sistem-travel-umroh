-- =============================================================================
-- 07_profitabilitas_paket_menu
-- P2 — Tambah menu item "Perbandingan Profitabilitas Paket" ke sidebar admin
-- =============================================================================

INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible)
VALUES (
  'profitabilitas-paket',
  'Profitabilitas Paket',
  '/admin/profitabilitas-paket',
  'BarChart3',
  'Keuangan',
  185,
  'profitabilitas-paket',
  true
)
ON CONFLICT (key) DO UPDATE SET
  label               = EXCLUDED.label,
  path                = EXCLUDED.path,
  icon                = EXCLUDED.icon,
  group_name          = EXCLUDED.group_name,
  sort_order          = EXCLUDED.sort_order,
  required_permission = EXCLUDED.required_permission,
  is_visible          = EXCLUDED.is_visible;

-- Grant permission ke role keuangan dan manajemen
INSERT INTO role_permissions (role, permission_key)
SELECT r.role, 'profitabilitas-paket'
FROM (VALUES
  ('super_admin'),
  ('owner'),
  ('branch_manager'),
  ('finance')
) AS r(role)
ON CONFLICT DO NOTHING;
