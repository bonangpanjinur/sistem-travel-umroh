-- =============================================================================
-- FILE 09: ROLLBACK — Hapus Semua Objek Migrasi
-- Vinstour Travel Portal
--
-- ⚠️  PERINGATAN: Script ini menghapus SEMUA tabel, fungsi, dan trigger
--    yang dibuat oleh file 01–07. SEMUA DATA AKAN HILANG PERMANEN.
--
-- Gunakan HANYA di environment testing/development.
-- JANGAN jalankan di production tanpa backup.
--
-- Cara pakai:
--   1. Buka Supabase SQL Editor
--   2. Copy-paste isi file ini
--   3. Jalankan — setelah selesai, jalankan file 01–07 lagi dari awal
--
-- Catatan: DROP TABLE ... CASCADE digunakan agar foreign key tidak menghalangi.
--          Urutan tetap diikuti untuk kejelasan, bukan keharusan teknis.
-- =============================================================================

BEGIN;

-- =============================================================================
-- LANGKAH 1: Hapus trigger pada auth.users (dibuat di file 02)
-- =============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- =============================================================================
-- LANGKAH 2: Hapus trigger slug pada tabel utama (dibuat di file 07)
-- =============================================================================
DROP TRIGGER IF EXISTS trg_agent_slug  ON agents;
DROP TRIGGER IF EXISTS trg_branch_slug ON branches;
DROP TRIGGER IF EXISTS set_departure_financial_summary_updated_at ON departure_financial_summary;

-- =============================================================================
-- LANGKAH 3: Hapus semua stored functions / RPC (dibuat di file 01 & 07)
-- =============================================================================
DROP FUNCTION IF EXISTS update_updated_at_column()                        CASCADE;
DROP FUNCTION IF EXISTS _create_updated_at_trigger(TEXT, TEXT)            CASCADE;
DROP FUNCTION IF EXISTS slugify_text(TEXT)                                CASCADE;
DROP FUNCTION IF EXISTS handle_new_user()                                 CASCADE;
DROP FUNCTION IF EXISTS get_user_role(UUID)                               CASCADE;
DROP FUNCTION IF EXISTS get_user_permissions(UUID)                        CASCADE;
DROP FUNCTION IF EXISTS get_user_branch_id(UUID)                          CASCADE;
DROP FUNCTION IF EXISTS get_booking_summary(UUID)                         CASCADE;
DROP FUNCTION IF EXISTS confirm_booking_payment(UUID, NUMERIC, TEXT, TEXT, DATE) CASCADE;
DROP FUNCTION IF EXISTS get_dashboard_stats()                             CASCADE;
DROP FUNCTION IF EXISTS create_booking_with_passengers(UUID, UUID, JSONB, NUMERIC, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_agent_portal_stats(UUID)                      CASCADE;
DROP FUNCTION IF EXISTS auto_schedule_payment_reminders(INTEGER[])        CASCADE;
DROP FUNCTION IF EXISTS recalculate_departure_financial_summary(UUID)     CASCADE;
DROP FUNCTION IF EXISTS set_agent_slug()                                  CASCADE;
DROP FUNCTION IF EXISTS set_branch_slug()                                 CASCADE;
DROP FUNCTION IF EXISTS increment_website_view(TEXT)                      CASCADE;
DROP FUNCTION IF EXISTS convert_savings_to_booking(UUID, UUID, TEXT)      CASCADE;

-- =============================================================================
-- LANGKAH 4: Hapus tabel — File 06 (E-Commerce)
-- Urutan: dependen dulu, induk terakhir
-- =============================================================================
DROP TABLE IF EXISTS store_product_reviews CASCADE;
DROP TABLE IF EXISTS store_shipments       CASCADE;
DROP TABLE IF EXISTS store_order_items     CASCADE;
DROP TABLE IF EXISTS store_orders          CASCADE;
DROP TABLE IF EXISTS store_products        CASCADE;
DROP TABLE IF EXISTS store_categories      CASCADE;

-- =============================================================================
-- LANGKAH 5: Hapus tabel — File 05 (Finance, HR, Company)
-- =============================================================================
DROP TABLE IF EXISTS departure_financial_summary  CASCADE;
DROP TABLE IF EXISTS departure_other_revenues     CASCADE;
DROP TABLE IF EXISTS departure_expenses           CASCADE;
DROP TABLE IF EXISTS departure_cost_items         CASCADE;
DROP TABLE IF EXISTS siskohat_sync_logs           CASCADE;
DROP TABLE IF EXISTS contact_page_content         CASCADE;
DROP TABLE IF EXISTS website_settings             CASCADE;
DROP TABLE IF EXISTS bank_accounts                CASCADE;
DROP TABLE IF EXISTS company_settings             CASCADE;
DROP TABLE IF EXISTS branch_commissions           CASCADE;
DROP TABLE IF EXISTS branch_memberships           CASCADE;
DROP TABLE IF EXISTS agent_memberships            CASCADE;
DROP TABLE IF EXISTS membership_plans             CASCADE;
DROP TABLE IF EXISTS agent_override_commissions   CASCADE;
DROP TABLE IF EXISTS approval_configs             CASCADE;
DROP TABLE IF EXISTS baggage_reference_items      CASCADE;
DROP TABLE IF EXISTS media_gallery                CASCADE;
DROP TABLE IF EXISTS departure_budgets            CASCADE;
DROP TABLE IF EXISTS vendor_contracts             CASCADE;
DROP TABLE IF EXISTS agent_training_progress      CASCADE;
DROP TABLE IF EXISTS training_quizzes             CASCADE;
DROP TABLE IF EXISTS training_modules             CASCADE;
DROP TABLE IF EXISTS sales_targets                CASCADE;
DROP TABLE IF EXISTS marketing_campaigns          CASCADE;
DROP TABLE IF EXISTS performance_reviews          CASCADE;
DROP TABLE IF EXISTS leave_quotas                 CASCADE;
DROP TABLE IF EXISTS leave_requests               CASCADE;
DROP TABLE IF EXISTS payroll_records              CASCADE;

-- =============================================================================
-- LANGKAH 6: Hapus tabel — File 04 (Operations & Customer Portal)
-- =============================================================================
DROP TABLE IF EXISTS notification_templates  CASCADE;
DROP TABLE IF EXISTS approval_actions        CASCADE;
DROP TABLE IF EXISTS approval_requests       CASCADE;
DROP TABLE IF EXISTS jamaah_badges           CASCADE;
DROP TABLE IF EXISTS jamaah_ibadah_logs      CASCADE;
DROP TABLE IF EXISTS jamaah_ibadah_targets   CASCADE;
DROP TABLE IF EXISTS jamaah_jurnal           CASCADE;
DROP TABLE IF EXISTS jamaah_doa_sessions     CASCADE;
DROP TABLE IF EXISTS agent_monthly_targets   CASCADE;
DROP TABLE IF EXISTS virtual_accounts        CASCADE;
DROP TABLE IF EXISTS app_settings            CASCADE;
DROP TABLE IF EXISTS wa_feature_roadmap      CASCADE;
DROP TABLE IF EXISTS wa_broadcast_logs       CASCADE;
DROP TABLE IF EXISTS wa_broadcast_campaigns  CASCADE;
DROP TABLE IF EXISTS whatsapp_logs           CASCADE;
DROP TABLE IF EXISTS whatsapp_templates      CASCADE;
DROP TABLE IF EXISTS whatsapp_config         CASCADE;
DROP TABLE IF EXISTS sos_alerts              CASCADE;
DROP TABLE IF EXISTS visa_applications       CASCADE;
DROP TABLE IF EXISTS coupons                 CASCADE;
DROP TABLE IF EXISTS banners                 CASCADE;
DROP TABLE IF EXISTS announcements           CASCADE;
DROP TABLE IF EXISTS support_tickets         CASCADE;
DROP TABLE IF EXISTS notifications           CASCADE;
DROP TABLE IF EXISTS email_logs              CASCADE;
DROP TABLE IF EXISTS email_templates         CASCADE;
DROP TABLE IF EXISTS booking_feedback        CASCADE;
DROP TABLE IF EXISTS customer_notifications  CASCADE;
DROP TABLE IF EXISTS customer_accounts       CASCADE;

-- =============================================================================
-- LANGKAH 7: Hapus tabel — File 03 (Customers, Bookings & Payments)
-- =============================================================================
DROP TABLE IF EXISTS invoice_templates           CASCADE;
DROP TABLE IF EXISTS payment_deadline_reminders  CASCADE;
DROP TABLE IF EXISTS leads                       CASCADE;
DROP TABLE IF EXISTS savings_deposits            CASCADE;
DROP TABLE IF EXISTS savings_plans               CASCADE;
DROP TABLE IF EXISTS equipment_distributions     CASCADE;
DROP TABLE IF EXISTS room_assignments            CASCADE;
DROP TABLE IF EXISTS booking_line_items          CASCADE;
DROP TABLE IF EXISTS booking_document_logs       CASCADE;
DROP TABLE IF EXISTS booking_status_history      CASCADE;
DROP TABLE IF EXISTS booking_passengers          CASCADE;
DROP TABLE IF EXISTS bookings                    CASCADE;
DROP TABLE IF EXISTS customer_mahrams            CASCADE;
DROP TABLE IF EXISTS customer_documents          CASCADE;
DROP TABLE IF EXISTS customers                   CASCADE;

-- =============================================================================
-- LANGKAH 8: Hapus tabel — File 02 (Core Entities)
-- Induk dari semua tabel lain — dihapus terakhir
-- =============================================================================
DROP TABLE IF EXISTS menu_items       CASCADE;
DROP TABLE IF EXISTS document_types   CASCADE;
DROP TABLE IF EXISTS departures       CASCADE;
DROP TABLE IF EXISTS packages         CASCADE;
DROP TABLE IF EXISTS employees        CASCADE;
DROP TABLE IF EXISTS muthawifs        CASCADE;
DROP TABLE IF EXISTS agents           CASCADE;
DROP TABLE IF EXISTS branches         CASCADE;
DROP TABLE IF EXISTS vendors          CASCADE;
DROP TABLE IF EXISTS hotels           CASCADE;
DROP TABLE IF EXISTS airlines         CASCADE;
DROP TABLE IF EXISTS permissions_list CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS user_roles       CASCADE;
DROP TABLE IF EXISTS profiles         CASCADE;

-- =============================================================================
-- LANGKAH 9: Verifikasi — pastikan tidak ada sisa tabel migrasi
-- =============================================================================
SELECT
  CASE WHEN COUNT(*) = 0
       THEN '✅ ROLLBACK BERHASIL — tidak ada tabel migrasi tersisa'
       ELSE '⚠️  ' || COUNT(*) || ' tabel masih ada — periksa manual'
  END AS rollback_status,
  string_agg(table_name, ', ' ORDER BY table_name) AS sisa_tabel
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    -- File 02
    'profiles','user_roles','role_permissions','permissions_list',
    'airlines','hotels','vendors','branches','agents','muthawifs','employees',
    'packages','departures','document_types','menu_items',
    -- File 03
    'customers','customer_documents','customer_mahrams',
    'bookings','booking_passengers','booking_status_history',
    'booking_document_logs','booking_line_items',
    'room_assignments','equipment_distributions',
    'savings_plans','savings_deposits','leads',
    'payment_deadline_reminders','invoice_templates',
    -- File 04
    'customer_accounts','customer_notifications','booking_feedback',
    'email_templates','email_logs','notifications','support_tickets',
    'announcements','banners','coupons',
    'visa_applications','sos_alerts',
    'whatsapp_config','whatsapp_templates','whatsapp_logs',
    'wa_broadcast_campaigns','wa_broadcast_logs','wa_feature_roadmap',
    'app_settings','virtual_accounts','agent_monthly_targets',
    'jamaah_doa_sessions','jamaah_jurnal',
    'jamaah_ibadah_targets','jamaah_ibadah_logs','jamaah_badges',
    'approval_requests','approval_actions','notification_templates',
    -- File 05
    'payroll_records','leave_requests','leave_quotas','performance_reviews',
    'marketing_campaigns','sales_targets',
    'training_modules','training_quizzes','agent_training_progress',
    'vendor_contracts','departure_budgets','media_gallery',
    'baggage_reference_items','approval_configs','agent_override_commissions',
    'membership_plans','agent_memberships','branch_memberships','branch_commissions',
    'company_settings','bank_accounts','website_settings',
    'contact_page_content','siskohat_sync_logs',
    'departure_cost_items','departure_expenses',
    'departure_other_revenues','departure_financial_summary',
    -- File 06
    'store_categories','store_products','store_orders',
    'store_order_items','store_shipments','store_product_reviews'
  );

COMMIT;

-- =============================================================================
-- SELESAI — File 09: Rollback
-- Untuk migrasi ulang: jalankan file 01 → 07 dari awal.
-- =============================================================================
SELECT 'File 09 — Rollback selesai. Siap untuk migrasi ulang (01 → 07).' AS result;
