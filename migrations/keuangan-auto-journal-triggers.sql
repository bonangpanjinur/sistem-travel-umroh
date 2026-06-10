-- ============================================================
-- keuangan-auto-journal-triggers.sql
-- Auto-posting Jurnal Double-Entry (K-10 Lanjutan)
-- Jalankan di Neon/Supabase SQL Editor SETELAH
-- keuangan-fase1-accounting.sql berhasil dijalankan
-- ============================================================

-- ─── 0. Tambah COA Aset, Kewajiban, dan Pendapatan ──────────
INSERT INTO public.coa_categories (code, name, category_key, description, sort_order)
VALUES
  ('1000', 'ASET LANCAR',          NULL,            'Akun induk aset lancar',               -200),
  ('1100', 'Kas & Bank',           'kas',            'Saldo kas tunai dan rekening bank',    -190),
  ('1200', 'Piutang Usaha (AR)',   'piutang',        'Tagihan ke jamaah yang belum dilunasi', -180),
  ('2000', 'KEWAJIBAN LANCAR',     NULL,             'Akun induk kewajiban lancar',          -100),
  ('2100', 'Hutang Usaha (AP)',    'hutang_vendor',  'Hutang ke vendor yang belum dibayar',   -90),
  ('4000', 'PENDAPATAN',           NULL,             'Akun induk pendapatan',                 -50),
  ('4100', 'Pendapatan Umroh/Haji','pendapatan',    'Pendapatan dari paket perjalanan',       -40),
  ('6100', 'Biaya Operasional Umum','overhead',     'Biaya operasional yang tidak terkategori', 110),
  ('6200', 'Biaya Vendor',         'vendor',         'Biaya kepada vendor eksternal',         120)
ON CONFLICT (code) DO NOTHING;

-- ─── 1. Helper: nomor jurnal unik JU-YYYY-NNNN ──────────────
CREATE OR REPLACE FUNCTION public.generate_journal_entry_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_year   TEXT := to_char(NOW(), 'YYYY');
  v_seq    INTEGER;
BEGIN
  SELECT COALESCE(
    MAX(CAST(NULLIF(regexp_replace(entry_number, '^JU-\d{4}-', ''), '') AS INTEGER)), 0
  ) + 1
  INTO v_seq
  FROM public.journal_entries
  WHERE entry_number LIKE 'JU-' || v_year || '-%';

  RETURN 'JU-' || v_year || '-' || lpad(v_seq::TEXT, 4, '0');
END;
$$;

-- ─── 2. Helper: insert jurnal double-entry ───────────────────
CREATE OR REPLACE FUNCTION public.create_double_entry_journal(
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
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN NULL; END IF;

  -- Cegah duplikasi
  SELECT id INTO v_entry_id
  FROM public.journal_entries
  WHERE ref_type = p_ref_type AND ref_id = p_ref_id AND status != 'voided'
  LIMIT 1;

  IF v_entry_id IS NOT NULL THEN RETURN v_entry_id; END IF;

  v_num := public.generate_journal_entry_number();

  INSERT INTO public.journal_entries (
    entry_number, entry_date, description, ref_type, ref_id, ref_code, status, created_by
  ) VALUES (v_num, p_entry_date, p_description, p_ref_type, p_ref_id, p_ref_code, 'posted', p_created_by)
  RETURNING id INTO v_entry_id;

  INSERT INTO public.journal_entry_lines (entry_id, line_number, account_code, account_name, description, debit, credit)
  VALUES (v_entry_id, 1, p_debit_code,  p_debit_name,  p_description, p_amount, 0),
         (v_entry_id, 2, p_credit_code, p_credit_name, p_description, 0, p_amount);

  RETURN v_entry_id;
END;
$$;

-- ─── 3. Helper: void jurnal by ref ──────────────────────────
CREATE OR REPLACE FUNCTION public.void_journal_entry_by_ref(
  p_ref_type TEXT, p_ref_id UUID, p_reason TEXT DEFAULT 'Dibatalkan otomatis'
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.journal_entries
  SET status = 'voided', voided_at = NOW(), voided_reason = p_reason, updated_at = NOW()
  WHERE ref_type = p_ref_type AND ref_id = p_ref_id AND status = 'posted';
END;
$$;

-- ─── 4. Trigger: PAYMENTS ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_auto_journal_payments()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_status_new TEXT := NEW.status;
  v_status_old TEXT := CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END;
  v_date       DATE := COALESCE(NEW.payment_date, CURRENT_DATE);
  v_desc       TEXT;
  v_kas_code   TEXT := COALESCE(NEW.account_code, '1100');
BEGIN
  IF TG_OP = 'UPDATE' AND v_status_new = v_status_old THEN RETURN NEW; END IF;

  v_desc := 'Pembayaran ' || COALESCE(NEW.payment_code, '') ||
            CASE WHEN NEW.payment_method IS NOT NULL THEN ' via ' || NEW.payment_method ELSE '' END;

  IF v_status_new IN ('approved', 'verified') AND
     (v_status_old IS NULL OR v_status_old NOT IN ('approved', 'verified')) THEN
    PERFORM public.create_double_entry_journal(
      v_date, v_desc, 'payment', NEW.id, NEW.payment_code,
      v_kas_code, 'Kas & Bank', '4100', 'Pendapatan Umroh/Haji', NEW.amount
    );
  ELSIF v_status_new IN ('rejected', 'cancelled', 'failed') AND
        v_status_old IN ('approved', 'verified') THEN
    PERFORM public.void_journal_entry_by_ref('payment', NEW.id,
      'Pembayaran ' || COALESCE(NEW.payment_code, '') || ' dibatalkan');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_auto_journal ON public.payments;
CREATE TRIGGER trg_payment_auto_journal
  AFTER INSERT OR UPDATE OF status ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.trg_auto_journal_payments();

-- ─── 5. Trigger: CASH_TRANSACTIONS ──────────────────────────
CREATE OR REPLACE FUNCTION public.trg_auto_journal_cash_transactions()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_date       DATE := COALESCE(NEW.transaction_date::DATE, CURRENT_DATE);
  v_desc       TEXT := COALESCE(NEW.description, 'Transaksi Kas - ' || NEW.transaction_type);
  v_ref_code   TEXT := 'CT-' || to_char(v_date, 'YYYYMMDD') || '-' || substr(NEW.id::TEXT, 1, 8);
  v_biaya_code TEXT := COALESCE(NEW.account_code, '6100');
BEGIN
  IF TG_OP = 'UPDATE' THEN RETURN NEW; END IF;

  IF LOWER(NEW.transaction_type) = 'income' THEN
    PERFORM public.create_double_entry_journal(
      v_date, v_desc, 'cash_transaction', NEW.id, v_ref_code,
      '1100', 'Kas & Bank', '4100', 'Pendapatan Umroh/Haji', ABS(NEW.amount)
    );
  ELSIF LOWER(NEW.transaction_type) IN ('expense', 'pengeluaran') THEN
    PERFORM public.create_double_entry_journal(
      v_date, v_desc, 'cash_transaction', NEW.id, v_ref_code,
      v_biaya_code, 'Biaya Operasional', '1100', 'Kas & Bank', ABS(NEW.amount)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cash_transaction_auto_journal ON public.cash_transactions;
CREATE TRIGGER trg_cash_transaction_auto_journal
  AFTER INSERT OR UPDATE ON public.cash_transactions
  FOR EACH ROW EXECUTE FUNCTION public.trg_auto_journal_cash_transactions();

-- ─── 6. Trigger: VENDOR_COSTS ────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_auto_journal_vendor_costs()
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
  v_biaya_code  := COALESCE(
    NEW.account_code,
    (SELECT code FROM public.coa_categories WHERE category_key = NEW.cost_type ORDER BY sort_order LIMIT 1),
    '6200'
  );
  v_description := COALESCE(NEW.description, 'Biaya Vendor - ' || NEW.cost_type);

  IF TG_OP = 'INSERT' THEN
    PERFORM public.create_double_entry_journal(
      v_date_hutang, 'Pengakuan Hutang: ' || v_description,
      'vendor_cost_hutang', NEW.id, v_ref_hutang,
      v_biaya_code, 'Biaya Vendor', '2100', 'Hutang Usaha (AP)', NEW.amount
    );

  ELSIF TG_OP = 'UPDATE' THEN
    IF v_status_new = 'paid' AND v_status_old != 'paid' THEN
      v_paid := COALESCE(NEW.paid_amount, NEW.amount);
      PERFORM public.create_double_entry_journal(
        v_date_bayar, 'Pelunasan: ' || v_description,
        'vendor_cost_bayar', NEW.id, v_ref_bayar,
        '2100', 'Hutang Usaha (AP)', '1100', 'Kas & Bank', v_paid
      );
    ELSIF v_status_new = 'cancelled' AND v_status_old != 'cancelled' THEN
      PERFORM public.void_journal_entry_by_ref('vendor_cost_hutang', NEW.id,
        'Biaya vendor ' || v_description || ' dibatalkan');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vendor_cost_auto_journal ON public.vendor_costs;
CREATE TRIGGER trg_vendor_cost_auto_journal
  AFTER INSERT OR UPDATE OF status, paid_amount, paid_at ON public.vendor_costs
  FOR EACH ROW EXECUTE FUNCTION public.trg_auto_journal_vendor_costs();

-- ─── 7. Backfill transaksi lama ──────────────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  -- Payments approved/verified
  FOR r IN SELECT id, payment_code, payment_date, amount, payment_method, account_code
           FROM public.payments WHERE status IN ('approved','verified') AND amount > 0
  LOOP
    PERFORM public.create_double_entry_journal(
      COALESCE(r.payment_date, CURRENT_DATE),
      'Pembayaran ' || COALESCE(r.payment_code,'') ||
        CASE WHEN r.payment_method IS NOT NULL THEN ' via ' || r.payment_method ELSE '' END,
      'payment', r.id, r.payment_code,
      COALESCE(r.account_code,'1100'), 'Kas & Bank',
      '4100', 'Pendapatan Umroh/Haji', r.amount
    );
  END LOOP;

  -- Cash income
  FOR r IN SELECT id, transaction_date, amount, description, account_code
           FROM public.cash_transactions WHERE LOWER(transaction_type)='income' AND amount>0
  LOOP
    PERFORM public.create_double_entry_journal(
      COALESCE(r.transaction_date::DATE, CURRENT_DATE), COALESCE(r.description,'Kas Masuk'),
      'cash_transaction', r.id, 'CT-' || to_char(COALESCE(r.transaction_date::DATE,CURRENT_DATE),'YYYYMMDD') || '-' || substr(r.id::TEXT,1,8),
      '1100','Kas & Bank','4100','Pendapatan Umroh/Haji', ABS(r.amount)
    );
  END LOOP;

  -- Cash expense
  FOR r IN SELECT id, transaction_date, amount, description, account_code
           FROM public.cash_transactions WHERE LOWER(transaction_type) IN ('expense','pengeluaran') AND amount>0
  LOOP
    PERFORM public.create_double_entry_journal(
      COALESCE(r.transaction_date::DATE, CURRENT_DATE), COALESCE(r.description,'Kas Keluar'),
      'cash_transaction', r.id, 'CT-' || to_char(COALESCE(r.transaction_date::DATE,CURRENT_DATE),'YYYYMMDD') || '-' || substr(r.id::TEXT,1,8),
      COALESCE(r.account_code,'6100'),'Biaya Operasional','1100','Kas & Bank', ABS(r.amount)
    );
  END LOOP;

  -- Vendor costs — hutang AP
  FOR r IN SELECT id, amount, description, cost_type, due_date, account_code
           FROM public.vendor_costs WHERE COALESCE(status,'pending') != 'cancelled' AND amount>0
  LOOP
    PERFORM public.create_double_entry_journal(
      COALESCE(r.due_date, CURRENT_DATE),
      'Pengakuan Hutang: ' || COALESCE(r.description, r.cost_type),
      'vendor_cost_hutang', r.id, 'VC-HUTANG-' || substr(r.id::TEXT,1,8),
      COALESCE(r.account_code,
        (SELECT code FROM public.coa_categories WHERE category_key=r.cost_type ORDER BY sort_order LIMIT 1),
        '6200'), 'Biaya Vendor',
      '2100','Hutang Usaha (AP)', r.amount
    );
  END LOOP;

  -- Vendor costs — pelunasan
  FOR r IN SELECT id, paid_amount, amount, description, cost_type, paid_at
           FROM public.vendor_costs WHERE LOWER(COALESCE(status,''))='paid' AND COALESCE(paid_amount,amount)>0
  LOOP
    PERFORM public.create_double_entry_journal(
      COALESCE(r.paid_at::DATE, CURRENT_DATE),
      'Pelunasan: ' || COALESCE(r.description, r.cost_type),
      'vendor_cost_bayar', r.id, 'VC-BAYAR-' || substr(r.id::TEXT,1,8),
      '2100','Hutang Usaha (AP)','1100','Kas & Bank', COALESCE(r.paid_amount, r.amount)
    );
  END LOOP;

  RAISE NOTICE 'Backfill auto-journal selesai';
END;
$$;
