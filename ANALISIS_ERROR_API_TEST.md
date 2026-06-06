# Analisis Error API Test Gemini AI

Berdasarkan pesan error yang muncul: **"Test gagal: Unexpected token 'T', \"The page c\"... is not valid JSON"**, berikut adalah analisis penyebab dan solusinya.

## 1. Identifikasi Masalah
Pesan error `Unexpected token 'T', "The page c"... is not valid JSON` menunjukkan bahwa aplikasi mencoba memproses respons dari server sebagai **JSON**, namun server justru mengirimkan teks biasa atau **HTML** yang diawali dengan kata-kata seperti *"The page could not be found"* atau *"The page cannot be displayed"*.

## 2. Akar Penyebab (Root Cause)
Setelah menganalisis kode pada `AdminGeminiAI.tsx` dan `chatbot.ts`, ditemukan beberapa kemungkinan penyebab utama:

| Penyebab | Deskripsi |
| :--- | :--- |
| **Endpoint Tidak Ditemukan (404)** | Frontend memanggil `/api/v1/chatbot/test`, namun jika server (Express/Vite) tidak mengenali rute ini, server akan mengembalikan halaman HTML 404 standar. |
| **Error Proxy/Middleware** | Jika aplikasi dijalankan di lingkungan seperti Replit atau Vercel, terkadang proxy mengembalikan halaman error HTML sebelum permintaan mencapai kode backend Anda. |
| **Environment Variable Hilang** | Kode di `chatbot.ts` pada baris 375 mencoba mengambil `process.env['GEMINI_API_KEY']`. Jika variabel ini tidak ada, server seharusnya mengembalikan JSON error, namun jika terjadi *crash* di level middleware, HTML error bisa muncul. |

## 3. Detail Teknis
Pada file `src/pages/admin/AdminGeminiAI.tsx`:
```typescript
const res = await fetch("/api/v1/chatbot/test", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: testInput, model }),
});
const data: any = await res.json(); // <-- Error terjadi di sini
```
Ketika `res.json()` dipanggil pada respons yang bukan JSON (melainkan HTML), JavaScript akan melemparkan error `Unexpected token`.

## 4. Langkah Perbaikan yang Disarankan
1. **Pastikan Server Berjalan**: Pastikan backend Express Anda aktif dan rute `/api/v1/chatbot/test` sudah terdaftar dengan benar.
2. **Cek API Key**: Pastikan `GEMINI_API_KEY` sudah terisi di Database atau Environment Secrets.
3. **Validasi Respons**: Ubah kode di frontend untuk mengecek tipe konten sebelum melakukan parsing JSON:
   ```typescript
   const contentType = res.headers.get("content-type");
   if (contentType && contentType.indexOf("application/json") !== -1) {
       const data = await res.json();
       // ... proses data
   } else {
       const text = await res.text();
       throw new Error("Server mengembalikan respons non-JSON: " + text.substring(0, 50));
   }
   ```

## 5. Perubahan yang Telah Dilakukan
Sesuai permintaan Anda, bagian **"Alternatif: Setup via Environment Secret Replit"** telah dihapus dari file `AdminGeminiAI.tsx` untuk menyederhanakan antarmuka dan fokus pada penyimpanan via database.
