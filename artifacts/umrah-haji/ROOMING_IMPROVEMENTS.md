# Flexible Rooming System - Dokumentasi Perbaikan

## 📋 Ringkasan Perubahan

Sistem penempatan kamar (rooming) telah diperbaiki untuk mendukung **pemilihan teman sekamar yang lebih fleksibel** berdasarkan kapasitas tipe kamar.

### Masalah Lama
- Menggunakan `roommate_id` (single relationship) - hanya bisa pair 2 orang
- Untuk Triple/Quad, harus pair satu per satu - tidak intuitif
- Tidak ada validasi kapasitas yang jelas

### Solusi Baru
- Menggunakan `room_group_id` (UUID) untuk mengelompokkan anggota kamar
- Multi-select interface untuk memilih teman sekamar sesuai kapasitas
- Validasi kapasitas otomatis berdasarkan tipe kamar
- Recalculate room type saat anggota grup berubah

---

## 🗄️ Perubahan Database

### File Migrasi
**Location**: `artifacts/umrah-haji/src/lib/migrations/flexible-rooming-groups.sql`

### Perubahan Skema

#### 1. Tambah Kolom `room_group_id`
```sql
ALTER TABLE booking_passengers
  ADD COLUMN IF NOT EXISTS room_group_id UUID;
```

**Tujuan**: Mengelompokkan jamaah dalam satu kamar dengan fleksibilitas multi-select

#### 2. Migrasi Data `roommate_id` → `room_group_id`
```sql
-- Setiap pair roommate_id dikonversi ke room_group_id yang sama
-- Contoh: Jika A.roommate_id = B dan B.roommate_id = A
--         Keduanya akan mendapat room_group_id yang sama
```

#### 3. Helper Functions

**`get_roommates(passenger_id UUID)`**
- Mengembalikan daftar teman sekamar (anggota grup lain)
- Berguna untuk UI menampilkan siapa saja dalam grup

**`validate_room_group_capacity(group_id UUID, expected_room_type TEXT)`**
- Validasi apakah grup melebihi kapasitas
- Return: `is_valid`, `current_count`, `max_capacity`, `message`

**`get_room_group_members(group_id UUID)`**
- Mengembalikan semua anggota grup dengan detail lengkap
- Termasuk: nama, gender, room preference, room number, booking code

#### 4. Audit Table
**`room_group_audit`** - Mencatat semua perubahan grup kamar
- `action`: 'add_to_group', 'remove_from_group', 'create_group', 'delete_group'
- `old_room_type`, `new_room_type`: Tracking perubahan tipe kamar
- `reason`: Alasan perubahan
- `changed_by`: User yang melakukan perubahan

---

## 🎨 Perubahan Frontend

### 1. AdminRoomAssignmentsImproved.tsx
**Location**: `artifacts/umrah-haji/src/pages/admin/AdminRoomAssignmentsImproved.tsx`

#### Fitur Utama

**Multi-Select Roommates Dialog**
```
┌─────────────────────────────────┐
│ Pilih Teman Sekamar             │
├─────────────────────────────────┤
│ Main Passenger: Budi (Quad)     │
│ Sisa Slot: 3 dari 3             │
│                                 │
│ ☐ Ahmad (L) - Booking #001      │
│ ☑ Hasan (L) - Booking #002      │
│ ☐ Rudi (L) - Booking #003       │
│                                 │
│ [Batal]  [Konfirmasi (1)]       │
└─────────────────────────────────┘
```

**Validasi Kapasitas**
- Double: Pilih 1 teman (total 2 orang)
- Triple: Pilih 2 teman (total 3 orang)
- Quad: Pilih 3 teman (total 4 orang)
- Single: Tidak bisa memilih teman

**Validasi Gender & Mahram**
- Same gender ✅
- Mahram (same booking) ✅
- Spouse (married status match) ✅
- Cross-gender non-mahram ❌

#### Mutations

**`createRoomGroupMutation`**
```typescript
// Input
{
  mainPassengerId: string;
  selectedMateIds: string[];
  roomNumber?: string;
  reason?: string;
}

// Process
1. Validasi kapasitas
2. Validasi gender/mahram compatibility
3. Generate UUID untuk room_group_id
4. Hitung room_type berdasarkan group size
5. Update semua anggota dengan room_group_id
6. Log audit untuk setiap anggota
```

**`removeFromGroupMutation`**
```typescript
// Input
{
  passengerId: string;
  reason?: string;
}

// Process
1. Cek apakah ada anggota lain
2. Jika ada, recalculate room_type
3. Remove dari group
4. Log audit
```

#### UI Components

**Stats Cards**
- Total Penumpang
- Sudah Dikelompokkan (green)
- Belum Dikelompokkan (amber)

**Filter Buttons**
- Room Type: All, Quad, Triple, Double, Single
- Gender: All, Male, Female
- Status: All, Grouped, Ungrouped

**Passengers Table**
| Nama | Gender | Tipe Kamar | Status Grup | Teman Sekamar | Aksi |
|------|--------|-----------|------------|---------------|------|
| Budi | L | Quad | ✅ Grup (2) | Hasan | Keluarkan |
| Hasan | L | Quad | ✅ Grup (2) | Budi | Keluarkan |
| Ahmad | L | Double | ❌ Belum | - | Pilih Teman |

### 2. RoomingListPageImproved.tsx
**Location**: `artifacts/umrah-haji/src/pages/operational/RoomingListPageImproved.tsx`

#### Fitur

**Room Management**
- Tambah kamar dengan tipe (Single/Double/Triple/Quad)
- Tampilkan kapasitas dan occupancy per kamar
- Hapus kamar (jika kosong)

**Assign Passengers**
- Multi-select passengers untuk ditambahkan ke kamar
- Validasi kapasitas real-time
- Tampilkan sisa slot

**Room Cards**
```
┌──────────────────────────┐
│ Kamar 101 [Double]       │
├──────────────────────────┤
│ Lantai: 1                │
│ Kapasitas: 1/2           │
│                          │
│ Penghuni:                │
│ • Budi (L)      [❌]     │
│                          │
│ [+ Tambah] [🗑 Hapus]   │
└──────────────────────────┘
```

---

## 📊 Kapasitas Kamar

| Tipe Kamar | Kapasitas | Teman Sekamar | Total |
|-----------|-----------|---------------|-------|
| Single | 1 | 0 | 1 |
| Double | 2 | 1 | 2 |
| Triple | 3 | 2 | 3 |
| Quad | 4 | 3 | 4 |

---

## 🔄 Workflow Penempatan Kamar

### Scenario 1: Membuat Grup Double
```
1. Admin buka AdminRoomAssignmentsImproved
2. Pilih Paket → Keberangkatan
3. Filter: Double, Ungrouped
4. Klik "Pilih Teman" pada Budi
5. Dialog terbuka, pilih Hasan
6. Klik "Konfirmasi (1)"
7. Sistem:
   - Generate room_group_id
   - Update Budi: room_group_id = xxx, room_preference = double
   - Update Hasan: room_group_id = xxx, room_preference = double
   - Log audit untuk keduanya
8. Tampilan berubah: Status = ✅ Grup (2)
```

### Scenario 2: Membuat Grup Quad
```
1. Klik "Pilih Teman" pada Budi (Quad)
2. Dialog: Sisa Slot: 3 dari 3
3. Pilih: Hasan, Ahmad, Rudi
4. Klik "Konfirmasi (3)"
5. Sistem:
   - Generate room_group_id = yyy
   - Update 4 orang dengan room_group_id = yyy
   - room_preference tetap quad
   - Log audit
6. Semua 4 orang menunjukkan: ✅ Grup (4)
```

### Scenario 3: Mengeluarkan dari Grup
```
1. Klik "Keluarkan" pada Hasan (dari grup Quad)
2. Sistem:
   - Hapus room_group_id dari Hasan
   - Update 3 orang lain:
     - room_preference berubah: quad → triple
   - Log audit untuk semua
3. Tampilan:
   - Hasan: ❌ Belum
   - Budi, Ahmad, Rudi: ✅ Grup (3) [Triple]
```

---

## 🔐 Validasi & Business Rules

### Validasi Kapasitas
```typescript
const maxCapacity = getRoomCapacity(roomType);
if (groupSize > maxCapacity) {
  throw new Error(`Melebihi kapasitas kamar ${roomType} (maks ${maxCapacity})`);
}
```

### Validasi Gender
```typescript
// Allowed combinations:
1. Same gender (L-L, P-P)
2. Mahram (same booking_id)
3. Spouse (married status match + name match)

// Not allowed:
- Cross-gender non-mahram
```

### Validasi Keunikan Grup
```typescript
// Saat membuat grup:
- Tidak boleh ada yang sudah dalam grup lain
- Tidak boleh duplikasi member
- Tidak boleh self-pairing
```

### Auto-Recalculate Room Type
```typescript
// Saat anggota berubah:
const newRoomType = getRoomTypeBySize(groupSize);
// 1 orang → single
// 2 orang → double
// 3 orang → triple
// 4 orang → quad
```

---

## 📝 Backward Compatibility

### Migrasi dari `roommate_id`
- Existing `roommate_id` data akan di-migrate ke `room_group_id`
- Kolom `roommate_id` tetap ada untuk backward compatibility
- Sistem bisa membaca dari keduanya (dengan prioritas `room_group_id`)

### Dual Support
```typescript
// Saat query:
const groupMembers = getGroupMembers(p.room_group_id);
if (!groupMembers.length && p.roommate_id) {
  // Fallback ke roommate_id jika room_group_id kosong
}
```

---

## 🚀 Implementasi

### Step 1: Apply Migration
```bash
# Run di Supabase dashboard atau CLI
supabase migration up
```

### Step 2: Update Routes
```typescript
// src/routes/AdminRoutes.tsx
// Tambahkan:
import AdminRoomAssignmentsImproved from '@/pages/admin/AdminRoomAssignmentsImproved';

// Di route config:
{
  path: '/admin/room-assignments-improved',
  element: <AdminRoomAssignmentsImproved />
}
```

### Step 3: Update Navigation
```typescript
// src/components/admin/SuperAdminPanel.tsx
// Tambahkan menu item baru atau replace yang lama
```

### Step 4: Test
```
1. Create test departure
2. Create test passengers
3. Test creating room groups
4. Test removing from group
5. Test capacity validation
6. Test gender validation
```

---

## 📚 API Reference

### Mutations

**Create Room Group**
```typescript
createRoomGroupMutation.mutate({
  mainPassengerId: 'uuid',
  selectedMateIds: ['uuid1', 'uuid2'],
  roomNumber: '101',
  reason: 'Manual assignment'
});
```

**Remove from Group**
```typescript
removeFromGroupMutation.mutate({
  passengerId: 'uuid',
  reason: 'Permintaan jamaah'
});
```

### Queries

**Get Room Passengers**
```typescript
const { data: passengers } = useQuery({
  queryKey: ['room-passengers-improved', selectedDeparture],
  queryFn: async () => {
    return supabase
      .from('booking_passengers')
      .select(`
        id, room_preference, room_group_id,
        customer:customers(id, full_name, gender),
        booking:bookings(id, booking_code, room_type)
      `)
      .eq('booking.departure_id', selectedDeparture);
  }
});
```

**Get Room Group Members**
```typescript
const groupMembers = passengers?.filter(
  p => p.room_group_id === targetGroupId
) || [];
```

---

## 🐛 Troubleshooting

### Issue: Room group tidak terbuat
**Solusi**:
1. Cek validasi kapasitas
2. Cek validasi gender/mahram
3. Cek apakah ada yang sudah dalam grup
4. Lihat error message di toast

### Issue: Room type tidak berubah saat anggota berubah
**Solusi**:
1. Pastikan mutation berhasil
2. Refresh query dengan `queryClient.invalidateQueries()`
3. Cek audit log untuk tracking

### Issue: Data lama (roommate_id) tidak tampil
**Solusi**:
1. Jalankan migration untuk konversi data
2. Atau update query untuk support keduanya
3. Cek RLS policy

---

## 📞 Support

Untuk pertanyaan atau issue:
1. Cek audit log di `room_group_audit`
2. Lihat error message di console
3. Hubungi tim development

---

## 📄 Changelog

### v1.0 (2026-05-07)
- ✅ Tambah `room_group_id` ke booking_passengers
- ✅ Buat AdminRoomAssignmentsImproved dengan multi-select
- ✅ Buat RoomingListPageImproved dengan flexible rooming
- ✅ Implementasi validasi kapasitas & gender
- ✅ Audit logging untuk tracking perubahan
