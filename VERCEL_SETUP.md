# Setup Deployment ke Vercel

Aplikasi ini adalah Vite + React. Vite hanya meng-expose env yang diawali
`VITE_`. Penyebab utama "tidak terhubung ke Supabase di Vercel" hampir selalu
salah satu dari ini:

1. Nama variabel salah (mis. `SUPABASE_URL` tanpa prefix `VITE_`).
2. Variabel hanya di-set untuk satu environment (Production saja, tapi Anda
   buka Preview).
3. Variabel ditambahkan **setelah** deploy terakhir → Vercel **tidak otomatis
   redeploy**.

## Variabel Environment yang Wajib di Vercel

| Name                              | Value contoh                                          |
| --------------------------------- | ----------------------------------------------------- |
| `VITE_SUPABASE_URL`               | `https://ribjppjnjigiowhjgngu.supabase.co`            |
| `VITE_SUPABASE_PUBLISHABLE_KEY`   | anon/publishable key (eyJhbGciOi...)                  |
| `VITE_SUPABASE_PROJECT_ID`        | `ribjppjnjigiowhjgngu`                                |

> Anon/publishable key **aman** ada di kode browser. Jangan pernah taruh
> `service_role` key di sini.

## Langkah Setup

1. Buka **Vercel → Project → Settings → Environment Variables**.
2. Tambahkan 3 variabel di atas. **Centang ketiganya**: Production, Preview,
   Development.
3. Buka tab **Deployments** → tiga titik pada deployment terakhir →
   **Redeploy** (jangan centang "Use existing Build Cache").
4. Setelah selesai, buka URL produksi + tambahkan `?debug=env` di akhir
   (mis. `https://app-anda.vercel.app/?debug=env`) untuk melihat panel
   diagnostik.

## Fallback Otomatis

`src/integrations/supabase/client.ts` sudah dibuat tahan banting: kalau env
Vercel hilang/salah nama, app tetap konek ke project Lovable Cloud bawaan
(via fallback). Anda akan lihat warning di console:

```
[supabase] VITE_SUPABASE_URL tidak ditemukan di env. Memakai fallback Lovable Cloud.
```

Itu artinya env Vercel-nya belum terbaca — ikuti langkah Setup di atas.

## Troubleshooting Cepat

- **Layar putih + console "Failed to fetch"** → env hilang / URL salah.
  Cek `?debug=env`.
- **Auth selalu gagal** → key salah scope (mis. service_role bukan anon),
  atau anon key sudah dirotasi tapi belum di-update di Vercel.
- **Refresh halaman 404** → sudah ditangani `vercel.json` (rewrite ke
  `/index.html`). Bila masih 404, pastikan file ini ikut ter-deploy.
- **Custom domain CORS error** → tambahkan domain Vercel di Supabase →
  Authentication → URL Configuration → Site URL & Redirect URLs.