# Permission Audit — Vinstour Travel Portal
> Daftar lengkap permission yang dibutuhkan berdasarkan analisis permissions.ts dan admin-menu-registry.ts
> Format: Domain → Permission Key → Deskripsi → Role yang membutuhkan

---

## Catatan Metodologi

Permission dalam codebase menggunakan **single string key** (bukan action-based seperti `booking.create`).  
Setiap menu item di `admin-menu-registry.ts` memiliki satu `required_permission`.  
Granularitas CRUD dikontrol di level:
1. RLS PostgreSQL (row-level)
2. Express middleware (route-level)
3. UI kondisional (tombol show/hide)

**Rekomendasi:** Adopsi format `domain.action` untuk permission baru agar lebih granular.

---

## Domain: Booking

| Permission Key | Label | Role Minimum | CRUD Level |
|---|---|---|---|
| `bookings` | Akses modul booking | operator, sales, admin | R |
| `bookings.create` | Buat booking baru | operator, sales, admin, agent | C |
| `bookings.edit` | Edit booking | operator, admin | U |
| `bookings.cancel` | Batalkan booking | admin | U |
| `bookings.approve` | Konfirmasi booking | admin, operator | U |
| `bookings.export` | Export data booking | admin, finance, branch_manager | R |
| `bookings.transfer` | Transfer booking | admin | U |
| `bookings.history` | Lihat status history | semua staf | R |
| `bookings.installment` | Kelola cicilan | admin, finance | U |

---

## Domain: Payment

| Permission Key | Label | Role Minimum | CRUD Level |
|---|---|---|---|
| `payments` | Lihat pembayaran | finance, admin, operator | R |
| `payment-verification` | Verifikasi transfer | finance, admin | U |
| `payments.create` | Input bukti bayar | operator, admin, finance | C |
| `payments.reject` | Reject pembayaran | finance, admin | U |
| `refunds` | Monitor refund | finance, owner | R |
| `payments.refund` | Proses refund | finance | U |
| `payments.export` | Export laporan bayar | finance, admin | R |
| `bank-accounts` | Kelola rekening bank | admin, finance | CRUD |
| `virtual-account` | Virtual Account | finance, admin | CRUD |
| `cicilan-reminder` | Reminder Cicilan | finance, admin | R |
| `cicilan-generator` | Generator Cicilan | finance, admin | C |
| `wa-blast-tagihan` | WA Blast Tagihan | finance, admin | C |

---

## Domain: Customer / Jamaah

| Permission Key | Label | Role Minimum | CRUD Level |
|---|---|---|---|
| `customers` | Data jamaah | operator, sales, admin | R |
| `customers.create` | Tambah jamaah | operator, sales, admin, agent | C |
| `customers.edit` | Edit jamaah | operator, admin | U |
| `customers.delete` | Hapus jamaah | super_admin, owner | D |
| `document-verification` | Verifikasi dokumen | admin, operational | U |
| `document-types` | Jenis dokumen | admin, it | CRUD |
| `document-expiry-tracker` | Tracker expiry dok | admin, operational | R |
| `visa` | Visa processing | admin, operational | CRUD |
| `visa-notifications` | Notifikasi visa | admin | U |
| `visa-status-logs` | Log status visa | admin, finance | R |
| `loyalty` | Program Loyalitas | admin, marketing | CRUD |

---

## Domain: Package

| Permission Key | Label | Role Minimum | CRUD Level |
|---|---|---|---|
| `packages` | Paket umroh & haji | sales, admin, marketing | R |
| `packages.create` | Buat paket baru | admin | C |
| `packages.edit` | Edit paket | admin, marketing | U |
| `packages.publish` | Publish/unpublish | admin, marketing | U |
| `packages.delete` | Hapus paket | super_admin, owner | D |
| `package-types` | Tipe paket | admin, it | CRUD |
| `itinerary-templates` | Template itinerary | admin, operational | CRUD |

---

## Domain: Departure / Keberangkatan

| Permission Key | Label | Role Minimum | CRUD Level |
|---|---|---|---|
| `departures` | Jadwal keberangkatan | operational, admin | R |
| `departures.create` | Buat keberangkatan | admin, operational | C |
| `departures.edit` | Edit keberangkatan | admin, operational | U |
| `departures.cancel` | Batalkan keberangkatan | admin | U |
| `departures.manage` | Operasional departure | operational | U |
| `room-assignments` | Kamar & Rooming | admin, operational | CRUD |
| `manifest-jamaah` | Manifest Jamaah | admin, operational | CRUD |
| `haji` | Manajemen Haji | admin, operational | CRUD |
| `manasik` | Manasik | admin, operational | CRUD |
| `absensi-digital` | Absensi Digital | operational | CRUD |
| `departure-tracking` | Tracking Real-time | operational, admin | R |
| `sos-alerts` | Monitor SOS | operational, admin | R+U |
| `muthawif-sos` | SOS Muthawif | operational | C |
| `lapangan` | Monitor Lapangan | operational | R |
| `wa-blast-keberangkatan` | WA Blast Keberangkatan | operational, admin | C |
| `departure-budget` | Budget vs Realisasi | finance, admin | CRUD |
| `siskohat` | SISKOHAT Kemenag | admin, operational | R |
| `siskohat-export` | Export SISKOHAT | admin | C |
| `baggage-calculator` | Kalkulator Bagasi | operational, admin | R |

---

## Domain: Finance / Keuangan

| Permission Key | Label | Role Minimum | CRUD Level |
|---|---|---|---|
| `finance` | Laporan P&L | finance, owner | R |
| `finance-terpadu` | Dashboard Keuangan | finance, admin | R |
| `finance-cash` | Kas & Bank | finance, admin | CRUD |
| `finance-ar` | Piutang (AR) | finance | R |
| `finance-ap` | Hutang (AP) | finance | R |
| `finance.approve_payment` | Approve pembayaran | finance, admin | U |
| `finance.journal_post` | Post jurnal | finance | U |
| `savings` | Program Tabungan | finance, admin, operator | CRUD |
| `coa` | Chart of Accounts | finance | CRUD |
| `exchange-rates` | Kurs Mata Uang | finance, admin | CRUD |

---

## Domain: Akuntansi (Double-Entry)

| Permission Key | Label | Role Minimum | CRUD Level |
|---|---|---|---|
| `jurnal-umum` | K-01 Jurnal Umum | finance | CRUD |
| `buku-besar` | K-02 Buku Besar | finance, owner | R |
| `neraca-saldo` | K-03 Neraca Saldo | finance, owner | R |
| `laba-rugi` | K-04 Laba Rugi | finance, owner | R |
| `neraca` | K-05 Neraca | finance, owner | R |
| `arus-kas` | K-06 Arus Kas | finance, owner | R |
| `budget` | K-11 Anggaran & Budget | finance, admin | CRUD |
| `rekonsiliasi` | K-12 Rekonsiliasi Bank | finance | CRUD |
| `laporan-pajak` | K-13 Laporan Pajak | finance, owner | R |

---

## Domain: Agent Network

| Permission Key | Label | Role Minimum | CRUD Level |
|---|---|---|---|
| `agents` | Data Agen | admin, sales | R |
| `agents.create` | Tambah Agen | admin, sales | C |
| `agents.edit` | Edit Agen | admin, sales | U |
| `agents.commission` | Kelola Komisi Agen | finance, admin | U |
| `memberships` | Keanggotaan Agen | admin | CRUD |
| `branch-commissions` | Komisi Cabang | finance, branch_manager | R |
| `agent-commission-report` | Laporan Komisi Agen | admin, finance | R |
| `master-komisi` | Master Laporan Komisi | finance, owner | R |
| `agent-network` | Sub-Agen Multi-Level | admin | CRUD |
| `agent-override-commissions` | Override Komisi | finance | U |
| `agent-training` | Pelatihan Agen | admin, operational | CRUD |
| `referrals` | Referral | admin, marketing | CRUD |

---

## Domain: Branch / Cabang

| Permission Key | Label | Role Minimum | CRUD Level |
|---|---|---|---|
| `branches` | Data Cabang | admin, sales | R |
| `branches.create` | Tambah Cabang | super_admin, owner | C |
| `branches.edit` | Edit Cabang | super_admin, owner | U |
| `branch-comparison` | Perbandingan Cabang | owner, finance | R |
| `laporan-keuangan` | Laporan Keuangan | finance, owner | R |
| `laporan-keberangkatan` | Laporan Keberangkatan | admin, operational | R |
| `laporan-agen` | Performa Agen | admin, finance | R |

---

## Domain: HR / SDM

| Permission Key | Label | Role Minimum | CRUD Level |
|---|---|---|---|
| `hr` | SDM / HR | admin, branch_manager | R |
| `payroll` | Payroll | finance | CRUD |
| `payroll.manage` | Finalize Payroll | finance | U |
| `surat-peringatan` | Surat Peringatan | admin, branch_manager | CRUD |
| `leave.approve` | Approve Cuti | admin, branch_manager | U |

---

## Domain: Equipment / Perlengkapan

| Permission Key | Label | Role Minimum | CRUD Level |
|---|---|---|---|
| `equipment` | Perlengkapan | equipment, operational | R |
| `equipment.manage` | Kelola Inventaris | equipment | CRUD |
| `equipment.distribute` | Distribusi | equipment, operational | C |
| `equipment-master` | Master Perlengkapan | admin, equipment | CRUD |
| `equipment-settings` | Setting Perlengkapan | admin | CRUD |
| `stock-opname` | Stock Opname | equipment | CRUD |

---

## Domain: Marketing & CRM

| Permission Key | Label | Role Minimum | CRUD Level |
|---|---|---|---|
| `leads` | Leads & Prospek | sales, admin, operator | R |
| `leads.manage` | Kelola Lead | sales, marketing | U |
| `chat-leads` | Leads Chat Widget | sales, admin | R |
| `marketing-materials` | Materi Marketing | marketing, admin | CRUD |
| `landing-pages` | Landing Page | marketing, it | CRUD |
| `coupons` | Kupon & Promo | admin, marketing | CRUD |

---

## Domain: Website CMS

| Permission Key | Label | Role Minimum | CRUD Level |
|---|---|---|---|
| `announcements` | Pengumuman | admin, marketing | CRUD |
| `banners` | Banner Carousel | admin, marketing | CRUD |
| `blog` | Blog & Artikel | marketing, admin | CRUD |
| `faq-manager` | FAQ Manager | marketing, admin | CRUD |
| `settings` | Pengaturan Umum | it, super_admin | CRUD |
| `appearance` | Appearance & Branding | it, admin | CRUD |
| `pwa-settings` | PWA Settings | it | CRUD |
| `offline-content` | Konten Offline | admin, operational | CRUD |

---

## Domain: Komunikasi / WhatsApp

| Permission Key | Label | Role Minimum | CRUD Level |
|---|---|---|---|
| `whatsapp` | WhatsApp Blast | marketing, admin | C |
| `wa-otomatis` | WA Otomatis | admin | CRUD |
| `wa-broadcast` | Broadcast Tersegmentasi | marketing, admin | C |
| `wa-provider` | Konfigurasi Provider WA | it, admin | CRUD |
| `wa-chatbot` | Chatbot Auto-Reply | it, admin | CRUD |
| `wa-inbox` | Inbox WA | admin, sales | R |
| `wa-contacts` | Kontak WA | admin, marketing | R |
| `wa-bot-menu` | Bot Menu Interaktif | it, admin | CRUD |
| `wa-template-broadcast` | Broadcast Template WABA | admin, marketing | C |
| `wa-scheduled-broadcast` | Broadcast Terjadwal | marketing, admin | CRUD |
| `email-templates` | Template Email | admin, marketing | CRUD |
| `push-notifications` | Push Notifikasi | admin | CRUD |
| `pembayaran-reminder` | Reminder Pembayaran | finance, admin | C |

---

## Domain: AI & Analytics

| Permission Key | Label | Role Minimum | CRUD Level |
|---|---|---|---|
| `analytics` | Analytics | admin, owner | R |
| `kpi-dashboard` | KPI Real-time | admin, owner, branch_manager | R |
| `ai-summary` | Ringkasan AI | admin, owner | R |
| `gemini-ai` | Gemini AI Chatbot | admin, it | CRUD |
| `sentimen-feedback` | Analisis Sentimen | marketing, admin | R |
| `prediksi-seat` | Prediksi Seat | admin, operational | R |
| `smart-notif` | Smart Notifikasi | admin | CRUD |
| `rekomendasi-paket` | Rekomendasi Paket AI | admin, marketing | R |

---

## Domain: Dokumen & Legalitas

| Permission Key | Label | Role Minimum | CRUD Level |
|---|---|---|---|
| `documents-generator` | Generator Surat | admin | C |
| `proposal-generator` | Generator Proposal | admin, sales | C |
| `support` | Tiket Support | admin, operator | CRUD |
| `cancellation-policies` | Aturan Pembatalan | admin | CRUD |
| `office-assets` | Aset Kantor | admin, finance | CRUD |
| `media-gallery` | Media Gallery | admin, operational | CRUD |
| `vendor-contracts` | Kontrak Vendor | finance, admin | CRUD |

---

## Domain: Sistem & Keamanan

| Permission Key | Label | Role Minimum | CRUD Level |
|---|---|---|---|
| `users` | Kelola User | it, super_admin | CRUD |
| `roles` | Kelola Role | it, super_admin | CRUD |
| `rbac-tools` | RBAC Management | it, super_admin | CRUD |
| `rbac-status` | RBAC Status | it, super_admin | R |
| `dashboard-access` | Dashboard Config | it | CRUD |
| `security-audit` | Security Audit | super_admin, it | R |
| `2fa` | Keamanan & 2FA | semua (own) | CRUD |
| `activity-log` | Activity Log | it, super_admin | R |
| `api-connect` | API Connect | it | CRUD |
| `webhooks` | Webhooks | it | CRUD |
| `midtrans` | Midtrans Config | it, finance | CRUD |
| `xendit` | Xendit Config | it, finance | CRUD |
| `supabase-setup` | Supabase Setup | it | R |
| `approvals` | Approval Workflow | admin | CRUD |
| `approval-configs` | Konfigurasi Approval | admin, it | CRUD |

---

## Domain: Laporan

| Permission Key | Label | Role Minimum | CRUD Level |
|---|---|---|---|
| `reports` | Laporan Detail | admin, finance | R |
| `advanced-reports` | Laporan Lanjutan | admin, finance, owner | R |
| `scheduled-reports` | Laporan Terjadwal | admin, finance | CRUD |
| `monitoring-tabungan` | Monitoring Tabungan | finance, admin | R |
| `laporan-reminder` | Laporan Reminder | finance, admin | R |

---

## Domain: E-Commerce / Toko

| Permission Key | Label | Role Minimum | CRUD Level |
|---|---|---|---|
| `store` | Dashboard Toko | admin | R |
| `store-products` | Produk Toko | admin | CRUD |
| `store-orders` | Order Toko | admin, operator | R+U |
| `store-categories` | Kategori Toko | admin | CRUD |
| `store-suppliers` | Supplier Toko | admin, finance | CRUD |
| `store-purchase-orders` | Purchase Order | admin, finance | CRUD |
| `store-sales-report` | Laporan Penjualan | admin, finance | R |
| `store-stock-movements` | Stok & Opname | admin, equipment | CRUD |

---

## Ringkasan: Total Permission

| Domain | Jumlah Permission |
|--------|------------------|
| Booking | 9 |
| Payment | 12 |
| Customer/Jamaah | 11 |
| Package | 7 |
| Departure | 17 |
| Finance | 11 |
| Akuntansi | 9 |
| Agent Network | 12 |
| Branch | 6 |
| HR/SDM | 5 |
| Equipment | 6 |
| Marketing/CRM | 7 |
| Website CMS | 8 |
| Komunikasi/WA | 14 |
| AI & Analytics | 9 |
| Dokumen & Legalitas | 7 |
| Sistem & Keamanan | 14 |
| Laporan | 5 |
| E-Commerce | 8 |
| **TOTAL** | **~176** |

---

## Rekomendasi Standarisasi

### Masalah: Permission keys saat ini tidak konsisten
```
# Saat ini (tidak konsisten):
'bookings'          ← string tunggal
'payment-verification' ← dengan dash
'sos-alerts'        ← dengan dash

# Rekomendasi format baru:
'booking.view'      ← domain.action
'payment.verify'    ← domain.action
'sos.view'          ← domain.action
```

### Solusi jangka pendek:
Pertahankan permission keys lama untuk backward compatibility, tapi tambahkan mapping di `permissions.ts`:
```typescript
export const PERMISSION_ACTIONS = {
  'bookings': { domain: 'booking', actions: ['view','list','export'] },
  'bookings.create': { domain: 'booking', actions: ['create'] },
  'payment-verification': { domain: 'payment', actions: ['verify','reject'] },
}
```
