-- Ensure subscriptions are auto-linked when a user profile is created
DO $$
BEGIN
  -- Drop existing trigger if present (idempotent)
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_link_subscription_on_profile_insert'
  ) THEN
    DROP TRIGGER trg_link_subscription_on_profile_insert ON public.profiles;
  END IF;
END $$;

CREATE TRIGGER trg_link_subscription_on_profile_insert
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.link_subscription_on_registration();