---
name: Sprint DOC-4 agent portal docs
description: Lessons from implementing F-11/13/17/19/20 — portal agen dokumen, bulk WA send, admin upload, deadline panel, sub-agent tracker
---

## SuratLunasData field names
- `totalAmount` (NOT `totalPrice`)
- `departureDate?: string` (NOT Date — pass raw ISO string or undefined)
- No `paymentDate` field exists in the interface

## xlsx missing from api-server
api-server imports `xlsx` in `routes/reports.ts` and `routes/v1/whatsapp.ts`.
It was missing from node_modules — fix: `pnpm add xlsx` inside `artifacts/api-server/`.

**Why:** xlsx is listed in package.json but wasn't installed in the environment. Any api-server restart that fails with ERR_MODULE_NOT_FOUND for xlsx → run `pnpm add xlsx` in api-server directory.

## Sprint DOC-4 file map
- F-11: `src/pages/agent/AgentDocuments.tsx` — agent portal generate & send docs
- F-13: `src/components/document-generator/BulkSendTab.tsx` — bulk WA send per departure (loops existing /api/documents/send-wa, no new backend route needed)
- F-17: `src/components/admin/AdminUploadForJamaah.tsx` — dialog for admin to upload on behalf of jamaah
- F-19: `src/components/admin/DocumentDeadlinePanel.tsx` — deadline picker + bulk WA reminder
- F-20: `src/pages/agent/AgentSubAgentDocTracker.tsx` — doc completion tracking for sub-agents' jamaah

## Routing pattern for DOC-4
- Agent routes: `/agent/documents` (all roles), `/agent/sub-agent-docs` (agentOnly)
- Nav: added to `navItems[]` array in `AgentLayoutEnhanced.tsx`
- Admin tabs: BulkSendTab + DocumentDeadlinePanel added as tabs `bulk-send` and `deadline` in `AdminDocumentGenerator.tsx`
- Admin verification: `AdminUploadForJamaah` dialog triggered by "Upload Dokumen Jamaah" button in `AdminDocumentVerification.tsx`

## Bulk WA send architecture
Frontend generates PDFs (jsPDF in browser), uploads to `customer-documents/temp-wa/`, gets signed URL (1h), sends link via existing `/api/documents/send-wa`. No new backend needed. Rate-limit: 1s delay between each send.
