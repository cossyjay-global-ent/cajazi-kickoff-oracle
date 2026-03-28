
-- STEP 1: Add role column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- STEP 2: Assign developer role to support@cosmas.dev
UPDATE public.profiles SET role = 'developer' WHERE email = 'support@cosmas.dev';

-- Also assign admin role mapping for cossybest24@gmail.com
UPDATE public.profiles SET role = 'admin' WHERE email = 'cossybest24@gmail.com' AND role = 'user';

-- STEP 3: Recreate is_super_developer to use profiles instead of auth.users
CREATE OR REPLACE FUNCTION public.is_super_developer(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = uid
      AND role = 'developer'
  );
$$;

-- STEP 4: Recreate has_vip_access to use is_super_developer (which now uses profiles)
CREATE OR REPLACE FUNCTION public.has_vip_access(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_super_developer(uid)
    OR
    EXISTS (
      SELECT 1
      FROM public.subscriptions
      WHERE user_id = uid
        AND status = 'active'
        AND expires_at > now()
    );
$$;

-- STEP 5: Update handle_new_user to set role column and not reference auth.users for role logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    new.id,
    new.email,
    CASE
      WHEN new.email = 'support@cosmas.dev' THEN 'developer'
      WHEN new.email = 'cossybest24@gmail.com' THEN 'admin'
      ELSE 'user'
    END
  );
  
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
$$;
