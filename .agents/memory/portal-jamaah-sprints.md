---
name: Portal Jamaah Sprint Tasks S16-S19
description: Status implementasi sprint tasks portal jamaah (JamaahPortal, views, hooks, components). Lihat rencanaportaljamaah.md untuk detail.
---

## Status Keseluruhan
Sprint 16 ✅ | Sprint 17 ✅ | Sprint 18 ✅ | Sprint 19 ✅ — semua selesai

## Komponen Yang Dibuat / Diupdate
- `src/components/jamaah/trip/HotelInfoCard.tsx` — S17-04: hotel Makkah/Madinah + bus, highlight kota aktif, bintang rating
- `src/components/jamaah/HijriDateDisplay.tsx` — S18-02: variant inline/badge/card, Intl.DateTimeFormat islamic
- `src/components/jamaah/IbadahStreakCard.tsx` — S18-04: streak 7 hari + sholat indicator harian, query ibadah_progress
- `src/components/jamaah/WeeklySholatChart.tsx` — S18-05: bar chart 7 hari sholat, warna hijau/amber/orange/abu
- `src/components/jamaah/CuacaWidget.tsx` — sudah ada, diintegrasikan ke JamaahOnTripView (S17-10)
- `src/pages/jamaah/views/MuthawifOffView.tsx` — S19-07: tampilan muthawif tanpa trip aktif
- `src/pages/jamaah/views/TourLeaderOffView.tsx` — S19-07: tampilan TL tanpa trip aktif

## Views Yang Diupdate
- `JamaahOnTripView.tsx` — S17-04 HotelInfoCard, S17-07 realtime itinerary subscribe, S17-08 useOfflineCache, S17-10 CuacaWidget
- `JamaahOffTripView.tsx` — S18-02 HijriDateDisplay, S18-03 30 DAILY_VERSES, S18-04 IbadahStreakCard, S18-05 WeeklySholatChart
- `MuthawifActiveView.tsx` — S19-03 realtime SOS subscribe via supabase channel
- `TourLeaderActiveView.tsx` — S19-04 BroadcastForm inline (toggle), S19-05 ContextualGuideCard (guide_key dari itinerary)

## JamaahPortal.tsx Routing
- Muthawif tanpa activeDeparture → MuthawifOffView
- TourLeader tanpa activeDeparture → TourLeaderOffView
- Pattern: ctx.isMuthawif && !ctx.activeDeparture → MuthawifOffView

## API Server (S18-08)
- `src/routes/push.ts` — ditambah `POST /api/push/prayer-reminder` untuk push notif sholat
- `src/routes/scheduler.ts` — ditambah job sholat_subuh/dzuhur/ashar/maghrib/isya + sholat_all

## Al-Quran (S18-06)
- `JamaahAlQuran.tsx` — SURAH_LIST diperluas ke 42+ surah termasuk semua Juz 30 (surah 78-114)
- Ditambah tab filter Semua / Juz 30 / Favorit
- Field `juz` ditambahkan ke setiap item SURAH_LIST

## useOfflineCache API
API berbasis hook: `useOfflineCache<T>(key: string, data: T | undefined): T | undefined`
Bukan object dengan getCached/setCache. Data di-persist ke localStorage dengan key prefix `offline:`.

**Why:** useOfflineCache sebelumnya di-infer salah (dikira object method), tapi sebenarnya return value langsung.
