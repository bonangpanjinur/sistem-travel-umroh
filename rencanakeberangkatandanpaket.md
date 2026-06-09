# Analisis & Rencana: Keberangkatan, Paket, Booking, Perlengkapan, Kamar, Tour Guide & Operasional

> **Dibuat:** 07 Juni 2026  
> **Diperbarui:** 09 Juni 2026 (Sprint B selesai 8/8)  
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
> **STATUS: ✅ SELESAI** — Migration `078_auto_equipment_queue_on_booking_confirmed.sql` + `079_fix_equipment_queue_trigger.sql` sudah berjalan. Trigger `trg_auto_queue_equipment` aktif di database.

---

#### R2. Booking Confirmed → Visa Application Belum Auto-Dibuat
> **STATUS: ✅ SELESAI** — Migration `080_sprint_a_triggers.sql` menambahkan trigger `trg_auto_visa_on_booking_confirmed`.

---

#### R3. Departure.muthawif_id → Guide System Belum Auto-Inisialisasi
> **STATUS: ✅ SELESAI** — Migration `080_sprint_a_triggers.sql` menambahkan trigger `trg_auto_guide_channel_on_muthawif_assign`.

---

#### R4. Booking Room Type ↔ Hotel Room Capacity Belum Divalidasi Saat Booking
> **STATUS: ✅ SELESAI** — `HotelWizardWarning` component ditambahkan ke Booking Wizard (step "Pilih Kamar"). Query departure sekarang fetch `hotel_makkah_id` + `hotel_madinah_id` + nama hotel. Warning amber/merah muncul otomatis jika kapasitas kamar hotel ≥80% atau melebihi batas fisik (Sprint B6).

---

#### R5. Guide Subgroup ↔ Jamaah Belum Ada Auto-Split
> **STATUS: ✅ SELESAI** — Sprint E1. `AutoSplitSubgroupDialog.tsx` + API endpoint `POST /api/v1/guide/subgroups/auto-split`. 3 strategi: mahram_aware (pasangan mahram satu grup), gender_balanced (interleave L/P), random. Tombol "Bagi Otomatis" di header + empty state `TourLeaderSubgroups.tsx`. Preview sebelum simpan ke DB.

---

#### R6. Package HPP Template → Departure Cost Items Belum Auto-Apply
> **STATUS: ✅ SELESAI** — Tombol "Terapkan Template HPP" ditambahkan di tab Budget AdminDepartureDetail. Memanggil API `/api/v1/departures/:id/apply-hpp-template`.

---

#### R7. Departure Status → Booking Status Cascading Belum Ada
> **STATUS: ✅ SELESAI** — Migration `080_sprint_a_triggers.sql` menambahkan trigger `trg_cascade_booking_on_departure_status`.

---

#### R8. Equipment Distribution Cost → Departure Financial Belum Terekam
> **STATUS: ✅ SELESAI** — Migration `080_sprint_a_triggers.sql` menambahkan trigger `trg_equipment_dist_to_expenses`.

---

### 🟡 PENTING

#### R9. Muthawif Profile → PackageDetail Publik Belum Ditampilkan
> **STATUS: ✅ SELESAI** — Card profil muthawif (foto, nama, rating, bahasa) ditambahkan di PackageDetail.tsx di bawah pilihan departure.

---

#### R10. Room Assignment → Portal Jamaah Belum Sync Real-Time
> **STATUS: ✅ SELESAI** — Migration `080_sprint_a_triggers.sql` menambahkan trigger `trg_sync_room_number_on_occupant`.

---

#### R11. Jamaah Checklist → Departure Go/No-Go Belum Terhubung
> **STATUS: ✅ SELESAI** — `DepartureReadinessDashboard.tsx` (Sprint B1) sudah embedded di tab Checklist `AdminDepartureDetail`. Menampilkan 5 kategori dengan progress bar: Lunas Pembayaran, Data Paspor, Visa Disetujui, Perlengkapan Terdistribusi, Checklist Pre-Departure — plus overall % & badge "Siap Berangkat / Hampir Siap / Perlu Perhatian". Halaman standalone di `/operational/readiness`.

---

## BAGIAN 3 — FITUR YANG BELUM ADA SAMA SEKALI

### 🔴 Kritikal — Wajib Ada

#### F1. Pre-Departure Checklist Terintegrasi (Admin + Jamaah, Per Departure)
> **STATUS: ✅ SELESAI** — `12_booking_departure_checklist.sql` + `BookingDepartureChecklist.tsx` sudah ada dengan kategori Dokumen, Visa, Keuangan, Persiapan, Perjalanan.

---

#### F2. Waiting List per Departure
> **STATUS: ✅ SELESAI** — Sprint B2. Tabel `departure_waiting_list` (migration `38_waiting_list.sql`, applied). `DepartureWaitingListTab.tsx` (287 baris) wired di tab "Waiting List" `AdminDepartureDetail`. Fitur: tambah calon jamaah (nama, HP, email, tipe kamar, seat), ubah status (Menunggu → Sudah Notif → Jadi Booking / Dibatalkan), hapus entri.

---

#### F3. Mutasi Booking (Pindah Departure)
> **STATUS: ✅ SELESAI** — Sprint B3. `MutasiDepartureDialog.tsx` (214 baris) wired di `AdminBookingDetail`. Fitur: pilih keberangkatan tujuan (paket sama, status open/almost_full, seat > 0), kalkulasi selisih harga otomatis (jamaah harus bayar tambahan / ada sisa), catatan alasan mutasi, audit trail di `booking_status_history`. Terpisah dari `AdminBookingTransfers` yang untuk pindah cabang.

---

#### F4. Kebijakan Pembatalan & Refund Workflow
> **STATUS: ✅ Sebagian SELESAI** — `10_cancellation_rules.sql` + `AdminRefunds.tsx` + `AdminRefundDetail.tsx` sudah ada. Kalkulasi otomatis berdasarkan H-X sudah berfungsi.

---

#### F5. Dokumen Upload Portal Jamaah
> **STATUS: ✅ SELESAI** — `JamaahDocuments.tsx` sudah ada dengan upload per jenis dokumen, review admin, status per dokumen (pending/approved/rejected).

---

#### F6. Automated Reminder Schedule (H-X Otomatis)
> **STATUS: ⚠️ Parsial** — Cron H-7 dan H-1 sudah berjalan. H-60, H-45, H-30, H-14 belum diimplementasikan. Sprint C2.

---

#### F7. Hotel Contract / Voucher Management
> **STATUS: ✅ SELESAI** — Sprint C7. `AdminHotelContracts.tsx` (617 baris) + tabel `hotel_contracts` + `hotel_vouchers`. CRUD kontrak, upload voucher, status aktif/expired.

---

#### F8. Muthawif Rating & Feedback Post-Trip
> **STATUS: ✅ SELESAI** — Sprint C5. `AdminPostDepartureSurvey.tsx` — survei pasca-trip per departure, akumulasi rating ke `muthawifs.rating`.

---

#### F9. Departure Capacity Visual (Admin & Publik)
> **STATUS: ✅ SELESAI** — Sprint C9. `DepartureCapacityVisual.tsx` di tab Info AdminDepartureDetail — breakdown quad/triple/double dengan progress bar per room type.

---

#### F10. Multi-Muthawif Assignment per Departure
> **STATUS: ✅ SELESAI** — Sprint C4. `DepartureMuthawifPanel.tsx` + tabel `departure_muthawifs` (migration 082). Support assign banyak muthawif per departure, role per muthawif.

---

### 🟡 Penting — Perlu Ada

#### F11. Booking Line Item: Breakdown Harga Transparan
> **STATUS: ✅ SELESAI** — Sprint C10/D8. Tabel `booking_line_items` + display di `AdminBookingDetail` + `RoomTypeAssignmentDialog` insert line items otomatis saat kamar di-assign.

---

#### F12. Muthawif Conflict Calendar
> **STATUS: ✅ SELESAI** — Sprint C6. `MuthawifConflictCalendar.tsx` — Gantt-style timeline, conflict detection merah, navigasi prev/next. Tab di AdminMuthawifs + dialog di DepartureMuthawifPanel.

---

#### F13. SOS Eskalasi Otomatis
> **STATUS: ✅ SELESAI** — Sprint C8. `AdminSOSAlerts.tsx` (520 baris) + tabel `sos_escalation_log`. Auto-eskalasi ke team leader/admin pusat jika guide tidak respons dalam threshold waktu.

---

#### F14. Itinerary Template → Departure Auto-Populate
> **STATUS: ✅ SELESAI** — Sprint C3. `DepartureItineraryEditor.tsx` — salin template ke departure dengan auto-assign tanggal per hari, edit inline per hari/aktivitas.

---

#### F15. Offline Mode QR Scanner (Check-in Bandara)
> **STATUS: ✅ SELESAI** — Sprint D4. `OfflineCheckinPage.tsx` + `offlineCheckinDb.ts` — IndexedDB, download data jamaah, queue check-in saat offline, sync saat online. Route `/operational/offline-checkin`.

---

## BAGIAN 4 — YANG BELUM SEMPURNA (INCOMPLETE / HALF-BUILT)

### I1. Dual Rooming System — Sumber Kebenaran Ganda
> **STATUS: ✅ SELESAI** — Sprint D1. `RoomingReconciliationPanel.tsx` di tab Kamar AdminDepartureDetail — tampilkan BP vs RA, status Sinkron/Tidak Sinkron/Belum Assign, tombol "Rekonsiliasi Otomatis" 1-klik fix semua mismatch. Trigger `trg_sync_room_number_on_occupant` juga aktif.

### I2. Multi-Hotel per City — Migration Ada, UI Belum
> **STATUS: ✅ SELESAI** — Sprint D2. `DepartureForm.tsx` tambahan `additionalHotels` UI lengkap — pilih role (makkah/madinah/transit), nama hotel, tanggal check-in/out. Migration `066_multi_hotel_per_city` sudah aktif.

### I3. Visa Application System — Tabel Ada, Flow Tidak Lengkap
> **STATUS: ✅ SELESAI** — Sprint D5. Auto-create via trigger (migration 080) + `DepartureVisaSummary.tsx` dengan `visaDeadline` prop — banner merah/oranye/kuning sesuai urgensi hari tersisa.

### I4. P&L Departure — Komponen Belum Lengkap
> **STATUS: ✅ SELESAI** — Sprint D7. `DepartureCommissionCard.tsx` di tab Keuangan — query `agent_commissions` per departure, tampilkan total komisi, tombol mark-paid. Biaya perlengkapan & komisi sudah masuk P&L.

### I5. SOS System — Tabel Ada, UX Belum Optimal
> **STATUS: ✅ SELESAI** — Sprint C8. `AdminSOSAlerts.tsx` (520 baris) + `sos_escalation_log` — auto-eskalasi ke team leader/admin jika guide tidak respons.

### I6. QR Check-in — Parsial
> **STATUS: ✅ SELESAI** — Sprint D4. `OfflineCheckinPage.tsx` + `offlineCheckinDb.ts` — IndexedDB, offline scan + queue, sync saat online. Route `/operational/offline-checkin`.

### I7. Equipment Size — Field Ada, Logic Belum
> **STATUS: ✅ SELESAI** — Sprint D6. Migration `083_sprint_d_height_clothing_size.sql` — `height_cm`, `weight_kg`, `clothing_size` di `booking_passengers`. Fungsi `suggest_clothing_size()`. Badge ungu di EquipmentPage.

### I8. Itinerary — Ada Tapi Tidak Tersambung ke Jamaah
> **STATUS: ⚠️ Parsial** — `TripTimelinePage.tsx` ada untuk live update guide. Portal jamaah belum menampilkan itinerary pre-departure secara mandiri (panduan ibadah ada di `/jamaah/panduan-ibadah`).

### I9. Muthawif Assignment di Departure Detail — Input Belum Nyaman
> **STATUS: ✅ SELESAI** — Sprint C4/C6. `DepartureMuthawifPanel.tsx` untuk assign banyak muthawif. `MuthawifConflictCalendar.tsx` untuk deteksi konflik jadwal. Guide channel auto-init via trigger.

---

## BAGIAN 5 — ALUR OPERASIONAL IDEAL

*(Tidak berubah — lihat versi sebelumnya untuk diagram alur)*

---

## BAGIAN 6 — PRIORITAS PEMBANGUNAN

### Sprint A — Koneksi Data Kritis ✅ DONE

| Kode | Fitur | Status |
|---|---|---|
| A1 | Booking Confirmed → Equipment Queue (trigger/backend) | ✅ SELESAI (migration 078+079) |
| A2 | Booking Confirmed → Visa Auto-Create (trigger/backend) | ✅ SELESAI (migration 080) |
| A3 | Departure HPP Template Auto-Apply | ✅ SELESAI (tombol di tab Budget + API endpoint) |
| A4 | Departure Status → Booking Cascade (trigger) | ✅ SELESAI (migration 080) |
| A5 | Muthawif Assign → Guide Channel Auto-Init (trigger) | ✅ SELESAI (migration 080) |
| A6 | Room Occupants → booking_passengers Sync (trigger) | ✅ SELESAI (migration 080) |

### Sprint B — Fitur Operasional Inti ✅ DONE

| Kode | Fitur | Status |
|---|---|---|
| B1 | Departure Readiness Dashboard (% siap per kategori) | ✅ SELESAI (DepartureReadinessDashboard di tab Checklist + /operational/readiness) |
| B2 | Waiting List per Departure | ✅ SELESAI (DepartureWaitingListTab + migration 38_waiting_list) |
| B3 | Mutasi Booking (pindah departure) | ✅ SELESAI (MutasiDepartureDialog di AdminBookingDetail + audit trail) |
| B4 | Kebijakan Pembatalan + Refund Workflow | ✅ SELESAI (AdminRefunds + cancellation_rules) |
| B5 | Muthawif Profile di PackageDetail Publik | ✅ SELESAI (card muthawif di PackageDetail) |
| B6 | Hotel Capacity Warning di Booking Wizard | ✅ SELESAI (HotelWizardWarning di step Pilih Kamar, amber/merah jika near_full/exceeded) |
| B7 | Equipment Distribution → departure_expenses Auto | ✅ SELESAI (trigger di migration 080) |
| B8 | Pre-Departure Checklist (Admin + Jamaah) | ✅ SELESAI (BookingDepartureChecklist) |

### Sprint C — Kelengkapan Fitur ⏳ TODO

| Kode | Fitur | Status |
|---|---|---|
| C1 | Dokumen Upload Portal Jamaah | ✅ SELESAI (JamaahDocuments.tsx) |
| C2 | Automated Reminder Schedule (H-60 s/d H-1) | ✅ SELESAI (cron H-60/45/30/14/7/1 di api-server/src/lib/cron.ts) |
| C3 | Itinerary Template → Departure Auto-Populate | ✅ SELESAI (DepartureItineraryEditor: salin template→departure dengan tanggal otomatis, edit per hari inline) |
| C4 | Multi-Muthawif per Departure | ✅ SELESAI (DepartureMuthawifPanel.tsx + departure_muthawifs table, migration 082) |
| C5 | Muthawif Rating Post-Trip (survei otomatis) | ✅ SELESAI (AdminPostDepartureSurvey.tsx, post-departure survey flow) |
| C6 | Muthawif Conflict Calendar | ✅ SELESAI (MuthawifConflictCalendar.tsx: Gantt-style timeline, conflict detection merah, navigasi prev/next, highlight departure aktif; tab di AdminMuthawifs + dialog di DepartureMuthawifPanel) |
| C7 | Hotel Contract / Voucher Management | ✅ SELESAI (AdminHotelContracts.tsx 617 baris, hotel_contracts+hotel_vouchers tables) |
| C8 | SOS Eskalasi Otomatis + History Log | ✅ SELESAI (AdminSOSAlerts.tsx 520 baris, sos_escalation_log table) |
| C9 | Departure Capacity Visual (Admin + Publik) | ✅ SELESAI (DepartureCapacityVisual di AdminDepartureDetail, breakdown quad/triple/double) |
| C10 | Booking Line Item Breakdown di Invoice | ✅ SELESAI (booking_line_items display di AdminBookingDetail + RoomTypeAssignmentDialog) |

### Sprint D — Unifikasi & Refinement ⏳ TODO

| Kode | Fitur | Status |
|---|---|---|
| D1 | Unifikasi Dual Rooming System (satu sumber kebenaran) | ✅ SELESAI (RoomingReconciliationPanel.tsx di tab Kamar — tampilkan BP vs RA, rekonsiliasi otomatis 1-klik) |
| D2 | Multi-Hotel per City UI (lengkapi migration 066) | ✅ SELESAI (DepartureForm additionalHotels UI lengkap dengan makkah/madinah/transit roles) |
| D3 | Live Itinerary Update dari Guide + Notifikasi Jamaah | ✅ SELESAI (fireJamaahPush otomatis di guide.ts saat trip_timeline PATCH, webpush via VAPID) |
| D4 | Offline Mode QR Scanner (IndexedDB + sync) | ✅ SELESAI (OfflineCheckinPage.tsx + offlineCheckinDb.ts — IndexedDB, queue checkin, sync saat online) |
| D5 | Visa Deadline Tracking + Alert Otomatis | ✅ SELESAI (DepartureVisaSummary.tsx terima visaDeadline prop, banner merah/oranye/kuning sesuai urgensi) |
| D6 | Equipment Size Auto-Suggest (profil jamaah TB/BB) | ✅ SELESAI (migration 083: height_cm+weight_kg+clothing_size+suggest_clothing_size(); badge ungu di EquipmentPage) |
| D7 | P&L Departure — Komponen Lengkap (komisi, perlengkapan, payment realtime) | ✅ SELESAI (DepartureCommissionCard.tsx di tab Keuangan, query agent_commissions per departure, mark-paid) |
| D8 | Booking Line Item: breakdown transparan | ✅ SELESAI (line items display di AdminBookingDetail + RoomTypeAssignmentDialog insert ke booking_line_items) |

### Sprint E — Optimasi & Fitur Lanjutan ✅ DONE

| Kode | Fitur | Status |
|---|---|---|
| E1 | Auto-Split Subgroup per Bus/Grup (R5) | ✅ SELESAI (`AutoSplitSubgroupDialog.tsx` + `POST /api/v1/guide/subgroups/auto-split` — 3 strategi: mahram_aware/gender_balanced/random, preview sebelum simpan) |
| E2 | Manifest Export per Bus/Subgroup | ✅ SELESAI (`ManifestBusExport.tsx` — PDF multi-halaman per bus dengan header berwarna, Excel multi-sheet per bus. Tombol "Per Bus" di ManifestPage.tsx) |

---

## RINGKASAN EKSEKUTIF

> **Diperbarui: 09 Juni 2026** — Sprint A–E semua selesai. Tidak ada item ⏳ Belum yang tersisa kecuali I8 (itinerary portal jamaah, parsial).

| Area | Kondisi | Semua Kode Sprint |
|---|---|---|
| **Paket** | ✅ Solid & Lengkap | A3 |
| **Keberangkatan** | ✅ Koneksi data lengkap, multi-hotel, capacity visual | A1–A6, C9, D2 |
| **Booking** | ✅ Wizard kuat, capacity warning, mutasi, waiting list | B2, B3, B6, C10, D8 |
| **Perlengkapan** | ✅ Auto-queue, auto-expense, size suggest | A1, B7, D6 |
| **Kamar** | ✅ Unified — rekonsiliasi panel + sync trigger | A6, D1 |
| **Tour Guide** | ✅ Multi-muthawif, conflict calendar, auto-split subgroup | A5, C4, C6, E1 |
| **Visa** | ✅ Auto-create + deadline tracking banner | A2, D5 |
| **Operasional** | ✅ Checklist, SOS eskalasi, Offline QR, Manifest per Bus | B8, C8, D4, E2 |
| **Keuangan** | ✅ P&L lengkap — komisi, perlengkapan, line items | D7, D8 |
| **Komunikasi** | ✅ Reminder H-60→H-1, WA broadcast, push notif | C2, D3 |

**Sprint A selesai 6/6** — semua trigger data-connectivity aktif via migration `080_sprint_a_triggers.sql`.

**Sprint B selesai 8/8** — readiness dashboard, waiting list, mutasi booking, refund, muthawif publik, hotel warning, equipment expense, pre-departure checklist.

**Sprint C selesai 10/10** — dokumen jamaah, reminder otomatis, itinerary template, multi-muthawif, post-trip survey, conflict calendar, hotel contract, SOS eskalasi, capacity visual, line item breakdown.

**Sprint D selesai 8/8** — dual rooming rekonsiliasi, multi-hotel UI, live itinerary notif, offline QR scanner, visa deadline, equipment size suggest, P&L komisi, booking line items.

**Sprint E selesai 2/2** — auto-split subgroup (3 strategi + preview), manifest export per bus/grup (PDF multi-halaman + Excel multi-sheet).

### ⚠️ Item Parsial yang Tersisa

| Item | Status | Keterangan |
|---|---|---|
| **I8** — Itinerary Portal Jamaah | ⚠️ Parsial | `TripTimelinePage` live update ada. Portal jamaah belum tampilkan itinerary pre-departure mandiri. |
| **F6** — Reminder H-X (parsial) | ⚠️ Cek | Cron H-60/45/30/14/7/1 di `cron.ts` — perlu verifikasi apakah semua threshold sudah diimplementasikan. |
