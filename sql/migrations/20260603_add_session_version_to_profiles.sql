-- Add session_version to profiles table to support server-side session revocation
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS session_version INTEGER DEFAULT 1;

-- Function to increment session_version (revoke all sessions)
CREATE OR REPLACE FUNCTION revoke_all_sessions(target_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET session_version = session_version + 1
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
