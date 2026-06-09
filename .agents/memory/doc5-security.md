---
name: DOC-5 Security Features
description: Pelajaran dari implementasi Sprint DOC-5 — verifikasi token, e-signature, audit trail
---

## Aturan

Neon PostgreSQL **tidak** memiliki `pgcrypto` extension sehingga `gen_random_bytes()` gagal.
Untuk token random, gunakan:
```sql
replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
```
Ini menghasilkan string 64-char hex-like yang cukup entropi untuk verifikasi token.

**Why:** Terlihat dari log migration 22_agent_status_branch_staff: `"function gen_random_bytes(integer) does not exist"`.

## Migration Key

Migration DOC-5 didaftarkan sebagai `"22_doc_security_features"` (bukan nomor file 22 — itu sudah dipakai oleh `22_agent_status_branch_staff`). Nama key di `isApplied()` harus unik.

## Tabel yang Dibuat

- `document_verify_tokens` — QR code / token verifikasi keaslian dokumen
- `customer_signatures` — tanda tangan digital jamaah (base64 PNG)
- `document_audit_logs` — audit trail semua aktivitas dokumen

## Komponen & Routes

- `DocVerifyPage.tsx` → `/verify/doc/:token` (public, no auth)
- `AdminDocumentAudit.tsx` → `/admin/document-audit`
- `JamaahSignaturePage.tsx` → `/jamaah/tanda-tangan`
- `SignaturePad.tsx` → canvas-based signature (mouse + touch, no external library)
- `ItineraryPDFTab.tsx` → tab itinerary di AdminDocumentGenerator, load dari itinerary_templates.days atau packages.itinerary
- `imageCompression.ts` → utility F-24 kompresi gambar, pure Canvas API, no library

## Backend Endpoints (documents.ts)

- `POST /api/documents/audit` — log event
- `GET /api/documents/audit` — query logs (admin)
- `POST /api/documents/verify-tokens` — issue token
- `GET /api/documents/verify/:token` — **public**, no auth
- `GET /api/documents/signature/:customerId` — get signature
- `POST /api/documents/signature/:customerId` — save/update signature
