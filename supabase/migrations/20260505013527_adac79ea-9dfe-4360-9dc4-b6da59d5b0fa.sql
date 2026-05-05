
-- 1) website_settings: hero_display_mode
ALTER TABLE public.website_settings
  ADD COLUMN IF NOT EXISTS hero_display_mode text NOT NULL DEFAULT 'both';

-- 2) menu_items: is_visible flag
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true;

-- 3) Seed permissions_list (idempotent upsert)
INSERT INTO public.permissions_list (key, label, group_name) VALUES
  ('dashboard','Dashboard','Overview'),
  ('analytics','Analytics','Overview'),
  ('leads','Leads & Prospek','Penjualan'),
  ('bookings','Booking','Penjualan'),
  ('packages','Paket','Penjualan'),
  ('package-types','Tipe Paket','Penjualan'),
  ('coupons','Kupon & Promo','Penjualan'),
  ('announcements','Pengumuman','Konten & Marketing'),
  ('banners','Banner Carousel','Konten & Marketing'),
  ('landing-pages','Landing Page','Konten & Marketing'),
  ('marketing-materials','Materi Marketing','Konten & Marketing'),
  ('whatsapp','WhatsApp Blast','Konten & Marketing'),
  ('departures','Keberangkatan','Keberangkatan'),
  ('room-assignments','Kamar & Rooming','Keberangkatan'),
  ('haji','Manajemen Haji','Keberangkatan'),
  ('manasik','Manasik','Keberangkatan'),
  ('itinerary-templates','Template Itinerary','Keberangkatan'),
  ('equipment','Perlengkapan','Keberangkatan'),
  ('payments','Pembayaran','Keuangan'),
  ('finance-cash','Kas & Bank','Keuangan'),
  ('finance-ar','Piutang (AR)','Keuangan'),
  ('finance-ap','Hutang (AP)','Keuangan'),
  ('finance','Laporan P&L','Keuangan'),
  ('savings','Program Tabungan','Keuangan'),
  ('reports','Laporan','Keuangan'),
  ('advanced-reports','Laporan Lanjutan','Keuangan'),
  ('scheduled-reports','Laporan Terjadwal','Keuangan'),
  ('customers','Data Jamaah','Jamaah & Agen'),
  ('agents','Agen','Jamaah & Agen'),
  ('branches','Cabang','Jamaah & Agen'),
  ('loyalty','Program Loyalitas','Jamaah & Agen'),
  ('referrals','Referral','Jamaah & Agen'),
  ('visa','Visa','Jamaah & Agen'),
  ('hr','SDM / HR','SDM'),
  ('payroll','Penggajian','SDM'),
  ('document-verification','Verifikasi Dokumen','Dokumen'),
  ('document-types','Jenis Dokumen','Dokumen'),
  ('documents-generator','Generator Surat','Dokumen'),
  ('offline-content','Konten Offline','Dokumen'),
  ('support','Tiket Support','Dokumen'),
  ('hotels','Hotel','Master Data'),
  ('airlines','Maskapai','Master Data'),
  ('airports','Bandara','Master Data'),
  ('vendors','Vendor','Master Data'),
  ('muthawifs','Muthawif','Master Data'),
  ('bus-providers','Penyedia Bus','Master Data'),
  ('master-data','Master Data Lainnya','Master Data'),
  ('users','Manajemen User','Pengaturan'),
  ('roles','Manajemen Role','Pengaturan'),
  ('dashboard-access','Akses Dashboard','Pengaturan'),
  ('rbac-tools','RBAC Tools','Pengaturan'),
  ('rbac-status','Status RBAC','Pengaturan'),
  ('security-audit','Audit Keamanan','Pengaturan'),
  ('2fa','Pengaturan 2FA','Pengaturan'),
  ('appearance','Tampilan & Tema','Pengaturan'),
  ('settings','Pengaturan Umum','Pengaturan'),
  ('api-connect','API Connect','Pengaturan'),
  ('supabase-setup','Panduan Setup','Pengaturan')
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, group_name = EXCLUDED.group_name, updated_at = now();

-- 4) Seed menu_items (idempotent)
INSERT INTO public.menu_items (key, label, path, icon, group_name, sort_order, required_permission) VALUES
  ('dashboard','Dashboard','/admin','LayoutDashboard','Overview',101,'dashboard'),
  ('analytics','Analytics','/admin/analytics','BarChart3','Overview',102,'analytics'),
  ('leads','Leads & Prospek','/admin/leads','UserPlus','Penjualan',201,'leads'),
  ('bookings','Booking','/admin/bookings','BookOpen','Penjualan',202,'bookings'),
  ('packages','Paket Umroh & Haji','/admin/packages','Package','Penjualan',203,'packages'),
  ('package-types','Tipe Paket','/admin/package-types','Tag','Penjualan',204,'package-types'),
  ('coupons','Kupon & Promo','/admin/coupons','Ticket','Penjualan',205,'coupons'),
  ('announcements','Pengumuman','/admin/announcements','Megaphone','Konten & Marketing',301,'announcements'),
  ('banners','Banner Carousel','/admin/banners','Image','Konten & Marketing',302,'banners'),
  ('landing-pages','Landing Page','/admin/landing-pages','Globe','Konten & Marketing',303,'landing-pages'),
  ('marketing-materials','Materi Marketing','/admin/marketing-materials','Radio','Konten & Marketing',304,'marketing-materials'),
  ('whatsapp','WhatsApp Blast','/admin/whatsapp','MessageSquare','Konten & Marketing',305,'whatsapp'),
  ('departures','Jadwal Keberangkatan','/admin/departures','CalendarDays','Keberangkatan',401,'departures'),
  ('room-assignments','Kamar & Rooming','/admin/room-assignments','BedDouble','Keberangkatan',402,'room-assignments'),
  ('haji','Manajemen Haji','/admin/haji','MapPin','Keberangkatan',403,'haji'),
  ('manasik','Manasik','/admin/manasik','BookMarked','Keberangkatan',404,'manasik'),
  ('itinerary-templates','Template Itinerary','/admin/itinerary-templates','ListOrdered','Keberangkatan',405,'itinerary-templates'),
  ('equipment','Perlengkapan','/admin/equipment','Backpack','Keberangkatan',406,'equipment'),
  ('payments','Pembayaran','/admin/payments','CreditCard','Keuangan',501,'payments'),
  ('finance-cash','Kas & Bank','/admin/finance-cash','Coins','Keuangan',502,'finance-cash'),
  ('finance-ar','Piutang (AR)','/admin/finance/ar','ArrowDownToLine','Keuangan',503,'finance-ar'),
  ('finance-ap','Hutang (AP)','/admin/finance/ap','ArrowUpFromLine','Keuangan',504,'finance-ap'),
  ('finance','Laporan P&L','/admin/finance','TrendingUp','Keuangan',505,'finance'),
  ('savings','Program Tabungan','/admin/savings','PiggyBank','Keuangan',506,'savings'),
  ('reports','Laporan','/admin/reports','FileBarChart','Keuangan',507,'reports'),
  ('advanced-reports','Laporan Lanjutan','/admin/advanced-reports','LineChart','Keuangan',508,'advanced-reports'),
  ('scheduled-reports','Laporan Terjadwal','/admin/scheduled-reports','CalendarClock','Keuangan',509,'scheduled-reports'),
  ('customers','Data Jamaah','/admin/customers','Users','Jamaah & Agen',601,'customers'),
  ('agents','Agen','/admin/agents','UserSquare2','Jamaah & Agen',602,'agents'),
  ('branches','Cabang','/admin/branches','Network','Jamaah & Agen',603,'branches'),
  ('loyalty','Program Loyalitas','/admin/loyalty','Award','Jamaah & Agen',604,'loyalty'),
  ('referrals','Referral','/admin/referrals','Share2','Jamaah & Agen',605,'referrals'),
  ('visa','Visa','/admin/visa','FileCheck','Jamaah & Agen',606,'visa'),
  ('hr','SDM / HR','/admin/hr','UserCog','SDM',701,'hr'),
  ('payroll','Penggajian','/admin/hr/payroll','Wallet','SDM',702,'payroll'),
  ('document-verification','Verifikasi Dokumen','/admin/document-verification','FileSearch','Dokumen',801,'document-verification'),
  ('document-types','Jenis Dokumen','/admin/document-types','FileCog','Dokumen',802,'document-types'),
  ('documents-generator','Generator Surat','/admin/documents-generator','FileText','Dokumen',803,'documents-generator'),
  ('offline-content','Konten Offline','/admin/offline-content','WifiOff','Dokumen',804,'offline-content'),
  ('support','Tiket Support','/admin/support','LifeBuoy','Dokumen',805,'support'),
  ('hotels','Hotel','/admin/hotels','Hotel','Master Data',901,'hotels'),
  ('airlines','Maskapai','/admin/airlines','Plane','Master Data',902,'airlines'),
  ('airports','Bandara','/admin/airports','Building','Master Data',903,'airports'),
  ('vendors','Vendor','/admin/vendors','Store','Master Data',904,'vendors'),
  ('muthawifs','Muthawif','/admin/muthawifs','PersonStanding','Master Data',905,'muthawifs'),
  ('bus-providers','Penyedia Bus','/admin/bus-providers','Bus','Master Data',906,'bus-providers'),
  ('master-data','Master Data Lainnya','/admin/master-data','Database','Master Data',907,'master-data'),
  ('users','Manajemen User','/admin/users','Users2','Pengaturan',1001,'users'),
  ('roles','Manajemen Role','/admin/roles','ShieldCheck','Pengaturan',1002,'roles'),
  ('dashboard-access','Akses Dashboard','/admin/dashboard-access','LayoutGrid','Pengaturan',1003,'dashboard-access'),
  ('rbac-tools','RBAC Tools','/admin/rbac-tools','ShieldAlert','Pengaturan',1004,'rbac-tools'),
  ('rbac-status','Status RBAC','/admin/rbac-status','ShieldQuestion','Pengaturan',1005,'rbac-status'),
  ('security-audit','Audit Keamanan','/admin/security-audit','ScanSearch','Pengaturan',1006,'security-audit'),
  ('2fa','Pengaturan 2FA','/admin/2fa','KeyRound','Pengaturan',1007,'2fa'),
  ('appearance','Tampilan & Tema','/admin/appearance','Palette','Pengaturan',1008,'appearance'),
  ('settings','Pengaturan Umum','/admin/settings','Settings','Pengaturan',1009,'settings'),
  ('api-connect','API Connect','/admin/api-connect','Plug','Pengaturan',1010,'api-connect'),
  ('supabase-setup','Panduan Setup','/admin/supabase-setup','Database','Pengaturan',1011,'supabase-setup')
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label, path = EXCLUDED.path, icon = EXCLUDED.icon,
  group_name = EXCLUDED.group_name, sort_order = EXCLUDED.sort_order,
  required_permission = EXCLUDED.required_permission, updated_at = now();

-- 5) Seed default role_permissions
DO $$
DECLARE
  all_keys text[] := ARRAY(SELECT key FROM public.permissions_list);
  bm_keys text[] := ARRAY['dashboard','analytics','leads','bookings','packages','coupons','banners','departures','room-assignments','equipment','haji','manasik','payments','finance-cash','savings','reports','customers','agents','branches','visa','document-verification','document-types','hotels','airlines','airports','users','support','announcements','marketing-materials'];
  fin_keys text[] := ARRAY['dashboard','payments','finance-cash','finance','finance-ar','finance-ap','savings','reports','advanced-reports','scheduled-reports','bookings','customers'];
  sales_keys text[] := ARRAY['dashboard','leads','bookings','packages','coupons','customers','agents','payments','document-verification','referrals'];
  mkt_keys text[] := ARRAY['dashboard','analytics','leads','landing-pages','banners','marketing-materials','coupons','referrals','loyalty','whatsapp','announcements'];
  ops_keys text[] := ARRAY['dashboard','departures','room-assignments','equipment','haji','manasik','itinerary-templates','customers','bookings','document-verification','documents-generator','visa'];
  eq_keys text[] := ARRAY['dashboard','equipment','departures','customers'];
  agt_keys text[] := ARRAY['dashboard','leads','bookings','packages','customers','payments','referrals'];
  k text;
BEGIN
  -- owner: all
  FOREACH k IN ARRAY all_keys LOOP
    INSERT INTO public.role_permissions(role, permission_key, is_enabled)
    VALUES ('owner'::app_role, k, true) ON CONFLICT DO NOTHING;
  END LOOP;
  FOREACH k IN ARRAY bm_keys LOOP
    INSERT INTO public.role_permissions(role, permission_key, is_enabled)
    VALUES ('branch_manager'::app_role, k, true) ON CONFLICT DO NOTHING;
  END LOOP;
  FOREACH k IN ARRAY fin_keys LOOP
    INSERT INTO public.role_permissions(role, permission_key, is_enabled)
    VALUES ('finance'::app_role, k, true) ON CONFLICT DO NOTHING;
  END LOOP;
  FOREACH k IN ARRAY sales_keys LOOP
    INSERT INTO public.role_permissions(role, permission_key, is_enabled)
    VALUES ('sales'::app_role, k, true) ON CONFLICT DO NOTHING;
  END LOOP;
  FOREACH k IN ARRAY mkt_keys LOOP
    INSERT INTO public.role_permissions(role, permission_key, is_enabled)
    VALUES ('marketing'::app_role, k, true) ON CONFLICT DO NOTHING;
  END LOOP;
  FOREACH k IN ARRAY ops_keys LOOP
    INSERT INTO public.role_permissions(role, permission_key, is_enabled)
    VALUES ('operational'::app_role, k, true) ON CONFLICT DO NOTHING;
  END LOOP;
  FOREACH k IN ARRAY eq_keys LOOP
    INSERT INTO public.role_permissions(role, permission_key, is_enabled)
    VALUES ('equipment'::app_role, k, true) ON CONFLICT DO NOTHING;
  END LOOP;
  FOREACH k IN ARRAY agt_keys LOOP
    INSERT INTO public.role_permissions(role, permission_key, is_enabled)
    VALUES ('agent'::app_role, k, true) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- 6) RPC: get_user_effective_permissions_v2
CREATE OR REPLACE FUNCTION public.get_user_effective_permissions_v2(_user_id uuid, _roles text[])
RETURNS TABLE(permission_key text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH
    is_super AS (SELECT public.has_role(_user_id, 'super_admin'::app_role) AS yes),
    role_keys AS (
      SELECT rp.permission_key
      FROM public.role_permissions rp
      WHERE rp.is_enabled = true
        AND rp.role::text = ANY(_roles)
    ),
    user_overrides_on AS (
      SELECT up.permission_key FROM public.user_permissions up
      WHERE up.user_id = _user_id AND up.is_enabled = true
    ),
    user_overrides_off AS (
      SELECT up.permission_key FROM public.user_permissions up
      WHERE up.user_id = _user_id AND up.is_enabled = false
    )
  SELECT pl.key AS permission_key FROM public.permissions_list pl
    WHERE (SELECT yes FROM is_super)
  UNION
  SELECT permission_key FROM (
    SELECT permission_key FROM role_keys
    UNION
    SELECT permission_key FROM user_overrides_on
  ) merged
  WHERE NOT (SELECT yes FROM is_super)
    AND permission_key NOT IN (SELECT permission_key FROM user_overrides_off);
$$;

GRANT EXECUTE ON FUNCTION public.get_user_effective_permissions_v2(uuid, text[]) TO authenticated;

-- 7) RPC: get_menu_access_summary
CREATE OR REPLACE FUNCTION public.get_menu_access_summary()
RETURNS TABLE(role text, total_menus int, accessible_menus int, access_percentage numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH total AS (SELECT count(*)::int AS n FROM public.menu_items WHERE is_visible = true),
  per_role AS (
    SELECT r.role::text AS role,
      (SELECT count(DISTINCT mi.key)::int
        FROM public.menu_items mi
        JOIN public.role_permissions rp
          ON rp.permission_key = mi.required_permission
        WHERE mi.is_visible = true AND rp.is_enabled = true AND rp.role = r.role
      ) AS accessible
    FROM (
      SELECT unnest(ARRAY['owner','branch_manager','finance','operational','sales','marketing','equipment','agent']::app_role[]) AS role
    ) r
  )
  SELECT pr.role, t.n,
    pr.accessible,
    CASE WHEN t.n = 0 THEN 0 ELSE round((pr.accessible::numeric / t.n) * 100, 1) END
  FROM per_role pr CROSS JOIN total t
  UNION ALL
  SELECT 'super_admin', t.n, t.n, 100 FROM total t
  ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_menu_access_summary() TO authenticated;
