# DocumentSettingsForm.tsx - DEPRECATED

## Status: ⚠️ DEPRECATED - Use DocumentSettingsForm.extended.tsx instead

This component has been **deprecated** and replaced by `DocumentSettingsForm.extended.tsx` as part of Phase 3 of the Document & Template Letter feature refactor.

## Migration Path

### Old Approach (Deprecated)
- File: `DocumentSettingsForm.tsx`
- Used legacy settings keys: `letterhead_show_logo`, `letterhead_show_website`, `invoice_accent_color`, etc.
- No support for per-document overrides
- Limited global settings management

### New Approach (Current)
- File: `DocumentSettingsForm.extended.tsx`
- Uses consolidated global settings: `pdf_global_*` keys
- Full support for per-document overrides via `DocumentLayoutEditor`
- Backward compatibility maintained via key synchronization
- Better separation of concerns: global vs per-document settings

## Integration Points

The new form is already integrated in:
- **Location**: `src/pages/admin/AdminSettings.tsx` (line 356)
- **Section**: "Dokumen & Template Surat"
- **Paired with**: `DocumentLayoutEditor` component (line 362)

## What Changed

### Global Settings (Consolidated)
All document-wide settings are now under `pdf_global_*` prefix:
- `pdf_global_font_family`
- `pdf_global_font_size_header`, `pdf_global_font_size_body`
- `pdf_global_text_color`, `pdf_global_accent_color`
- `pdf_global_show_logo`, `pdf_global_page_orientation`
- `pdf_global_show_website`, `pdf_global_show_timestamp`, etc.

### Per-Document Overrides (New)
Document-specific customizations are now managed via:
- `DocumentLayoutEditor` component
- Stored as `document_layout_{type}` JSON settings
- Supports: `invoice`, `passport_letter`, `leave_letter`, `certificate`, `general_letter`

### Backward Compatibility
Legacy keys are automatically synced with new global keys:
- `letterhead_show_logo` ↔ `pdf_global_show_logo`
- `letterhead_show_website` ↔ `pdf_global_show_website`
- `document_footer_show_timestamp` ↔ `pdf_global_show_timestamp`
- `pdf_default_font` ↔ `pdf_global_font_family`
- `invoice_accent_color` ↔ `pdf_global_accent_color`

## Why This File Still Exists

This file is kept for reference and historical context. It should NOT be imported or used in any active code.

### To Remove This File Safely:
1. Verify no imports of `DocumentSettingsForm` exist in the codebase
2. Check that all tests have been updated to use `DocumentSettingsFormExtended`
3. Delete both `DocumentSettingsForm.tsx` and this file
4. Update any documentation references

## Verification Checklist

- [x] `DocumentSettingsFormExtended` is integrated in `AdminSettings.tsx`
- [x] `DocumentLayoutEditor` is integrated in `AdminSettings.tsx`
- [x] Backward compatibility keys are synchronized
- [x] No active imports of legacy `DocumentSettingsForm`
- [x] All global settings use `pdf_global_*` prefix
- [x] Per-document overrides use `DocumentLayout` interface

## Related Files

- **New Form**: `src/components/admin/DocumentSettingsForm.extended.tsx`
- **Layout Editor**: `src/components/admin/appearance/DocumentLayoutEditor.tsx`
- **Settings Hook**: `src/hooks/useCompanySettings.ts`
- **Info Hook**: `src/hooks/useCompanyInfo.ts`
- **Generator**: `src/lib/document-generator.ts`
- **Admin Page**: `src/pages/admin/AdminSettings.tsx`

## Questions?

Refer to the improvement analysis document for detailed information about the refactoring process and design decisions.
