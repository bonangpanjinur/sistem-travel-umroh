---
name: RBAC Role Permissions Seeding
description: role_permissions table must be seeded for all staff roles or non-super_admin users get Akses Ditolak
type: feature
---
permissions_list group_name values are: Overview, Penjualan, Keuangan, Keberangkatan, Jamaah, Master Data, Pengaturan.
reset_role_permissions() must reference these exact group_names — never use legacy names like "Sales & CRM", "Operasional", "Dashboard".
If role_permissions is empty, get_user_effective_permissions returns [] for all non-super_admin users → DynamicMenuGate redirects to /access-denied.
Always seed role_permissions in a migration when introducing new permission keys; do not rely on the UI Resync button alone.
