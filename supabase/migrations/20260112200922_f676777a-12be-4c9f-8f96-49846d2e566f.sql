-- Add verified column to newsletter_subscriptions table
ALTER TABLE public.newsletter_subscriptions 
ADD COLUMN IF NOT EXISTS verified boolean DEFAULT true NOT NULL;

-- Add unsubscribed_at column for tracking unsubscribes
ALTER TABLE public.newsletter_subscriptions 
ADD COLUMN IF NOT EXISTS unsubscribed_at timestamp with time zone DEFAULT NULL;

-- Create newsletters table for logging sent newsletters
CREATE TABLE public.newsletters (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    subject text NOT NULL,
    content text NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_by_admin_id uuid NOT NULL,
    recipient_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on newsletters table
ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;

-- Only admins can view newsletters
CREATE POLICY "Admins can view newsletters" 
ON public.newsletters 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'::text));

-- Only admins can insert newsletters
CREATE POLICY "Admins can insert newsletters" 
ON public.newsletters 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

-- Only admins can delete newsletters
CREATE POLICY "Admins can delete newsletters" 
ON public.newsletters 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'::text));

-- Create index for efficient querying
CREATE INDEX idx_newsletters_sent_at ON public.newsletters(sent_at DESC);
CREATE INDEX idx_newsletter_subscriptions_verified ON public.newsletter_subscriptions(verified) WHERE verified = true AND unsubscribed_at IS NULL;