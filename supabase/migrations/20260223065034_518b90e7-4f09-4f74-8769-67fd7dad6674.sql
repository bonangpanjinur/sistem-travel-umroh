
-- Create trigger function to notify agents when commission status changes
CREATE OR REPLACE FUNCTION public.notify_agent_commission_change()
RETURNS TRIGGER AS $$
DECLARE
  agent_user_id uuid;
  commission_status text;
  notif_title text;
  notif_message text;
  notif_type text;
BEGIN
  -- Only trigger on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get agent's user_id
  SELECT user_id INTO agent_user_id FROM public.agents WHERE id = NEW.agent_id;
  
  IF agent_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Build notification based on new status
  IF NEW.status = 'approved' THEN
    notif_title := 'Komisi Disetujui';
    notif_message := 'Komisi sebesar Rp ' || to_char(NEW.commission_amount, 'FM999,999,999') || ' telah disetujui.';
    notif_type := 'success';
  ELSIF NEW.status = 'paid' THEN
    notif_title := 'Komisi Dibayarkan';
    notif_message := 'Komisi sebesar Rp ' || to_char(NEW.commission_amount, 'FM999,999,999') || ' telah dibayarkan ke rekening Anda.';
    notif_type := 'success';
  ELSIF NEW.status = 'rejected' THEN
    notif_title := 'Komisi Ditolak';
    notif_message := 'Komisi sebesar Rp ' || to_char(NEW.commission_amount, 'FM999,999,999') || ' ditolak. Hubungi admin untuk info lebih lanjut.';
    notif_type := 'warning';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (agent_user_id, notif_title, notif_message, notif_type, '/agent/commissions');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_notify_agent_commission ON public.agent_commissions;
CREATE TRIGGER trg_notify_agent_commission
  AFTER UPDATE ON public.agent_commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_agent_commission_change();
