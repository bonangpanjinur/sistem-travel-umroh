# Analisis & Rencana: Keberangkatan, Paket, Booking, Perlengkapan, Kamar, Tour Guide & Operasional

> **Dibuat:** 07 Juni 2026  
> **Diperbarui:** 09 Juni 2026  
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
> **STATUS: ⚠️ Parsial** — `useHotelRoomCapacities.ts` hook sudah ada tapi belum diintegrasikan ke Booking Wizard sebagai warning real-time. Dijadwalkan Sprint B6.

---

#### R5. Guide Subgroup ↔ Jamaah Belum Ada Auto-Split
> **STATUS: ⏳ Belum** — Tombol "Auto-Bagi Subgroup" belum ada. Dijadwalkan Sprint B.

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
> **STATUS: ⚠️ Parsial** — `EquipmentReadinessCard.tsx` ada tapi belum ada summary lengkap (visa %, lunas %, paspor %). Dijadwalkan Sprint B1.

---

## BAGIAN 3 — FITUR YANG BELUM ADA SAMA SEKALI

### 🔴 Kritikal — Wajib Ada

#### F1. Pre-Departure Checklist Terintegrasi (Admin + Jamaah, Per Departure)
> **STATUS: ✅ SELESAI** — `12_booking_departure_checklist.sql` + `BookingDepartureChecklist.tsx` sudah ada dengan kategori Dokumen, Visa, Keuangan, Persiapan, Perjalanan.

---

#### F2. Waiting List per Departure
> **STATUS: ⏳ Belum** — Sprint B2. Perlu tabel `departure_waiting_list`, UI daftar/promosi, notifikasi WA saat slot kosong.

---

#### F3. Mutasi Booking (Pindah Departure)
> **STATUS: ⏳ Belum** — Sprint B3. `AdminBookingTransfers.tsx` ada tapi untuk pindah cabang, bukan pindah departure. Perlu fitur terpisah.

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
> **STATUS: ⏳ Belum** — Sprint C7. Belum ada tabel/UI untuk rekam kontrak hotel per departure.

---

#### F8. Muthawif Rating & Feedback Post-Trip
> **STATUS: ⏳ Belum** — Sprint C5. Survei pasca-trip belum ada; `muthawifs.rating` belum terakumulasi otomatis.

---

#### F9. Departure Capacity Visual (Admin & Publik)
> **STATUS: ⚠️ Parsial** — `available_seats` total per departure sudah ada. Breakdown per room type (Quad/Triple/Double) dengan progress bar belum ada. Sprint C9.

---

#### F10. Multi-Muthawif Assignment per Departure
> **STATUS: ⏳ Belum** — Sprint C4. Saat ini hanya 1 muthawif per departure (`departures.muthawif_id`).

---

### 🟡 Penting — Perlu Ada

#### F11. Booking Line Item: Breakdown Harga Transparan
> **STATUS: ⏳ Belum** — Sprint C10. Invoice PDF ada tapi tidak breakdown per komponen (supplement, diskon, perlengkapan).

---

#### F12. Muthawif Conflict Calendar
> **STATUS: ⏳ Belum** — Sprint C6. Belum ada cek jadwal overlap saat assign muthawif ke departure.

---

#### F13. SOS Eskalasi Otomatis
> **STATUS: ⏳ Belum** — Sprint C8. Tabel `sos_alerts` ada, routing ke guide ada, tapi auto-eskalasi ke team leader/admin pusat jika no-response belum ada.

---

#### F14. Itinerary Template → Departure Auto-Populate
> **STATUS: ⚠️ Parsial** — `AdminItineraryTemplates.tsx` + `itinerary_templates` tabel ada. `departure_itineraries` bisa link ke template. Tapi belum ada tombol "Copy Template ke Departure" yang auto-clone hari-per-hari. Sprint C3.

---

#### F15. Offline Mode QR Scanner (Check-in Bandara)
> **STATUS: ⏳ Belum** — Sprint D4. Butuh IndexedDB + sync worker.

---

## BAGIAN 4 — YANG BELUM SEMPURNA (INCOMPLETE / HALF-BUILT)

### I1. Dual Rooming System — Sumber Kebenaran Ganda
> **STATUS: ⚠️ Sebagian diperbaiki** — Trigger `trg_sync_room_number_on_occupant` (migration 080) sekarang sync `room_occupants` → `booking_passengers.room_number_makkah/madinah` otomatis. Tapi unifikasi penuh (D1) masih pending.

### I2. Multi-Hotel per City — Migration Ada, UI Belum
> **STATUS: ⏳ Sprint D2** — UI belum diperbarui untuk input hotel ke-2/ke-3.

### I3. Visa Application System — Tabel Ada, Flow Tidak Lengkap
> **STATUS: ⚠️ Sebagian diperbaiki** — Auto-create via trigger sudah ada (migration 080). Deadline tracking (D5) belum ada.

### I4. P&L Departure — Komponen Belum Lengkap
> **STATUS: ⚠️ Sebagian diperbaiki** — Auto-recalc P&L via trigger ada (033). Biaya perlengkapan → departure_expenses auto sudah ada (migration 080, trigger B7). Komisi agen di P&L masih belum.

### I5. SOS System — Tabel Ada, UX Belum Optimal
> **STATUS: ⏳ Sprint C8** — Eskalasi otomatis belum ada.

### I6. QR Check-in — Parsial
> **STATUS: ⏳ Sprint D4** — Scanner mode & offline belum ada.

### I7. Equipment Size — Field Ada, Logic Belum
> **STATUS: ⏳ Sprint D6** — Profil TB/BB jamaah belum ada.

### I8. Itinerary — Ada Tapi Tidak Tersambung ke Jamaah
> **STATUS: ⚠️ Parsial** — `TripTimelinePage.tsx` ada untuk live update. Portal jamaah belum menampilkan itinerary pre-departure.

### I9. Muthawif Assignment di Departure Detail — Input Belum Nyaman
> **STATUS: ⚠️ Sebagian diperbaiki** — Guide channel auto-init sudah ada (trigger 080). Conflict calendar (C6) belum ada.

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

### Sprint B — Fitur Operasional Inti 🔄 IN PROGRESS

| Kode | Fitur | Status |
|---|---|---|
| B1 | Departure Readiness Dashboard (% siap per kategori) | ⏳ Belum |
| B2 | Waiting List per Departure | ⏳ Belum |
| B3 | Mutasi Booking (pindah departure) | ⏳ Belum |
| B4 | Kebijakan Pembatalan + Refund Workflow | ✅ SELESAI (AdminRefunds + cancellation_rules) |
| B5 | Muthawif Profile di PackageDetail Publik | ✅ SELESAI (card muthawif di PackageDetail) |
| B6 | Hotel Capacity Warning di Booking Wizard | ⚠️ Parsial (hook ada, warning belum) |
| B7 | Equipment Distribution → departure_expenses Auto | ✅ SELESAI (trigger di migration 080) |
| B8 | Pre-Departure Checklist (Admin + Jamaah) | ✅ SELESAI (BookingDepartureChecklist) |

### Sprint C — Kelengkapan Fitur ⏳ TODO

| Kode | Fitur | Status |
|---|---|---|
| C1 | Dokumen Upload Portal Jamaah | ✅ SELESAI (JamaahDocuments.tsx) |
| C2 | Automated Reminder Schedule (H-60 s/d H-1) | ⚠️ Parsial (H-7, H-1 ada; H-60, H-45, H-30, H-14 belum) |
| C3 | Itinerary Template → Departure Auto-Populate | ⚠️ Parsial (template ada, auto-copy belum) |
| C4 | Multi-Muthawif per Departure | ⏳ Belum |
| C5 | Muthawif Rating Post-Trip (survei otomatis) | ⏳ Belum |
| C6 | Muthawif Conflict Calendar | ⏳ Belum |
| C7 | Hotel Contract / Voucher Management | ⏳ Belum |
| C8 | SOS Eskalasi Otomatis + History Log | ⏳ Belum |
| C9 | Departure Capacity Visual (Admin + Publik) | ⚠️ Parsial (total seats ada, room type breakdown belum) |
| C10 | Booking Line Item Breakdown di Invoice | ⏳ Belum |

### Sprint D — Unifikasi & Refinement ⏳ TODO

| Kode | Fitur | Status |
|---|---|---|
| D1 | Unifikasi Dual Rooming System (satu sumber kebenaran) | ⚠️ Parsial (sync trigger ada, full unification belum) |
| D2 | Multi-Hotel per City UI (lengkapi migration 066) | ⏳ Belum |
| D3 | Live Itinerary Update dari Guide + Notifikasi Jamaah | ⚠️ Parsial (TripTimelinePage ada, push ke jamaah belum) |
| D4 | Offline Mode QR Scanner (IndexedDB + sync) | ⏳ Belum |
| D5 | Visa Deadline Tracking + Alert Otomatis | ⏳ Belum |
| D6 | Equipment Size Auto-Suggest (profil jamaah TB/BB) | ⏳ Belum |
| D7 | P&L Departure — Komponen Lengkap (komisi, perlengkapan, payment realtime) | ⚠️ Parsial (auto-recalc ada, komisi di P&L belum) |
| D8 | Booking Line Item: breakdown transparan | ⏳ Belum |

---

## RINGKASAN EKSEKUTIF

| Area | Kondisi | Status Fix |
|---|---|---|
| **Paket** | ✅ Solid & Lengkap | Sprint A3 DONE |
| **Keberangkatan** | ✅ Koneksi data sudah lengkap | Sprint A DONE semua |
| **Booking** | ✅ Wizard kuat, payment OK | B4 DONE; B2, B3 masih pending |
| **Perlengkapan** | ✅ Auto-queue + auto-expense sudah connected | Sprint A1, B7 DONE |
| **Kamar** | ⚠️ Sync trigger sudah ada | A6 DONE; D1 full unification masih pending |
| **Tour Guide** | ✅ Guide channel auto-init | A5 DONE; C4 multi-muthawif masih pending |
| **Visa** | ⚠️ Auto-create sudah ada | A2 DONE; D5 deadline tracking masih pending |
| **Operasional** | ⚠️ Checklist ada, SOS parsial | B8 DONE; C8 SOS eskalasi masih pending |

**Sprint A selesai 100%** — semua 6 trigger data-connectivity sudah aktif di database via migration `080_sprint_a_triggers.sql`.

**Sprint B: 4 dari 8 selesai** — B4, B5, B7, B8. Masih perlu: B1 (readiness dashboard), B2 (waiting list), B3 (mutasi booking), B6 (hotel capacity warning di wizard).
