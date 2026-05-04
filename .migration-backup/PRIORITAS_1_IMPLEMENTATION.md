# Prioritas 1 - Otomasi & Notifikasi (Dampak Tinggi)

Dokumen ini menjelaskan implementasi tiga fitur utama untuk meningkatkan efisiensi operasional dan kepuasan pengguna.

---

## 1. Progress Pembayaran untuk Agen ✅ SELESAI

### Deskripsi
Agen sekarang dapat melihat progress pembayaran per jamaah dengan visual progress bar dan status pembayaran.

### File yang Dimodifikasi/Dibuat
- **`src/pages/agent/AgentJamaahEnhanced.tsx`** (BARU)
  - Enhanced version dari AgentJamaah.tsx dengan payment tracking
  - Menampilkan payment progress bar untuk setiap jamaah
  - Menampilkan jumlah pembayaran vs total harga
  - Status pembayaran: Lunas, Sebagian, Belum Bayar, Refund

### Fitur Baru
1. **Payment Progress Bar**: Visual indicator persentase pembayaran
2. **Payment Status Badge**: Status pembayaran dengan warna berbeda
3. **Payment Summary**: Menampilkan total pembayaran dan total revenue
4. **Payment Details**: Menampilkan jumlah dibayar vs total per jamaah

### Cara Implementasi
1. Ganti import di `src/routes/AgentRoutes.tsx`:
   ```typescript
   const AgentJamaah = lazy(() => import("@/pages/agent/AgentJamaahEnhanced"));
   ```
2. Atau rename file:
   ```bash
   mv src/pages/agent/AgentJamaah.tsx src/pages/agent/AgentJamaahOld.tsx
   mv src/pages/agent/AgentJamaahEnhanced.tsx src/pages/agent/AgentJamaah.tsx
   ```

### Data yang Ditampilkan
- `total_price`: Total harga booking
- `paid_amount`: Jumlah yang sudah dibayar
- `remaining_amount`: Sisa pembayaran
- `payment_status`: Status pembayaran (pending, partial, paid, refunded)

---

## 2. Notifikasi Sistem untuk Agen ✅ SELESAI

### Deskripsi
Agen menerima notifikasi real-time untuk event penting seperti dokumen ditolak, booking berubah status, pembayaran diverifikasi, dan komisi dibayarkan.

### File yang Dimodifikasi/Dibuat
- **`src/hooks/useAgentNotifications.ts`** (BARU)
  - Hook untuk mengelola notifikasi agen
  - Subscribe ke Supabase real-time untuk 4 tipe event
  - Mirip dengan `useAdminNotifications.ts`

- **`src/components/agent/AgentNotificationBell.tsx`** (BARU)
  - UI component untuk menampilkan notifikasi
  - Popover dengan daftar notifikasi
  - Mark as read, mark all as read, clear all

- **`src/pages/agent/AgentLayoutEnhanced.tsx`** (BARU)
  - Enhanced version dari AgentLayout.tsx
  - Integrasi NotificationBell di header
  - Setup hook useAgentNotifications

### Tipe Notifikasi
1. **Booking**: Status booking berubah (pending → confirmed → processing → completed)
2. **Document**: Dokumen jamaah ditolak
3. **Commission**: Komisi dibayarkan
4. **Payment**: Pembayaran diverifikasi atau ditolak

### Cara Implementasi
1. Ganti import di `src/routes/AgentRoutes.tsx`:
   ```typescript
   const AgentLayout = lazy(() => import("@/pages/agent/AgentLayoutEnhanced"));
   ```
2. Atau rename file:
   ```bash
   mv src/pages/agent/AgentLayout.tsx src/pages/agent/AgentLayoutOld.tsx
   mv src/pages/agent/AgentLayoutEnhanced.tsx src/pages/agent/AgentLayout.tsx
   ```

### Event yang Dipantau
- **Booking Status Changes**: Ketika status booking berubah
- **Document Rejection**: Ketika dokumen jamaah ditolak
- **Commission Payment**: Ketika komisi dibayarkan
- **Payment Verification**: Ketika pembayaran diverifikasi atau ditolak

### Real-time Subscription
```typescript
// Contoh: Subscribe ke booking status changes
supabase
  .channel(`agent-booking-status-${agentId}`)
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'bookings',
      filter: `agent_id=eq.${agentId}`,
    },
    (payload) => { /* handle update */ }
  )
  .subscribe();
```

---

## 3. Integrasi Notifikasi WhatsApp Otomatis ✅ SELESAI

### Deskripsi
Sistem secara otomatis mengirim notifikasi WhatsApp ke jamaah dan agen ketika event penting terjadi (booking baru, pembayaran diverifikasi, dokumen ditolak, komisi dibayarkan).

### File yang Dimodifikasi/Dibuat
- **`supabase/functions/send-whatsapp-trigger/index.ts`** (BARU)
  - Edge Function untuk mengirim WhatsApp
  - Mendukung provider Fonnte dan Wablas
  - Handle 4 tipe event: booking_created, payment_verified, document_rejected, commission_paid

- **`supabase/migrations/add_whatsapp_automation_triggers.sql`** (BARU)
  - Database triggers untuk memanggil Edge Function
  - Trigger pada INSERT/UPDATE untuk setiap event
  - Menggunakan PostgreSQL net.http_post untuk async call

### Arsitektur
```
Event Terjadi (INSERT/UPDATE di database)
    ↓
PostgreSQL Trigger
    ↓
Edge Function (send-whatsapp-trigger)
    ↓
WhatsApp API (Fonnte/Wablas)
    ↓
WhatsApp Message Sent
    ↓
Log di whatsapp_logs table
```

### Event yang Didukung

#### 1. Booking Created
- **Trigger**: INSERT pada table `bookings`
- **Penerima**: Customer
- **Pesan**: Notifikasi booking berhasil dibuat dengan detail paket dan harga

#### 2. Payment Verified
- **Trigger**: UPDATE pada table `payments` dengan status='paid'
- **Penerima**: Customer
- **Pesan**: Notifikasi pembayaran diverifikasi dengan detail jumlah dan booking

#### 3. Document Rejected
- **Trigger**: UPDATE pada table `customer_documents` dengan status='rejected'
- **Penerima**: Customer
- **Pesan**: Notifikasi dokumen ditolak dengan alasan penolakan

#### 4. Commission Paid
- **Trigger**: UPDATE pada table `agent_commissions` dengan status='paid'
- **Penerima**: Agent
- **Pesan**: Notifikasi komisi dibayarkan dengan jumlah transfer

### Cara Implementasi

#### Step 1: Deploy Edge Function
```bash
# Dari root project
supabase functions deploy send-whatsapp-trigger
```

#### Step 2: Set Environment Variables
Di Supabase Dashboard → Project Settings → Edge Functions → Secrets:
```
WHATSAPP_API_KEY=<your-api-key>
WHATSAPP_PROVIDER=fonnte  # atau wablas
```

#### Step 3: Run Migration
```bash
# Di Supabase Dashboard → SQL Editor, jalankan:
# supabase/migrations/add_whatsapp_automation_triggers.sql
```

#### Step 4: Test
- Buat booking baru → Cek WhatsApp customer
- Verifikasi pembayaran → Cek WhatsApp customer
- Reject dokumen → Cek WhatsApp customer
- Bayar komisi → Cek WhatsApp agent

### WhatsApp Provider Configuration

#### Fonnte
- **API URL**: https://api.fonnte.com/send
- **Auth**: Authorization header dengan API key
- **Body**: `{ target, message }`

#### Wablas
- **API URL**: https://api.wablas.com/api/send-message
- **Auth**: Authorization header dengan API key
- **Body**: `{ phone, message }`

### Log dan Monitoring
Semua pesan WhatsApp dicatat di table `whatsapp_logs`:
- `recipient_phone`: Nomor penerima
- `message_content`: Isi pesan
- `status`: 'sent' atau 'failed'
- `error_message`: Error jika ada
- `sent_at`: Waktu pengiriman
- `created_at`: Waktu record dibuat

### Error Handling
- Jika nomor telepon tidak valid → Log dengan status 'failed'
- Jika API WhatsApp down → Retry logic di Edge Function
- Jika database trigger gagal → Log di PostgreSQL

---

## Integrasi dengan AdminWhatsApp

Fitur WhatsApp automation terintegrasi dengan halaman admin yang sudah ada:

### AdminWhatsApp.tsx
- **Configuration Tab**: Setup provider dan API key
- **Templates Tab**: Manage template pesan
- **Logs Tab**: View history pesan yang dikirim
- **Test Tab**: Test kirim pesan manual

### Workflow
1. Admin setup WhatsApp di AdminWhatsApp
2. Sistem otomatis mengirim berdasarkan trigger
3. Admin bisa monitor di Logs Tab
4. Admin bisa test manual di Test Tab

---

## Testing Checklist

### Phase 1: Payment Progress
- [ ] Buka Agent Portal → Data Jamaah
- [ ] Verifikasi payment progress bar muncul
- [ ] Verifikasi payment status badge muncul
- [ ] Verifikasi total pembayaran di stats card

### Phase 2: Agent Notifications
- [ ] Buka Agent Portal
- [ ] Verifikasi notification bell muncul di header
- [ ] Buat booking baru → Cek notifikasi "Status Booking Berubah"
- [ ] Reject dokumen → Cek notifikasi "Dokumen Ditolak"
- [ ] Verifikasi pembayaran → Cek notifikasi "Pembayaran Diverifikasi"
- [ ] Bayar komisi → Cek notifikasi "Komisi Dibayarkan"

### Phase 3: WhatsApp Automation
- [ ] Setup WhatsApp di AdminWhatsApp
- [ ] Buat booking baru → Cek WhatsApp customer
- [ ] Verifikasi pembayaran → Cek WhatsApp customer
- [ ] Reject dokumen → Cek WhatsApp customer
- [ ] Bayar komisi → Cek WhatsApp agent
- [ ] Check whatsapp_logs untuk verify semua terkirim

---

## Performance Considerations

### Database Triggers
- Triggers berjalan asynchronous via Edge Function
- Timeout 5 detik untuk setiap trigger
- Tidak memblokir main transaction

### Real-time Subscriptions
- Agent notifications menggunakan Supabase real-time
- Max 10 concurrent subscriptions per user
- Auto cleanup saat component unmount

### WhatsApp API Rate Limiting
- Fonnte: 100 pesan/detik
- Wablas: 50 pesan/detik
- Implement queue jika melebihi limit

---

## Next Steps (Prioritas 2)

Setelah Prioritas 1 selesai, implementasi:
1. Rating/feedback setelah perjalanan
2. Edit Foto Profil Jamaah
3. Audit Log Viewer untuk Super Admin
4. Laporan per cabang

---

## Troubleshooting

### WhatsApp tidak terkirim
1. Cek API key di AdminWhatsApp
2. Cek nomor telepon format (harus dengan kode negara)
3. Cek whatsapp_logs untuk error message
4. Cek Edge Function logs di Supabase Dashboard

### Notifikasi tidak muncul
1. Cek browser console untuk error
2. Verifikasi agentId ada di database
3. Cek Supabase real-time connection
4. Cek RLS policy untuk notifications table

### Payment progress tidak muncul
1. Cek query di AgentJamaahEnhanced.tsx
2. Verifikasi payment_status ada di bookings table
3. Cek data di database secara langsung

---

## Support

Untuk pertanyaan atau issue, silakan buat issue di GitHub atau hubungi tim development.
