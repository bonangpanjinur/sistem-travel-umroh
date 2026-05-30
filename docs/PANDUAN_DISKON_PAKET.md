# Panduan Pengelolaan Diskon Paket - Vins Tour & Travel

Fitur diskon telah berhasil ditambahkan ke dalam sistem. Sekarang, Anda dapat memberikan potongan harga langsung pada setiap paket perjalanan melalui Panel Admin. Berikut adalah panduan langkah demi langkah untuk menggunakan fitur ini.

---

## 1. Menuju Menu Paket
1. Masuk ke **Panel Admin**.
2. Pilih menu **Paket** atau **Packages** pada sidebar.
3. Anda akan melihat daftar paket yang tersedia.

## 2. Mengedit Paket
1. Cari paket yang ingin Anda berikan diskon.
2. Klik tombol **Edit** (ikon pensil) atau klik nama paket untuk masuk ke detail, lalu klik **Edit Paket**.

## 3. Mengatur Diskon
Di dalam form pengeditan paket, scroll ke bagian bawah hingga Anda menemukan bagian **"Pengaturan Diskon"**. Terdapat dua opsi yang bisa Anda gunakan:

| Opsi | Penjelasan | Contoh Penggunaan |
| :--- | :--- | :--- |
| **Potongan Harga (Nominal)** | Memotong harga dengan nilai tetap (rupiah). | Masukkan `1000000` untuk diskon Rp 1.000.000. |
| **Potongan Harga (%)** | Memotong harga berdasarkan persentase. | Masukkan `5` untuk diskon 5% dari harga paket. |

> [!TIP]
> **Kombinasi Diskon:** Jika Anda mengisi keduanya, sistem akan menghitung potongan persentase terlebih dahulu, baru kemudian memotong nominal tetap. Namun, disarankan untuk menggunakan salah satu saja agar lebih mudah dikelola.

## 4. Menyimpan Perubahan
1. Setelah mengisi nilai diskon, klik tombol **Simpan** atau **Update Paket**.
2. Sistem akan memperbarui data di database.

## 5. Tampilan di Website (User Side)
Setelah diskon dipasang, sistem akan otomatis melakukan hal berikut pada tampilan jemaah:
*   **Badge Diskon:** Muncul label "🎉 DISKON" pada gambar paket.
*   **Harga Coret:** Harga asli akan ditampilkan dengan garis coret (strikethrough).
*   **Harga Final:** Harga setelah diskon akan ditampilkan sebagai harga utama.

---

## Catatan Teknis
*   **Perhitungan Otomatis:** Diskon dihitung dari harga terendah yang tersedia pada keberangkatan (departure) paket tersebut.
*   **Mata Uang:** Diskon nominal akan mengikuti mata uang yang diatur pada paket (misal: IDR atau USD).
*   **Prioritas:** Diskon ini bersifat langsung pada paket, berbeda dengan kode kupon yang dimasukkan saat checkout.

---
*Dokumen ini dibuat otomatis oleh sistem asisten pada 30 Mei 2026.*
