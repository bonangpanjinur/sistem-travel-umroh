# RBAC Granular Permissions - Implementation Checklist

## Status: IMPLEMENTASI SELESAI ✅

Dokumen ini merangkum semua file yang telah dibuat dan langkah-langkah implementasi untuk sistem RBAC granular pada aplikasi Umroh & Haji Magic.

---

## 📋 File yang Telah Dibuat

### 1. Database & Migration Files

#### ✅ `supabase/migrations/20260324000011_enhance_granular_permissions.sql`
**Status:** Siap dijalankan

**Isi:**
- Menambahkan izin granular baru ke `permissions_list` tabel
- Update `role_permissions` sesuai matriks dokumen petunjuk
- Enhance RLS policies untuk bookings, payments, dan customers
- Membuat audit_logs table dan triggers untuk tracking operasi sensitif
- Implementasi `log_audit_action()` function

**Izin Granular yang Ditambahkan:**
- `bookings.view_all`, `bookings.view_branch`, `bookings.view_own`, `bookings.approve`
- `payments.view_all`, `payments.view_branch`, `payments.view_own`, `payments.refund`
- `customers.edit_sensitive`
- `operational.manifest`, `operational.visa`
- `equipment.inventory`, `equipment.distribute`
- `finance.reports`
- `dashboard.view`, `analytics.view`

**Matriks Akses yang Diimplementasikan:**
- **Agent:** Pembatasan ketat (view_own, create saja)
- **Branch Manager:** Pembatasan cabang (view_branch, limited edit)
- **Finance:** Fokus pada payments (view_all, verify, refund)
- **Operational:** Fokus pada operational tasks
- **Equipment:** Fokus pada inventory management
- **Sales:** Fokus pada bookings dan leads
- **Marketing:** Fokus pada leads

---

### 2. Frontend Components

#### ✅ `src/components/auth/PermissionGuardEnhanced.tsx`
**Status:** Siap digunakan

**Komponen yang Disediakan:**
1. **PermissionGuardEnhanced** - Enhanced permission guard dengan fitur:
   - Granular action-level permissions
   - Branch-level dan own-data level permissions
   - Visual feedback dengan locked state
   - Support untuk `resource.action` format

2. **ActionButton** - Button dengan automatic permission checking:
   - Automatic disable jika tidak punya akses
   - Optional locked state visual
   - Automatic permission key construction

3. **IfPermission** - Conditional render component:
   - Simple conditional rendering berdasarkan permission
   - Support untuk multiple permissions (any/all)

4. **withPermissionGuardEnhanced** - HOC untuk wrap pages

**Contoh Penggunaan:**
```typescript
// Hide element jika tidak punya akses
<PermissionGuardEnhanced resource="bookings" action="edit">
  <EditButton />
</PermissionGuardEnhanced>

// Show locked state
<PermissionGuardEnhanced 
  resource="bookings" 
  action="delete" 
  showLocked
>
  <DeleteButton />
</PermissionGuardEnhanced>

// ActionButton
<ActionButton 
  resource="bookings" 
  action="approve"
  onClick={handleApprove}
>
  Setujui Booking
</ActionButton>
```

---

#### ✅ `src/hooks/usePermissionsEnhanced.tsx`
**Status:** Siap digunakan

**Fitur yang Disediakan:**
1. **hasPermission()** - Check single permission
2. **hasAnyPermission()** - Check if user has any of permissions
3. **hasAllPermissions()** - Check if user has all permissions
4. **canPerformAction()** - Check resource.action permission
5. **canPerformActionWithReason()** - Check dengan detail reason
6. **canViewWithScope()** - Check view scope (all/branch/own)
7. **getViewPermissionLevel()** - Get highest permission level
8. **isRestrictedToBranch()** - Check if user restricted to branch
9. **isRestrictedToOwn()** - Check if user restricted to own data
10. **logAuditAction()** - Log action untuk audit trail
11. **performSensitiveAction()** - Perform action dengan permission check & audit logging

**Contoh Penggunaan:**
```typescript
const {
  hasPermission,
  canPerformAction,
  canPerformActionWithReason,
  getViewPermissionLevel,
  performSensitiveAction,
} = usePermissionsEnhanced();

// Check permission
const canEdit = canPerformAction('bookings', 'edit');

// Get reason for denial
const result = canPerformActionWithReason('payments', 'verify');
if (!result.hasPermission) {
  console.log(result.reason);
}

// Get view level
const viewLevel = getViewPermissionLevel('bookings'); // 'all', 'branch', 'own', or null

// Perform sensitive action dengan audit logging
await performSensitiveAction(
  'payments',
  'verify',
  paymentId,
  async () => {
    // API call
    return await updatePayment(paymentId);
  },
  { status: 'pending' },  // oldValues
  { status: 'paid' }      // newValues
);
```

---

### 3. Backend Middleware

#### ✅ `src/server/middleware/permissionMiddleware.ts`
**Status:** Siap diintegrasikan

**Middleware yang Disediakan:**
1. **checkPermission()** - Check permission di server
2. **requirePermission()** - Middleware untuk require single permission
3. **requireAnyPermission()** - Middleware untuk require any permission
4. **requireAllPermissions()** - Middleware untuk require all permissions
5. **conditionalPermission()** - Middleware untuk conditional permission check
6. **auditLog()** - Middleware untuk audit logging
7. **rateLimitSensitiveAction()** - Middleware untuk rate limiting

**Contoh Penggunaan:**
```typescript
// Require single permission
app.post('/api/payments/:id/verify', 
  requirePermission('payments.verify'),
  handleVerifyPayment
);

// Require all permissions
app.post('/api/payments/:id/refund',
  requireAllPermissions(['payments.verify', 'payments.refund']),
  handleRefund
);

// Conditional permission
app.get('/api/bookings',
  conditionalPermission((req) => {
    if (req.user?.roles.includes('agent')) {
      req.query.agent_id = req.user.id;
      return 'bookings.view_own';
    }
    return 'bookings.view_all';
  }),
  handleGetBookings
);

// Dengan audit logging
app.post('/api/payments/:id/verify',
  requirePermission('payments.verify'),
  auditLog('PAYMENT_VERIFIED', 'payments'),
  handleVerifyPayment
);

// Dengan rate limiting
app.delete('/api/bookings/:id',
  requirePermission('bookings.delete'),
  rateLimitSensitiveAction('bookings.delete', 5, 60),
  handleDeleteBooking
);
```

---

#### ✅ `src/server/routes/permissionExamples.ts`
**Status:** Reference implementation

**Endpoint Examples:**
- `GET /api/bookings` - Dengan conditional permission
- `POST /api/bookings` - Dengan permission check & audit
- `PUT /api/bookings/:id` - Dengan permission check & audit
- `POST /api/bookings/:id/approve` - Dengan permission check & audit
- `DELETE /api/bookings/:id` - Dengan rate limiting & audit
- `GET /api/payments` - Dengan conditional permission
- `POST /api/payments/:id/verify` - Dengan rate limiting & audit
- `POST /api/payments/:id/refund` - Dengan multiple permissions & audit
- `PUT /api/customers/:id/sensitive-data` - Dengan sensitive data protection

---

### 4. Admin UI Components

#### ✅ `src/pages/admin/AdminRolePermissionsEnhanced.tsx`
**Status:** Siap digunakan

**Fitur:**
- Role selection dengan visual cards
- Granular permission management per role
- Permission grouping by module
- Scope indicators (view_all, view_branch, view_own, action)
- Real-time change tracking
- Save/Reset functionality
- Visual feedback untuk pending changes

**Permission Groups:**
- Booking & Jamaah
- Keuangan & Pembayaran
- Data Jamaah
- Operasional
- Perlengkapan
- Leads & Marketing
- Paket & Keberangkatan
- Sistem & Pengaturan

---

### 5. Documentation

#### ✅ `docs/RBAC_IMPLEMENTATION_GUIDE.md`
**Status:** Lengkap

**Isi:**
- Fase 1: Fondasi Database & Izin Granular
- Fase 2: Integrasi Backend & Logika Inti
- Fase 3: Adaptasi UI
- Contoh implementasi detail
- Testing & validasi
- Troubleshooting

---

## 🚀 Langkah-Langkah Implementasi

### Step 1: Apply Database Migration
```bash
# Jalankan migration
supabase migration up

# Atau melalui Supabase Dashboard:
# 1. Buka SQL Editor
# 2. Copy isi file: supabase/migrations/20260324000011_enhance_granular_permissions.sql
# 3. Run query
```

### Step 2: Copy Frontend Files
```bash
# Semua file sudah ada di direktori yang sesuai:
# - src/components/auth/PermissionGuardEnhanced.tsx
# - src/hooks/usePermissionsEnhanced.tsx
# - src/pages/admin/AdminRolePermissionsEnhanced.tsx
```

### Step 3: Copy Backend Files
```bash
# Semua file sudah ada di direktori yang sesuai:
# - src/server/middleware/permissionMiddleware.ts
# - src/server/routes/permissionExamples.ts
```

### Step 4: Update Existing Components
Gunakan `PermissionGuardEnhanced` dan `ActionButton` di komponen yang ada:

**Contoh di AdminBookings.tsx:**
```typescript
import { ActionButton, IfPermission } from "@/components/auth/PermissionGuardEnhanced";

function BookingActions() {
  return (
    <>
      <ActionButton 
        resource="bookings" 
        action="edit"
        onClick={handleEdit}
      >
        Edit
      </ActionButton>
      
      <ActionButton 
        resource="bookings" 
        action="delete"
        onClick={handleDelete}
        variant="destructive"
        showLocked
      >
        Hapus
      </ActionButton>
    </>
  );
}
```

### Step 5: Update API Endpoints
Gunakan permission middleware di backend:

**Contoh di Express.js:**
```typescript
import { requirePermission, auditLog } from '@/server/middleware/permissionMiddleware';

app.post('/api/payments/:id/verify',
  requirePermission('payments.verify'),
  auditLog('PAYMENT_VERIFIED', 'payments'),
  handleVerifyPayment
);
```

### Step 6: Test Implementation
```bash
# Unit tests untuk permission checks
npm test -- usePermissionsEnhanced.test.ts

# Integration tests
npm test -- permissions.integration.test.ts
```

---

## ✅ Verification Checklist

### Database Level
- [ ] Migration `20260324000011_enhance_granular_permissions.sql` berhasil dijalankan
- [ ] Tabel `permissions_list` terisi dengan izin granular
- [ ] Tabel `role_permissions` terisi sesuai matriks
- [ ] Tabel `audit_logs` terbuat
- [ ] RLS policies berhasil diterapkan
- [ ] Triggers untuk audit logging aktif

### Frontend Level
- [ ] `PermissionGuardEnhanced` component berfungsi
- [ ] `ActionButton` component berfungsi
- [ ] `usePermissionsEnhanced` hook berfungsi
- [ ] Admin UI `AdminRolePermissionsEnhanced` berfungsi
- [ ] Permission checks di UI berfungsi dengan benar

### Backend Level
- [ ] Permission middleware berfungsi
- [ ] API endpoints dengan permission check berfungsi
- [ ] Audit logging berfungsi
- [ ] Rate limiting berfungsi
- [ ] Error handling konsisten

### User Experience
- [ ] Agent hanya bisa lihat booking sendiri
- [ ] Branch Manager hanya bisa lihat booking cabang
- [ ] Finance bisa verify payments
- [ ] Tombol aksi di-disable jika tidak punya akses
- [ ] Audit log terekam untuk operasi sensitif

---

## 📊 Permission Matrix Summary

### Agent (Pembatasan Ketat)
| Resource | View | Create | Edit | Delete | Approve | Verify | Refund |
|----------|------|--------|------|--------|---------|--------|--------|
| Bookings | ✅ own | ✅ | ❌ | ❌ | ❌ | - | - |
| Payments | ✅ own | ✅ | ❌ | ❌ | - | ❌ | ❌ |
| Customers | ✅ | ✅ | ❌ | ❌ | - | - | - |
| Leads | ✅ | ✅ | ✅ | ❌ | - | - | - |

### Branch Manager (Pembatasan Cabang)
| Resource | View | Create | Edit | Delete | Approve | Verify | Refund |
|----------|------|--------|------|--------|---------|--------|--------|
| Bookings | ✅ branch | ✅ | ✅ | ❌ | ❌ | - | - |
| Payments | ✅ branch | ✅ | ✅ | ❌ | - | ❌ | ❌ |
| Customers | ✅ | ✅ | ✅ | ❌ | - | - | - |
| Leads | ✅ | ✅ | ✅ | ❌ | - | - | - |

### Finance (Fokus Pembayaran)
| Resource | View | Create | Edit | Delete | Approve | Verify | Refund |
|----------|------|--------|------|--------|---------|--------|--------|
| Bookings | ✅ all | ❌ | ❌ | ❌ | ❌ | - | - |
| Payments | ✅ all | ✅ | ✅ | ✅ | - | ✅ | ✅ |
| Customers | ✅ | ❌ | ❌ | ❌ | - | - | - |
| Reports | ✅ | - | - | - | - | - | - |

### Super Admin & Owner (Akses Penuh)
| Resource | View | Create | Edit | Delete | Approve | Verify | Refund |
|----------|------|--------|------|--------|---------|--------|--------|
| Semua | ✅ all | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🔐 Security Features

### 1. Granular Permissions
- ✅ Izin per resource.action (bookings.edit, payments.verify, dll)
- ✅ Scope-based permissions (view_all, view_branch, view_own)
- ✅ Sensitive data protection (customers.edit_sensitive)

### 2. Row Level Security (RLS)
- ✅ Database-level protection
- ✅ Automatic data filtering berdasarkan permission
- ✅ Prevents unauthorized data access

### 3. Audit Logging
- ✅ Automatic logging untuk operasi sensitif
- ✅ Tracks user, action, timestamp, dan data changes
- ✅ Useful untuk compliance dan troubleshooting

### 4. Rate Limiting
- ✅ Prevents abuse dari operasi sensitif
- ✅ Configurable per action
- ✅ Returns 429 Too Many Requests

### 5. Error Handling
- ✅ Consistent HTTP 403 Forbidden responses
- ✅ Detailed error messages dengan required permissions
- ✅ User-friendly error messages

---

## 📚 Additional Resources

### Documentation Files
- `docs/RBAC_IMPLEMENTATION_GUIDE.md` - Panduan lengkap implementasi
- `RBAC_IMPLEMENTATION_CHECKLIST.md` - File ini

### Code Examples
- `src/server/routes/permissionExamples.ts` - API endpoint examples
- `src/components/auth/PermissionGuardEnhanced.tsx` - UI component examples

### Database
- `supabase/migrations/20260324000011_enhance_granular_permissions.sql` - Migration file

---

## 🆘 Troubleshooting

### Permission Denied Error
**Solusi:**
1. Verifikasi user memiliki role yang sesuai di `user_roles` table
2. Cek `role_permissions` sudah terisi dengan permission yang benar
3. Verifikasi RLS policies sudah diterapkan

### Hook returns isLoading: true terus-menerus
**Solusi:**
1. Pastikan `useAuth()` mengembalikan user dan roles
2. Cek koneksi ke Supabase
3. Verifikasi query permissions tidak error

### PermissionGuard tidak menampilkan children
**Solusi:**
1. Verifikasi permission key ada di `permissions_list`
2. Cek user memiliki permission di `role_permissions`
3. Debug dengan fallback: `fallback={<div>No permission</div>}`

---

## 📝 Next Steps

1. **Apply Migration** - Jalankan SQL migration di Supabase
2. **Test Database** - Verifikasi permissions sudah tersimpan
3. **Update Components** - Ganti komponen lama dengan yang baru
4. **Update Endpoints** - Tambahkan permission middleware ke API
5. **Test UI** - Verifikasi permission checks di UI
6. **Test API** - Verifikasi permission checks di API
7. **Monitor Audit Logs** - Check audit_logs untuk operasi sensitif
8. **User Training** - Ajarkan tim tentang permission system baru

---

## 📞 Support

Untuk pertanyaan atau masalah implementasi, silakan:
1. Baca `docs/RBAC_IMPLEMENTATION_GUIDE.md`
2. Check `RBAC_IMPLEMENTATION_CHECKLIST.md` ini
3. Review code examples di `src/server/routes/permissionExamples.ts`
4. Hubungi tim development

---

**Status:** ✅ IMPLEMENTASI SELESAI
**Last Updated:** 24 Maret 2026
**Version:** 1.0
