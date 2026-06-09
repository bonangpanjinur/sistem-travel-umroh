---
name: Portal Jamaah Route Architecture
description: Aturan routing portal jamaah — semua menu/link harus prefix /jamaah/, tidak boleh link ke halaman website utama
---

## Aturan Utama
Semua link internal di dalam portal jamaah WAJIB pakai prefix `/jamaah/`. Dilarang link ke halaman website dari dalam portal.

## Pemetaan Route (lama → baru)
| Route Lama | Route Baru | Halaman |
|---|---|---|
| `/my-bookings` | `/jamaah/booking` | JamaahBookingList.tsx |
| `/my-bookings/:id` | (belum) | phase 2 |
| `/packages` | `/jamaah/paket` | JamaahKatalogPaket.tsx |
| `/packages/:slug` | `/jamaah/paket/:slug` | JamaahDetailPaket.tsx |
| `/customer/settings` | `/jamaah/profil` | JamaahProfil.tsx |

## Halaman Baru yang Dibuat
- `artifacts/umrah-haji/src/pages/jamaah/JamaahBookingList.tsx` — `/jamaah/booking`
- `artifacts/umrah-haji/src/pages/jamaah/JamaahProfil.tsx` — `/jamaah/profil`
- `artifacts/umrah-haji/src/pages/jamaah/JamaahKatalogPaket.tsx` — `/jamaah/paket`
- `artifacts/umrah-haji/src/pages/jamaah/JamaahDetailPaket.tsx` — `/jamaah/paket/:slug`

## File yang Diupdate
- `JamaahBottomNav.tsx` — DEFAULT_MOBILE_ITEMS dan sidebarGroups
- `JamaahPortal.tsx` — semua link /my-bookings, /packages, /customer/settings
- `IslamicHomeSections.tsx` — PackageSection action link
- `CustomerRoutes.tsx` — lazy imports + Route definitions

## Rencana Lengkap
Lihat `rencanaportal.md` di root project untuk sprint plan, target routes, dan panduan UI/UX.

**Why:** User mengeluhkan menu-menu di portal jamaah link ke halaman website (bukan halaman portal sendiri). Portal harus berdiri sendiri — jamaah tidak boleh "terlempar" ke website saat menggunakan portal.

**How to apply:** Setiap kali menambah link/menu baru di komponen jamaah, pastikan destination-nya adalah `/jamaah/...`, bukan `/my-bookings`, `/packages`, `/customer/settings`, dll.
