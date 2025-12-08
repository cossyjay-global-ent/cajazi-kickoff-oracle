-- Add points/XP column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp_points integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rank_tier text DEFAULT 'Bronze';

-- Create user_ranks table for rank definitions
CREATE TABLE IF NOT EXISTS public.user_ranks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  min_points integer NOT NULL,
  max_points integer,
  badge_color text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on user_ranks
ALTER TABLE public.user_ranks ENABLE ROW LEVEL SECURITY;

-- Anyone can view ranks
CREATE POLICY "Anyone can view ranks" ON public.user_ranks
FOR SELECT USING (true);

-- Only admins can manage ranks
CREATE POLICY "Admins can manage ranks" ON public.user_ranks
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Insert default ranks
INSERT INTO public.user_ranks (name, min_points, max_points, badge_color) VALUES
  ('Bronze', 0, 99, '#CD7F32'),
  ('Silver', 100, 499, '#C0C0C0'),
  ('Gold', 500, 1499, '#FFD700'),
  ('Platinum', 1500, 4999, '#E5E4E2'),
  ('Diamond', 5000, 14999, '#B9F2FF'),
  ('Master', 15000, NULL, '#9B59B6')
ON CONFLICT (name) DO NOTHING;

-- Create function to award XP points
CREATE OR REPLACE FUNCTION public.award_xp_points(
  p_user_id uuid,
  p_points integer,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_points integer;
  v_new_rank text;
BEGIN
  -- Update user's XP points
  UPDATE public.profiles
  SET xp_points = COALESCE(xp_points, 0) + p_points
  WHERE id = p_user_id
  RETURNING xp_points INTO v_new_points;

  -- Calculate new rank
  SELECT name INTO v_new_rank
  FROM public.user_ranks
  WHERE min_points <= v_new_points
    AND (max_points IS NULL OR max_points >= v_new_points)
  ORDER BY min_points DESC
  LIMIT 1;

  -- Update rank if changed
  IF v_new_rank IS NOT NULL THEN
    UPDATE public.profiles
    SET rank_tier = v_new_rank
    WHERE id = p_user_id;
  END IF;
END;
$$;

-- Create trigger to award XP when prediction result is updated to 'won'
CREATE OR REPLACE FUNCTION public.award_xp_on_correct_prediction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Award XP for correct predictions to users who viewed them
  IF NEW.result = 'won' AND OLD.result != 'won' THEN
    -- Award 10 XP to the predictor
    IF NEW.created_by IS NOT NULL THEN
      PERFORM public.award_xp_points(NEW.created_by, 10, 'correct_prediction');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for XP on correct prediction
DROP TRIGGER IF EXISTS trigger_award_xp_on_prediction ON public.predictions;
CREATE TRIGGER trigger_award_xp_on_prediction
  AFTER UPDATE ON public.predictions
  FOR EACH ROW
  EXECUTE FUNCTION public.award_xp_on_correct_prediction();