-- Create user_follows table for follow system
CREATE TABLE public.user_follows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Enable RLS
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view all follows"
ON public.user_follows FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can follow others"
ON public.user_follows FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
ON public.user_follows FOR DELETE
TO authenticated
USING (auth.uid() = follower_id);