

# Rencana Perbaikan: Harga Paket dari Keberangkatan

## Temuan

### Build Error (KRITIS)
`useBookingWizardDynamic.ts` baris 32 memiliki syntax rusak: `pi  notes?: string;` — interface `PICData` terpotong. Ini menyebabkan semua build error TS1131/TS1109.

### Logika Harga di PackageCard (SUDAH BENAR)
`PackageCard.tsx` **sudah** mengambil harga termurah dari departure terlebih dahulu (baris 30-49), lalu fallback ke harga paket. Label "Mulai dari" juga sudah tampil (baris 206).

### AgentPackages Tidak Mengambil Harga Departure
`AgentPackages.tsx` query departure hanya ambil `id, departure_date, quota, booked_count, status` — **tanpa field harga** (`price_quad`, `price_triple`, `price_double`, `price_single`). Sehingga harga yang ditampilkan hanya dari tabel `packages`, bukan dari departure.

---

## Rencana Implementasi

| # | Prioritas | Item | File |
|:--|:----------|:-----|:-----|
| 1 | KRITIS | Fix syntax rusak `PICData` interface | `useBookingWizardDynamic.ts` |
| 2 | TINGGI | Tambah field harga di query departure AgentPackages + tampilkan "Mulai dari" harga termurah | `AgentPackages.tsx` |

### Detail Teknis

**Fix #1**: Perbaiki interface `PICData` di baris 31-37 — kembalikan field `picSource` yang hilang.

**Fix #2**: Di `AgentPackages.tsx`:
- Tambah `price_quad, price_triple, price_double, price_single` di query departures
- Ganti grid harga 4-kolom (Quad/Triple/Double/Single) menjadi satu baris "Mulai dari [harga termurah dari departure]"
- Jika semua harga departure 0, fallback ke harga paket; jika masih 0, tampilkan "Hubungi Kami"

