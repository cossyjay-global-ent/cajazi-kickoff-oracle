-- Update the result constraint on predictions table to include new statuses
ALTER TABLE public.predictions DROP CONSTRAINT IF EXISTS predictions_result_check;
ALTER TABLE public.predictions ADD CONSTRAINT predictions_result_check CHECK (result = ANY (ARRAY['pending'::text, 'won'::text, 'lost'::text, 'postponed'::text, 'void'::text, 'canceled'::text]));

-- Update the final_status constraint on prediction_bundles table to include new statuses
ALTER TABLE public.prediction_bundles DROP CONSTRAINT IF EXISTS prediction_bundles_final_status_check;
ALTER TABLE public.prediction_bundles ADD CONSTRAINT prediction_bundles_final_status_check CHECK (final_status = ANY (ARRAY['pending'::text, 'won'::text, 'lost'::text, 'postponed'::text, 'void'::text, 'canceled'::text]));