# WhatsApp Security Migration Guide

## Overview

This document outlines the migration from browser-side WhatsApp token exposure to secure backend API proxying.

### Problem Statement

**Security Issue:** Fonnte API tokens were being exposed in the browser, visible in DevTools network requests and browser memory.

**Affected Components:**
- `useWhatsAppNotifier.ts` — Hook that sends messages directly to Fonnte API from browser
- `whatsapp-notifier.ts` — Library supporting direct browser-to-Fonnte communication
- `useApiKeyTests.ts` — Tests that validate Fonnte API key from browser

**Risk:** Anyone with access to browser DevTools or network traffic could capture the Fonnte API token and use it to send unauthorized WhatsApp messages.

---

## Solution Architecture

### Backend API Endpoints (Already Implemented)

All WhatsApp communication now goes through secure backend endpoints:

#### 1. **POST /api/whatsapp/send**
Simple message sending with token kept on server.

**Request:**
```json
{
  "target": "628123456789",
  "message": "Your message here",
  "countryCode": "62"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "msg_id_from_fonnte"
}
```

#### 2. **POST /api/whatsapp/notification**
Send notifications using template system with automatic data lookup.

**Option A — Booking ID Lookup:**
```json
{
  "type": "payment_reminder",
  "booking_id": "booking_uuid"
}
```

**Option B — Direct Data:**
```json
{
  "type": "custom",
  "phone": "628123456789",
  "name": "Customer Name",
  "data": {
    "custom_var": "value"
  }
}
```

**Available Templates:**
- `booking_confirmation`
- `payment_reminder`
- `payment_confirmed` / `payment_received`
- `departure_reminder`
- `document_ready`
- `custom`

#### 3. **POST /api/whatsapp/payment-reminder**
Bulk payment reminders with optional database lookup.

**Option A — Single Booking:**
```json
{
  "booking_id": "booking_uuid"
}
```

**Option B — Bulk Array:**
```json
{
  "reminders": [
    {
      "phone": "628123456789",
      "name": "Customer Name",
      "bookingCode": "VT-001",
      "remainingAmount": 5000000,
      "paymentDeadline": "2026-06-15"
    }
  ]
}
```

---

## Migration Steps

### Step 1: Update Components to Use New Secure Hook

Replace imports of `useWhatsAppNotifier` with `useWhatsAppNotifierSecure`:

**Before:**
```typescript
import { useWhatsAppNotifier } from "@/hooks/useWhatsAppNotifier";

export function MyComponent() {
  const { send, sendPaymentConfirmation } = useWhatsAppNotifier();
  // ...
}
```

**After:**
```typescript
import { useWhatsAppNotifierSecure } from "@/hooks/useWhatsAppNotifierSecure";

export function MyComponent() {
  const { send, sendPaymentConfirmation } = useWhatsAppNotifierSecure();
  // ...
}
```

### Step 2: Update API Base URL Configuration

Ensure `VITE_API_BASE_URL` environment variable is set in your `.env` file:

```env
VITE_API_BASE_URL=http://localhost:3000
# or for production:
VITE_API_BASE_URL=https://api.yourdomain.com
```

### Step 3: Verify Backend Token Configuration

The backend retrieves Fonnte token from (in order of priority):

1. **Environment Variable:** `FONNTE_TOKEN` (recommended for production)
2. **Database:** `whatsapp_config.api_key` where `is_active = true`

Ensure at least one is configured:

```bash
# Option 1: Set environment variable
export FONNTE_TOKEN="your_fonnte_token_here"

# Option 2: Configure via Admin Panel
# Go to Admin > WhatsApp Settings > Add API Key
```

### Step 4: Update Components That Send WhatsApp Messages

#### Example 1: Payment Confirmation

**Before (Exposed Token):**
```typescript
const { send } = useWhatsAppNotifier();
await send(customerPhone, messageText);  // Token sent from browser
```

**After (Secure):**
```typescript
const { send } = useWhatsAppNotifierSecure();
await send(customerPhone, messageText);  // Token stays on server
```

#### Example 2: Payment Reminder

**Before:**
```typescript
const { sendPaymentConfirmation } = useWhatsAppNotifier();
await sendPaymentConfirmation(phone, {
  nama: "John Doe",
  kode_booking: "VT-001",
  // ... other vars
});
```

**After:**
```typescript
const { sendPaymentConfirmation } = useWhatsAppNotifierSecure();
await sendPaymentConfirmation(phone, {
  nama: "John Doe",
  kode_booking: "VT-001",
  // ... other vars
});
```

---

## Components Already Migrated ✅

These components are already using the secure backend API:

- ✅ `AdminCicilanReminder.tsx` — Uses `/api/whatsapp/send`
- ✅ `AdminPembayaranReminder.tsx` — Uses `/api/whatsapp/send`
- ✅ `AdminWABlastKeberangkatan.tsx` — Uses `/api/whatsapp/send`
- ✅ `AdminWAOtomatis.tsx` — Uses `/api/whatsapp/send`
- ✅ `RoomingListPageImproved.tsx` — Uses `/api/whatsapp/send`

---

## Components That Need Migration ⚠️

These components still use the old insecure method:

- ⚠️ `useWhatsAppNotifier.ts` — **DEPRECATED** — Use `useWhatsAppNotifierSecure` instead
- ⚠️ `whatsapp-notifier.ts` — **DEPRECATED** — Direct Fonnte calls from browser
- ⚠️ `useApiKeyTests.ts` — Tests Fonnte API key from browser (line 73-96)

### Deprecation Plan

1. **Phase 1 (Current):** Create new `useWhatsAppNotifierSecure` hook
2. **Phase 2:** Update all components to use new hook
3. **Phase 3:** Mark old hooks as deprecated with console warnings
4. **Phase 4:** Remove old hooks after all components migrated

---

## Testing the Migration

### 1. Test Backend Endpoint Directly

```bash
curl -X POST http://localhost:3000/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "target": "628123456789",
    "message": "Test message from backend"
  }'
```

### 2. Test in Browser Console

```javascript
// Test sending via secure hook
const response = await fetch('/api/whatsapp/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    target: '628123456789',
    message: 'Test message'
  })
});
const data = await response.json();
console.log(data);
```

### 3. Verify Token is NOT Exposed

1. Open DevTools (F12)
2. Go to Network tab
3. Send a WhatsApp message
4. Check the request to `/api/whatsapp/send`
5. **Verify:** Token should NOT appear in request headers or body
6. **Verify:** Only phone number and message are sent from browser

---

## Environment Variables

### Development

```env
# .env.local
VITE_API_BASE_URL=http://localhost:3000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Production (Replit/Backend)

```env
# Replit Secrets
FONNTE_TOKEN=your_fonnte_api_token
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
DATABASE_URL=your_database_url
```

---

## Security Checklist

- [ ] All WhatsApp sends go through `/api/whatsapp/send`
- [ ] Fonnte token is NOT in frontend code
- [ ] Fonnte token is NOT in browser requests
- [ ] Token is stored in backend environment variables
- [ ] Token can be rotated without redeploying frontend
- [ ] All API endpoints validate input (phone, message)
- [ ] Rate limiting is implemented on backend
- [ ] All WhatsApp logs are stored in database
- [ ] Admin can view WhatsApp send history

---

## Troubleshooting

### Issue: "Konfigurasi WhatsApp belum diatur"

**Cause:** Fonnte token not configured on backend

**Solution:**
1. Go to Admin Panel > WhatsApp Settings
2. Add Fonnte API key
3. Or set `FONNTE_TOKEN` environment variable

### Issue: "Nomor telepon tidak valid"

**Cause:** Phone number format incorrect

**Solution:**
- Ensure phone number starts with country code (62 for Indonesia)
- Format: `628123456789` or `+628123456789`
- Remove spaces and special characters

### Issue: "Error: Network error"

**Cause:** API endpoint not reachable

**Solution:**
1. Verify `VITE_API_BASE_URL` is correct
2. Check backend server is running
3. Check CORS configuration

---

## API Response Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200  | Success | Message sent |
| 400  | Bad Request | Check phone/message format |
| 503  | Service Unavailable | Fonnte token not configured |
| 502  | Bad Gateway | Fonnte API error |
| 500  | Server Error | Backend error |

---

## References

- **Fonnte API Docs:** https://fonnte.com/docs
- **Backend Routes:** `artifacts/api-server/src/routes/whatsapp.ts`
- **New Hook:** `artifacts/umrah-haji/src/hooks/useWhatsAppNotifierSecure.ts`
- **Old Hook (Deprecated):** `artifacts/umrah-haji/src/hooks/useWhatsAppNotifier.ts`

---

## Questions?

For questions or issues with the migration, please:
1. Check the troubleshooting section above
2. Review backend logs: `artifacts/api-server/src/routes/whatsapp.ts`
3. Check browser console for error messages
4. Contact the development team
