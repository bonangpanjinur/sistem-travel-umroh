---
name: bookings.status column vs booking_status alias
description: The real column name in bookings table is `status`, not `booking_status`
---

# bookings.status Column

## The Rule
The real column in the `bookings` table is `status` (not `booking_status`).

**Why:** `booking_status` is a SELECT alias used in views and RPCs for readability. PostgreSQL triggers and direct SQL must use the real column name `status`. Using `booking_status` in a trigger causes the trigger to be NEVER fired (no column by that name to watch).

**How to apply:**
- DB triggers: `AFTER UPDATE OF status ON bookings` (correct)
- DB triggers: `AFTER UPDATE OF booking_status ON bookings` (wrong — silently does nothing)
- Supabase JS client queries: can use either in SELECT aliases, but filters must use `status`
