---
name: Sidebar User Permission Filtering
description: Menu sidebar difilter berdasarkan user_permissions (bukan role_permissions). Default semua tampil.
type: feature
---
`useDynamicMenus` memfilter menu berdasarkan `user_permissions`:
- Super Admin melihat semua menu (bypass)
- Staff lain: menu disembunyikan jika ada record `user_permissions` dengan `is_enabled = false`
- Default: semua menu tampil jika tidak ada override
