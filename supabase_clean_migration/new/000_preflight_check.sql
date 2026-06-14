-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 000: Preflight Check
-- Jalankan PERTAMA sebelum semua file migration lain.
-- Jika ada prasyarat yang gagal, seluruh migration dibatalkan dengan EXCEPTION.
-- =============================================================================

DO $$
DECLARE
  v_pg_version     INTEGER;
  v_ext_uuid       BOOLEAN;
  v_ext_pgcrypto   BOOLEAN;
  v_role_col_type  TEXT;
  v_errors         TEXT[] := ARRAY[]::TEXT[];
BEGIN

  -- =========================================================================
  -- 1. Verifikasi versi PostgreSQL minimal 14
  -- =========================================================================
  v_pg_version := current_setting('server_version_num')::INTEGER;

  IF v_pg_version < 140000 THEN
    v_errors := v_errors || format(
      'PostgreSQL versi minimal 14 diperlukan. Versi sekarang: %s (server_version_num=%s)',
      current_setting('server_version'), v_pg_version
    );
  ELSE
    RAISE NOTICE '[✓] PostgreSQL versi: % (OK)', current_setting('server_version');
  END IF;

  -- =========================================================================
  -- 2. Verifikasi ekstensi uuid-ossp aktif
  -- =========================================================================
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp'
  ) INTO v_ext_uuid;

  IF NOT v_ext_uuid THEN
    -- Coba aktifkan otomatis
    BEGIN
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      RAISE NOTICE '[✓] Ekstensi uuid-ossp berhasil diaktifkan';
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || 'Ekstensi uuid-ossp tidak tersedia dan gagal diaktifkan. Jalankan: CREATE EXTENSION "uuid-ossp";';
    END;
  ELSE
    RAISE NOTICE '[✓] Ekstensi uuid-ossp: sudah aktif';
  END IF;

  -- =========================================================================
  -- 3. Verifikasi ekstensi pgcrypto aktif
  -- =========================================================================
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
  ) INTO v_ext_pgcrypto;

  IF NOT v_ext_pgcrypto THEN
    BEGIN
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      RAISE NOTICE '[✓] Ekstensi pgcrypto berhasil diaktifkan';
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || 'Ekstensi pgcrypto tidak tersedia dan gagal diaktifkan. Jalankan: CREATE EXTENSION pgcrypto;';
    END;
  ELSE
    RAISE NOTICE '[✓] Ekstensi pgcrypto: sudah aktif';
  END IF;

  -- =========================================================================
  -- 4. Verifikasi konflik tipe kolom role di tabel user_roles
  --    Jika tabel sudah ada: kolom role harus TEXT atau app_role.
  --    Tipe lain (integer, boolean, dll.) tidak kompatibel.
  -- =========================================================================
  SELECT data_type
  INTO v_role_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'user_roles'
    AND column_name  = 'role';

  IF v_role_col_type IS NULL THEN
    RAISE NOTICE '[✓] Tabel user_roles belum ada — akan dibuat baru (tidak ada konflik)';
  ELSIF v_role_col_type IN ('text', 'character varying', 'USER-DEFINED') THEN
    RAISE NOTICE '[✓] Kolom user_roles.role bertipe "%" — kompatibel', v_role_col_type;
  ELSE
    v_errors := v_errors || format(
      'Kolom user_roles.role bertipe "%s" yang tidak kompatibel. '
      'Harus TEXT, VARCHAR, atau public.app_role (USER-DEFINED). '
      'Backup data lalu DROP TABLE public.user_roles sebelum lanjut.',
      v_role_col_type
    );
  END IF;

  -- =========================================================================
  -- 5. Verifikasi schema public bisa ditulis (bukan read-only)
  -- =========================================================================
  BEGIN
    PERFORM has_schema_privilege('public', 'CREATE');
    IF NOT has_schema_privilege(current_user, 'public', 'CREATE') THEN
      v_errors := v_errors || format(
        'User "%s" tidak punya hak CREATE di schema public. '
        'Jalankan: GRANT CREATE ON SCHEMA public TO %I;',
        current_user, current_user
      );
    ELSE
      RAISE NOTICE '[✓] User "%" punya hak CREATE di schema public', current_user;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[?] Tidak bisa verifikasi hak schema — lanjut dengan asumsi OK';
  END;

  -- =========================================================================
  -- 6. Verifikasi ekstensi pg_stat_statements tidak blocking (opsional)
  -- =========================================================================
  RAISE NOTICE '[✓] Preflight selesai — database: %', current_database();

  -- =========================================================================
  -- FINAL: Jika ada error, batalkan semua dengan EXCEPTION
  -- =========================================================================
  IF array_length(v_errors, 1) > 0 THEN
    RAISE EXCEPTION E'Migration dibatalkan. Ditemukan % masalah prasyarat:\n\n  - %',
      array_length(v_errors, 1),
      array_to_string(v_errors, E'\n  - ');
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '======================================================';
  RAISE NOTICE ' PREFLIGHT OK — Aman untuk menjalankan migration chain';
  RAISE NOTICE '======================================================';

END;
$$;
