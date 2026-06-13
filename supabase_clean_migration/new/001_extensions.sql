-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 001: Extensions & Prerequisites
-- Run first, before any other migration.
-- =============================================================================

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cryptographic functions (gen_random_bytes, gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Full-text search (Indonesian language support)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Unaccent for search normalization
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- HTTP calls from DB (for webhook triggers) — optional, skip if not available
-- CREATE EXTENSION IF NOT EXISTS "http";
