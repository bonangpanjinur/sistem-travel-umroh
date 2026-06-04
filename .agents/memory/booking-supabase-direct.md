---
name: Booking mutations use Supabase directly
description: All write operations in AdminBookingDetail.tsx must use Supabase client, not fetch to API server — the API server is unreliable/often not running.
---

## Rule

All mutations in `AdminBookingDetail.tsx` (and similar admin booking pages) must use `supabase` directly instead of `fetch('/api/bookings/...')`.

**Why:** The API server (port 8080, Express) is frequently not running. Any `fetch('/api/...')` call that hits Vite dev server instead returns an HTML 404 page. Calling `.json()` on that response fails with `"Unexpected token 'T', 'The page c'... is not valid JSON"` — exactly the bug users reported.

**How to apply:**
- Simple CRUD (update status, notes, deadline, room number): use `(supabase as any).from('table').update({...}).eq('id', id)`
- Delete payment / verify payment: use Supabase + call `recalcPaymentTotals(bookingId)` helper after
- Cancel/refund: use Supabase UPDATE bookings + INSERT refunds
- WA notification (`sendNotificationMutation`) is the only one that still uses the API server — it already has proper try/catch for JSON parse errors

## Key column names (bookings table)
- `booking_status` (not `status`) — enum type `booking_status`
- `payment_status`, `paid_amount`, `remaining_amount`
- `notes`, `payment_deadline`

## recalcPaymentTotals helper
Defined as a module-level `async function recalcPaymentTotals(bookingId: string)` above the component. Fetches all payments, sums paid/verified ones, updates `paid_amount`, `remaining_amount`, `payment_status` on bookings.
