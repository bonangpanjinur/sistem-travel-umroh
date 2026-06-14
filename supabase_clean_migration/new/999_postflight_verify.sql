-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 999: Postflight Verification
-- Jalankan TERAKHIR setelah semua file migration selesai.
-- Mencetak laporan kesehatan dan RAISE EXCEPTION jika ada yang hilang.
-- =============================================================================

DO $$
DECLARE
  -- -------------------------------------------------------------------------
  -- Daftar lengkap tabel yang HARUS ada setelah migration
  -- -------------------------------------------------------------------------
  v_expected_tables TEXT[] := ARRAY[
    -- Core auth & profile
    'profiles','user_roles','staff_invitations','permissions_list','role_permissions',
    'user_2fa_settings','user_permission_overrides','rbac_audit_trail',
    -- Branches & org
    'branches','departments','company_settings','company_features',
    -- Agents
    'agents','agent_commission_tiers','agent_commissions',
    'agent_wallets','agent_wallet_transactions',
    -- Employees & HR
    'employees','employee_contracts','attendance_records','leave_requests','leave_quotas',
    'performance_reviews','warning_letters','training_sessions','training_participants',
    'payroll','payroll_components','payroll_slips',
    -- Customers & accounts
    'customers','customer_accounts','customer_documents',
    'customer_family_relations','customer_mahrams',
    -- Packages & departures
    'packages','package_labels','package_groups','package_hpp_templates','package_type_equipment',
    'departures','departure_waiting_list','departure_financial_summary',
    'departure_cost_items','departure_expenses','departure_other_revenues',
    'departure_hotels','departure_multi_hotels','departure_itineraries',
    'departure_checklists','cancellation_policies',
    -- Bookings & payments
    'bookings','booking_passengers','booking_line_items','booking_access_tokens',
    'booking_installment_schedules','booking_document_logs','booking_status_history',
    'booking_seat_locks','booking_transfers',
    'payments','virtual_accounts','bank_accounts','invoice_templates',
    'withdrawal_requests','payment_deadline_reminders','ar_reminder_log',
    -- Savings
    'savings_plans','savings_deposits','savings_schedules',
    -- Coupons & loyalty
    'coupons','loyalty_points','loyalty_transactions','loyalty_rewards','loyalty_point_expiry',
    -- Travel resources
    'airlines','airports','hotels','hotel_room_capacities','vendors',
    'muthawifs','membership_plans',
    -- Equipment
    'equipment_items','equipment_distributions','equipment_categories',
    'equipment_variants','equipment_photos','equipment_stock_history',
    'equipment_stock_opname','equipment_opname_items','equipment_notification_settings',
    'baggage_reference_items',
    -- Visas & documents
    'visa_applications','room_assignments','manasik_sessions','ibadah_progress',
    -- Jamaah
    'jamaah_badges','jamaah_ibadah_targets','jamaah_jurnal',
    'jamaah_live_locations','jamaah_qr_codes','luggage',
    -- Haji
    'haji_registrations','haji_waiting_progress','siskohat_registrations','siskohat_sync_logs',
    -- Bus & manifest
    'bus_providers','bus_assignments','bus_passengers','manifests',
    -- Finance & accounting
    'chart_of_accounts','journal_entries','journal_lines',
    'cashflow_entries','cash_transactions','commissions',
    'vendor_invoices','vendor_contracts','scheduled_reports',
    -- Office assets
    'office_assets','office_asset_maintenance',
    -- Leads & marketing
    'leads','contact_messages','marketing_campaigns',
    'marketing_materials','marketing_material_downloads',
    'referral_codes','referral_usages',
    -- Notifications & WhatsApp
    'notifications','notification_templates','email_templates','email_logs',
    'whatsapp_config','wa_templates','wa_broadcast_campaigns','wa_broadcast_logs',
    'wa_send_logs','push_subscriptions','push_outbox',
    'midtrans_webhook_logs','otp_codes',
    -- Website CMS
    'website_settings','faqs','testimonials','banners','announcements',
    'gallery_items','menu_items','landing_pages','blog_posts','blog_categories',
    'blog_tags','blog_post_tags','media_gallery',
    'hero_stats','about_page_content','contact_page_content',
    -- SOS, chatbot, approvals
    'sos_alerts','chatbot_conversations','chatbot_messages',
    'approval_configs','approval_requests',
    -- Auth & audit
    'audit_logs','activity_logs','login_attempts',
    'access_policies','dashboard_access_config','dashboard_access_audit_log',
    -- Jobs
    'job_openings','job_applications',
    -- Support
    'support_tickets','support_messages',
    -- Trip & misc
    'trip_timeline'
  ];

  -- -------------------------------------------------------------------------
  -- Daftar fungsi RBAC & business logic yang HARUS ada
  -- -------------------------------------------------------------------------
  v_expected_functions TEXT[] := ARRAY[
    -- RBAC helpers (005_roles.sql)
    'has_role','has_any_role','is_staff','is_admin_or_above','get_user_primary_role',
    -- Trigger functions (026_triggers.sql)
    'set_updated_at','handle_new_user','sync_booking_paid_amount',
    'sync_departure_available_seats','init_agent_wallet',
    'update_agent_wallet_on_commission','validate_journal_balance',
    -- Business logic (025_functions.sql)
    'generate_booking_code','generate_payment_code','generate_savings_payment_code',
    'validate_registration_context','create_customer_account',
    'convert_savings_to_booking','recalculate_departure_financial_summary',
    'increment_package_view_count','list_users_with_emails',
    'bulk_distribute_equipment','confirm_equipment_receipt',
    -- Misc
    'setup_superadmin','write_audit_log','log_booking_status_change',
    'fn_generate_ticket_number'
  ];

  -- -------------------------------------------------------------------------
  -- Tabel yang WAJIB punya RLS aktif
  -- (semua tabel dengan data sensitif — kecuali lookup/referensi publik)
  -- -------------------------------------------------------------------------
  v_rls_required TEXT[] := ARRAY[
    'profiles','user_roles','staff_invitations','permissions_list','role_permissions',
    'user_2fa_settings','user_permission_overrides','rbac_audit_trail',
    'agents','agent_commissions','agent_wallets','agent_wallet_transactions',
    'employees','leave_requests','performance_reviews','warning_letters',
    'payroll','payroll_slips',
    'customers','customer_accounts','customer_documents',
    'bookings','booking_passengers','booking_line_items','booking_access_tokens',
    'booking_installment_schedules','booking_document_logs','booking_status_history',
    'payments','virtual_accounts','withdrawal_requests',
    'savings_plans','savings_deposits',
    'leads','audit_logs','activity_logs',
    'notifications','whatsapp_config','wa_broadcast_campaigns',
    'journal_entries','journal_lines','chart_of_accounts',
    'cashflow_entries','vendor_invoices',
    'equipment_items','equipment_distributions',
    'visa_applications','haji_registrations',
    'sos_alerts','support_tickets','support_messages',
    'company_settings','dashboard_access_config'
  ];

  -- working variables
  t                TEXT;
  v_exists         BOOLEAN;
  v_rls_on         BOOLEAN;
  v_missing_tables TEXT[] := ARRAY[]::TEXT[];
  v_missing_funcs  TEXT[] := ARRAY[]::TEXT[];
  v_missing_rls    TEXT[] := ARRAY[]::TEXT[];
  v_table_count    INTEGER := 0;
  v_func_count     INTEGER := 0;
  v_rls_count      INTEGER := 0;
  v_dup_count      INTEGER := 0;

BEGIN
  RAISE NOTICE '=============================================================';
  RAISE NOTICE ' VINSTOUR — Postflight Migration Verification';
  RAISE NOTICE '=============================================================';
  RAISE NOTICE 'Database  : %', current_database();
  RAISE NOTICE 'Timestamp : %', NOW()::TEXT;
  RAISE NOTICE '-------------------------------------------------------------';

  -- =========================================================================
  -- BAGIAN 1: Cek semua tabel ada
  -- =========================================================================
  FOREACH t IN ARRAY v_expected_tables LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) INTO v_exists;

    IF v_exists THEN
      v_table_count := v_table_count + 1;
    ELSE
      v_missing_tables := v_missing_tables || t;
    END IF;
  END LOOP;

  -- Hitung tabel duplikat di daftar (mendeteksi kekeliruan definisi)
  SELECT COUNT(*) - COUNT(DISTINCT unnest)
  INTO v_dup_count
  FROM unnest(v_expected_tables);

  RAISE NOTICE '';
  RAISE NOTICE '[ TABEL ] %/% ada   |  % hilang   |  % duplikat di daftar',
    v_table_count,
    array_length(v_expected_tables, 1),
    array_length(v_missing_tables, 1),
    v_dup_count;

  IF array_length(v_missing_tables, 1) > 0 THEN
    RAISE NOTICE '  ❌ Tabel hilang: %', array_to_string(v_missing_tables, ', ');
  ELSE
    RAISE NOTICE '  ✅ Semua tabel terbuat';
  END IF;

  -- Hitung total tabel aktual di schema public
  DECLARE
    v_actual_total INTEGER;
  BEGIN
    SELECT COUNT(*) INTO v_actual_total
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    RAISE NOTICE '  ℹ  Total tabel di public schema: %', v_actual_total;
  END;

  -- =========================================================================
  -- BAGIAN 2: Cek semua fungsi ada
  -- =========================================================================
  FOREACH t IN ARRAY v_expected_functions LOOP
    SELECT EXISTS (
      SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = t
    ) INTO v_exists;

    IF v_exists THEN
      v_func_count := v_func_count + 1;
    ELSE
      v_missing_funcs := v_missing_funcs || t;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '[ FUNGSI ] %/% ada   |  % hilang',
    v_func_count,
    array_length(v_expected_functions, 1),
    array_length(v_missing_funcs, 1);

  IF array_length(v_missing_funcs, 1) > 0 THEN
    RAISE NOTICE '  ❌ Fungsi hilang: %', array_to_string(v_missing_funcs, ', ');
  ELSE
    RAISE NOTICE '  ✅ Semua fungsi RBAC & business logic ter-deploy';
  END IF;

  -- =========================================================================
  -- BAGIAN 3: Cek RLS aktif pada tabel sensitif
  -- =========================================================================
  FOREACH t IN ARRAY v_rls_required LOOP
    SELECT relrowsecurity
    INTO v_rls_on
    FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = t;

    IF v_rls_on IS NULL THEN
      -- tabel belum ada, sudah tertangkap di bagian 1
      NULL;
    ELSIF v_rls_on THEN
      v_rls_count := v_rls_count + 1;
    ELSE
      v_missing_rls := v_missing_rls || t;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '[ RLS    ] %/% aktif  |  % nonaktif',
    v_rls_count,
    array_length(v_rls_required, 1),
    array_length(v_missing_rls, 1);

  IF array_length(v_missing_rls, 1) > 0 THEN
    RAISE NOTICE '  ❌ RLS belum aktif: %', array_to_string(v_missing_rls, ', ');
  ELSE
    RAISE NOTICE '  ✅ RLS aktif di semua tabel sensitif';
  END IF;

  -- =========================================================================
  -- BAGIAN 4: Cek enum public.app_role ada
  -- =========================================================================
  DECLARE v_enum_ok BOOLEAN;
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM pg_type t2
        JOIN pg_namespace n ON n.oid = t2.typnamespace
      WHERE n.nspname = 'public' AND t2.typname = 'app_role'
    ) INTO v_enum_ok;

    RAISE NOTICE '';
    IF v_enum_ok THEN
      RAISE NOTICE '[ ENUM  ] ✅ public.app_role terdefinisi';
    ELSE
      RAISE NOTICE '[ ENUM  ] ❌ public.app_role TIDAK ADA — file 002_enums.sql gagal?';
    END IF;
  END;

  -- =========================================================================
  -- BAGIAN 5: Cek triggers utama aktif
  -- =========================================================================
  DECLARE
    v_trigger_count INTEGER;
    v_triggers_expected INTEGER := 7;
  BEGIN
    SELECT COUNT(DISTINCT trigger_name)
    INTO v_trigger_count
    FROM information_schema.triggers
    WHERE trigger_schema IN ('public', 'auth')
      AND trigger_name IN (
        'trg_handle_new_user','trg_sync_booking_paid','trg_sync_departure_seats',
        'trg_init_agent_wallet','trg_wallet_on_commission','trg_validate_journal',
        'trg_booking_status_history'
      );

    RAISE NOTICE '';
    RAISE NOTICE '[ TRIGGER] %/% trigger utama aktif', v_trigger_count, v_triggers_expected;
    IF v_trigger_count < v_triggers_expected THEN
      RAISE NOTICE '  ⚠  Beberapa trigger mungkin belum aktif — cek 026_triggers.sql dan 030_seed_admin.sql';
    ELSE
      RAISE NOTICE '  ✅ Semua trigger utama aktif';
    END IF;
  END;

  -- =========================================================================
  -- RINGKASAN FINAL
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '=============================================================';

  IF array_length(v_missing_tables, 1) > 0
     OR array_length(v_missing_funcs, 1) > 0
     OR array_length(v_missing_rls, 1) > 0
  THEN
    RAISE NOTICE ' ❌  MIGRATION TIDAK LENGKAP — lihat detail di atas';
    RAISE NOTICE '=============================================================';
    RAISE EXCEPTION
      E'Postflight gagal:\n  Tabel hilang: %\n  Fungsi hilang: %\n  RLS nonaktif: %',
      COALESCE(array_to_string(v_missing_tables, ', '), '-'),
      COALESCE(array_to_string(v_missing_funcs,  ', '), '-'),
      COALESCE(array_to_string(v_missing_rls,    ', '), '-');
  ELSE
    RAISE NOTICE ' ✅  MIGRATION SUKSES — semua komponen terverifikasi';
    RAISE NOTICE '=============================================================';
  END IF;

END;
$$;
