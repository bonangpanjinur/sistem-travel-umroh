---
name: WhatsApp Token Architecture
description: Cara FONNTE_TOKEN dibaca dan dikelola — DB-first, bukan env var.
---

## Rule
FONNTE_TOKEN **tidak disimpan di Replit Secrets**. Token dikelola admin via halaman `/admin/whatsapp` yang menulis ke tabel `whatsapp_config` di Supabase.

## How to apply
- Frontend: `useWhatsAppNotifier` hook membaca dari `whatsapp_config.api_key` via Supabase client.
- API server (`whatsapp.ts`, `reminders.ts`): fungsi `getFonnteToken()` cek `process.env['FONNTE_TOKEN']` dulu, lalu fallback ke query `SELECT api_key FROM whatsapp_config WHERE is_active = true ORDER BY updated_at DESC LIMIT 1`.
- Error messages di UI mengarahkan ke `/admin/whatsapp`, bukan "Replit Secrets".

**Why:** Supaya admin bisa ganti token tanpa akses ke environment Replit. Token disimpan di DB, aman karena RLS hanya allow super_admin/admin.
