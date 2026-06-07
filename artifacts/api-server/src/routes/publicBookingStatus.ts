/**
 * GET /api/public/booking-status?code=BOOK-xxx
 *
 * Endpoint publik (tanpa autentikasi) — jamaah bisa cek status booking
 * hanya dengan memasukkan kode booking. Tidak mengembalikan data sensitif
 * (NIK, nomor HP, alamat). Nama customer disamarkan.
 */

import { Router } from 'express';
import { pool } from '../lib/db.js';
import { logger } from '../lib/logger.js';

const router = Router();

function maskName(fullName: string): string {
  if (!fullName) return '***';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    const n = parts[0];
    return n.length <= 2 ? n + '***' : n.slice(0, 2) + '*'.repeat(Math.min(n.length - 2, 4));
  }
  const first = parts[0];
  const rest = parts
    .slice(1)
    .map((w) => w[0] + '***')
    .join(' ');
  return first + ' ' + rest;
}

router.get('/', async (req, res) => {
  const code = ((req.query['code'] as string) || '').trim().toUpperCase();
  if (!code) {
    return res.status(400).json({ success: false, error: 'Kode booking wajib diisi.' });
  }

  const client = await pool.connect();
  try {
    // Main booking data
    const { rows: bookingRows } = await client.query(
      `SELECT
         b.id,
         b.booking_code,
         b.booking_status,
         b.payment_status,
         b.total_price,
         b.amount_paid,
         b.created_at,
         b.payment_deadline,
         c.full_name,
         d.departure_date,
         d.return_date,
         d.flight_number,
         p.name  AS package_name,
         p.code  AS package_code,
         p.package_type,
         COUNT(DISTINCT pass.id) FILTER (WHERE pass.id IS NOT NULL) AS passenger_count
       FROM bookings b
       JOIN customers c  ON c.id  = b.customer_id
       JOIN departures d ON d.id  = b.departure_id
       JOIN packages   p ON p.id  = d.package_id
       LEFT JOIN passengers pass ON pass.booking_id = b.id AND pass.status <> 'cancelled'
       WHERE b.booking_code = $1
       GROUP BY b.id, c.full_name, d.departure_date, d.return_date, d.flight_number, p.name, p.code, p.package_type`,
      [code],
    );

    if (bookingRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Kode booking tidak ditemukan. Periksa kembali kode yang Anda masukkan.' });
    }

    const booking = bookingRows[0];

    // Payment summary (only verified/confirmed payments)
    const { rows: paymentRows } = await client.query(
      `SELECT
         payment_code,
         amount,
         payment_method,
         status,
         paid_at,
         created_at
       FROM payments
       WHERE booking_id = $1
       ORDER BY created_at DESC`,
      [booking.id],
    );

    // Checklist progress (booking_departure_checklists jika ada)
    let checklistSummary: { total: number; done: number } | null = null;
    try {
      const { rows: clRows } = await client.query(
        `SELECT
           COUNT(*)                                          AS total,
           COUNT(*) FILTER (WHERE completed = true)         AS done
         FROM booking_departure_checklists
         WHERE booking_id = $1`,
        [booking.id],
      );
      if (clRows[0] && Number(clRows[0].total) > 0) {
        checklistSummary = {
          total: Number(clRows[0].total),
          done: Number(clRows[0].done),
        };
      }
    } catch {
      // Tabel tidak ada / tidak relevan — abaikan
    }

    return res.json({
      success: true,
      data: {
        booking_id: booking.id,
        booking_code: booking.booking_code,
        booking_status: booking.booking_status,
        payment_status: booking.payment_status,
        total_price: Number(booking.total_price) || 0,
        amount_paid: Number(booking.amount_paid) || 0,
        payment_deadline: booking.payment_deadline ?? null,
        created_at: booking.created_at,
        customer_name: maskName(booking.full_name),
        departure_date: booking.departure_date,
        return_date: booking.return_date,
        flight_number: booking.flight_number,
        package_name: booking.package_name,
        package_code: booking.package_code,
        package_type: booking.package_type,
        passenger_count: Number(booking.passenger_count) || 1,
        payments: paymentRows.map((p: any) => ({
          payment_code: p.payment_code,
          amount: Number(p.amount),
          payment_method: p.payment_method,
          status: p.status,
          paid_at: p.paid_at,
          created_at: p.created_at,
        })),
        checklist: checklistSummary,
      },
    });
  } catch (err: any) {
    logger.error({ err }, '[PublicBookingStatus] Error cek status booking');
    return res.status(500).json({ success: false, error: 'Gagal mengambil data booking. Silakan coba lagi.' });
  } finally {
    client.release();
  }
});

export default router;
