# Permission Matrix — Vinstour Travel Portal
> Matriks lengkap hak akses per role untuk setiap domain fitur
> ✅ Boleh | ❌ Tidak | ⚠️ Terbatas (data sendiri / cabang sendiri)

---

## Legend Role

| Singkatan | Role | Keterangan |
|-----------|------|------------|
| **SA** | super_admin | Akses penuh, termasuk pengaturan sistem |
| **OW** | owner | Pemilik, akses semua laporan keuangan |
| **IT** | it | Tim teknologi informasi |
| **AD** | admin | Admin operasional harian |
| **BM** | branch_manager | Manajer cabang |
| **FN** | finance | Tim keuangan |
| **OP** | operational | Tim operasional keberangkatan |
| **OR** | operator | Operator data entry |
| **SL** | sales | Tim penjualan |
| **MK** | marketing | Tim marketing |
| **EQ** | equipment | Tim perlengkapan |
| **AG** | agent | Agen mitra |
| **SA2** | sub_agent | Sub-agen |
| **JM** | jamaah | Portal jamaah |

---

## Modul Booking

| Fitur | SA | OW | IT | AD | BM | FN | OP | OR | SL | MK | EQ | AG | JM |
|-------|----|----|----|----|----|----|----|----|----|----|----|----|-----|
| Lihat semua booking | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ⚠️ | ⚠️ |
| Buat booking baru | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Edit data booking | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Batalkan booking | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Confirm booking | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Transfer booking | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Export data booking | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Lihat history status | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ⚠️ | ⚠️ |

> **⚠️ BM**: hanya booking di cabangnya | **⚠️ AG**: hanya booking milik agennya | **⚠️ JM**: hanya booking milik sendiri

---

## Modul Pembayaran

| Fitur | SA | OW | IT | AD | BM | FN | OP | OR | SL | MK | EQ | AG | JM |
|-------|----|----|----|----|----|----|----|----|----|----|----|----|-----|
| Lihat pembayaran | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ❌ | ⚠️ | ⚠️ | ❌ | ❌ | ⚠️ | ⚠️ |
| Input bukti bayar | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ⚠️ | ✅ |
| Verifikasi pembayaran | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Reject pembayaran | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Proses refund | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Export laporan bayar | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Modul Jamaah / Customers

| Fitur | SA | OW | IT | AD | BM | FN | OP | OR | SL | MK | EQ | AG | JM |
|-------|----|----|----|----|----|----|----|----|----|----|----|----|-----|
| Lihat daftar jamaah | ✅ | ✅ | ✅ | ✅ | ⚠️ | ❌ | ✅ | ✅ | ✅ | ❌ | ⚠️ | ⚠️ | ❌ |
| Tambah jamaah baru | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Edit data jamaah | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ⚠️ | ⚠️ |
| Upload dokumen | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Verifikasi dokumen | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Lihat lokasi live | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Akses portal jamaah | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Hapus jamaah | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Modul Paket & Keberangkatan

| Fitur | SA | OW | IT | AD | BM | FN | OP | OR | SL | MK | EQ | AG | JM |
|-------|----|----|----|----|----|----|----|----|----|----|----|----|-----|
| Lihat paket (draft) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Lihat paket (publik) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Buat/edit paket | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ | ❌ | ❌ | ❌ |
| Publish paket | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Hapus paket | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Lihat keberangkatan | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Buat keberangkatan | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Edit keberangkatan | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Kelola itinerary | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Kelola checklist | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Kelola manifest | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Modul Keuangan

| Fitur | SA | OW | IT | AD | BM | FN | OP | OR | SL | MK | EQ | AG | JM |
|-------|----|----|----|----|----|----|----|----|----|----|----|----|-----|
| Lihat laporan keuangan | ✅ | ✅ | ❌ | ⚠️ | ⚠️ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Entry jurnal akuntansi | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Approve jurnal | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Lihat HPP & expense | ✅ | ✅ | ❌ | ✅ | ⚠️ | ✅ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Input HPP & expense | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Approve expense | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Vendor invoice | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Lihat COA | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Kelola COA | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Export keuangan | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Summary departure | ✅ | ✅ | ❌ | ✅ | ⚠️ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Modul HR & Karyawan

| Fitur | SA | OW | IT | AD | BM | FN | OP | OR | SL | MK | EQ | AG | JM |
|-------|----|----|----|----|----|----|----|----|----|----|----|----|-----|
| Lihat data karyawan | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Tambah karyawan | ✅ | ✅ | ❌ | ✅ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Edit karyawan | ✅ | ✅ | ❌ | ✅ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Lihat slip gaji sendiri | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Proses payroll | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Approve cuti | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ajukan cuti sendiri | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Penilaian kinerja | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Absensi | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## Modul Agen

| Fitur | SA | OW | IT | AD | BM | FN | OP | OR | SL | MK | EQ | AG | JM |
|-------|----|----|----|----|----|----|----|----|----|----|----|----|-----|
| Lihat daftar agen | ✅ | ✅ | ✅ | ✅ | ⚠️ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ⚠️ | ❌ |
| Tambah agen | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit agen | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ⚠️ | ❌ |
| Lihat komisi | ✅ | ✅ | ❌ | ✅ | ⚠️ | ✅ | ❌ | ❌ | ⚠️ | ❌ | ❌ | ⚠️ | ❌ |
| Approve komisi | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Lihat wallet agen | ✅ | ✅ | ❌ | ✅ | ⚠️ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ | ❌ |
| Laporan agen | ✅ | ✅ | ❌ | ✅ | ⚠️ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## Modul Perlengkapan

| Fitur | SA | OW | IT | AD | BM | FN | OP | OR | SL | MK | EQ | AG | JM |
|-------|----|----|----|----|----|----|----|----|----|----|----|----|-----|
| Lihat inventaris | ✅ | ✅ | ✅ | ✅ | ⚠️ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Tambah item perlengkapan | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Edit item perlengkapan | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Distribusi ke jamaah | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Bulk distribute | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Stock opname | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Konfirmasi terima | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Laporan perlengkapan | ✅ | ✅ | ❌ | ✅ | ⚠️ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |

---

## Modul Marketing & CRM

| Fitur | SA | OW | IT | AD | BM | FN | OP | OR | SL | MK | EQ | AG | JM |
|-------|----|----|----|----|----|----|----|----|----|----|----|----|-----|
| Lihat lead | ✅ | ✅ | ❌ | ✅ | ⚠️ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ⚠️ | ❌ |
| Buat/edit lead | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Materi marketing | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ⚠️ | ✅ | ❌ | ✅ | ❌ |
| Kelola landing page | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Kampanye WA | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Kupon diskon | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Poin loyalitas | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ⚠️ |

---

## Modul Website CMS

| Fitur | SA | OW | IT | AD | BM | FN | OP | OR | SL | MK | EQ | AG | JM |
|-------|----|----|----|----|----|----|----|----|----|----|----|----|-----|
| Pengaturan website | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ | ❌ | ❌ | ❌ |
| Kelola FAQ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Kelola testimoni | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Kelola banner | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Kelola galeri | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Pengumuman | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Konten halaman About | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Knowledge base | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## Modul Sistem & Pengaturan

| Fitur | SA | OW | IT | AD | BM | FN | OP | OR | SL | MK | EQ | AG | JM |
|-------|----|----|----|----|----|----|----|----|----|----|----|----|-----|
| Kelola user | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Assign role | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Kelola permission | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Pengaturan sistem | ✅ | ⚠️ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Feature flags | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Lihat audit log | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Dashboard config | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Undang staf baru | ✅ | ✅ | ✅ | ✅ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Export sistem | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Modul Transportasi (Bus)

| Fitur | SA | OW | IT | AD | BM | FN | OP | OR | SL | MK | EQ | AG | JM |
|-------|----|----|----|----|----|----|----|----|----|----|----|----|-----|
| Kelola bus providers | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Assign bus ke departure | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Input penumpang bus | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Kelola bagasi/luggage | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Modul Haji

| Fitur | SA | OW | IT | AD | BM | FN | OP | OR | SL | MK | EQ | AG | JM |
|-------|----|----|----|----|----|----|----|----|----|----|----|----|-----|
| Daftar haji | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Edit data haji | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Monitor antrian | ✅ | ✅ | ❌ | ✅ | ⚠️ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ⚠️ |
| Export data haji | ✅ | ✅ | ✅ | ✅ | ⚠️ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Catatan Implementasi

### Pola RLS yang Harus Digunakan

```sql
-- Untuk akses "hanya cabang sendiri" (branch_manager):
USING (
  public.has_role(auth.uid(), 'branch_manager'::public.app_role)
  AND branch_id = (
    SELECT ur.branch_id FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'branch_manager'
    LIMIT 1
  )
)

-- Untuk akses "hanya agen sendiri":
USING (
  public.has_role(auth.uid(), 'agent'::public.app_role)
  AND agent_id = (
    SELECT a.id FROM public.agents a WHERE a.user_id = auth.uid() LIMIT 1
  )
)

-- Untuk akses "data sendiri" (jamaah):
USING (
  EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = customer_id AND c.user_id = auth.uid()
  )
)
```

### Permission Key Naming Convention

```
{domain}.{action}

Contoh:
  bookings.view         — lihat data booking
  bookings.create       — buat booking baru
  bookings.edit         — edit booking
  bookings.cancel       — batalkan booking
  bookings.export       — export data
  payments.verify       — verifikasi pembayaran
  finance.journal       — entry jurnal akuntansi
  equipment.distribute  — distribusi perlengkapan
```
