-- Create prediction_booking_codes table for multi-platform booking codes
CREATE TABLE public.prediction_booking_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bundle_id UUID NOT NULL REFERENCES public.prediction_bundles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  booking_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient lookup by bundle_id
CREATE INDEX idx_prediction_booking_codes_bundle_id ON public.prediction_booking_codes(bundle_id);

-- Enforce uniqueness: one bundle cannot have duplicate platform entries
CREATE UNIQUE INDEX idx_prediction_booking_codes_bundle_platform ON public.prediction_booking_codes(bundle_id, platform);

-- Enable Row Level Security
ALTER TABLE public.prediction_booking_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admins can manage, authenticated users can view
CREATE POLICY "Admins can insert booking codes"
ON public.prediction_booking_codes
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admins can update booking codes"
ON public.prediction_booking_codes
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admins can delete booking codes"
ON public.prediction_booking_codes
FOR DELETE
USING (has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Authenticated users can view booking codes"
ON public.prediction_booking_codes
FOR SELECT
USING (auth.uid() IS NOT NULL);