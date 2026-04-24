

# Rencana Pengembangan Modul Perlengkapan (v2)

Memperluas modul perlengkapan dari sistem stok flat menjadi sistem inventaris ber-varian dengan distribusi terdokumentasi (foto, jenis pengiriman, kondisi), pengembalian, dan modul Aset Kantor terpisah.

## Skema Database (Migrasi)

### 1. `equipment_items` — perluasan
Tambah kolom: `gender_target` (laki/perempuan/anak/unisex), `has_variants` (bool).
Stok agregat tetap ada untuk backward compat, namun stok riil akan dihitung dari varian saat `has_variants=true`.

### 2. `equipment_variants` (BARU)
Setiap kombinasi ukuran/warna = satu varian dengan stok sendiri.
```
id, equipment_id (FK), size (S/M/L/XL/custom), color, 
stock_good (qty kondisi bagus), stock_damaged (qty rusak),
sku, low_stock_threshold
```

### 3. `equipment_distributions` — perluasan
Tambah kolom: `variant_id`, `delivery_type` (expedition/company_courier/agent_pickup/customer_pickup), `delivery_proof_url` (foto bukti kirim), `condition_photo_url` (foto kondisi awal), `delivery_date` (tanggal manual / otomatis), `tracking_number`, `expedition_name`, `cancel_reason`, `cancel_admin_fee`, `return_condition` (good/damaged/lost), `return_notes`, `return_photo_url`.

### 4. `office_assets` (BARU) — modul terpisah dari perlengkapan jamaah
```
id, name, category (electronics/furniture/vehicle/lainnya),
size_or_color, quantity, condition (good/damaged/under_repair),
location, purchase_date, notes, photo_url
```
+ RLS: hanya admin/owner/branch_manager.

### 5. RPC Functions
- `bulk_distribute_equipment(p_distributions jsonb)` — atomic decrement varian + insert distribution.
- `return_equipment_distribution(p_distribution_id, p_condition, p_admin_fee, p_notes)` — atomic update status + tambah stok kembali ke `stock_good` atau `stock_damaged` sesuai kondisi.
- `adjust_variant_stock(p_variant_id, p_delta_good, p_delta_damaged)` — manual adjustment dengan audit.

### 6. Storage Bucket
Bucket baru `equipment-photos` (private) untuk foto bukti distribusi, kondisi awal, dan foto retur.

## Perubahan Frontend

### Tab "Master Stok" (`MasterDataTab.tsx` + `VariantManagerDialog.tsx` baru)
- Form item utama: nama, kategori, target gender (Laki/Perempuan/Anak/Unisex), toggle "Punya Varian".
- Sub-tabel varian: ukuran + warna + stok bagus + stok rusak. Tambah/edit/hapus varian inline.
- Indikator stok rendah per varian.

### Tab "Distribusi" (`DistributionTab.tsx` — refactor)
Wizard tetap (Paket → Keberangkatan → Jamaah), lalu panel distribusi diperkaya:
- Daftar item ditampilkan dengan dropdown varian (auto-filter sesuai gender jamaah).
- Form per item: tanggal distribusi (default hari ini, dapat diedit), jenis pengiriman (4 opsi), upload foto bukti pengiriman, upload foto kondisi awal, nomor resi (opsional jika ekspedisi).
- Item yang sudah didistribusikan menampilkan riwayat & tombol "Hapus" yang membuka dialog dengan kolom **alasan wajib**.
- Tombol "Tambah Item" untuk menambah baris distribusi setelah simpan awal.

### Tab "Pengembalian / Retur" (BARU `ReturnTab.tsx`)
- Daftar distribusi berstatus `distributed`.
- Aksi "Proses Retur" → dialog: kondisi barang (Bagus/Rusak/Hilang), foto kondisi retur, **biaya admin pengembalian (Rp)**, catatan.
- Otomatis menambah stok ke `stock_good` atau `stock_damaged`.

### Halaman Baru: Aset Kantor (`/operational/office-assets`)
- CRUD aset: kategori, ukuran/warna, jumlah, kondisi, lokasi, foto.
- Filter per kategori & kondisi. Total nilai aset (jika harga diisi).
- Menu sidebar baru di Operational Layout.

### Perbaikan Build Errors Terkait
- Regenerasi types Supabase setelah migrasi → menyelesaikan error TS `bulk_distribute_equipment`, `increment_equipment_stock`, `decrement_equipment_stock` di `EquipmentChecklist.tsx`, `EquipmentDistributionDrawer.tsx`, `QuickDistributionDialog.tsx`, `AddStockDialog.tsx`, `EquipmentPage.tsx`.
- Tambah import `Badge` yang hilang di `QuickDistributionDialog.tsx`.

## Alur Pengguna Akhir

```text
Master Stok          Distribusi                Retur
    │                    │                       │
    ├─ Item + Varian     ├─ Pilih Paket          ├─ Pilih distribusi
    │  (size/warna/      ├─ Pilih Keberangkatan  ├─ Kondisi: Bagus/Rusak/Hilang
    │   stok bagus/      ├─ Pilih Jamaah         ├─ Foto retur
    │   stok rusak)      ├─ Pilih varian         ├─ Biaya admin
    │                    ├─ Tanggal + foto       └─ Stok auto-kembali
    │                    ├─ Jenis pengiriman           ke gudang
    │                    └─ Hapus → wajib alasan
```

## Detail Teknis Tambahan

- Trigger `update_equipment_aggregate_stock` menyinkronkan `equipment_items.stock_quantity` = SUM(`stock_good`) seluruh varian, agar tampilan ringkas tetap akurat.
- RLS `equipment_variants`, `office_assets`: SELECT untuk admin/owner/branch_manager/operational, INSERT/UPDATE/DELETE untuk super_admin/owner/operational_manager.
- Foto disimpan dengan path `equipment-photos/{distribution_id}/{type}_{timestamp}.jpg`.
- `cancel_admin_fee` dapat dihubungkan ke modul keuangan sebagai `accounts_receivable` jamaah (tahap berikutnya, di luar lingkup ini).

## Tahapan Implementasi

1. Migrasi DB: kolom baru, tabel baru, RPC, bucket, RLS.
2. Master Stok dengan varian (UI + dialog varian).
3. Distribusi dengan foto + jenis pengiriman + tanggal manual.
4. Tab Retur dengan kondisi + biaya admin.
5. Halaman Aset Kantor.
6. Perbaikan TS build errors terkait perlengkapan.
7. QA: distribusi end-to-end, retur, stok varian akurat.

## Yang TIDAK Termasuk
- Perbaikan build errors di luar modul perlengkapan (ChangePackageDialog, BookingWizard, ContactPageEditor, dll) — akan ditangani terpisah jika diminta.
- Integrasi otomatis biaya admin retur ke invoice pembatalan booking (dapat ditambah fase berikutnya).

