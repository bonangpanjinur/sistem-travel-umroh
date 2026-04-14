# Fix Guest Checkout - Implementation Guide

## Overview

This guide provides step-by-step instructions to fix the guest checkout error:
- **Error 1**: `new row violates row-level security policy for table "customers"`
- **Error 2**: `401 Unauthorized` from console

## Root Causes

### 1. RLS Policy Conflict (Primary Issue)
- Multiple conflicting RLS policies for the `customers` table
- Older policy only allows `authenticated` users, not `anon` (anonymous/guest)
- Newer policies exist but may not be applied in production

### 2. Invalid auth.admin Calls (Secondary Issue)
- `guestCheckoutService.ts` uses `supabase.auth.admin.*` functions
- These require `service_role` key (backend only)
- Browser client only has `publishable_key` (frontend)
- Result: 401 Unauthorized error

---

## Solution Overview

### Part 1: Database Migration (Fix RLS Policy)
**File**: `supabase/migrations/20260414000007_fix_guest_checkout_rls.sql`

**What it does**:
1. Drops all conflicting RLS policies for `customers`, `bookings`, `booking_passengers`, `payments`
2. Creates new, clear policies that explicitly allow `anon` (anonymous) users
3. Maintains security by:
   - Guests can only insert records with `user_id = NULL`
   - Authenticated users can only insert their own records
   - Admins can insert any record

### Part 2: Frontend Fix (Remove auth.admin Calls)
**File**: `src/services/guestCheckoutService.ts`

**What it does**:
1. Removes all `supabase.auth.admin.*` calls
2. Returns success without creating auth account
3. User can login/register later to access booking
4. Includes comments for future backend RPC implementation

---

## Implementation Steps

### Step 1: Deploy Database Migration

```bash
# Navigate to project directory
cd umrah-haji-magic

# Option A: Using Supabase CLI (if configured)
supabase migration up

# Option B: Manual deployment
# 1. Go to Supabase Dashboard
# 2. Navigate to SQL Editor
# 3. Copy content of: supabase/migrations/20260414000007_fix_guest_checkout_rls.sql
# 4. Execute the SQL
```

### Step 2: Update Frontend Code

The file `src/services/guestCheckoutService.ts` has already been updated to:
- Remove `auth.admin.listUsers()` call
- Remove `auth.admin.createUser()` call
- Return success without creating auth account

**No additional changes needed** - the file is already fixed.

### Step 3: Test Guest Checkout

1. **Clear browser cache** (Ctrl+Shift+Delete or Cmd+Shift+Delete)
2. **Open incognito/private window** (to ensure no auth session)
3. **Navigate to booking page**
4. **Fill in booking details**:
   - Select departure date
   - Select number of passengers
   - Select room allocation
   - Fill in passenger data
   - Select PIC (registration source)
5. **Click "Konfirmasi Booking"**
6. **Expected result**: Booking succeeds without errors

### Step 4: Verify Database Changes

```sql
-- Check that new policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('customers', 'bookings', 'booking_passengers', 'payments')
ORDER BY tablename, policyname;

-- Check that old policies are gone
-- Should NOT see:
-- - "Authenticated users can insert customers"
-- - "Unified customer insert policy"
-- - "Simple guest checkout insert"
```

---

## Testing Checklist

### Guest Checkout Flow
- [ ] Guest can fill in booking form
- [ ] Guest can submit booking without login
- [ ] Booking is created successfully
- [ ] Customer record created with `user_id = NULL`
- [ ] Booking code is generated
- [ ] No RLS error appears
- [ ] No 401 error appears

### Authenticated User Flow
- [ ] Logged-in user can still book
- [ ] Booking is created with correct `user_id`
- [ ] Admin can still manage bookings

### Database Verification
- [ ] Old RLS policies are dropped
- [ ] New RLS policies are active
- [ ] Guest bookings have `user_id = NULL` in customers table
- [ ] Authenticated bookings have correct `user_id`

---

## Files Modified

### 1. New Migration
```
supabase/migrations/20260414000007_fix_guest_checkout_rls.sql
```
- Drops all conflicting RLS policies
- Creates new policies that allow guest checkout

### 2. Updated Service
```
src/services/guestCheckoutService.ts
```
- Removes `auth.admin.*` calls
- Returns success without creating auth account
- Includes documentation for future improvements

### 3. Analysis Document
```
ANALISIS_ERROR_RLS_GUEST_CHECKOUT.md
```
- Detailed root cause analysis
- Explanation of each error
- Recommendations for future improvements

---

## Future Improvements

### Option 1: Backend RPC for Guest Account Creation
Create a backend RPC function that can securely create auth accounts:

```sql
CREATE OR REPLACE FUNCTION public.create_guest_account_rpc(
  p_email TEXT,
  p_full_name TEXT,
  p_phone TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Implementation would use service role to create auth user
  -- Then create profile and return success
END;
$$;
```

Then call from frontend:
```typescript
const { data, error } = await supabase.rpc('create_guest_account_rpc', {
  p_email: email,
  p_full_name: fullName,
  p_phone: phone
});
```

### Option 2: Supabase Auth UI
Use Supabase's built-in Auth UI for guest registration:
```typescript
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'

export function GuestRegistration() {
  return (
    <Auth
      supabaseClient={supabase}
      appearance={{ theme: ThemeSupa }}
      providers={['google']}
    />
  )
}
```

### Option 3: Email Link Authentication
Use passwordless email link authentication for guests:
```typescript
const { error } = await supabase.auth.signInWithOtp({
  email: guestEmail,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  },
})
```

---

## Troubleshooting

### Issue: Still getting RLS error after deployment

**Solution**:
1. Clear Supabase cache: Go to Dashboard → Settings → Reset Database
2. Verify migration was applied: Check SQL Editor history
3. Check for conflicting policies: Run verification SQL above
4. Restart browser and clear cache

### Issue: Guest bookings not appearing in admin panel

**Solution**:
1. Check if admin has SELECT permission for guests (user_id = NULL)
2. May need to add SELECT policy for admins to view guest bookings
3. Add this policy if needed:
```sql
CREATE POLICY "Admins can view all bookings"
ON public.bookings FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'owner', 'admin')
  )
);
```

### Issue: 401 error still appears

**Solution**:
1. Verify `guestCheckoutService.ts` has been updated
2. Check browser console for which function is causing 401
3. If it's from `auth.admin.*`, ensure it's removed
4. Clear browser cache and reload

---

## Rollback Plan

If issues arise, rollback is simple:

```sql
-- Revert to previous policies
DROP POLICY IF EXISTS "Allow guest and authenticated customer insert" ON public.customers;
DROP POLICY IF EXISTS "Allow guest and authenticated booking insert" ON public.bookings;
DROP POLICY IF EXISTS "Allow guest and authenticated passenger insert" ON public.booking_passengers;
DROP POLICY IF EXISTS "Allow guest and authenticated payment insert" ON public.payments;

-- Recreate old policies (from 20260414000006_simple_guest_rls.sql)
-- OR use Supabase's migration rollback feature
```

---

## Summary

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| RLS Error | Multiple conflicting policies | New migration drops old policies, creates clear new one |
| 401 Error | `auth.admin.*` calls from browser | Remove calls, return success, user registers later |
| Guest Checkout Broken | Both issues combined | Deploy migration + update service |

---

## Support

If you encounter issues:
1. Check `ANALISIS_ERROR_RLS_GUEST_CHECKOUT.md` for detailed analysis
2. Review this implementation guide
3. Check browser console for specific error messages
4. Verify all files have been updated correctly
