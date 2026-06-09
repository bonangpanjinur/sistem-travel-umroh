---
name: Equipment queued status flow
description: How queued status works in equipment_distributions and what UI components need to handle it
---

# Equipment Queued Status Flow

## The Rule
When fetching existing distributions for a jamaah's checklist, always fetch `status IN ('queued', 'distributed')`, NOT just `status = 'distributed'`.

**Why:** The trigger `trg_auto_queue_equipment` auto-creates `queued` records when booking is confirmed. If the checklist only fetches `distributed`, queued items are invisible — user checks them, calls `bulk_distribute_equipment` RPC which INSERTs a new `distributed` row = duplicate record.

**How to apply:**
- `EquipmentChecklist.tsx`: `existingDistributions` prop must include `status` field
- Save logic: `queued` items must be UPDATEd to `distributed` (no stock deduction again), NOT inserted via `bulk_distribute_equipment`
- New items (not in existingMap) → use `bulk_distribute_equipment` RPC (deducts stock)
- Canceling a queued item → UPDATE to `pending` status (not mark as returned)

## RPC bulk_distribute_equipment
Does INSERT only (does not upsert). Calling it when a `queued` record already exists = duplicate row. Always check existingMap before calling this RPC.

## Status flow
`queued` (auto-created at booking confirm) → `distributed` (staff confirms hand-off) → `returned` (item returned)
`queued` → `pending` (if staff cancels the queue item)
