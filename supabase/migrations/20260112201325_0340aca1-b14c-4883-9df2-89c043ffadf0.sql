-- Allow anyone to update their own subscription to unsubscribe
CREATE POLICY "Anyone can unsubscribe" 
ON public.newsletter_subscriptions 
FOR UPDATE 
USING (true)
WITH CHECK (true);