
Tujuan: menuntaskan error saat konfirmasi booking/pendaftaran dengan memperbaiki drift skema audit trail, bukan hanya menambah satu kolom yang kebetulan sedang error.

Diagnosis saat ini:
- Error terbaru pada screenshot adalah `column "old_values" of relation "audit_logs" does not exist`.
- Tabel `audit_logs` di database saat ini sudah punya `resource_type` dan `resource_id`, jadi fix sebelumnya hanya menutup satu gejala.
- Struktur nyata `audit_logs` yang terbaca sekarang memakai nama kanonis `old_data` / `new_data`, sementara masih ada alur runtime lama yang jelas masih mencoba menulis `old_values` / `new_values`.
- Ini menunjukkan masalah utamanya adalah ketidaksinkronan versi skema audit, bukan bug spesifik di tombol konfirmasi booking.

Rencana perbaikan:
1. Lacak sumber query yang gagal
   - Cek log database saat menekan konfirmasi booking/pendaftaran.
   - Identifikasi objek yang benar-benar mengirim insert ke `audit_logs` dengan kolom lama (`old_values`, `new_values`), apakah dari trigger, function, atau jalur frontend lama.

2. Buat migration kompatibilitas penuh untuk `audit_logs`
   - Tambahkan kolom legacy yang masih dipakai alur lama:
     - `old_values JSONB`
     - `new_values JSONB`
   - Pastikan semua kolom lintas versi tersedia sekaligus:
     - `old_data`, `new_data`
     - `old_values`, `new_values`
     - `resource_type`, `resource_id`
     - `table_name`, `record_id`, `action_type`, `severity`, `metadata`
   - Backfill data lama agar `old_values <- old_data` dan `new_values <- new_data` untuk menjaga konsistensi historis.

3. Sinkronkan kolom lama dan baru di level database
   - Tambahkan trigger/fungsi kompatibilitas pada `audit_logs` agar:
     - jika caller mengisi `old_values`, sistem otomatis menyalin ke `old_data`
     - jika caller mengisi `old_data`, sistem otomatis menyalin ke `old_values`
     - hal yang sama untuk `new_values` / `new_data`
   - Dengan ini, caller lama dan caller baru sama-sama aman tanpa memblokir transaksi booking.

4. Rapikan semua penulis audit di codebase
   - Audit helper frontend akan tetap distandardisasi ke kolom kanonis `old_data` / `new_data`.
   - Review flow yang relevan:
     - `src/lib/audit-logger.ts`
     - `src/pages/admin/AdminBookingDetail.tsx`
     - `src/pages/admin/AdminBookings.tsx`
     - flow pendaftaran/konfirmasi lain yang mengubah status booking atau payment
   - Jika ada insert manual ke `audit_logs`, ubah semua ke format kanonis agar ke depan tidak tergantung kolom legacy.

5. Audit objek database yang mungkin tertinggal
   - Review function/trigger terkait perubahan booking, pembayaran, dan registrasi.
   - Jika ada function lama di backend yang masih memakai `old_values/new_values`, ganti ke format kanonis atau biarkan tetap kompatibel tapi terdokumentasi.

6. Verifikasi end-to-end
   - Uji ulang:
     - konfirmasi booking dari detail booking
     - konfirmasi pendaftaran/jamaah jika ada flow terpisah
     - verifikasi pembayaran yang memicu perubahan status
   - Pastikan:
     - tidak ada lagi error missing column
     - perubahan status tetap tersimpan
     - entry audit tetap tercatat dan bisa dibaca di halaman audit/security

Kenapa fix sebelumnya belum menyelesaikan masalah:
- Sebelumnya hanya ditambahkan `resource_type`/`resource_id`.
- Sekarang muncul `old_values`, artinya jalur lama masih aktif dan skema audit masih campuran beberapa versi.
- Jadi solusi yang benar adalah compatibility patch penuh + normalisasi caller, bukan tambal satu kolom setiap kali error baru muncul.

Detail teknis implementasi:
- File utama yang akan disentuh:
  - `supabase/migrations/...` untuk compatibility migration
  - `src/lib/audit-logger.ts`
  - `src/pages/admin/AdminBookingDetail.tsx`
  - kemungkinan `src/pages/admin/AdminBookings.tsx` dan flow registrasi terkait
- Objek database utama:
  - `public.audit_logs`
  - function/trigger audit terkait booking atau registrasi
- Pendekatan aman:
  - gunakan migration idempotent (`IF NOT EXISTS`)
  - hindari ubah file auto-generated client
  - pertahankan kompatibilitas sementara sambil menormalkan semua penulis audit ke `old_data/new_data`
