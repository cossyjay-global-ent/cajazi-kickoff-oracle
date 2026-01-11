-- Ensure an authenticated user always has a profile + can link their own subscriptions
-- This fixes cases where payment exists but subscriptions.user_id is NULL, which blocks VIP access via active_vip_users.

CREATE OR REPLACE FUNCTION public.ensure_profile_and_link_subscription()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  -- Must be logged in
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Read email from JWT claims
  v_email := lower(nullif(auth.jwt() ->> 'email', ''));
  IF v_email IS NULL THEN
    -- If we can't determine email, we can still ensure the profile row exists
    v_email := '';
  END IF;

  -- Ensure profile exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()) THEN
    INSERT INTO public.profiles (id, email)
    VALUES (auth.uid(), COALESCE(NULLIF(v_email, ''), ''));
  ELSE
    -- Keep email in sync when possible
    IF v_email IS NOT NULL AND v_email <> '' THEN
      UPDATE public.profiles
      SET email = v_email
      WHERE id = auth.uid()
        AND (email IS NULL OR lower(email) <> v_email);
    END IF;
  END IF;

  -- Ensure a default user role exists (do not escalate privileges)
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'user'
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'user');
  END IF;

  -- Link any existing active subscriptions that match the authenticated user's email
  -- Safe because it only links rows where payment_email matches the caller's email.
  IF v_email IS NOT NULL AND v_email <> '' THEN
    UPDATE public.subscriptions s
    SET user_id = auth.uid(),
        registration_status = 'registered'
    WHERE s.user_id IS NULL
      AND s.payment_email IS NOT NULL
      AND lower(s.payment_email) = v_email;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_profile_and_link_subscription() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_profile_and_link_subscription() FROM anon;