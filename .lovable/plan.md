## Diagnosa

Gejala (login gagal fetch, loading lama, tiba-tiba ter-logout) **bukan bug di kode**. Penyebabnya tunggal dan jelas dari console log:

```
POST https://vtaqwkpnvtazcnvcfmyy.supabase.co/auth/v1/token  net::ERR_TIMED_OUT
                                                              net::ERR_QUIC_PROTOCOL_ERROR
WebSocket wss://vtaqwkpnvtazcnvcfmyy.supabase.co/realtime/...  failed
```

- Production `vinstourtravel.com` (di-deploy di Vercel) memakai backend **`vtaqwkpnvtazcnvcfmyy.supabase.co`** — backend ini **tidak responsif** (semua request timeout).
- Project Lovable Cloud yang aktif & sehat sekarang adalah **`ribjppjnjigiowhjgngu.supabase.co`** (sesuai `.env` repo & status backend = healthy).
- Karena `auth/token?grant_type=refresh_token` selalu gagal → token expired → user di-logout otomatis → loading lama menunggu timeout → login form fetch terus.

Artinya **environment variable di Vercel mengarah ke project Supabase yang lama/mati**, sementara repo (dan Lovable preview) sudah pindah ke project baru.

## Yang harus dilakukan (oleh user di Vercel — tidak bisa otomatis oleh Lovable)

Karena hosting di Vercel manual, Lovable tidak punya akses mengganti env var di sana. Langkahnya:

1. Buka **Vercel → Project `vinstourtravel` → Settings → Environment Variables**.
2. Cari & update 3 variabel ini ke nilai project Lovable Cloud yang aktif:

   ```
   VITE_SUPABASE_URL              = https://ribjppjnjigiowhjgngu.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY  = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3Mi...Pj6vluA
   VITE_SUPABASE_PROJECT_ID       = ribjppjnjigiowhjgngu
   ```
   (Nilai persis sama dengan `.env` repo sekarang.)

3. **Redeploy** dari Vercel (Deployments → ⋯ → Redeploy, **uncheck** "Use existing Build Cache").

4. Setelah deploy selesai, **hard-refresh** browser (Ctrl/Cmd + Shift + R) supaya bundle `index-BZBbzvAH.js` yang lama (masih hardcoded ke project mati) terganti.

5. Karena ada **Service Worker** terdaftar (`SW registered: https://www.vinstourtravel.com/`), buka DevTools → Application → Service Workers → **Unregister**, lalu Application → Storage → **Clear site data**, lalu reload. Ini wajib — kalau tidak, SW akan tetap menyajikan asset JS lama.

## Verifikasi sesudahnya

- Network tab seharusnya menunjukkan request ke `ribjppjnjigiowhjgngu.supabase.co` (bukan `vtaqwkpnvtazcnvcfmyy`).
- `auth/v1/token` return 200, bukan TIMED_OUT.
- Login berhasil, tidak ada lagi auto-logout, dan logo (`logo-1774349613743.png` yang juga timed-out di storage project lama) muncul lagi.

## Catatan

- **Data di project lama (`vtaqwkpnvtazcnvcfmyy`) tidak ikut pindah.** Kalau user/booking/dokumen lama ada di sana, perlu migrasi data terpisah (export → import). Konfirmasi dulu apakah project lama itu sengaja dimatikan / sudah dipindah, atau perlu kita rencanakan migrasi.
- Tidak ada perubahan kode aplikasi yang dibutuhkan untuk fix ini.
- Setelah backend benar, kalau masih ada race-condition kecil saat init session, kita bisa tambahkan guard `useAuthReady` — tapi itu opsional dan baru relevan setelah env-nya benar.

## Yang perlu saya tahu dari user

1. Apakah project lama `vtaqwkpnvtazcnvcfmyy` **sengaja ditinggalkan** (boleh diabaikan), atau **masih berisi data produksi** yang harus diselamatkan dulu sebelum switch?
2. Apakah Anda mau saya pandu live (step-by-step screenshot Vercel), atau Anda jalankan sendiri lalu lapor kalau ada kendala?
