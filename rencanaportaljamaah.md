# Rencana Portal Jamaah — Dokumen Arsitektur & Implementasi

> **Status:** Dokumen Aktif · Versi 2.1 · Diperbarui: Juni 2025  
> **Sprint Aktif:** Sprint 20 (Sprint 16, 17, 18, 19 selesai ✅)
> **Scope:** Arsitektur teknis, integrasi sistem, roadmap implementasi Portal `/jamaah`
> **Dibaca oleh:** Engineer, Product Owner, QA

---

## Daftar Isi

1. [Visi & Prinsip](#1-visi--prinsip)
2. [Peta Sistem — Integrasi dengan Infrastruktur Existing](#2-peta-sistem)
3. [Model Role × Mode — Matrix Lengkap](#3-model-role--mode)
4. [Arsitektur Teknis](#4-arsitektur-teknis)
5. [Spesifikasi Tampilan per Role](#5-spesifikasi-tampilan-per-role)
6. [Sistem Ibadah — Spesifikasi Teknis Lengkap](#6-sistem-ibadah)
7. [Spesifikasi Fitur Baru](#7-spesifikasi-fitur-baru)
8. [Database — Tabel & Query](#8-database)
9. [Real-time & Notifikasi](#9-real-time--notifikasi)
10. [PWA & Strategi Offline](#10-pwa--strategi-offline)
11. [Roadmap Sprint](#11-roadmap-sprint)
12. [Keputusan Arsitektur](#12-keputusan-arsitektur)
13. [Checklist Acceptance Criteria](#13-checklist-acceptance-criteria)

---

## 1. Visi & Prinsip

### Visi
Portal `/jamaah` adalah **pendamping digital ibadah** — bukan aplikasi travel biasa.
Ketika jamaah memegang HP di Tanah Suci, satu-satunya hal yang mereka butuhkan ada di sini:
jadwal sholat, panduan ibadah, itinerary hari ini, kontak darurat, dan ketenangan hati.

### Prinsip Desain

| Prinsip | Penjelasan | Implementasi |
|---------|------------|--------------|
| **Ibadah First** | Konten ibadah selalu di atas. Promosi di bawah atau disembunyikan. | `isOnTrip` → hide `FeaturedPackages`, `BannerCarousel` |
| **Context-Aware** | Tampilan berubah otomatis berdasarkan siapa user dan statusnya. | `usePortalContext()` hook sentral |
| **Offline-Ready** | Fitur kritis (panduan ibadah, doa, kiblat) harus jalan tanpa internet. | Service Worker + IndexedDB via `useOfflineCache` |
| **Satu URL** | `/jamaah` — sama untuk semua role. Login menentukan tampilan. | Role-switch dalam `JamaahPortal.tsx` |
| **Mobile-First** | 95% pengguna pakai HP. Desain dimulai dari layar 360px. | `JamaahAppShell` + PWA standalone mode |
| **Minimal Friction** | Ibadah adalah prioritas — setiap klik ekstra adalah penghalang. | Quick-access grid di home, shortcut 1-tap |

### Yang BUKAN Prioritas Sekarang
- Katalog paket di halaman utama jamaah aktif
- Banner promosi dan CTA marketing
- Program loyalitas / poin reward
- Referral jamaah

---

## 2. Peta Sistem

### 2.1 Infrastruktur yang Sudah Ada (Jangan Diulang)

```
┌─────────────────────────────────────────────────────────────────┐
│                    PORTAL JAMAAH /jamaah                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Frontend (React 19 + Vite 7)                                   │
│  artifacts/umrah-haji/src/                                       │
│                                                                  │
│  Auth ─────────────── useAuth() → Supabase Auth                 │
│  Role Check ────────── useCanAccess() / user?.role              │
│  Bookings ──────────── useBookings() → Supabase REST            │
│  Notifikasi ────────── useJamaahNotifRealtime() → Realtime      │
│  Push Notif ────────── useJamaahPushSubscription()              │
│  Ibadah Progress ───── useIbadahProgress() → ibadah_progress    │
│  Ibadah Reminder ───── useIbadahReminder() → local notif        │
│  PWA Mode ──────────── usePWAMode() + usePWAConfig()            │
│  Offline ───────────── useOfflineCache() + useOfflineQueue()    │
│  Waktu Sholat ──────── aladhan.com API (sudah ada)              │
│  Kiblat ────────────── DeviceOrientation + Geolocation          │
│  Al-Quran ──────────── offline data subset                      │
│  Zikir ─────────────── ibadah_progress table                    │
│  Tracker Ibadah ─────── ibadah_progress table                   │
│                                                                  │
├──────────────────────┬──────────────────────────────────────────┤
│   API Server :8080   │         Supabase                        │
│   /api/*             │         PostgreSQL + Auth + Realtime     │
│                      │                                          │
│  /api/v1/packages    │  profiles            bookings           │
│  /api/bookings       │  user_roles          departures         │
│  /api/push           │  packages            customers          │
│  /api/whatsapp       │  booking_passengers  ibadah_progress    │
│  /api/email          │  sos_alerts          guide_subgroups    │
│  /api/totp           │  jamaah_live_loc.    customer_notifs    │
│  /api/reminders      │  guide_sessions      guide_sess_attend  │
│  /api/v1/kurs        │  muthawifs           departure_itins    │
└──────────────────────┴──────────────────────────────────────────┘
```

### 2.2 Data Flow Utama

```
User buka /jamaah
     │
     ▼
useAuth() ──→ Supabase Auth
     │
     ├─ Belum login ──→ <GuestView />
     │
     └─ Login ──→ user.role?
                    │
                    ├─ "muthawif" ──→ useActiveDeparture(muthawifId)
                    │                        ↓
                    │               <MuthawifHomeView />
                    │
                    ├─ "tour_leader" ──→ useActiveDeparture(tourLeaderId)
                    │                           ↓
                    │                  <TourLeaderHomeView />
                    │
                    └─ "jamaah"/"customer" ──→ useActiveTrip(userId)
                                                      ↓
                                      isOnTrip? ──────┤
                                                      │
                                          ┌───────────┴───────────┐
                                          ▼                       ▼
                                  <JamaahOnTripView />   <JamaahOffTripView />
```

### 2.3 Tabel DB yang Relevan

| Tabel | Dipakai Untuk | RLS Pattern |
|-------|---------------|-------------|
| `profiles` | Nama, avatar, role user | `id = auth.uid()` |
| `user_roles` | Cek role (jamaah, muthawif, tour_leader) | `user_id = auth.uid()` |
| `bookings` | Cari trip aktif, booking upcoming | `customer_id = auth.uid()` |
| `departures` | Info keberangkatan (tanggal, hotel, TL, muthawif) | Via bookings |
| `departure_itineraries` | Itinerary per hari | Via departure_id |
| `customers` | Data jamaah lengkap (nama, passport, dll) | `user_id = auth.uid()` |
| `booking_passengers` | Penumpang dalam booking | Via booking_id |
| `ibadah_progress` | Tracker sholat, zikir, tawaf, sa'i | `user_id = auth.uid()` |
| `sos_alerts` | SOS darurat jamaah | TL/Muthawif: via departure |
| `jamaah_live_locations` | Lokasi real-time saat ON_TRIP | TL/Muthawif: via departure |
| `guide_subgroups` | Rombongan/bus dalam departure | Via departure_id |
| `guide_subgroup_members` | Anggota per rombongan | Via subgroup_id |
| `guide_sessions` | Sesi absensi (boarding, kegiatan) | Via departure_id |
| `guide_session_attendance` | Absensi jamaah per sesi | Via session_id |
| `customer_notifications` | Notifikasi in-app jamaah | `customer_id = auth.uid()` |
| `muthawifs` | Data muthawif (id, nama, phone) | `user_id = auth.uid()` |

---

## 3. Model Role × Mode

### 3.1 Role yang Dikenali

```typescript
// Dari: artifacts/umrah-haji/src/types/database.ts
type AppRole =
  | "jamaah"       // Jamaah / Calon Jamaah (login sebagai pelanggan)
  | "customer"     // Alias jamaah (legacy, perlakuan sama)
  | "muthawif"     // Pemandu ibadah di Tanah Suci
  | "tour_leader"  // Pemimpin rombongan
  | "super_admin"  // Akses penuh (untuk support)
  | "admin"        | "owner" | "finance" | ...  // Staff internal (tidak pakai /jamaah)
```

### 3.2 Mode Perjalanan Jamaah

```typescript
type TripMode =
  | "ON_TRIP"     // Ada booking confirmed + tanggal sekarang dalam range departure–return
  | "UPCOMING"    // Ada booking confirmed + departure_date di masa depan (< 30 hari)
  | "PREPARING"   // Ada booking confirmed + departure_date di masa depan (> 30 hari)
  | "OFF_TRIP"    // Tidak ada booking aktif
  | "COMPLETED"   // Pernah pergi, sudah kembali (semua booking past)
```

### 3.3 Matrix Lengkap: Role × Mode → View

| Role | Mode | View Ditampilkan | Focus Konten |
|------|------|------------------|--------------|
| `jamaah` / `customer` | ON_TRIP | `JamaahOnTripView` | Itinerary hari ini, sholat setempat, kontak darurat |
| `jamaah` / `customer` | UPCOMING | `JamaahUpcomingView` | Countdown, checklist dokumen, manasik, persiapan |
| `jamaah` / `customer` | PREPARING | `JamaahPreparingView` | Manasik, persiapan, sholat harian, Al-Quran |
| `jamaah` / `customer` | OFF_TRIP | `JamaahOffTripView` | Ibadah harian, sholat, Al-Quran, zikir |
| `jamaah` / `customer` | COMPLETED | `JamaahCompletedView` | Kenangan, sertifikat, ibadah harian |
| `muthawif` | ON_TRIP | `MuthawifActiveView` | Rombongan, absensi, SOS, laporan |
| `muthawif` | OFF_TRIP | `MuthawifOffView` | Ibadah harian (sama seperti jamaah OFF_TRIP) |
| `tour_leader` | ON_TRIP | `TourLeaderActiveView` | Command center, broadcast, rombongan, itinerary |
| `tour_leader` | OFF_TRIP | `TourLeaderOffView` | Ibadah harian |
| Tamu (belum login) | — | `GuestIbadahView` | Ibadah publik: sholat, kiblat, quran, doa |

---

## 4. Arsitektur Teknis

### 4.1 Hook Sentral: `usePortalContext()`

Hook ini menjadi satu sumber kebenaran untuk semua keputusan rendering di `/jamaah`.
File baru: `artifacts/umrah-haji/src/hooks/usePortalContext.ts`

```typescript
interface PortalContext {
  // Identity
  user: User | null;
  role: AppRole | null;
  isGuest: boolean;

  // Trip state
  tripMode: TripMode;
  activeTrip: ActiveTripData | null;       // null jika OFF_TRIP
  upcomingTrip: UpcomingTripData | null;   // null jika tidak ada upcoming

  // Operational (muthawif/TL)
  activeDeparture: DepartureData | null;   // untuk muthawif & TL

  // Derived flags (untuk conditional rendering)
  isOnTrip: boolean;         // tripMode === "ON_TRIP"
  isJamaah: boolean;         // role === "jamaah" || "customer"
  isMuthawif: boolean;       // role === "muthawif"
  isTourLeader: boolean;     // role === "tour_leader"
  showPromotion: boolean;    // false saat ON_TRIP / UPCOMING
  currentItinerary: ItineraryItem[];  // kosong jika tidak ON_TRIP

  // System state
  isLoading: boolean;
  error: string | null;
}
```

**Implementasi Internal:**
```typescript
export function usePortalContext(): PortalContext {
  const { user } = useAuth();
  const role = useUserRole();                    // sudah ada via useAuth
  const { data: activeTrip, isLoading: tripLoading } = useActiveTrip(user?.id);
  const { data: activeDeparture } = useActiveDeparture(user?.id, role);

  const tripMode = deriveMode(activeTrip);
  const todayItinerary = useTodayItinerary(activeTrip?.departure_id, activeTrip?.departure_date);

  return {
    user, role,
    isGuest: !user,
    tripMode,
    activeTrip: activeTrip ?? null,
    activeDeparture: activeDeparture ?? null,
    isOnTrip: tripMode === "ON_TRIP",
    isJamaah: role === "jamaah" || role === "customer",
    isMuthawif: role === "muthawif",
    isTourLeader: role === "tour_leader",
    showPromotion: tripMode === "OFF_TRIP" || tripMode === "COMPLETED",
    currentItinerary: todayItinerary ?? [],
    isLoading: tripLoading,
    error: null,
  };
}
```

### 4.2 Hook: `useActiveTrip(userId)`

File baru: `artifacts/umrah-haji/src/hooks/useActiveTrip.ts`

```typescript
// Query ke Supabase — JOIN bookings + departures + packages + hotels
const { data } = useQuery({
  queryKey: ["active-trip", userId],
  queryFn: async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id, booking_code, room_type, bus_number, status,
        departure:departures (
          id, departure_date, return_date, destination,
          tour_leader_user_id,
          muthawif:muthawifs ( id, full_name, phone ),
          hotel_makkah:hotels!hotel_makkah_id ( name, star_rating, address ),
          hotel_madinah:hotels!hotel_madinah_id ( name, star_rating, address )
        ),
        package:packages ( name, duration_days, destination_city )
      `)
      .eq("customer_id", userId)
      .eq("status", "confirmed")
      .lte("departure.departure_date", today)
      .gte("departure.return_date", today)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  enabled: !!userId,
  staleTime: 5 * 60 * 1000,  // re-fetch tiap 5 menit
});
```

### 4.3 Hook: `useTodayItinerary(departureId, departureDate)`

File baru: `artifacts/umrah-haji/src/hooks/useTodayItinerary.ts`

```typescript
// Hitung hari ke-N berdasarkan tanggal mulai, ambil itinerary hari itu
const dayNumber = differenceInDays(new Date(), parseISO(departureDate)) + 1;

const { data } = useQuery({
  queryKey: ["itinerary-today", departureId, dayNumber],
  queryFn: async () => {
    const { data } = await supabase
      .from("departure_itineraries")
      .select("id, day_number, start_time, end_time, title, description, location, icon, category")
      .eq("departure_id", departureId)
      .eq("day_number", dayNumber)
      .order("start_time", { ascending: true });
    return data ?? [];
  },
  enabled: !!departureId && !!departureDate,
});
```

### 4.4 Hook: `useActiveDeparture(userId, role)`

File baru: `artifacts/umrah-haji/src/hooks/useActiveDeparture.ts`
Untuk muthawif dan tour leader — cari departure aktif yang mereka pimpin.

```typescript
queryFn: async () => {
  const today = new Date().toISOString().split("T")[0];

  if (role === "muthawif") {
    // cari via muthawifs.user_id → departures.muthawif_id
    const { data: muthawif } = await supabase
      .from("muthawifs").select("id").eq("user_id", userId).maybeSingle();
    if (!muthawif) return null;

    const { data } = await supabase
      .from("departures")
      .select("id, departure_date, return_date, ...")
      .eq("muthawif_id", muthawif.id)
      .lte("departure_date", today)
      .gte("return_date", today)
      .maybeSingle();
    return data;
  }

  if (role === "tour_leader") {
    const { data } = await supabase
      .from("departures")
      .select("id, departure_date, return_date, ...")
      .eq("tour_leader_user_id", userId)
      .lte("departure_date", today)
      .gte("return_date", today)
      .maybeSingle();
    return data;
  }

  return null;
};
```

### 4.5 Refactor `JamaahPortal.tsx`

```tsx
export default function JamaahPortal() {
  const ctx = usePortalContext();

  if (ctx.isLoading) return <PortalSkeleton />;

  // === ROLE-BASED ROUTING ===
  if (ctx.isMuthawif)    return <MuthawifHomeView departure={ctx.activeDeparture} />;
  if (ctx.isTourLeader)  return <TourLeaderHomeView departure={ctx.activeDeparture} />;

  // === JAMAAH / CUSTOMER ===
  switch (ctx.tripMode) {
    case "ON_TRIP":    return <JamaahOnTripView ctx={ctx} />;
    case "UPCOMING":   return <JamaahUpcomingView ctx={ctx} />;
    case "PREPARING":  return <JamaahPreparingView ctx={ctx} />;
    case "COMPLETED":  return <JamaahCompletedView ctx={ctx} />;
    default:           return <JamaahOffTripView ctx={ctx} />;
  }
}
```

### 4.6 Bottom Navigation Dinamis

File: `artifacts/umrah-haji/src/components/jamaah/JamaahBottomNav.tsx`
Ubah agar tab berubah sesuai `ctx.tripMode` dan `ctx.role`.

```typescript
const NAV_CONFIG: Record<string, NavTab[]> = {
  // Jamaah sedang di Tanah Suci
  jamaah_ON_TRIP: [
    { label: "Hari Ini",  icon: CalendarDays, path: "/jamaah" },
    { label: "Sholat",    icon: Moon,         path: "/jamaah/waktu-sholat" },
    { label: "Peta",      icon: MapPin,        path: "/jamaah/peta-lokasi" },
    { label: "Rombongan", icon: Users,         path: "/jamaah/rombongan" },
    { label: "SOS",       icon: AlertTriangle, path: "/jamaah/sos-status", urgent: true },
  ],
  // Jamaah mau berangkat (< 30 hari)
  jamaah_UPCOMING: [
    { label: "Beranda",   icon: Home,          path: "/jamaah" },
    { label: "Sholat",    icon: Moon,          path: "/jamaah/waktu-sholat" },
    { label: "Manasik",   icon: BookOpen,      path: "/jamaah/manasik" },
    { label: "Dokumen",   icon: FileText,      path: "/jamaah/documents" },
    { label: "Profil",    icon: User,          path: "/jamaah/profil" },
  ],
  // Jamaah harian (tidak ada perjalanan aktif)
  jamaah_OFF_TRIP: [
    { label: "Beranda",   icon: Home,          path: "/jamaah" },
    { label: "Sholat",    icon: Moon,          path: "/jamaah/waktu-sholat" },
    { label: "Al-Quran",  icon: BookMarked,    path: "/jamaah/al-quran" },
    { label: "Ibadah",    icon: Heart,         path: "/jamaah/tracker-ibadah" },
    { label: "Profil",    icon: User,          path: "/jamaah/profil" },
  ],
  // Muthawif operasional
  muthawif_ON_TRIP: [
    { label: "Beranda",     icon: Home,          path: "/jamaah" },
    { label: "Absensi",     icon: CheckCircle,   path: "/jamaah/transmisi" },
    { label: "Rombongan",   icon: Users,         path: "/jamaah/rombongan" },
    { label: "SOS",         icon: AlertTriangle, path: "/jamaah/sos-status", urgent: true },
  ],
  // Tour Leader operasional
  tour_leader_ON_TRIP: [
    { label: "Overview",    icon: Radio,         path: "/jamaah" },
    { label: "Itinerary",   icon: Calendar,      path: "/jamaah/itinerary" },
    { label: "Broadcast",   icon: Megaphone,     path: "/jamaah/chat" },
    { label: "Rombongan",   icon: Users,         path: "/jamaah/rombongan" },
    { label: "SOS",         icon: AlertTriangle, path: "/jamaah/sos-status", urgent: true },
  ],
};
```

---

## 5. Spesifikasi Tampilan per Role

---

### 5A. `JamaahOnTripView` — Saat Di Tanah Suci

**File baru:** `artifacts/umrah-haji/src/pages/jamaah/views/JamaahOnTripView.tsx`

#### Layout (dari atas ke bawah):

```
┌─────────────────────────────────────────┐
│  [OFFLINE BADGE jika tidak ada internet] │
├─────────────────────────────────────────┤
│  TripStatusHeader                        │
│  "Hari ke-3 dari 9 · Makkah · Kamis"    │
│  [Nama Paket] [Kloter Badge]             │
├─────────────────────────────────────────┤
│  SholatCountdownWidget (PROMINENT)       │
│  ◐ Ashar · 03:24 lagi · 15:45 WAS       │
├─────────────────────────────────────────┤
│  TodayItineraryCard                      │
│  ┌──────────────────────────────────┐   │
│  │ AGENDA HARI INI (Hari ke-3)      │   │
│  │ ✅ 06:00 Sarapan                 │   │
│  │ ✅ 08:00 Tawaf Qudum             │   │
│  │ ▶ 10:00 Sa'i ← SEDANG BERJALAN  │   │
│  │   13:00 Makan Siang              │   │
│  │   15:00 Ziarah Jabal Nur         │   │
│  │   [Lihat Besok →]                │   │
│  └──────────────────────────────────┘   │
├─────────────────────────────────────────┤
│  IbadahContextualGuide                   │
│  [Panduan tawaf/sa'i jika itu agenda]   │
│  [Doa memasuki Masjidil Haram]          │
├─────────────────────────────────────────┤
│  HotelInfoCard                           │
│  🏨 Hotel: [Nama] · Lantai [X] Kamar [Y]│
│  🚌 Bus: Kloter [N] · Berangkat [jam]   │
├─────────────────────────────────────────┤
│  EmergencyContactBar (STICKY)            │
│  📞 [Tour Leader] | 📞 [Muthawif] | 🆘  │
├─────────────────────────────────────────┤
│  QuickIbadahGrid (4 item)                │
│  [Jadwal Sholat] [Kiblat] [Doa] [Zikir]│
├─────────────────────────────────────────┤
│  WeatherWidget (Cuaca Makkah/Madinah)    │
├─────────────────────────────────────────┤
│  JournalQuickEntry (catatan hari ini)    │
└─────────────────────────────────────────┘
```

**Data Sources:**
- `TripStatusHeader` ← `activeTrip.departure.departure_date`, `activeTrip.package.duration_days`
- `SholatCountdownWidget` ← `aladhan.com` dengan koordinat Makkah (21.3891, 39.8579) atau Madinah (24.5247, 39.5692) tergantung itinerary hari ini
- `TodayItineraryCard` ← `departure_itineraries` WHERE `day_number = dayIndex`
- `HotelInfoCard` ← `activeTrip.departure.hotel_makkah` atau `hotel_madinah` sesuai hari
- `EmergencyContactBar` ← `activeTrip.departure.tour_leader_user_id` → `profiles`, `activeTrip.departure.muthawif`
- `WeatherWidget` ← `CuacaWidget.tsx` yang sudah ada, pass koordinat city

---

### 5B. `JamaahUpcomingView` — Mau Berangkat (< 30 Hari)

**File baru:** `artifacts/umrah-haji/src/pages/jamaah/views/JamaahUpcomingView.tsx`

```
┌──────────────────────────────────────────┐
│  CountdownHero                            │
│  🕋 15 Hari Lagi Menuju Baitullah        │
│  [Animasi kabah atau progress bar        │
│   persentase hari menuju berangkat]      │
├──────────────────────────────────────────┤
│  SholatCountdownWidget (lokasi lokal)    │
├──────────────────────────────────────────┤
│  PreparationChecklist                    │
│  Persiapan Dokumen:                      │
│  ✅ Paspor (exp: 2027)                   │
│  ⬜ Visa Umroh → [Cek Status]            │
│  ✅ Buku Nikah (jika mahram)             │
│  ⬜ Suntik Meningitis → [Upload Bukti]   │
│                                          │
│  Perlengkapan Ibadah:                    │
│  ⬜ Baju Ihram (2 set)                   │
│  ⬜ Sandal Ihram                         │
│  ... (dari checklist yang sudah ada)     │
├──────────────────────────────────────────┤
│  ManasikProgress                         │
│  Sudah selesai 7/12 materi manasik       │
│  [Lanjutkan Manasik →]                   │
├──────────────────────────────────────────┤
│  BookingQuickInfo                        │
│  Paket: [nama] | Kloter: [N]            │
│  Hotel Makkah: [nama] | Madinah: [nama] │
│  [Lihat Detail Booking →]                │
├──────────────────────────────────────────┤
│  IbadahHarian (collapsed by default)    │
│  [Sholat] [Al-Quran] [Doa] [Zikir]     │
└──────────────────────────────────────────┘
```

---

### 5C. `JamaahOffTripView` — Ibadah Harian

**File baru:** `artifacts/umrah-haji/src/pages/jamaah/views/JamaahOffTripView.tsx`

Ini tampilan utama jamaah yang tidak sedang bepergian.
**Fokus: Pendamping ibadah harian.**

```
┌──────────────────────────────────────────┐
│  DailyGreeting                           │
│  "Assalamu'alaykum, [Nama] 👋"           │
│  Tanggal Hijri + Masehi                  │
├──────────────────────────────────────────┤
│  SholatCountdownWidget (HERO)            │
│  ◐ Ashar · 02:15 lagi                   │
│  [Bar: Subuh ✅ Dzuhur ✅ Ashar ⏳ ...]  │
│  [Lokasi: Jakarta Selatan · Ubah]        │
├──────────────────────────────────────────┤
│  QuickIbadahGrid (2 baris × 4)           │
│  [Kiblat] [Al-Quran] [Zikir] [Doa]     │
│  [Tracker] [Target] [Panduan] [Jadwal]  │
├──────────────────────────────────────────┤
│  IbadahStreakCard                        │
│  🔥 Streak 7 hari sholat 5 waktu        │
│  Progress Zikir: 87/100 hari ini         │
├──────────────────────────────────────────┤
│  AyatHarianCard                          │
│  QS. Al-Baqarah: 286 (auto-rotate)      │
│  [Arab + Latin + Terjemah]               │
├──────────────────────────────────────────┤
│  JamaahJurnalPreview (jika ada)          │
│  Catatan terakhir Anda...               │
├──────────────────────────────────────────┤
│  ═══ SEPARATOR: "Perjalanan Anda" ═══   │
│  (section ini hanya muncul jika ada     │
│   booking confirmed atau sejarah)        │
│                                          │
│  Booking Upcoming / Riwayat Perjalanan  │
├──────────────────────────────────────────┤
│  ═══ SEPARATOR: "Temukan Paket" ═══     │
│  (PALING BAWAH — promosi)               │
│  FeaturedPackages (3 paket)             │
└──────────────────────────────────────────┘
```

---

### 5D. `MuthawifActiveView` — Operasional

**File baru:** `artifacts/umrah-haji/src/pages/jamaah/views/MuthawifActiveView.tsx`
Integrasi dengan data dari `MuthawifDashboard.tsx` yang sudah ada.

```
┌──────────────────────────────────────────┐
│  MuthawifHeader                          │
│  Ustadz/Ustadzah [Nama]                 │
│  Rombongan: [nama group] · [N] jamaah   │
│  Hari ke-[X] / [total hari]             │
├──────────────────────────────────────────┤
│  SOSAlertBanner (merah, jika ada SOS)   │
│  ⚠️ 1 Jamaah Butuh Bantuan! [Lihat →]  │
├──────────────────────────────────────────┤
│  QuickActionGrid                         │
│  [✓ Absensi] [📢 Umumkan] [📋 Laporan] │
│  [👤 Jamaah] [📍 Lokasi] [💬 Chat]     │
├──────────────────────────────────────────┤
│  TodayScheduleCard                       │
│  Agenda yang perlu dipandu hari ini      │
├──────────────────────────────────────────┤
│  JamaahAttendanceSummary                 │
│  ✅ Hadir 22 | ⚠️ Absen 2 | Total 24   │
├──────────────────────────────────────────┤
│  SholatTimeWidget (Makkah/Madinah)       │
├──────────────────────────────────────────┤
│  DailyReportForm (form singkat)          │
│  Kondisi hari ini... [Submit]            │
└──────────────────────────────────────────┘
```

**Data Sources:** Reuse dari `MuthawifDashboard.tsx` — bungkus ulang di sini.
SOS alerts: Supabase Realtime channel `sos_alerts:departure_id=eq.[id]`

---

### 5E. `TourLeaderActiveView` — Command Center

**File baru:** `artifacts/umrah-haji/src/pages/jamaah/views/TourLeaderActiveView.tsx`
Integrasi dengan data dari `TourLeaderDashboard.tsx` yang sudah ada.

```
┌──────────────────────────────────────────┐
│  TLHeader                                │
│  Tour Leader: [Nama]                     │
│  [Nama Paket] · Hari ke-[X]/[N]         │
├──────────────────────────────────────────┤
│  SOSAlertBanner (urgent, realtime)       │
├──────────────────────────────────────────┤
│  RombonganStatsBar                       │
│  ✅ [N] Hadir · ⚠️ [N] Absen · 🔴 [N] SOS │
├──────────────────────────────────────────┤
│  BroadcastQuickForm                      │
│  [Type: Info/Darurat/Program Update]    │
│  [Pesan..............................]   │
│  [Kirim ke Semua Jamaah]                │
├──────────────────────────────────────────┤
│  TodayItinerary (editable)              │
│  + tombol edit jika perlu update        │
├──────────────────────────────────────────┤
│  SubgroupsOverview                       │
│  Bus 1: 24 orang ✅                     │
│  Bus 2: 23 orang ✅                     │
├──────────────────────────────────────────┤
│  MuthawifStatus                          │
│  [Nama Muthawif] · Status terakhir      │
└──────────────────────────────────────────┘
```

---

### 5F. `GuestIbadahView` — Belum Login

```
┌──────────────────────────────────────────┐
│  GuestHeader                             │
│  [Logo Vinstour]                         │
│  "Portal Ibadah"                         │
├──────────────────────────────────────────┤
│  SholatCountdownWidget                   │
│  (detect lokasi otomatis, no auth)       │
├──────────────────────────────────────────┤
│  PublicIbadahGrid                        │
│  [Kiblat] [Jadwal Sholat]               │
│  [Al-Quran] [Doa Harian]               │
├──────────────────────────────────────────┤
│  LoginPromptCard (soft gate)            │
│  "Login untuk melihat itinerary,        │
│   rombongan, dan fitur lengkap lainnya" │
│  [Login] [Daftar]                       │
├──────────────────────────────────────────┤
│  FeaturedPackages (3 paket teratas)     │
└──────────────────────────────────────────┘
```

---

## 6. Sistem Ibadah

### 6.1 Jadwal Sholat — Enhanced

**File existing:** `artifacts/umrah-haji/src/pages/jamaah/JamaahWaktuSholat.tsx`
**Perubahan yang diperlukan:**

**A. Override lokasi saat ON_TRIP:**
```typescript
// Jika sedang di Tanah Suci, gunakan koordinat kota sesuai itinerary hari ini
const prayerCity = useMemo(() => {
  if (!ctx.isOnTrip) return userLocation;  // lokasi GPS real

  // Tentukan kota dari itinerary hari ini
  const todayCity = ctx.currentItinerary?.[0]?.location;
  if (todayCity?.includes("Madinah")) return MADINAH_COORDS;
  if (todayCity?.includes("Makkah") || todayCity?.includes("Mekah")) return MAKKAH_COORDS;
  return MAKKAH_COORDS; // default Makkah
}, [ctx.isOnTrip, ctx.currentItinerary, userLocation]);

const MAKKAH_COORDS  = { lat: 21.3891, lng: 39.8579 };
const MADINAH_COORDS = { lat: 24.5247, lng: 39.5692 };
```

**B. SholatCountdownWidget — komponen mandiri untuk homepage:**
File baru: `artifacts/umrah-haji/src/components/jamaah/SholatCountdownWidget.tsx`
- Ditampilkan di semua homepage (ON_TRIP, OFF_TRIP, Muthawif, TL)
- Hitung waktu sholat berikutnya real-time
- Tampilkan: nama sholat, countdown, progress bar 5 waktu hari ini
- Data: cache dari `aladhan.com` via `useQuery` (staleTime: 1 jam)

**C. Azan Audio Notification:**
- Gunakan `useIbadahReminder` yang sudah ada
- Tambahkan opsi azan (audio file lokal / URL)
- Notifikasi push 15 menit sebelum waktu sholat via `useJamaahPushSubscription`

### 6.2 Al-Quran — Offline First

**File existing:** `artifacts/umrah-haji/src/pages/jamaah/JamaahAlQuran.tsx`
**Problem saat ini:** Hanya subset surah (demo data).

**Solusi — Progressive Loading:**
1. Bundle 30 surah pendek (Juz 30) di dalam app → selalu available offline
2. Surah lengkap: fetch dari API publik `quran.api` / `alquran.cloud` saat online, cache ke IndexedDB
3. Bookmark + progress reading disimpan ke `ibadah_progress` table

```typescript
// Penyimpanan offline: IndexedDB key "quran-surah-{id}"
const { data: surah } = useQuery({
  queryKey: ["quran-surah", surahId],
  queryFn: async () => {
    // 1. Cek IndexedDB dulu
    const cached = await getFromIndexedDB(`quran-surah-${surahId}`);
    if (cached) return cached;
    // 2. Fetch dari API
    const data = await fetchQuranSurah(surahId);
    // 3. Simpan ke IndexedDB
    await saveToIndexedDB(`quran-surah-${surahId}`, data);
    return data;
  },
  staleTime: Infinity,  // konten Quran tidak berubah
});
```

### 6.3 Zikir & Tasbih Digital

**File existing:** `artifacts/umrah-haji/src/pages/jamaah/ibadah/JamaahZikir.tsx`
**Integrasi DB:** `ibadah_progress` table — sudah berjalan via `useIbadahProgress`

**Enhancement yang diperlukan:**
1. **Zikir kontekstual saat ON_TRIP:** Tampilkan zikir yang relevan dengan lokasi/agenda hari ini
   - Masuk Masjidil Haram → Doa masuk masjid + zikir istilam Hajar Aswad
   - Tawaf → Doa per putaran tawaf (1-7)
   - Sa'i → Doa Shafa & Marwah
   - Wuquf Arafah → Doa terbaik hari Arafah
2. **Haptic feedback** saat tekan tasbih (sudah bisa via `navigator.vibrate(50)`)
3. **Target harian** sinkron dengan `JamaahTargetIbadah.tsx`

### 6.4 Panduan Ibadah Kontekstual

**File existing:** `artifacts/umrah-haji/src/pages/jamaah/ibadah/JamaahPanduanIbadah.tsx`
**Konsep baru: Engine konten kontekstual**

```typescript
// Pilih panduan yang relevan berdasarkan itinerary hari ini
function getContextualGuide(itineraryItems: ItineraryItem[]): GuideContent[] {
  const keywords = itineraryItems.map(i => i.title.toLowerCase()).join(" ");
  const guides = [];

  if (keywords.includes("tawaf"))        guides.push(GUIDE_TAWAF);
  if (keywords.includes("sa'i"))         guides.push(GUIDE_SAI);
  if (keywords.includes("arafah"))       guides.push(GUIDE_WUQUF_ARAFAH);
  if (keywords.includes("masjid nabawi")) guides.push(GUIDE_MASJID_NABAWI);
  if (keywords.includes("raudhah"))      guides.push(GUIDE_RAUDHAH);
  if (keywords.includes("ihram"))        guides.push(GUIDE_IHRAM_NIAT);
  if (keywords.includes("ziarah"))       guides.push(GUIDE_ZIARAH);
  if (keywords.includes("miqat"))        guides.push(GUIDE_MIQAT);

  return guides.length > 0 ? guides : [GUIDE_GENERAL_MAKKAH];
}
```

**Konten panduan** disimpan sebagai JSON statis dalam app (offline), mencakup:
- Arab + Latin + Terjemah + Audio (opsional)
- Langkah-langkah step-by-step
- Ilustrasi/diagram sederhana

### 6.5 Tracker Ibadah — Integrasi Penuh

**File existing:** `artifacts/umrah-haji/src/pages/jamaah/ibadah/JamaahTrackerIbadah.tsx`
**DB Table:** `ibadah_progress`

**Schema yang diasumsikan:**
```sql
ibadah_progress (
  user_id,  date,  sholat_subuh, sholat_dzuhur, sholat_ashar,
  sholat_maghrib,  sholat_isya,  sholat_sunnah_count,
  zikir_pagi, zikir_petang,  zikir_count,
  quran_pages,  tawaf_count,  sai_count,
  notes,  created_at
)
```

**Enhancement:**
- Streak system: hitung consecutive days dengan sholat 5 waktu → tampilkan di `JamaahOffTripView`
- Weekly chart (sudah ada di tracker) → embed mini-version di homepage
- Sync real-time: gunakan Supabase Realtime untuk update lintas device

---

## 7. Spesifikasi Fitur Baru

### 7.1 `TripStatusHeader` — Komponen

**File baru:** `src/components/jamaah/trip/TripStatusHeader.tsx`

Props:
```typescript
{
  tripName: string;           // nama paket
  currentDay: number;         // hari ke-X
  totalDays: number;          // dari N hari
  city: string;               // Makkah / Madinah
  date: string;               // tanggal hari ini
  packageType: "umroh" | "haji" | "haji_plus";
}
```

### 7.2 `TodayItineraryCard` — Komponen

**File baru:** `src/components/jamaah/trip/TodayItineraryCard.tsx`

Logika highlight "sedang berjalan":
```typescript
function getActivityStatus(item: ItineraryItem, now: Date): "done" | "active" | "upcoming" {
  const start = parse(item.start_time, "HH:mm", now);
  const end   = parse(item.end_time,   "HH:mm", now);
  if (isAfter(now, end))    return "done";
  if (isAfter(now, start))  return "active";
  return "upcoming";
}
```

### 7.3 `EmergencyContactBar` — Komponen

**File baru:** `src/components/jamaah/trip/EmergencyContactBar.tsx`

- Sticky di bawah konten, di atas bottom nav
- Tampilkan: nama + nomor TL, nama + nomor Muthawif
- Tombol SOS di tengah (merah)
- Tap nomor → `tel:` link
- Data dari `useActiveTrip()`

### 7.4 `IbadahShortcutsGrid` — Komponen

**File baru:** `src/components/jamaah/IbadahShortcutsGrid.tsx`

```typescript
// 4 shortcut utama saat ON_TRIP:
const ON_TRIP_SHORTCUTS = [
  { label: "Jadwal Sholat", icon: Moon,     path: "/jamaah/waktu-sholat" },
  { label: "Kiblat",        icon: Compass,  path: "/jamaah/kiblat"       },
  { label: "Doa",           icon: Scroll,   path: "/jamaah/doa-panduan"  },
  { label: "Zikir",         icon: Heart,    path: "/jamaah/zikir"        },
];
// 8 shortcut saat OFF_TRIP:
const OFF_TRIP_SHORTCUTS = [
  { label: "Sholat",   icon: Moon,      path: "/jamaah/waktu-sholat" },
  { label: "Kiblat",   icon: Compass,   path: "/jamaah/kiblat"       },
  { label: "Al-Quran", icon: BookMarked, path: "/jamaah/al-quran"    },
  { label: "Zikir",    icon: Heart,     path: "/jamaah/zikir"        },
  { label: "Doa",      icon: Scroll,    path: "/jamaah/doa-panduan"  },
  { label: "Tracker",  icon: Target,    path: "/jamaah/tracker-ibadah" },
  { label: "Manasik",  icon: GraduationCap, path: "/jamaah/manasik" },
  { label: "Jadwal",   icon: Calendar,  path: "/jamaah/waktu-sholat" },
];
```

### 7.5 `HijriDateDisplay` — Komponen

**File baru:** `src/components/jamaah/HijriDateDisplay.tsx`
- Tampilkan tanggal Hijri + Masehi di header homepage
- Gunakan library `hijri-date` atau konversi manual
- Tampilkan nama bulan Hijri penting: Ramadhan, Dzulhijjah, dll

### 7.6 `AyatHarianCard` — Komponen

**File baru:** `src/components/jamaah/AyatHarianCard.tsx`
- Rotasi ayat harian dari koleksi lokal (offline, ~365 ayat)
- Deterministic: hari ke-N tahun ini → ayat ke-N
- Tampil: Arab besar, Latin, terjemah Indonesia
- Tanpa API eksternal (fully offline)

---

## 8. Database

### 8.1 Tambahan Kolom (SQL Migration baru)

**File:** `sql/migrations/046_portal_jamaah_enhancements.sql`

```sql
-- Kolom tambahan di departure_itineraries untuk panduan ibadah kontekstual
ALTER TABLE departure_itineraries
  ADD COLUMN IF NOT EXISTS location_city  TEXT,      -- 'makkah' | 'madinah' | 'transit'
  ADD COLUMN IF NOT EXISTS guide_key      TEXT,      -- 'tawaf' | 'sai' | 'wuquf' | dll
  ADD COLUMN IF NOT EXISTS icon_name      TEXT,      -- lucide icon name
  ADD COLUMN IF NOT EXISTS category       TEXT;      -- 'ibadah' | 'akomodasi' | 'makan' | 'transport'

-- Index untuk query itinerary hari ini
CREATE INDEX IF NOT EXISTS idx_dep_itin_departure_day
  ON departure_itineraries(departure_id, day_number);

-- Tabel konten panduan ibadah (dikelola admin, dibaca jamaah)
CREATE TABLE IF NOT EXISTS ibadah_guides (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_key    TEXT NOT NULL UNIQUE,   -- 'tawaf', 'sai', 'wuquf', dll
  title        TEXT NOT NULL,
  arabic_text  TEXT,
  latin_text   TEXT,
  translation  TEXT NOT NULL,
  audio_url    TEXT,
  steps        JSONB,                  -- [{step: 1, title: "...", desc: "..."}]
  tags         TEXT[],                 -- ['makkah', 'haji', 'umroh']
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- RLS: jamaah hanya bisa baca
ALTER TABLE ibadah_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read active guides"
  ON ibadah_guides FOR SELECT
  USING (is_active = true);
CREATE POLICY "Admin can manage guides"
  ON ibadah_guides FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'operational')
  ));

-- Tabel untuk jurnal perjalanan jamaah
CREATE TABLE IF NOT EXISTS jamaah_journals (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id   UUID REFERENCES bookings(id),
  trip_day     INTEGER,                -- hari ke berapa
  content      TEXT,                   -- catatan teks
  mood         TEXT,                   -- 'khusyu', 'bahagia', 'haru', 'capek'
  photo_urls   TEXT[],                 -- foto dari storage
  location     TEXT,                   -- nama lokasi
  is_private   BOOLEAN DEFAULT true,   -- hanya jamaah itu yang bisa lihat
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE jamaah_journals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their journals"
  ON jamaah_journals FOR ALL
  USING (user_id = auth.uid());

-- Index untuk pengambilan jurnal trip
CREATE INDEX IF NOT EXISTS idx_journals_user_booking
  ON jamaah_journals(user_id, booking_id, trip_day);
```

### 8.2 Query Kritis — Referensi

**Q1: Deteksi ON_TRIP**
```sql
SELECT b.id, b.booking_code, b.room_type, b.bus_number,
       d.id AS departure_id, d.departure_date, d.return_date,
       d.hotel_makkah_id, d.hotel_madinah_id,
       d.tour_leader_user_id, d.muthawif_id,
       p.name AS package_name, p.duration_days, p.type AS package_type
FROM bookings b
JOIN departures d ON b.departure_id = d.id
JOIN packages p   ON d.package_id = p.id
WHERE b.customer_id = auth.uid()
  AND b.status = 'confirmed'
  AND d.departure_date <= CURRENT_DATE
  AND d.return_date    >= CURRENT_DATE
LIMIT 1;
```

**Q2: Itinerary Hari Ini**
```sql
SELECT id, day_number, start_time, end_time, title, description,
       location_city, guide_key, icon_name, category
FROM departure_itineraries
WHERE departure_id = $departureId
  AND day_number   = (CURRENT_DATE - $departureDate::date + 1)
ORDER BY start_time ASC NULLS LAST;
```

**Q3: Daftar Jamaah untuk Muthawif/TL**
```sql
SELECT b.id, b.booking_code, b.room_type,
       c.full_name, c.phone, c.photo_url, c.passport_number,
       sg.name AS subgroup_name, sg.color AS subgroup_color
FROM bookings b
JOIN customers c ON b.customer_id = c.id
LEFT JOIN guide_subgroup_members gsm ON c.id = gsm.customer_id
LEFT JOIN guide_subgroups sg ON gsm.subgroup_id = sg.id
WHERE b.departure_id = $departureId
  AND b.status = 'confirmed'
ORDER BY sg.name, c.full_name;
```

**Q4: Status Absensi Rombongan Hari Ini**
```sql
SELECT
  COUNT(*) FILTER (WHERE gsa.id IS NOT NULL)     AS hadir,
  COUNT(*) FILTER (WHERE gsa.id IS NULL)         AS absen,
  COUNT(*)                                        AS total
FROM bookings b
LEFT JOIN guide_session_attendance gsa
  ON gsa.booking_id = b.id AND gsa.session_id = $sessionId
WHERE b.departure_id = $departureId AND b.status = 'confirmed';
```

---

## 9. Real-time & Notifikasi

### 9.1 Supabase Realtime Channels

| Channel | Event | Siapa Subscribe | Trigger |
|---------|-------|-----------------|---------|
| `sos_alerts:departure_id=eq.[id]` | INSERT | Muthawif, Tour Leader | Jamaah tekan SOS |
| `customer_notifications:customer_id=eq.[id]` | INSERT | Jamaah | Broadcast dari TL/Admin |
| `jamaah_live_locations:departure_id=eq.[id]` | UPDATE | Tour Leader | Jamaah share lokasi |
| `guide_sessions:departure_id=eq.[id]` | INSERT | Jamaah | TL buat sesi absensi baru |
| `departure_itineraries:departure_id=eq.[id]` | UPDATE | Jamaah | TL update itinerary |

**Implementasi:**
```typescript
// Hook: useJamaahRealtimeUpdates.ts (sudah ada JamaahNotifRealtime)
// Extend untuk subscribe ke channels baru saat ON_TRIP

useEffect(() => {
  if (!ctx.isOnTrip) return;
  const departureId = ctx.activeTrip?.departure.id;

  const ch = supabase
    .channel(`departure-updates-${departureId}`)
    .on("postgres_changes", {
      event: "UPDATE",
      schema: "public",
      table: "departure_itineraries",
      filter: `departure_id=eq.${departureId}`,
    }, (payload) => {
      queryClient.invalidateQueries({ queryKey: ["itinerary-today"] });
      toast.info("Itinerary hari ini diperbarui oleh Tour Leader");
    })
    .subscribe();

  return () => supabase.removeChannel(ch);
}, [ctx.isOnTrip, ctx.activeTrip?.departure.id]);
```

### 9.2 Push Notifications — Jadwal Sholat

Gunakan `useJamaahPushSubscription` yang sudah ada + API `/api/push`.

**Logika:**
```typescript
// Setiap hari saat waktu Subuh, jadwalkan push notif 5 waktu sholat hari itu
// Dikerjakan oleh: api-server cron job (extend cron.ts yang sudah ada)

// Tambahkan ke cron.ts:
cron.schedule("0 3 * * *", async () => {  // 03:00 UTC = 10:00 WIB
  await schedulePrayerTimeNotifications();  // kirim push untuk sholat hari ini
}, { timezone: "UTC" });
```

### 9.3 Notifikasi Broadcast TL → Jamaah

**Flow yang sudah ada (TourLeaderDashboard):**
1. TL isi form → POST ke Supabase: INSERT ke `customer_notifications` untuk semua jamaah di departure
2. Jamaah menerima via `useJamaahNotifRealtime` (Realtime channel)
3. Push notif via `/api/push` ke semua subscriber departure

**Yang perlu ditambahkan:** Notifikasi juga muncul sebagai banner/toast di dalam portal saat app terbuka.

---

## 10. PWA & Strategi Offline

### 10.1 Konten yang Wajib Offline

| Konten | Metode Cache | Update Strategy |
|--------|-------------|-----------------|
| Panduan ibadah (tawaf, sa'i, dll) | Service Worker precache | Build time |
| Doa-doa harian (200+ doa) | Service Worker precache | Build time |
| Al-Quran Juz 30 (30 surah) | Service Worker precache | Build time |
| Foto/gambar UI shell | Service Worker precache | Build time |
| Waktu sholat hari ini | IndexedDB (useOfflineCache) | Stale while revalidate |
| Itinerary trip aktif | IndexedDB | Background sync |
| Data rombongan | IndexedDB | Background sync |

**Implementasi di `useOfflineQueue` (sudah ada):**
```typescript
// Saat ON_TRIP, agresifkan pre-cache:
useEffect(() => {
  if (!ctx.isOnTrip) return;

  // Pre-cache itinerary 3 hari ke depan
  prefetchItinerary(ctx.activeTrip.departure_id, dayNumber, dayNumber + 3);

  // Pre-cache data rombongan
  prefetchRombongan(ctx.activeTrip.departure_id);

  // Pre-cache panduan ibadah relevan
  const guideKeys = ctx.currentItinerary.map(i => i.guide_key).filter(Boolean);
  prefetchGuides(guideKeys);
}, [ctx.isOnTrip]);
```

### 10.2 Deteksi Konektivitas

```tsx
// Banner offline yang sudah ada di JamaahOnTripView
{!isOnline && (
  <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 flex items-center gap-2 text-sm">
    <WifiOff className="h-4 w-4 text-amber-600" />
    <span className="text-amber-800">Mode Offline — Konten ibadah tetap tersedia</span>
  </div>
)}
```

---

## 11. Roadmap Sprint

### Sprint 16 — Fondasi Role-Based Portal *(SELESAI ✅)*
**Goal: `/jamaah` punya tampilan berbeda per role dan per mode perjalanan.**

| ID | Status | Task | File |
|----|--------|------|------|
| S16-01 | ✅ | Buat `hooks/useActiveTrip.ts` | `src/hooks/useActiveTrip.ts` |
| S16-02 | ✅ | Buat `hooks/useTodayItinerary.ts` | `src/hooks/useTodayItinerary.ts` |
| S16-03 | ✅ | Buat `hooks/useActiveDeparture.ts` | `src/hooks/useActiveDeparture.ts` |
| S16-04 | ✅ | Buat `hooks/usePortalContext.ts` | `src/hooks/usePortalContext.ts` |
| S16-05 | ✅ | Refactor `JamaahPortal.tsx` → role switch + early returns | `src/pages/jamaah/JamaahPortal.tsx` |
| S16-06 | ✅ | Buat `JamaahOnTripView.tsx` | `src/pages/jamaah/views/JamaahOnTripView.tsx` |
| S16-07 | ✅ | Buat `JamaahOffTripView.tsx` | `src/pages/jamaah/views/JamaahOffTripView.tsx` |
| S16-08 | ✅ | Ubah `JamaahBottomNav.tsx` → dynamic tabs per role×mode | `src/components/jamaah/JamaahBottomNav.tsx` |
| S16-09 | ✅ | SQL migration 046 (`ibadah_guides` + `jamaah_journals` + kolom `departure_itineraries`) | `supabase/migrations/20260610_046_portal_jamaah_enhancements.sql` |
| S16-10 | ✅ | Promosi otomatis tersembunyi saat ON_TRIP (routing ke view terpisah) | via `JamaahOnTripView` |

**Acceptance Criteria Sprint 16:**
- [x] Login sebagai jamaah dengan trip aktif hari ini → muncul itinerary hari ini
- [x] Login sebagai jamaah tanpa trip aktif → muncul view ibadah harian
- [x] Login sebagai muthawif → muncul view operasional muthawif
- [x] Login sebagai tour_leader → muncul view command center TL
- [x] Bottom nav berubah sesuai mode (role×mode key → ROLE_NAV_ITEMS)
- [x] Promosi tidak muncul saat ON_TRIP (dedicated view, no BannerCarousel/FeaturedPackages)

---

### Sprint 17 — Fitur Kritis ON_TRIP *(SELESAI ✅)*
**Goal: Pengalaman ON_TRIP lengkap dan bisa dipakai di Tanah Suci.**

| ID | Status | Task | File |
|----|--------|------|------|
| S17-01 | ✅ | `TripStatusHeader` component | `src/components/jamaah/trip/TripStatusHeader.tsx` |
| S17-02 | ✅ | `TodayItineraryCard` + highlight aktif | `src/components/jamaah/trip/TodayItineraryCard.tsx` |
| S17-03 | ✅ | `EmergencyContactBar` + SOS FAB | `src/components/jamaah/trip/EmergencyContactBar.tsx` |
| S17-04 | ✅ | `HotelInfoCard` (nama hotel, lantai, kamar) | `src/components/jamaah/trip/HotelInfoCard.tsx` |
| S17-05 | ✅ | Sholat override lokasi Makkah/Madinah saat ON_TRIP | `JamaahWaktuSholat.tsx` auto-detect via `usePortalContext` + `SholatCountdownWidget` coords |
| S17-06 | ✅ | `SholatCountdownWidget` standalone | `src/components/jamaah/SholatCountdownWidget.tsx` |
| S17-07 | ✅ | Realtime: subscribe itinerary update di `JamaahOnTripView` | `JamaahOnTripView.tsx` Supabase realtime subscribe |
| S17-08 | ✅ | Offline cache: itinerary + rombongan | `JamaahOnTripView.tsx` sessionStorage offline cache |
| S17-09 | ✅ | `IbadahShortcutsGrid` component | `src/components/jamaah/IbadahShortcutsGrid.tsx` |
| S17-10 | ✅ | `WeatherWidget` terintegrasi di ON_TRIP | `CuacaWidget` dalam `JamaahOnTripView.tsx` |

**Acceptance Criteria Sprint 17:**
- [x] Komponen TripStatusHeader, TodayItineraryCard, EmergencyContactBar, SholatCountdownWidget, IbadahShortcutsGrid siap
- [ ] Itinerary hari ini tampil dengan benar, item aktif di-highlight (perlu data `departure_itineraries`)
- [ ] Waktu sholat menggunakan koordinat Makkah/Madinah (bukan lokasi HP)
- [ ] Kontak darurat TL dan muthawif tampil dan bisa di-tap untuk telepon
- [ ] Tombol SOS selalu visible
- [ ] Itinerary tetap tersedia saat offline

---

### Sprint 18 — Ibadah Harian (OFF_TRIP) *(SELESAI ✅)*
**Goal: Portal jadi pendamping ibadah harian yang nyaman dipakai setiap hari.**

| ID | Status | Task | File |
|----|--------|------|------|
| S18-01 | ✅ | `JamaahOffTripView` skeleton | `src/pages/jamaah/views/JamaahOffTripView.tsx` |
| S18-02 | ✅ | `HijriDateDisplay` component | `src/components/jamaah/HijriDateDisplay.tsx` |
| S18-03 | ✅ | `AyatHarianCard` (offline, 365 ayat) | Inline di `JamaahOffTripView.tsx` |
| S18-04 | ✅ | Ibadah streak system di homepage | `IbadahStreakCard` di `JamaahOffTripView.tsx` |
| S18-05 | ✅ | Mini weekly chart sholat di homepage | `WeeklySholatChart` di `JamaahOffTripView.tsx` |
| S18-06 | ✅ | Al-Quran offline Juz 30 (bundle di app) | `JamaahAlQuran.tsx` — full Juz 30 bundled offline |
| S18-07 | ✅ | `JamaahUpcomingView` (countdown + checklist) | `src/pages/jamaah/views/JamaahUpcomingView.tsx` |
| S18-08 | ✅ | Push notif jadwal sholat (cron + endpoint) | `api-server/src/lib/cron.ts` + `routes/push.ts` |

**Acceptance Criteria Sprint 18:**
- [ ] Homepage menampilkan countdown sholat berikutnya dengan akurat
- [ ] Al-Quran Juz 30 bisa dibaca saat offline total
- [ ] Streak sholat tampil di homepage
- [x] Jamaah dengan booking upcoming melihat countdown keberangkatan (view routing ✅)
- [ ] Push notif sholat diterima di HP meskipun app tidak dibuka

---

### Sprint 19 — Muthawif & Tour Leader Terintegrasi *(SELESAI ✅)*
**Goal: Muthawif dan TL akses semua fungsi dari `/jamaah`, bukan URL terpisah.**

| ID | Status | Task | File |
|----|--------|------|------|
| S19-01 | ✅ | `MuthawifActiveView` di `/jamaah` | `src/pages/jamaah/views/MuthawifActiveView.tsx` |
| S19-02 | ✅ | `TourLeaderActiveView` di `/jamaah` | `src/pages/jamaah/views/TourLeaderActiveView.tsx` |
| S19-03 | ✅ | SOS Realtime di `MuthawifActiveView` | `MuthawifActiveView.tsx` Supabase realtime subscribe `sos_escalation_log` |
| S19-04 | ✅ | Broadcast form di `TourLeaderActiveView` | `TourLeaderActiveView.tsx` form + riwayat + resend |
| S19-05 | ✅ | Panduan ibadah kontekstual (`guide_key`) | `TourLeaderActiveView.tsx` query `ibadah_guides` via `guide_key` dari itinerary |
| S19-06 | ✅ | Jurnal perjalanan (`jamaah_journals` table) | Tabel dibuat di migration 046 |
| S19-07 | ✅ | `MuthawifOffView` dan `TLOffView` = ibadah harian | `MuthawifOffView.tsx` + `TourLeaderOffView.tsx` |

---

### Sprint 20 — Polish & Pengujian *(1 minggu)*
**Goal: Semua skenario teruji, performa optimal, UX halus.**

| ID | Task |
|----|------|
| S20-01 | Uji semua role × mode di device mobile nyata |
| S20-02 | Uji mode offline: sholat, kiblat, quran, doa |
| S20-03 | Performance audit: LCP < 2.5 detik saat ON_TRIP |
| S20-04 | A11y review: ukuran tap target, kontras warna |
| S20-05 | Uji realtime: broadcast TL diterima jamaah < 2 detik |
| S20-06 | Uji SOS: dari tap di HP jamaah hingga alert muncul di TL < 3 detik |

---

## 12. Keputusan Arsitektur

### K1: Satu File Entry Point vs Redirect

**Keputusan:** Satu entry point di `JamaahPortal.tsx`, render view berbeda berdasarkan role.

**Alasan:**
- URL tetap `/jamaah` untuk semua → konsisten, mudah dibookmark dan dibagikan
- Muthawif/TL tidak perlu tahu URL `/muthawif` atau `/tour-leader` — cukup `/jamaah`
- Halaman detail (absensi, subgroup, dll) tetap di URL masing-masing; hanya home yang unified

**Trade-off:** `JamaahPortal.tsx` akan lebih kompleks, tapi dipecah ke view files terpisah sehingga tidak jadi satu file raksasa.

---

### K2: `usePortalContext` sebagai Single Source of Truth

**Keputusan:** Semua state yang dibutuhkan oleh `/jamaah` dikumpulkan dalam satu hook.

**Alasan:**
- Menghindari prop drilling yang dalam
- Setiap view component bisa `usePortalContext()` langsung tanpa bergantung pada parent
- Mudah di-test: mock satu hook untuk semua skenario

---

### K3: Sholat API — External vs Self-hosted

**Keputusan:** Tetap pakai `aladhan.com` + cache agresif (staleTime: 6 jam, IndexedDB backup).

**Alasan:**
- `aladhan.com` sudah dipakai dan teruji di `JamaahWaktuSholat.tsx`
- Mengganti ke self-hosted butuh library perhitungan astronomi yang kompleks
- Cukup cache data sholat 1 bulan ke depan saat pertama load → offline aman

---

### K4: Konten Panduan Ibadah — Static JSON vs DB

**Keputusan:** Hybrid — konten dasar (tawaf, sa'i, doa) sebagai static import di app; konten tambahan/kustomisasi dari `ibadah_guides` table (migrasi 046).

**Alasan:**
- Static: selalu offline, tidak ada round-trip, zero latency
- DB: admin bisa update panduan tanpa deploy ulang app, bisa tambah konten per departure

---

### K5: Muthawif/TL Dashboard — Redirect vs Embed

**Keputusan:** Sprint 19 — embed view baru di `/jamaah`; halaman detail tetap di URL lama (`/jamaah/transmisi`, `/jamaah/rombongan`, dll) untuk backward compat.

**Alasan:**
- Menghapus `/muthawif/dashboard` dan `/tour-leader/dashboard` bisa memecah deep link yang sudah ada
- Solusi: home view dipindah ke `/jamaah`, halaman detail tetap, tambahkan redirect dari URL lama ke `/jamaah` untuk role yang relevan

---

## 13. Checklist Acceptance Criteria

> Legend: ✅ Done · ⏳ Pending · 🔄 In Progress

### Fungsional Utama

**Role Detection** *(Sprint 16 — SELESAI)*
- [x] Jamaah dengan booking ON_TRIP → tampilkan `JamaahOnTripView` ✅
- [x] Jamaah tanpa booking aktif → tampilkan `JamaahOffTripView` ✅
- [x] Jamaah booking upcoming < 30 hari → tampilkan `JamaahUpcomingView` ✅
- [x] Muthawif login → tampilkan `MuthawifActiveView` ✅
- [x] Tour Leader login → tampilkan `TourLeaderActiveView` ✅
- [ ] Belum login → tampilkan `GuestIbadahView` ⏳ (default portal existing)
- [x] Bottom nav otomatis berubah tabs sesuai role × mode ✅

**Ibadah** *(Sprint 17-18)*
- [ ] Countdown sholat berikutnya akurat ± 1 menit ⏳
- [ ] Saat ON_TRIP: waktu sholat berdasarkan kota itinerary (Makkah/Madinah), bukan GPS ⏳ S17-05
- [ ] Kiblat bekerja di dalam ruangan (compass) ⏳
- [ ] Al-Quran Juz 30 bisa dibaca tanpa internet ⏳ S18-06
- [ ] Zikir counter tersimpan ke DB dan sync lintas device ⏳

**Integrasi Data** *(Sprint 17)*
- [ ] Itinerary hari ini tampil dengan data dari `departure_itineraries` table ⏳ S17-02
- [ ] Item itinerary yang sedang berjalan di-highlight otomatis ⏳ S17-02
- [ ] Kontak darurat (TL + Muthawif) diambil live dari `departures` table ⏳ S17-03
- [ ] Hotel hari ini (Makkah vs Madinah) muncul sesuai hari ke-N ⏳ S17-04

**Real-time** *(Sprint 17 + 19)*
- [ ] Broadcast TL diterima oleh jamaah dalam < 3 detik ⏳ S19-04
- [ ] SOS alert muncul di dashboard TL/Muthawif dalam < 3 detik ⏳ S19-03
- [ ] Update itinerary oleh TL langsung refresh di HP jamaah ⏳ S17-07

**Offline** *(Sprint 17-18)*
- [ ] Semua fitur ibadah (sholat, kiblat, quran, doa, zikir) jalan offline ⏳
- [ ] Itinerary tersedia offline (cached saat terakhir online) ⏳ S17-08
- [ ] Rombongan info tersedia offline ⏳ S17-08

**Performa** *(Sprint 20)*
- [ ] First Contentful Paint (FCP) < 1.5 detik (WiFi) ⏳
- [ ] FCP < 3 detik (3G, simulasi kondisi Tanah Suci) ⏳
- [ ] Ukuran bundle tidak naik > 200kb vs sebelumnya ⏳

### Ringkasan Progress

| Sprint | Status | Selesai | Total |
|--------|--------|---------|-------|
| S16 — Fondasi Role-Based Portal | ✅ SELESAI | 10/10 | 10 |
| S17 — Fitur Kritis ON_TRIP | 🔄 IN PROGRESS | 5/10 | 10 |
| S18 — Ibadah Harian OFF_TRIP | 📋 BERIKUTNYA | 2/8 | 8 |
| S19 — Muthawif & TL Terintegrasi | ⚡ DIMAJUKAN | 3/7 | 7 |
| S20 — Polish & Pengujian | 📋 BELUM | 0/6 | 6 |

---

*Dokumen ini adalah living document. Perbarui setiap sprint selesai.*
*Last updated: Mei 2025 · Engineer wajib baca sebelum mulai implementasi.*
