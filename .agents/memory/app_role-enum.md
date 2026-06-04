---
name: app_role enum valid values
description: The live Supabase DB uses an app_role enum with only 6 values — using others in RLS policies causes migration failures.
---

## Rule
Only these 6 values are valid in the `app_role` enum:
- `super_admin`
- `owner`
- `branch_manager`
- `operational`
- `sales`
- `agent`

## NOT valid (will cause ERROR 22P02 in migrations)
- `admin`
- `staff`
- `finance`
- `marketing`
- `hr`
- `visa_officer`

**Why:** The foundation migration (`fase0_foundation.sql`) defined `user_roles.role` as TEXT with a CHECK constraint that includes many values. However, a later UUID migration converted the column to use an `app_role` enum type with only 6 values. Any RLS policy comparing `role IN (...)` with invalid values fails.

**How to apply:** In all migration files using `user_roles ur WHERE ur.role IN (...)`, only use the 6 valid values above. For financial/management access, use `('super_admin','owner','branch_manager','operational')`. For read-all access, use all 6.
