-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration Chain
-- FILE 040: Additional Indexes for Tables 031–037
-- Run AFTER 039. Idempotent — IF NOT EXISTS throughout.
-- =============================================================================

-- ===========================================================================
-- Full-text search indexes (gin_trgm_ops)
-- ===========================================================================

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_ft_name
  ON public.customers USING gin(full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_customers_ft_email
  ON public.customers USING gin(COALESCE(email,'') gin_trgm_ops);

-- Blog
CREATE INDEX IF NOT EXISTS idx_blog_posts_ft_title
  ON public.blog_posts USING gin(title gin_trgm_ops);

-- Haji
CREATE INDEX IF NOT EXISTS idx_haji_registrations_ft_code
  ON public.haji_registrations USING gin(COALESCE(registration_code,'') gin_trgm_ops);

-- Support
CREATE INDEX IF NOT EXISTS idx_support_tickets_ft_subject
  ON public.support_tickets USING gin(subject gin_trgm_ops);

-- ===========================================================================
-- Date / temporal indexes
-- ===========================================================================

CREATE INDEX IF NOT EXISTS idx_attendance_records_date_employee
  ON public.attendance_records(date DESC, employee_id);

CREATE INDEX IF NOT EXISTS idx_loyalty_point_expiry_not_expired
  ON public.loyalty_point_expiry(expires_at)
  WHERE is_expired = FALSE;

CREATE INDEX IF NOT EXISTS idx_haji_registrations_status_year
  ON public.haji_registrations(status, preferred_year);

CREATE INDEX IF NOT EXISTS idx_vendor_contracts_status_end
  ON public.vendor_contracts(status, end_date)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_virtual_accounts_active
  ON public.virtual_accounts(status, expired_at)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_blog_posts_published
  ON public.blog_posts(published_at DESC)
  WHERE is_published = TRUE;

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_active
  ON public.marketing_campaigns(status, end_date)
  WHERE status IN ('active','draft');

-- ===========================================================================
-- Composite indexes for common join patterns
-- ===========================================================================

-- Booking-related
CREATE INDEX IF NOT EXISTS idx_booking_transfers_from_departure
  ON public.booking_transfers(from_departure_id, status);

CREATE INDEX IF NOT EXISTS idx_virtual_accounts_booking_status
  ON public.virtual_accounts(booking_id, status);

-- Departure operations
CREATE INDEX IF NOT EXISTS idx_bus_assignments_departure_status
  ON public.bus_assignments(departure_id, status);

CREATE INDEX IF NOT EXISTS idx_departure_checklists_completion
  ON public.departure_checklists(departure_id, is_completed);

CREATE INDEX IF NOT EXISTS idx_manifests_departure_type
  ON public.manifests(departure_id, type, status);

-- Customer tracking
CREATE INDEX IF NOT EXISTS idx_jamaah_live_locations_latest
  ON public.jamaah_live_locations(customer_id, departure_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_jamaah_qr_codes_active
  ON public.jamaah_qr_codes(departure_id, purpose)
  WHERE is_active = TRUE;

-- HR
CREATE INDEX IF NOT EXISTS idx_payroll_components_active
  ON public.payroll_components(employee_id, is_recurring)
  WHERE is_recurring = TRUE;

CREATE INDEX IF NOT EXISTS idx_leave_quotas_year_employee
  ON public.leave_quotas(year, employee_id, leave_type);

-- Activity
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_module_time
  ON public.activity_logs(user_id, module, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_entity
  ON public.activity_logs(entity_type, entity_id, created_at DESC);

-- Chatbot
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_unread
  ON public.chatbot_messages(conversation_id, is_read, created_at)
  WHERE is_read = FALSE;

-- Support tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_open_priority
  ON public.support_tickets(priority, created_at DESC)
  WHERE status IN ('open','in_progress');

-- Loyalty
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer_time
  ON public.loyalty_transactions(customer_id, created_at DESC);

-- Marketing
CREATE INDEX IF NOT EXISTS idx_marketing_material_downloads_material
  ON public.marketing_material_downloads(material_id, downloaded_at DESC);

-- Equipment
CREATE INDEX IF NOT EXISTS idx_equipment_stock_history_item_type
  ON public.equipment_stock_history(item_id, movement_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_equipment_opname_items_opname
  ON public.equipment_opname_items(opname_id, item_id);

-- SISKOHAT
CREATE INDEX IF NOT EXISTS idx_siskohat_registrations_sync
  ON public.siskohat_registrations(sync_status, synced_at)
  WHERE sync_status IN ('pending','failed');

CREATE INDEX IF NOT EXISTS idx_siskohat_sync_logs_status_time
  ON public.siskohat_sync_logs(status, created_at DESC);

-- ===========================================================================
-- Partial indexes for performance-critical filtered queries
-- ===========================================================================

-- Active haji registrations
CREATE INDEX IF NOT EXISTS idx_haji_active
  ON public.haji_registrations(status, customer_id)
  WHERE status NOT IN ('cancelled','completed');

-- Unpaid virtual accounts
CREATE INDEX IF NOT EXISTS idx_va_unpaid
  ON public.virtual_accounts(expired_at, booking_id)
  WHERE status = 'active';

-- Open support tickets by assignee
CREATE INDEX IF NOT EXISTS idx_support_open_assigned
  ON public.support_tickets(assigned_to, priority, created_at)
  WHERE status IN ('open','in_progress');

-- Active employee contracts
CREATE INDEX IF NOT EXISTS idx_employee_contracts_active
  ON public.employee_contracts(employee_id, end_date)
  WHERE status = 'active';

-- SOS live locations
CREATE INDEX IF NOT EXISTS idx_live_location_sos
  ON public.jamaah_live_locations(departure_id, recorded_at DESC)
  WHERE is_sos = TRUE;

SELECT '040_indexes_extended: OK — Performance indexes applied' AS result;
