-- Ensure admins can update subscriptions (required for manual activation)
-- Idempotent: drop and recreate policy

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can update subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can update subscriptions"
ON public.subscriptions
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::text))
WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

-- (Optional hardening) Ensure admins can select subscriptions as well
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::text));
