

# Rencana Redesign Total Halaman Perlengkapan

## Masalah Saat Ini
1. Tidak ada step "Pilih Paket" -- langsung ke keberangkatan, membingungkan jika banyak data
2. Ringkasan stok tersembunyi di bawah filter, tidak ada tombol "Tambah Stok"
3. Drawer distribusi per-jamaah bagus tapi popup-nya kurang informatif (tidak ada data jamaah seperti NIK, gender, dll)
4. Settings modal (Inventory & Master Data) tersembunyi di ikon gear, padahal penting
5. Terlalu banyak komponen terpisah (DistributionTab, InventoryTab, MasterDataTab) yang tidak terintegrasi ke flow utama

## Desain Baru: Wizard 3-Step + Dashboard

```text
┌─────────────────────────────────────────────────────┐
│  MANAJEMEN PERLENGKAPAN                    [+ Stok] │
│                                                     │
│  ┌─────────────┐  ┌──────────────────┐              │
│  │ Pilih Paket │→ │ Pilih Keberangkatan │           │
│  └─────────────┘  └──────────────────┘              │
│                                                     │
│  ┌──────────┬──────────┬──────────┬──────────┐      │
│  │ Jamaah   │ Total    │ Distribusi│ Lengkap  │      │
│  │  45      │ Item: 8  │  230/360 │  78%     │      │
│  └──────────┴──────────┴──────────┴──────────┘      │
│                                                     │
│  RINGKASAN STOK (per item, progress bar)            │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │
│  │Ihram   │ │Mukena  │ │Koper   │ │ID Card │       │
│  │Sisa:20 │ │Sisa:15 │ │Sisa:5⚠│ │Sisa:40 │       │
│  │████░░░ │ │█████░░ │ │██░░░░░ │ │██████░ │       │
│  └────────┘ └────────┘ └────────┘ └────────┘       │
│                                                     │
│  DAFTAR JAMAAH                    [Bagikan Semua]   │
│  ┌──────────────────────────────────────────────┐   │
│  │ ♂ Ahmad  │ L │ 5/6 ████░ │ Belum Lengkap │▶│   │
│  │ ♀ Fatimah│ P │ 4/4 █████ │ ✅ Lengkap    │▶│   │
│  │ 👶 Ali   │ A │ 0/3 ░░░░░ │ ❌ Belum Ada  │▶│   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  [Klik jamaah → Dialog detail + checklist distribusi]│
└─────────────────────────────────────────────────────┘
```

## Perubahan Teknis

### 1. Rewrite `EquipmentPage.tsx` - Flow Utama
- **Step 1**: Dropdown pilih paket (dari tabel `packages`)
- **Step 2**: Dropdown pilih keberangkatan (filtered by `package_id`)
- Setelah kedua dipilih, tampilkan dashboard + daftar jamaah
- Tombol **"+ Tambah Stok"** di header -- membuka dialog untuk menambah stok ke item yang sudah ada (update `stock_quantity` via supabase)
- Tombol **"Kelola Item"** untuk buka dialog master data (item CRUD)

### 2. Ringkasan Stok Inline
- Grid kartu kecil per item perlengkapan dengan progress bar distribusi
- Warna: hijau (>50%), kuning (20-50%), merah (<20% sisa)
- Klik kartu stok = buka dialog "Tambah Stok" untuk item tersebut

### 3. Daftar Jamaah dengan Status
- Tabel: Nama + ikon gender, Gender/Tipe, Status (x/y item), Progress bar, Aksi
- Badge status: **Lengkap** (hijau), **Belum Lengkap** (kuning), **Belum Ada** (merah)
- Bulk action: "Bagikan Semua" untuk distribusi otomatis

### 4. Dialog Detail Jamaah + Checklist (menggantikan Sheet/Drawer)
- **Dialog** full-width yang menampilkan:
  - Info jamaah: Nama, Gender, Tipe penumpang
  - Summary card: x/y item, progress percentage
  - Checklist perlengkapan dengan checkbox (filtered by gender)
  - Setiap item: Nama, Stok tersisa, Checkbox, Qty input
  - Tombol: Pilih Semua, Hapus Semua, Simpan
- Konfirmasi sebelum simpan

### 5. Dialog Tambah Stok
- Pilih item dari dropdown atau tampilkan semua
- Input jumlah stok yang ditambahkan
- Langsung `update` ke `equipment_items.stock_quantity`

### File yang Dimodifikasi/Dibuat
| File | Aksi |
|:---|:---|
| `src/pages/operational/EquipmentPage.tsx` | Rewrite total -- wizard flow, dashboard, inline stok |
| `src/components/operational/equipment/EquipmentDistributionDrawer.tsx` | Ubah jadi Dialog, tambah info jamaah |
| `src/components/operational/equipment/AddStockDialog.tsx` | Baru -- dialog tambah stok |

### Tidak Ada Perubahan Database
Semua data sudah tersedia: `packages`, `departures`, `equipment_items`, `equipment_distributions`, `booking_passengers`, `customers`.

