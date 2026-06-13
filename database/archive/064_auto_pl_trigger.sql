-- ─── Migration 064: Auto-trigger P&L recalculation on departure completion ─────
-- When a departure status changes to 'completed', automatically recalculate
-- the departure_financial_summary so the P&L report is always up-to-date.

-- ─── 1. Trigger function ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_recalculate_pl_on_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Fire when status changes TO 'completed' from any other status
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    PERFORM recalculate_departure_financial_summary(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- ─── 2. Drop old trigger if exists ───────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_auto_recalculate_pl_on_complete ON departures;

-- ─── 3. Attach trigger to departures ─────────────────────────────────────────
CREATE TRIGGER trg_auto_recalculate_pl_on_complete
  AFTER UPDATE OF status ON departures
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_pl_on_complete();

-- ─── 4. Also add a manual RPC for on-demand recalculation ────────────────────
-- (Safe to call multiple times — idempotent)
CREATE OR REPLACE FUNCTION recalculate_all_departure_pl()
RETURNS TABLE(departure_id UUID, success BOOLEAN, error_msg TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_dep departures%ROWTYPE;
BEGIN
  FOR v_dep IN SELECT * FROM departures WHERE status IN ('completed', 'departed') LOOP
    BEGIN
      PERFORM recalculate_departure_financial_summary(v_dep.id);
      departure_id := v_dep.id;
      success      := TRUE;
      error_msg    := NULL;
      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      departure_id := v_dep.id;
      success      := FALSE;
      error_msg    := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION recalculate_all_departure_pl() TO authenticated;

COMMENT ON FUNCTION trigger_recalculate_pl_on_complete IS
  'Auto-triggers recalculate_departure_financial_summary when departure status changes to completed';
COMMENT ON FUNCTION recalculate_all_departure_pl IS
  'Batch recalculate P&L for all completed/departed departures — useful for backfill';
