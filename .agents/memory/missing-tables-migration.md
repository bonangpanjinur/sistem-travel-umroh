---
name: Missing Tables & RLS Fixes (fase27)
description: Tabel booking_line_items tidak ada di production; RLS blocks admin di beberapa tabel.
---

## Tables missing from production
- `booking_line_items` — dibuat di fase27 migration. Schema: id, booking_id (FK), passenger_id, item_type, description, quantity, unit_price, total_price, reference_id, created_at, updated_at.
- `booking_document_logs` — ada di fase16 migration tapi belum di-apply ke production.

## RLS issues (fixed in fase27)
- `customer_documents` — 400 error karena RLS blocking admin read. Fixed: policy "staff_read_all_customer_documents" allow role IN (super_admin, admin, owner, ...).
- `customer_mahrams` — sama seperti customer_documents.
- `profiles` — join dari `booking_status_history` ke `profiles` via REST API gagal 400 karena RLS profiles hanya allow read own record. Fixed: policy "admin_read_profiles_for_status" allow admin roles read all profiles.
- `booking_status_history` query — diberi fallback tanpa profiles join jika join gagal (graceful degradation di frontend).

**Why:** Tabel booking_line_items digunakan di AdminBookingDetail.tsx, RoomTypeAssignmentDialog, useBookingWizardDynamic tapi tidak pernah di-migrate ke production. Semua migration harus di-apply ke Supabase production secara manual.
