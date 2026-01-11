
-- Update the link_subscription_on_registration function to use case-insensitive email matching
CREATE OR REPLACE FUNCTION public.link_subscription_on_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Link subscription to new user by matching payment_email (case-insensitive)
  -- Only update user_id and registration_status, NEVER touch status
  UPDATE public.subscriptions
  SET 
    user_id = NEW.id,
    registration_status = 'registered'
  WHERE 
    LOWER(payment_email) = LOWER(NEW.email)
    AND user_id IS NULL;
  
  RETURN NEW;
END;
$$;

-- Make sure the trigger exists on profiles table
DROP TRIGGER IF EXISTS on_profile_created_link_subscription ON public.profiles;

CREATE TRIGGER on_profile_created_link_subscription
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.link_subscription_on_registration();
