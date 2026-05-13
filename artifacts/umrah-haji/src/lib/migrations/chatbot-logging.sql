-- ─── Chatbot Conversation Logging ────────────────────────────────────────────
-- Menyimpan setiap pasangan pesan-jawaban chatbot untuk analytics & rating.

CREATE TABLE IF NOT EXISTS chatbot_logs (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id  TEXT,                            -- random ID per browser session
  message     TEXT        NOT NULL,            -- pesan user
  answer      TEXT        NOT NULL,            -- jawaban bot
  source      TEXT        NOT NULL DEFAULT 'faq', -- 'gemini' | 'openai' | 'faq'
  rating      SMALLINT    CHECK (rating IN (-1, 1)),  -- 1=👍  -1=👎  NULL=belum dinilai
  customer_id UUID        REFERENCES customers(id) ON DELETE SET NULL,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  channel     TEXT        DEFAULT 'jamaah',    -- 'jamaah' | 'widget'
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_logs_created_at  ON chatbot_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chatbot_logs_session_id  ON chatbot_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_logs_customer_id ON chatbot_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_logs_source      ON chatbot_logs(source);

ALTER TABLE chatbot_logs ENABLE ROW LEVEL SECURITY;

-- Admin & super_admin bisa baca semua log
CREATE POLICY "admin_read_chatbot_logs" ON chatbot_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin','super_admin')
    )
  );

-- User bisa baca & update (rating) log milik sendiri
CREATE POLICY "user_read_own_chatbot_logs" ON chatbot_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_update_rating" ON chatbot_logs
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- API server (service role) bisa insert semua log — tidak butuh RLS policy
-- karena service role key bypass RLS by default.

COMMENT ON TABLE chatbot_logs IS
  'Log setiap pertukaran pesan-jawaban AI chatbot untuk analytics dan rating kualitas.';
