-- Fase 23: Tambah kolom transaction_id dan payment_type di tabel payments
-- Digunakan untuk menyimpan Midtrans transaction_id pada pembayaran QRIS/online
-- dan jenis pembayaran (dp, cicilan, pelunasan)

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_type   TEXT;

-- Index untuk pencarian cepat berdasarkan transaction_id
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments (transaction_id);

COMMENT ON COLUMN payments.transaction_id IS 'Midtrans transaction_id untuk pembayaran online (QRIS, VA, GoPay)';
COMMENT ON COLUMN payments.payment_type   IS 'Jenis pembayaran: dp | cicilan | pelunasan';
