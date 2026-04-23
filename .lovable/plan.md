

## Format Rooming List Baru — Sesuai Template Referensi

Saya cek struktur DB: semua relasi sudah ada (`departures.muthawif_id`, `booking_passengers.roommate_id` & `room_number`, dll). Tidak perlu migration.

### Alur Data
1. User pilih Keberangkatan di halaman Rooming List
2. 1 query departure (join packages, airlines, airports, hotels Makkah & Madinah, muthawif/Tour Leader)
3. 1 query passengers (join booking + customer, exclude cancelled)
4. Auto-grouping client-side: kelompok per `room_number` (atau `roommate_id` bila belum di-assign), urut per `room_type`, lalu beri label sequence (TWIN BED-1, TWIN BED-2, ...)
5. User isi field opsional **Welcome Board** (default = nama paket) & **Time Limit** (state lokal)
6. Klik Export → Excel (xlsx-js-style) atau PDF (jspdf + autotable)

### Output Visual
```text
╔══════════════════════════════════════════════════════════════╗
║  ROOMING LIST {departure_date} BY {airlines.name}            ║ header hitam
║  PROGRAM {duration_days} HARI {packages.name}                ║ judul merah
╠══════════════════════════════════════════════════════════════╣
║ FLIGHT INFO  : {flight_number} {dep.code}-{arr.code} {time}  ║
║ WELCOME BOARD: {input / default = packages.name}             ║
║ TOUR LEADER  : {muthawifs.name}    TIME LIMIT: {input}       ║
║ NOMER TL     : {muthawifs.phone}                             ║
╠══════════════════════════════════════════════════════════════╣
║ No│ NAMA │ SEX │ TYPE │ DOB │ PASSPORT │ ROOM TYPE │ NO ROOM │ AGE
║ 1 │ ISMINAH      │F│ADULT│21-Feb-73│X6811905│┐         │   │ 52
║ 2 │ SOEWARNI A.  │F│ADULT│ 6-Nov-53│E6531425│TWIN BED 1│   │ 71
║ 3 │ DYAH WAHJUNI │F│ADULT│18-Feb-71│E4054246│┐         │   │ 54
║ 4 │ BIANCA P.    │F│ADULT│ 3-Dec-95│E4873509│TWIN BED 2│   │ 29
║ ... (ROOM TYPE & NO ROOM merge per pasangan)                 ║
╠══════════════════════════════════════════════════════════════╣
║ TOTAL HOTEL                                  ← background kuning
║ KAMAR DOUBLE BED               =COUNTIF(double) ROOM         ║
║ KAMAR TWIN SHARING             =COUNTIF(twin)   ROOM         ║
║ KAMAR TWIN SHARING + EXTRA BED =COUNTIF(extra)  ROOM         ║
║                                TOTAL            ROOM         ║
╚══════════════════════════════════════════════════════════════╝
```
Multi-hotel: jika departure punya hotel Makkah & Madinah → 2 sheet Excel atau 2 halaman PDF.

### File yang Diubah / Dibuat

**Baru:**
- `src/lib/rooming-list-exporter.ts`
  - `exportRoomingListExcel(data)` — `xlsx-js-style` untuk styling header hitam, judul merah, baris kuning total, merge cells ROOM TYPE/NO ROOM
  - `exportRoomingListPDF(data)` — `jspdf` + `jspdf-autotable` landscape A4 dengan `didDrawCell` untuk merge sel
  - Helper: `groupOccupantsByRoom()`, `calculateAge()`, `formatDOB()`

**Diubah:**
- `src/hooks/useDepartures.ts` — perluas `useDeparture()` untuk return `muthawifs(name, phone)` (sudah ambil airports & hotels)
- `src/pages/operational/RoomingListPage.tsx` — tambah input Welcome Board & Time Limit, dropdown pilih hotel (Makkah/Madinah/Keduanya), tombol Export Excel & PDF baru
- `src/pages/admin/AdminRoomAssignments.tsx` — replace `handleExportPDF` & `handleExportExcel` ke exporter baru

**Library tambahan:** `xlsx-js-style` (varian `xlsx` dengan dukungan styling sel)

**Tidak diubah:** struktur DB, RLS, alur booking & room assignment.

### Mapping Kolom

| Kolom | Sumber |
|---|---|
| NAMA | `customers.full_name` |
| SEX | `customers.gender` → M/F |
| TYPE | `booking_passengers.passenger_type` → ADULT/CHILD/INFANT |
| DOB | `customers.birth_date` → `dd-MMM-yy` |
| PASSPORT | `customers.passport_number` |
| ROOM TYPE | `bookings.room_type` → quad→QUAD-N, triple→TRIPLE-N, double→TWIN BED-N, single→SINGLE-N |
| NO ROOM | `booking_passengers.room_number` (kosong = belum assigned) |
| AGE | `floor((departure_date - birth_date)/365.25)` |

### Tidak Akan Dibuat
- Penyimpanan template export ke DB
- WYSIWYG editor rooming list
- Toggle kolom AGE (selalu tampil sesuai referensi)

