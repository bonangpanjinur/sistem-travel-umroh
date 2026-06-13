-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration Chain
-- FILE 006: Performance Indexes
-- Run AFTER 005. Safe to re-run.
--
-- Setiap CREATE INDEX dibungkus exception handler individual.
-- Jika kolom belum ada (tabel dari migrasi lama), index di-skip dengan NOTICE
-- bukan ERROR — sehingga file tetap berjalan sampai selesai.
-- =============================================================================

DO $$
BEGIN

-- ---------------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_profiles_role       ON public.profiles(role);       EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_profiles_role: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_profiles_is_active  ON public.profiles(is_active);  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_profiles_is_active: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_profiles_email      ON public.profiles(email);      EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_profiles_email: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- USER_ROLES
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_user_roles_user_id  ON public.user_roles(user_id);  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_user_roles_user_id: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_user_roles_role     ON public.user_roles(role);     EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_user_roles_role: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_notifications_user_id  ON public.notifications(user_id);           EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_notifications_user_id: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_notifications_is_read  ON public.notifications(is_read);           EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_notifications_is_read: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_notifications_created  ON public.notifications(created_at DESC);   EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_notifications_created: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- PUSH_SUBSCRIPTIONS / PUSH_OUTBOX
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user  ON public.push_subscriptions(user_id);   EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_push_subscriptions_user: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_push_outbox_status        ON public.push_outbox(status);          EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_push_outbox_status: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_push_outbox_user          ON public.push_outbox(user_id);         EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_push_outbox_user: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- BRANCHES
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_branches_slug       ON public.branches(slug);       EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_branches_slug: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_branches_is_active  ON public.branches(is_active);  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_branches_is_active: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- AGENTS
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_agents_user_id      ON public.agents(user_id);      EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_agents_user_id: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_agents_branch_id    ON public.agents(branch_id);    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_agents_branch_id: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_agents_slug         ON public.agents(slug);         EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_agents_slug: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_agents_status       ON public.agents(status);       EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_agents_status: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_agents_agent_code   ON public.agents(agent_code);   EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_agents_agent_code: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- EMPLOYEES
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_employees_user_id    ON public.employees(user_id);          EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_employees_user_id: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_employees_branch_id  ON public.employees(branch_id);        EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_employees_branch_id: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_employees_status     ON public.employees(status);            EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_employees_status: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_employees_code       ON public.employees(employee_code);     EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_employees_code: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- MUTHAWIFS
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_muthawifs_branch_id  ON public.muthawifs(branch_id);    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_muthawifs_branch_id: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_muthawifs_available  ON public.muthawifs(is_available); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_muthawifs_available: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- WEBSITE_SETTINGS
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_website_settings_agent   ON public.website_settings(agent_id);   EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_website_settings_agent: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_website_settings_branch  ON public.website_settings(branch_id);  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_website_settings_branch: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- AIRLINES / HOTELS / AIRPORTS
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_airlines_iata_code  ON public.airlines(iata_code);   EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_airlines_iata_code: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_hotels_city         ON public.hotels(city);          EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_hotels_city: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_airports_iata       ON public.airports(iata_code);   EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_airports_iata: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- PACKAGES
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_packages_package_type  ON public.packages(package_type);  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_packages_package_type: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_packages_slug          ON public.packages(slug);          EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_packages_slug: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_packages_is_published  ON public.packages(is_published);  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_packages_is_published: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_packages_is_featured   ON public.packages(is_featured);   EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_packages_is_featured: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_packages_airline       ON public.packages(airline_id);    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_packages_airline: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_packages_group         ON public.packages(group_id);      EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_packages_group: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_packages_name_trgm     ON public.packages USING gin(name gin_trgm_ops); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_packages_name_trgm: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- DEPARTURES
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_departures_package_id      ON public.departures(package_id);      EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_departures_package_id: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_departures_departure_date  ON public.departures(departure_date);  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_departures_departure_date: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_departures_status          ON public.departures(status);          EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_departures_status: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_departures_branch          ON public.departures(branch_id);       EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_departures_branch: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_departures_available       ON public.departures(available_seats); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_departures_available: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- CUSTOMERS
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_customers_user_id    ON public.customers(user_id);     EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_customers_user_id: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_customers_branch_id  ON public.customers(branch_id);   EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_customers_branch_id: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_customers_agent_id   ON public.customers(agent_id);    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_customers_agent_id: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_customers_nik        ON public.customers(nik);         EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_customers_nik: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_customers_passport   ON public.customers(passport_no); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_customers_passport: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_customers_phone      ON public.customers(phone);       EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_customers_phone: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_customers_status     ON public.customers(status);      EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_customers_status: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_customers_name_trgm  ON public.customers USING gin(full_name gin_trgm_ops); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_customers_name_trgm: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- CUSTOMER_ACCOUNTS
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_customer_accounts_user     ON public.customer_accounts(user_id);                EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_customer_accounts_user: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_customer_accounts_customer ON public.customer_accounts(customer_id);            EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_customer_accounts_customer: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_customer_accounts_agent    ON public.customer_accounts(referred_by_agent_id);   EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_customer_accounts_agent: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- LEADS
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_leads_status       ON public.leads(status);           EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_leads_status: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_leads_assigned_to  ON public.leads(assigned_to);      EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_leads_assigned_to: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_leads_branch       ON public.leads(branch_id);        EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_leads_branch: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_leads_agent        ON public.leads(agent_id);         EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_leads_agent: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_leads_created      ON public.leads(created_at DESC);  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_leads_created: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- BOOKINGS
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_bookings_booking_code     ON public.bookings(booking_code);       EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_bookings_booking_code: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_bookings_customer_id      ON public.bookings(customer_id);        EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_bookings_customer_id: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_bookings_departure_id     ON public.bookings(departure_id);       EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_bookings_departure_id: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_bookings_agent_id         ON public.bookings(agent_id);           EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_bookings_agent_id: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_bookings_branch_id        ON public.bookings(branch_id);          EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_bookings_branch_id: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_bookings_status           ON public.bookings(status);             EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_bookings_status: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_bookings_payment_status   ON public.bookings(payment_status);     EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_bookings_payment_status: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_bookings_created          ON public.bookings(created_at DESC);    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_bookings_created: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_bookings_payment_deadline ON public.bookings(payment_deadline);   EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_bookings_payment_deadline: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- BOOKING_PASSENGERS / SEAT_LOCKS
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_booking_passengers_booking   ON public.booking_passengers(booking_id);   EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_booking_passengers_booking: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_booking_passengers_customer  ON public.booking_passengers(customer_id);  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_booking_passengers_customer: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_seat_locks_departure  ON public.booking_seat_locks(departure_id);        EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_seat_locks_departure: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_seat_locks_expires    ON public.booking_seat_locks(expires_at);          EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_seat_locks_expires: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- PAYMENTS / PAYMENT_DEADLINE_REMINDERS
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_payments_booking_id    ON public.payments(booking_id);           EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_payments_booking_id: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_payments_status        ON public.payments(status);               EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_payments_status: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_payments_payment_date  ON public.payments(payment_date DESC);    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_payments_payment_date: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_payments_verified_by   ON public.payments(verified_by);          EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_payments_verified_by: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_pdr_booking_id   ON public.payment_deadline_reminders(booking_id);  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_pdr_booking_id: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_pdr_status       ON public.payment_deadline_reminders(status);       EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_pdr_status: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- SAVINGS_PLANS / DEPOSITS / SCHEDULES
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_savings_plans_customer  ON public.savings_plans(customer_id);    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_savings_plans_customer: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_savings_plans_status    ON public.savings_plans(status);         EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_savings_plans_status: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_savings_deposits_plan   ON public.savings_deposits(plan_id);     EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_savings_deposits_plan: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_savings_schedules_plan  ON public.savings_schedules(plan_id);    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_savings_schedules_plan: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_savings_schedules_due   ON public.savings_schedules(due_date);   EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_savings_schedules_due: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- COUPONS
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_coupons_code       ON public.coupons(code);       EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_coupons_code: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_coupons_is_active  ON public.coupons(is_active);  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_coupons_is_active: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- VISA_APPLICATIONS
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_visa_booking_id   ON public.visa_applications(booking_id);   EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_visa_booking_id: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_visa_customer_id  ON public.visa_applications(customer_id);  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_visa_customer_id: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_visa_status       ON public.visa_applications(status);       EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_visa_status: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- MANASIK_SESSIONS
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_manasik_departure  ON public.manasik_sessions(departure_id);  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_manasik_departure: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_manasik_date       ON public.manasik_sessions(session_date);  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_manasik_date: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- ROOM_ASSIGNMENTS
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_room_assign_departure  ON public.room_assignments(departure_id);  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_room_assign_departure: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_room_assign_hotel      ON public.room_assignments(hotel_id);      EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_room_assign_hotel: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- EQUIPMENT_DISTRIBUTIONS
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_equip_dist_departure  ON public.equipment_distributions(departure_id);  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_equip_dist_departure: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_equip_dist_booking    ON public.equipment_distributions(booking_id);    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_equip_dist_booking: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_equip_dist_customer   ON public.equipment_distributions(customer_id);   EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_equip_dist_customer: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- SOS_ALERTS
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_sos_customer  ON public.sos_alerts(customer_id);       EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_sos_customer: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_sos_status    ON public.sos_alerts(status);            EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_sos_status: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_sos_severity  ON public.sos_alerts(severity);          EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_sos_severity: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_sos_created   ON public.sos_alerts(created_at DESC);   EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_sos_created: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- APPROVAL_REQUESTS
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_approval_status     ON public.approval_requests(status);        EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_approval_status: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_approval_type       ON public.approval_requests(type);          EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_approval_type: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_approval_requested  ON public.approval_requests(requested_by);  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_approval_requested: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- CHART_OF_ACCOUNTS / JOURNAL_ENTRIES / LINES
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_coa_code  ON public.chart_of_accounts(code);  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_coa_code: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_coa_type  ON public.chart_of_accounts(type);  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_coa_type: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_journal_date    ON public.journal_entries(entry_date DESC);                  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_journal_date: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_journal_status  ON public.journal_entries(status);                          EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_journal_status: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_journal_type    ON public.journal_entries(type);                            EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_journal_type: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_journal_ref     ON public.journal_entries(reference_type, reference_id);    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_journal_ref: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_journal_lines_journal  ON public.journal_lines(journal_id);    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_journal_lines_journal: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_journal_lines_account  ON public.journal_lines(account_code);  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_journal_lines_account: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- VENDOR_INVOICES
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_vendor_inv_vendor     ON public.vendor_invoices(vendor_id);     EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_vendor_inv_vendor: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_vendor_inv_departure  ON public.vendor_invoices(departure_id);  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_vendor_inv_departure: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_vendor_inv_status     ON public.vendor_invoices(status);        EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_vendor_inv_status: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- COMMISSIONS
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_commissions_booking  ON public.commissions(booking_id);  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_commissions_booking: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_commissions_agent    ON public.commissions(agent_id);    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_commissions_agent: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_commissions_status   ON public.commissions(status);      EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_commissions_status: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_commissions_type     ON public.commissions(type);        EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_commissions_type: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- PAYROLL / SLIPS
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_payroll_period          ON public.payroll(period_year, period_month);  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_payroll_period: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_payroll_slips_payroll   ON public.payroll_slips(payroll_id);          EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_payroll_slips_payroll: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_payroll_slips_employee  ON public.payroll_slips(employee_id);         EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_payroll_slips_employee: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- DEPARTURE_COST_ITEMS / EXPENSES / OTHER_REVENUES
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_dep_cost_departure     ON public.departure_cost_items(departure_id);      EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_dep_cost_departure: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_dep_expense_departure  ON public.departure_expenses(departure_id);        EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_dep_expense_departure: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_dep_otherrev_departure ON public.departure_other_revenues(departure_id);  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_dep_otherrev_departure: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- LOYALTY_POINTS
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_loyalty_customer  ON public.loyalty_points(customer_id);  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_loyalty_customer: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_loyalty_type      ON public.loyalty_points(type);         EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_loyalty_type: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- STORE_PRODUCTS / ORDERS
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_store_products_category  ON public.store_products(category_id);   EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_store_products_category: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_store_products_slug      ON public.store_products(slug);          EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_store_products_slug: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_store_products_published ON public.store_products(is_published);  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_store_products_published: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_store_orders_customer    ON public.store_orders(customer_id);     EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_store_orders_customer: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_store_orders_status      ON public.store_orders(status);          EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_store_orders_status: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_store_orders_payment     ON public.store_orders(payment_status);  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_store_orders_payment: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_store_orders_created     ON public.store_orders(created_at DESC); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_store_orders_created: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- WA_SEND_LOGS / WA_BROADCAST
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_wa_logs_booking              ON public.wa_send_logs(booking_id);         EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_wa_logs_booking: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_wa_logs_customer             ON public.wa_send_logs(customer_id);        EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_wa_logs_customer: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_wa_logs_status               ON public.wa_send_logs(status);             EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_wa_logs_status: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_wa_logs_phone                ON public.wa_send_logs(phone);              EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_wa_logs_phone: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_wa_logs_created              ON public.wa_send_logs(created_at DESC);    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_wa_logs_created: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_wa_broadcast_status          ON public.wa_broadcast_campaigns(status);   EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_wa_broadcast_status: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_wa_broadcast_logs_campaign   ON public.wa_broadcast_logs(campaign_id);   EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_wa_broadcast_logs_campaign: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_wa_broadcast_logs_status     ON public.wa_broadcast_logs(status);        EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_wa_broadcast_logs_status: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- AUDIT_LOGS
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_audit_user     ON public.audit_logs(user_id);           EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_audit_user: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_audit_table    ON public.audit_logs(table_name);        EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_audit_table: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_audit_action   ON public.audit_logs(action);            EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_audit_action: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_audit_created  ON public.audit_logs(created_at DESC);   EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_audit_created: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- CUSTOMER_DOCUMENTS
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_cust_docs_customer  ON public.customer_documents(customer_id);   EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_cust_docs_customer: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_cust_docs_booking   ON public.customer_documents(booking_id);    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_cust_docs_booking: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_cust_docs_status    ON public.customer_documents(status);        EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_cust_docs_status: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_cust_docs_type      ON public.customer_documents(document_type); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_cust_docs_type: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- WAITING_LIST
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_waiting_list_departure  ON public.waiting_list(departure_id);  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_waiting_list_departure: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_waiting_list_customer   ON public.waiting_list(customer_id);   EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_waiting_list_customer: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_waiting_list_status     ON public.waiting_list(status);        EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_waiting_list_status: %', SQLERRM; END;

-- ---------------------------------------------------------------------------
-- OTP_CODES
-- ---------------------------------------------------------------------------
BEGIN CREATE INDEX IF NOT EXISTS idx_otp_identifier  ON public.otp_codes(identifier);   EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_otp_identifier: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_otp_expires     ON public.otp_codes(expires_at);   EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_otp_expires: %', SQLERRM; END;
BEGIN CREATE INDEX IF NOT EXISTS idx_otp_user        ON public.otp_codes(user_id);      EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SKIP idx_otp_user: %', SQLERRM; END;

END;
$$;

SELECT '006_indexes: OK' AS result;
