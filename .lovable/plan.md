
## Masalah Utama

Aplikasi gagal terhubung ke Supabase saat di-deploy ke Vercel meskipun env sudah diisi. Penyebabnya:

1. **`src/integrations/supabase/client.ts` rapuh** — hanya membaca `import.meta.env.VITE_SUPABASE_URL` & `VITE_SUPABASE_PUBLISHABLE_KEY`. Bila Vercel tidak meng-inject (salah nama, salah scope Production/Preview, atau env baru ditambah tapi belum re-deploy), `createClient` dipanggil dengan `undefined` → seluruh aplikasi blank/error tanpa pesan jelas.
2. **`.env` di-gitignore** (stack Vite klasik) — wajar, tapi artinya Vercel **harus** menyediakan env saat build. Tidak ada fallback dan tidak ada validasi.
3. **Tidak ada pesan error yang membantu** — user hanya lihat layar putih / "Failed to fetch" tanpa tahu env mana yang hilang.
4. **Nama variabel Vercel sering keliru** — user kerap menambahkan `SUPABASE_URL` (tanpa prefix `VITE_`), atau `VITE_SUPABASE_ANON_KEY` (sementara kode pakai `VITE_SUPABASE_PUBLISHABLE_KEY`). Vite **hanya** mengekspos variabel yang diawali `VITE_`.
5. **SPA fallback Vercel** — `vercel.json` sudah benar, jadi bukan sumber masalah refresh 404.

## Yang Akan Diubah

### 1. Perkuat Supabase client (`src/integrations/supabase/client.ts`)
- Baca env dengan beberapa nama alternatif agar kompatibel dengan apa pun yang user set di Vercel:
  - URL: `VITE_SUPABASE_URL` → fallback `VITE_SUPABASE_PROJECT_URL`
  - Key: `VITE_SUPABASE_PUBLISHABLE_KEY` → fallback `VITE_SUPABASE_ANON_KEY`
- Tambahkan **fallback hardcoded** ke nilai project Lovable Cloud yang sudah diketahui (URL `https://ribjppjnjigiowhjgngu.supabase.co` + anon key publik dari context). Anon key adalah **publishable** sehingga aman di client. Ini menjamin app tidak pernah crash karena env hilang di Vercel.
- Validasi format URL sebelum `createClient`; lempar error jelas bila tetap kosong.
- Log peringatan di console saat fallback aktif sehingga user tahu env Vercel-nya tidak terbaca.

### 2. Tambahkan komponen diagnostik environment (`src/components/EnvDiagnostic.tsx`) — opsional, hanya tampil bila `?debug=env` di URL
- Menampilkan: URL terdeteksi (dimasking), sumber (env vs fallback), apakah anon key tersedia, hasil ping `auth.getSession()`.
- Berguna untuk verifikasi cepat di production.

### 3. Update `.env.example` & buat `VERCEL_SETUP.md`
- Daftar nama env **persis** yang harus di-set di Vercel:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_SUPABASE_PROJECT_ID`
- Instruksi: set di Project Settings → Environment Variables → centang **Production, Preview, Development** → **Redeploy** (env baru tidak berlaku tanpa redeploy).
- Catatan: nama harus diawali `VITE_` agar Vite expose ke browser.

### 4. Bug-bug lain yang akan diperbaiki sambil jalan
- `vite.config.ts` — `manualChunks` saat ini meletakkan `@radix-ui` dan `recharts` di chunk yang sama (`vendor-ui`). Ini bisa menyebabkan chunk besar tapi tidak fatal; biarkan kecuali ada laporan lambat.
- Pastikan `client.ts` tetap diberi komentar "auto-generated, do not edit" namun aman terhadap regenerasi (perubahan minimal & defensive).

### 5. Verifikasi setelah implementasi
- Jalankan dev server lokal tanpa `.env` → app harus tetap jalan via fallback dengan warning di console.
- Cek tidak ada error TypeScript baru.

## Detail Teknis

**Pola client.ts baru (ringkas):**
```ts
const FALLBACK_URL = "https://ribjppjnjigiowhjgngu.supabase.co";
const FALLBACK_KEY = "<anon key publik>";

const url =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_PROJECT_URL ||
  FALLBACK_URL;

const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  FALLBACK_KEY;

if (!import.meta.env.VITE_SUPABASE_URL) {
  console.warn("[supabase] VITE_SUPABASE_URL tidak ditemukan, memakai fallback.");
}
```

**Yang TIDAK diubah:**
- Skema database, edge functions, RLS — semua sudah benar.
- `vercel.json`, routing, PWA config.
- File `types.ts` (auto-generated).

## Hasil Akhir

- App terhubung ke Supabase di Vercel walau env salah/lupa di-set (via fallback aman).
- Bila user tetap mau pakai project Supabase berbeda, cukup set `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` di Vercel lalu redeploy — kode otomatis pilih env tsb.
- Console memberi petunjuk jelas saat env tidak terbaca.
- Dokumentasi setup Vercel tersedia di repo.
