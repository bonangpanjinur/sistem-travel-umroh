
# Rencana: Portal Jamaah PWA Islami + Modul Toko Lengkap

## Bagian 1 — Redesign Full Portal Jamaah (PWA Islami)

### 1.1 Bahasa Visual Baru ("Vinstour Islamic UI Kit")
Inspirasi: Muslim Pro, Athan, Umma, Quran.com — kombinasi nuansa hijau zamrud + emas, ornamen geometri Islam, kaligrafi Arab tipis sebagai aksen.

Token desain baru di `index.css` (mode jamaah scope `[data-portal="jamaah"]`):
- Palette: Emerald deep `#0F2E1F`, Emerald `#1F7A4D`, Gold `#C9A96E`, Sand `#F5F1E8`, Ink `#0B1F14`.
- Gradient: `--gradient-mihrab` (hero arch), `--gradient-night-sky` (waktu sholat malam), `--gradient-dawn` (subuh).
- Font: heading **Amiri** / **Reem Kufi** (Arabic + display Latin), body **Plus Jakarta Sans** (sudah ada).
- Ornamen SVG reusable: `<IslamicArch/>`, `<GeometricPattern/>`, `<CrescentMoon/>`, `<MosqueSilhouette/>`, `<KaabaIcon/>` di `src/components/jamaah/ornaments/`.
- Kartu standar: `rounded-3xl`, border `1px hsl(var(--gold)/.25)`, soft shadow, optional pattern overlay 5% opacity.
- Animasi: `framer-motion` fade+slide pada masuk halaman, Quran ayat marquee halus, kompas kiblat smooth rotate.

### 1.2 Komponen Bersama Baru
`src/components/jamaah/shell/`:
- `JamaahAppShell.tsx` — wrapper standar (status bar warna, safe-area, header, content, bottom nav).
- `JamaahHeader.tsx` — greeting kontekstual ("Assalamualaikum, {nama}"), waktu Hijriyah + Masehi, lokasi kota, tombol notif & profil.
- `JamaahPageHeader.tsx` — header halaman dengan arch + breadcrumb + back.
- `IslamicCard.tsx`, `IslamicSectionTitle.tsx`, `AyatBanner.tsx` (random ayat harian).
- `JamaahBottomNav.tsx` direvisi: 5 tab (Beranda, Ibadah, Perjalanan, Toko, Akun) — ikon kustom + indicator pill emas.

### 1.3 Halaman Utama (`JamaahPortal`) — Home Seimbang
Urutan section (semua dalam app shell baru):
1. **Hero Mihrab** — arch SVG, greeting + nama, tanggal Hijriyah, prayer-times mini (4 sholat berikutnya + countdown).
2. **Quick Actions Grid (4)** — Al-Qur'an, Kiblat, Doa Harian, Tasbih.
3. **Status Perjalanan** — kartu booking aktif (countdown keberangkatan, progress dokumen, paid bar).
4. **Cross-sell Paket** — slider "Paket Pilihan Bulan Ini" (data dari `packages`).
5. **Etalase Toko Perlengkapan** — 4 produk featured (koper, ihram, dll) + CTA "Lihat Semua".
6. **Tabungan Umroh** — progress saving, CTA setor.
7. **Program Referral** — kode referral user + ringkasan komisi + CTA share WA.
8. **Galeri & Sertifikat** singkat untuk alumni.
9. **Kontak Tour Leader / SOS** floating.

### 1.4 Halaman Ibadah Inti (rebuild visual)
- `JamaahWaktuSholat` — full-bleed gradient sesuai waktu (subuh/dzuhur/ashar/maghrib/isya), kaligrafi nama sholat, countdown besar, list 7 hari, kalender Hijriyah.
- `JamaahAlQuran` — list surah ala Quran.com, mode baca Mushaf-style, font Uthmani, audio per ayat, bookmark.
- `JamaahKiblat` — kompas circular emas + Ka'bah icon, derajat akurasi, kalibrasi.
- `JamaahDoaPanduan` / `JamaahZikir` — kartu doa Arab + latin + arti, counter tasbih besar.
- `JamaahTrackerIbadah`, `JamaahDoaCounter`, `JamaahJurnal`, `JamaahTargetIbadah`, `JamaahBadges` — disesuaikan ke shell + token baru.

### 1.5 Halaman Perjalanan & Dokumen
Restyle ke shell baru tanpa ubah logika:
`JamaahItinerary`, `JamaahDocuments`, `JamaahVisaTracker`, `JamaahPayment`, `JamaahPaymentHistory`, `JamaahInvoice`, `JamaahKontrak`, `JamaahDigitalID`, `JamaahCheckin`, `JamaahBagasi`, `JamaahKesehatan`, `JamaahSISKOHAT`, `JamaahManasik(Interaktif)`, `JamaahPetaLokasi`, `JamaahRombongan`, `JamaahPantauKeluarga`, `JamaahRingkasanAI`, `JamaahRiwayatPerjalanan`, `JamaahSertifikat`, `JamaahGaleri`, `JamaahFeedback`, `JamaahWishlist`, `JamaahReferral`, `JamaahNotifications`, `JamaahChat`, `JamaahChatbot`, `JamaahKalkulatorKurs`, `JamaahKalkulatorZakat`, `JamaahSOSStatus`, `JamaahWelcome`.

Strategi: bungkus tiap page dengan `JamaahAppShell` + ganti `Card` → `IslamicCard`. Tidak ubah query/data. Dilakukan bertahap per file (no big-bang).

### 1.6 Penguatan PWA
- Tambah halaman `/install` dengan instruksi A2HS iOS & Android + tombol prompt (`beforeinstallprompt`).
- Update `manifest.json`: nama "Vinstour Jamaah", `theme_color` `#0F2E1F`, screenshots baru, shortcuts: Beranda, Waktu Sholat, Al-Qur'an, Kiblat.
- Splash screen (loader awal) bergaya Islami: arch + logo + ayat pendek.
- Service worker (`public/sw.js`) sudah ada — tambahkan precache aset fonts Arabic + audio adzan kecil. Tetap network-first untuk navigasi.
- Banner "Aktifkan Notifikasi" + komponen `<UpdateAvailableBanner>` saat ada SW baru (event `sw-update-available`).

## Bagian 2 — Modul Toko Admin (Procurement + Sales)

### 2.1 Skema Database Baru (migrasi)
Tambah tabel:
- `store_suppliers` — nama, kontak, alamat, npwp, term pembayaran, catatan.
- `store_purchase_orders` — `po_number` (PO-YYMM-####, sequence via `store_po_counters`), supplier_id, status (`draft|ordered|partial|received|cancelled`), order_date, expected_date, received_date, subtotal, tax, shipping_cost, total, notes, created_by.
- `store_purchase_order_items` — po_id, product_id, qty_ordered, qty_received, unit_cost, subtotal.
- `store_stock_movements` — product_id, type (`purchase_in|sale_out|adjustment|return_in|return_out`), qty (signed), ref_table, ref_id, unit_cost, notes, created_by, created_at. Trigger otomatis dari penerimaan PO + order pelanggan ter-fulfilled.
- `store_po_counters` — bucket bulanan untuk nomor PO.
- Kolom tambahan di `store_products`: `current_stock` (int), `avg_cost` (numeric), `min_stock` (int) — auto update via trigger dari `store_stock_movements`.

RLS: hanya role admin (`super_admin`, `owner`, `branch_manager`, `inventory_manager` baru) bisa CRUD. Pakai `has_role()` SECURITY DEFINER existing pattern. Stock movements immutable (no update/delete kecuali super_admin).

### 2.2 Halaman Admin Baru
Folder `src/pages/admin/store/`:
- `AdminStoreDashboard.tsx` — KPI: total stok value, produk low stock, PO open, omzet 30 hari, top 5 produk, grafik penjualan vs pembelian (Recharts).
- `AdminStoreSuppliers.tsx` — CRUD supplier + search.
- `AdminStorePurchaseOrders.tsx` — list PO + filter status/periode/supplier + create/edit form (multi item, hitung total otomatis), aksi: kirim, terima sebagian/penuh, batalkan.
- `AdminStorePurchaseOrderDetail.tsx` — detail PO + tombol "Terima Barang" → input qty diterima per item → buat `store_stock_movements` `purchase_in`.
- `AdminStoreStockMovements.tsx` — riwayat mutasi stok (read-only) + filter produk/tipe/tanggal + export CSV.
- `AdminStoreStockOpname.tsx` — adjustment stok manual dengan alasan (buat movement `adjustment`).
- `AdminStoreSalesReport.tsx` — laporan penjualan dari `store_orders` (agregasi per hari/produk/kategori) + laba kotor (`avg_cost` × qty). Export CSV/PDF.
- `AdminStoreLowStock.tsx` — daftar produk di bawah `min_stock` + tombol "Buat PO".

Update existing:
- `AdminStoreProducts.tsx` — tambah kolom Stock, Avg Cost, Min Stock; badge low stock; tombol "Riwayat Mutasi".
- `AdminStoreOrders.tsx` — tombol "Tandai Terkirim" trigger `sale_out` movement (sudah ada base, integrasikan).

### 2.3 Navigasi & RBAC
- `AdminSidebar` — group baru "Toko & Inventori" berisi: Dashboard Toko, Produk, Kategori, Order Pelanggan, Supplier, Purchase Order, Stok Opname, Mutasi Stok, Low Stock, Laporan Penjualan.
- Tambah `PERMISSIONS.STORE_*` keys dan map ke role default.

### 2.4 Otomasi (Trigger DB)
- Trigger `AFTER INSERT ON store_stock_movements` → update `store_products.current_stock` (sum) + `avg_cost` (weighted avg untuk `purchase_in`).
- Trigger `AFTER UPDATE ON store_purchase_orders` saat status → `received` / `partial` membuat movement otomatis dari `qty_received` (atau via RPC `receive_po(po_id, items[])`).
- Trigger `AFTER UPDATE ON store_orders` saat status → `shipped/completed` membuat `sale_out` movement (sekali, idempotent via cek ref).

## Bagian 3 — Urutan Eksekusi
1. Fondasi PWA Islami: token CSS, ornamen SVG, app shell, bottom nav, header. (1)
2. Redesign `JamaahPortal` (home) + halaman ibadah inti (Waktu Sholat, Al-Qur'an, Kiblat, Doa, Zikir).
3. Restyle bertahap halaman jamaah lainnya (batch 5–8 file per iterasi).
4. Halaman `/install` + update manifest + splash + update banner.
5. Migrasi DB toko (suppliers, PO, movements, kolom produk, triggers, RLS).
6. Halaman admin toko + sidebar + RBAC.
7. QA: cek route, RLS, alur PO end-to-end, sync stok, A2HS di mobile.

## Catatan Teknis
- Tidak ada perubahan logika auth/booking. Hanya UI/visual untuk jamaah + tambahan tabel & halaman untuk toko.
- Semua warna via token HSL di `index.css` dan `tailwind.config.ts`. Tidak ada `text-white`/`bg-black` literal.
- Service worker tetap pakai pola network-first + clone sinkron yang sudah diperbaiki.
- Patuhi memory: payment status `paid`, role admin terbatas, Radix Select controlled, dst.
- Fonts Arabic dimuat via `font-display: swap` + preconnect, fallback `serif` agar tidak block render.

Setelah Anda setujui, saya akan mulai dari Bagian 1.1–1.3 (fondasi + home) dan Bagian 2.1 (migrasi DB toko) lebih dulu, lalu lanjut bertahap.
