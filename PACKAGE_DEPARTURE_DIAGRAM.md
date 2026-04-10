# Diagram Relasi Paket-Keberangkatan

## 1. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    PACKAGES ||--o{ DEPARTURES : has
    PACKAGES {
        uuid id PK
        string code UK
        string name
        string package_type
        text description
        integer duration_days
        uuid hotel_makkah_id FK
        uuid hotel_madinah_id FK
        uuid airline_id FK
        uuid muthawif_id FK
        text[] includes
        text[] excludes
        jsonb itinerary
        decimal price_quad "DEFAULT 0"
        decimal price_triple "DEFAULT 0"
        decimal price_double "DEFAULT 0"
        decimal price_single "DEFAULT 0"
        string currency "DEFAULT IDR"
        text featured_image
        text[] gallery
        boolean is_featured "DEFAULT false"
        boolean is_active "DEFAULT true"
        timestamp created_at
        timestamp updated_at
    }
    DEPARTURES {
        uuid id PK
        uuid package_id FK "ON DELETE CASCADE"
        date departure_date
        date return_date
        integer quota "DEFAULT 45"
        integer booked_count "DEFAULT 0"
        uuid departure_airport_id FK
        uuid arrival_airport_id FK
        string flight_number
        time departure_time
        uuid airline_id FK
        uuid hotel_makkah_id FK
        uuid hotel_madinah_id FK
        decimal price_quad "DEFAULT 0"
        decimal price_triple "DEFAULT 0"
        decimal price_double "DEFAULT 0"
        decimal price_single "DEFAULT 0"
        string status "DEFAULT open"
        timestamp created_at
        timestamp updated_at
    }
```

## 2. Alur Penetapan Harga

```mermaid
graph TD
    A["Pengguna Membuka Halaman Paket"] --> B["Sistem Menampilkan Daftar Keberangkatan"]
    B --> C["Pengguna Memilih Tanggal Keberangkatan"]
    C --> D{"Apakah harga keberangkatan > 0?"}
    D -->|Ya| E["Gunakan Harga Keberangkatan"]
    D -->|Tidak| F["Gunakan Harga Paket Default"]
    E --> G["Tampilkan Harga ke Pengguna"]
    F --> G
    G --> H["Pengguna Memilih Tipe Kamar"]
    H --> I["Hitung Total Biaya"]
    I --> J["Tampilkan Ringkasan Pemesanan"]
```

## 3. Struktur Data Harga

```
┌─────────────────────────────────────────────────────┐
│                    PACKAGES TABLE                   │
├─────────────────────────────────────────────────────┤
│ id: UUID                                            │
│ name: "Umroh Plus"                                  │
│ price_quad: 25,000,000 IDR    ← Harga Default      │
│ price_triple: 22,000,000 IDR                        │
│ price_double: 20,000,000 IDR                        │
│ price_single: 28,000,000 IDR                        │
└─────────────────────────────────────────────────────┘
                        │
                        │ 1:N Relationship
                        │
        ┌───────────────┴───────────────┐
        │                               │
┌───────▼──────────────┐    ┌──────────▼──────────────┐
│  DEPARTURES #1       │    │  DEPARTURES #2          │
├──────────────────────┤    ├─────────────────────────┤
│ departure_date: 15-5 │    │ departure_date: 20-5    │
│ price_quad: 26M ✓    │    │ price_quad: 0 (kosong)  │
│ price_triple: 23M ✓  │    │ price_triple: 0         │
│ price_double: 21M ✓  │    │ price_double: 0         │
│ price_single: 29M ✓  │    │ price_single: 0         │
├──────────────────────┤    ├─────────────────────────┤
│ Harga Spesifik       │    │ Fallback ke Paket       │
│ (Prioritas Tinggi)   │    │ (Harga TBA)             │
└──────────────────────┘    └─────────────────────────┘
```

## 4. Alur Booking Lengkap

```mermaid
sequenceDiagram
    participant User as Pengguna
    participant UI as Frontend UI
    participant API as Supabase API
    participant DB as Database

    User->>UI: Buka halaman paket
    UI->>API: Fetch departures dengan harga
    API->>DB: SELECT * FROM departures WHERE package_id = ?
    DB-->>API: Return departures data
    API-->>UI: Render daftar keberangkatan

    User->>UI: Pilih keberangkatan (15 Mei)
    UI->>UI: Ambil harga dari departure data
    UI->>UI: Hitung total biaya berdasarkan kamar
    UI-->>User: Tampilkan harga dan ringkasan

    User->>UI: Klik "Pesan Sekarang"
    UI->>API: POST /booking dengan departure_id
    API->>DB: INSERT INTO bookings
    DB-->>API: Booking created
    API-->>UI: Redirect ke booking wizard

    User->>UI: Lanjutkan booking wizard
    UI->>API: Fetch departure info untuk review
    API->>DB: SELECT * FROM departures WHERE id = ?
    DB-->>API: Return departure dengan harga
    API-->>UI: Tampilkan review dengan harga final
    UI-->>User: Tampilkan total biaya final
```

## 5. Hirarki Penetapan Harga

```
┌──────────────────────────────────────────────────────────┐
│                  PRICING HIERARCHY                       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Level 1 (Tertinggi): Harga Keberangkatan               │
│  ├─ Sumber: departures.price_quad/triple/double/single │
│  ├─ Kondisi: Digunakan jika > 0                         │
│  ├─ Prioritas: TERTINGGI                                │
│  └─ Contoh: 26,000,000 IDR (musim ramai)                │
│                                                          │
│  Level 2: Harga Paket Default                           │
│  ├─ Sumber: packages.price_quad/triple/double/single    │
│  ├─ Kondisi: Digunakan jika harga keberangkatan = 0     │
│  ├─ Prioritas: FALLBACK                                 │
│  └─ Contoh: 25,000,000 IDR (harga standar)              │
│                                                          │
│  Level 3: Harga TBA (To Be Announced)                   │
│  ├─ Sumber: Tidak ada harga tersedia                    │
│  ├─ Kondisi: Keberangkatan baru tanpa harga             │
│  ├─ Prioritas: TERENDAH                                 │
│  └─ Contoh: Badge "Harga TBA" ditampilkan               │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## 6. Alur Admin Update Harga

```mermaid
graph LR
    A["Admin Buka Form"] --> B{"Pilih Tipe Update"}
    B -->|Update Paket| C["Edit Package Form"]
    B -->|Update Keberangkatan| D["Edit Departure Form"]
    
    C --> C1["Update price_quad"]
    C --> C2["Update price_triple"]
    C --> C3["Update price_double"]
    C --> C4["Update price_single"]
    
    D --> D1["Update price_quad"]
    D --> D2["Update price_triple"]
    D --> D3["Update price_double"]
    D --> D4["Update price_single"]
    
    C1 --> E["Save ke packages table"]
    C2 --> E
    C3 --> E
    C4 --> E
    
    D1 --> F["Save ke departures table"]
    D2 --> F
    D3 --> F
    D4 --> F
    
    E --> G["Invalidate React Query Cache"]
    F --> G
    
    G --> H["Pengguna Melihat Harga Baru"]
```

## 7. Validasi Data

```
┌─────────────────────────────────────────────────────┐
│              VALIDATION RULES                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 1. Harga Keberangkatan                              │
│    ├─ price_quad >= 0                              │
│    ├─ price_triple >= 0                            │
│    ├─ price_double >= 0                            │
│    └─ price_single >= 0                            │
│                                                     │
│ 2. Tanggal Keberangkatan                            │
│    ├─ departure_date < return_date                 │
│    ├─ departure_date >= TODAY                      │
│    └─ return_date >= TODAY                         │
│                                                     │
│ 3. Kuota Keberangkatan                              │
│    ├─ quota > 0                                    │
│    ├─ booked_count <= quota                        │
│    └─ booked_count >= 0                            │
│                                                     │
│ 4. Status Keberangkatan                             │
│    ├─ status IN ('open', 'closed', 'departed',     │
│    │             'completed')                      │
│    └─ Hanya keberangkatan 'open' dapat dipesan     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 8. Query Pattern

```sql
-- Pattern 1: Ambil keberangkatan dengan harga (fallback)
SELECT 
  d.id,
  d.departure_date,
  d.return_date,
  COALESCE(d.price_quad, p.price_quad) as price_quad,
  COALESCE(d.price_triple, p.price_triple) as price_triple,
  COALESCE(d.price_double, p.price_double) as price_double,
  COALESCE(d.price_single, p.price_single) as price_single
FROM departures d
JOIN packages p ON d.package_id = p.id
WHERE d.package_id = $1
  AND d.status = 'open'
  AND d.departure_date >= CURRENT_DATE
ORDER BY d.departure_date ASC;

-- Pattern 2: Ambil keberangkatan dengan harga spesifik saja
SELECT 
  d.id,
  d.departure_date,
  d.price_quad,
  d.price_triple,
  d.price_double,
  d.price_single
FROM departures d
WHERE d.package_id = $1
  AND d.price_quad > 0
  AND d.status = 'open'
ORDER BY d.departure_date ASC;

-- Pattern 3: Identifikasi keberangkatan tanpa harga (TBA)
SELECT 
  d.id,
  d.departure_date,
  p.name as package_name
FROM departures d
JOIN packages p ON d.package_id = p.id
WHERE d.price_quad = 0
  AND d.price_triple = 0
  AND d.price_double = 0
  AND d.price_single = 0
  AND d.status = 'open'
ORDER BY d.departure_date ASC;
```

## 9. State Management (React)

```typescript
// Component State
interface BookingState {
  selectedPackageId: string;
  selectedDepartureId: string;
  selectedDeparture: {
    id: string;
    departure_date: string;
    price_quad: number;
    price_triple: number;
    price_double: number;
    price_single: number;
  };
  roomAllocation: {
    quad: number;
    triple: number;
    double: number;
    single: number;
  };
  prices: {
    quad: number;
    triple: number;
    double: number;
    single: number;
  };
  totalPassengers: number;
  totalPrice: number;
}

// Computed Values
const prices = useMemo(() => {
  if (!selectedDeparture) return { quad: 0, triple: 0, double: 0, single: 0 };
  return {
    quad: selectedDeparture.price_quad || 0,
    triple: selectedDeparture.price_triple || 0,
    double: selectedDeparture.price_double || 0,
    single: selectedDeparture.price_single || 0,
  };
}, [selectedDeparture]);

const totalPrice = useMemo(() => {
  return (roomAllocation.quad * prices.quad) +
         (roomAllocation.triple * prices.triple) +
         (roomAllocation.double * prices.double) +
         (roomAllocation.single * prices.single);
}, [roomAllocation, prices]);
```

## 10. Error Handling

```mermaid
graph TD
    A["Fetch Departures"] --> B{"Ada Error?"}
    B -->|Ya| C["Log Error"]
    C --> D["Tampilkan Error Message"]
    D --> E["Retry atau Fallback"]
    B -->|Tidak| F["Render Departures"]
    
    F --> G["User Pilih Departure"] --> H{"Ada Harga?"}
    H -->|Ya| I["Tampilkan Harga Spesifik"]
    H -->|Tidak| J["Tampilkan Harga Paket"]
    J --> K["Tampilkan Badge TBA"]
    
    I --> L["User Lanjut ke Booking"]
    K --> L
    
    L --> M{"Booking Valid?"}
    M -->|Ya| N["Proses Booking"]
    M -->|Tidak| O["Tampilkan Validation Error"]
    O --> P["User Perbaiki Input"]
```

