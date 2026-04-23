
## Rencana Perbaikan Sistem Pembayaran

### Bagian A — Fix Error 400 (WAJIB)
Hapus `remaining_amount` dari payload INSERT/UPDATE di 5 file (kolom GENERATED di DB):
1. `src/hooks/useBookingWizard.ts` — INSERT bookings
2. `src/pages/agent/AgentRegister.tsx` — INSERT bookings
3. `src/pages/agent/AgentRegisterGroup.tsx` — INSERT bookings
4. `src/pages/savings/SavingsRegister.tsx` — INSERT savings_plans
5. `src/pages/admin/AdminSavingsPlans.tsx` — UPDATE savings_plans

SELECT tetap pakai kolom ini → tampilan tidak berubah.

### Bagian B — Tutup Lubang Verifikasi Pembayaran
- **BARU** `src/components/admin/AddManualPaymentDialog.tsx` — autocomplete booking by code/nama, input amount/metode/bank, upload bukti opsional, INSERT ke `payments` status `paid`, notes `Manual entry by Finance`. Trigger DB akan auto-update `bookings.paid_amount`.
- `src/pages/admin/AdminPayments.tsx` — tombol "+ Catat Pembayaran" di header, tab **Tabungan** (query `savings_payments` join `savings_plans` & `customers`), card stats **Booking Tanpa Pembayaran**, perbaiki empty state.

### Bagian C — Quality of Life
- `src/pages/admin/AdminBookings.tsx` — tombol quick action **"Tagih (WhatsApp)"** per row booking dengan status `pending`/`partial`, panggil edge function `send-payment-reminder`.

### Tidak Diubah
- DB schema, RLS, trigger, edge functions existing
- Alur booking wizard (hanya hapus 1 baris)
- File auto-generated (`types.ts`)
