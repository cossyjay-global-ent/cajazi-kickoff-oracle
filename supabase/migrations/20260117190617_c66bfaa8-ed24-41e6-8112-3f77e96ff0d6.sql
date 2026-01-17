-- Update handle_new_user to give admin role to support@cosmas.dev
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  
  -- Give admin role to specific emails (developer and admin)
  IF new.email = 'cossybest24@gmail.com' OR new.email = 'support@cosmas.dev' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'user');
  END IF;
  
  RETURN new;
END;
$function$;

-- Create a function to check if user has VIP access (includes super developer)
CREATE OR REPLACE FUNCTION public.has_vip_access(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Super developer always has VIP access
    public.is_super_developer(uid)
    OR
    -- Or has an active subscription
    EXISTS (
      SELECT 1
      FROM public.subscriptions
      WHERE user_id = uid
        AND status = 'active'
        AND expires_at > now()
    )
$$;

-- Ensure support@cosmas.dev has admin role if they already exist
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'
FROM public.profiles p
WHERE p.email = 'support@cosmas.dev'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = 'admin'
  )
ON CONFLICT (user_id, role) DO NOTHING;