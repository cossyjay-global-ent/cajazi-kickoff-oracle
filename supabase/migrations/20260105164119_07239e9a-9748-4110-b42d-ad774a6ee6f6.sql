-- Add email column to subscriptions table to track payment email
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS payment_email text,
ADD COLUMN IF NOT EXISTS registration_status text DEFAULT 'pending' CHECK (registration_status IN ('pending', 'registered'));

-- Add index for fast email lookup
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_email ON public.subscriptions(payment_email);

-- Update RLS policies to allow admin to see all subscriptions regardless of user_id
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can view all subscriptions" 
ON public.subscriptions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::text));

-- Allow subscriptions to be created without a user_id initially (for payments before signup)
-- Update constraint to allow nullable user_id for pending registrations
ALTER TABLE public.subscriptions ALTER COLUMN user_id DROP NOT NULL;

-- Create a function to link subscription to user on registration
CREATE OR REPLACE FUNCTION public.link_subscription_on_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Link any subscriptions with matching email to this new user
  UPDATE public.subscriptions
  SET 
    user_id = NEW.id,
    registration_status = 'registered'
  WHERE 
    payment_email = NEW.email 
    AND (user_id IS NULL OR registration_status = 'pending');
  
  RETURN NEW;
END;
$$;

-- Create trigger to run on new profile creation
DROP TRIGGER IF EXISTS on_profile_created_link_subscription ON public.profiles;
CREATE TRIGGER on_profile_created_link_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.link_subscription_on_registration();

-- Update existing subscriptions to have registration_status = 'registered' if they have a valid user_id with matching profile
UPDATE public.subscriptions s
SET registration_status = 'registered'
FROM public.profiles p
WHERE s.user_id = p.id;