# v3_numbered_features — Numbered Feature Migrations (063–068)

## Purpose
Feature-level migrations numbered sequentially (063–068), each implementing a discrete
product feature. Also includes standalone named migrations for the store, reviews, and
branch branding.

**Prefix collision fix:** Five pairs of files originally shared the same numeric prefix.
The secondary file in each pair has been renamed with a `b` suffix (e.g., `065b_`).
Both files in each pair must be applied — the `b` suffix only resolves ordering ambiguity.

## Contents (in execution order)

| File | Original Name | Feature | Dependencies |
|---|---|---|---|
| `063_hotel_room_numbers.sql` | — | Room number columns on `booking_passengers` (room_number_makkah, room_number_madinah, etc.) | v1_foundation |
| `064_mahram_room_compatibility.sql` | — | `check_mahram_room_conflicts()` function — detect unassigned mahram room conflicts | fase27, fase16 |
| `065_equipment_confirmation.sql` | — | Adds `confirmed_by_jamaah`, `confirmed_at`, `confirmed_by_admin_id` to `equipment_distributions` | v1_foundation |
| `065b_hotel_room_capacities.sql` | `065_hotel_room_capacities.sql` | `hotel_room_capacities` table — max rooms per type per hotel + capacity check function | v1_foundation |
| `066_equipment_distribution_photo.sql` | — | Adds photo URL columns to `equipment_distributions` + `update_distribution_photo()` helper | 065_equipment_confirmation |
| `066b_multi_hotel_per_city.sql` | `066_multi_hotel_per_city.sql` | Documents extension of `hotel_role` values in `departure_hotels` (no DDL changes — documentation only) | v1_foundation |
| `067_package_hpp_templates.sql` | — | `package_hpp_templates` table — cost-item templates per package, copied to `departure_cost_items` on apply | fase28 |
| `067b_package_type_equipment.sql` | `067_package_type_equipment.sql` | `package_type_equipment` table — default equipment list per package type | v1_foundation |
| `068_withdrawal_requests_extra.sql` | — | Adds `rejection_reason`, `processed_at`, `bank_details` to `withdrawal_requests` | v1_foundation |
| `068b_comprehensive_pl_triggers.sql` | `068_comprehensive_pl_triggers.sql` | Full auto-trigger P&L recalculation on bookings, cost_items, expenses, other_revenues changes | fase28 |
| `store_ecommerce.sql` | — | Full e-commerce schema: `store_categories`, `store_products`, `store_orders`, `store_order_items`, `store_shipments` + menu_items + role_permissions seed | v1_foundation |
| `store_product_reviews.sql` | — | `store_product_reviews` — customer ratings after delivered orders | store_ecommerce |
| `doc_sprint2_branch_branding_templates.sql` | — | Adds `signature_url`, `stamp_url`, `logo_url`, `letterhead_data` to `branches` | v1_foundation |

## Usage
```sql
-- Run after v2_sprint_phases:
\i v3_numbered_features/063_hotel_room_numbers.sql
\i v3_numbered_features/064_mahram_room_compatibility.sql
\i v3_numbered_features/065_equipment_confirmation.sql
\i v3_numbered_features/065b_hotel_room_capacities.sql
\i v3_numbered_features/066_equipment_distribution_photo.sql
\i v3_numbered_features/066b_multi_hotel_per_city.sql
\i v3_numbered_features/067_package_hpp_templates.sql
\i v3_numbered_features/067b_package_type_equipment.sql
\i v3_numbered_features/068_withdrawal_requests_extra.sql
\i v3_numbered_features/068b_comprehensive_pl_triggers.sql
\i v3_numbered_features/store_ecommerce.sql
\i v3_numbered_features/store_product_reviews.sql
\i v3_numbered_features/doc_sprint2_branch_branding_templates.sql
```

## Renamed Files (Collision Resolution)

| New Name | Old Name | Reason |
|---|---|---|
| `065b_hotel_room_capacities.sql` | `065_hotel_room_capacities.sql` | Shared prefix `065` with equipment_confirmation |
| `066b_multi_hotel_per_city.sql` | `066_multi_hotel_per_city.sql` | Shared prefix `066` with equipment_distribution_photo |
| `067b_package_type_equipment.sql` | `067_package_type_equipment.sql` | Shared prefix `067` with package_hpp_templates |
| `068b_comprehensive_pl_triggers.sql` | `068_comprehensive_pl_triggers.sql` | Shared prefix `068` with withdrawal_requests_extra |

## Dependencies
- `v1_foundation/` must be applied first.
- `v2_sprint_phases/` (specifically fase28) required before `067_package_hpp_templates` and `068b_comprehensive_pl_triggers`.

## Rollback
- No rollback scripts. Take DB snapshot before applying.
