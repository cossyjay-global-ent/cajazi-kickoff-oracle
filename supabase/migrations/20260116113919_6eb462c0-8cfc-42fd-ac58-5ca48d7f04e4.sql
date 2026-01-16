-- Create is_super_developer function
CREATE OR REPLACE FUNCTION public.is_super_developer(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = uid
      AND email = 'support@cosmas.dev'
  );
$$;

-- Drop existing VIP bundle policy and recreate with super developer access
DROP POLICY IF EXISTS "Subscribed users can view VIP bundles" ON public.prediction_bundles;
CREATE POLICY "Subscribed users can view VIP bundles" 
ON public.prediction_bundles 
FOR SELECT 
USING (
  prediction_type = 'vip'
  AND (
    auth.uid() IN (SELECT user_id FROM active_vip_users)
    OR has_role(auth.uid(), 'admin')
    OR public.is_super_developer(auth.uid())
  )
);

-- Drop existing VIP predictions policy and recreate with super developer access
DROP POLICY IF EXISTS "Subscribed users can view VIP predictions" ON public.predictions;
CREATE POLICY "Subscribed users can view VIP predictions" 
ON public.predictions 
FOR SELECT 
USING (
  prediction_type = 'vip'
  AND (
    auth.uid() IN (SELECT user_id FROM active_vip_users)
    OR has_role(auth.uid(), 'admin')
    OR public.is_super_developer(auth.uid())
  )
);