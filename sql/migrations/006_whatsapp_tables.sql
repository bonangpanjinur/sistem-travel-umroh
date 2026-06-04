-- WhatsApp Integration Tables
-- Run this in your Supabase SQL editor

-- Config table (one row per app)
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider    TEXT NOT NULL DEFAULT 'fonnte',
  api_key     TEXT,
  sender_number TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Message templates
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  message_template TEXT NOT NULL,
  variables        TEXT[] DEFAULT '{}',
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Delivery logs
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_phone  TEXT NOT NULL,
  message_content  TEXT NOT NULL,
  template_code    TEXT,
  booking_id       UUID REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id      UUID REFERENCES customers(id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  error_message    TEXT,
  provider_message_id TEXT,
  sent_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS policies
ALTER TABLE whatsapp_config   ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_logs     ENABLE ROW LEVEL SECURITY;

-- Only authenticated users (staff) can read/write
CREATE POLICY "staff_full_access_wa_config"    ON whatsapp_config    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_full_access_wa_templates" ON whatsapp_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_full_access_wa_logs"      ON whatsapp_logs      FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert default built-in templates
INSERT INTO whatsapp_templates (code, name, message_template, variables) VALUES
(
  'BOOKING_CONFIRM', 'Konfirmasi Booking',
  E'Assalamu''alaikum {nama} 🕌\n\n✅ *Booking Anda Berhasil!*\n\n📋 Kode Booking: *{kode_booking}*\n📦 Paket: {nama_paket}\n📅 Keberangkatan: {tanggal_berangkat}\n💰 Total: {total_harga}\n💳 DP/Terbayar: {terbayar}\n⏳ Sisa: {sisa_bayar}\n\nTerima kasih telah mempercayakan perjalanan ibadah Anda kepada kami. 🙏\n\nInfo: {nomor_cs}',
  ARRAY['nama','kode_booking','nama_paket','tanggal_berangkat','total_harga','terbayar','sisa_bayar','nomor_cs']
),
(
  'PAYMENT_CONFIRM', 'Konfirmasi Pembayaran',
  E'Assalamu''alaikum {nama} 🕌\n\n✅ *Pembayaran Diterima!*\n\n📋 Kode Booking: *{kode_booking}*\n💰 Jumlah Diterima: *{jumlah_bayar}*\n📅 Tanggal: {tanggal_bayar}\n💳 Total Terbayar: {total_terbayar}\n⏳ Sisa: {sisa_bayar}\n\nJazakallahu khairan atas kepercayaan Anda. 🙏\n\nInfo: {nomor_cs}',
  ARRAY['nama','kode_booking','jumlah_bayar','tanggal_bayar','total_terbayar','sisa_bayar','nomor_cs']
),
(
  'PAYMENT_LUNAS', 'Pembayaran Lunas',
  E'Assalamu''alaikum {nama} 🕌\n\n🎉 *Pembayaran Lunas!*\n\nAlhamdulillah, pembayaran Anda untuk paket *{nama_paket}* telah LUNAS.\n\n📋 Kode Booking: *{kode_booking}*\n📅 Keberangkatan: {tanggal_berangkat}\n\nKami akan segera memproses dokumen perjalanan Anda.\n\nInfo: {nomor_cs} 🙏',
  ARRAY['nama','nama_paket','kode_booking','tanggal_berangkat','nomor_cs']
),
(
  'DOCUMENT_READY', 'Dokumen Siap',
  E'Assalamu''alaikum {nama} 🕌\n\n📄 *Dokumen Anda Sudah Siap!*\n\nJenis dokumen: *{jenis_dokumen}*\nPaket: {nama_paket}\nKeberangkatan: {tanggal_berangkat}\n\nSilakan hubungi kami untuk pengambilan dokumen.\n\nInfo: {nomor_cs} 🙏',
  ARRAY['nama','jenis_dokumen','nama_paket','tanggal_berangkat','nomor_cs']
),
(
  'DEPARTURE_REMINDER', 'Pengingat Keberangkatan',
  E'Assalamu''alaikum {nama} 🕌\n\n⏰ *Pengingat Keberangkatan!*\n\nKeberangkatan Anda tinggal *{sisa_hari} hari* lagi!\n\n📅 Tanggal: {tanggal_berangkat}\n✈️ Penerbangan: {nomor_penerbangan}\n🏨 Hotel Makkah: {hotel_makkah}\n📍 Titik Kumpul: {titik_kumpul}\n\nPastikan dokumen perjalanan sudah lengkap. Semoga menjadi haji/umrah yang mabrur! 🤲\n\nInfo: {nomor_cs}',
  ARRAY['nama','sisa_hari','tanggal_berangkat','nomor_penerbangan','hotel_makkah','titik_kumpul','nomor_cs']
)
ON CONFLICT (code) DO NOTHING;
