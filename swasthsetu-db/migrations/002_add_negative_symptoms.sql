-- ============================================================
-- MIGRATION 002
-- Add negative symptom information to temporary AI intake.
-- ============================================================

ALTER TABLE public.temporary_intakes
ADD COLUMN IF NOT EXISTS negative_symptoms JSONB;
