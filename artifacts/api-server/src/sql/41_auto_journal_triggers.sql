-- ============================================================
-- 41_auto_journal_triggers.sql
-- Auto-posting Jurnal Double-Entry dari transaksi:
--   1. payments          → saat status berubah ke 'approved'/'verified'
--   2. cash_transactions → setiap INSERT (income/expense)
--   3. vendor_costs      → saat created (hutang AP) + saat paid (lunasi AP)
-- ============================================================

-- ─── 0. Tambah COA yang dibutuhkan untuk auto-journal ─────────────────────────
INSERT INTO coa_categories (code, name, category_key, description, sort_order)
VALUES
  ('1000', 'ASET LANCAR',          NULL,           'Akun induk aset lancar',              -200),
  ('1100', 'Kas & Bank',           'kas',           'Saldo kas tunai dan rekening bank',   -190),
  ('1200', 'Piutang Usaha (AR)',   'piutang',       'Tagihan ke jamaah yang belum dilunasi',-180),
  ('2000', 'KEWAJIBAN LANCAR',     NULL,            'Akun induk kewajiban lancar',         -100),
  ('2100', 'Hutang Usaha (AP)',    'hutang_vendor',  'Hutang ke vendor yang belum dibayar', -90),
  ('4000', 'PENDAPATAN',           NULL,            'Akun induk pendapatan',               -50),
  ('4100', 'Pendapatan Umroh/Haji','pendapatan',    'Pendapatan dari paket perjalanan',    -40),
  ('6000', 'BIAYA OPERASIONAL',    NULL,            'Akun induk biaya operasional',        100),
  ('6100', 'Biaya Operasional Umum','overhead',     'Biaya operasional yang tidak terkategori', 110),
  ('6200', 'Biaya Vendor',         'vendor',        'Biaya kepada vendor eksternal',       120)
ON CONFLICT (code) DO NOTHING;

-- ─── 1. Helper: generate nomor jurnal unik JU-YYYY-NNNN ─────────────────────
CREATE OR REPLACE FUNCTION generate_journal_entry_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_year   TEXT := to_char(NOW(), 'YYYY');
  v_seq    INTEGER;
  v_result TEXT;
BEGIN
  SELECT COALESCE(
    MAX(
      CAST(
        NULLIF(regexp_replace(entry_number, '^JU-\d{4}-', ''), '') AS INTEGER
      )
    ), 0
  ) + 1
  INTO v_seq
  FROM journal_entries
  WHERE entry_number LIKE 'JU-' || v_year || '-%';

  v_result := 'JU-' || v_year || '-' || lpad(v_seq::TEXT, 4, '0');
  RETURN v_result;
END;
$$;

-- ─── 2. Helper: insert journal entry + 2 lines (debit + credit) ──────────────
CREATE OR REPLACE FUNCTION create_double_entry_journal(
  p_entry_date    DATE,
  p_description   TEXT,
  p_ref_type      TEXT,
  p_ref_id        UUID,
  p_ref_code      TEXT,
  p_debit_code    TEXT,
  p_debit_name    TEXT,
  p_credit_code   TEXT,
  p_credit_name   TEXT,
  p_amount        NUMERIC(18,2),
  p_created_by    UUID DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_entry_id UUID;
  v_num      TEXT;
BEGIN
  -- Jangan buat jurnal jika amount = 0
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN NULL;
  END IF;

  -- Cek apakah sudah ada jurnal untuk ref ini (prevent duplicate)
  SELECT id INTO v_entry_id
  FROM journal_entries
  WHERE ref_type = p_ref_type
    AND ref_id   = p_ref_id
    AND status   != 'voided'
  LIMIT 1;

  IF v_entry_id IS NOT NULL THEN
    RETURN v_entry_id; -- sudah ada, skip
  END IF;

  v_num := generate_journal_entry_number();

  INSERT INTO journal_entries (
    entry_number, entry_date, description,
    ref_type, ref_id, ref_code,
    status, created_by
  ) VALUES (
    v_num, p_entry_date, p_description,
    p_ref_type, p_ref_id, p_ref_code,
    'posted', p_created_by
  )
  RETURNING id INTO v_entry_id;

  -- Baris debit
  INSERT INTO journal_entry_lines (entry_id, line_number, account_code, account_name, description, debit, credit)
  VALUES (v_entry_id, 1, p_debit_code, p_debit_name, p_description, p_amount, 0);

  -- Baris credit
  INSERT INTO journal_entry_lines (entry_id, line_number, account_code, account_name, description, debit, credit)
  VALUES (v_entry_id, 2, p_credit_code, p_credit_name, p_description, 0, p_amount);

  RETURN v_entry_id;
END;
$$;

-- ─── 3. Helper: void/reverse jurnal yang sudah ada ───────────────────────────
CREATE OR REPLACE FUNCTION void_journal_entry_by_ref(
  p_ref_type TEXT,
  p_ref_id   UUID,
  p_reason   TEXT DEFAULT 'Dibatalkan otomatis'
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE journal_entries
  SET
    status       = 'voided',
    voided_at    = NOW(),
    voided_reason = p_reason,
    updated_at   = NOW()
  WHERE ref_type = p_ref_type
    AND ref_id   = p_ref_id
    AND status   = 'posted';
END;
$$;

-- ─── 4. Trigger function: PAYMENTS ───────────────────────────────────────────
-- Logika:
--   INSERT dengan status approved/verified       → Debit Kas, Credit Pendapatan
--   UPDATE status menjadi approved/verified       → Debit Kas, Credit Pendapatan
--   UPDATE status menjadi rejected/cancelled      → Void jurnal sebelumnya
CREATE OR REPLACE FUNCTION trg_auto_journal_payments()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_status_new  TEXT := NEW.status;
  v_status_old  TEXT := CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END;
  v_date        DATE := COALESCE(NEW.payment_date, CURRENT_DATE);
  v_description TEXT;
  v_ref_code    TEXT := NEW.payment_code;
  v_kas_code    TEXT := COALESCE(NEW.account_code, '1100');
BEGIN
  -- Hindari loop jika bukan perubahan status
  IF TG_OP = 'UPDATE' AND v_status_new = v_status_old THEN
    RETURN NEW;
  END IF;

  v_description := 'Pembayaran ' || COALESCE(NEW.payment_code, '') ||
                   CASE WHEN NEW.payment_method IS NOT NULL
                        THEN ' via ' || NEW.payment_method ELSE '' END;

  -- Pembayaran diterima → Kas masuk
  IF v_status_new IN ('approved', 'verified') AND
     (v_status_old IS NULL OR v_status_old NOT IN ('approved', 'verified')) THEN

    PERFORM create_double_entry_journal(
      v_date, v_description,
      'payment', NEW.id, v_ref_code,
      v_kas_code, 'Kas & Bank',
      '4100', 'Pendapatan Umroh/Haji',
      NEW.amount
    );

  -- Pembayaran dibatalkan → Void jurnal
  ELSIF v_status_new IN ('rejected', 'cancelled', 'failed') AND
        v_status_old IN ('approved', 'verified') THEN

    PERFORM void_journal_entry_by_ref(
      'payment', NEW.id,
      'Pembayaran ' || COALESCE(NEW.payment_code, '') || ' dibatalkan'
    );

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_auto_journal ON payments;
CREATE TRIGGER trg_payment_auto_journal
  AFTER INSERT OR UPDATE OF status ON payments
  FOR EACH ROW
  EXECUTE FUNCTION trg_auto_journal_payments();

-- ─── 5. Trigger function: CASH_TRANSACTIONS ──────────────────────────────────
-- Logika:
--   income  → Debit Kas (1100),  Credit Pendapatan (4100)
--   expense → Debit Biaya (6100/account_code), Credit Kas (1100)
CREATE OR REPLACE FUNCTION trg_auto_journal_cash_transactions()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_date        DATE := COALESCE(NEW.transaction_date::DATE, CURRENT_DATE);
  v_description TEXT := COALESCE(NEW.description, 'Transaksi Kas - ' || NEW.transaction_type);
  v_ref_code    TEXT := 'CT-' || to_char(v_date, 'YYYYMMDD') || '-' || substr(NEW.id::TEXT, 1, 8);
  v_biaya_code  TEXT := COALESCE(NEW.account_code, '6100');
BEGIN
  -- Hanya proses INSERT (cash_transactions biasanya tidak di-update statusnya)
  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF LOWER(NEW.transaction_type) = 'income' THEN
    -- Kas masuk: Debit Kas, Credit Pendapatan
    PERFORM create_double_entry_journal(
      v_date, v_description,
      'cash_transaction', NEW.id, v_ref_code,
      '1100', 'Kas & Bank',
      '4100', 'Pendapatan Umroh/Haji',
      ABS(NEW.amount)
    );

  ELSIF LOWER(NEW.transaction_type) IN ('expense', 'pengeluaran') THEN
    -- Kas keluar: Debit Biaya, Credit Kas
    PERFORM create_double_entry_journal(
      v_date, v_description,
      'cash_transaction', NEW.id, v_ref_code,
      v_biaya_code, 'Biaya Operasional',
      '1100', 'Kas & Bank',
      ABS(NEW.amount)
    );

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cash_transaction_auto_journal ON cash_transactions;
CREATE TRIGGER trg_cash_transaction_auto_journal
  AFTER INSERT OR UPDATE ON cash_transactions
  FOR EACH ROW
  EXECUTE FUNCTION trg_auto_journal_cash_transactions();

-- ─── 6. Trigger function: VENDOR_COSTS ───────────────────────────────────────
-- Logika:
--   INSERT (hutang terbentuk)          → Debit Biaya Vendor (5xxx/6200), Credit Hutang AP (2100)
--   UPDATE status = 'paid' (dilunasi)  → Debit Hutang AP (2100), Credit Kas (1100)
--   UPDATE status = 'cancelled'        → Void jurnal hutang
CREATE OR REPLACE FUNCTION trg_auto_journal_vendor_costs()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_status_new  TEXT;
  v_status_old  TEXT;
  v_date_hutang DATE;
  v_date_bayar  DATE;
  v_description TEXT;
  v_ref_hutang  TEXT;
  v_ref_bayar   TEXT;
  v_biaya_code  TEXT;
  v_paid        NUMERIC(18,2);
BEGIN
  v_status_new  := LOWER(COALESCE(NEW.status, 'pending'));
  v_status_old  := CASE WHEN TG_OP = 'UPDATE' THEN LOWER(COALESCE(OLD.status, 'pending')) ELSE '' END;
  v_date_hutang := COALESCE(NEW.due_date, CURRENT_DATE);
  v_date_bayar  := COALESCE(NEW.paid_at::DATE, CURRENT_DATE);
  v_ref_hutang  := 'VC-HUTANG-' || substr(NEW.id::TEXT, 1, 8);
  v_ref_bayar   := 'VC-BAYAR-'  || substr(NEW.id::TEXT, 1, 8);

  -- Resolusi kode biaya dari account_code atau cost_type
  v_biaya_code := COALESCE(
    NEW.account_code,
    (SELECT code FROM coa_categories WHERE category_key = NEW.cost_type ORDER BY sort_order LIMIT 1),
    '6200'
  );

  v_description := COALESCE(NEW.description, 'Biaya Vendor - ' || NEW.cost_type);

  IF TG_OP = 'INSERT' THEN
    -- Hutang AP terbentuk: Debit Biaya, Credit Hutang AP
    PERFORM create_double_entry_journal(
      v_date_hutang,
      'Pengakuan Hutang: ' || v_description,
      'vendor_cost_hutang', NEW.id, v_ref_hutang,
      v_biaya_code, 'Biaya Vendor',
      '2100', 'Hutang Usaha (AP)',
      NEW.amount
    );

  ELSIF TG_OP = 'UPDATE' THEN

    -- Vendor dilunasi
    IF v_status_new = 'paid' AND v_status_old != 'paid' THEN
      v_paid := COALESCE(NEW.paid_amount, NEW.amount);
      PERFORM create_double_entry_journal(
        v_date_bayar,
        'Pelunasan: ' || v_description,
        'vendor_cost_bayar', NEW.id, v_ref_bayar,
        '2100', 'Hutang Usaha (AP)',
        '1100', 'Kas & Bank',
        v_paid
      );

    -- Vendor dibatalkan → void jurnal hutang
    ELSIF v_status_new = 'cancelled' AND v_status_old != 'cancelled' THEN
      PERFORM void_journal_entry_by_ref(
        'vendor_cost_hutang', NEW.id,
        'Biaya vendor ' || v_description || ' dibatalkan'
      );

    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vendor_cost_auto_journal ON vendor_costs;
CREATE TRIGGER trg_vendor_cost_auto_journal
  AFTER INSERT OR UPDATE OF status, paid_amount, paid_at ON vendor_costs
  FOR EACH ROW
  EXECUTE FUNCTION trg_auto_journal_vendor_costs();

-- ─── 7. Backfill: posting jurnal untuk transaksi yang sudah ada ──────────────
-- Hanya dijalankan sekali saat migration — jurnal yang sudah ada tidak terduplikasi
-- karena create_double_entry_journal() cek ref_id dulu.

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Backfill payments yang sudah approved/verified
  FOR r IN
    SELECT id, payment_code, payment_date, amount, payment_method, account_code
    FROM payments
    WHERE status IN ('approved', 'verified')
      AND amount > 0
  LOOP
    PERFORM create_double_entry_journal(
      COALESCE(r.payment_date, CURRENT_DATE),
      'Pembayaran ' || COALESCE(r.payment_code, '') ||
        CASE WHEN r.payment_method IS NOT NULL THEN ' via ' || r.payment_method ELSE '' END,
      'payment', r.id, r.payment_code,
      COALESCE(r.account_code, '1100'), 'Kas & Bank',
      '4100', 'Pendapatan Umroh/Haji',
      r.amount
    );
  END LOOP;

  -- Backfill cash_transactions income
  FOR r IN
    SELECT id, transaction_date, amount, description, account_code
    FROM cash_transactions
    WHERE LOWER(transaction_type) = 'income'
      AND amount > 0
  LOOP
    PERFORM create_double_entry_journal(
      COALESCE(r.transaction_date::DATE, CURRENT_DATE),
      COALESCE(r.description, 'Kas Masuk'),
      'cash_transaction', r.id,
      'CT-' || to_char(COALESCE(r.transaction_date::DATE, CURRENT_DATE), 'YYYYMMDD') || '-' || substr(r.id::TEXT, 1, 8),
      '1100', 'Kas & Bank',
      '4100', 'Pendapatan Umroh/Haji',
      ABS(r.amount)
    );
  END LOOP;

  -- Backfill cash_transactions expense
  FOR r IN
    SELECT id, transaction_date, amount, description, account_code
    FROM cash_transactions
    WHERE LOWER(transaction_type) IN ('expense', 'pengeluaran')
      AND amount > 0
  LOOP
    PERFORM create_double_entry_journal(
      COALESCE(r.transaction_date::DATE, CURRENT_DATE),
      COALESCE(r.description, 'Kas Keluar'),
      'cash_transaction', r.id,
      'CT-' || to_char(COALESCE(r.transaction_date::DATE, CURRENT_DATE), 'YYYYMMDD') || '-' || substr(r.id::TEXT, 1, 8),
      COALESCE(r.account_code, '6100'), 'Biaya Operasional',
      '1100', 'Kas & Bank',
      ABS(r.amount)
    );
  END LOOP;

  -- Backfill vendor_costs (hutang AP)
  FOR r IN
    SELECT id, amount, description, cost_type, due_date, account_code
    FROM vendor_costs
    WHERE COALESCE(status, 'pending') != 'cancelled'
      AND amount > 0
  LOOP
    PERFORM create_double_entry_journal(
      COALESCE(r.due_date, CURRENT_DATE),
      'Pengakuan Hutang: ' || COALESCE(r.description, r.cost_type),
      'vendor_cost_hutang', r.id,
      'VC-HUTANG-' || substr(r.id::TEXT, 1, 8),
      COALESCE(
        r.account_code,
        (SELECT code FROM coa_categories WHERE category_key = r.cost_type ORDER BY sort_order LIMIT 1),
        '6200'
      ), 'Biaya Vendor',
      '2100', 'Hutang Usaha (AP)',
      r.amount
    );
  END LOOP;

  -- Backfill vendor_costs yang sudah paid (pelunasan)
  FOR r IN
    SELECT id, paid_amount, amount, description, cost_type, paid_at
    FROM vendor_costs
    WHERE LOWER(COALESCE(status, '')) = 'paid'
      AND COALESCE(paid_amount, amount) > 0
  LOOP
    PERFORM create_double_entry_journal(
      COALESCE(r.paid_at::DATE, CURRENT_DATE),
      'Pelunasan: ' || COALESCE(r.description, r.cost_type),
      'vendor_cost_bayar', r.id,
      'VC-BAYAR-' || substr(r.id::TEXT, 1, 8),
      '2100', 'Hutang Usaha (AP)',
      '1100', 'Kas & Bank',
      COALESCE(r.paid_amount, r.amount)
    );
  END LOOP;

  RAISE NOTICE 'auto_journal_triggers backfill: selesai';
END;
$$;

COMMENT ON FUNCTION trg_auto_journal_payments()        IS 'Auto-posting jurnal double-entry saat payment diapprove/rejected';
COMMENT ON FUNCTION trg_auto_journal_cash_transactions() IS 'Auto-posting jurnal double-entry saat cash_transaction dibuat';
COMMENT ON FUNCTION trg_auto_journal_vendor_costs()    IS 'Auto-posting jurnal double-entry saat vendor_cost dibuat/dilunasi/dibatalkan';
