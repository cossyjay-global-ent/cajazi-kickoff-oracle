-- Drop policies first, then recreate view with security invoker
DROP POLICY IF EXISTS "Subscribed users can view VIP predictions" ON public.predictions;
DROP POLICY IF EXISTS "Subscribed users can view VIP bundles" ON public.prediction_bundles;

-- Now drop and recreate the view
DROP VIEW IF EXISTS public.active_vip_users;

-- Create view with SECURITY INVOKER to fix the security definer warning
CREATE VIEW public.active_vip_users 
WITH (security_invoker = true)
AS
SELECT DISTINCT user_id
FROM public.subscriptions
WHERE status = 'active'
  AND expires_at > now()
  AND user_id IS NOT NULL;

-- Grant access
GRANT SELECT ON public.active_vip_users TO authenticated;

-- Recreate policies using the view
CREATE POLICY "Subscribed users can view VIP predictions"
ON public.predictions
FOR SELECT
USING (
  prediction_type = 'vip' AND auth.uid() IN (SELECT user_id FROM public.active_vip_users)
);

CREATE POLICY "Subscribed users can view VIP bundles"
ON public.prediction_bundles
FOR SELECT
USING (
  prediction_type = 'vip' AND auth.uid() IN (SELECT user_id FROM public.active_vip_users)
);