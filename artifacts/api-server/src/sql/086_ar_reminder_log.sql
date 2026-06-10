-- Migration 086: AR Reminder Log (INT-13)
-- Tambah trigger type 'ar_reminder' ke wa_logs
-- Tidak ada DDL baru yang dibutuhkan karena wa_logs.trigger_type adalah TEXT kolom bebas
-- Migration ini hanya mendokumentasikan dan membuat index performa

-- Index untuk query wa_logs per trigger type (agar cron bisa cek apakah sudah kirim hari ini)
CREATE INDEX IF NOT EXISTS idx_wa_logs_trigger_type_date
  ON wa_logs(trigger_type, created_at DESC);

-- Index untuk query AR reminder per nomor telepon + tanggal
CREATE INDEX IF NOT EXISTS idx_wa_logs_phone_trigger
  ON wa_logs(recipient_phone, trigger_type, created_at DESC);
