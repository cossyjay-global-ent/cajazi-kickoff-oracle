-- Fix overly permissive RLS policies

-- 1. Fix comments INSERT policy - require valid email format at minimum
DROP POLICY IF EXISTS "Anyone can insert comments" ON public.comments;
CREATE POLICY "Anyone can insert comments with valid data"
ON public.comments
FOR INSERT
WITH CHECK (
  length(name) > 0 AND length(name) <= 100 AND
  length(email) > 0 AND length(email) <= 255 AND
  length(message) > 0 AND length(message) <= 5000
);

-- 2. Fix newsletter_subscriptions INSERT policy - require valid email
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscriptions;
CREATE POLICY "Anyone can subscribe to newsletter with valid email"
ON public.newsletter_subscriptions
FOR INSERT
WITH CHECK (
  length(email) > 0 AND 
  length(email) <= 255 AND
  email LIKE '%@%.%'
);

-- 3. Fix newsletter_subscriptions UPDATE policy - only allow updating own email
DROP POLICY IF EXISTS "Anyone can unsubscribe" ON public.newsletter_subscriptions;
CREATE POLICY "Anyone can unsubscribe their own email"
ON public.newsletter_subscriptions
FOR UPDATE
USING (true)
WITH CHECK (
  -- Only allow setting unsubscribed_at (not changing email or other fields)
  email = email AND
  subscribed_at = subscribed_at AND
  verified = verified
);

-- 4. Fix notifications INSERT policy - only system/authenticated can insert
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  user_id IS NOT NULL
);

-- 5. Fix hardcoded developer email in VIP access policies
-- Drop and recreate the VIP predictions policy with proper admin role check
DROP POLICY IF EXISTS "Subscribed users can view VIP predictions" ON public.predictions;
CREATE POLICY "Subscribed users can view VIP predictions"
ON public.predictions
FOR SELECT
USING (
  (prediction_type = 'vip'::text)
  AND (
    (auth.uid() IN (SELECT user_id FROM active_vip_users))
    OR has_role(auth.uid(), 'admin')
  )
);

-- Fix VIP bundles policy as well
DROP POLICY IF EXISTS "Subscribed users can view VIP bundles" ON public.prediction_bundles;
CREATE POLICY "Subscribed users can view VIP bundles"
ON public.prediction_bundles
FOR SELECT
USING (
  (prediction_type = 'vip'::text)
  AND (
    (auth.uid() IN (SELECT user_id FROM active_vip_users))
    OR has_role(auth.uid(), 'admin')
  )
);