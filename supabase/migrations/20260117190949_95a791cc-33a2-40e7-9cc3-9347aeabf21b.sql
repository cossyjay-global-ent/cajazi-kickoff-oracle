-- Fix VIP predictions policy to properly gate access
DROP POLICY IF EXISTS "VIP access with super admin override" ON public.predictions;
CREATE POLICY "VIP users can view VIP predictions"
ON public.predictions
FOR SELECT
USING (
  prediction_type = 'vip' AND has_vip_access(auth.uid())
);

-- Fix VIP bundles policy to properly gate access  
DROP POLICY IF EXISTS "VIP bundles with super admin override" ON public.prediction_bundles;
CREATE POLICY "VIP users can view VIP bundles"
ON public.prediction_bundles
FOR SELECT
USING (
  prediction_type = 'vip' AND has_vip_access(auth.uid())
);