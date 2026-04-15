# UDAC Deployment Checklist

**Date**: 15 April 2026  
**Version**: 2.1 Granular  
**Status**: Ready for Production

---

## Pre-Deployment Verification

### Database & Backend
- [ ] All migration files applied successfully
- [ ] RLS policies enabled on all sensitive tables
- [ ] RPC functions `check_permission_v2` and `get_user_all_permissions` created
- [ ] Realtime subscriptions enabled for `user_permissions` table
- [ ] Audit table `user_permissions_audit` configured
- [ ] Database indexes created for performance

### Frontend Integration
- [ ] `useUdacPermissions` hook implemented in `AdminLayout.tsx`
- [ ] `UdacPermissionGuard` component available and working
- [ ] `UserPermissionsManager` integrated in `AdminUsers.tsx`
- [ ] Navigation sidebar filters based on permissions
- [ ] No broken UI elements or orphaned buttons

### Testing
- [ ] Manual testing completed for all 7 scenarios
- [ ] Super Admin access verified
- [ ] Branch Manager access restrictions verified
- [ ] User-level override functionality tested
- [ ] Real-time updates tested
- [ ] No console errors or warnings

### Security
- [ ] Backend RLS policies prevent unauthorized access
- [ ] Frontend checks are for UX only (not security)
- [ ] Audit logs recording all changes
- [ ] No sensitive data exposed in frontend

### Performance
- [ ] Page load time < 2 seconds
- [ ] Permission queries cached (5 minute staleTime)
- [ ] No N+1 queries
- [ ] Database indexes optimized

---

## Deployment Steps

### Step 1: Backup Production Database
```bash
# Create backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_*.sql
```

### Step 2: Apply Database Migrations
```bash
# List pending migrations
supabase migration list

# Apply migrations
supabase migration up

# Verify migrations applied
supabase migration list --local
```

### Step 3: Verify RLS Policies
```bash
# Check RLS policies
supabase query "SELECT * FROM pg_policies WHERE tablename IN ('user_permissions', 'role_permissions');"

# Expected output: Multiple policies for each table
```

### Step 4: Test RPC Functions
```bash
# Test check_permission_v2
supabase query "SELECT check_permission_v2('user-id', 'bookings.view');"

# Test get_user_all_permissions
supabase query "SELECT * FROM get_user_all_permissions('user-id') LIMIT 5;"

# Expected: Both should return results without errors
```

### Step 5: Deploy Frontend
```bash
# Build frontend
npm run build

# Verify build
ls -la dist/

# Deploy to production
npm run deploy
# or
vercel deploy --prod
```

### Step 6: Smoke Testing
```bash
# 1. Login as super_admin
# - Verify all menu items visible
# - Verify can access all pages

# 2. Login as branch_manager
# - Verify limited menu items
# - Verify data filtered by branch

# 3. Login as user with override
# - Verify override permission working
# - Verify sidebar updated

# 4. Check browser console
# - No errors
# - No warnings
# - Permissions loaded successfully
```

### Step 7: Monitor Logs
```bash
# Check application logs
tail -f logs/app.log

# Check Supabase logs
supabase logs

# Check for errors
grep -i error logs/app.log
```

---

## Post-Deployment Verification

### Immediate (First Hour)
- [ ] Application loads without errors
- [ ] Login works for all user types
- [ ] Admin panel accessible
- [ ] Sidebar navigation working
- [ ] No 500 errors in logs

### Short-term (First 24 Hours)
- [ ] All user types can access their permitted features
- [ ] Permission overrides working correctly
- [ ] Real-time updates functioning
- [ ] Audit logs recording changes
- [ ] No performance degradation

### Medium-term (First Week)
- [ ] Monitor for any permission-related issues
- [ ] Check audit logs for unusual patterns
- [ ] Verify backup integrity
- [ ] Gather user feedback

---

## Rollback Procedure

### If Issues Occur

#### Option 1: Revert Frontend Only
```bash
# Revert to previous version
git revert HEAD
npm run build
npm run deploy

# This keeps database changes but reverts UI
```

#### Option 2: Revert Database
```bash
# Restore from backup
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql

# Or rollback migrations
supabase migration down

# Then revert frontend
git revert HEAD
npm run build
npm run deploy
```

#### Option 3: Disable RLS Temporarily
```bash
# If RLS is causing issues
ALTER TABLE user_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY;

# Then investigate and re-enable after fix
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
```

---

## Troubleshooting During Deployment

### Issue: RLS Policy Errors
**Symptoms**: "permission denied" errors when accessing data

**Solution**:
1. Verify RLS policies are correctly defined
2. Check user has correct role in `user_roles` table
3. Verify RPC function logic
4. Check audit logs for denied access patterns

### Issue: Permissions Not Loading
**Symptoms**: Sidebar shows no menu items

**Solution**:
1. Check browser console for errors
2. Verify `get_user_all_permissions` RPC function works
3. Check user has at least one role
4. Verify permissions exist in `permissions_list`

### Issue: Performance Degradation
**Symptoms**: Slow page loads, high CPU usage

**Solution**:
1. Check database indexes are created
2. Verify query cache is working
3. Check for N+1 queries
4. Monitor database connections

### Issue: Real-time Updates Not Working
**Symptoms**: Permission changes don't reflect immediately

**Solution**:
1. Verify Supabase realtime is enabled
2. Check subscription is active
3. Clear browser cache
4. Refresh page

---

## Success Criteria

- [x] All phases (1-6) completed
- [x] Database schema implemented
- [x] RPC functions working
- [x] RLS policies enforced
- [x] Frontend components integrated
- [x] User-level override functional
- [x] Real-time updates working
- [x] Audit trail recording
- [x] Documentation complete
- [x] No critical issues in testing

---

## Sign-off

- **Prepared by**: Manus AI
- **Date**: 15 April 2026
- **Status**: ✅ Ready for Production Deployment

---

## Contact & Support

For deployment issues or questions:
- Check UDAC_IMPLEMENTATION_GUIDE.md for technical details
- Check UDAC_PHASE5_TEST_SUITE.md for testing procedures
- Contact development team for assistance
