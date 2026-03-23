# Umrah Haji - Portal Jamaah

Aplikasi Portal Jamaah Umrah & Haji yang dibangun dengan teknologi modern untuk memberikan pengalaman terbaik bagi jamaah.

## Teknologi yang Digunakan

Proyek ini dibangun menggunakan:

- **Vite**: Build tool frontend generasi berikutnya.
- **TypeScript**: Superset JavaScript yang menambahkan tipe statis.
- **React**: Library JavaScript untuk membangun antarmuka pengguna.
- **shadcn-ui**: Komponen UI yang dapat digunakan kembali dan dibangun dengan Radix UI dan Tailwind CSS.
- **Tailwind CSS**: Framework CSS utility-first untuk desain cepat.
- **Supabase**: Backend-as-a-Service untuk database dan autentikasi.

## Cara Menjalankan Proyek Secara Lokal

Pastikan Anda telah menginstal Node.js dan npm di komputer Anda.

1.  **Clone repositori:**
    ```sh
    git clone https://github.com/bonangpanjinur/umrah-haji-magic.git
    ```

2.  **Masuk ke direktori proyek:**
    ```sh
    cd umrah-haji-magic
    ```

3.  **Instal dependensi:**
    ```sh
    npm install
    ```

4.  **Konfigurasi Environment Variables:**
    Salin file `.env.example` menjadi `.env` dan isi dengan kredensial Supabase Anda.
    ```sh
    cp .env.example .env
    ```

5.  **Jalankan server pengembangan:**
    ```sh
    npm run dev
    ```

## Deployment

Proyek ini dikonfigurasi untuk di-deploy di **Vercel**. Pastikan Anda telah mengatur _Environment Variables_ yang diperlukan di dasbor Vercel Anda seperti yang dijelaskan dalam panduan konfigurasi.
