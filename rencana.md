# Rencana Perbaikan Chatbot — Vinstour Travel Portal

## Arsitektur Saat Ini

Sistem chatbot terdiri dari 3 lapisan:

| Lapisan | Komponen | Keterangan |
|---|---|---|
| Backend | `artifacts/api-server/src/routes/v1/chatbot.ts` | Gemini → OpenAI → FAQ fallback |
| User — Jamaah | `artifacts/umrah-haji/src/pages/jamaah/JamaahChatbot.tsx` | Portal jamaah login, fitur lengkap |
| User — Publik | `artifacts/umrah-haji/src/components/home/FloatingChatBubble.tsx` | Widget floating, lead capture |
| Admin Stats | `artifacts/umrah-haji/src/pages/admin/AdminChatbotStats.tsx` | Grafik agregat |
| Admin Leads | `artifacts/umrah-haji/src/pages/admin/AdminChatLeads.tsx` | Manajemen lead |

---

## Kelemahan yang Ditemukan

### 1. FAQ Knowledge Base Duplikat & Tidak Bisa Diedit Admin
FAQ hardcoded di **dua tempat**:
- `FloatingChatBubble.tsx` baris 20–31 — kamus FAQ lokal di frontend
- `chatbot.ts` backend — versi FAQ terpisah untuk fallback API

Jika admin ingin mengupdate informasi harga, kebijakan refund, atau dokumen — harus minta developer. Tidak ada UI admin untuk mengelola FAQ.

### 2. Admin Tidak Bisa Melihat Isi Percakapan
Tabel `chatbot_logs` sudah ada di database dengan kolom `message`, `answer`, `source`, `rating`, `channel` — tetapi `AdminChatbotStats` hanya menampilkan grafik agregat. Admin tidak bisa membaca percakapan individual, mencari log berdasarkan kata kunci, atau melihat percakapan penuh per sesi.

### 3. "Top Questions" Mengambil Data dari Tabel yang Salah
`AdminChatbotStats.tsx` menghitung top questions dari tabel `chat_leads.message` — yaitu pesan pertama dari lead form — bukan dari `chatbot_logs.message` yang berisi pertanyaan sesungguhnya ke chatbot. Data yang tampil di dashboard tidak mencerminkan realita.

### 4. Widget Publik Tidak Ada Mekanisme Rating
`JamaahChatbot.tsx` punya tombol 👍/👎 per pesan yang dikirim ke `PATCH /api/v1/chatbot/rate`. `FloatingChatBubble.tsx` tidak punya fitur rating sama sekali — kualitas jawaban chatbot untuk pengunjung publik tidak pernah terukur.

### 5. Riwayat Chat Hanya di localStorage
Percakapan jamaah disimpan di `localStorage` browser:
- Ganti perangkat → riwayat hilang
- Buka di browser lain → mulai dari nol
- Tidak ada backup server-side per user

Padahal `chatbot_logs` sudah menyimpan `user_id` — bisa dijadikan sumber kebenaran.

### 6. Tidak Ada Deteksi Pertanyaan Tak Terjawab / Eskalasi
Ketika AI menjawab dengan fallback generic, tidak ada penandaan otomatis "pertanyaan tidak terjawab", tidak ada notifikasi ke admin, dan tidak ada mekanisme handoff ke human agent (hanya link WhatsApp statis).

### 7. Konfigurasi Admin Tidak Mendukung Per-Channel
`app_settings.gemini_chatbot_config` hanya menyimpan satu `systemPrompt` dan `model`. Padahal `JamaahChatbot` (portal jamaah) dan `FloatingChatBubble` (pengunjung publik) punya konteks yang sangat berbeda.

### 8. Stats Tidak Real-Time
`AdminChatbotStats` hanya memuat data sekali saat halaman dibuka — tidak ada polling atau Supabase realtime subscription. `AdminChatLeads` sudah punya realtime, tapi stats tidak.

---

## Rencana Perbaikan (Berurutan Prioritas)

### Prioritas 1 — FAQ Manager di Admin Panel

Buat halaman admin baru `AdminFAQManager` yang memungkinkan admin CRUD FAQ entries langsung dari UI. Simpan ke tabel `faq_knowledge_base` di Supabase. Backend `chatbot.ts` dan `FloatingChatBubble` keduanya baca dari sumber yang sama, menghapus duplikasi.

**Tabel baru di Supabase:**
```sql
CREATE TABLE faq_knowledge_base (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword    TEXT    NOT NULL,
  answer     TEXT    NOT NULL,
  category   TEXT,
  is_active  BOOLEAN DEFAULT true,
  sort_order INT     DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**File yang perlu dibuat/diubah:**
- Buat: `artifacts/umrah-haji/src/pages/admin/AdminFAQManager.tsx`
- Ubah: `artifacts/api-server/src/routes/v1/chatbot.ts` — baca FAQ dari Supabase, bukan hardcoded
- Ubah: `artifacts/umrah-haji/src/components/home/FloatingChatBubble.tsx` — hapus `FAQ_KNOWLEDGE_BASE` lokal, fetch dari API
- Tambah route admin di router

---

### Prioritas 2 — Log Viewer Percakapan di Admin Panel

Buat tab baru di halaman chatbot admin: "Log Percakapan".

**Fitur:**
- Tabel `chatbot_logs` dengan filter: channel (jamaah/widget), source (gemini/faq), rating, rentang tanggal
- Search full-text berdasarkan pesan user
- Expand row untuk melihat jawaban lengkap
- Realtime subscription untuk log masuk baru

**File yang perlu dibuat/diubah:**
- Buat: `artifacts/umrah-haji/src/pages/admin/AdminChatLogs.tsx`
- Tambah route dan navigasi di admin panel

---

### Prioritas 3 — Perbaiki Data Source Top Questions

Ganti query di `AdminChatbotStats` dari `chat_leads.message` ke `chatbot_logs.message` dengan `GROUP BY` untuk mendapatkan kata kunci yang paling sering ditanyakan. Tambahkan filter per source dan per channel.

**File yang perlu diubah:**
- `artifacts/umrah-haji/src/pages/admin/AdminChatbotStats.tsx` — perbaiki query top questions

---

### Prioritas 4 — Rating di Widget Publik

Tambahkan tombol 👍/👎 sederhana di bawah setiap jawaban pada `FloatingChatBubble`. Saat diklik, panggil `PATCH /api/v1/chatbot/rate` dengan `logId` yang dikembalikan dari API response.

**File yang perlu diubah:**
- `artifacts/api-server/src/routes/v1/chatbot.ts` — tambahkan `logId` ke response body
- `artifacts/umrah-haji/src/components/home/FloatingChatBubble.tsx` — tambahkan tombol rating per pesan

---

### Prioritas 5 — Riwayat Chat dari Server

Untuk jamaah yang sudah login, load riwayat percakapan dari `chatbot_logs` (filter `user_id = auth.uid()`, order by `created_at`) sebagai pengganti localStorage. Gunakan localStorage hanya sebagai cache offline.

**File yang perlu diubah:**
- `artifacts/umrah-haji/src/pages/jamaah/JamaahChatbot.tsx` — ganti inisialisasi history dari localStorage ke query Supabase

---

### Prioritas 6 — Deteksi Pertanyaan Tak Terjawab

Di backend, ketika source = `faq` dan tidak ada keyword yang cocok (fallback generic), tambahkan flag `is_unanswered = true` di log. Di admin panel, tampilkan badge/counter "Pertanyaan Belum Terjawab" dan filter khusus agar admin bisa melihat dan menambahkannya sebagai FAQ baru.

**File yang perlu diubah:**
- `artifacts/api-server/src/routes/v1/chatbot.ts` — tambahkan kolom/flag `is_unanswered`
- `artifacts/umrah-haji/src/pages/admin/AdminChatLogs.tsx` — tambahkan filter unanswered
- Database: tambahkan kolom `is_unanswered BOOLEAN DEFAULT false` di `chatbot_logs`

---

### Prioritas 7 — System Prompt Per-Channel

Extend `gemini_chatbot_config` di `app_settings` dengan struktur `channelPrompts`:

```json
{
  "model": "gemini-1.5-flash",
  "systemPrompt": "...",
  "channelPrompts": {
    "jamaah": "Kamu membantu jamaah yang sudah terdaftar...",
    "widget": "Kamu membantu calon jamaah baru yang belum mendaftar..."
  }
}
```

Backend pilih prompt sesuai `channel` yang dikirim di request body.

**File yang perlu diubah:**
- `artifacts/api-server/src/routes/v1/chatbot.ts` — baca `channelPrompts[channel]`
- `artifacts/umrah-haji/src/pages/admin/AdminChatbotStats.tsx` atau config page — tambahkan input per-channel prompt

---

### Prioritas 8 — Stats Realtime

Tambahkan Supabase realtime subscription di `AdminChatbotStats` untuk tabel `chatbot_logs`. Setiap INSERT baru, update counter KPI secara inkremental tanpa reload penuh halaman.

**File yang perlu diubah:**
- `artifacts/umrah-haji/src/pages/admin/AdminChatbotStats.tsx` — tambahkan `supabase.channel()` subscription

---

## Ringkasan Prioritas

| # | Perbaikan | Dampak | Kompleksitas | File Utama |
|---|---|---|---|---|
| 1 | FAQ Manager admin | Tinggi | Sedang | `AdminFAQManager.tsx`, `chatbot.ts`, `FloatingChatBubble.tsx` |
| 2 | Log Viewer percakapan | Tinggi | Sedang | `AdminChatLogs.tsx` |
| 3 | Perbaiki Top Questions | Sedang | Rendah | `AdminChatbotStats.tsx` |
| 4 | Rating di widget publik | Sedang | Rendah | `FloatingChatBubble.tsx`, `chatbot.ts` |
| 5 | Riwayat dari server | Tinggi | Sedang | `JamaahChatbot.tsx` |
| 6 | Deteksi unanswered | Sedang | Rendah | `chatbot.ts`, `AdminChatLogs.tsx` |
| 7 | Prompt per-channel | Sedang | Rendah | `chatbot.ts` |
| 8 | Stats realtime | Rendah | Rendah | `AdminChatbotStats.tsx` |
