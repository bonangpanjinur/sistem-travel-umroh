# Database Usage Report — Vinstour Travel Portal
> Analisis seluruh `supabase.from()`, `rpc()`, dan `storage.from()` di codebase
> Source: `artifacts/umrah-haji/src/` (frontend) | `artifacts/api-server/src/` (API via Drizzle ORM)

---

## Supabase Table Operations (`supabase.from()`)

### agents
| File | CRUD |
|------|------|
| `hooks/useAgents.ts` | SELECT (list + filter by branch) |
| `pages/admin/AdminAgents.tsx` | SELECT, INSERT, UPDATE |
| `pages/admin/AdminLaporanAgen.tsx` | SELECT (laporan komisi) |

### agent_commissions
| File | CRUD |
|------|------|
| `hooks/useAgents.ts` | SELECT |
| `pages/admin/AdminLaporanAgen.tsx` | SELECT |

### agent_wallets
| File | CRUD |
|------|------|
| `hooks/useAgents.ts` | SELECT (saldo) |

### airlines
| File | CRUD |
|------|------|
| `components/admin/forms/DepartureForm.tsx` | SELECT (dropdown) |
| `components/admin/forms/AirlineForm.tsx` | INSERT, UPDATE |

### airports
| File | CRUD |
|------|------|
| `components/admin/forms/DepartureForm.tsx` | SELECT (dropdown embarkasi) |
| `components/admin/forms/AirportForm.tsx` | INSERT, UPDATE |

### announcements
| File | CRUD |
|------|------|
| Public website homepage | SELECT (is_active filter) |

### approval_requests
| File | CRUD |
|------|------|
| `hooks/useApprovalWorkflow.ts` | INSERT |

### approval_actions
| File | CRUD |
|------|------|
| `hooks/useApprovalWorkflow.ts` | INSERT |

### audit_logs
| File | CRUD |
|------|------|
| `pages/admin/AdminSecurityAudit.tsx` | SELECT |

### bank_accounts
| File | CRUD |
|------|------|
| `pages/admin/AdminSavingsPlans.tsx` | SELECT |

### banners
| File | CRUD |
|------|------|
| Public website homepage | SELECT (is_active, order) |

### bookings
| File | CRUD |
|------|------|
| `pages/admin/AdminBookings.tsx` | SELECT (paginated, filter) |
| `pages/admin/AdminLeadDetail.tsx` | SELECT (by customer) |
| `pages/admin/AdminFinanceAR.tsx` | SELECT (AR/piutang) |
| `pages/admin/AdminKPIDashboard.tsx` | SELECT (stats) |
| Public website | SELECT (total_pax for seat counter) |

### booking_passengers
| File | CRUD |
|------|------|
| `hooks/useBookingWizardDynamic.ts` | UPDATE (data jamaah) |
| `pages/admin/AdminSavingsPlans.tsx` | INSERT |

### branches
| File | CRUD |
|------|------|
| `components/admin/forms/BranchForm.tsx` | SELECT, INSERT, UPDATE |

### company_settings
| File | CRUD |
|------|------|
| `pages/jamaah/JamaahKontrak.tsx` | SELECT (konten kontrak) |

### coupons
| File | CRUD |
|------|------|
| `components/admin/forms/CouponForm.tsx` | INSERT, UPDATE |

### customers
| File | CRUD |
|------|------|
| `pages/jamaah/ibadah/JamaahManasik.tsx` | SELECT (data diri) |
| `pages/jamaah/JamaahSignaturePage.tsx` | SELECT |
| `pages/jamaah/JamaahProfil.tsx` | UPDATE (profil jamaah) |

### departures
| File | CRUD |
|------|------|
| `components/admin/forms/DepartureForm.tsx` | INSERT, UPDATE |
| Public website | SELECT (list, filter aktif) |

### email_templates
| File | CRUD |
|------|------|
| `pages/admin/AdminEmailTemplates.tsx` | SELECT, INSERT, UPDATE, DELETE |

### equipment_items
| File | CRUD |
|------|------|
| `features/equipment/queries.ts` | DELETE |
| `pages/operational/EquipmentPage.tsx` | SELECT, INSERT, UPDATE |

### faqs
| File | CRUD |
|------|------|
| `pages/admin/AdminFAQManager.tsx` | SELECT, INSERT, UPDATE, DELETE |
| Public website | SELECT (is_published) |

### hotels
| File | CRUD |
|------|------|
| `pages/admin/AdminHotels.tsx` | SELECT, DELETE |
| `components/admin/forms/HotelForm.tsx` | INSERT, UPDATE |

### jamaah_badges
| File | CRUD |
|------|------|
| `pages/jamaah/JamaahBadges.tsx` | INSERT (unlock badge) |

### jamaah_ibadah_targets
| File | CRUD |
|------|------|
| `hooks/useIbadahProgress.ts` | INSERT, DELETE |

### leads
| File | CRUD |
|------|------|
| `pages/admin/AdminLeadDetail.tsx` | SELECT |

### packages
| File | CRUD |
|------|------|
| Public website | SELECT (list, featured, detail) |
| `pages/admin/AdminPackages.tsx` | SELECT, INSERT, UPDATE, DELETE |

### payments
| File | CRUD |
|------|------|
| `hooks/useBookingWizardDynamic.ts` | INSERT (bukti transfer) |
| `pages/admin/AdminFinanceAR.tsx` | SELECT |

### profiles
| File | CRUD |
|------|------|
| `hooks/useAuth.tsx` | SELECT (session user) |

### savings_plans
| File | CRUD |
|------|------|
| `pages/admin/AdminSavingsPlans.tsx` | SELECT, INSERT, UPDATE |

### savings_payments (= savings_deposits)
| File | CRUD |
|------|------|
| `pages/admin/AdminSavingsPlans.tsx` | SELECT, INSERT |

### testimonials
| File | CRUD |
|------|------|
| `pages/admin/AdminSentimenFeedback.tsx` | SELECT |
| Public website | SELECT (is_featured, is_published) |

### vendor_costs
| File | CRUD |
|------|------|
| `pages/admin/AdminFinanceAP.tsx` | SELECT |

### website_settings
| File | CRUD |
|------|------|
| Public website (layout) | SELECT (id = 00000...) |

### whatsapp_config
| File | CRUD |
|------|------|
| `pages/admin/AdminWhatsapp.tsx` | SELECT, UPDATE |

---

## RPC Calls (`supabase.rpc()`)

| Fungsi | File | Keterangan |
|--------|------|------------|
| `generate_booking_code` | `hooks/useBookingWizardDynamic.ts` | Generate kode booking unik |
| `generate_payment_code` | `hooks/useBookingWizardDynamic.ts` | Generate kode pembayaran |
| `validate_registration_context` | `hooks/useBookingWizardDynamic.ts` | Validasi context pendaftaran |
| `convert_savings_to_booking` | `components/savings/SavingsConvertDialog.tsx` | Konversi tabungan → booking |
| `recalculate_departure_financial_summary` | `components/admin/financial/PackageFinancialSummaryCard.tsx` | Recalculate profit/loss departure |
| `bulk_distribute_equipment` | `pages/operational/EquipmentPage.tsx` | Distribusi massal perlengkapan |
| `increment_package_view_count` | `pages/packages/PackageDetail.tsx` | Increment view count paket |
| `generate_savings_payment_code` | `pages/savings/SavingsDashboard.tsx` | Generate kode setoran tabungan |
| `create_customer_account` | `hooks/useCustomerAccount.ts` | Buat akun portal jamaah |
| `list_users_with_emails` | `pages/branch/BranchStaff.tsx` | List user dengan email (admin only) |
| `confirm_equipment_receipt` | `pages/operational/EquipmentPage.tsx` | Konfirmasi terima perlengkapan |
| `bulk_distribute_equipment` | `pages/operational/EquipmentPage.tsx` | Distribusi bulk |
| `validate_registration_context` | hooks | Validasi |

---

## Storage Buckets (`supabase.storage.from()`)

| Bucket | File | Operasi |
|--------|------|---------|
| `agent-ktp` | `pages/public/DaftarSubAgen.tsx` | `getPublicUrl` |
| `customer-documents` | `pages/jamaah/JamaahProfil.tsx` | `getPublicUrl` |
| `customer-documents` | `pages/agent/AgentDocuments.tsx` | `upload`, `createSignedUrl` |
| `trip-photos` | `pages/jamaah/JamaahGaleri.tsx` | `remove`, `getPublicUrl` |
| `trip-photos` | `components/admin/PackageGalleryCard.tsx` | `remove` |
| `payment-proofs` | `pages/customer/StoreOrderDetail.tsx` | `getPublicUrl` |
| `payment-proofs` | `pages/customer/MySavings.tsx` | `getPublicUrl` |
| `equipment-photos` | `components/operational/equipment/ReturnTab.tsx` | `upload` |
| `website-assets` | `pages/admin/AdminPDFLayout.tsx` | `getPublicUrl` |

---

## API Server (Drizzle ORM)

API server di `artifacts/api-server/src/` menggunakan **Drizzle ORM** (bukan Supabase JS client) untuk operasi database melalui koneksi PostgreSQL langsung. Drizzle query dipakai untuk:

- Migration runner (`src/index.ts`) — menjalankan file SQL dari `src/sql/`
- Endpoint REST proxy ke Supabase via `supabaseProxy.ts`
- Tidak ada `supabase.from()` langsung di API server

---

## Tabel Yang TIDAK Digunakan Codebase

Berdasarkan analisis, tabel berikut **tidak ada penggunaan** di frontend maupun API:

```
wa_feature_roadmap          — internal notes, bukan fitur nyata
admin_activity_log          — duplikasi audit_logs
financial_summary           — deprecated, ganti departure_financial_summary
whatsapp_logs               — duplikasi wa_send_logs
cancellation_rule_audit_logs
document_audit_logs
siskohat_sync_logs
marketing_campaigns, marketing_conversions, marketing_metrics
loyalty_rewards, loyalty_transactions
support_tickets, chatbot_logs, chat_leads
exchange_rates, hotel_contracts, baggage_policies
guide_channels, guide_broadcasts, guide_sessions, guide_locations, guide_audio_sessions
training_quizzes, onboarding_templates, career_history, disciplinary_records
webhook_configs, webhook_logs
feedback, booking_feedback
```
