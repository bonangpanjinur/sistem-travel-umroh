-- Migration: Add is_unanswered column to chatbot_logs (P6)
-- Run this in Supabase SQL Editor

ALTER TABLE chatbot_logs
  ADD COLUMN IF NOT EXISTS is_unanswered boolean NOT NULL DEFAULT false;

-- Index for fast filtering of unanswered questions
CREATE INDEX IF NOT EXISTS chatbot_logs_is_unanswered_idx
  ON chatbot_logs (is_unanswered)
  WHERE is_unanswered = true;

-- Also add channel column if not present (for P7 per-channel filtering)
ALTER TABLE chatbot_logs
  ADD COLUMN IF NOT EXISTS channel text DEFAULT 'jamaah';

CREATE INDEX IF NOT EXISTS chatbot_logs_channel_idx
  ON chatbot_logs (channel);
