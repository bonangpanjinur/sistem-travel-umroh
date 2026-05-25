import {
  pgTable, uuid, text, boolean, integer, numeric, jsonb,
  timestamp, date,
} from "drizzle-orm/pg-core";

// ── packages ──────────────────────────────────────────────────────────────────
export const packages = pgTable("packages", {
  id: uuid("id").primaryKey().defaultRandom(),
  branchId: uuid("branch_id"),
  name: text("name").notNull(),
  type: text("type").notNull().default("umroh"),
  description: text("description"),
  highlights: text("highlights"),
  price: numeric("price", { precision: 15, scale: 2 }).notNull().default("0"),
  priceDouble: numeric("price_double", { precision: 15, scale: 2 }),
  priceTriple: numeric("price_triple", { precision: 15, scale: 2 }),
  priceQuad: numeric("price_quad", { precision: 15, scale: 2 }),
  durationDays: integer("duration_days").default(9),
  departureCity: text("departure_city"),
  airline: text("airline"),
  hotelMecca: text("hotel_mecca"),
  hotelMedina: text("hotel_medina"),
  includes: jsonb("includes").default([]),
  excludes: jsonb("excludes").default([]),
  terms: text("terms"),
  isActive: boolean("is_active").default(true),
  photoUrl: text("photo_url"),
  galleryUrls: jsonb("gallery_urls").default([]),
  quota: integer("quota").default(45),
  feeBranch: numeric("fee_branch", { precision: 5, scale: 2 }).default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── departures ─────────────────────────────────────────────────────────────────
export const departures = pgTable("departures", {
  id: uuid("id").primaryKey().defaultRandom(),
  packageId: uuid("package_id").notNull(),
  departureDate: date("departure_date").notNull(),
  returnDate: date("return_date"),
  quota: integer("quota").default(45),
  availableSeats: integer("available_seats").default(45),
  status: text("status").notNull().default("open"),
  notes: text("notes"),
  muthawifId: uuid("muthawif_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── push_subscriptions ────────────────────────────────────────────────────────
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id"),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  authKey: text("auth_key").notNull(),
  userAgent: text("user_agent"),
  muthawifId: uuid("muthawif_id"),
  userId: uuid("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── website_settings ──────────────────────────────────────────────────────────
export const websiteSettings = pgTable("website_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id"),
  branchId: uuid("branch_id"),
  companyName: text("company_name"),
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  activeTheme: text("active_theme").notNull().default("default"),
  primaryColor: text("primary_color"),
  accentColor: text("accent_color"),
  foregroundColor: text("foreground_color"),
  backgroundColor: text("background_color"),
  bodyFont: text("body_font"),
  headingFont: text("heading_font"),
  footerDescription: text("footer_description"),
  footerAddress: text("footer_address"),
  footerPhone: text("footer_phone"),
  footerEmail: text("footer_email"),
  footerWhatsapp: text("footer_whatsapp"),
  footerBottomText: text("footer_bottom_text"),
  footerLinks: jsonb("footer_links"),
  customSections: jsonb("custom_sections"),
  tagline: text("tagline"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── leads ─────────────────────────────────────────────────────────────────────
export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  packageId: uuid("package_id"),
  notes: text("notes"),
  source: text("source").default("api"),
  status: text("status").default("new"),
  branchId: uuid("branch_id"),
  agentId: uuid("agent_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── api_keys ──────────────────────────────────────────────────────────────────
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  keyHash: text("key_hash").notNull(),
  name: text("name"),
  permissions: jsonb("permissions").default([]),
  isActive: boolean("is_active").default(true),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── bookings ──────────────────────────────────────────────────────────────────
export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  departureId: uuid("departure_id"),
  customerId: uuid("customer_id"),
  bookingCode: text("booking_code"),
  status: text("status").default("pending"),
  roomNumber: text("room_number"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── customers ─────────────────────────────────────────────────────────────────
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"),
  branchId: uuid("branch_id"),
  fullName: text("full_name").notNull(),
  isTourLeader: boolean("is_tour_leader").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── app_settings ──────────────────────────────────────────────────────────────
export const appSettings = pgTable("app_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── faqs ──────────────────────────────────────────────────────────────────────
export const faqs = pgTable("faqs", {
  id: uuid("id").primaryKey().defaultRandom(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category").default("Umum"),
  sortOrder: integer("sort_order").default(0),
  isPublished: boolean("is_published").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── chatbot_logs ──────────────────────────────────────────────────────────────
export const chatbotLogs = pgTable("chatbot_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: text("session_id"),
  message: text("message").notNull(),
  answer: text("answer").notNull(),
  source: text("source").default("faq"),
  userId: uuid("user_id"),
  customerId: uuid("customer_id"),
  channel: text("channel").default("jamaah"),
  rating: integer("rating"),
  isUnanswered: boolean("is_unanswered").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── wa_templates ──────────────────────────────────────────────────────────────
export const waTemplates = pgTable("wa_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  messageTemplate: text("message_template").notNull(),
  variables: jsonb("variables").default([]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── wa_send_logs ──────────────────────────────────────────────────────────────
export const waSendLogs = pgTable("wa_send_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipientPhone: text("recipient_phone").notNull(),
  recipientName: text("recipient_name"),
  messageContent: text("message_content").notNull(),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  templateCode: text("template_code"),
  departureId: uuid("departure_id"),
  messageId: text("message_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type Package = typeof packages.$inferSelect;
export type Departure = typeof departures.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type WebsiteSettings = typeof websiteSettings.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type AppSetting = typeof appSettings.$inferSelect;
export type FAQ = typeof faqs.$inferSelect;
export type ChatbotLog = typeof chatbotLogs.$inferSelect;
