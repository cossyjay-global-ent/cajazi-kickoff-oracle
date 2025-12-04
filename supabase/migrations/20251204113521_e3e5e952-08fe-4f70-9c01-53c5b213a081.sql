-- Update handle_new_user to automatically make cossybest24@gmail.com an admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  
  -- Give admin role to specific email
  IF new.email = 'cossybest24@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'user');
  END IF;
  
  RETURN new;
END;
$$;

-- Add column for display name to profiles (for public profiles)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;

-- Allow authenticated users to view limited profile info of others
CREATE POLICY "Authenticated users can view public profile data"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);