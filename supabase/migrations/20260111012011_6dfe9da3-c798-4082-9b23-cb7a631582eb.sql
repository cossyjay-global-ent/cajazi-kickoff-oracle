-- Create active VIP users view
CREATE OR REPLACE VIEW public.active_vip_users AS
SELECT DISTINCT user_id
FROM public.subscriptions
WHERE status = 'active'
  AND expires_at > now()
  AND user_id IS NOT NULL;

-- Grant access to the view
GRANT SELECT ON public.active_vip_users TO authenticated;

-- Drop existing VIP policies on predictions table
DROP POLICY IF EXISTS "Subscribed users can view VIP predictions" ON public.predictions;

-- Create new VIP access policy using the view
CREATE POLICY "Subscribed users can view VIP predictions"
ON public.predictions
FOR SELECT
USING (
  (prediction_type = 'vip' AND auth.uid() IN (SELECT user_id FROM public.active_vip_users))
);

-- Drop existing VIP policies on prediction_bundles table
DROP POLICY IF EXISTS "Subscribed users can view VIP bundles" ON public.prediction_bundles;

-- Create new VIP bundle access policy using the view
CREATE POLICY "Subscribed users can view VIP bundles"
ON public.prediction_bundles
FOR SELECT
USING (
  (prediction_type = 'vip' AND auth.uid() IN (SELECT user_id FROM public.active_vip_users))
);