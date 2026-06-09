-- Migration 073: Penomoran surat otomatis (document_numbering table + stored function)
-- Sprint DOC-1

CREATE TABLE IF NOT EXISTS document_numbering (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  year        int         NOT NULL,
  month       int         NOT NULL,
  doc_type    text        NOT NULL,
  branch_key  text        NOT NULL DEFAULT 'global',
  last_number int         NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(year, month, doc_type, branch_key)
);

CREATE INDEX IF NOT EXISTS idx_doc_numbering_lookup
  ON document_numbering(year, month, doc_type, branch_key);

-- Atomic get-and-increment: returns formatted nomor surat
-- Format: 001/PREFIX/VI/2026
CREATE OR REPLACE FUNCTION get_next_document_number(
  p_document_type text,
  p_prefix        text,
  p_branch_key    text DEFAULT 'global'
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_year   int  := EXTRACT(YEAR  FROM now())::int;
  v_month  int  := EXTRACT(MONTH FROM now())::int;
  v_number int;
  v_roman  text[] := ARRAY['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
BEGIN
  INSERT INTO document_numbering (year, month, doc_type, branch_key, last_number)
  VALUES (v_year, v_month, p_document_type, p_branch_key, 1)
  ON CONFLICT (year, month, doc_type, branch_key)
  DO UPDATE SET
    last_number = document_numbering.last_number + 1,
    updated_at  = now()
  RETURNING last_number INTO v_number;

  RETURN LPAD(v_number::text, 3, '0')
    || '/' || p_prefix
    || '/' || v_roman[v_month]
    || '/' || v_year::text;
END;
$$;
