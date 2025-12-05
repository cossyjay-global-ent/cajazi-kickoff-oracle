-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_user_id UUID,
  related_prediction_id UUID,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- System can insert notifications (via trigger)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Create function to notify on new follow
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  follower_name TEXT;
BEGIN
  -- Get follower's display name or email
  SELECT COALESCE(display_name, email) INTO follower_name
  FROM public.profiles
  WHERE id = NEW.follower_id;

  -- Insert notification for the followed user
  INSERT INTO public.notifications (user_id, type, title, message, related_user_id)
  VALUES (
    NEW.following_id,
    'new_follower',
    'New Follower',
    follower_name || ' started following you',
    NEW.follower_id
  );

  RETURN NEW;
END;
$$;

-- Create trigger for new follows
CREATE TRIGGER on_new_follow
AFTER INSERT ON public.user_follows
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_follow();

-- Create function to notify followers on new prediction
CREATE OR REPLACE FUNCTION public.notify_followers_on_prediction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  predictor_name TEXT;
  follower_record RECORD;
BEGIN
  -- Only notify for free predictions
  IF NEW.prediction_type != 'free' THEN
    RETURN NEW;
  END IF;

  -- Get predictor's display name or email
  SELECT COALESCE(display_name, email) INTO predictor_name
  FROM public.profiles
  WHERE id = NEW.created_by;

  -- Notify all followers
  FOR follower_record IN
    SELECT follower_id FROM public.user_follows WHERE following_id = NEW.created_by
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, related_user_id, related_prediction_id)
    VALUES (
      follower_record.follower_id,
      'new_prediction',
      'New Prediction',
      predictor_name || ' made a new prediction: ' || NEW.match_name,
      NEW.created_by,
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger for new predictions
CREATE TRIGGER on_new_prediction_notify
AFTER INSERT ON public.predictions
FOR EACH ROW
EXECUTE FUNCTION public.notify_followers_on_prediction();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;