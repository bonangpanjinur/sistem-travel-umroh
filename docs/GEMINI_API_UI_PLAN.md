# Analisis Kebutuhan dan Rencana Pengembangan UI API Key Gemini

Dokumen ini merinci analisis kebutuhan, rencana perbaikan, dan langkah-langkah pengembangan untuk mengimplementasikan fitur input API Key Gemini langsung melalui Panel Admin pada sistem Vinstour Travel.

## 1. Analisis Kebutuhan

### Masalah Saat Ini
Berdasarkan analisis kode pada `AdminGeminiAI.tsx` dan `chatbot.ts`:
- API Key Gemini saat ini hanya bisa dikonfigurasi melalui *environment variable* (`GEMINI_API_KEY`).
- Pengguna non-teknis (admin) kesulitan jika harus mengakses server/Replit Secrets untuk mengubah API Key.
- Belum ada UI di Panel Admin untuk memasukkan atau memperbarui API Key secara dinamis.

### Kebutuhan Fitur
1. **Input Lapangan (Field Input)**: Field teks di Panel Admin untuk memasukkan API Key.
2. **Keamanan (Security)**:
   - Masking input (tipe password) dengan toggle lihat/sembunyi.
   - API Key tidak boleh dikirim kembali ke browser secara utuh setelah disimpan.
3. **Persistensi**: Menyimpan API Key ke dalam tabel `app_settings` di database.
4. **Fallback Logic**: Sistem harus memprioritaskan *Environment Variable* (jika ada), lalu menggunakan key dari database sebagai cadangan.
5. **Validasi**: Tombol "Test Koneksi" harus memverifikasi key yang baru dimasukkan sebelum disimpan.

---

## 2. Rencana Perbaikan & Arsitektur

### Komponen Frontend (`AdminGeminiAI.tsx`)
- Menambahkan state baru `apiKey` dan `showApiKey`.
- Mengganti blok instruksi manual dengan form input yang modern menggunakan komponen Shadcn UI.
- Memperbarui fungsi `save()` untuk menyertakan `apiKey`.

### Komponen Backend (`chatbot.ts`)
- **GET `/config`**: Mengembalikan boolean `isDatabaseKeySet` selain `geminiKeySet` (env).
- **POST `/config`**: Menerima `geminiApiKey`, mengenkripsi (opsional) atau menyimpannya ke JSON `gemini_chatbot_config` di tabel `app_settings`.
- **Logic Chat**: Memodifikasi pengambilan `geminiKey` agar mengecek `process.env` terlebih dahulu, kemudian konfigurasi di database.

### Struktur Data
Data akan disimpan dalam tabel `app_settings` dengan key `gemini_chatbot_config`.
Struktur JSON yang diperluas:
```json
{
  "model": "...",
  "systemPrompt": "...",
  "geminiApiKey": "AIzaSy...", 
  "enableFAQContext": true,
  ...
}
```

---

## 3. Rencana Pengembangan (Step-by-Step)

### Tahap 1: Persiapan Backend
1. Memodifikasi `getAdminConfig` untuk mengambil `geminiApiKey` dari database.
2. Memperbarui endpoint `POST /api/v1/chatbot/config` untuk memproses penyimpanan API Key.
3. Memperbarui endpoint `GET /api/v1/chatbot/config` agar memberitahu frontend jika key sudah ada di DB tanpa membocorkan nilainya.

### Tahap 2: Implementasi UI Frontend
1. Menambahkan field `Input` dengan ikon `Key` dan tombol toggle visibilitas.
2. Menghubungkan field tersebut dengan state React.
3. Memperbarui fungsi "Test" agar bisa menguji key yang ada di input sebelum disimpan ke database.

### Tahap 3: Pengujian & Finalisasi
1. Uji coba simpan API Key.
2. Uji coba chatbot dengan menghapus sementara env var (jika memungkinkan dalam simulasi) untuk memastikan fallback ke DB berfungsi.
3. Finalisasi styling agar selaras dengan desain dashboard yang ada.
