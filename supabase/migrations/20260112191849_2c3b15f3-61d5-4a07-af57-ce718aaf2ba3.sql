-- Drop existing VIP access policies for predictions
DROP POLICY IF EXISTS "Subscribed users can view VIP predictions" ON public.predictions;

-- Create new VIP access policy that includes developer email
CREATE POLICY "Subscribed users can view VIP predictions" 
ON public.predictions 
FOR SELECT 
USING (
  (prediction_type = 'vip'::text) 
  AND (
    (auth.uid() IN (SELECT active_vip_users.user_id FROM active_vip_users))
    OR (lower(auth.jwt() ->> 'email') = 'thgmail.com')
  )
);

-- Drop existing VIP access policies for prediction_bundles
DROP POLICY IF EXISTS "Subscribed users can view VIP bundles" ON public.prediction_bundles;

-- Create new VIP access policy that includes developer email
CREATE POLICY "Subscribed users can view VIP bundles" 
ON public.prediction_bundles 
FOR SELECT 
USING (
  (prediction_type = 'vip'::text) 
  AND (
    (auth.uid() IN (SELECT active_vip_users.user_id FROM active_vip_users))
    OR (lower(auth.jwt() ->> 'email') = 'thgmail.com')
  )
);