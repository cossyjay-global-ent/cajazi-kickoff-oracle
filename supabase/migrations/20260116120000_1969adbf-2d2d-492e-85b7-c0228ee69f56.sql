-- Update the is_super_developer function with proper search_path
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

-- Drop and recreate VIP predictions policy
DROP POLICY IF EXISTS "Subscribed users can view VIP predictions" ON public.predictions;
DROP POLICY IF EXISTS "VIP access with super admin override" ON public.predictions;

CREATE POLICY "VIP access with super admin override"
ON public.predictions
FOR SELECT
USING (
  prediction_type = 'vip'
  OR public.is_super_developer(auth.uid())
);

-- Drop and recreate VIP bundles policy
DROP POLICY IF EXISTS "Subscribed users can view VIP bundles" ON public.prediction_bundles;
DROP POLICY IF EXISTS "VIP bundles with super admin override" ON public.prediction_bundles;

CREATE POLICY "VIP bundles with super admin override"
ON public.prediction_bundles
FOR SELECT
USING (
  prediction_type = 'vip'
  OR public.is_super_developer(auth.uid())
);