-- Auto-reload PostgREST schema cache after any DDL change
CREATE OR REPLACE FUNCTION public.pgrst_watch_ddl()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
END;
$$;

DROP EVENT TRIGGER IF EXISTS pgrst_watch_ddl_end;
CREATE EVENT TRIGGER pgrst_watch_ddl_end
  ON ddl_command_end
  EXECUTE FUNCTION public.pgrst_watch_ddl();

DROP EVENT TRIGGER IF EXISTS pgrst_watch_drop;
CREATE EVENT TRIGGER pgrst_watch_drop
  ON sql_drop
  EXECUTE FUNCTION public.pgrst_watch_ddl();

-- Initial reload to pick up current state
NOTIFY pgrst, 'reload schema';