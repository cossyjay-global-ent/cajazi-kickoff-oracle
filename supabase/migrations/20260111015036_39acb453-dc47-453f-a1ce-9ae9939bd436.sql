-- FIX 1: Update the auto-link trigger to NEVER change status
CREATE OR REPLACE FUNCTION public.link_subscription_on_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only update user_id and registration_status, NEVER touch status
  UPDATE public.subscriptions
  SET 
    user_id = NEW.id,
    registration_status = 'registered'
  WHERE 
    payment_email = LOWER(NEW.email)
    AND (user_id IS NULL);
  
  RETURN NEW;
END;
$$;

-- FIX 2: Create a database-level trigger to BLOCK any downgrade from active to pending
CREATE OR REPLACE FUNCTION public.prevent_active_downgrade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- HARD BLOCK: Active subscriptions can NEVER be downgraded to pending
  IF OLD.status = 'active' AND NEW.status = 'pending' THEN
    RAISE EXCEPTION 'BLOCKED: Active subscriptions cannot be downgraded to pending. Old status: %, New status: %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_prevent_active_downgrade ON public.subscriptions;

CREATE TRIGGER trg_prevent_active_downgrade
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.prevent_active_downgrade();