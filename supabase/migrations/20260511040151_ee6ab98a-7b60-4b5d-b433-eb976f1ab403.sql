DROP POLICY IF EXISTS "Authenticated users manage referral_codes" ON public.referral_codes;

DROP POLICY IF EXISTS "Authenticated users manage referral_usages" ON public.referral_usages;

CREATE POLICY "Admins manage referral_usages"
ON public.referral_usages
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view ticket responses" ON public.ticket_responses;

CREATE POLICY "Users can view own ticket responses"
ON public.ticket_responses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_responses.ticket_id
      AND t.user_id = auth.uid()
  )
);
