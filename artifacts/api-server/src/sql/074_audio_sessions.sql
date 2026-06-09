-- ─── Guide Audio Sessions ─────────────────────────────────────────────────────
-- Tracks live audio broadcast sessions per departure (used by Tour Leader /
-- Muthawif to speak to jamaah in real-time via WebSocket relay).

CREATE TABLE IF NOT EXISTS guide_audio_sessions (
  id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id            uuid NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  title                   text NOT NULL DEFAULT 'Sesi Audio',
  session_type            text NOT NULL DEFAULT 'general'
                          CHECK (session_type IN ('general','doa','tawaf','sai','manasik','briefing','ziarah')),
  status                  text NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','ended')),
  current_speaker_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  started_by              uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at              timestamptz NOT NULL DEFAULT now(),
  ended_at                timestamptz,
  listener_count          integer NOT NULL DEFAULT 0,
  peak_listener_count     integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_guide_audio_sessions_departure ON guide_audio_sessions(departure_id);
CREATE INDEX IF NOT EXISTS idx_guide_audio_sessions_status    ON guide_audio_sessions(status);

ALTER TABLE guide_audio_sessions ENABLE ROW LEVEL SECURITY;

-- Admin/TL/muthawif can manage sessions
CREATE POLICY "guide_audio_admin" ON guide_audio_sessions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','branch_manager','operational')
  )
  OR departure_id IN (SELECT id FROM departures WHERE tour_leader_user_id = auth.uid())
  OR departure_id IN (
    SELECT d.id FROM departures d
    JOIN muthawifs m ON m.id = d.muthawif_id
    WHERE m.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Jamaah can read sessions for their active departure
CREATE POLICY "guide_audio_jamaah_read" ON guide_audio_sessions FOR SELECT USING (
  departure_id IN (
    SELECT b.departure_id FROM bookings b
    JOIN customers c ON c.id = b.customer_id
    WHERE c.user_id = auth.uid()
      AND b.status NOT IN ('cancelled')
  )
);
