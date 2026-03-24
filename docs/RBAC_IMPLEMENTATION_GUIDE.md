# Panduan Implementasi RBAC Granular - Umroh & Haji Magic

## Ringkasan Eksekutif

Dokumen ini menyediakan panduan lengkap untuk mengimplementasikan sistem **Role-Based Access Control (RBAC)** yang granular pada aplikasi Umroh & Haji Magic. Implementasi ini mengikuti strategi komprehensif yang telah dirancang untuk meningkatkan keamanan dan kontrol akses dari tingkat modul menjadi tingkat tindakan spesifik.

---

## Daftar Isi

1. [Fase 1: Fondasi Database & Izin Granular](#fase-1-fondasi-database--izin-granular)
2. [Fase 2: Integrasi Backend & Logika Inti](#fase-2-integrasi-backend--logika-inti)
3. [Fase 3: Adaptasi UI](#fase-3-adaptasi-ui)
4. [Contoh Implementasi](#contoh-implementasi)
5. [Testing & Validasi](#testing--validasi)
6. [Troubleshooting](#troubleshooting)

---

## Fase 1: Fondasi Database & Izin Granular

### 1.1 Struktur Izin Granular

Setiap modul telah dipecah menjadi tindakan spesifik menggunakan format `modul.tindakan`:

#### Modul Booking & Jamaah
| Izin | Deskripsi | Target Pengguna |
|:---|:---|:---|
| `bookings.view_all` | Melihat **semua** booking dari semua cabang/agen | Owner, Super Admin |
| `bookings.view_branch` | Melihat booking yang terkait dengan **cabang** pengguna | Branch Manager |
| `bookings.view_own` | Melihat booking yang terkait dengan **diri sendiri** (sebagai agen) | Agent |
| `bookings.create` | Membuat reservasi baru | Sales, Admin |
| `bookings.edit` | Mengubah data booking (pax, paket) | Admin, Manager |
| `bookings.approve` | Menyetujui atau mengonfirmasi booking | Manager, Owner |
| `bookings.delete` | Menghapus data booking | Owner, Super Admin |

#### Modul Keuangan (Finance)
| Izin | Deskripsi | Target Pengguna |
|:---|:---|:---|
| `payments.view_all` | Melihat **semua** riwayat pembayaran | Finance, Owner |
| `payments.view_branch` | Melihat pembayaran yang terkait dengan **cabang** pengguna | Branch Manager |
| `payments.view_own` | Melihat pembayaran yang terkait dengan booking **milik agen** | Agent |
| `payments.create` | Input bukti bayar baru | Sales, Finance |
| `payments.verify` | **Validasi & konfirmasi pembayaran** | **Finance Manager** |
| `payments.refund` | Melakukan proses pengembalian dana | Finance Manager, Owner |
| `finance.reports` | Mengakses laporan laba rugi | Owner, Finance |

#### Modul Operasional & Perlengkapan
| Izin | Deskripsi | Target Pengguna |
|:---|:---|:---|
| `operational.manifest` | Mengelola manifest keberangkatan | Operasional |
| `operational.visa` | Update status pengurusan visa | Admin Visa |
| `equipment.inventory` | Kelola stok perlengkapan (kain ihram, tas) | Bagian Gudang |
| `equipment.distribute` | Catat serah terima perlengkapan ke jamaah | Bagian Gudang |

### 1.2 Implementasi Database

#### Step 1: Jalankan Migration SQL

```bash
# File migration telah dibuat di:
# supabase/migrations/20260324000011_enhance_granular_permissions.sql

# Jalankan migration melalui Supabase CLI atau dashboard
supabase migration up
```

#### Step 2: Verifikasi Tabel permissions_list

```sql
-- Verifikasi izin granular sudah tersimpan
SELECT * FROM public.permissions_list 
WHERE key LIKE 'bookings.%' OR key LIKE 'payments.%'
ORDER BY group_name, key;
```

#### Step 3: Verifikasi role_permissions

```sql
-- Verifikasi mapping role ke permission
SELECT role, permission_key, is_enabled 
FROM public.role_permissions 
WHERE role IN ('agent', 'branch_manager', 'finance')
ORDER BY role, permission_key;
```

### 1.3 RLS Policies

RLS policies telah diperbarui untuk mendukung izin granular:

#### Bookings RLS
```sql
-- Agents hanya bisa melihat booking mereka sendiri (view_own)
-- Branch Managers hanya bisa melihat booking cabang mereka (view_branch)
-- Finance & Operational bisa melihat semua booking di cabang mereka
-- Super Admin & Owner bisa melihat semua booking (view_all)
```

#### Payments RLS
```sql
-- Agents hanya bisa melihat pembayaran booking mereka (view_own)
-- Branch Managers hanya bisa melihat pembayaran cabang mereka (view_branch)
-- Finance bisa melihat & verifikasi pembayaran (view_all + verify)
-- Super Admin & Owner bisa melakukan semua operasi
```

#### Customers RLS
```sql
-- Sensitive data (NIK, Passport) hanya bisa diubah oleh yang punya izin customers.edit_sensitive
-- Agents hanya bisa edit data pelanggan yang mereka buat
-- Branch Managers bisa edit data pelanggan di cabang mereka
```

---

## Fase 2: Integrasi Backend & Logika Inti

### 2.1 Enhanced usePermissions Hook

Gunakan hook baru `usePermissionsEnhanced` untuk fitur-fitur canggih:

```typescript
import { usePermissionsEnhanced } from "@/hooks/usePermissionsEnhanced";

function MyComponent() {
  const {
    hasPermission,
    canPerformAction,
    canPerformActionWithReason,
    canViewWithScope,
    getViewPermissionLevel,
    isRestrictedToBranch,
    isRestrictedToOwn,
    performSensitiveAction,
  } = usePermissionsEnhanced();

  // Check granular permission
  const canEditBooking = canPerformAction('bookings', 'edit');

  // Get detailed reason for denial
  const result = canPerformActionWithReason('payments', 'verify');
  if (!result.hasPermission) {
    console.log(result.reason); // "Anda tidak memiliki izin untuk verify payments"
  }

  // Check view scope
  const viewLevel = getViewPermissionLevel('bookings');
  // Returns: 'all', 'branch', 'own', or null

  // Perform sensitive action with audit logging
  const handleVerifyPayment = async (paymentId: string) => {
    try {
      await performSensitiveAction(
        'payments',
        'verify',
        paymentId,
        async () => {
          // Actual API call
          return await supabase
            .from('payments')
            .update({ status: 'paid' })
            .eq('id', paymentId);
        },
        { status: 'pending' },  // oldValues
        { status: 'paid' }      // newValues
      );
    } catch (error) {
      console.error(error.message);
    }
  };
}
```

### 2.2 Enhanced PermissionGuard Component

Gunakan komponen baru `PermissionGuardEnhanced` untuk kontrol UI yang lebih baik:

```typescript
import { 
  PermissionGuardEnhanced, 
  ActionButton, 
  IfPermission 
} from "@/components/auth/PermissionGuardEnhanced";

function BookingActions() {
  return (
    <>
      {/* Hide element jika tidak punya akses */}
      <PermissionGuardEnhanced resource="bookings" action="edit">
        <EditButton />
      </PermissionGuardEnhanced>

      {/* Show locked state jika tidak punya akses */}
      <PermissionGuardEnhanced 
        resource="bookings" 
        action="delete" 
        showLocked
      >
        <DeleteButton />
      </PermissionGuardEnhanced>

      {/* ActionButton dengan automatic permission checking */}
      <ActionButton 
        resource="bookings" 
        action="approve"
        onClick={handleApprove}
        className="btn btn-primary"
      >
        Setujui Booking
      </ActionButton>

      {/* Conditional rendering */}
      <IfPermission permission="payments.verify">
        <VerifyPaymentSection />
      </IfPermission>
    </>
  );
}
```

### 2.3 API Endpoint Validation

Tambahkan validasi permission di setiap endpoint backend:

```typescript
// Example: Express.js / Node.js backend
import { checkPermission } from '@/server/permissions';

// Middleware untuk validasi permission
const requirePermission = (permission: string) => {
  return async (req, res, next) => {
    const userId = req.user.id;
    const hasAccess = await checkPermission(userId, permission);

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Anda tidak memiliki izin untuk ${permission}`
      });
    }

    next();
  };
};

// Gunakan middleware di endpoint
app.post('/api/payments/:id/verify', 
  requirePermission('payments.verify'),
  async (req, res) => {
    // Verify payment logic
  }
);

app.delete('/api/bookings/:id',
  requirePermission('bookings.delete'),
  async (req, res) => {
    // Delete booking logic
  }
);
```

### 2.4 Error Handling

Implementasikan error handling yang konsisten:

```typescript
// Standardized error response
interface PermissionError {
  code: 'PERMISSION_DENIED' | 'INSUFFICIENT_PERMISSION';
  message: string;
  requiredPermission: string;
  userPermissions: string[];
}

// Example error response
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Anda tidak memiliki izin untuk verify payments",
    "requiredPermission": "payments.verify",
    "userPermissions": ["payments.view_own", "payments.create"]
  }
}
```

---

## Fase 3: Adaptasi UI

### 3.1 Update AdminRolePermissions Component

File: `src/pages/admin/AdminRolePermissions.tsx`

Perbarui komponen untuk menampilkan izin granular:

```typescript
// Struktur izin yang baru
const GRANULAR_PERMISSIONS: Record<string, PermissionGroup> = {
  bookings: {
    label: 'Booking',
    permissions: [
      { key: 'bookings.view_all', label: 'Lihat Semua', scope: 'all' },
      { key: 'bookings.view_branch', label: 'Lihat Cabang', scope: 'branch' },
      { key: 'bookings.view_own', label: 'Lihat Sendiri', scope: 'own' },
      { key: 'bookings.create', label: 'Buat', action: 'create' },
      { key: 'bookings.edit', label: 'Edit', action: 'edit' },
      { key: 'bookings.approve', label: 'Setujui', action: 'approve' },
      { key: 'bookings.delete', label: 'Hapus', action: 'delete' },
    ]
  },
  payments: {
    label: 'Pembayaran',
    permissions: [
      { key: 'payments.view_all', label: 'Lihat Semua', scope: 'all' },
      { key: 'payments.view_branch', label: 'Lihat Cabang', scope: 'branch' },
      { key: 'payments.view_own', label: 'Lihat Sendiri', scope: 'own' },
      { key: 'payments.create', label: 'Buat', action: 'create' },
      { key: 'payments.verify', label: 'Verifikasi', action: 'verify' },
      { key: 'payments.refund', label: 'Refund', action: 'refund' },
    ]
  },
  // ... more permission groups
};
```

### 3.2 Tambahkan PermissionGuard pada Tombol Aksi

Contoh implementasi di berbagai halaman:

#### Booking Management
```typescript
// src/pages/admin/AdminBookings.tsx
import { ActionButton, IfPermission } from "@/components/auth/PermissionGuardEnhanced";

function BookingManagement() {
  return (
    <div className="space-y-4">
      <IfPermission permission="bookings.create">
        <ActionButton 
          resource="bookings" 
          action="create"
          onClick={handleCreate}
          className="btn btn-primary"
        >
          Buat Booking Baru
        </ActionButton>
      </IfPermission>

      <table>
        <tbody>
          {bookings.map(booking => (
            <tr key={booking.id}>
              <td>{booking.code}</td>
              <td>
                <ActionButton 
                  resource="bookings" 
                  action="edit"
                  onClick={() => handleEdit(booking.id)}
                  showLocked
                >
                  Edit
                </ActionButton>
              </td>
              <td>
                <ActionButton 
                  resource="bookings" 
                  action="approve"
                  onClick={() => handleApprove(booking.id)}
                  showLocked
                >
                  Setujui
                </ActionButton>
              </td>
              <td>
                <ActionButton 
                  resource="bookings" 
                  action="delete"
                  onClick={() => handleDelete(booking.id)}
                  variant="destructive"
                  showLocked
                >
                  Hapus
                </ActionButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

#### Payment Verification
```typescript
// src/pages/admin/AdminPayments.tsx
import { usePermissionsEnhanced } from "@/hooks/usePermissionsEnhanced";
import { ActionButton } from "@/components/auth/PermissionGuardEnhanced";

function PaymentVerification() {
  const { performSensitiveAction } = usePermissionsEnhanced();

  const handleVerifyPayment = async (paymentId: string) => {
    try {
      await performSensitiveAction(
        'payments',
        'verify',
        paymentId,
        async () => {
          const { error } = await supabase
            .from('payments')
            .update({ status: 'paid', verified_at: new Date() })
            .eq('id', paymentId);
          
          if (error) throw error;
          return true;
        },
        { status: 'pending' },
        { status: 'paid' }
      );
      
      toast.success('Pembayaran berhasil diverifikasi');
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <table>
      <tbody>
        {payments.map(payment => (
          <tr key={payment.id}>
            <td>{payment.payment_code}</td>
            <td>{payment.amount}</td>
            <td>
              <ActionButton 
                resource="payments" 
                action="verify"
                onClick={() => handleVerifyPayment(payment.id)}
                disabled={payment.status === 'paid'}
              >
                Verifikasi
              </ActionButton>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

#### Customer Management
```typescript
// src/pages/admin/AdminCustomers.tsx
import { usePermissionsEnhanced } from "@/hooks/usePermissionsEnhanced";
import { ActionButton } from "@/components/auth/PermissionGuardEnhanced";

function CustomerManagement() {
  const { canPerformAction } = usePermissionsEnhanced();

  const handleEditSensitiveData = async (customerId: string) => {
    if (!canPerformAction('customers', 'edit_sensitive')) {
      toast.error('Anda tidak memiliki izin untuk mengubah data sensitif');
      return;
    }
    // Show edit form for sensitive data
  };

  return (
    <table>
      <tbody>
        {customers.map(customer => (
          <tr key={customer.id}>
            <td>{customer.full_name}</td>
            <td>
              <ActionButton 
                resource="customers" 
                action="edit"
                onClick={() => handleEdit(customer.id)}
              >
                Edit
              </ActionButton>
            </td>
            <td>
              <ActionButton 
                resource="customers" 
                action="edit_sensitive"
                onClick={() => handleEditSensitiveData(customer.id)}
                showLocked
              >
                Edit Data Sensitif
              </ActionButton>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## Contoh Implementasi

### Contoh 1: Booking List dengan Permission Control

```typescript
import { usePermissionsEnhanced } from "@/hooks/usePermissionsEnhanced";
import { PermissionGuardEnhanced, ActionButton } from "@/components/auth/PermissionGuardEnhanced";

function BookingList() {
  const { getViewPermissionLevel, isRestrictedToBranch, isRestrictedToOwn } = usePermissionsEnhanced();
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    // Fetch bookings berdasarkan permission level
    const viewLevel = getViewPermissionLevel('bookings');
    
    let query = supabase.from('bookings').select('*');
    
    if (viewLevel === 'own') {
      query = query.eq('agent_id', userId);
    } else if (viewLevel === 'branch') {
      query = query.eq('branch_id', userBranchId);
    }
    // else: viewLevel === 'all' - fetch semua bookings

    query.then(({ data }) => setBookings(data));
  }, []);

  return (
    <div>
      <h1>Daftar Booking</h1>
      
      {isRestrictedToOwn('bookings') && (
        <Alert>Anda hanya bisa melihat booking Anda sendiri</Alert>
      )}
      
      {isRestrictedToBranch('bookings') && (
        <Alert>Anda hanya bisa melihat booking cabang Anda</Alert>
      )}

      <table>
        <thead>
          <tr>
            <th>Kode Booking</th>
            <th>Jamaah</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map(booking => (
            <tr key={booking.id}>
              <td>{booking.booking_code}</td>
              <td>{booking.customer?.full_name}</td>
              <td>{booking.booking_status}</td>
              <td>
                <div className="flex gap-2">
                  <ActionButton 
                    resource="bookings" 
                    action="edit"
                    onClick={() => handleEdit(booking.id)}
                  >
                    Edit
                  </ActionButton>
                  
                  <ActionButton 
                    resource="bookings" 
                    action="approve"
                    onClick={() => handleApprove(booking.id)}
                    showLocked
                  >
                    Setujui
                  </ActionButton>
                  
                  <ActionButton 
                    resource="bookings" 
                    action="delete"
                    onClick={() => handleDelete(booking.id)}
                    variant="destructive"
                    showLocked
                  >
                    Hapus
                  </ActionButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Contoh 2: Payment Verification dengan Audit Logging

```typescript
import { usePermissionsEnhanced } from "@/hooks/usePermissionsEnhanced";
import { ActionButton } from "@/components/auth/PermissionGuardEnhanced";
import { toast } from "sonner";

function PaymentVerificationForm() {
  const { performSensitiveAction, canPerformActionWithReason } = usePermissionsEnhanced();
  const [payment, setPayment] = useState(null);

  const handleVerifyPayment = async () => {
    // Check permission dengan reason
    const result = canPerformActionWithReason('payments', 'verify');
    if (!result.hasPermission) {
      toast.error(result.reason);
      return;
    }

    try {
      await performSensitiveAction(
        'payments',
        'verify',
        payment.id,
        async () => {
          const { error } = await supabase
            .from('payments')
            .update({ 
              status: 'paid',
              verified_at: new Date(),
              verified_by: userId
            })
            .eq('id', payment.id);
          
          if (error) throw error;
        },
        { status: payment.status, verified_at: null },
        { status: 'paid', verified_at: new Date() }
      );

      toast.success('Pembayaran berhasil diverifikasi');
      setPayment(null);
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleVerifyPayment(); }}>
      <div className="space-y-4">
        <div>
          <label>Kode Pembayaran</label>
          <input value={payment?.payment_code} disabled />
        </div>
        
        <div>
          <label>Jumlah</label>
          <input value={payment?.amount} disabled />
        </div>

        <ActionButton 
          resource="payments" 
          action="verify"
          type="submit"
          className="btn btn-primary"
        >
          Verifikasi Pembayaran
        </ActionButton>
      </div>
    </form>
  );
}
```

---

## Testing & Validasi

### Unit Testing untuk Permission Checks

```typescript
import { renderHook } from '@testing-library/react';
import { usePermissionsEnhanced } from '@/hooks/usePermissionsEnhanced';

describe('usePermissionsEnhanced', () => {
  it('should allow super_admin to perform any action', () => {
    // Mock super_admin role
    const { result } = renderHook(() => usePermissionsEnhanced());
    
    expect(result.current.hasPermission('bookings.delete')).toBe(true);
    expect(result.current.hasPermission('payments.verify')).toBe(true);
  });

  it('should restrict agent to view_own bookings', () => {
    // Mock agent role
    const { result } = renderHook(() => usePermissionsEnhanced());
    
    expect(result.current.hasPermission('bookings.view_own')).toBe(true);
    expect(result.current.hasPermission('bookings.view_all')).toBe(false);
    expect(result.current.hasPermission('bookings.delete')).toBe(false);
  });

  it('should allow branch_manager to view_branch only', () => {
    // Mock branch_manager role
    const { result } = renderHook(() => usePermissionsEnhanced());
    
    expect(result.current.hasPermission('bookings.view_branch')).toBe(true);
    expect(result.current.hasPermission('bookings.view_all')).toBe(false);
    expect(result.current.hasPermission('bookings.approve')).toBe(false);
  });

  it('should allow finance to verify payments', () => {
    // Mock finance role
    const { result } = renderHook(() => usePermissionsEnhanced());
    
    expect(result.current.hasPermission('payments.verify')).toBe(true);
    expect(result.current.canPerformAction('payments', 'verify')).toBe(true);
  });
});
```

### Integration Testing

```typescript
describe('Permission Integration Tests', () => {
  it('should prevent agent from deleting bookings', async () => {
    // Login as agent
    const { data: { user } } = await supabase.auth.signInWithPassword({
      email: 'agent@test.com',
      password: 'password'
    });

    // Try to delete booking
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', 'booking-id');

    expect(error).toBeDefined();
    expect(error.code).toBe('PGRST301'); // Permission denied
  });

  it('should allow finance to verify payments', async () => {
    // Login as finance
    const { data: { user } } = await supabase.auth.signInWithPassword({
      email: 'finance@test.com',
      password: 'password'
    });

    // Update payment status
    const { data, error } = await supabase
      .from('payments')
      .update({ status: 'paid' })
      .eq('id', 'payment-id');

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
});
```

---

## Troubleshooting

### Problem: Permission Denied Error pada Query

**Solusi:**
1. Verifikasi RLS policies sudah diterapkan dengan benar
2. Cek apakah user memiliki role yang sesuai di `user_roles` table
3. Pastikan `role_permissions` sudah terisi dengan permission yang benar

```sql
-- Debug query
SELECT ur.role, rp.permission_key, rp.is_enabled
FROM public.user_roles ur
LEFT JOIN public.role_permissions rp ON ur.role = rp.role
WHERE ur.user_id = 'user-id'
ORDER BY ur.role, rp.permission_key;
```

### Problem: Hook mengembalikan `isLoading: true` terus-menerus

**Solusi:**
1. Pastikan `useAuth()` sudah mengembalikan user dan roles
2. Cek koneksi ke Supabase
3. Verifikasi query permissions tidak error

```typescript
const { user, roles } = useAuth();
console.log('User:', user);
console.log('Roles:', roles);
```

### Problem: PermissionGuard tidak menampilkan children

**Solusi:**
1. Verifikasi permission key yang digunakan sudah ada di `permissions_list`
2. Cek apakah user memiliki permission tersebut di `role_permissions`
3. Gunakan browser DevTools untuk debug

```typescript
// Debug component
<PermissionGuardEnhanced 
  permission="bookings.edit"
  fallback={<div>Debug: No permission for bookings.edit</div>}
>
  <EditButton />
</PermissionGuardEnhanced>
```

### Problem: Audit log tidak terekam

**Solusi:**
1. Verifikasi `audit_logs` table sudah dibuat
2. Cek apakah trigger sudah aktif
3. Pastikan RLS policy pada `audit_logs` memungkinkan insert

```sql
-- Check triggers
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('payments', 'bookings', 'customers');

-- Check audit logs
SELECT * FROM public.audit_logs ORDER BY created_at DESC LIMIT 10;
```

---

## Kesimpulan

Implementasi RBAC granular ini memberikan:
- ✅ Kontrol akses yang lebih detail dan aman
- ✅ Pembatasan akses berdasarkan scope (all, branch, own)
- ✅ Audit trail untuk operasi sensitif
- ✅ UI yang responsif terhadap permission
- ✅ Error handling yang konsisten

Untuk pertanyaan lebih lanjut atau masalah implementasi, silakan hubungi tim development.
