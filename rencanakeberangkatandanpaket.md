# Analisis & Rencana: Keberangkatan, Paket, Booking, Perlengkapan, Kamar, Tour Guide & Operasional

> **Dibuat:** 07 Juni 2026  
> **Tujuan:** Analisis komprehensif — apa yang sudah ada, apa yang belum saling terelasi, apa yang harus terelasi, apa yang belum ada fiturnya, apa yang harus ada, apa yang belum sempurna — beserta roadmap prioritas.

---

## BAGIAN 1 — INVENTARIS FITUR YANG SUDAH ADA

### 1.1 Paket (Packages)

| Tabel / Fitur | Status |
|---|---|
| `packages` — nama, tipe, hotel, airline, durasi, highlight, foto, gallery | ✅ Ada |
| `package_types` — umroh / haji / haji_plus / wisata + booking_mode | ✅ Ada |
| `package_groups` — pengelompokan paket (promo, luxury, dll) | ✅ Ada |
| `package_labels` + `package_label_assignments` — tagging (Best Seller, Limited) | ✅ Ada |
| `package_hpp_templates` — template HPP (harga pokok) per paket | ✅ Ada |
| `package_type_equipment` — daftar perlengkapan default per tipe paket | ✅ Ada |
| `departure_price_history` — riwayat perubahan harga | ✅ Ada |
| Admin CRUD paket + toggle aktif/non-aktif | ✅ Ada |
| AdminPackageDetail — departures, statistik booking, analytics | ✅ Ada |
| AdminPackageTypes — management tipe paket | ✅ Ada |
| AdminPackageProfitabilityComparison — perbandingan finansial antar paket | ✅ Ada |
| Halaman publik PackageList (filter, search) | ✅ Ada |
| Halaman publik PackageDetail (harga, itinerary, hotel, pilih departure) | ✅ Ada |
| PackageCompare — bandingkan 2-3 paket side-by-side | ✅ Ada |
| Analytics: view_count, conversion rate per paket | ✅ Ada |
| Dynamic booking_mode: umroh (room type), haji (per orang), wisata | ✅ Ada |

### 1.2 Keberangkatan (Departures)

| Tabel / Fitur | Status |
|---|---|
| `departures` — tanggal, kuota, available_seats, status, harga per room type | ✅ Ada |
| Relasi departure → package, hotel_makkah_id, hotel_madinah_id, airline_id | ✅ Ada |
| `departures.muthawif_id` + `departures.team_leader_user_id` | ✅ Ada |
| `seat_holds` — kunci kursi 15 menit, advisory lock PostgreSQL, anti-race-condition | ✅ Ada |
| `departure_cost_items` — HPP budget per kategori (airline, hotel, transport…) | ✅ Ada |
| `departure_expenses` — realisasi pengeluaran aktual | ✅ Ada |
| `departure_other_revenues` — pendapatan extra (upgrade kamar, dll) | ✅ Ada |
| `departure_financial_summary` — cache P&L per keberangkatan | ✅ Ada |
| `departure_itineraries` — link itinerary template ke departure | ✅ Ada |
| `attendance` — check-in jamaah di checkpoint (bandara, hotel, dll) | ✅ Ada |
| AdminDepartureDetail: tab Info, Jamaah, Kamar, Perlengkapan, Itinerary, Budget, Keuangan, Operasional | ✅ Ada |
| Manifest export PDF + Excel | ✅ Ada |
| Email manifest ke airline/vendor | ✅ Ada |
| WA Blast manual H-7, H-3, H-1 ke seluruh jamaah | ✅ Ada |
| Sertifikat massal pasca-trip (DepartureCertificateGenerator) | ✅ Ada |
| Margin alert — warning jika profit margin < threshold | ✅ Ada |
| Virtual Passenger (placeholder booking yang data jamaah belum lengkap) | ✅ Ada |
| Migration `066_multi_hotel_per_city` — support multi-hotel per kota | ⚠️ Parsial |

### 1.3 Booking

| Tabel / Fitur | Status |
|---|---|
| `bookings` — code, customer, departure, agent, status, payment_status, total_price | ✅ Ada |
| `booking_passengers` — list jamaah + passenger_type + room preference + checkin_status | ✅ Ada |
| `payments` — rekam transaksi, bukti bayar, verifikasi | ✅ Ada |
| `booking_document_logs` — status dokumen per jamaah | ✅ Ada |
| Booking Wizard 4 langkah (room allocation, data jamaah, PIC, review & bayar) | ✅ Ada |
| Draft booking localStorage TTL — guest checkout tanpa kehilangan data | ✅ Ada |
| Seat hold + race-condition handling (pg_advisory_xact_lock) | ✅ Ada |
| Admin create booking manual (4 step + passenger type per slot) | ✅ Ada |
| Invoice PDF (emerald green / Islamic theme, jsPDF) | ✅ Ada |
| Auto komisi agen saat booking confirmed (trigger DB) | ✅ Ada |
| PIC attribution: pusat / cabang / agen / referral | ✅ Ada |
| Agent/branch website auto-attribution (localStorage 30 hari) | ✅ Ada |
| Booking mode: full payment, DP, cicilan tabungan | ✅ Ada |
| Coupon / diskon support di booking review step | ✅ Ada |

### 1.4 Perlengkapan (Equipment)

| Tabel / Fitur | Status |
|---|---|
| `equipment_items` — katalog item (nama, kategori, stock, gender_target) | ✅ Ada |
| `equipment_variants` — ukuran/warna per item | ✅ Ada |
| `equipment_distributions` — tracking distribusi per jamaah per departure | ✅ Ada |
| `equipment_stock_history` + `equipment_stock_opname` — audit stok & opname | ✅ Ada |
| `equipment_maintenance` + `equipment_damage` — aset internal | ✅ Ada |
| `package_type_equipment` — item default per tipe paket | ✅ Ada |
| Halaman distribusi: progress bar jamaah, bulk distribute, Excel export | ✅ Ada |
| Upload foto bukti distribusi + konfirmasi penerimaan oleh jamaah | ✅ Ada |
| Return workflow: kondisi baik/rusak/hilang | ✅ Ada |
| Low-stock alert di admin dashboard | ✅ Ada |
| RPC `bulk_distribute_equipment` + `return_equipment_item` | ✅ Ada |

### 1.5 Kamar (Rooming)

| Tabel / Fitur | Status |
|---|---|
| `room_assignments` — kamar fisik per hotel per departure (nomor, tipe, lantai, kapasitas) | ✅ Ada |
| `room_occupants` — siapa di kamar mana (junction table) | ✅ Ada |
| `booking_passengers.room_group_id` — pairing logis pre-assignment | ✅ Ada |
| `booking_passengers.room_number_makkah / room_number_madinah` — denormalized | ✅ Ada |
| `hotel_room_capacities` — batas kamar per tipe per hotel | ✅ Ada |
| `hotels` — master data hotel | ✅ Ada |
| RoomingListPageImproved — drag-drop assign jamaah ke kamar | ✅ Ada |
| FloorPlanView — visualisasi lantai hotel | ✅ Ada |
| MahramCompatibilityAlert | ✅ Ada |
| Rooming list export PDF + Excel per Makkah/Madinah | ✅ Ada |
| DepartureRoomingTab di AdminDepartureDetail | ✅ Ada |
| `get_hotel_capacity_summary` RPC — validasi over-booking kamar | ✅ Ada |

### 1.6 Tour Guide & Muthawif

| Tabel / Fitur | Status |
|---|---|
| `muthawifs` — profil (bahasa, spesialisasi, rating, bio, foto) | ✅ Ada |
| `employees` + `user_roles` (muthawif, tour_leader, operational, equipment) | ✅ Ada |
| `guide_channels` — grup komunikasi per departure/bus | ✅ Ada |
| `guide_broadcasts` + `guide_broadcast_reads` — notifikasi + tracking baca | ✅ Ada |
| `guide_sessions` + `guide_session_attendance` — aktivitas & absensi QR | ✅ Ada |
| `guide_locations` — GPS real-time guide → jamaah | ✅ Ada |
| `guide_subgroups` + `guide_subgroup_members` — kelompok bus | ✅ Ada |
| `sos_alerts` — darurat, routing otomatis ke guide yang bertugas | ✅ Ada |
| TourLeaderDashboard, TourLeaderBroadcast, TourLeaderAttendance, TourLeaderMap | ✅ Ada |
| MuthawifDashboard | ✅ Ada |
| AdminLapangan — monitor real-time: SOS, guide online, attendance % | ✅ Ada |

---

## BAGIAN 2 — RELASI YANG HILANG (SEHARUSNYA TERHUBUNG TAPI BELUM)

### 🔴 KRITIS

#### R1. Booking Confirmed → Equipment Distribution Belum Auto-Terbentuk

**Masalah:**  
`package_type_equipment` mendefinisikan perlengkapan apa yang harus diberikan per tipe paket. Saat booking dikonfirmasi, **tidak ada trigger atau logic** yang otomatis membuat record `equipment_distributions` (status `pending`/`queued`) untuk tiap jamaah.

**Akibat:**  
Staff harus manual cek tiap booking dan menentukan perlengkapan — rawan terlewat, terutama untuk departure 100+ jamaah.

**Cara Fix:**  
Saat `booking.status` berubah jadi `confirmed`:
1. Ambil `package_type_equipment` berdasarkan `package_type_id` dari departure → package
2. Loop `booking_passengers` dalam booking
3. Filter item berdasarkan `gender_target` (all/male/female) vs gender jamaah
4. Buat record `equipment_distributions` per (jamaah × item) dengan status `queued`
5. Stock baru berkurang saat distribusi aktual, bukan saat booking

---

#### R2. Booking Confirmed → Visa Application Belum Auto-Dibuat

**Masalah:**  
`visa_applications` harus dibuat untuk setiap jamaah setelah booking dikonfirmasi. Saat ini prosesnya manual — admin buka booking detail → tab visa → input satu per satu.

**Akibat:**  
Visa mudah terlewat terutama untuk booking grup besar. Tidak ada early warning untuk deadline dokumen.

**Cara Fix:**  
Trigger database saat `booking.status → confirmed`:
- Buat `visa_applications` untuk tiap `booking_passengers` yang belum punya record visa
- Status awal: `pending_documents`
- Kirim notifikasi ke jamaah: "Segera lengkapi dokumen visa Anda"

---

#### R3. Departure.muthawif_id → Guide System Belum Auto-Inisialisasi

**Masalah:**  
Saat muthawif di-assign ke departure (mengisi `departures.muthawif_id`), sistem `guide_channels`, `guide_sessions`, dan `guide_subgroups` **tidak otomatis terbentuk**.

**Akibat:**  
Muthawif login dan tidak menemukan channel komunikasi yang siap. Staff harus manual setup guide channel setelah assignment.

**Cara Fix:**  
Saat `departures.muthawif_id` di-set (via API/trigger):
- Auto-buat 1 record `guide_channels` untuk departure ini
- Auto-buat subgroup default berdasarkan kapasitas bus (misal: tiap 40 jamaah = 1 subgroup)
- Assign `muthawif_user_id` ke channel sebagai moderator

---

#### R4. Booking Room Type ↔ Hotel Room Capacity Belum Divalidasi Saat Booking

**Masalah:**  
Jamaah memilih room type (double/triple/quad) di booking wizard, tapi tidak ada validasi bahwa hotel di departure tersebut masih punya kapasitas kamar untuk tipe itu berdasarkan `hotel_room_capacities`.

**Contoh:**  
50 orang memilih triple, padahal kontrak hotel hanya 10 kamar triple untuk departure itu.

**Akibat:**  
Admin baru sadar overbooking kamar saat mau buat rooming list — sudah terlambat.

**Cara Fix:**  
Di Booking Wizard (step room allocation), query `hotel_room_capacities` untuk departure tersebut. Tampilkan:
- Sisa kapasitas per room type
- Warning `⚠️ Hanya tersisa 3 kamar triple` jika mendekati penuh

---

#### R5. Guide Subgroup ↔ Jamaah Belum Ada Auto-Split

**Masalah:**  
Tabel `guide_subgroups` + `guide_subgroup_members` ada, tapi tidak ada fitur untuk otomatis membagi jamaah ke bus berdasarkan kuota.

**Akibat:**  
Staff harus manual assign ratusan jamaah ke Bus 1, Bus 2, dll — sangat memakan waktu.

**Cara Fix:**  
Sebelum keberangkatan, tombol **"Auto-Bagi Subgroup"** di tab Operasional departure:
- Input: jumlah bus / kapasitas per bus
- Output: jamaah dibagi merata (atau berdasarkan kamar/lokasi hotel)
- Bisa di-edit manual setelahnya

---

#### R6. Package HPP Template → Departure Cost Items Belum Auto-Apply

**Masalah:**  
`package_hpp_templates` mendefinisikan template biaya per paket. Tapi saat departure baru dibuat dari paket tersebut, `departure_cost_items` **tidak otomatis terisi** dari template.

**Akibat:**  
Tiap departure baru harus diisi HPP dari nol. Rawan salah dan tidak konsisten antar departure dari paket yang sama.

**Cara Fix:**  
Saat departure dibuat atau di tab Budget, tambahkan tombol **"Terapkan Template HPP Paket"** yang meng-copy `package_hpp_templates` ke `departure_cost_items` dengan date + quota scaling.

---

#### R7. Departure Status → Booking Status Cascading Belum Ada

**Masalah:**  
Saat departure status berubah ke `departed`, booking-booking terkait tidak otomatis jadi `completed`. Saat departure `cancelled`, booking tidak otomatis di-handle.

**Akibat:**  
Data status booking tidak sinkron dengan realita operasional. Laporan komisi, HPP, dan P&L jadi tidak akurat.

**Cara Fix:**  
Trigger PostgreSQL pada UPDATE `departures.status`:
- `departed` → semua `bookings` yang `confirmed` di departure itu → `completed`
- `cancelled` → semua `bookings` yang `pending/confirmed` → kirim notifikasi admin untuk proses refund manual

---

#### R8. Equipment Distribution Cost → Departure Financial Belum Terekam

**Masalah:**  
Saat perlengkapan didistribusikan, biaya aktual (`qty × unit_cost`) tidak otomatis masuk ke `departure_expenses`.

**Akibat:**  
P&L keberangkatan tidak mencerminkan biaya perlengkapan yang sudah dikeluarkan. Margin terlihat lebih besar dari kenyataan.

**Cara Fix:**  
Saat `equipment_distributions.status → distributed`, hitung `qty × unit_cost` dan upsert ke `departure_expenses` dengan category = `perlengkapan`, reference = distribution_id.

---

### 🟡 PENTING

#### R9. Muthawif Profile → PackageDetail Publik Belum Ditampilkan

**Masalah:**  
Tabel `muthawifs` punya bio, foto, bahasa, rating. Tapi halaman publik `PackageDetail.tsx` dan departure list tidak menampilkan "Siapa muthawif Anda".

**Akibat:**  
Calon jamaah tidak tahu dengan siapa mereka akan beribadah. Padahal ini salah satu faktor utama keputusan memilih paket.

**Cara Fix:**  
Di PackageDetail → pilih departure → tampilkan profil singkat muthawif: foto, nama, bahasa, ⭐ rating, jumlah trip. Di AdminDepartureDetail tab Info, tampilkan card profil muthawif yang assigned.

---

#### R10. Room Assignment → Portal Jamaah Belum Sync Real-Time

**Masalah:**  
Saat admin mengisi `room_occupants` di rooming list, `booking_passengers.room_number_makkah/madinah` tidak otomatis ter-update. Jamaah di portal mereka tidak tahu nomor kamarnya.

**Cara Fix:**  
Database trigger: saat `room_occupants` di-insert/update, cari `customer_id` yang match di `booking_passengers`, update `room_number_makkah` atau `room_number_madinah` sesuai `hotel_location` dari `room_assignments`.

---

#### R11. Jamaah Checklist → Departure Go/No-Go Belum Terhubung

**Masalah:**  
`jamaah_checklist` ada di database, tapi tidak ada agregasi yang menampilkan berapa % jamaah sudah siap per departure.

**Cara Fix:**  
View atau RPC `departure_readiness_summary` yang menghitung per departure:
- Total jamaah
- Paspor OK: N/Total
- Visa OK: N/Total  
- Perlengkapan diterima: N/Total
- Lunas: N/Total

Ditampilkan sebagai status strip di header AdminDepartureDetail.

---

## BAGIAN 3 — FITUR YANG BELUM ADA SAMA SEKALI

### 🔴 Kritikal — Wajib Ada

#### F1. Pre-Departure Checklist Terintegrasi (Admin + Jamaah, Per Departure)

**Yang harus ada:**

Checklist admin per departure (operational readiness):
- [ ] Manifest sudah dikirim ke airline
- [ ] Konfirmasi hotel Makkah sudah diterima
- [ ] Konfirmasi hotel Madinah sudah diterima
- [ ] Bus sudah dikonfirmasi (nomor, kapasitas)
- [ ] Muthawif sudah briefing
- [ ] Perlengkapan sudah disiapkan di gudang

Checklist jamaah per booking (individual readiness):
- [ ] Paspor diserahkan / diverifikasi
- [ ] Visa approved
- [ ] Vaksin meningitis
- [ ] Pembayaran lunas
- [ ] Perlengkapan diterima
- [ ] Nomor kursi/bus diketahui

Status agregat di header departure: `🔴 12 belum lunas | 🟡 5 visa pending | ✅ Manifest OK`

---

#### F2. Waiting List per Departure

**Yang harus ada:**
- Saat departure full, jamaah bisa daftar waiting list (nama, nomor HP, pilihan room type)
- Saat ada slot kosong (pembatalan), notifikasi WA/push ke waiting list urutan pertama
- Admin bisa promote waiting list jamaah langsung ke booking aktif
- Jamaah bisa lihat posisi antreannya di portal jamaah

---

#### F3. Mutasi Booking (Pindah Departure)

**Yang harus ada:**
- Admin bisa pindahkan booking dari departure A ke departure B
- Sistem hitung selisih harga otomatis (refund jika lebih murah, tambah bayar jika lebih mahal)
- Histori mutasi tercatat dengan alasan dan user yang melakukan
- Equipment queue, visa, room assignment: pilihan migrate atau reset

---

#### F4. Kebijakan Pembatalan & Refund Workflow

**Yang harus ada:**
- Setup kebijakan per paket: `H-90: refund 80%`, `H-30: refund 50%`, `H-7: no refund`
- Saat booking di-cancel, sistem hitung otomatis nominal refund berdasarkan hari sebelum keberangkatan
- Refund request flow: jamaah/admin request → admin approve → dicatat di `payments` (amount negatif)
- Notifikasi ke jamaah: "Refund Rp 8.000.000 akan diproses dalam 7 hari kerja"

---

#### F5. Dokumen Upload Portal Jamaah

**Yang harus ada:**
- Jamaah bisa upload langsung di portal mereka:
  - Scan paspor (halaman data + halaman foto)
  - Sertifikat vaksin meningitis
  - Foto KTP / Kartu Keluarga
  - Foto 3x4 background putih
- Admin review: Approve / Reject + catatan
- Status per dokumen: Belum Upload → Review → Approved / Rejected (perlu perbaikan)
- Notifikasi email/WA saat status dokumen berubah

---

#### F6. Automated Reminder Schedule (H-X Otomatis)

**Yang harus ada** — scheduled job per departure berdasarkan departure_date:
| Waktu | Pesan |
|---|---|
| H-60 | "Segera serahkan paspor & foto ke kantor kami" |
| H-45 | "Deadline dokumen visa Anda adalah [tanggal]. Segera lengkapi." |
| H-30 | "Cek status visa Anda di portal jamaah" |
| H-14 | "Pastikan perlengkapan sudah Anda terima. Cek di portal." |
| H-7 | "Pengingat keberangkatan — info lengkap bandara & jam kumpul" |
| H-1 | "Besok berangkat! Kumpul pukul 05.00 di [bandara]" |

Kanal: WhatsApp (Fonnte), Push Notification, dan in-app notification.

---

#### F7. Hotel Contract / Voucher Management

**Yang harus ada:**
- Rekam kontrak hotel per departure: tipe kamar, jumlah kamar dikontrak, harga kontrak per malam
- Upload scan kontrak hotel (PDF/foto)
- Nomor konfirmasi/voucher hotel
- Alert otomatis jika booking room type melebihi kuota kontrak hotel
- Integrasi ke P&L: biaya kontrak hotel masuk `departure_cost_items` otomatis

---

#### F8. Muthawif Rating & Feedback Post-Trip

**Yang harus ada:**
- Setelah departure status → `completed`, kirim survei ke semua jamaah (WA / push / email)
- Formulir survei:
  - Rating muthawif (1-5 ⭐) + komentar
  - Rating hotel Makkah (1-5 ⭐)
  - Rating hotel Madinah (1-5 ⭐)
  - Rating transportasi (1-5 ⭐)
  - Rating pelayanan keseluruhan (1-5 ⭐)
  - Testimoni bebas
- Akumulasi rating ke profil muthawif (`muthawifs.rating`) secara otomatis
- Tampilan testimoni di website agen/public (setelah approval admin)

---

#### F9. Departure Capacity Visual (Admin & Publik)

**Yang harus ada di AdminDepartureDetail:**
```
Keberangkatan 10 Feb 2025 — Total Kuota: 150 kursi
Quad:   [■■■■■■■░░░░] 42/50 terisi  (8 sisa)
Triple: [■■■■░░░░░░░] 20/60 terisi  (40 sisa)
Double: [■■■■■■■■░░░] 32/40 terisi  (8 sisa)
```

**Yang harus ada di PackageDetail publik:**
- Saat calon jamaah pilih departure, tampilkan: "Tersisa 8 kursi double — pesan sekarang"
- Badge "Hampir Penuh" / "Tersedia" / "Penuh" per departure

---

#### F10. Multi-Muthawif Assignment per Departure

**Yang harus ada** (untuk departure besar 150+ jamaah):
- Assign 2-3 muthawif ke satu departure
- Tiap muthawif di-assign ke subgroup tertentu (Bus 1, Bus 2, dll)
- Tiap subgroup punya guide_channel sendiri
- Muthawif hanya bisa broadcast ke subgroup-nya kecuali admin override
- Di AdminLapangan: tampilkan tiap muthawif secara terpisah

---

### 🟡 Penting — Perlu Ada

#### F11. Booking Line Item: Breakdown Harga Transparan

**Yang harus ada** di invoice dan booking detail:
```
Harga paket (Triple Room)          Rp 28.000.000
+ Single Supplement (jika ada)     Rp  2.000.000
+ Biaya perlengkapan (jika ada)    Rp    500.000
- Diskon Early Bird (10%)          Rp -2.850.000
- Diskon Kupon UMROH10             Rp -1.000.000
───────────────────────────────────────────────
Total                              Rp 26.650.000
DP yang dibayarkan (50%)          Rp 13.325.000
Sisa pelunasan                     Rp 13.325.000
```

---

#### F12. Muthawif Conflict Calendar

**Yang harus ada:**
- Saat admin mau assign muthawif ke departure, tampilkan kalender availability muthawif tersebut
- Warning jika muthawif sudah di-assign ke departure lain yang tanggalnya overlap
- View "Jadwal Muthawif" — daftar semua departure yang sudah di-assign ke muthawif tertentu

---

#### F13. SOS Eskalasi Otomatis

**Yang harus ada:**
- Jika guide tidak merespons SOS dalam waktu X menit (configurable, default 5 menit):
  - Eskalasi ke team leader departure
  - Jika masih tidak respons dalam 10 menit: eskalasi ke admin pusat
  - Push notification + WA ke admin on-call
- SOS log history yang bisa di-review: waktu, lokasi, responder, resolusi
- Tombol SOS di portal jamaah yang mudah dijangkau (1 tap, tidak perlu login ulang)

---

#### F14. Itinerary Template → Departure Auto-Populate

**Yang harus ada:**
- Master itinerary template per paket (hari 1, hari 2, …, hari N dengan aktivitas default)
- Saat departure dibuat dari package, pilih: "Pakai itinerary template X" → auto-copy semua hari
- Admin bisa edit per-departure (override aktivitas, tambah ziarah lokal, dll)
- Live itinerary update dari muthawif selama perjalanan: ubah jadwal hari H → jamaah dapat notifikasi

---

#### F15. Offline Mode QR Scanner (Check-in Bandara)

**Yang harus ada:**
- Progressive Web App mode untuk staff yang di-install di tablet/HP
- Scan QR jamaah → check-in tercatat lokal (IndexedDB) jika offline
- Sync otomatis ke server saat koneksi pulih
- Tampilan manifest offline: siapa sudah hadir, siapa belum

---

## BAGIAN 4 — YANG BELUM SEMPURNA (INCOMPLETE / HALF-BUILT)

### I1. Dual Rooming System — Sumber Kebenaran Ganda

**Kondisi saat ini:** Dua sistem kamar berjalan paralel:
- **Sistem A:** `booking_passengers.room_group_id` + `roommate_id` — pairing logis saat booking
- **Sistem B:** `room_assignments` + `room_occupants` — kamar fisik hotel

Admin harus input di dua tempat. Tidak ada sinkronisasi otomatis. Jamaah yang melihat portal bisa dapat data dari Sistem A sementara admin sudah update di Sistem B.

**Yang harus diselesaikan:**  
Tetapkan satu sumber kebenaran. Rekomendasi: `room_assignments` + `room_occupants` sebagai master. `booking_passengers.room_number_makkah/madinah` jadi kolom read-only yang di-sync via trigger saat `room_occupants` berubah.

---

### I2. Multi-Hotel per City — Migration Ada, UI Belum

Migration `066_multi_hotel_per_city.sql` sudah ada tapi:
- UI AdminDepartureDetail tab Info masih hanya tampilkan 1 hotel Makkah + 1 hotel Madinah
- Tidak ada input untuk hotel ke-2/ke-3 di kota yang sama
- Rooming list export tidak bisa handle multi-hotel per kota
- `room_assignments.hotel_location` ada tapi UI tidak memanfaatkannya untuk filter per hotel

**Yang harus diselesaikan:**  
Tab Info departure: accordion "Hotel Makkah" yang bisa ditambah multiple hotel dengan kuota kamar masing-masing. Rooming list export ada tab terpisah per hotel.

---

### I3. Visa Application System — Tabel Ada, Flow Tidak Lengkap

Yang sudah ada: `visa_applications`, `visa_status_logs`, halaman visa di admin.

Yang belum ada:
- Auto-create saat booking confirmed (lihat R2)
- Deadline tracking per pengajuan (visa harus masuk H-45 sebelum berangkat)
- Alert otomatis saat deadline mendekat
- Portal jamaah: jamaah bisa lihat status visa mereka dan apa yang perlu dilengkapi
- Integrasi upload dokumen visa di portal jamaah

---

### I4. P&L Departure — Komponen Belum Lengkap

Yang sudah ada: HPP budget vs aktual pengeluaran.

Yang belum:
- Biaya perlengkapan tidak otomatis masuk (lihat R8)
- Komisi agen tidak muncul sebagai cost di P&L departure
- Pembayaran jamaah (`payments`) tidak langsung teragregasi ke pendapatan departure secara real-time
- UI budget tab belum menampilkan selisih dan % realisasi per kategori
- Tidak ada kolom "Proyeksi akhir" (HPP + expenses aktual so far vs pendapatan)

---

### I5. SOS System — Tabel Ada, UX Belum Optimal

Yang sudah ada: `sos_alerts`, routing ke guide bertugas.

Yang belum:
- Tombol SOS di portal jamaah belum ada atau sulit ditemukan
- Tidak ada eskalasi otomatis (lihat F13)
- Tidak ada SOS history yang bisa di-review admin
- Tidak ada "All Clear" flow: setelah SOS terselesaikan, bagaimana menutup kasusnya?

---

### I6. QR Check-in — Parsial

Yang sudah ada: `checkin_status`, `checkin_time` di `booking_passengers`, `attendance` table.

Yang belum:
- Tidak ada dedicated "Scanner Mode" UI yang optimal untuk petugas di bandara
- Tidak ada mode offline (lihat F15)
- Tidak ada print QR boarding pass dari sistem
- Multiple checkpoint (Bandara Asal → Transit → Bandara Tujuan → Hotel) tidak ada UI step-by-step

---

### I7. Equipment Size — Field Ada, Logic Belum

Yang sudah ada: `equipment_variants.size`, `equipment_distributions.size`.

Yang belum:
- Profil jamaah tidak menyimpan tinggi/berat badan
- Tidak ada rekomendasi ukuran otomatis
- Ukuran di-input manual satu per satu saat distribusi

---

### I8. Itinerary — Ada Tapi Tidak Tersambung ke Jamaah

Yang sudah ada: Tab Itinerary di AdminDepartureDetail, `departure_itineraries`.

Yang belum:
- Itinerary tidak tampil di portal jamaah sebelum keberangkatan
- Itinerary tidak di-include dalam dokumen welcome letter atau PDF
- Tidak ada live update dari guide saat perjalanan (perubahan jadwal mendadak)
- Tidak ada templating: tiap departure harus input ulang dari nol

---

### I9. Muthawif Assignment di Departure Detail — Input Belum Nyaman

Yang sudah ada: `departures.muthawif_id`.

Yang belum:
- Tidak ada dropdown search muthawif by nama/bahasa di form departure
- Tidak bisa lihat muthawif mana yang sudah "booked" (jadwal overlap)
- Tidak ada profil card muthawif yang muncul setelah assign
- Hanya support 1 muthawif per departure (lihat F10)

---

## BAGIAN 5 — ALUR OPERASIONAL IDEAL YANG SEHARUSNYA BERJALAN

```
══════════════════════════════════════════════════════
SETUP PAKET (Sekali)
══════════════════════════════════════════════════════
Buat Package
  └─ Pilih package_type → equipment list default tersimpan
  └─ Buat HPP Template → komponen biaya tersimpan
  └─ Buat itinerary template → jadwal hari-per-hari
  └─ Link ke hotel (hotel_makkah, hotel_madinah)
  └─ Publish → tampil di PackageList publik

══════════════════════════════════════════════════════
BUAT KEBERANGKATAN (Departure)
══════════════════════════════════════════════════════
Buat Departure dari Package
  ├─ ⚡ Auto: apply HPP Template → departure_cost_items terisi
  ├─ Set hotel → kapasitas kamar dari hotel_room_capacities diambil
  ├─ Set muthawif → ⚡ Auto: guide_channel terbentuk
  ├─ Set itinerary → ⚡ Auto: copy dari template, bisa diedit
  └─ Set quota per room type → kapasitas tersedia

══════════════════════════════════════════════════════
BOOKING JAMAAH (Public / Admin)
══════════════════════════════════════════════════════
Pilih Paket → Pilih Departure
  ├─ Cek kapasitas room type (live dari hotel_room_capacities) → warning jika hampir penuh
  ├─ Seat hold 15 menit (advisory lock)
  ├─ Isi data jamaah → room type preference
  ├─ PIC attribution (agent/cabang/pusat, auto dari website agen)
  ├─ Review harga (breakdown transparan)
  └─ Submit → booking.status: pending

Pembayaran DP/Lunas
  └─ Admin verifikasi → booking.status: confirmed
      ├─ ⚡ Auto: komisi agen dihitung
      ├─ ⚡ Auto: visa_applications dibuat per jamaah
      ├─ ⚡ Auto: equipment_distributions (queued) dibuat per jamaah
      └─ ⚡ Notifikasi jamaah: "Booking dikonfirmasi, lengkapi dokumen"

══════════════════════════════════════════════════════
PRE-DEPARTURE (H-60 s/d H-1)
══════════════════════════════════════════════════════
H-60: ⚡ Auto WA/Push: "Serahkan paspor dan foto"
H-45: ⚡ Auto WA/Push: "Deadline dokumen visa = [tanggal]"
Jamaah upload dokumen di portal → Admin review → Approved/Rejected
Visa tracking → status update per jamaah
Perlengkapan: staff distribusi → scan QR → jamaah konfirmasi → ⚡ Auto: biaya ke departure_expenses

H-30: ⚡ Auto WA/Push: "Cek status visa Anda"
Rooming list: admin assign kamar fisik → ⚡ Auto: sync ke portal jamaah (room_number_makkah/madinah)
Hotel contract: konfirmasi voucher hotel

H-14: ⚡ Auto WA/Push: "Pastikan perlengkapan lengkap"
Departure readiness dashboard: % siap per kategori (visa, bayar lunas, perlengkapan, dokumen)
Admin checklist: manifest sudah, hotel confirm, bus booking, muthawif briefing

H-7: ⚡ Auto WA Blast: info kumpul, bandara, jam berangkat
Auto-split subgroup (Bus 1, Bus 2) berdasarkan kuota

H-1: ⚡ Auto WA/Push: "Besok berangkat! Kumpul jam 05.00 di [Terminal X]"
QR check-in preparation: print badge/stiker jamaah

══════════════════════════════════════════════════════
HARI KEBERANGKATAN (H-0)
══════════════════════════════════════════════════════
QR Check-in di bandara (scanner mode, offline-capable)
  └─ Scan QR per jamaah → checkin_status = 'checked'
  └─ Real-time list: siapa hadir, siapa belum
Manifest final → email ke airline
Guide broadcast: pesan selamat datang, nomor bus, jadwal hari 1

══════════════════════════════════════════════════════
SELAMA PERJALANAN
══════════════════════════════════════════════════════
Muthawif broadcast notifikasi ke jamaah (per subgroup / all)
Live GPS location sharing guide → jamaah bisa track posisi
Absensi per session (ziarah, sholat berjamaah, makan)
Live itinerary update jika jadwal berubah → notifikasi jamaah
SOS alert dari jamaah → routing ke guide → eskalasi jika no-response 5 menit

══════════════════════════════════════════════════════
PASCA-PERJALANAN
══════════════════════════════════════════════════════
Departure status → departed
  └─ ⚡ Auto: semua booking confirmed → completed
  └─ ⚡ Auto: kirim survei rating ke semua jamaah

Equipment return: staff cek kondisi → update return_condition
⚡ Auto: rating survei diterima → akumulasi ke muthawifs.rating

Sertifikat massal generate + distribusi digital
P&L finalisasi: HPP vs aktual vs pendapatan (semua komponen masuk)
Post-trip summary: attendance %, kepuasan jamaah, muthawif performance
```

---

## BAGIAN 6 — PRIORITAS PEMBANGUNAN

### Sprint A — Koneksi Data Kritis (Estimasi: 1–2 minggu)

| Kode | Fitur | Kompleksitas |
|---|---|---|
| A1 | Booking Confirmed → Equipment Queue (trigger/backend) | 🟡 Medium |
| A2 | Booking Confirmed → Visa Auto-Create (trigger/backend) | 🟡 Medium |
| A3 | Departure HPP Template Auto-Apply | 🟢 Low |
| A4 | Departure Status → Booking Cascade (trigger) | 🟡 Medium |
| A5 | Muthawif Assign → Guide Channel Auto-Init (trigger) | 🟢 Low |
| A6 | Room Occupants → booking_passengers Sync (trigger) | 🟡 Medium |

### Sprint B — Fitur Operasional Inti (Estimasi: 2–3 minggu)

| Kode | Fitur | Kompleksitas |
|---|---|---|
| B1 | Departure Readiness Dashboard (% siap per kategori) | 🟡 Medium |
| B2 | Waiting List per Departure | 🟡 Medium |
| B3 | Mutasi Booking (pindah departure) | 🔴 High |
| B4 | Kebijakan Pembatalan + Refund Workflow | 🔴 High |
| B5 | Muthawif Profile di PackageDetail Publik | 🟢 Low |
| B6 | Hotel Capacity Warning di Booking Wizard | 🟡 Medium |
| B7 | Equipment Distribution → departure_expenses Auto | 🟢 Low |
| B8 | Pre-Departure Checklist (Admin + Jamaah) | 🟡 Medium |

### Sprint C — Kelengkapan Fitur (Estimasi: 3–4 minggu)

| Kode | Fitur | Kompleksitas |
|---|---|---|
| C1 | Dokumen Upload Portal Jamaah | 🔴 High |
| C2 | Automated Reminder Schedule (H-60 s/d H-1) | 🟡 Medium |
| C3 | Itinerary Template → Departure Auto-Populate | 🟡 Medium |
| C4 | Multi-Muthawif per Departure | 🔴 High |
| C5 | Muthawif Rating Post-Trip (survei otomatis) | 🟡 Medium |
| C6 | Muthawif Conflict Calendar | 🟡 Medium |
| C7 | Hotel Contract / Voucher Management | 🟡 Medium |
| C8 | SOS Eskalasi Otomatis + History Log | 🟡 Medium |
| C9 | Departure Capacity Visual (Admin + Publik) | 🟢 Low |
| C10 | Booking Line Item Breakdown di Invoice | 🟡 Medium |

### Sprint D — Unifikasi & Refinement (Ongoing)

| Kode | Fitur | Kompleksitas |
|---|---|---|
| D1 | Unifikasi Dual Rooming System (satu sumber kebenaran) | 🔴 High |
| D2 | Multi-Hotel per City UI (lengkapi migration 066) | 🟡 Medium |
| D3 | Live Itinerary Update dari Guide + Notifikasi Jamaah | 🟡 Medium |
| D4 | Offline Mode QR Scanner (IndexedDB + sync) | 🔴 High |
| D5 | Visa Deadline Tracking + Alert Otomatis | 🟡 Medium |
| D6 | Equipment Size Auto-Suggest (profil jamaah TB/BB) | 🟢 Low |
| D7 | P&L Departure — Komponen Lengkap (komisi, perlengkapan, payment realtime) | 🟡 Medium |
| D8 | Booking Line Item: breakdown transparan | 🟡 Medium |

---

## RINGKASAN EKSEKUTIF

| Area | Kondisi | Bottleneck Utama | Prioritas Fix |
|---|---|---|---|
| **Paket** | ✅ Solid & Lengkap | Minor: HPP template tidak auto-apply ke departure | Sprint A3 |
| **Keberangkatan** | ⚠️ Kaya fitur tapi banyak koneksi putus | Status cascade, HPP auto-apply, muthawif init | Sprint A |
| **Booking** | ✅ Wizard kuat, payment OK | Mutasi, refund, waiting list, line item | Sprint B |
| **Perlengkapan** | ⚠️ Fitur ada tapi tidak connected | Tidak auto-queue saat booking confirmed | **Sprint A1** |
| **Kamar** | ⚠️ Dual system membingungkan | Dua sumber kebenaran tidak sync | Sprint A6, D1 |
| **Tour Guide** | ⚠️ Infrastructure bagus, koneksi manual | Guide channel tidak auto-init, no multi-muthawif | Sprint A5, C4 |
| **Visa** | 🔴 Half-built | Tidak auto-create, no deadline tracking, no upload portal | Sprint A2, C1 |
| **Operasional** | ⚠️ Banyak tabel ada, UI parsial | SOS incomplete, checklist tidak terintegrasi, itinerary tidak sampai ke jamaah | Sprint B8, C8, C3 |

**Bottleneck terbesar seluruh sistem:** Tidak ada "glue" yang menghubungkan `booking.status → confirmed` ke pembuatan record downstream (equipment queue, visa, room queue). Inilah yang harus dikerjakan di Sprint A — tanpa ini, semua fitur operasional berikutnya tetap manual dan rawan human error.
