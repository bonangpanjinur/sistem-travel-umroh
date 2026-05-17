-- =============================================================================
-- FASE 25 — Backfill: koreksi paid_amount / remaining_amount / payment_status
--            untuk semua booking yang nilainya tidak sinkron dengan tabel payments
--
-- AMAN dijalankan berkali-kali (idempotent).
-- Hanya UPDATE baris yang benar-benar berbeda (WHERE clause menyaring perubahan).
-- Jalankan di Supabase SQL Editor SETELAH fase24_payment_sync_trigger.sql.
-- =============================================================================

WITH recalc AS (
  SELECT
    b.id                                                          AS booking_id,
    b.total_price,
    COALESCE(SUM(p.amount) FILTER (WHERE p.status IN ('paid','verified')), 0)
                                                                  AS correct_paid,
    GREATEST(
      0,
      b.total_price -
      COALESCE(SUM(p.amount) FILTER (WHERE p.status IN ('paid','verified')), 0)
    )                                                             AS correct_remaining,
    CASE
      WHEN COALESCE(SUM(p.amount) FILTER (WHERE p.status IN ('paid','verified')), 0)
             >= b.total_price
           AND b.total_price > 0                                  THEN 'paid'
      WHEN COALESCE(SUM(p.amount) FILTER (WHERE p.status IN ('paid','verified')), 0)
             > 0                                                   THEN 'partial'
      ELSE                                                              'pending'
    END                                                           AS correct_status
  FROM bookings b
  LEFT JOIN payments p ON p.booking_id = b.id
  GROUP BY b.id, b.total_price
)
UPDATE bookings b
SET
  paid_amount      = r.correct_paid,
  remaining_amount = r.correct_remaining,
  payment_status   = r.correct_status
FROM recalc r
WHERE b.id = r.booking_id
  AND (
    b.paid_amount      IS DISTINCT FROM r.correct_paid      OR
    b.remaining_amount IS DISTINCT FROM r.correct_remaining OR
    b.payment_status   IS DISTINCT FROM r.correct_status
  );

-- Tampilkan ringkasan hasil
SELECT
  COUNT(*)                                          AS total_bookings,
  COUNT(*) FILTER (WHERE payment_status = 'paid')   AS lunas,
  COUNT(*) FILTER (WHERE payment_status = 'partial') AS sebagian,
  COUNT(*) FILTER (WHERE payment_status = 'pending') AS belum_bayar
FROM bookings;
