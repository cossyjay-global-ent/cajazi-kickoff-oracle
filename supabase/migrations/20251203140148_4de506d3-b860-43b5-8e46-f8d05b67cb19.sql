-- Add featured_achievement column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS featured_achievement text;

-- Create seasonal_achievements table to track time-limited achievements
CREATE TABLE public.seasonal_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_id text NOT NULL,
  season_type text NOT NULL, -- 'weekly', 'monthly'
  season_start timestamp with time zone NOT NULL,
  season_end timestamp with time zone NOT NULL,
  unlocked_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id, season_start)
);

-- Enable RLS
ALTER TABLE public.seasonal_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for seasonal_achievements
CREATE POLICY "Users can view their own seasonal achievements"
ON public.seasonal_achievements
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own seasonal achievements"
ON public.seasonal_achievements
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all seasonal achievements"
ON public.seasonal_achievements
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage seasonal achievements"
ON public.seasonal_achievements
FOR ALL
USING (has_role(auth.uid(), 'admin'));