-- Create comment_replies table for admin replies to user comments
CREATE TABLE public.comment_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL,
  admin_id uuid NOT NULL,
  reply text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.comment_replies ENABLE ROW LEVEL SECURITY;

-- Admin-only insert policy
CREATE POLICY "Admins can insert replies"
ON public.comment_replies
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin-only update policy
CREATE POLICY "Admins can update their replies"
ON public.comment_replies
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Admin-only delete policy
CREATE POLICY "Admins can delete replies"
ON public.comment_replies
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Public read access for all replies
CREATE POLICY "Anyone can read admin replies"
ON public.comment_replies
FOR SELECT
USING (true);

-- Create index for faster lookups by comment_id
CREATE INDEX idx_comment_replies_comment_id ON public.comment_replies(comment_id);