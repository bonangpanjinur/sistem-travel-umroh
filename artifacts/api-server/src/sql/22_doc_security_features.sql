-- F-19: Add document_deadline column to departures (if not already added by DocumentDeadlinePanel)
ALTER TABLE departures ADD COLUMN IF NOT EXISTS document_deadline DATE;

-- F-21: QR code / verifikasi keaslian dokumen
CREATE TABLE IF NOT EXISTS document_verify_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(64) UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  doc_type VARCHAR(100) NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  booking_code TEXT,
  package_name TEXT,
  departure_date DATE,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  issued_by UUID,
  metadata JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_doc_verify_token ON document_verify_tokens(token);
CREATE INDEX IF NOT EXISTS idx_doc_verify_booking ON document_verify_tokens(booking_id, doc_type);

-- F-22: E-signature jamaah
CREATE TABLE IF NOT EXISTS customer_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  signature_base64 TEXT NOT NULL,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address VARCHAR(64),
  user_agent TEXT,
  UNIQUE(customer_id)
);
CREATE INDEX IF NOT EXISTS idx_customer_sig ON customer_signatures(customer_id);

-- F-23: Audit trail dokumen
CREATE TABLE IF NOT EXISTS document_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  doc_type VARCHAR(100),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  booking_code TEXT,
  performed_by UUID,
  performed_by_name TEXT,
  channel VARCHAR(20),
  recipient TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_doc_audit_booking ON document_audit_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_doc_audit_event ON document_audit_logs(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doc_audit_created ON document_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doc_audit_type ON document_audit_logs(doc_type);
