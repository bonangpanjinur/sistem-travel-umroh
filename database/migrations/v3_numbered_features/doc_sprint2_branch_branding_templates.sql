-- ═══════════════════════════════════════════════════════════════════════════
-- Sprint DOC-2: Branch Branding & Document Templates
-- F-02: Branding & letterhead per cabang
-- F-03: Upload tanda tangan & stempel per cabang
-- F-01: Template desain per tipe dokumen
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Branch branding fields ──────────────────────────────────────────────
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS signature_url    TEXT,
  ADD COLUMN IF NOT EXISTS stamp_url        TEXT,
  ADD COLUMN IF NOT EXISTS logo_url         TEXT,
  ADD COLUMN IF NOT EXISTS letterhead_data  JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN branches.signature_url   IS 'URL gambar tanda tangan pimpinan cabang';
COMMENT ON COLUMN branches.stamp_url       IS 'URL gambar stempel/cap resmi cabang';
COMMENT ON COLUMN branches.logo_url        IS 'URL logo cabang (jika berbeda dari logo pusat)';
COMMENT ON COLUMN branches.letterhead_data IS 'Data kop surat: address_detail, phone_alt, email_alt, website, npwp, pimpinan_name, pimpinan_position';

-- ─── 2. Document templates ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_templates (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type      TEXT        NOT NULL,
  -- doc_type values: 'jamaah_leave','employee_leave','passport_letter',
  --   'invoice','eticket','certificate','general_letter'
  branch_id     UUID        REFERENCES branches(id) ON DELETE CASCADE,
  -- NULL branch_id = template global (untuk semua cabang)
  name          TEXT        NOT NULL,
  is_default    BOOLEAN     NOT NULL DEFAULT FALSE,
  settings_json JSONB       NOT NULL DEFAULT '{}',
  -- shape per doc_type varies; common keys:
  --   accent_color, font, orientation, show_agent, footer_text,
  --   show_signature, show_stamp, show_logo
  created_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_tpl_doc_type   ON document_templates(doc_type);
CREATE INDEX IF NOT EXISTS idx_doc_tpl_branch_id  ON document_templates(branch_id);
CREATE INDEX IF NOT EXISTS idx_doc_tpl_is_default ON document_templates(is_default);

ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_read_doc_templates" ON document_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_manage_doc_templates" ON document_templates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','branch_manager','operational')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','branch_manager','operational')
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname='set_doc_templates_updated_at'
      AND tgrelid='document_templates'::regclass
  ) THEN
    CREATE TRIGGER set_doc_templates_updated_at
      BEFORE UPDATE ON document_templates
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Seed default global templates per doc type
INSERT INTO document_templates (doc_type, branch_id, name, is_default, settings_json) VALUES
  ('invoice',        NULL, 'Template Invoice Default',            TRUE, '{"accent_color":"#16a34a","font":"helvetica","orientation":"portrait","show_agent":true,"show_stamp":true,"show_signature":true}'),
  ('eticket',        NULL, 'Template E-Ticket Default',           TRUE, '{"accent_color":"#0284c7","font":"helvetica","orientation":"portrait","show_stamp":false}'),
  ('certificate',    NULL, 'Template Sertifikat Default',         TRUE, '{"accent_color":"#d97706","font":"times","orientation":"landscape","show_stamp":true}'),
  ('jamaah_leave',   NULL, 'Template Surat Izin Jamaah Default',  TRUE, '{"accent_color":"#7c3aed","font":"helvetica","orientation":"portrait","show_stamp":true}'),
  ('passport_letter',NULL, 'Template Surat Paspor Default',       TRUE, '{"accent_color":"#0f172a","font":"helvetica","orientation":"portrait","show_stamp":true}'),
  ('general_letter', NULL, 'Template Surat Umum Default',         TRUE, '{"accent_color":"#0f172a","font":"helvetica","orientation":"portrait","show_stamp":true}')
ON CONFLICT DO NOTHING;

-- ─── 3. Menu item untuk Template Dokumen ─────────────────────────────────────
INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible) VALUES
  ('document-templates', 'Template Dokumen', '/admin/document-templates', 'FileStack', 'Dokumen', 165, 'document-templates', true)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label, path = EXCLUDED.path, icon = EXCLUDED.icon,
  group_name = EXCLUDED.group_name, sort_order = EXCLUDED.sort_order,
  required_permission = EXCLUDED.required_permission, is_visible = EXCLUDED.is_visible;

INSERT INTO role_permissions (role, permission_key)
SELECT r.role, 'document-templates'
FROM (VALUES ('super_admin'),('owner'),('admin'),('branch_manager'),('operational')) AS r(role)
ON CONFLICT DO NOTHING;

SELECT 'Sprint DOC-2 — branch branding & document templates installed' AS result;
