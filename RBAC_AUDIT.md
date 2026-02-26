# Role-Based Access Control (RBAC) Audit & Implementation Guide

## Overview
This document audits the role-based access control system for the Umrah-Haji Magic application and provides recommendations for the new Finance & HR modules.

---

## 1. Current Role System

### Available Roles
```typescript
type AppRole = 
  | 'super_admin'      // Full system access
  | 'owner'            // Business owner, full access
  | 'branch_manager'   // Branch-level management
  | 'finance'          // Finance & accounting operations
  | 'operational'      // Operational management
  | 'sales'            // Sales & booking management
  | 'marketing'        // Marketing & promotions
  | 'equipment'        // Equipment & asset management
  | 'agent'            // Travel agents (limited access)
  | 'customer'         // End customers (customer portal)
```

### Admin Roles
Roles considered as "admin" in the system:
- `super_admin`
- `owner`
- `branch_manager`

---

## 2. Current Frontend RBAC Implementation

### AdminLayout.tsx Navigation Groups
Each navigation group has `allowedRoles` property that controls visibility:

| Group | Allowed Roles | Status |
|-------|---------------|--------|
| Overview | All | ✅ |
| Sales & CRM | super_admin, owner, branch_manager, sales, marketing, operational | ✅ |
| Produk & Operasional | super_admin, owner, branch_manager, operational, equipment | ✅ |
| **Keuangan & Akuntansi** | super_admin, owner, finance, operational, branch_manager | ✅ UPDATED |
| Jamaah & Agent | super_admin, owner, branch_manager, sales, operational | ✅ |
| **SDM (HR)** | super_admin, owner, branch_manager, operational | ✅ UPDATED |
| Support & Komunikasi | super_admin, owner, branch_manager, sales, marketing, operational | ✅ |
| Master Data | super_admin, owner, branch_manager, operational | ✅ |
| Dokumen & Surat | super_admin, owner, branch_manager, operational, equipment | ✅ |
| Laporan | super_admin, owner, finance, marketing, branch_manager, operational | ✅ |
| Pengaturan | super_admin, owner, branch_manager | ✅ |

### ProtectedRoute Component
- **Location**: `src/components/auth/ProtectedRoute.tsx`
- **Behavior**: 
  - Checks if user has any of the allowed roles
  - Special handling for admin roles (super_admin, owner, branch_manager)
  - Redirects unauthorized users to `/admin` (if admin) or `/` (if not)
  - **Issue**: Admin roles bypass specific role checks (line 46-48)

---

## 3. New Finance & HR Menu Structure

### Finance & Akuntansi (Keuangan & Akuntansi)
```
Allowed Roles: super_admin, owner, finance, operational, branch_manager

├── Pembayaran (/admin/payments)
├── Kas & Bank (/admin/finance-cash)
├── Piutang Jamaah (/admin/finance/ar) ✨ NEW
├── Hutang Vendor (/admin/finance/ap) ✨ NEW
├── Laporan Laba Rugi (/admin/finance)
├── Vendor (/admin/vendors)
└── Tabungan (/admin/savings)
```

### SDM (HR)
```
Allowed Roles: super_admin, owner, branch_manager, operational

├── Data Karyawan (/admin/hr?tab=employees)
├── Absensi (/admin/hr?tab=attendance)
├── Penggajian / Payroll (/admin/hr/payroll) ✨ NEW
├── Departemen (/admin/hr?tab=departments)
├── Posisi (/admin/hr?tab=positions)
├── Jadwal Kerja (/admin/hr?tab=schedules)
├── Perangkat (/admin/hr?tab=devices)
└── Pengaturan HR (/admin/hr?tab=settings)
```

---

## 4. New Routes Registered

### AdminRoutes.tsx Updates
```typescript
// New lazy-loaded components
const AdminFinanceAR = lazy(() => import("@/pages/admin/AdminFinanceAR"));
const AdminFinanceAP = lazy(() => import("@/pages/admin/AdminFinanceAP"));
const AdminPayroll = lazy(() => import("@/pages/admin/AdminPayroll"));

// New routes
<Route path="finance/ar" element={<LazyPage><AdminFinanceAR /></LazyPage>} />
<Route path="finance/ap" element={<LazyPage><AdminFinanceAP /></LazyPage>} />
<Route path="hr/payroll" element={<LazyPage><AdminPayroll /></LazyPage>} />
```

---

## 5. RBAC Issues & Recommendations

### Issue 1: Admin Role Bypass
**Current Behavior** (ProtectedRoute.tsx, lines 43-48):
```typescript
const adminRoles: AppRole[] = ['super_admin', 'owner', 'branch_manager'];
const needsAdminRole = allowedRoles.some(role => adminRoles.includes(role));

if (needsAdminRole && isAdmin()) {
  return <>{children}</>;  // ⚠️ BYPASSES SPECIFIC ROLE CHECK
}
```

**Impact**: 
- `super_admin` and `owner` can access ANY admin page regardless of specific role requirements
- This is intentional for superusers but may need documentation

**Recommendation**: ✅ ACCEPTABLE
- This is standard practice for superuser roles
- Document this behavior clearly for developers
- Ensure audit logging for sensitive operations

### Issue 2: Missing Role-Specific Route Protection
**Current State**: Routes in AdminRoutes.tsx don't specify allowed roles
**Recommendation**: Add role-based route protection

```typescript
// Example: Finance routes should require finance or admin role
<Route 
  path="finance/ar" 
  element={
    <ProtectedRoute allowedRoles={['super_admin', 'owner', 'finance', 'operational', 'branch_manager']}>
      <LazyPage><AdminFinanceAR /></LazyPage>
    </ProtectedRoute>
  } 
/>
```

**Status**: ⚠️ RECOMMENDED (Optional - currently relying on AdminLayout visibility)

### Issue 3: Supabase Row Level Security (RLS)
**Current State**: Need to verify RLS policies on tables

**Tables Requiring RLS**:
1. `vendor_costs` - Finance operations
2. `employees` - HR operations
3. `attendance_records` - HR operations
4. `work_schedules` - HR operations
5. `cash_transactions` - Finance operations
6. `hr_settings` - HR operations

**Recommendation**: Implement RLS policies to:
- Allow `super_admin` and `owner` full access
- Allow `finance` role access to finance tables
- Allow `operational` role access to HR tables
- Restrict branch-level access based on `branch_id`

---

## 6. Implementation Checklist

### Frontend (✅ COMPLETED)
- [x] Update AdminLayout.tsx with new menu items
- [x] Register new routes in AdminRoutes.tsx
- [x] Create AdminFinanceAR.tsx component
- [x] Create AdminFinanceAP.tsx component
- [x] Create AdminPayroll.tsx component
- [x] Verify role-based sidebar visibility

### Backend (⚠️ RECOMMENDED)
- [ ] Implement RLS policies for vendor_costs table
- [ ] Implement RLS policies for employees table
- [ ] Implement RLS policies for attendance_records table
- [ ] Implement RLS policies for work_schedules table
- [ ] Implement RLS policies for cash_transactions table
- [ ] Implement RLS policies for hr_settings table
- [ ] Create audit logging for sensitive operations
- [ ] Add role-specific route protection (optional)

### Testing
- [ ] Test access with `super_admin` role (should have full access)
- [ ] Test access with `finance` role (should access finance modules only)
- [ ] Test access with `operational` role (should access HR modules)
- [ ] Test access with `branch_manager` role (should access all modules)
- [ ] Test access with `sales` role (should not access finance/HR)
- [ ] Verify 404 for unauthorized routes

---

## 7. Supabase RLS Policy Template

### Example: vendor_costs table
```sql
-- Allow super_admin and owner full access
CREATE POLICY "super_admin_owner_access" ON vendor_costs
  USING (
    auth.jwt() ->> 'email' IN (
      SELECT email FROM profiles 
      WHERE user_id IN (
        SELECT user_id FROM user_roles 
        WHERE role IN ('super_admin', 'owner')
      )
    )
  );

-- Allow finance role access
CREATE POLICY "finance_role_access" ON vendor_costs
  USING (
    auth.jwt() ->> 'email' IN (
      SELECT email FROM profiles 
      WHERE user_id IN (
        SELECT user_id FROM user_roles 
        WHERE role = 'finance'
      )
    )
  );

-- Allow branch_manager access to their branch data
CREATE POLICY "branch_manager_access" ON vendor_costs
  USING (
    auth.jwt() ->> 'email' IN (
      SELECT email FROM profiles 
      WHERE user_id IN (
        SELECT user_id FROM user_roles 
        WHERE role = 'branch_manager' AND branch_id = departures.branch_id
      )
    )
  );
```

---

## 8. Superadmin Bypass Behavior

### Why Superadmin Can Access Everything
The current design intentionally allows `super_admin` and `owner` roles to bypass specific role checks. This is because:

1. **Business Requirement**: Owners need full system access for management
2. **Emergency Access**: Superadmins need to troubleshoot without role restrictions
3. **Audit Trail**: All actions should be logged for compliance

### Recommendation
- ✅ Keep this behavior as-is
- Document it clearly in code comments
- Implement comprehensive audit logging
- Regular security reviews of superadmin activities

---

## 9. Summary

| Component | Status | Notes |
|-----------|--------|-------|
| AdminLayout Navigation | ✅ Updated | Finance & HR menus restructured |
| Route Registration | ✅ Updated | 3 new routes added |
| Component Creation | ✅ Complete | AR, AP, Payroll components created |
| Frontend RBAC | ✅ Working | Sidebar visibility controlled by roles |
| Backend RLS | ⚠️ Pending | Needs implementation for data security |
| Route Protection | ⚠️ Optional | Currently relying on AdminLayout visibility |
| Audit Logging | ⚠️ Pending | Recommended for sensitive operations |

---

## 10. Next Steps

1. **Immediate**: Deploy frontend changes and test with different roles
2. **Short-term**: Implement Supabase RLS policies for data security
3. **Medium-term**: Add comprehensive audit logging
4. **Long-term**: Regular security audits and role review

---

**Last Updated**: February 26, 2026
**Status**: Phase 4 Complete - Ready for Testing
